import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OnlineClient, ServerEvent } from '../net/onlineClient';
import { SoundEngine } from './audio';
import { createLobbyDiorama, LobbyDioramaController } from './lobbyScene3d';
import {
  applyMonkeyCosmetics,
  CoalRig,
  createCoalSourceModel,
  createCoinModel,
  createMonkeyModel,
  createStageEnvironment,
  createSupportModel,
  createTrainModel,
  MonkeyRig,
  StageEnvironmentController,
  SupportRig,
  TrainRig,
} from './models3d';
import { getAbilityDef } from './progression';
import {
  computeFinalRunRank,
  computeSpeedRank,
  getCoalCartMaxHp,
  groundHeightAt,
  isArmoredCoalCart,
  rollSpecialTrainKind,
  STAGES,
} from './stages';
import {
  AbilityId,
  EquippedCosmetics,
  GameSettings,
  GameState,
  HudSnapshot,
  NetCoinSpawn,
  NetTrackSpawn,
  OnlineRoomState,
  SpecialTrainKind,
  SpeedRank,
  StageConfig,
  TrainBehavior,
} from './types';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

const TRACK_POINTS_COUNT = 49; // s from -72 to +72, step 3m
const TRACK_STEP = 3.0;
const TRACK_HALF_SPAN = ((TRACK_POINTS_COUNT - 1) * TRACK_STEP) / 2;

interface TrackPathPoint {
  s: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

interface MonkeyEntity {
  id: number;
  name: string;
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  armPhase: number;
  boostTimer: number;
  slideTimer: number;
  slideDirX: number;
  slideDirZ: number;
  slideSpeed: number;
  attackTimer: number;
  hitFlashTimer: number;
  shieldTimer: number;
  coyoteTimer: number;
  cosmetics: EquippedCosmetics;
  targetPos: THREE.Vector3;
  rig: MonkeyRig;
}

interface SupportEntity {
  id: number;
  pos: THREE.Vector3;
  rig: SupportRig;
  bounceAnim: number;
  cooldown: number;
}

interface CoalEntity {
  id: number;
  pos: THREE.Vector3;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  hitFlashTimer: number;
  shakeTimer: number;
  rig: CoalRig;
}

interface CoinEntity {
  id: number;
  pos: THREE.Vector3;
  value: number;
  collected: boolean;
  magnetized: boolean;
  mesh: THREE.Mesh;
}

interface PooledTrackVisual {
  inUse: boolean;
  group: THREE.Group;
  corridorGeo: THREE.BufferGeometry;
  leftRailGeo: THREE.BufferGeometry;
  rightRailGeo: THREE.BufferGeometry;
  sleepers: THREE.InstancedMesh;
  corridorMat: THREE.MeshBasicMaterial;
  railMat: THREE.MeshStandardMaterial;
}

interface PooledTrainVisual {
  inUse: boolean;
  rig: TrainRig;
  baseIntensity: number;
}

interface TrackEntity {
  id: number;
  points: TrackPathPoint[];
  behavior: TrainBehavior;
  phase: 'TELEGRAPH' | 'PASSING' | 'STOPPING' | 'FADING';
  telegraphDuration: number;
  telegraphRemaining: number;
  materialize: number;
  trainDist: number;
  trainEndDist: number;
  trainSpeed: number;
  trainLength: number;
  fadeTimer: number;
  hornTriggered: boolean;
  chugTimer: number;
  isDying: boolean;
  stoppedDone: boolean;
  isRedShift: boolean;
  hasShifted: boolean;
  shiftDeltaYaw: number;
  shiftPivotS: number;
  specialKind: SpecialTrainKind;
  flashTriggered: boolean;
  trackVis: PooledTrackVisual;
  trainVis: PooledTrainVisual | null;
}

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
  kind: 'smoke' | 'spark' | 'coal';
  colorHex: number;
}

interface RingSlot {
  active: boolean;
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

function buildRibbonGeometry(segments: number): THREE.BufferGeometry {
  const vertsCount = (segments + 1) * 2;
  const positions = new Float32Array(vertsCount * 3);
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

function updateRibbonFromPoints(
  geo: THREE.BufferGeometry,
  points: TrackPathPoint[],
  lateralOffset: number,
  halfWidth: number,
  yOffset: number
): void {
  const attr = geo.getAttribute('position') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const nx = Math.cos(pt.yaw);
    const nz = -Math.sin(pt.yaw);
    const cx = pt.x + nx * lateralOffset;
    const cz = pt.z + nz * lateralOffset;
    const cy = pt.y + yOffset;

    const vi = i * 6;
    arr[vi] = cx - nx * halfWidth;
    arr[vi + 1] = cy;
    arr[vi + 2] = cz - nz * halfWidth;

    arr[vi + 3] = cx + nx * halfWidth;
    arr[vi + 4] = cy;
    arr[vi + 5] = cz + nz * halfWidth;
  }
  attr.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}

export class MonkeyTagEngine3D {
  private mountEl: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private packLantern: THREE.PointLight;
  private isSoftwareGl: boolean;
  private isMobileDevice: boolean;
  private fogEffectsEnabled = true;
  private particleQualityScale = 1;
  private lowDetailMode = false;

  private terrainMesh: THREE.Mesh | null = null;
  private borderRing: THREE.Mesh | null = null;
  private stageEnv: StageEnvironmentController | null = null;
  private lobbyDiorama: LobbyDioramaController;

  public sound: SoundEngine;
  public gameState: GameState = 'TITLE_MENU';
  private onHudChange: (hud: HudSnapshot) => void;
  private hudSyncTimer = 0;

  private readonly playRadius = 56;
  private currentStageIndex = 0;
  private frameId = 0;
  private destroyed = false;
  private lastTime = 0;
  private elapsedTotal = 0;

  // Player Loadout
  private localName = 'Macaco';
  private localCosmetics: EquippedCosmetics = { head: 'none', back: 'none' };
  private equippedAbility: AbilityId = 'dash_basic';
  private abilityCooldownTimer = 0;
  private abilityActiveTimer = 0;
  private doubleJumpReady = false;
  private timeStopTimer = 0;
  private coalBlinkTimer = 0;

  // Online mode state
  private isOnline = false;
  private onlineClient: OnlineClient | null = null;
  private onlineUnsub: (() => void) | null = null;
  private localSlot = 0;
  private netSyncTimer = 0;

  // Input state
  private heldKeys = new Set<string>();
  private jumpBufferTimer = 0;
  private attackJustPressed = false;
  private attackHoldCooldown = 0;
  private abilityJustPressed = false;
  private prevGamepadButtons: boolean[] = [];
  private gamepadConnected = false;
  private isDraggingCamera = false;
  private lastPointerX = 0;
  private touchMoveX = 0;
  private touchMoveZ = 0;
  private cameraTouchId: number | null = null;
  private lastCameraTouchX = 0;

  // Camera
  private camYaw = 0;
  private wideView = false;
  private camTarget = new THREE.Vector3(0, 1.5, 0);
  private shakeTrauma = 0;
  private hitstopTimer = 0;

  // Entities & pools
  private monkeys: MonkeyEntity[] = [];
  private supports: SupportEntity[] = [];
  private coalSources: CoalEntity[] = [];
  private coins: CoinEntity[] = [];
  private coinGeo: THREE.BufferGeometry;
  private coinMat: THREE.MeshStandardMaterial;
  private activeTracks: TrackEntity[] = [];

  private trackPool: PooledTrackVisual[] = [];
  private trainPool: PooledTrainVisual[] = [];
  private sharedTrackGeos: THREE.BufferGeometry[] = [];

  private readonly maxParticles = 160;
  private particleInstanced: THREE.InstancedMesh;
  private particleSlots: ParticleSlot[] = [];
  private ringPool: RingSlot[] = [];

  // Progression & Smoke
  private nextTrackId = 1;
  private nextCoinId = 1;
  private trainSpawnTimer = 2.0;
  private runElapsed = 0;
  private smokeClock = 0;
  private vaultsUsed = 0;
  private totalDistance = 0;
  private currentSpeed = 0;
  private peakSpeed = 0;
  private coinsRun = 0;
  private packInvulnTimer = 0;
  private isStoppingClimax = false;
  private stoppingClimaxTimer = 0;
  private nearSupportId: number | null = null;
  private nearCoalId: number | null = null;
  private nearArmoredCoal = false;
  private flashTimer = 0;
  private quakeSlowTimer = 0;
  private quakeAirborneActive = false;
  private runResultNonce = 0;

  constructor(mountEl: HTMLElement, onHudChange: (hud: HudSnapshot) => void) {
    this.mountEl = mountEl;
    this.onHudChange = onHudChange;
    this.sound = new SoundEngine();

    const isMobileDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    this.isMobileDevice = isMobileDevice;

    this.isSoftwareGl = (() => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const createSafeRenderer = (): THREE.WebGLRenderer => {
      try {
        return new THREE.WebGLRenderer({
          antialias: !this.isSoftwareGl && !isMobileDevice,
          powerPreference: isMobileDevice ? 'default' : 'high-performance',
        });
      } catch {
        return new THREE.WebGLRenderer({ antialias: false, powerPreference: 'default' });
      }
    };

    this.renderer = createSafeRenderer();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, isMobileDevice ? 1.25 : 1.5)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !isMobileDevice;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(1, mountEl.clientWidth);
    const height = Math.max(1, mountEl.clientHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 200);

    if (!isMobileDevice && !this.isSoftwareGl) {
      try {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
      } catch {
        // Fallback smoothly without PMREM environment on restricted mobile GPUs
      }
    }

    this.hemiLight = new THREE.HemisphereLight(0xa4a8b6, 0x18181d, isMobileDevice ? 1.2 : 0.95);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xf2f2fa, 1.9);
    this.keyLight.position.set(22, 38, 18);
    this.keyLight.castShadow = !this.isSoftwareGl && !isMobileDevice;
    this.keyLight.shadow.mapSize.set(512, 512);
    const d = 24;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 80;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    const rim = new THREE.DirectionalLight(0x8a8e9c, 0.65);
    rim.position.set(-24, 16, -26);
    this.scene.add(rim);

    this.packLantern = new THREE.PointLight(0xe8e8f2, 0, 14, 1.6);
    this.scene.add(this.packLantern);

    this.lobbyDiorama = createLobbyDiorama(
      width,
      height,
      isMobileDevice || this.isSoftwareGl
    );
    if (this.scene.environment) {
      this.lobbyDiorama.scene.environment = this.scene.environment;
    }

    const coinSample = createCoinModel();
    this.coinGeo = coinSample.geometry;
    this.coinMat = coinSample.material as THREE.MeshStandardMaterial;

    const pGeo = new THREE.DodecahedronGeometry(0.45, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInstanced = new THREE.InstancedMesh(pGeo, pMat, this.maxParticles);
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleInstanced.frustumCulled = false;
    for (let i = 0; i < this.maxParticles; i++) {
      _dummyObj.position.set(0, -999, 0);
      _dummyObj.scale.setScalar(0.0001);
      _dummyObj.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummyObj.matrix);
      this.particleInstanced.setColorAt(i, _tempColor.setHex(0xffffff));
      this.particleSlots.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        scale: 1,
        life: 0,
        maxLife: 1,
        kind: 'smoke',
        colorHex: 0xffffff,
      });
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particleInstanced);

    const ringGeo = new THREE.RingGeometry(0.8, 1.15, 20);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf8f8fc,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.ringPool.push({ active: false, mesh, life: 0, maxLife: 0.34 });
    }

    this.initTrackPool();
    this.initMonkeys();
    this.loadStage(0, false);
    this.bindEvents();
  }

  private initTrackPool(): void {
    const sleeperGeo = new THREE.BoxGeometry(4.4, 0.14, 0.55);
    this.sharedTrackGeos.push(sleeperGeo);
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x26262d,
      roughness: 0.88,
      flatShading: true,
    });

    for (let p = 0; p < 6; p++) {
      const group = new THREE.Group();
      group.visible = false;

      const corridorGeo = buildRibbonGeometry(TRACK_POINTS_COUNT - 1);
      const corridorMat = new THREE.MeshBasicMaterial({
        color: 0xf4f4fa,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const corridor = new THREE.Mesh(corridorGeo, corridorMat);
      corridor.frustumCulled = false;
      group.add(corridor);

      const railMat = new THREE.MeshStandardMaterial({
        color: 0xc8c8d2,
        roughness: 0.35,
        metalness: 0.75,
        emissive: 0xffffff,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      });
      const leftRailGeo = buildRibbonGeometry(TRACK_POINTS_COUNT - 1);
      const rightRailGeo = buildRibbonGeometry(TRACK_POINTS_COUNT - 1);
      const leftRail = new THREE.Mesh(leftRailGeo, railMat);
      const rightRail = new THREE.Mesh(rightRailGeo, railMat);
      leftRail.frustumCulled = false;
      rightRail.frustumCulled = false;
      group.add(leftRail, rightRail);

      this.sharedTrackGeos.push(corridorGeo, leftRailGeo, rightRailGeo);

      const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, TRACK_POINTS_COUNT);
      sleepers.frustumCulled = false;
      sleepers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(sleepers);

      this.scene.add(group);
      this.trackPool.push({
        inUse: false,
        group,
        corridorGeo,
        leftRailGeo,
        rightRailGeo,
        sleepers,
        corridorMat,
        railMat,
      });
    }
  }

  private get stage(): StageConfig {
    return STAGES[this.currentStageIndex] || STAGES[0];
  }

  private initMonkeys(): void {
    const variants: ('leader' | 'agile' | 'breaker')[] = ['leader', 'agile', 'breaker'];
    this.monkeys = variants.map((variant, id) => {
      const rig = createMonkeyModel(variant);
      this.scene.add(rig.group);
      return {
        id,
        name: `Macaco ${id + 1}`,
        alive: true,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        facingYaw: 0,
        armPhase: id * 1.8,
        boostTimer: 0,
        slideTimer: 0,
        slideDirX: 0,
        slideDirZ: 1,
        slideSpeed: 0,
        attackTimer: 0,
        hitFlashTimer: 0,
        shieldTimer: 0,
        coyoteTimer: 0,
        cosmetics: { head: 'none', back: 'none' },
        targetPos: new THREE.Vector3(),
        rig,
      };
    });
  }

  public setLocalLoadout(
    playerName: string,
    cosmetics: EquippedCosmetics,
    abilityId: AbilityId
  ): void {
    this.localName = playerName;
    this.localCosmetics = cosmetics;
    this.equippedAbility = abilityId;
    const idx = this.isOnline ? this.localSlot : 0;
    const m = this.monkeys[idx];
    if (m) {
      m.name = playerName;
      m.cosmetics = cosmetics;
      applyMonkeyCosmetics(m.rig, cosmetics);
    }
    this.emitHud();
  }

  public applySettings(settings: GameSettings): void {
    this.sound.setMasterVolume(settings.masterVolume);
    this.sound.setMuted(settings.muted);
    this.sound.setMusicEnabled(settings.musicEnabled);
    this.syncMusicTrack();

    const maxDpr = this.isMobileDevice ? 1.35 : 1.75;
    const scale = Math.max(0.55, Math.min(1.35, settings.resolutionScale));
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr) * scale
    );

    const shadowsOn =
      settings.shadows && settings.graphicsQuality !== 'low' && !this.isSoftwareGl;
    const prevLow = this.lowDetailMode;
    this.lowDetailMode = settings.graphicsQuality === 'low' || this.isMobileDevice;
    this.renderer.shadowMap.enabled = shadowsOn;
    this.keyLight.castShadow = shadowsOn;

    const targetShadowSize = settings.graphicsQuality === 'high' ? 1024 : 512;
    if (this.keyLight.shadow.mapSize.width !== targetShadowSize) {
      this.keyLight.shadow.mapSize.set(targetShadowSize, targetShadowSize);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;

    this.particleQualityScale =
      settings.graphicsQuality === 'low' ? 0.35 : settings.graphicsQuality === 'medium' ? 0.75 : 1;

    this.camera.far =
      settings.graphicsQuality === 'low' ? 140 : settings.graphicsQuality === 'medium' ? 185 : 230;
    this.camera.updateProjectionMatrix();

    this.renderer.toneMappingExposure =
      settings.graphicsQuality === 'high' ? 1.18 : settings.graphicsQuality === 'low' ? 1.08 : 1.15;

    for (const tv of this.trainPool) {
      tv.rig.headlight.visible = !this.lowDetailMode;
    }

    this.fogEffectsEnabled = settings.fogEffects;
    if (!this.fogEffectsEnabled) {
      this.scene.fog = null;
    } else if (!(this.scene.fog instanceof THREE.FogExp2)) {
      this.scene.fog = new THREE.FogExp2(this.stage.fogColor, this.stage.fogDensity);
    }

    if (prevLow !== this.lowDetailMode && this.gameState === 'TITLE_MENU') {
      this.stageEnv?.dispose();
      this.stageEnv = createStageEnvironment(
        this.scene,
        this.playRadius,
        this.stage,
        this.lowDetailMode
      );
    }

    const w = Math.max(1, this.mountEl.clientWidth);
    const h = Math.max(1, this.mountEl.clientHeight);
    this.renderer.setSize(w, h);
    this.emitHud();
  }

  private rebuildTrainPool(stage: StageConfig): void {
    for (const tv of this.trainPool) {
      this.scene.remove(tv.rig.group);
    }
    this.trainPool = [];

    const baseInt = stage.isBoss ? 240 : 180;
    const poolCount = this.isMobileDevice ? 3 : 4;
    for (let i = 0; i < poolCount; i++) {
      const rig = createTrainModel(stage.trainVariant);
      rig.group.visible = false;
      rig.headlight.intensity = 0;
      rig.headlight.visible = !this.lowDetailMode;
      this.scene.add(rig.group);
      this.trainPool.push({ inUse: false, rig, baseIntensity: baseInt });
    }
  }

  private buildStageTerrain(stage: StageConfig): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      const mat = this.terrainMesh.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    if (this.borderRing) {
      this.scene.remove(this.borderRing);
      this.borderRing.geometry.dispose();
      (this.borderRing.material as THREE.Material).dispose();
    }

    const canvas = document.createElement('canvas');
    const texSize = this.isMobileDevice ? 128 : 256;
    canvas.width = texSize;
    canvas.height = texSize;
    const ctx = canvas.getContext('2d');
    const base = stage.groundBaseShade;
    if (ctx) {
      if (
        stage.theme === 'leviathan_sea' ||
        stage.theme === 'shipyard_grave' ||
        stage.theme === 'glacier_rail'
      ) {
        ctx.fillStyle = `rgb(${Math.max(8, base - 3)},${base + 4},${base + 12})`;
      } else if (
        stage.theme === 'mining_cave' ||
        stage.theme === 'sawmill_yard' ||
        stage.theme === 'clockwork_foundry'
      ) {
        ctx.fillStyle = `rgb(${base + 7},${base + 3},${Math.max(8, base - 3)})`;
      } else if (
        stage.theme === 'industrial_furnace' ||
        stage.theme === 'slag_volcano'
      ) {
        ctx.fillStyle = `rgb(${base + 6},${Math.max(8, base - 1)},${Math.max(8, base - 3)})`;
      } else if (
        stage.theme === 'salt_flats' ||
        stage.theme === 'bone_viaduct'
      ) {
        ctx.fillStyle = `rgb(${Math.min(240, base + 8)},${Math.min(240, base + 7)},${Math.min(240, base + 4)})`;
      } else if (stage.theme === 'viaduct_bridge' || stage.theme === 'bunker_fortress') {
        ctx.fillStyle = `rgb(${base},${base + 2},${base + 7})`;
      } else {
        ctx.fillStyle = `rgb(${base},${base},${base + 3})`;
      }
      ctx.fillRect(0, 0, texSize, texSize);

      const specks = this.isMobileDevice ? 180 : 420;
      for (let i = 0; i < specks; i++) {
        const s = Math.max(6, base - 8 + Math.floor(Math.random() * 22));
        ctx.fillStyle =
          stage.theme === 'leviathan_sea' ||
          stage.theme === 'shipyard_grave' ||
          stage.theme === 'glacier_rail'
            ? `rgb(${Math.max(6, s - 3)},${s + 3},${s + 10})`
            : stage.theme === 'mining_cave' ||
              stage.theme === 'sawmill_yard' ||
              stage.theme === 'clockwork_foundry'
            ? `rgb(${s + 5},${s + 2},${Math.max(6, s - 3)})`
            : stage.theme === 'slag_volcano'
            ? `rgb(${s + 7},${Math.max(6, s - 2)},${Math.max(6, s - 4)})`
            : `rgb(${s},${s},${s + 2})`;
        ctx.fillRect(
          Math.random() * texSize,
          Math.random() * texSize,
          (6 + Math.random() * 26) * (texSize / 256),
          (6 + Math.random() * 26) * (texSize / 256)
        );
      }

      if (stage.theme === 'leviathan_sea' || stage.theme === 'shipyard_grave') {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.065)';
        ctx.lineWidth = 2;
        for (let y = 16; y < texSize; y += 32) {
          ctx.beginPath();
          for (let x = 0; x <= texSize; x += 32) {
            const wy = y + Math.sin((x / texSize) * Math.PI * 2 + stage.id) * 8;
            if (x === 0) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
          }
          ctx.stroke();
        }
      } else if (stage.theme === 'glacier_rail') {
        // Sharp crystalline ice striations
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.14)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 14; k++) {
          const sx = (k * 37 + stage.id * 11) % texSize;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo((sx + 54) % texSize, texSize);
          ctx.stroke();
        }
      } else if (stage.theme === 'slag_volcano') {
        // Glowing molten magma veins over dark obsidian basalt
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.18)';
        ctx.lineWidth = 2.5;
        for (let k = 0; k < 12; k++) {
          const sx = (k * 53 + stage.id * 23) % texSize;
          const sy = (k * 67 + stage.id * 17) % texSize;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 44, sy + (k % 2 === 0 ? 28 : -28));
          ctx.stroke();
        }
      } else if (stage.theme === 'clockwork_foundry') {
        // Interlocking concentric gear-plate brass circles and riveted grid
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.09)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(texSize / 2, texSize / 2, texSize * 0.34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(4, 4, texSize - 8, texSize - 8);
      } else if (stage.theme === 'salt_flats' || stage.theme === 'bone_viaduct') {
        // Polygonal dried salt crusts / dusty chalk canyon seams
        ctx.strokeStyle =
          stage.theme === 'salt_flats'
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(214, 211, 200, 0.11)';
        ctx.lineWidth = 1.8;
        for (let g = 0; g < texSize; g += 48) {
          ctx.beginPath();
          ctx.moveTo(g, 0);
          ctx.lineTo(g + 22, texSize / 2);
          ctx.lineTo(g - 12, texSize);
          ctx.stroke();
        }
      } else if (stage.theme === 'mining_cave' || stage.theme === 'quarry_canyon') {
        // Chiseled cavern rock veins & ore flecks
        ctx.strokeStyle =
          stage.theme === 'mining_cave'
            ? 'rgba(103, 232, 249, 0.07)'
            : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 12; k++) {
          const sx = ((k * 47 + stage.id * 19) % texSize);
          const sy = ((k * 73 + stage.id * 31) % texSize);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 38, sy + (k % 2 === 0 ? 22 : -22));
          ctx.stroke();
        }
      } else if (stage.theme === 'sawmill_yard') {
        // Long timber deck plank seams
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 2;
        for (let y = 0; y < texSize; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(texSize, y);
          ctx.stroke();
        }
      } else if (
        stage.theme === 'industrial_furnace' ||
        stage.theme === 'bunker_fortress' ||
        stage.theme === 'viaduct_bridge' ||
        stage.theme === 'cathedral_shadow' ||
        stage.theme === 'iron_forest'
      ) {
        // Stone flagstones / riveted steel deck grid
        ctx.strokeStyle =
          stage.theme === 'industrial_furnace'
            ? 'rgba(251, 146, 60, 0.07)'
            : stage.theme === 'iron_forest'
            ? 'rgba(252, 211, 77, 0.065)'
            : 'rgba(255, 255, 255, 0.055)';
        ctx.lineWidth = 2;
        const step = stage.theme === 'viaduct_bridge' ? 48 : 64;
        for (let g = 0; g < texSize; g += step) {
          ctx.strokeRect(g + 2, 2, step - 4, texSize / 2 - 4);
          ctx.strokeRect(g + 2, texSize / 2 + 2, step - 4, texSize / 2 - 4);
        }
      } else {
        ctx.strokeStyle =
          stage.theme === 'chalk_void'
            ? 'rgba(255, 255, 255, 0.09)'
            : 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 2;
        for (let x = 0; x < texSize; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + (stage.id % 2 === 0 ? 28 : -28), texSize);
          ctx.stroke();
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(28, 28);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.isMobileDevice ? 1 : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());

    const segs = stage.terrainAmplitude > 0 ? (this.isMobileDevice ? 30 : 52) : 10;
    const groundGeo = new THREE.PlaneGeometry(320, 320, segs, segs);
    groundGeo.rotateX(-Math.PI / 2);

    if (stage.terrainAmplitude > 0) {
      const posAttr = groundGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        posAttr.setY(i, groundHeightAt(vx, vz, stage));
      }
      groundGeo.computeVertexNormals();
    }

    const groundMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness:
        stage.theme === 'glacier_rail'
          ? 0.28
          : stage.theme === 'shipyard_grave' || stage.theme === 'leviathan_sea'
          ? 0.65
          : stage.theme === 'clockwork_foundry' || stage.theme === 'iron_forest'
          ? 0.52
          : stage.theme === 'bunker_fortress'
          ? 0.78
          : 0.92,
      metalness:
        stage.theme === 'clockwork_foundry' || stage.theme === 'iron_forest'
          ? 0.36
          : stage.theme === 'industrial_furnace' || stage.theme === 'bunker_fortress'
          ? 0.22
          : 0.05,
      flatShading: stage.terrainAmplitude > 0,
    });
    this.terrainMesh = new THREE.Mesh(groundGeo, groundMat);
    this.terrainMesh.receiveShadow = !this.isMobileDevice;
    this.scene.add(this.terrainMesh);

    const borderColor =
      stage.theme === 'leviathan_sea' || stage.theme === 'glacier_rail'
        ? 0x38bdf8
        : stage.theme === 'mining_cave' || stage.theme === 'clockwork_foundry'
        ? 0xd97706
        : stage.theme === 'industrial_furnace' || stage.theme === 'slag_volcano'
        ? 0xea580c
        : stage.theme === 'chalk_void' || stage.theme === 'salt_flats'
        ? 0xd4d4dc
        : stage.isBoss
        ? 0x454552
        : 0x52525c;

    const borderGeo = new THREE.RingGeometry(this.playRadius - 0.35, this.playRadius + 0.35, 56);
    borderGeo.rotateX(-Math.PI / 2);
    const borderMat = new THREE.MeshBasicMaterial({
      color: borderColor,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    });
    this.borderRing = new THREE.Mesh(borderGeo, borderMat);
    this.borderRing.position.y = groundHeightAt(this.playRadius, 0, stage) + 0.05;
    this.scene.add(this.borderRing);
  }

  private clearCoins(): void {
    for (const c of this.coins) {
      this.scene.remove(c.mesh);
    }
    this.coins = [];
  }

  private spawnCoinMesh(id: number, x: number, y: number, z: number, value: number): void {
    const mesh = new THREE.Mesh(this.coinGeo, this.coinMat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.coins.push({
      id,
      pos: mesh.position,
      value,
      collected: false,
      magnetized: false,
      mesh,
    });
  }

  private loadStage(stageIndex: number, keepLivingMonkeys: boolean): void {
    this.currentStageIndex = Math.max(0, Math.min(STAGES.length - 1, stageIndex));
    const stage = this.stage;

    this.scene.background = new THREE.Color(stage.bgColor);
    this.scene.fog = this.fogEffectsEnabled
      ? new THREE.FogExp2(stage.fogColor, stage.fogDensity)
      : null;
    this.keyLight.intensity = stage.keyLightIntensity;
    this.hemiLight.intensity = stage.hemiIntensity;
    this.packLantern.intensity = stage.isBoss ? 5.5 : 0;

    for (const tr of this.activeTracks) {
      tr.trackVis.inUse = false;
      tr.trackVis.group.visible = false;
      if (tr.trainVis) {
        this.resetTrainTint(tr.trainVis);
        tr.trainVis.inUse = false;
        tr.trainVis.rig.group.visible = false;
        tr.trainVis.rig.headlight.intensity = 0;
      }
    }
    this.activeTracks = [];

    for (let i = 0; i < this.maxParticles; i++) {
      this.particleSlots[i].active = false;
      _dummyObj.position.set(0, -999, 0);
      _dummyObj.scale.setScalar(0.0001);
      _dummyObj.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummyObj.matrix);
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;

    for (const r of this.ringPool) {
      r.active = false;
      r.mesh.visible = false;
    }

    for (const c of this.coalSources) this.scene.remove(c.rig.group);
    this.coalSources = [];

    for (const s of this.supports) this.scene.remove(s.rig.group);
    this.supports = [];

    this.clearCoins();

    if (this.stageEnv) {
      this.stageEnv.dispose();
      this.stageEnv = null;
    }

    this.buildStageTerrain(stage);
    this.stageEnv = createStageEnvironment(
      this.scene,
      this.playRadius,
      stage,
      this.lowDetailMode || this.isMobileDevice
    );
    this.rebuildTrainPool(stage);

    this.nearCoalId = null;
    this.nearArmoredCoal = false;
    for (let i = 0; i < stage.coalCount; i++) {
      const a = (i / stage.coalCount) * Math.PI * 2 + 0.25 + stage.id * 0.3;
      const r = i % 2 === 0 ? 39 : 29;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const cy = groundHeightAt(cx, cz, stage);

      const armored = isArmoredCoalCart(stage, i);
      const maxHp = getCoalCartMaxHp(stage, i);
      const rig = createCoalSourceModel(armored);
      rig.group.position.set(cx, cy, cz);
      rig.group.rotation.y = a + Math.PI / 2;
      this.scene.add(rig.group);
      this.coalSources.push({
        id: i + 1,
        pos: rig.group.position.clone(),
        hp: maxHp,
        maxHp,
        destroyed: false,
        hitFlashTimer: 0,
        shakeTimer: 0,
        rig,
      });
    }

    // Place compact speed pads with considerable distance (>= 20m) between each other
    const goldenAngle = 2.39996323;
    let placed = 0;
    let attempt = 0;
    while (placed < stage.supportCount && attempt < 180) {
      attempt += 1;
      const frac = ((attempt + stage.id * 7) % 100) / 100;
      const rad = 16 + frac * 31;
      const a = attempt * goldenAngle + stage.id * 0.41;
      const sx = Math.cos(a) * rad;
      const sz = Math.sin(a) * rad;

      const tooCloseToSupport = this.supports.some(
        (other) => Math.hypot(other.pos.x - sx, other.pos.z - sz) < 20
      );
      if (tooCloseToSupport) continue;

      const tooCloseToCoal = this.coalSources.some(
        (c) => Math.hypot(c.pos.x - sx, c.pos.z - sz) < 7.5
      );
      if (tooCloseToCoal) continue;

      const sy = groundHeightAt(sx, sz, stage);
      const rig = createSupportModel(placed);
      rig.group.position.set(sx, sy, sz);
      rig.group.rotation.y = placed * 1.1;
      this.scene.add(rig.group);
      this.supports.push({
        id: placed + 1,
        pos: new THREE.Vector3(sx, sy, sz),
        rig,
        bounceAnim: 0,
        cooldown: 0,
      });
      placed += 1;
    }

    if (!this.isOnline) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.35;
        const rad = 14 + (i % 3) * 10;
        const cx = Math.cos(a) * rad;
        const cz = Math.sin(a) * rad;
        this.spawnCoinMesh(
          this.nextCoinId++,
          cx,
          groundHeightAt(cx, cz, stage) + 1.1,
          cz,
          10
        );
      }
    }

    this.runElapsed = 0;
    this.smokeClock = 0;
    this.vaultsUsed = 0;
    this.totalDistance = 0;
    this.currentSpeed = 0;
    this.peakSpeed = 0;
    this.coinsRun = 0;
    this.shakeTrauma = 0;
    this.hitstopTimer = 0;
    this.packInvulnTimer = 0;
    this.abilityCooldownTimer = 0;
    this.abilityActiveTimer = 0;
    this.doubleJumpReady = false;
    this.timeStopTimer = 0;
    this.coalBlinkTimer = 0;
    this.isStoppingClimax = false;
    this.stoppingClimaxTimer = 0;
    this.jumpBufferTimer = 0;
    this.attackJustPressed = false;
    this.attackHoldCooldown = 0;
    this.abilityJustPressed = false;
    this.flashTimer = 0;
    this.quakeSlowTimer = 0;
    this.quakeAirborneActive = false;
    this.trainSpawnTimer = 1.9;
    this.camYaw = 0;

    if (!this.isOnline) {
      if (keepLivingMonkeys) {
        const deadOne = this.monkeys.find((m) => !m.alive);
        if (deadOne) deadOne.alive = true;
      } else {
        for (const m of this.monkeys) m.alive = true;
      }
      this.monkeys.forEach((m, idx) => {
        m.name = idx === 0 ? this.localName : `Parceiro ${idx + 1}`;
        m.cosmetics = idx === 0 ? this.localCosmetics : m.cosmetics;
        applyMonkeyCosmetics(m.rig, m.cosmetics);
      });
    }

    const startOffsets: [number, number][] = [
      [0, 0],
      [-2.4, -2.0],
      [2.4, -2.0],
    ];
    this.monkeys.forEach((m, i) => {
      const sx = startOffsets[i][0];
      const sz = startOffsets[i][1];
      const sy = groundHeightAt(sx, sz, stage);
      m.pos.set(sx, sy, sz);
      m.targetPos.set(sx, sy, sz);
      m.vel.set(0, 0, 0);
      m.facingYaw = 0;
      m.boostTimer = 0;
      m.slideTimer = 0;
      m.slideSpeed = 0;
      m.attackTimer = 0;
      m.hitFlashTimer = 0;
      m.shieldTimer = 0;
      m.coyoteTimer = 0;
      m.rig.shieldMesh.visible = false;
      m.rig.group.visible = m.alive;
      m.rig.group.position.copy(m.pos);
    });

    this.camTarget.set(0, 1.5, 0);

    if (!this.isSoftwareGl && !this.isMobileDevice) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    dom.addEventListener('contextmenu', this.handleContextMenu);
    dom.addEventListener('touchstart', this.handleCanvasTouchStart, { passive: false });
    dom.addEventListener('touchmove', this.handleCanvasTouchMove, { passive: false });
    dom.addEventListener('touchend', this.handleCanvasTouchEnd);
    dom.addEventListener('touchcancel', this.handleCanvasTouchEnd);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
  }

  public destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.detachOnline();

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    dom.removeEventListener('contextmenu', this.handleContextMenu);
    dom.removeEventListener('touchstart', this.handleCanvasTouchStart);
    dom.removeEventListener('touchmove', this.handleCanvasTouchMove);
    dom.removeEventListener('touchend', this.handleCanvasTouchEnd);
    dom.removeEventListener('touchcancel', this.handleCanvasTouchEnd);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);

    this.sound.dispose();
    if (this.stageEnv) this.stageEnv.dispose();
    this.lobbyDiorama.dispose();
    for (const g of this.sharedTrackGeos) g.dispose();
    this.coinGeo.dispose();
    this.coinMat.dispose();
    this.particleInstanced.geometry.dispose();
    (this.particleInstanced.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.mountEl) {
      this.mountEl.removeChild(dom);
    }
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private detachOnline(): void {
    if (this.onlineUnsub) {
      this.onlineUnsub();
      this.onlineUnsub = null;
    }
    this.onlineClient = null;
    this.isOnline = false;
  }

  private handleContextMenu = (e: MouseEvent) => e.preventDefault();

  private handleResize = (): void => {
    const w = Math.max(1, this.mountEl.clientWidth);
    const h = Math.max(1, this.mountEl.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.lobbyDiorama.resize(w, h);
    this.renderer.setSize(w, h);
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.isDraggingCamera = false;
    this.touchMoveX = 0;
    this.touchMoveZ = 0;
    this.cameraTouchId = null;
  };

  private handleGamepadConnected = (): void => {
    this.gamepadConnected = true;
    this.emitHud();
  };

  private handleGamepadDisconnected = (): void => {
    this.gamepadConnected = false;
    this.prevGamepadButtons = [];
    this.emitHud();
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (this.gameState !== 'PLAYING') return;
    this.sound.unlock();
    if (e.button === 0) {
      this.attackJustPressed = true;
    } else if (e.button === 2) {
      this.isDraggingCamera = true;
      this.lastPointerX = e.clientX;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDraggingCamera || this.gameState !== 'PLAYING') return;
    const dx = e.clientX - this.lastPointerX;
    this.lastPointerX = e.clientX;
    this.camYaw -= dx * 0.006;
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 2) this.isDraggingCamera = false;
  };

  private handleCanvasTouchStart = (e: TouchEvent): void => {
    if (this.gameState !== 'PLAYING') return;
    this.sound.unlock();
    if (this.cameraTouchId === null && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      this.cameraTouchId = t.identifier;
      this.lastCameraTouchX = t.clientX;
    }
  };

  private handleCanvasTouchMove = (e: TouchEvent): void => {
    if (this.gameState !== 'PLAYING' || this.cameraTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.cameraTouchId) {
        e.preventDefault();
        const dx = t.clientX - this.lastCameraTouchX;
        this.lastCameraTouchX = t.clientX;
        this.camYaw -= dx * 0.008;
        break;
      }
    }
  };

  private handleCanvasTouchEnd = (e: TouchEvent): void => {
    if (this.cameraTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.cameraTouchId) {
        this.cameraTouchId = null;
        break;
      }
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore game hotkeys if typing inside an input element (Lobby nickname / room name)
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }
    if (e.repeat) return;

    if (code === 'Escape') {
      if (this.gameState === 'PLAYING' && !this.isOnline) this.pauseGame();
      else if (this.gameState === 'PAUSED') this.resumeGame();
      return;
    }

    if (code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (code === 'KeyV' && this.gameState === 'PLAYING') {
      this.wideView = !this.wideView;
      return;
    }

    this.heldKeys.add(code);

    if (this.gameState === 'PLAYING') {
      this.sound.unlock();
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
        this.jumpBufferTimer = 0.16;
      }
      if (code === 'KeyE' || code === 'KeyF' || code === 'KeyJ') {
        this.attackJustPressed = true;
      }
      if (code === 'KeyR' || code === 'KeyT') {
        this.abilityJustPressed = true;
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  public triggerAbility(): void {
    if (this.gameState === 'PLAYING') {
      this.sound.unlock();
      this.abilityJustPressed = true;
    }
  }

  public triggerJump(): void {
    if (this.gameState === 'PLAYING') {
      this.sound.unlock();
      this.jumpBufferTimer = 0.18;
    }
  }

  public triggerAttack(): void {
    if (this.gameState === 'PLAYING') {
      this.sound.unlock();
      this.attackJustPressed = true;
    }
  }

  public setTouchMove(x: number, z: number): void {
    this.touchMoveX = Math.max(-1, Math.min(1, x));
    this.touchMoveZ = Math.max(-1, Math.min(1, z));
  }

  public start(): void {
    this.lastTime = performance.now();
    this.syncMusicTrack();
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        this.frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (this.destroyed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.pollGamepadMenus();

      if (this.gameState === 'PLAYING') {
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
      } else if (this.gameState === 'TITLE_MENU') {
        this.elapsedTotal += dt;
        this.lobbyDiorama.update(dt, this.elapsedTotal);
        this.renderer.render(this.lobbyDiorama.scene, this.lobbyDiorama.camera);
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public selectStage(stageIndex: number): void {
    this.loadStage(stageIndex, false);
    this.emitHud();
  }

  public startGame(stageIndex = 0): void {
    this.detachOnline();
    this.sound.unlock();
    this.loadStage(stageIndex, false);
    this.gameState = 'PLAYING';
    this.syncMusicTrack();
    this.emitHud();
  }

  public startOnlineMatch(
    room: OnlineRoomState,
    yourSlot: number,
    coalHps: number[],
    coins: NetCoinSpawn[],
    client: OnlineClient
  ): void {
    this.detachOnline();
    this.sound.unlock();
    this.isOnline = true;
    this.onlineClient = client;
    this.localSlot = yourSlot;

    this.monkeys.forEach((m, idx) => {
      const rp = room.players.find((p) => p.slot === idx);
      if (rp) {
        m.alive = rp.alive;
        m.name = rp.name;
        m.cosmetics = rp.cosmetics;
        applyMonkeyCosmetics(m.rig, rp.cosmetics);
      } else {
        m.alive = false;
        m.name = '';
      }
    });

    this.loadStage(room.stageIndex, false);
    this.coalSources.forEach((c, idx) => {
      c.maxHp = getCoalCartMaxHp(this.stage, idx);
      if (idx < coalHps.length) {
        c.hp = coalHps[idx];
        c.destroyed = c.hp <= 0;
        c.rig.activeGroup.visible = !c.destroyed;
        c.rig.craterGroup.visible = c.destroyed;
      }
    });
    for (const coin of coins) {
      this.spawnCoinMesh(coin.id, coin.x, coin.y, coin.z, coin.value);
    }

    this.onlineUnsub = client.subscribe((ev) => this.handleServerEvent(ev));
    this.gameState = 'PLAYING';
    this.syncMusicTrack();
    this.emitHud();
  }

  private handleServerEvent(ev: ServerEvent): void {
    if (!this.isOnline) return;

    if (ev.type === 'PLAYER_KINEMATICS') {
      const p = ev.player;
      if (p.slot === this.localSlot) return;
      const m = this.monkeys[p.slot];
      if (!m) return;
      m.alive = p.alive;
      m.rig.group.visible = m.alive;
      m.targetPos.set(p.x, p.y, p.z);
      m.vel.set(p.vx, p.vy, p.vz);
      m.facingYaw = p.yaw;
      m.armPhase = p.armPhase;
      m.boostTimer = p.boostTimer;
      m.slideTimer = p.slideTimer ?? 0;
      m.attackTimer = p.attackTimer;
      m.shieldTimer = p.shieldActive ? 0.5 : 0;
      m.rig.shieldMesh.visible = p.shieldActive;
    } else if (ev.type === 'TRACK_SPAWN') {
      for (const nt of ev.tracks) {
        this.spawnTrackFromNet(nt);
      }
    } else if (ev.type === 'COAL_UPDATE') {
      const coal = this.coalSources[ev.coalIndex];
      if (coal) {
        coal.hp = ev.hp;
        coal.hitFlashTimer = 0.12;
        coal.shakeTimer = 0.18;
        this.spawnBurst3D(coal.pos.x, coal.pos.y + 1.5, coal.pos.z, 6, 'spark', 0xf4f4f8);
        if (ev.destroyed && !coal.destroyed) {
          coal.destroyed = true;
          coal.rig.activeGroup.visible = false;
          coal.rig.craterGroup.visible = true;
          this.sound.playCoalDestroy();
          this.smokeClock = Math.max(0, this.smokeClock - 9);
          this.addTrauma(0.5);
          this.spawnBurst3D(coal.pos.x, coal.pos.y + 1.5, coal.pos.z, 18, 'coal', 0x101014);
          this.spawnRing(coal.pos.x, coal.pos.z, coal.pos.y + 0.35);
        } else if (!ev.destroyed) {
          this.sound.playCoalHit();
        }
      }
      for (const coin of ev.spawnedCoins) {
        this.spawnCoinMesh(coin.id, coin.x, coin.y, coin.z, coin.value);
      }
      this.emitHud();
    } else if (ev.type === 'COIN_COLLECTED') {
      const coin = this.coins.find((c) => c.id === ev.coinId);
      if (coin && !coin.collected) {
        coin.collected = true;
        coin.mesh.visible = false;
      }
      if (ev.collectorSlot === this.localSlot) {
        this.coinsRun += ev.value;
        this.sound.playCoinPickup();
      }
      this.emitHud();
    } else if (ev.type === 'TIME_STOP') {
      this.timeStopTimer = Math.max(this.timeStopTimer, ev.durationMs / 1000);
      this.sound.playTimeStop();
      this.emitHud();
    } else if (ev.type === 'ABILITY_FX') {
      if (ev.abilityId === 'coal_beacon') {
        this.coalBlinkTimer = Math.max(this.coalBlinkTimer, 2.0);
        if (ev.bySlot !== this.localSlot) {
          this.sound.playCoalBeacon();
        }
      }
      if (ev.bySlot !== this.localSlot) {
        const rm = this.monkeys[ev.bySlot];
        if (rm) {
          this.spawnRing(rm.pos.x, rm.pos.z, rm.pos.y + 0.3);
        }
      }
    } else if (ev.type === 'PLAYER_DEAD') {
      const m = this.monkeys[ev.slot];
      if (m && m.alive) {
        m.alive = false;
        m.rig.group.visible = false;
        this.sound.playMonkeyHit();
        this.addTrauma(0.65);
        this.spawnBurst3D(m.pos.x, m.pos.y + 1.2, m.pos.z, 12, 'coal', 0x16161a);
        this.spawnBurst3D(m.pos.x, m.pos.y + 1.2, m.pos.z, 7, 'spark', 0xf8f8fc);
      }
      this.emitHud();
    } else if (ev.type === 'CLIMAX_STOP') {
      this.triggerTrainStopClimax();
    } else if (ev.type === 'MATCH_END') {
      this.runResultNonce += 1;
      this.gameState = ev.outcome === 'GAME_OVER' ? 'GAME_OVER' : 'STAGE_CLEAR';
      this.syncMusicTrack();
      this.emitHud();
    } else if (ev.type === 'ROOM_LEFT') {
      if (this.gameState === 'PLAYING') {
        this.returnToTitle();
      }
    }
  }

  public nextStage(): void {
    if (this.isOnline) return;
    if (this.currentStageIndex + 1 >= STAGES.length) {
      this.gameState = 'VICTORY';
      this.syncMusicTrack();
      this.emitHud();
      return;
    }
    this.sound.unlock();
    this.loadStage(this.currentStageIndex + 1, true);
    this.gameState = 'PLAYING';
    this.syncMusicTrack();
    this.emitHud();
  }

  public returnToTitle(): void {
    this.detachOnline();
    this.heldKeys.clear();
    this.loadStage(0, false);
    this.gameState = 'TITLE_MENU';
    this.syncMusicTrack();
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.gameState !== 'PLAYING' || this.isOnline) return;
    this.heldKeys.clear();
    this.gameState = 'PAUSED';
    this.syncMusicTrack();
    this.emitHud();
  }

  public resumeGame(): void {
    if (this.gameState !== 'PAUSED') return;
    this.heldKeys.clear();
    this.gameState = 'PLAYING';
    this.syncMusicTrack();
    this.emitHud();
  }

  public toggleMute(): void {
    this.sound.setMuted(!this.sound.muted);
    this.emitHud();
  }

  private syncMusicTrack(): void {
    if (this.gameState === 'PLAYING') {
      this.sound.setMusicTrack(this.stage.isBoss ? 'boss' : 'game', false);
    } else if (this.gameState === 'PAUSED') {
      this.sound.setMusicTrack(this.stage.isBoss ? 'boss' : 'game', true);
    } else if (this.gameState === 'TITLE_MENU') {
      this.sound.setMusicTrack('lobby', false);
    } else {
      // STAGE_CLEAR, VICTORY, GAME_OVER -> somber low lobby atmosphere
      this.sound.setMusicTrack('lobby', true);
    }
  }

  private getActiveGamepad(): Gamepad | null {
    if (typeof navigator.getGamepads !== 'function') return null;
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (pad && pad.connected) {
        this.gamepadConnected = true;
        return pad;
      }
    }
    return null;
  }

  private rumbleXbox(strong: number, weak: number, durationMs: number): void {
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const pad of pads) {
        if (!pad) continue;
        const actuator = pad.vibrationActuator as unknown as
          | { playEffect?: (type: string, params: Record<string, number>) => Promise<unknown> }
          | undefined;
        if (actuator && typeof actuator.playEffect === 'function') {
          actuator
            .playEffect('dual-rumble', {
              startDelay: 0,
              duration: durationMs,
              weakMagnitude: Math.min(1, Math.max(0, weak)),
              strongMagnitude: Math.min(1, Math.max(0, strong)),
            })
            .catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  }

  private pollGamepadMenus(): void {
    const pad = this.getActiveGamepad();
    if (!pad) return;
    const buttons = pad.buttons.map((b) => b.pressed || b.value > 0.5);
    const justPressed = (idx: number) =>
      Boolean(buttons[idx] && !this.prevGamepadButtons[idx]);

    if (this.gameState === 'PLAYING') {
      if (justPressed(9) && !this.isOnline) this.pauseGame();
      else {
        if (justPressed(0)) {
          this.sound.unlock();
          this.jumpBufferTimer = 0.16;
        }
        if (justPressed(2) || justPressed(7)) {
          this.sound.unlock();
          this.attackJustPressed = true;
        }
        if (justPressed(3) || justPressed(5)) {
          this.sound.unlock();
          this.abilityJustPressed = true;
        }
        if (justPressed(8)) this.toggleMute();
        if (justPressed(4)) this.wideView = !this.wideView;
      }
    } else if (this.gameState === 'PAUSED') {
      if (justPressed(9) || justPressed(0) || justPressed(1)) this.resumeGame();
    }

    this.prevGamepadButtons = buttons;
  }

  private getDifficultyMetrics() {
    const stage = this.stage;
    const total = this.coalSources.length;
    const destroyed = this.coalSources.filter((c) => c.destroyed).length;
    const ratio = destroyed / Math.max(1, total - 1);

    const spawnInterval = Math.max(
      stage.minSpawnInterval,
      stage.baseSpawnInterval - ratio * (stage.baseSpawnInterval - stage.minSpawnInterval)
    );
    const telegraphDelay = Math.max(
      stage.minDelay,
      stage.baseDelay - ratio * (stage.baseDelay - stage.minDelay)
    );
    const trainSpeed = stage.baseTrainSpeed + ratio * 22;

    return { total, destroyed, ratio, spawnInterval, telegraphDelay, trainSpeed };
  }

  private getLivingMonkeys(): MonkeyEntity[] {
    return this.monkeys.filter((m) => m.alive);
  }

  private getControlledMonkey(): MonkeyEntity | null {
    if (this.isOnline) {
      const mine = this.monkeys[this.localSlot];
      return mine && mine.alive ? mine : null;
    }
    return this.getLivingMonkeys()[0] || null;
  }

  private getSmokeLevel(): number {
    return THREE.MathUtils.clamp(this.smokeClock / 90, 0, 1);
  }

  private update(dt: number): void {
    this.elapsedTotal += dt;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.8);
      this.updateCamera(dt);
      return;
    }

    const prevTimeStop = this.timeStopTimer;
    if (this.timeStopTimer > 0) {
      this.timeStopTimer = Math.max(0, this.timeStopTimer - dt);
      if (prevTimeStop > 0 && this.timeStopTimer <= 0) {
        this.sound.playTimeResume();
      }
    }
    const timeFrozen = this.timeStopTimer > 0;

    if (!this.isStoppingClimax && !timeFrozen) {
      this.runElapsed += dt;
      this.smokeClock += dt;
    }

    // Progressive vision-reducing smoke fog density (respects Fog graphics toggle)
    if (this.fogEffectsEnabled) {
      if (!(this.scene.fog instanceof THREE.FogExp2)) {
        this.scene.fog = new THREE.FogExp2(this.stage.fogColor, this.stage.fogDensity);
      }
      const smoke = this.getSmokeLevel();
      this.scene.fog.density = this.stage.fogDensity * (1 + smoke * 1.45);
    } else if (this.scene.fog) {
      this.scene.fog = null;
    }

    if (this.packInvulnTimer > 0) this.packInvulnTimer = Math.max(0, this.packInvulnTimer - dt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.attackHoldCooldown > 0) this.attackHoldCooldown = Math.max(0, this.attackHoldCooldown - dt);
    if (this.abilityCooldownTimer > 0) this.abilityCooldownTimer = Math.max(0, this.abilityCooldownTimer - dt);
    if (this.abilityActiveTimer > 0) this.abilityActiveTimer = Math.max(0, this.abilityActiveTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.quakeSlowTimer > 0) this.quakeSlowTimer = Math.max(0, this.quakeSlowTimer - dt);
    if (this.coalBlinkTimer > 0) this.coalBlinkTimer = Math.max(0, this.coalBlinkTimer - dt);

    if (this.heldKeys.has('KeyQ')) this.camYaw += dt * 2.1;
    if (this.heldKeys.has('KeyC')) this.camYaw -= dt * 2.1;
    const pad = this.getActiveGamepad();
    if (pad && Math.abs(pad.axes[2] || 0) > 0.2) {
      this.camYaw -= (pad.axes[2] || 0) * dt * 2.4;
    }

    this.stageEnv?.update(this.elapsedTotal, dt);
    this.updateMonkeys(dt, pad);
    this.updateSupports(dt);
    this.updateCoalSources(dt);
    this.updateCoins(dt);

    if (!timeFrozen) {
      if (!this.isOnline) {
        this.updateTrainSpawner(dt);
      }
      this.updateTracks(dt);
    }
    this.updateParticles(dt);

    if (this.isOnline && this.onlineClient) {
      this.netSyncTimer += dt;
      if (this.netSyncTimer >= 0.05) {
        this.netSyncTimer = 0;
        const mine = this.monkeys[this.localSlot];
        if (mine && mine.alive) {
          this.onlineClient.send({
            type: 'PLAYER_STATE',
            state: {
              slot: this.localSlot,
              x: mine.pos.x,
              y: mine.pos.y,
              z: mine.pos.z,
              vx: mine.vel.x,
              vy: mine.vel.y,
              vz: mine.vel.z,
              yaw: mine.facingYaw,
              armPhase: mine.armPhase,
              boostTimer: mine.boostTimer,
              slideTimer: mine.slideTimer,
              attackTimer: mine.attackTimer,
              shieldActive: mine.shieldTimer > 0,
              alive: mine.alive,
            },
          });
        }
      }
    }

    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.85);
    this.updateCamera(dt);

    if (this.isStoppingClimax && !this.isOnline) {
      this.stoppingClimaxTimer -= dt;
      if (this.stoppingClimaxTimer <= 0) {
        this.runResultNonce += 1;
        this.gameState =
          this.currentStageIndex + 1 >= STAGES.length ? 'VICTORY' : 'STAGE_CLEAR';
        this.syncMusicTrack();
        this.emitHud();
        return;
      }
    }

    this.hudSyncTimer += dt;
    const syncRate = this.flashTimer > 0 ? 0.05 : this.isMobileDevice ? 0.14 : 0.1;
    if (this.hudSyncTimer >= syncRate) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private readMovementXZ(pad: Gamepad | null): { mx: number; mz: number } {
    let inputX = 0;
    let inputZ = 0;

    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) inputX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) inputX += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) inputZ -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) inputZ += 1;

    inputX += this.touchMoveX;
    inputZ += this.touchMoveZ;

    if (pad) {
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      const mag = Math.hypot(ax, ay);
      if (mag > 0.18) {
        const scaled = Math.min(1, (mag - 0.18) / 0.82);
        inputX += (ax / mag) * scaled;
        inputZ += (ay / mag) * scaled;
      }
      if (pad.buttons[14]?.pressed) inputX -= 1;
      if (pad.buttons[15]?.pressed) inputX += 1;
      if (pad.buttons[12]?.pressed) inputZ -= 1;
      if (pad.buttons[13]?.pressed) inputZ += 1;
    }

    const len = Math.hypot(inputX, inputZ);
    if (len > 1) {
      inputX /= len;
      inputZ /= len;
    }

    const cos = Math.cos(this.camYaw);
    const sin = Math.sin(this.camYaw);
    return {
      mx: inputX * cos + inputZ * sin,
      mz: -inputX * sin + inputZ * cos,
    };
  }

  private activateEquippedAbility(lead: MonkeyEntity): void {
    if (this.abilityCooldownTimer > 0) return;
    const def = getAbilityDef(this.equippedAbility);
    this.abilityCooldownTimer = def.cooldown;
    this.abilityActiveTimer = def.duration;

    if (this.equippedAbility === 'dash_basic') {
      const dirX = Math.sin(lead.facingYaw);
      const dirZ = Math.cos(lead.facingYaw);
      lead.vel.x = dirX * 26;
      lead.vel.z = dirZ * 26;
      lead.vel.y = Math.max(lead.vel.y, 7.5);
      lead.boostTimer = Math.max(lead.boostTimer, 0.9);
      this.sound.playAbility();
      this.spawnBurst3D(lead.pos.x, lead.pos.y + 0.8, lead.pos.z, 8, 'smoke', 0xdcdce4);
    } else if (this.equippedAbility === 'double_jump') {
      lead.vel.y = 18.0;
      lead.boostTimer = Math.max(lead.boostTimer, 1.35);
      this.sound.playSupportVault();
      this.spawnRing(lead.pos.x, lead.pos.z, lead.pos.y + 0.2);
    } else if (this.equippedAbility === 'iron_shield') {
      lead.shieldTimer = def.duration;
      lead.rig.shieldMesh.visible = true;
      this.sound.playAbility();
      this.spawnRing(lead.pos.x, lead.pos.z, lead.pos.y + 0.5);
    } else if (this.equippedAbility === 'seismic_smash') {
      this.sound.playCoalDestroy();
      this.addTrauma(0.5);
      this.spawnRing(lead.pos.x, lead.pos.z, lead.pos.y + 0.35);
      this.spawnBurst3D(lead.pos.x, lead.pos.y + 1.2, lead.pos.z, 14, 'spark', 0xf4f4f8);
      for (const c of this.coins) {
        if (!c.collected && Math.hypot(c.pos.x - lead.pos.x, c.pos.z - lead.pos.z) <= 22) {
          c.magnetized = true;
        }
      }
      this.coalSources.forEach((coal, idx) => {
        if (coal.destroyed) return;
        const d = Math.hypot(coal.pos.x - lead.pos.x, coal.pos.z - lead.pos.z);
        if (d <= 12) {
          this.applyCoalDamage(coal, idx, 58);
        }
      });
    } else if (this.equippedAbility === 'coal_beacon') {
      this.coalBlinkTimer = 2.0;
      this.sound.playCoalBeacon();
      this.rumbleXbox(0.25, 0.35, 160);
      this.spawnRing(lead.pos.x, lead.pos.z, lead.pos.y + 0.35);
      this.spawnBurst3D(lead.pos.x, lead.pos.y + 1.2, lead.pos.z, 10, 'spark', 0xef4444);
    } else if (this.equippedAbility === 'time_stop') {
      this.timeStopTimer = 3.0;
      this.sound.playTimeStop();
      this.rumbleXbox(0.6, 0.2, 220);
      this.spawnRing(lead.pos.x, lead.pos.z, lead.pos.y + 0.4);
    } else if (this.equippedAbility === 'slide_boost') {
      const { mx, mz } = this.readMovementXZ(this.getActiveGamepad());
      const inputMag = Math.hypot(mx, mz);
      const dirX = inputMag > 0.12 ? mx / inputMag : Math.sin(lead.facingYaw);
      const dirZ = inputMag > 0.12 ? mz / inputMag : Math.cos(lead.facingYaw);
      const pack = this.isOnline ? [lead] : this.getLivingMonkeys();
      for (const m of pack) {
        m.slideTimer = def.duration;
        m.slideDirX = dirX;
        m.slideDirZ = dirZ;
        m.slideSpeed = 38;
        m.vel.x = dirX * 38;
        m.vel.z = dirZ * 38;
        m.boostTimer = Math.max(m.boostTimer, def.duration);
        m.facingYaw = Math.atan2(dirX, dirZ);
      }
      this.sound.playSlideWhoosh();
      this.addTrauma(0.28);
      this.rumbleXbox(0.45, 0.35, 180);
      this.spawnRing(lead.pos.x, lead.pos.z, lead.pos.y + 0.25);
      this.spawnBurst3D(lead.pos.x, lead.pos.y + 0.5, lead.pos.z, 12, 'smoke', 0xe4e4ec);
    }

    if (this.isOnline && this.onlineClient) {
      this.onlineClient.send({
        type: 'USE_ABILITY',
        abilityId: this.equippedAbility,
      });
    }
    this.emitHud();
  }

  private updateMonkeys(dt: number, pad: Gamepad | null): void {
    const stage = this.stage;
    const living = this.getLivingMonkeys();
    const lead = this.getControlledMonkey();

    // Update remote players smoothly in online mode
    if (this.isOnline) {
      for (const m of this.monkeys) {
        if (m.id === this.localSlot || !m.alive) continue;
        m.pos.lerp(m.targetPos, 1 - Math.exp(-16 * dt));
        const floorY = groundHeightAt(m.pos.x, m.pos.z, stage);
        this.animateMonkeyRig(m, floorY);
      }
    }

    if (!lead) {
      this.abilityJustPressed = false;
      this.attackJustPressed = false;
      return;
    }

    const { mx, mz } = this.readMovementXZ(pad);

    this.nearSupportId = null;
    let bestSupDist = 3.2;
    for (const sup of this.supports) {
      const d = Math.hypot(sup.pos.x - lead.pos.x, sup.pos.z - lead.pos.z);
      if (d < bestSupDist) {
        bestSupDist = d;
        this.nearSupportId = sup.id;
      }
    }

    this.nearCoalId = null;
    this.nearArmoredCoal = false;
    let bestCoalDist = 6.2;
    for (const coal of this.coalSources) {
      if (coal.destroyed) continue;
      const d = Math.hypot(coal.pos.x - lead.pos.x, coal.pos.z - lead.pos.z);
      if (d < bestCoalDist) {
        bestCoalDist = d;
        this.nearCoalId = coal.id;
        this.nearArmoredCoal = coal.rig.armored;
      }
    }

    if (this.abilityJustPressed) {
      this.abilityJustPressed = false;
      this.activateEquippedAbility(lead);
    }

    const leadFloorY = groundHeightAt(lead.pos.x, lead.pos.z, stage);
    if (lead.pos.y <= leadFloorY + 0.16) {
      lead.coyoteTimer = 0.14;
      this.doubleJumpReady = this.equippedAbility === 'double_jump';
    } else if (lead.coyoteTimer > 0) {
      lead.coyoteTimer = Math.max(0, lead.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0) {
      let vaultSupport: SupportEntity | null = null;
      for (const sup of this.supports) {
        if (sup.cooldown > 0) continue;
        const hd = Math.hypot(sup.pos.x - lead.pos.x, sup.pos.z - lead.pos.z);
        if (hd <= 3.1 && lead.pos.y <= sup.pos.y + 4.0) {
          vaultSupport = sup;
          break;
        }
      }

      const targets = this.isOnline ? [lead] : living;

      if (vaultSupport) {
        this.jumpBufferTimer = 0;
        vaultSupport.bounceAnim = 0.45;
        vaultSupport.cooldown = 0.35;
        this.vaultsUsed += 1;
        if (!this.isOnline) this.coinsRun += 5;
        this.sound.playSupportVault();
        this.rumbleXbox(0.28, 0.48, 120);

        for (const m of targets) {
          m.vel.y = 18.4;
          m.pos.y = Math.max(m.pos.y, groundHeightAt(m.pos.x, m.pos.z, stage) + 0.2);
          m.boostTimer = 2.05;
        }
        this.spawnRing(vaultSupport.pos.x, vaultSupport.pos.z, vaultSupport.pos.y + 0.25);
        this.spawnBurst3D(
          vaultSupport.pos.x,
          vaultSupport.pos.y + 1.4,
          vaultSupport.pos.z,
          10,
          'spark',
          0xdcdce4
        );
      } else if (lead.coyoteTimer > 0) {
        this.jumpBufferTimer = 0;
        lead.coyoteTimer = 0;
        this.sound.playJump();
        for (const m of targets) {
          m.vel.y = 11.4;
          m.pos.y += 0.08;
          m.boostTimer = Math.max(m.boostTimer, 0.35);
        }
        this.spawnBurst3D(lead.pos.x, leadFloorY + 0.2, lead.pos.z, 4, 'smoke', 0x7a7a85);
      } else if (this.equippedAbility === 'double_jump' && this.doubleJumpReady && this.abilityCooldownTimer <= 0) {
        this.jumpBufferTimer = 0;
        this.doubleJumpReady = false;
        this.activateEquippedAbility(lead);
      }
    }

    const holdingAttack =
      this.heldKeys.has('KeyE') ||
      this.heldKeys.has('KeyF') ||
      this.heldKeys.has('KeyJ') ||
      Boolean(pad && (pad.buttons[2]?.pressed || (pad.buttons[7]?.value || 0) > 0.5));

    if (
      (this.attackJustPressed || (holdingAttack && this.attackHoldCooldown <= 0)) &&
      !this.isStoppingClimax
    ) {
      this.attackJustPressed = false;
      this.attackHoldCooldown = 0.24;
      this.performMonkeySmash(lead, this.isOnline ? [lead] : living);
    }
    this.attackJustPressed = false;

    const quakePassing =
      this.timeStopTimer <= 0 &&
      this.activeTracks.some(
        (tr) =>
          tr.specialKind === 'quake' &&
          tr.phase === 'PASSING' &&
          tr.trainDist >= -48 &&
          tr.trainDist - tr.trainLength <= 56
      );
    const airborneByImpulse =
      lead.pos.y > leadFloorY + 0.25 || (lead.vel.y > 0.35 && lead.boostTimer > 0);

    if (quakePassing) {
      if (airborneByImpulse) {
        this.quakeSlowTimer = 0;
        this.quakeAirborneActive = true;
      } else {
        this.quakeSlowTimer = 0.22;
        this.quakeAirborneActive = false;
      }
    } else {
      this.quakeAirborneActive = false;
      if (airborneByImpulse) {
        this.quakeSlowTimer = 0;
      }
    }

    const baseSpeed = 13.4;
    const boostMult = lead.boostTimer > 0 ? 1.98 : 1;
    const slowMult = this.quakeSlowTimer > 0 && !airborneByImpulse ? 0.45 : 1;

    let targetVx: number;
    let targetVz: number;
    let accel: number;

    if (lead.slideTimer > 0) {
      lead.slideTimer = Math.max(0, lead.slideTimer - dt);
      // Gradually decelerate from massive 38 m/s burst down toward running speed
      lead.slideSpeed = Math.max(10.5, lead.slideSpeed - 15.5 * dt);

      if (Math.hypot(mx, mz) > 0.15) {
        lead.slideDirX += mx * dt * 2.1;
        lead.slideDirZ += mz * dt * 2.1;
        const dLen = Math.hypot(lead.slideDirX, lead.slideDirZ) || 1;
        lead.slideDirX /= dLen;
        lead.slideDirZ /= dLen;
      }

      targetVx = lead.slideDirX * lead.slideSpeed * slowMult;
      targetVz = lead.slideDirZ * lead.slideSpeed * slowMult;
      accel = 24;

      if (lead.pos.y <= leadFloorY + 0.35 && Math.random() < 0.55) {
        this.spawnBurst3D(lead.pos.x, lead.pos.y + 0.25, lead.pos.z, 1, 'smoke', 0xd4d4dc);
      }
      if (!this.isOnline) {
        for (const m of living) {
          if (m !== lead) m.slideTimer = lead.slideTimer;
        }
      }
    } else {
      targetVx = mx * baseSpeed * boostMult * slowMult;
      targetVz = mz * baseSpeed * boostMult * slowMult;
      // Responsive, fluid steering acceleration
      accel = lead.pos.y > leadFloorY + 0.2 ? 10 : 16;
    }

    lead.vel.x = THREE.MathUtils.damp(lead.vel.x, targetVx, accel, dt);
    lead.vel.z = THREE.MathUtils.damp(lead.vel.z, targetVz, accel, dt);

    const oldX = lead.pos.x;
    const oldZ = lead.pos.z;
    lead.pos.x += lead.vel.x * dt;
    lead.pos.z += lead.vel.z * dt;
    this.constrainMonkey(lead);

    const movedStep = Math.hypot(lead.pos.x - oldX, lead.pos.z - oldZ);
    if (!this.isStoppingClimax) this.totalDistance += movedStep;

    const hSpeed = Math.hypot(lead.vel.x, lead.vel.z);
    this.currentSpeed = hSpeed;
    if (hSpeed > this.peakSpeed) this.peakSpeed = hSpeed;

    if (hSpeed > 0.8) {
      const targetYaw = Math.atan2(lead.vel.x, lead.vel.z);
      let diff = targetYaw - lead.facingYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      lead.facingYaw += diff * Math.min(1, 15 * dt);
      lead.armPhase += dt * (4.4 + hSpeed * 0.72);
    }

    this.packLantern.position.set(lead.pos.x, lead.pos.y + 3.2, lead.pos.z);

    if (!this.isOnline) {
      const packOffsets = [
        { angle: 2.3, dist: 2.3 },
        { angle: -2.3, dist: 2.3 },
      ];
      let fIdx = 0;
      for (const m of living) {
        if (m === lead) continue;
        const off = packOffsets[fIdx % packOffsets.length];
        fIdx++;
        const slotYaw = lead.facingYaw + off.angle;
        const gx = lead.pos.x + Math.sin(slotYaw) * off.dist;
        const gz = lead.pos.z + Math.cos(slotYaw) * off.dist;

        const prevX = m.pos.x;
        const prevZ = m.pos.z;
        m.pos.x = THREE.MathUtils.damp(m.pos.x, gx, 11, dt);
        m.pos.z = THREE.MathUtils.damp(m.pos.z, gz, 11, dt);
        m.vel.x = (m.pos.x - prevX) / dt;
        m.vel.z = (m.pos.z - prevZ) / dt;

        const fs = Math.hypot(m.vel.x, m.vel.z);
        if (fs > 0.8) {
          m.facingYaw = Math.atan2(m.vel.x, m.vel.z);
          m.armPhase += dt * (4.2 + fs * 0.72);
        } else {
          m.facingYaw = lead.facingYaw;
        }
        this.constrainMonkey(m);
      }
    }

    const gravity = 33;
    const localMonkeys = this.isOnline ? [lead] : living;
    for (const m of localMonkeys) {
      const floorY = groundHeightAt(m.pos.x, m.pos.z, stage);
      if (m.pos.y > floorY || m.vel.y > 0) {
        m.pos.y += m.vel.y * dt;
        m.vel.y -= gravity * dt;
        if (m.pos.y <= floorY) {
          m.pos.y = floorY;
          m.vel.y = 0;
          if (m.boostTimer > 0.35 && m === lead) {
            this.performMonkeySmash(lead, localMonkeys, 1.3);
          }
        }
      } else {
        m.pos.y = floorY;
      }

      if (m.boostTimer > 0) m.boostTimer = Math.max(0, m.boostTimer - dt);
      if (m.attackTimer > 0) m.attackTimer = Math.max(0, m.attackTimer - dt);
      if (m.hitFlashTimer > 0) m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
      if (m.shieldTimer > 0) {
        m.shieldTimer = Math.max(0, m.shieldTimer - dt);
        m.rig.shieldMesh.visible = m.shieldTimer > 0;
        m.rig.shieldMesh.rotation.y += dt * 3;
      } else {
        m.rig.shieldMesh.visible = false;
      }

      this.animateMonkeyRig(m, floorY);
    }
  }

  private animateMonkeyRig(m: MonkeyEntity, floorY: number): void {
    m.rig.group.position.copy(m.pos);
    m.rig.group.rotation.y = m.facingYaw;

    if (this.packInvulnTimer > 0 && Math.floor(this.elapsedTotal * 20) % 2 === 0 && (!this.isOnline || m.id === this.localSlot)) {
      m.rig.group.visible = false;
      return;
    }
    m.rig.group.visible = m.alive;

    const speed = Math.hypot(m.vel.x, m.vel.z);
    const airborne = m.pos.y > floorY + 0.16;

    if (m.attackTimer > 0) {
      const t = Math.sin((m.attackTimer / 0.22) * Math.PI);
      m.rig.leftArmPivot.rotation.x = -1.75 * t;
      m.rig.rightArmPivot.rotation.x = -1.75 * t;
      m.rig.leftArmPivot.rotation.z = 0.25;
      m.rig.rightArmPivot.rotation.z = -0.25;
      m.rig.bodyGroup.rotation.x = 0.35 * t;
    } else if (airborne) {
      const boostSpread = m.boostTimer > 0 ? 0.78 : 0.45;
      m.rig.leftArmPivot.rotation.x = -1.35;
      m.rig.rightArmPivot.rotation.x = -1.35;
      m.rig.leftArmPivot.rotation.z = boostSpread;
      m.rig.rightArmPivot.rotation.z = -boostSpread;
      m.rig.bodyGroup.rotation.x = 0.28;
      m.rig.bodyGroup.position.y = 0;
    } else if (m.slideTimer > 0) {
      // Low crouched pack slide pose leaning back as momentum carries them forward
      m.rig.leftArmPivot.rotation.x = 0.75;
      m.rig.rightArmPivot.rotation.x = 0.75;
      m.rig.leftArmPivot.rotation.z = 0.55;
      m.rig.rightArmPivot.rotation.z = -0.55;
      m.rig.bodyGroup.position.y = -0.34;
      m.rig.bodyGroup.rotation.x = -0.62;
    } else if (speed > 0.8) {
      const swing = Math.sin(m.armPhase);
      m.rig.leftArmPivot.rotation.x = swing * 1.15 - 0.2;
      m.rig.rightArmPivot.rotation.x = -swing * 1.15 - 0.2;
      m.rig.leftArmPivot.rotation.z = 0.16;
      m.rig.rightArmPivot.rotation.z = -0.16;
      m.rig.bodyGroup.position.y = Math.abs(Math.cos(m.armPhase)) * 0.26;
      m.rig.bodyGroup.rotation.x = Math.min(0.32, speed * 0.02);
    } else {
      const breathe = Math.sin(this.elapsedTotal * 3 + m.id) * 0.06;
      m.rig.leftArmPivot.rotation.x = -0.25 + breathe;
      m.rig.rightArmPivot.rotation.x = -0.25 - breathe;
      m.rig.leftArmPivot.rotation.z = 0.14;
      m.rig.rightArmPivot.rotation.z = -0.14;
      m.rig.bodyGroup.position.y = 0;
      m.rig.bodyGroup.rotation.x = 0.1;
    }
  }

  private constrainMonkey(m: MonkeyEntity): void {
    const distFromCenter = Math.hypot(m.pos.x, m.pos.z);
    if (distFromCenter > this.playRadius - 1.5) {
      const s = (this.playRadius - 1.5) / distFromCenter;
      m.pos.x *= s;
      m.pos.z *= s;
    }

    for (const coal of this.coalSources) {
      if (coal.destroyed) continue;
      const dx = m.pos.x - coal.pos.x;
      const dz = m.pos.z - coal.pos.z;
      const dist = Math.hypot(dx, dz);
      const minD = 3.2;
      if (dist < minD && dist > 0.001) {
        m.pos.x = coal.pos.x + (dx / dist) * minD;
        m.pos.z = coal.pos.z + (dz / dist) * minD;
      }
    }
  }

  private performMonkeySmash(lead: MonkeyEntity, animMonkeys: MonkeyEntity[], mult = 1): void {
    for (const m of animMonkeys) m.attackTimer = 0.22;

    for (let idx = 0; idx < this.coalSources.length; idx++) {
      const coal = this.coalSources[idx];
      if (coal.destroyed) continue;
      const d = Math.hypot(coal.pos.x - lead.pos.x, coal.pos.z - lead.pos.z);
      if (d <= 6.5) {
        const baseDmg = this.isOnline ? 26 : 13 + animMonkeys.length * 8;
        const dmg = baseDmg * (lead.boostTimer > 0 ? 1.45 : 1) * mult;
        this.applyCoalDamage(coal, idx, dmg);
        return;
      }
    }
  }

  private applyCoalDamage(coal: CoalEntity, coalIdx: number, dmg: number): void {
    if (this.isOnline && this.onlineClient) {
      this.onlineClient.send({
        type: 'COAL_HIT',
        coalIndex: coalIdx,
        damage: Math.round(dmg),
        x: coal.pos.x,
        z: coal.pos.z,
      });
      this.hitstopTimer = 0.025;
      this.addTrauma(0.2);
      this.rumbleXbox(0.32, 0.2, 85);
      return;
    }

    coal.hp = Math.max(0, coal.hp - dmg);
    coal.hitFlashTimer = 0.12;
    coal.shakeTimer = 0.18;
    this.spawnBurst3D(coal.pos.x, coal.pos.y + 1.5, coal.pos.z, 8, 'coal', 0x16161b);
    this.spawnBurst3D(coal.pos.x, coal.pos.y + 1.6, coal.pos.z, 6, 'spark', 0xf4f4f8);

    if (coal.hp <= 0) {
      this.destroyCoalSource(coal);
    } else {
      this.sound.playCoalHit();
      this.hitstopTimer = 0.03;
      this.addTrauma(0.22);
      this.rumbleXbox(0.35, 0.25, 95);
    }
  }

  private destroyCoalSource(coal: CoalEntity): void {
    coal.destroyed = true;
    coal.hp = 0;
    coal.rig.activeGroup.visible = false;
    coal.rig.craterGroup.visible = true;

    this.sound.playCoalDestroy();
    this.hitstopTimer = 0.065;
    this.addTrauma(0.58);
    this.rumbleXbox(0.9, 0.75, 290);

    // Clearing coal disperses a pocket of smoke and drops coins (armored carts drop an extra coin)
    this.smokeClock = Math.max(0, this.smokeClock - 10);
    const coinDrops = coal.rig.armored ? 4 : 3;
    for (let k = 0; k < coinDrops; k++) {
      const a = (k / coinDrops) * Math.PI * 2 + Math.random();
      const cx = coal.pos.x + Math.cos(a) * 3.4;
      const cz = coal.pos.z + Math.sin(a) * 3.4;
      this.spawnCoinMesh(
        this.nextCoinId++,
        cx,
        groundHeightAt(cx, cz, this.stage) + 1.15,
        cz,
        15
      );
    }

    this.spawnBurst3D(coal.pos.x, coal.pos.y + 1.5, coal.pos.z, 20, 'coal', 0x101014);
    this.spawnBurst3D(coal.pos.x, coal.pos.y + 2.0, coal.pos.z, 12, 'smoke', 0xa8a8b2);
    this.spawnRing(coal.pos.x, coal.pos.z, coal.pos.y + 0.35);

    const remaining = this.coalSources.filter((c) => !c.destroyed).length;
    if (remaining === 0) {
      this.triggerTrainStopClimax();
    } else {
      this.trainSpawnTimer = Math.min(this.trainSpawnTimer, 0.8);
    }
    this.emitHud();
  }

  private triggerTrainStopClimax(): void {
    this.isStoppingClimax = true;
    this.stoppingClimaxTimer = 3.0;
    this.sound.playTrainShutdown();
    this.addTrauma(0.75);
    this.rumbleXbox(0.9, 0.9, 950);

    let hasTrain = false;
    for (const tr of this.activeTracks) {
      if (tr.phase === 'PASSING' && tr.trainVis) {
        tr.phase = 'STOPPING';
        tr.isDying = true;
        hasTrain = true;
      } else if (tr.phase === 'TELEGRAPH') {
        tr.phase = 'FADING';
        tr.fadeTimer = 0.7;
      }
    }

    if (!hasTrain) {
      const lead = this.getLivingMonkeys()[0];
      const ax = lead ? lead.pos.x : 0;
      const az = lead ? lead.pos.z - 8 : -8;
      this.spawnTrackLine(ax, az, 0.15, 0, 'straight', 0.1, 36, true);
    }
    this.emitHud();
  }

  private updateCoins(dt: number): void {
    const lead = this.getControlledMonkey();
    for (const c of this.coins) {
      if (c.collected) continue;
      c.mesh.rotation.y += dt * 3.5;
      c.mesh.position.y += Math.sin(this.elapsedTotal * 4 + c.id) * 0.003;

      if (!lead) continue;
      const dx = lead.pos.x - c.pos.x;
      const dz = lead.pos.z - c.pos.z;
      const d = Math.hypot(dx, dz);

      if (d <= 4.4 || c.magnetized) {
        const pull = Math.min(1, dt * 13);
        c.pos.x += dx * pull;
        c.pos.z += dz * pull;
        c.pos.y = THREE.MathUtils.lerp(c.pos.y, lead.pos.y + 1.1, pull);
      }

      if (d <= 2.2) {
        c.collected = true;
        c.mesh.visible = false;
        if (this.isOnline && this.onlineClient) {
          this.onlineClient.send({ type: 'COLLECT_COIN', coinId: c.id });
        } else {
          this.coinsRun += c.value;
          this.sound.playCoinPickup();
          this.spawnBurst3D(c.pos.x, c.pos.y + 0.5, c.pos.z, 5, 'spark', 0xf8f8fc);
        }
      }
    }
  }

  private updateSupports(dt: number): void {
    for (const sup of this.supports) {
      if (sup.cooldown > 0) sup.cooldown = Math.max(0, sup.cooldown - dt);
      if (sup.bounceAnim > 0) {
        sup.bounceAnim = Math.max(0, sup.bounceAnim - dt * 1.8);
        sup.rig.springGroup.position.y = 1.12 + Math.sin(sup.bounceAnim * Math.PI * 3) * 0.34;
      } else {
        sup.rig.springGroup.position.y = 1.12;
      }

      const mat = sup.rig.ringMesh.material as THREE.MeshBasicMaterial;
      const isNear = sup.id === this.nearSupportId;
      mat.opacity = isNear ? 0.8 + 0.2 * Math.sin(this.elapsedTotal * 12) : 0.28;
      const s = isNear ? 1.12 : 1.0;
      sup.rig.ringMesh.scale.set(s, s, s);
    }
  }

  private updateCoalSources(dt: number): void {
    const beaconActive = this.coalBlinkTimer > 0;
    const blinkOn = beaconActive && Math.sin(this.elapsedTotal * 28) > -0.15;

    for (const coal of this.coalSources) {
      if (coal.destroyed) continue;
      if (coal.hitFlashTimer > 0) coal.hitFlashTimer = Math.max(0, coal.hitFlashTimer - dt);
      if (coal.shakeTimer > 0) {
        coal.shakeTimer = Math.max(0, coal.shakeTimer - dt);
        coal.rig.activeGroup.position.set(
          (Math.random() - 0.5) * 0.35,
          0,
          (Math.random() - 0.5) * 0.35
        );
      } else {
        coal.rig.activeGroup.position.set(0, 0, 0);
      }

      for (const mesh of coal.rig.crystalMeshes) {
        const cMat = mesh.material as THREE.MeshStandardMaterial;
        if (beaconActive) {
          cMat.color.setHex(blinkOn ? 0xff2b2b : 0x5c0a0a);
          cMat.emissive.setHex(blinkOn ? 0xef4444 : 0x450a0a);
          cMat.emissiveIntensity = blinkOn ? 1.45 : 0.35;
        } else {
          cMat.color.setHex(coal.hitFlashTimer > 0 ? 0xf8f8fc : 0x0d0d11);
          cMat.emissive.setHex(0x000000);
          cMat.emissiveIntensity = 0;
        }
      }

      const dmgRatio = 1 - coal.hp / coal.maxHp;
      if (dmgRatio > 0.05) {
        coal.rig.cracksMesh.visible = true;
        coal.rig.cracksMesh.scale.setScalar(0.45 + dmgRatio * 0.75);
      }

      const gMat = coal.rig.glowDisc.material as THREE.MeshBasicMaterial;
      if (beaconActive) {
        gMat.color.setHex(0xef4444);
        gMat.opacity = blinkOn ? 0.98 : 0.35;
      } else {
        gMat.color.setHex(coal.rig.armored ? 0xe0f2fe : 0xffffff);
        gMat.opacity =
          (this.stage.isBoss ? 0.9 : 0.62) + Math.sin(this.elapsedTotal * 4 + coal.id) * 0.12;
      }
    }
  }

  private buildTrackPoints(
    anchorX: number,
    anchorZ: number,
    angle: number,
    curvature: number
  ): TrackPathPoint[] {
    const stage = this.stage;
    const pts: TrackPathPoint[] = new Array(TRACK_POINTS_COUNT);
    const mid = (TRACK_POINTS_COUNT - 1) / 2;

    pts[mid] = {
      s: 0,
      x: anchorX,
      y: groundHeightAt(anchorX, anchorZ, stage),
      z: anchorZ,
      yaw: angle,
      pitch: 0,
    };

    let fx = anchorX;
    let fz = anchorZ;
    let fYaw = angle;
    for (let i = mid + 1; i < TRACK_POINTS_COUNT; i++) {
      fYaw += curvature * TRACK_STEP;
      fx += Math.sin(fYaw) * TRACK_STEP;
      fz += Math.cos(fYaw) * TRACK_STEP;
      pts[i] = {
        s: (i - mid) * TRACK_STEP,
        x: fx,
        y: groundHeightAt(fx, fz, stage),
        z: fz,
        yaw: fYaw,
        pitch: 0,
      };
    }

    let bx = anchorX;
    let bz = anchorZ;
    let bYaw = angle;
    for (let i = mid - 1; i >= 0; i--) {
      bYaw -= curvature * TRACK_STEP;
      bx -= Math.sin(bYaw) * TRACK_STEP;
      bz -= Math.cos(bYaw) * TRACK_STEP;
      pts[i] = {
        s: (i - mid) * TRACK_STEP,
        x: bx,
        y: groundHeightAt(bx, bz, stage),
        z: bz,
        yaw: bYaw,
        pitch: 0,
      };
    }

    for (let i = 0; i < TRACK_POINTS_COUNT; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(TRACK_POINTS_COUNT - 1, i + 1)];
      const ds = Math.max(0.01, next.s - prev.s);
      const dy = next.y - prev.y;
      pts[i].pitch = -Math.atan2(dy, ds);
    }

    return pts;
  }

  private sampleTrackPose(
    points: TrackPathPoint[],
    s: number
  ): { x: number; y: number; z: number; yaw: number; pitch: number } {
    const clamped = THREE.MathUtils.clamp(s, -TRACK_HALF_SPAN, TRACK_HALF_SPAN);
    const fIdx = (clamped + TRACK_HALF_SPAN) / TRACK_STEP;
    const i0 = Math.min(TRACK_POINTS_COUNT - 2, Math.max(0, Math.floor(fIdx)));
    const t = fIdx - i0;
    const a = points[i0];
    const b = points[i0 + 1];
    return {
      x: THREE.MathUtils.lerp(a.x, b.x, t),
      y: THREE.MathUtils.lerp(a.y, b.y, t),
      z: THREE.MathUtils.lerp(a.z, b.z, t),
      yaw: THREE.MathUtils.lerp(a.yaw, b.yaw, t),
      pitch: THREE.MathUtils.lerp(a.pitch, b.pitch, t),
    };
  }

  private updateTrainSpawner(dt: number): void {
    if (this.isStoppingClimax) return;
    const stage = this.stage;
    const { spawnInterval, telegraphDelay, trainSpeed, destroyed, total } = this.getDifficultyMetrics();

    this.trainSpawnTimer -= dt;
    if (this.trainSpawnTimer <= 0) {
      const lead = this.getLivingMonkeys()[0];
      if (!lead) return;

      const speed = Math.hypot(lead.vel.x, lead.vel.z);
      const moveAngle = speed > 1.2 ? Math.atan2(lead.vel.x, lead.vel.z) : lead.facingYaw;
      const lookAhead = speed > 1.2 ? 9 + Math.random() * 11 : 4 + Math.random() * 6;

      const ax = THREE.MathUtils.clamp(
        lead.pos.x + Math.sin(moveAngle) * lookAhead + (Math.random() - 0.5) * 6,
        -this.playRadius + 8,
        this.playRadius - 8
      );
      const az = THREE.MathUtils.clamp(
        lead.pos.z + Math.cos(moveAngle) * lookAhead + (Math.random() - 0.5) * 6,
        -this.playRadius + 8,
        this.playRadius - 8
      );

      const cutAngle =
        moveAngle +
        (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2) +
        (Math.random() - 0.5) * 1.1;

      const behaviors = stage.trainBehaviors;
      const behavior = behaviors[Math.floor(Math.random() * behaviors.length)] || 'straight';
      const curvature =
        behavior === 'curving'
          ? (Math.random() > 0.5 ? 1 : -1) * (stage.curveStrength || 0.015) * (0.85 + Math.random() * 0.35)
          : 0;

      const coalRatio = destroyed / Math.max(1, total);

      const makeRedShift = () =>
        stage.isBoss && Math.random() < 0.44
          ? {
              isRedShift: true,
              shiftPivotS: -8 + Math.random() * 16,
              shiftDeltaYaw: (Math.random() > 0.5 ? 1 : -1) * (0.58 + Math.random() * 0.58),
            }
          : undefined;

      this.spawnTrackLine(
        ax,
        az,
        cutAngle,
        curvature,
        behavior,
        telegraphDelay,
        trainSpeed,
        false,
        makeRedShift(),
        rollSpecialTrainKind(stage, coalRatio)
      );

      const crossThreshold = stage.isBoss ? 2 : 4;
      const crossChance = stage.isBoss ? 0.5 : 0.35;
      if (destroyed >= crossThreshold && Math.random() < crossChance) {
        this.spawnTrackLine(
          ax,
          az,
          cutAngle + Math.PI * 0.48,
          -curvature,
          behaviors.includes('curving') ? 'curving' : 'straight',
          telegraphDelay + 0.38,
          trainSpeed,
          false,
          makeRedShift(),
          rollSpecialTrainKind(stage, coalRatio)
        );
      }

      this.trainSpawnTimer = spawnInterval;
    }
  }

  private acquireTrackVis(): PooledTrackVisual | null {
    return this.trackPool.find((t) => !t.inUse) || null;
  }

  private acquireTrainVis(): PooledTrainVisual | null {
    return this.trainPool.find((t) => !t.inUse) || null;
  }

  private applyTrainTint(
    tv: PooledTrainVisual,
    isRedShift: boolean,
    specialKind: SpecialTrainKind = 'normal'
  ): void {
    if (isRedShift) {
      tv.rig.headlight.color.setHex(0xff3b3b);
      tv.rig.lampMat.color.setHex(0xff4444);
      tv.rig.furnaceMat.color.setHex(0xff2e2e);
      for (const b of tv.rig.beamMeshes) {
        (b.material as THREE.MeshBasicMaterial).color.setHex(0xff3b3b);
      }
    } else if (specialKind === 'quake') {
      tv.rig.headlight.color.setHex(0xf59e0b);
      tv.rig.lampMat.color.setHex(0xfbbf24);
      tv.rig.furnaceMat.color.setHex(0xb45309);
      for (const b of tv.rig.beamMeshes) {
        (b.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b);
      }
    } else if (specialKind === 'flash') {
      tv.rig.headlight.color.setHex(0xffffff);
      tv.rig.lampMat.color.setHex(0xffffff);
      tv.rig.furnaceMat.color.setHex(0xe0f2fe);
      for (const b of tv.rig.beamMeshes) {
        (b.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      }
    } else {
      this.resetTrainTint(tv);
    }
  }

  private resetTrainTint(tv: PooledTrainVisual): void {
    tv.rig.headlight.color.setHex(0xfafaff);
    tv.rig.lampMat.color.setHex(tv.rig.defaultLampColor);
    tv.rig.furnaceMat.color.setHex(tv.rig.defaultFurnaceColor);
    for (const b of tv.rig.beamMeshes) {
      (b.material as THREE.MeshBasicMaterial).color.setHex(tv.rig.defaultLampColor);
    }
  }

  private spawnTrackFromNet(nt: NetTrackSpawn): void {
    this.spawnTrackLine(
      nt.anchorX,
      nt.anchorZ,
      nt.angle,
      nt.curvature,
      nt.behavior,
      nt.telegraphDelay,
      nt.trainSpeed,
      nt.isDying,
      nt.isRedShift
        ? {
            isRedShift: true,
            shiftDeltaYaw: nt.shiftDeltaYaw ?? 0.85,
            shiftPivotS: nt.shiftPivotS ?? 0,
          }
        : undefined,
      nt.specialKind ?? 'normal'
    );
  }

  private positionTrainAlongPath(tr: TrackEntity): void {
    if (!tr.trainVis) return;
    for (const car of tr.trainVis.rig.cars) {
      const pose = this.sampleTrackPose(tr.points, tr.trainDist + car.sOffset);
      car.group.position.set(pose.x, pose.y, pose.z);
      car.group.rotation.order = 'YXZ';
      car.group.rotation.set(pose.pitch, pose.yaw, 0);
    }
  }

  private syncTrackVisualGeometry(tr: TrackEntity): void {
    const widthScale = this.stage.isBoss ? 1.15 : 1.0;
    updateRibbonFromPoints(tr.trackVis.corridorGeo, tr.points, 0, 2.3 * widthScale, 0.09);
    updateRibbonFromPoints(tr.trackVis.leftRailGeo, tr.points, -1.38 * widthScale, 0.16, 0.2);
    updateRibbonFromPoints(tr.trackVis.rightRailGeo, tr.points, 1.38 * widthScale, 0.16, 0.2);

    for (let i = 0; i < TRACK_POINTS_COUNT; i++) {
      const pt = tr.points[i];
      _dummyObj.position.set(pt.x, pt.y + 0.08, pt.z);
      _dummyObj.rotation.order = 'YXZ';
      _dummyObj.rotation.set(pt.pitch, pt.yaw + Math.sin(i * 1.7) * 0.05, 0);
      _dummyObj.scale.set(widthScale, 1, 1);
      _dummyObj.updateMatrix();
      tr.trackVis.sleepers.setMatrixAt(i, _dummyObj.matrix);
    }
    tr.trackVis.sleepers.instanceMatrix.needsUpdate = true;
    tr.trackVis.sleepers.computeBoundingSphere();
  }

  private triggerRedTrackDirectionShift(tr: TrackEntity): void {
    tr.hasShifted = true;
    const pts = tr.points;
    let pivotIdx = pts.findIndex((p) => p.s >= tr.shiftPivotS);
    if (pivotIdx < 6) pivotIdx = 6;
    if (pivotIdx > TRACK_POINTS_COUNT - 8) pivotIdx = TRACK_POINTS_COUNT - 8;

    const stage = this.stage;
    const baseYaw = pts[pivotIdx - 1].yaw;
    let fx = pts[pivotIdx - 1].x;
    let fz = pts[pivotIdx - 1].z;

    for (let k = pivotIdx; k < TRACK_POINTS_COUNT; k++) {
      const stepInCurve = k - pivotIdx + 1;
      const blend = Math.min(1, stepInCurve / 3);
      const yaw = baseYaw + tr.shiftDeltaYaw * blend;
      fx += Math.sin(yaw) * TRACK_STEP;
      fz += Math.cos(yaw) * TRACK_STEP;
      pts[k] = {
        s: pts[k].s,
        x: fx,
        y: groundHeightAt(fx, fz, stage),
        z: fz,
        yaw,
        pitch: 0,
      };
    }

    for (let k = Math.max(0, pivotIdx - 1); k < TRACK_POINTS_COUNT; k++) {
      const prev = pts[Math.max(0, k - 1)];
      const next = pts[Math.min(TRACK_POINTS_COUNT - 1, k + 1)];
      const ds = Math.max(0.01, next.s - prev.s);
      pts[k].pitch = -Math.atan2(next.y - prev.y, ds);
    }

    this.syncTrackVisualGeometry(tr);
    tr.trackVis.railMat.emissiveIntensity = 1.45;
    const pivotPt = pts[pivotIdx];
    const pan = THREE.MathUtils.clamp((pivotPt.x - this.camTarget.x) / 30, -1, 1);
    this.sound.playTrackAppear(pan);
    this.addTrauma(0.28);
    this.spawnBurst3D(pivotPt.x, pivotPt.y + 0.5, pivotPt.z, 14, 'spark', 0xef4444);
  }

  private spawnTrackLine(
    anchorX: number,
    anchorZ: number,
    angle: number,
    curvature: number,
    behavior: TrainBehavior,
    delay: number,
    speed: number,
    isDying: boolean,
    redShiftOpts?: { isRedShift?: boolean; shiftDeltaYaw?: number; shiftPivotS?: number },
    specialKindOpt: SpecialTrainKind = 'normal'
  ): void {
    const trackVis = this.acquireTrackVis();
    if (!trackVis) return;

    const stage = this.stage;
    const points = this.buildTrackPoints(anchorX, anchorZ, angle, curvature);
    const widthScale = stage.isBoss ? 1.15 : 1.0;

    updateRibbonFromPoints(trackVis.corridorGeo, points, 0, 2.3 * widthScale, 0.09);
    updateRibbonFromPoints(trackVis.leftRailGeo, points, -1.38 * widthScale, 0.16, 0.2);
    updateRibbonFromPoints(trackVis.rightRailGeo, points, 1.38 * widthScale, 0.16, 0.2);

    for (let i = 0; i < TRACK_POINTS_COUNT; i++) {
      const pt = points[i];
      _dummyObj.position.set(pt.x, pt.y + 0.08, pt.z);
      _dummyObj.rotation.order = 'YXZ';
      _dummyObj.rotation.set(pt.pitch, pt.yaw + Math.sin(i * 1.7) * 0.05, 0);
      _dummyObj.scale.set(widthScale, 1, 1);
      _dummyObj.updateMatrix();
      trackVis.sleepers.setMatrixAt(i, _dummyObj.matrix);
    }
    trackVis.sleepers.instanceMatrix.needsUpdate = true;
    trackVis.sleepers.computeBoundingSphere();

    const isRedShift = Boolean(!isDying && redShiftOpts?.isRedShift);
    const specialKind: SpecialTrainKind = isDying ? 'normal' : specialKindOpt;
    trackVis.inUse = true;
    trackVis.group.visible = true;
    trackVis.group.position.set(0, 0, 0);
    trackVis.group.rotation.set(0, 0, 0);
    trackVis.corridorMat.color.setHex(
      isRedShift
        ? 0xef4444
        : specialKind === 'quake'
        ? 0xd97706
        : specialKind === 'flash'
        ? 0xffffff
        : 0xf4f4fa
    );
    trackVis.railMat.color.setHex(
      isRedShift
        ? 0xf87171
        : specialKind === 'quake'
        ? 0xfbbf24
        : specialKind === 'flash'
        ? 0xf8fafc
        : 0xc8c8d2
    );
    trackVis.railMat.emissive.setHex(
      isRedShift
        ? 0xdc2626
        : specialKind === 'quake'
        ? 0xb45309
        : specialKind === 'flash'
        ? 0xffffff
        : 0xffffff
    );
    trackVis.corridorMat.opacity = isRedShift ? 0.28 : specialKind !== 'normal' ? 0.25 : 0.2;
    trackVis.railMat.emissiveIntensity = isRedShift ? 0.65 : specialKind !== 'normal' ? 0.55 : 0.35;

    const pan = THREE.MathUtils.clamp((anchorX - this.camTarget.x) / 30, -1, 1);
    if (!isDying) {
      if (specialKind === 'quake') {
        this.sound.playQuakeTrainAppear(pan);
        this.addTrauma(0.28);
        this.rumbleXbox(0.4, 0.5, 160);
      } else if (specialKind === 'flash') {
        this.sound.playFlashTrainAppear(pan);
        this.addTrauma(0.16);
        this.rumbleXbox(0.15, 0.35, 100);
      } else {
        this.sound.playTrackAppear(pan);
        this.addTrauma(0.16);
        this.rumbleXbox(0.18, 0.24, 110);
      }
    }

    let trainVis: PooledTrainVisual | null = null;
    if (isDying) {
      trainVis = this.acquireTrainVis();
      if (trainVis) {
        trainVis.inUse = true;
        trainVis.rig.group.visible = true;
        this.resetTrainTint(trainVis);
        trainVis.rig.headlight.intensity = trainVis.baseIntensity;
        for (const b of trainVis.rig.beamMeshes) {
          (b.material as THREE.MeshBasicMaterial).opacity = stage.isBoss ? 0.17 : 0.13;
        }
      }
    }

    const trainLength = stage.isBoss ? 39 : 31;

    const entity: TrackEntity = {
      id: this.nextTrackId++,
      points,
      behavior,
      phase: isDying ? 'STOPPING' : 'TELEGRAPH',
      telegraphDuration: delay,
      telegraphRemaining: delay,
      materialize: 1,
      trainDist: isDying ? -18 : -64,
      trainEndDist: 92,
      trainSpeed: speed,
      trainLength,
      fadeTimer: 1.0,
      hornTriggered: isDying,
      chugTimer: 0,
      isDying,
      stoppedDone: false,
      isRedShift,
      hasShifted: false,
      shiftDeltaYaw: redShiftOpts?.shiftDeltaYaw ?? 0.85,
      shiftPivotS: redShiftOpts?.shiftPivotS ?? 0,
      specialKind,
      flashTriggered: false,
      trackVis,
      trainVis,
    };

    if (trainVis) this.positionTrainAlongPath(entity);
    this.activeTracks.push(entity);
  }

  private releaseTrainVis(tr: TrackEntity): void {
    if (!tr.trainVis) return;
    this.resetTrainTint(tr.trainVis);
    tr.trainVis.inUse = false;
    tr.trainVis.rig.group.visible = false;
    tr.trainVis.rig.headlight.intensity = 0;
    tr.trainVis = null;
  }

  private updateTracks(dt: number): void {
    const lead = this.getControlledMonkey() || this.getLivingMonkeys()[0];
    const stage = this.stage;

    for (let i = this.activeTracks.length - 1; i >= 0; i--) {
      const tr = this.activeTracks[i];
      const midPt = tr.points[24];

      if (tr.phase === 'TELEGRAPH') {
        tr.telegraphRemaining -= dt;
        const progress = 1 - Math.max(0, tr.telegraphRemaining / tr.telegraphDuration);
        const pulseRate = tr.specialKind === 'flash' ? 22 + progress * 28 : 12 + progress * 20;
        const pulse = 0.5 + 0.5 * Math.sin(this.elapsedTotal * pulseRate);
        tr.trackVis.corridorMat.opacity =
          ((tr.isRedShift ? 0.16 : 0.1) + 0.3 * progress) * (0.65 + 0.35 * pulse);
        tr.trackVis.railMat.emissiveIntensity =
          (tr.isRedShift ? 0.55 : tr.specialKind === 'flash' ? 0.75 : 0.25) +
          progress * (tr.specialKind === 'flash' ? 1.45 : 0.95);

        if (!tr.hornTriggered && tr.telegraphRemaining <= 0.42) {
          tr.hornTriggered = true;
          const pan = THREE.MathUtils.clamp((midPt.x - this.camTarget.x) / 30, -1, 1);
          const hornIntensity = stage.isBoss ? 1.2 : 1;
          if (tr.specialKind === 'quake') {
            this.sound.playQuakeTrainHorn(pan, hornIntensity);
            this.addTrauma(0.36);
          } else if (tr.specialKind === 'flash') {
            this.sound.playFlashTrainHorn(pan, hornIntensity);
            this.addTrauma(0.24);
          } else {
            this.sound.playTrainHorn(pan, hornIntensity);
            this.addTrauma(0.24);
          }
        }

        if (tr.telegraphRemaining <= 0) {
          tr.phase = 'PASSING';
          tr.trackVis.corridorMat.opacity = tr.isRedShift ? 0.14 : 0.05;
          tr.trackVis.railMat.emissiveIntensity = tr.isRedShift ? 0.75 : 0.15;

          const tv = this.acquireTrainVis();
          if (tv) {
            tv.inUse = true;
            tv.rig.group.visible = true;
            this.applyTrainTint(tv, tr.isRedShift, tr.specialKind);
            tv.rig.headlight.intensity =
              tr.specialKind === 'flash' ? tv.baseIntensity * 2.2 : tv.baseIntensity;
            for (const b of tv.rig.beamMeshes) {
              (b.material as THREE.MeshBasicMaterial).opacity =
                tr.specialKind === 'flash' ? 0.28 : stage.isBoss ? 0.17 : 0.13;
            }
            tr.trainVis = tv;
            this.positionTrainAlongPath(tr);
          }
        }
      } else if (tr.phase === 'PASSING' && tr.trainVis) {
        const dashMult =
          tr.behavior === 'phantom_dash' && tr.trainDist > -20 && tr.trainDist < 32 ? 1.48 : 1.0;
        const stepSpeed = tr.trainSpeed * dashMult;
        tr.trainDist += stepSpeed * dt;

        if (tr.isRedShift && !tr.hasShifted && tr.trainDist >= tr.shiftPivotS - 14) {
          this.triggerRedTrackDirectionShift(tr);
        }

        if (tr.specialKind === 'flash' && !tr.flashTriggered && tr.trainDist >= -34) {
          tr.flashTriggered = true;
          this.flashTimer = 1.65;
          this.sound.playFlashBurst();
          this.addTrauma(0.3);
          this.emitHud();
        }

        this.positionTrainAlongPath(tr);

        for (const w of tr.trainVis.rig.wheels) {
          w.rotation.x += stepSpeed * dt * 0.9;
        }

        const nosePose = this.sampleTrackPose(tr.points, tr.trainDist - tr.trainLength * 0.35);
        const refX = lead ? lead.pos.x : 0;
        const refZ = lead ? lead.pos.z : 0;
        const distToPlayer = Math.hypot(nosePose.x - refX, nosePose.z - refZ);
        const prox = Math.max(0, 1 - distToPlayer / 45);

        if (tr.specialKind === 'quake') {
          this.shakeTrauma = Math.max(this.shakeTrauma, 0.56 + prox * 0.44);
          this.rumbleXbox(0.65, 0.85, 90);
          if (Math.random() < 0.65) {
            this.spawnBurst3D(nosePose.x, nosePose.y + 0.35, nosePose.z, 1, 'coal', 0x71717a);
          }
        } else if (prox > 0.05) {
          this.shakeTrauma = Math.max(this.shakeTrauma, 0.32 + prox * 0.56);
          this.rumbleXbox(prox * 0.55, prox * 0.4, 70);
        }

        tr.chugTimer -= dt;
        if (tr.chugTimer <= 0) {
          tr.chugTimer = tr.specialKind === 'quake' ? 0.115 : 0.085;
          const pan = THREE.MathUtils.clamp((nosePose.x - this.camTarget.x) / 30, -1, 1);
          if (tr.specialKind === 'quake') {
            this.sound.playQuakeTrainChug(0.4 + prox * 0.6, pan);
          } else {
            this.sound.playTrainChug(0.22 + prox * 0.78, pan);
          }
        }

        if (Math.random() < 0.55) {
          const stackPose = this.sampleTrackPose(tr.points, tr.trainDist - 1.2);
          this.spawnBurst3D(
            stackPose.x,
            stackPose.y + 5.5,
            stackPose.z,
            1,
            'smoke',
            tr.isRedShift
              ? 0x451212
              : tr.specialKind === 'flash'
              ? 0xf4f4fa
              : Math.random() > 0.3
              ? 0x1e1e24
              : 0x7a7a85
          );
        }

        this.checkTrainCollision(tr);

        if (tr.trainDist - tr.trainLength > tr.trainEndDist) {
          tr.phase = 'FADING';
          this.releaseTrainVis(tr);
        }
      } else if (tr.phase === 'STOPPING' && tr.trainVis) {
        if (tr.trainSpeed > 0) {
          tr.trainSpeed = Math.max(0, tr.trainSpeed - 18 * dt);
          tr.trainDist += tr.trainSpeed * dt;
          this.positionTrainAlongPath(tr);
          for (const w of tr.trainVis.rig.wheels) {
            w.rotation.x += tr.trainSpeed * dt * 0.9;
          }
          this.shakeTrauma = Math.max(this.shakeTrauma, 0.35 * (tr.trainSpeed / 40));

          const on = Math.random() > 0.45;
          tr.trainVis.rig.headlight.intensity = on ? 105 : 10;
          for (const beam of tr.trainVis.rig.beamMeshes) {
            (beam.material as THREE.MeshBasicMaterial).opacity = on ? 0.1 : 0.01;
          }

          if (Math.random() < 0.6) {
            const sp = this.sampleTrackPose(tr.points, tr.trainDist - Math.random() * 14);
            this.spawnBurst3D(sp.x, sp.y + 0.4, sp.z, 2, 'spark', 0xf8f8fc);
          }
        } else if (!tr.stoppedDone) {
          tr.stoppedDone = true;
          tr.trainVis.rig.headlight.intensity = 0;
          for (const beam of tr.trainVis.rig.beamMeshes) {
            (beam.material as THREE.MeshBasicMaterial).opacity = 0;
          }
          this.addTrauma(0.32);
        }
      } else if (tr.phase === 'FADING') {
        tr.fadeTimer -= dt;
        tr.trackVis.corridorMat.opacity = 0;
        if (tr.fadeTimer <= 0) {
          this.releaseTrainVis(tr);
          tr.trackVis.inUse = false;
          tr.trackVis.group.visible = false;
          this.activeTracks.splice(i, 1);
        }
      }
    }
  }

  private checkTrainCollision(tr: TrackEntity): void {
    if (this.packInvulnTimer > 0 || this.isStoppingClimax || this.timeStopTimer > 0) return;

    const halfWidth = this.stage.isBoss ? 2.55 : 2.2;
    const tail = tr.trainDist - tr.trainLength + 0.5;
    const nose = tr.trainDist + 1.8;

    const candidates = this.isOnline
      ? this.getControlledMonkey()
        ? [this.getControlledMonkey()!]
        : []
      : this.getLivingMonkeys();

    for (const m of candidates) {
      for (let i = 0; i < tr.points.length; i++) {
        const pt = tr.points[i];
        if (pt.s < tail || pt.s > nose) continue;
        if (m.pos.y >= pt.y + 3.6) continue;

        const d = Math.hypot(m.pos.x - pt.x, m.pos.z - pt.z);
        if (d <= halfWidth) {
          if (m.shieldTimer > 0) {
            m.shieldTimer = 0;
            m.rig.shieldMesh.visible = false;
            this.packInvulnTimer = 1.25;
            this.sound.playSupportVault();
            this.addTrauma(0.4);
            this.spawnRing(m.pos.x, m.pos.z, m.pos.y + 0.5);
            this.spawnBurst3D(m.pos.x, m.pos.y + 1.2, m.pos.z, 12, 'spark', 0xf8f8fc);
            const normX = Math.cos(pt.yaw);
            const normZ = -Math.sin(pt.yaw);
            const side = (m.pos.x - pt.x) * normX + (m.pos.z - pt.z) * normZ >= 0 ? 1 : -1;
            m.vel.x = normX * side * 20;
            m.vel.z = normZ * side * 20;
            m.vel.y = 10;
            return;
          }

          const normX = Math.cos(pt.yaw);
          const normZ = -Math.sin(pt.yaw);
          this.loseMonkey(m, normX, normZ, pt.x, pt.z);
          return;
        }
      }
    }
  }

  private loseMonkey(
    hit: MonkeyEntity,
    normX: number,
    normZ: number,
    ax: number,
    az: number
  ): void {
    hit.alive = false;
    hit.rig.group.visible = false;
    this.packInvulnTimer = 1.45;
    this.hitstopTimer = 0.065;
    this.addTrauma(0.85);
    this.sound.playMonkeyHit();
    this.rumbleXbox(1.0, 0.9, 420);

    this.spawnBurst3D(hit.pos.x, hit.pos.y + 1.2, hit.pos.z, 14, 'coal', 0x16161a);
    this.spawnBurst3D(hit.pos.x, hit.pos.y + 1.2, hit.pos.z, 8, 'spark', 0xf8f8fc);

    if (this.isOnline && this.onlineClient) {
      this.onlineClient.send({ type: 'PLAYER_HIT' });
      this.emitHud();
      return;
    }

    const remaining = this.getLivingMonkeys();
    if (remaining.length === 0) {
      this.runResultNonce += 1;
      this.gameState = 'GAME_OVER';
      this.syncMusicTrack();
      this.emitHud();
      return;
    }

    for (const m of remaining) {
      const side = (m.pos.x - ax) * normX + (m.pos.z - az) * normZ >= 0 ? 1 : -1;
      m.vel.x = normX * side * 18;
      m.vel.z = normZ * side * 18;
      m.vel.y = 9.5;
      m.pos.y += 0.3;
    }
    this.emitHud();
  }

  private spawnBurst3D(
    x: number,
    y: number,
    z: number,
    count: number,
    kind: ParticleSlot['kind'],
    hex: number
  ): void {
    const scaledCount = Math.max(1, Math.round(count * this.particleQualityScale));
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < scaledCount; i++) {
      const slot = this.particleSlots[i];
      if (slot.active) continue;
      slot.active = true;
      slot.kind = kind;
      slot.colorHex = hex;
      slot.pos.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      const spd = kind === 'smoke' ? 1.5 + Math.random() * 3 : 4 + Math.random() * 9;
      slot.vel.set(
        Math.cos(a) * spd,
        kind === 'smoke' ? 3.5 + Math.random() * 4 : 3 + Math.random() * 7,
        Math.sin(a) * spd
      );
      slot.rot.set(Math.random() * 3, Math.random() * 3, 0);
      slot.scale = kind === 'smoke' ? 1.4 + Math.random() * 1.6 : 0.35 + Math.random() * 0.55;
      slot.maxLife = kind === 'smoke' ? 0.72 + Math.random() * 0.4 : 0.35 + Math.random() * 0.3;
      slot.life = slot.maxLife;
      this.particleInstanced.setColorAt(i, _tempColor.setHex(hex));
      spawned++;
    }
    if (spawned > 0 && this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }
  }

  private spawnRing(x: number, z: number, y: number): void {
    const slot = this.ringPool.find((r) => !r.active);
    if (!slot) return;
    slot.active = true;
    slot.life = slot.maxLife;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, y, z);
    slot.mesh.scale.setScalar(1);
  }

  private updateParticles(dt: number): void {
    let anyParticleUpdated = false;
    const stage = this.stage;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particleSlots[i];
      if (!p.active) continue;
      anyParticleUpdated = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummyObj.position.set(0, -999, 0);
        _dummyObj.scale.setScalar(0.0001);
        _dummyObj.updateMatrix();
        this.particleInstanced.setMatrixAt(i, _dummyObj.matrix);
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      if (p.kind === 'coal' || p.kind === 'spark') {
        p.vel.y -= 22 * dt;
        const floor = groundHeightAt(p.pos.x, p.pos.z, stage);
        if (p.pos.y < floor + 0.1) p.pos.y = floor + 0.1;
      }
      p.rot.x += dt * 4;
      p.rot.y += dt * 5;

      const t = p.life / p.maxLife;
      _dummyObj.position.copy(p.pos);
      _dummyObj.rotation.set(p.rot.x, p.rot.y, 0);
      _dummyObj.scale.setScalar(p.scale * (p.kind === 'smoke' ? 1.3 - t * 0.4 : t));
      _dummyObj.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummyObj.matrix);
    }

    if (anyParticleUpdated) {
      this.particleInstanced.instanceMatrix.needsUpdate = true;
    }

    for (const r of this.ringPool) {
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const t = r.life / r.maxLife;
      const s = 1 + (1 - t) * 4.2;
      r.mesh.scale.set(s, s, s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.85;
    }
  }

  private addTrauma(amount: number): void {
    this.shakeTrauma = Math.min(1, this.shakeTrauma + amount);
  }

  private updateCamera(dt: number): void {
    const targetMonkey = this.getControlledMonkey() || this.getLivingMonkeys()[0];
    if (targetMonkey) {
      _vec3A.set(
        targetMonkey.pos.x + targetMonkey.vel.x * 0.18,
        targetMonkey.pos.y * 0.75 + 1.5,
        targetMonkey.pos.z + targetMonkey.vel.z * 0.18
      );
      this.camTarget.lerp(_vec3A, 1 - Math.exp(-8 * dt));
    }

    const camDist = this.wideView ? 24 : 16.5;
    const camHeight = this.wideView ? 19 : 11.8;

    let shakeMag = this.shakeTrauma * this.shakeTrauma * (this.quakeAirborneActive ? 2.15 : 1.15);
    if (this.quakeAirborneActive) {
      shakeMag = Math.max(shakeMag, 1.05);
    }
    const sx = (Math.random() * 2 - 1) * shakeMag;
    const sy = (Math.random() * 2 - 1) * shakeMag * (this.quakeAirborneActive ? 1.25 : 1);

    _vec3B.set(
      this.camTarget.x + Math.sin(this.camYaw) * camDist + sx,
      this.camTarget.y + camHeight + sy,
      this.camTarget.z + Math.cos(this.camYaw) * camDist
    );

    this.camera.position.lerp(_vec3B, 1 - Math.exp(-12 * dt));
    this.camera.lookAt(this.camTarget.x, this.camTarget.y + 0.4, this.camTarget.z);

    this.keyLight.position.set(this.camTarget.x + 22, 38, this.camTarget.z + 18);
    this.keyLight.target.position.copy(this.camTarget);
  }

  private emitHud(): void {
    const stage = this.stage;
    const { total, destroyed, spawnInterval, telegraphDelay } = this.getDifficultyMetrics();
    const living = this.getLivingMonkeys();
    const controlled = this.getControlledMonkey();
    const dangerWarning = this.activeTracks.some(
      (t) => t.phase === 'TELEGRAPH' && t.telegraphRemaining <= 0.6
    );
    const quakeActive =
      this.timeStopTimer <= 0 &&
      this.activeTracks.some(
        (tr) =>
          tr.specialKind === 'quake' &&
          tr.phase === 'PASSING' &&
          tr.trainDist >= -48 &&
          tr.trainDist - tr.trainLength <= 56
      );
    const flashOpacity =
      this.flashTimer <= 0
        ? 0
        : this.flashTimer >= 1.15
        ? 0.95
        : 0.95 * (this.flashTimer / 1.15);

    const avgSpeed = this.runElapsed > 0.5 ? this.totalDistance / this.runElapsed : this.currentSpeed;
    const liveRank: SpeedRank = computeSpeedRank(this.currentSpeed);
    const finalRank: SpeedRank = computeFinalRunRank(
      avgSpeed,
      this.peakSpeed,
      this.vaultsUsed,
      living.length
    );

    const def = getAbilityDef(this.equippedAbility);

    this.onHudChange({
      gameState: this.gameState,
      isOnline: this.isOnline,
      spectating: this.isOnline && !controlled && living.length > 0,
      stageIndex: this.currentStageIndex,
      stageTotal: STAGES.length,
      stageName: stage.name,
      stageIsBoss: stage.isBoss,
      trainLabel: stage.trainLabel,
      monkeysAlive: living.length,
      monkeyStatuses: this.monkeys.map((m) => m.alive),
      monkeyNames: this.monkeys.map((m) => m.name || '—'),
      coalDestroyed: destroyed,
      coalTotal: total,
      currentDelay: Number(telegraphDelay.toFixed(2)),
      currentInterval: Number(spawnInterval.toFixed(2)),
      elapsedSeconds: Number(this.runElapsed.toFixed(1)),
      vaultsUsed: this.vaultsUsed,
      currentSpeed: Math.round(this.currentSpeed * 3.6),
      avgSpeed: Math.round(avgSpeed * 3.6),
      peakSpeed: Math.round(this.peakSpeed * 3.6),
      liveRank,
      finalRank,
      boostActive: Boolean(controlled && controlled.boostTimer > 0),
      isSliding: Boolean(controlled && controlled.slideTimer > 0),
      coalBlinkRemaining: Number(this.coalBlinkTimer.toFixed(1)),
      nearSupport: this.nearSupportId !== null,
      nearCoal: this.nearCoalId !== null,
      nearArmoredCoal: this.nearArmoredCoal,
      isStoppingClimax: this.isStoppingClimax,
      muted: this.sound.muted,
      dangerWarning,
      gamepadConnected: this.gamepadConnected,
      coinsRun: this.coinsRun,
      equippedAbility: this.equippedAbility,
      abilityCooldown: Number(this.abilityCooldownTimer.toFixed(1)),
      abilityMaxCooldown: def.cooldown,
      abilityActiveTimer: Number(this.abilityActiveTimer.toFixed(1)),
      timeStopRemaining: Number(this.timeStopTimer.toFixed(1)),
      shieldActive: Boolean(controlled && controlled.shieldTimer > 0),
      smokeLevel: this.getSmokeLevel(),
      slowed: this.quakeSlowTimer > 0 && !this.quakeAirborneActive,
      quakeActive,
      flashOpacity: Number(flashOpacity.toFixed(3)),
      runResultNonce: this.runResultNonce,
    });
  }
}
