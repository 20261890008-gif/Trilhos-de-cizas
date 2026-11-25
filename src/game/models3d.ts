import * as THREE from 'three';
import { buildCosmeticMesh } from './cosmeticMeshes3d';
import { COSMETICS } from './cosmeticsCatalog';
import {
  BackCosmeticId,
  EquippedCosmetics,
  HeadCosmeticId,
  TrainVariant,
} from './types';

export interface MonkeyRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearm: THREE.Mesh;
  rightForearm: THREE.Mesh;
  shieldMesh: THREE.Mesh;
  headSlots: Record<string, THREE.Object3D | null>;
  backSlots: Record<string, THREE.Object3D | null>;
}

export interface TrainCarRig {
  group: THREE.Group;
  sOffset: number;
}

export interface TrainRig {
  group: THREE.Group;
  cars: TrainCarRig[];
  wheels: THREE.Mesh[];
  headlight: THREE.SpotLight;
  beamMeshes: THREE.Mesh[];
  lampMat: THREE.MeshBasicMaterial;
  furnaceMat: THREE.MeshBasicMaterial;
  defaultLampColor: number;
  defaultFurnaceColor: number;
}

export interface CoalRig {
  group: THREE.Group;
  crystalMeshes: THREE.Mesh[];
  glowDisc: THREE.Mesh;
  cracksMesh: THREE.Mesh;
  craterGroup: THREE.Group;
  activeGroup: THREE.Group;
  armored: boolean;
}

export interface SupportRig {
  group: THREE.Group;
  springGroup: THREE.Group;
  ringMesh: THREE.Mesh;
}

function makeMat(
  color: number,
  roughness: number,
  metalness = 0.08,
  emissive = 0x000000,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    flatShading: true,
  });
}

let cachedGlowTexture: THREE.CanvasTexture | null = null;
function getGlowTexture(): THREE.CanvasTexture {
  if (cachedGlowTexture) return cachedGlowTexture;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(248, 248, 255, 0.55)');
    grad.addColorStop(0.5, 'rgba(210, 210, 225, 0.16)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  cachedGlowTexture = new THREE.CanvasTexture(c);
  cachedGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return cachedGlowTexture;
}

export function createMonkeyModel(
  variant: 'leader' | 'agile' | 'breaker',
  cosmetics?: EquippedCosmetics
): MonkeyRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const furShade = variant === 'leader' ? 0x222227 : variant === 'agile' ? 0x34343c : 0x17171c;
  const skinShade = variant === 'leader' ? 0x575761 : variant === 'agile' ? 0x6a6a74 : 0x474750;
  const furMat = makeMat(furShade, 0.88, 0.05);
  const skinMat = makeMat(skinShade, 0.62, 0.08);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f8 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 1.15, 7), furMat);
  torso.position.y = 0.85;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  const belly = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), skinMat);
  belly.position.set(0, 0.78, 0.28);
  belly.scale.set(0.95, 1.05, 0.65);
  bodyGroup.add(belly);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.56, 0.1);
  bodyGroup.add(headGroup);

  const cranium = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), furMat);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.36), skinMat);
  snout.position.set(0, -0.08, 0.34);
  headGroup.add(snout);

  const earGeo = new THREE.BoxGeometry(0.16, 0.24, 0.12);
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(-0.46, 0.04, 0);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(0.46, 0.04, 0);
  headGroup.add(leftEar, rightEar);

  const eyeGeo = new THREE.BoxGeometry(0.11, 0.09, 0.06);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, 0.1, 0.43);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.15, 0.1, 0.43);
  headGroup.add(leftEye, rightEye);

  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const getCosmeticMat = (
    color: number,
    emissive = 0x000000,
    emissiveIntensity = 0,
    metalness = 0.25,
    roughness = 0.48
  ): THREE.MeshStandardMaterial => {
    const key = `${color}_${emissive}_${emissiveIntensity.toFixed(2)}_${metalness.toFixed(2)}`;
    const existing = matCache.get(key);
    if (existing) return existing;
    const mat = makeMat(color, roughness, metalness, emissive, emissiveIntensity);
    matCache.set(key, mat);
    return mat;
  };

  const headSlots: Record<string, THREE.Object3D | null> = { none: null };
  const backSlots: Record<string, THREE.Object3D | null> = { none: null };

  for (const def of COSMETICS) {
    const meshGroup = buildCosmeticMesh(def, getCosmeticMat);
    meshGroup.visible = false;
    if (def.slot === 'head') {
      headGroup.add(meshGroup);
      headSlots[def.id] = meshGroup;
    } else {
      bodyGroup.add(meshGroup);
      backSlots[def.id] = meshGroup;
    }
  }

  // Arms
  const upperGeo = new THREE.BoxGeometry(0.28, 0.74, 0.28);
  const foreGeo = new THREE.BoxGeometry(0.32, 0.78, 0.32);
  const fistGeo = new THREE.DodecahedronGeometry(0.26, 0);

  const buildArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.72, 1.24, 0);

    const upperArm = new THREE.Mesh(upperGeo, furMat);
    upperArm.position.y = -0.34;
    upperArm.castShadow = true;
    pivot.add(upperArm);

    const forearm = new THREE.Mesh(foreGeo, furMat);
    forearm.position.set(0, -0.95, 0.12);
    forearm.rotation.x = -0.25;
    forearm.castShadow = true;
    pivot.add(forearm);

    const fist = new THREE.Mesh(fistGeo, skinMat);
    fist.position.set(0, -0.42, 0.04);
    fist.castShadow = true;
    forearm.add(fist);

    return { pivot, forearm };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  bodyGroup.add(leftArm.pivot, rightArm.pivot);

  // Iron shield bubble
  const shieldMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 1),
    new THREE.MeshBasicMaterial({
      color: 0xe8e8f2,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    })
  );
  shieldMesh.position.y = 1.05;
  shieldMesh.visible = false;
  group.add(shieldMesh);

  const rig: MonkeyRig = {
    group,
    bodyGroup,
    headGroup,
    leftArmPivot: leftArm.pivot,
    rightArmPivot: rightArm.pivot,
    leftForearm: leftArm.forearm,
    rightForearm: rightArm.forearm,
    shieldMesh,
    headSlots,
    backSlots,
  };

  applyMonkeyCosmetics(rig, cosmetics || { head: 'none', back: 'none' });
  return rig;
}

export function applyMonkeyCosmetics(rig: MonkeyRig, cosmetics: EquippedCosmetics): void {
  (Object.keys(rig.headSlots) as HeadCosmeticId[]).forEach((key) => {
    const obj = rig.headSlots[key];
    if (obj) obj.visible = key === cosmetics.head;
  });
  (Object.keys(rig.backSlots) as BackCosmeticId[]).forEach((key) => {
    const obj = rig.backSlots[key];
    if (obj) obj.visible = key === cosmetics.back;
  });
}

/**
 * Builds an articulated train rig where locomotive + each wagon are separate TrainCarRig groups
 * so the train smoothly follows terrain slopes AND curved rails!
 */
export function createTrainModel(variant: TrainVariant): TrainRig {
  const group = new THREE.Group();
  const cars: TrainCarRig[] = [];
  const wheels: THREE.Mesh[] = [];
  const beamMeshes: THREE.Mesh[] = [];

  const isBoss =
    variant === 'armored_boss' ||
    variant === 'carcara_boss' ||
    variant === 'leviathan_boss' ||
    variant === 'furnace_boss' ||
    variant === 'drill_boss' ||
    variant === 'hammer_boss' ||
    variant === 'anvil_boss' ||
    variant === 'bunker_boss' ||
    variant === 'reaper_boss' ||
    variant === 'cathedral_boss' ||
    variant === 'hydra_boss' ||
    variant === 'sovereign_boss' ||
    variant === 'eternal_boss' ||
    variant === 'glacier_boss' ||
    variant === 'pendulum_boss' ||
    variant === 'magma_boss' ||
    variant === 'spider_boss' ||
    variant === 'obelisk_boss' ||
    variant === 'turbine_boss' ||
    variant === 'scorpion_boss' ||
    variant === 'prism_boss' ||
    variant === 'colossus_boss' ||
    variant === 'bell_boss' ||
    variant === 'sawmill_boss' ||
    variant === 'void_boss' ||
    variant === 'centipede_boss' ||
    variant === 'bastion_boss' ||
    variant === 'omega_boss';

  const isLeviathan = variant === 'leviathan_boss';
  const isEternal = variant === 'eternal_boss';
  const isSerpent = variant === 'serpent';
  const isRipper = variant === 'ripper';
  const isCarcara = variant === 'carcara_boss';
  const isArmored = variant === 'armored_boss';
  const isFurnace = variant === 'furnace_boss';
  const isDrill = variant === 'drill_boss';
  const isHammer = variant === 'hammer_boss';
  const isAnvil = variant === 'anvil_boss';
  const isBunker = variant === 'bunker_boss';
  const isReaper = variant === 'reaper_boss';
  const isCathedral = variant === 'cathedral_boss';
  const isHydra = variant === 'hydra_boss';
  const isSovereign = variant === 'sovereign_boss';
  const isGlacier = variant === 'glacier_boss';
  const isPendulum = variant === 'pendulum_boss';
  const isMagma = variant === 'magma_boss';
  const isSpider = variant === 'spider_boss';
  const isObelisk = variant === 'obelisk_boss';
  const isTurbine = variant === 'turbine_boss';
  const isScorpion = variant === 'scorpion_boss';
  const isPrism = variant === 'prism_boss';
  const isColossus = variant === 'colossus_boss';
  const isBell = variant === 'bell_boss';
  const isSawmill = variant === 'sawmill_boss';
  const isVoid = variant === 'void_boss';
  const isCentipede = variant === 'centipede_boss';
  const isBastion = variant === 'bastion_boss';
  const isOmega = variant === 'omega_boss';

  const hullColor = isLeviathan || isGlacier
    ? 0x0d151d
    : isVoid || isOmega || isEternal
    ? 0x060609
    : isFurnace || isMagma
    ? 0x1a100d
    : isBunker || isBastion
    ? 0x1c1d22
    : isPrism
    ? 0x2a2b34
    : isSovereign || isBell
    ? 0x15151b
    : isRipper
    ? 0x3b3b44
    : isSerpent
    ? 0x1e2028
    : isBoss
    ? 0x0e0e13
    : 0x18181e;

  const trimColor = isLeviathan || isGlacier
    ? 0x7aa2bc
    : isVoid || isPrism || isOmega || isEternal
    ? 0xb4b4c4
    : isFurnace || isMagma
    ? 0x9a5a3a
    : isAnvil || isHammer || isColossus
    ? 0x828290
    : isSovereign || isPendulum
    ? 0x9c9cad
    : isRipper
    ? 0xe4e4ec
    : isSerpent
    ? 0x8f94a3
    : isBoss
    ? 0x72727e
    : 0x5c5c68;

  const brightColor = isLeviathan || isGlacier
    ? 0xdbeafe
    : isVoid || isPrism || isOmega || isEternal
    ? 0xffffff
    : isFurnace || isMagma
    ? 0xfef3c7
    : isRipper
    ? 0xf8f8fc
    : 0xd8d8e2;
  const defaultFurnaceColor = isLeviathan || isGlacier
    ? 0xbae6fd
    : isFurnace || isMagma
    ? 0xf97316
    : isVoid || isPrism || isOmega || isEternal
    ? 0xffffff
    : 0xf4f4f8;
  const defaultLampColor = isLeviathan || isGlacier
    ? 0xe0f2fe
    : isFurnace || isMagma
    ? 0xfde68a
    : isBunker || isBastion
    ? 0xe4e4ec
    : 0xffffff;

  const ironMat = makeMat(hullColor, 0.52, 0.48);
  const steelMat = makeMat(trimColor, 0.34, 0.72);
  const chalkMat = makeMat(brightColor, 0.3, 0.42);
  const coalMat = makeMat(0x0b0b0e, 0.92, 0.05);
  const furnaceMat = new THREE.MeshBasicMaterial({ color: defaultFurnaceColor });

  const widthScale = isOmega
    ? 1.38
    : isEternal || isColossus || isBastion
    ? 1.32
    : isLeviathan || isHydra || isBunker || isSpider || isCentipede
    ? 1.26
    : isBoss
    ? 1.16
    : isSerpent
    ? 0.96
    : 1.0;

  // Car 0: Locomotive (local z=0 at front nose, body spanning -8.5..+1.5)
  const locoGroup = new THREE.Group();
  group.add(locoGroup);
  cars.push({ group: locoGroup, sOffset: 0 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.15 * widthScale, 0.82, 9.2), ironMat);
  chassis.position.set(0, 1.0, -4.4);
  chassis.castShadow = true;
  locoGroup.add(chassis);

  if (variant === 'classic') {
    const cowGeo = new THREE.ConeGeometry(1.9, 2.35, 4);
    cowGeo.rotateY(Math.PI / 4);
    cowGeo.rotateX(Math.PI / 2);
    const cowcatcher = new THREE.Mesh(cowGeo, steelMat);
    cowcatcher.position.set(0, 0.96, 0.75);
    cowcatcher.scale.set(1.0, 0.62, 1.0);
    locoGroup.add(cowcatcher);

    // Classic steam dome & bell
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.75, 0.95, 8), chalkMat);
    dome.position.set(0, 4.05, -3.7);
    locoGroup.add(dome);
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.45, 7), chalkMat);
    bell.position.set(0, 4.15, -2.2);
    locoGroup.add(bell);
  } else if (isArmored) {
    // Sloped fortress ram prow + bunker spikes + twin shoulder turrets
    const prow = new THREE.Mesh(new THREE.BoxGeometry(3.85, 2.25, 1.75), steelMat);
    prow.position.set(0, 1.42, 0.6);
    prow.rotation.x = 0.28;
    locoGroup.add(prow);
    const spikeGeo = new THREE.ConeGeometry(0.32, 1.75, 4);
    for (const sx of [-1.3, 0, 1.3]) {
      const spike = new THREE.Mesh(spikeGeo, chalkMat);
      spike.rotation.x = Math.PI / 2;
      spike.position.set(sx, 1.22, 1.92);
      locoGroup.add(spike);
    }
    const turretGeo = new THREE.CylinderGeometry(0.45, 0.52, 1.1, 6);
    for (const side of [-1, 1]) {
      const turret = new THREE.Mesh(turretGeo, ironMat);
      turret.position.set(side * 1.45, 3.65, -4.6);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 6), chalkMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 1.45, 3.72, -3.5);
      locoGroup.add(turret, barrel);
    }
  } else if (isRipper) {
    // Sloped wedge + twin spinning circular sawblades + dorsal spine blade
    const wedgeGeo = new THREE.ConeGeometry(2.35, 3.3, 3);
    wedgeGeo.rotateX(Math.PI / 2);
    const wedge = new THREE.Mesh(wedgeGeo, chalkMat);
    wedge.position.set(0, 1.55, 1.25);
    wedge.scale.set(1.05, 0.95, 1);
    locoGroup.add(wedge);

    const bladeGeo = new THREE.CylinderGeometry(1.18, 1.18, 0.15, 10);
    for (const bx of [-0.95, 0.95]) {
      const blade = new THREE.Mesh(bladeGeo, steelMat);
      blade.rotation.z = Math.PI / 2;
      blade.position.set(bx, 1.12, 0.72);
      locoGroup.add(blade);
      wheels.push(blade);
    }
    const dorsalSaw = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.14, 10), chalkMat);
    dorsalSaw.rotation.z = Math.PI / 2;
    dorsalSaw.position.set(0, 3.9, -3.3);
    locoGroup.add(dorsalSaw);
    wheels.push(dorsalSaw);
  } else if (isSerpent) {
    // Sleek fanged serpent snout + segmented dorsal scales
    const snout = new THREE.Mesh(new THREE.ConeGeometry(2.05, 3.5, 5), ironMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.65, 1.35);
    snout.scale.set(1.12, 0.72, 1);
    locoGroup.add(snout);

    const fangGeo = new THREE.ConeGeometry(0.22, 1.4, 4);
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(fangGeo, chalkMat);
      fang.rotation.x = Math.PI / 2 + 0.18;
      fang.rotation.z = side * -0.15;
      fang.position.set(side * 0.85, 1.05, 2.15);
      locoGroup.add(fang);
    }
    const scaleGeo = new THREE.ConeGeometry(0.6, 1.1, 4);
    for (let sz = -1.2; sz >= -6.2; sz -= 1.25) {
      const sc = new THREE.Mesh(scaleGeo, steelMat);
      sc.rotation.x = -0.35;
      sc.position.set(0, 3.7, sz);
      locoGroup.add(sc);
    }
  } else if (isCarcara) {
    // Predatory steel hawk beak + swept double wings + talons
    const beak = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.6, 4), steelMat);
    beak.rotation.x = Math.PI / 2 + 0.12;
    beak.position.set(0, 1.85, 1.35);
    locoGroup.add(beak);
    const wingGeo = new THREE.BoxGeometry(2.35, 0.2, 4.1);
    const wingTipGeo = new THREE.ConeGeometry(0.65, 2.2, 4);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, chalkMat);
      wing.position.set(side * 2.35, 2.65, -2.7);
      wing.rotation.z = side * 0.36;
      wing.rotation.y = side * -0.22;
      locoGroup.add(wing);

      const tip = new THREE.Mesh(wingTipGeo, steelMat);
      tip.rotation.x = -Math.PI / 2;
      tip.position.set(side * 3.25, 3.0, -4.1);
      locoGroup.add(tip);
    }
  } else if (isFurnace) {
    // FORNALHA VIVA: Glowing iron-grated furnace maw + domed smelting hood
    const mawFrame = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.4, 1.65), ironMat);
    mawFrame.position.set(0, 1.55, 0.72);
    locoGroup.add(mawFrame);
    const hearthGlow = new THREE.Mesh(new THREE.BoxGeometry(3.15, 1.35, 0.35), furnaceMat);
    hearthGlow.position.set(0, 1.48, 1.48);
    locoGroup.add(hearthGlow);
    for (const gx of [-1.05, -0.35, 0.35, 1.05]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.55, 0.55), steelMat);
      bar.position.set(gx, 1.48, 1.58);
      locoGroup.add(bar);
    }
    const cauldron = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 0), steelMat);
    cauldron.position.set(0, 3.4, -3.5);
    cauldron.scale.set(1.15, 0.75, 1.5);
    locoGroup.add(cauldron);
  } else if (isDrill) {
    // ESCAVADOR ABISSAL: Stepped mining auger cone + rotating crusher drums + visor beam
    for (let d = 0; d < 3; d++) {
      const r = 1.85 - d * 0.45;
      const augerRing = new THREE.Mesh(new THREE.ConeGeometry(r, 1.35, 8), d % 2 === 0 ? steelMat : chalkMat);
      augerRing.rotation.x = Math.PI / 2;
      augerRing.position.set(0, 1.55, 0.55 + d * 1.15);
      locoGroup.add(augerRing);
    }
    const drumGeo = new THREE.CylinderGeometry(0.88, 0.88, 3.6, 8);
    drumGeo.rotateZ(Math.PI / 2);
    const crusherDrum = new THREE.Mesh(drumGeo, steelMat);
    crusherDrum.position.set(0, 0.92, 0.95);
    locoGroup.add(crusherDrum);
    wheels.push(crusherDrum);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 1.4), chalkMat);
    visor.position.set(0, 3.85, -0.35);
    locoGroup.add(visor);
  } else if (isHammer) {
    // QUEBRA-ROCHA: Twin pneumatic battering-ram blocks + flat slammer bumper + shoulder pistons
    const ramPlate = new THREE.Mesh(new THREE.BoxGeometry(4.35, 2.35, 1.95), steelMat);
    ramPlate.position.set(0, 1.55, 0.92);
    locoGroup.add(ramPlate);
    for (const side of [-1, 1]) {
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.8, 8), chalkMat);
      piston.rotation.x = Math.PI / 2;
      piston.position.set(side * 1.35, 1.55, 1.35);
      locoGroup.add(piston);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.45, 3.2), ironMat);
      shoulder.position.set(side * 1.85, 2.85, -2.6);
      locoGroup.add(shoulder);
    }
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 5.8), chalkMat);
    ridge.position.set(0, 4.1, -3.5);
    locoGroup.add(ridge);
  } else if (isAnvil) {
    // BIGORNA NEGRA: Flared inverted anvil prow + forged overhead horn arch
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.25, 2.2), ironMat);
    anvilBase.position.set(0, 1.05, 0.55);
    locoGroup.add(anvilBase);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.05, 2.8), steelMat);
    anvilTop.position.set(0, 2.15, 0.95);
    locoGroup.add(anvilTop);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.6, 4), chalkMat);
    horn.rotation.x = Math.PI / 2;
    horn.position.set(0, 2.25, 2.45);
    locoGroup.add(horn);
    const forgeArch = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.36, 6, 10, Math.PI), steelMat);
    forgeArch.position.set(0, 2.55, -2.2);
    locoGroup.add(forgeArch);
  } else if (isBunker) {
    // BASTILHA MÓVEL: Octagonal armored casemate prow + recessed gun slits + roof cupola
    const casemate = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.65, 2.45, 6), steelMat);
    casemate.position.set(0, 1.85, 0.45);
    locoGroup.add(casemate);
    const roofPlate = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.55, 7.6), chalkMat);
    roofPlate.position.set(0, 4.12, -3.5);
    locoGroup.add(roofPlate);
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.95, 8), ironMat);
    cupola.position.set(0, 4.65, -4.6);
    locoGroup.add(cupola);
  } else if (isReaper) {
    // CEIFADOR DE TRILHOS: Scythe prow + twin giant spinning side scythe wheels + skeletal rib arches
    const prowBlade = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.8, 3), chalkMat);
    prowBlade.rotation.x = Math.PI / 2 - 0.14;
    prowBlade.position.set(0, 1.72, 1.45);
    locoGroup.add(prowBlade);
    const scytheWheelGeo = new THREE.CylinderGeometry(1.75, 1.75, 0.16, 6);
    scytheWheelGeo.rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(scytheWheelGeo, chalkMat);
      sw.position.set(side * 2.05, 1.72, -1.6);
      locoGroup.add(sw);
      wheels.push(sw);
    }
    for (let rz = -1.1; rz >= -5.6; rz -= 1.1) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.2, 5, 8, Math.PI), chalkMat);
      rib.position.set(0, 2.55, rz);
      locoGroup.add(rib);
    }
  } else if (isCathedral) {
    // ALTAR SOMBRIO: Twin gothic iron spires flanking boiler + belfry bell arch
    const spireGeo = new THREE.ConeGeometry(0.58, 4.2, 4);
    for (const side of [-1, 1]) {
      const spireBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.6, 1.15), steelMat);
      spireBase.position.set(side * 1.55, 2.2, 0.15);
      const spire = new THREE.Mesh(spireGeo, chalkMat);
      spire.position.set(side * 1.55, 5.15, 0.15);
      locoGroup.add(spireBase, spire);
    }
    const altarProw = new THREE.Mesh(new THREE.ConeGeometry(2.05, 3.2, 4), ironMat);
    altarProw.rotation.x = Math.PI / 2;
    altarProw.position.set(0, 1.5, 1.2);
    locoGroup.add(altarProw);
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.9, 8), chalkMat);
    bell.position.set(0, 4.55, -2.4);
    locoGroup.add(bell);
  } else if (isHydra) {
    // HIDRA DE VAPOR: Triple articulated armored serpent-boiler heads lunging forward
    const headOffsets = [-1.45, 0, 1.45];
    for (let h = 0; h < headOffsets.length; h++) {
      const hx = headOffsets[h];
      const neck = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 3.1), steelMat);
      neck.position.set(hx, h === 1 ? 2.25 : 1.75, 0.35);
      neck.rotation.y = hx * 0.14;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.92, 2.35, 5), ironMat);
      head.rotation.x = Math.PI / 2 + 0.12;
      head.position.set(hx * 1.18, h === 1 ? 2.35 : 1.75, 2.05);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.15, 4), chalkMat);
      horn.rotation.x = -0.35;
      horn.position.set(hx * 1.15, (h === 1 ? 2.35 : 1.75) + 0.9, 1.5);
      locoGroup.add(neck, head, horn);
    }
  } else if (isSovereign) {
    // SOBERANO CINZENTO: Regal iron crown shield + heavy side bastions + spiked crest
    const shieldProw = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 1.65, 2.45, 6), steelMat);
    shieldProw.position.set(0, 1.72, 0.72);
    locoGroup.add(shieldProw);
    const crownRing = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.45, 8), chalkMat);
    crownRing.position.set(0, 4.85, -7.4);
    locoGroup.add(crownRing);
    const spikeGeo = new THREE.ConeGeometry(0.24, 1.35, 4);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const sp = new THREE.Mesh(spikeGeo, chalkMat);
      sp.position.set(Math.cos(ang) * 1.55, 5.55, -7.4 + Math.sin(ang) * 1.15);
      locoGroup.add(sp);
    }
  } else if (isEternal) {
    // LEVIATÃ ETERNO (Boss Final): Colossal dreadnought combining serrated mega-jaw, dread wings, & obelisk crest
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(4.9, 2.55, 2.35), ironMat);
    jaw.position.set(0, 1.55, 0.98);
    locoGroup.add(jaw);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.85, 2.9), steelMat);
    lowerJaw.position.set(0, 0.74, 1.55);
    locoGroup.add(lowerJaw);

    const tuskGeo = new THREE.ConeGeometry(0.36, 2.45, 4);
    for (const sx of [-1.85, -0.95, 0, 0.95, 1.85]) {
      const tusk = new THREE.Mesh(tuskGeo, chalkMat);
      tusk.rotation.x = Math.PI / 2 - 0.1;
      tusk.position.set(sx, 1.2, 2.65);
      locoGroup.add(tusk);
    }
    const wingGeo = new THREE.BoxGeometry(2.65, 0.24, 4.5);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, chalkMat);
      wing.position.set(side * 2.85, 2.2, -2.9);
      wing.rotation.z = side * -0.22;
      wing.rotation.y = side * -0.24;
      locoGroup.add(wing);
    }
    const obeliskGeo = new THREE.ConeGeometry(0.65, 2.75, 4);
    for (let dz = -0.8; dz >= -6.4; dz -= 1.35) {
      const sp = new THREE.Mesh(obeliskGeo, chalkMat);
      sp.rotation.x = -0.36;
      sp.position.set(0, 4.65, dz);
      locoGroup.add(sp);
    }
  } else if (isGlacier) {
    // QUEBRA-GELO POLAR: Giant angled icebreaker V-prow + frosted dorsal crystal shards
    const prowIce = new THREE.Mesh(new THREE.ConeGeometry(2.55, 3.8, 4), chalkMat);
    prowIce.rotation.y = Math.PI / 4;
    prowIce.rotation.x = Math.PI / 2;
    prowIce.position.set(0, 1.55, 1.5);
    locoGroup.add(prowIce);
    for (let kz = -1.2; kz >= -5.6; kz -= 1.45) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.55, 5), chalkMat);
      shard.rotation.x = -0.28;
      shard.position.set(0, 4.3, kz);
      locoGroup.add(shard);
    }
  } else if (isPendulum) {
    // PENDULO MALDITO: Clockface shield prow + side rotating cogwheels + pendulum arch
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.65, 12), chalkMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, 2.05, 0.85);
    locoGroup.add(dial);
    const cogGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.25, 8);
    cogGeo.rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      const cog = new THREE.Mesh(cogGeo, steelMat);
      cog.position.set(side * 2.15, 2.2, -2.5);
      locoGroup.add(cog);
      wheels.push(cog);
    }
    const bellArch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 6, 12, Math.PI), chalkMat);
    bellArch.position.set(0, 2.6, -2.4);
    locoGroup.add(bellArch);
  } else if (isMagma) {
    // MAGMA FERREO: Basalt fortress prow with glowing caldera cracks + volcanic cones
    const basalt = new THREE.Mesh(new THREE.DodecahedronGeometry(2.15, 0), ironMat);
    basalt.position.set(0, 1.65, 0.85);
    basalt.scale.set(1.25, 0.95, 1.15);
    locoGroup.add(basalt);
    const fissure = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.55, 2.3), furnaceMat);
    fissure.position.set(0, 1.65, 1.2);
    locoGroup.add(fissure);
    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 1.6, 6), furnaceMat);
      vent.position.set(side * 1.4, 3.65, -3.2);
      locoGroup.add(vent);
    }
  } else if (isSpider) {
    // ARANHA DOS TRILHOS: Fang mandible + 6 splayed articulated steel legs + cluster eyes
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.9, 4), chalkMat);
      fang.rotation.x = Math.PI / 2;
      fang.rotation.z = side * -0.35;
      fang.position.set(side * 1.05, 1.2, 2.05);
      locoGroup.add(fang);
      for (const lz of [-0.8, -3.2, -5.6]) {
        const legUpper = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, 0.32), steelMat);
        legUpper.position.set(side * 2.45, 2.2, lz);
        legUpper.rotation.z = side * 0.45;
        const legLower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.1, 0.28), chalkMat);
        legLower.position.set(side * 3.15, 1.15, lz);
        legLower.rotation.z = side * -0.18;
        locoGroup.add(legUpper, legLower);
      }
    }
  } else if (isObelisk) {
    // OBELISCO NEGRO: Towering brutalist pyramid prow + hovering ring halo
    const obeliskProw = new THREE.Mesh(new THREE.ConeGeometry(2.35, 5.2, 4), ironMat);
    obeliskProw.rotation.y = Math.PI / 4;
    obeliskProw.position.set(0, 3.15, 0.65);
    locoGroup.add(obeliskProw);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.2, 5, 12), chalkMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 5.65, 0.65);
    locoGroup.add(halo);
  } else if (isTurbine) {
    // TURBINA FANTASMA: Bullet nose + twin giant lateral jet turbines with rotating blades
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.6, 10), chalkMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.95, 1.4);
    locoGroup.add(nose);
    const cowlingGeo = new THREE.CylinderGeometry(1.15, 1.25, 3.2, 10, 1, true);
    cowlingGeo.rotateX(Math.PI / 2);
    const rotorGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.35, 6);
    rotorGeo.rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      const cowl = new THREE.Mesh(cowlingGeo, steelMat);
      cowl.position.set(side * 2.25, 2.1, -1.6);
      const rotor = new THREE.Mesh(rotorGeo, chalkMat);
      rotor.position.set(side * 2.25, 2.1, 0.05);
      locoGroup.add(cowl, rotor);
      wheels.push(rotor);
    }
  } else if (isScorpion) {
    // ESCORPIAO DE ACO: Twin giant pincer claws forward + towering overhead curving stinger tail
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 3.2), steelMat);
      arm.position.set(side * 1.95, 1.35, 1.2);
      arm.rotation.y = side * -0.25;
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.85, 4), chalkMat);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(side * 1.65, 1.35, 3.0);
      locoGroup.add(arm, claw);
    }
    const tailSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.2, 0.85), steelMat);
    tailSeg1.position.set(0, 4.9, -6.2);
    tailSeg1.rotation.x = 0.35;
    const tailSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 3.4), steelMat);
    tailSeg2.position.set(0, 6.2, -4.1);
    const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.1, 4), chalkMat);
    stinger.rotation.x = Math.PI / 2 + 0.5;
    stinger.position.set(0, 5.75, -2.0);
    locoGroup.add(tailSeg1, tailSeg2, stinger);
  } else if (isPrism) {
    // PRISMA ESPECTRAL: Sharp mirrored octahedral diamond prow + floating crystal dorsal array
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(2.15, 0), chalkMat);
    diamond.position.set(0, 2.05, 1.25);
    diamond.scale.set(1.15, 0.9, 1.35);
    locoGroup.add(diamond);
    for (let pz = -1.2; pz >= -5.4; pz -= 1.4) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), steelMat);
      crystal.position.set(0, 4.35, pz);
      locoGroup.add(crystal);
    }
  } else if (isColossus) {
    // TITA DA ESCORIA: Double-deck brutalist industrial hulk with crane boom & twin shields
    const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.55, 6.6), steelMat);
    upperDeck.position.set(0, 4.15, -3.5);
    locoGroup.add(upperDeck);
    for (const side of [-1, 1]) {
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.8, 2.6), chalkMat);
      shield.position.set(side * 1.9, 1.75, 1.15);
      shield.rotation.y = side * -0.22;
      locoGroup.add(shield);
    }
  } else if (isBell) {
    // CAMPANARIO FUNEBRE: Huge front funeral bell suspended inside gothic cross-gantry
    const gantryL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.4, 0.7), ironMat);
    gantryL.position.set(-1.75, 2.75, 0.9);
    const gantryR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.4, 0.7), ironMat);
    gantryR.position.set(1.75, 2.75, 0.9);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.65, 0.9), steelMat);
    beam.position.set(0, 4.85, 0.9);
    const giantBell = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.1, 10), chalkMat);
    giantBell.position.set(0, 3.2, 0.95);
    locoGroup.add(gantryL, gantryR, beam, giantBell);
  } else if (isSawmill) {
    // MOEDOR SUPREMO: 4 colossal spinning saws along nose & sides + timber shredder bar
    const megaSawGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.2, 10);
    megaSawGeo.rotateZ(Math.PI / 2);
    for (const sx of [-1.85, -0.65, 0.65, 1.85]) {
      const saw = new THREE.Mesh(megaSawGeo, chalkMat);
      saw.position.set(sx, 1.55, Math.abs(sx) < 1 ? 1.55 : 0.45);
      locoGroup.add(saw);
      wheels.push(saw);
    }
  } else if (isVoid) {
    // ESPECTRO DO VACUO: Hollowed faceless frame prow + stark glowing white wireframe ribs
    const frameGeo = new THREE.TorusGeometry(2.05, 0.24, 5, 6);
    const voidRing = new THREE.Mesh(frameGeo, chalkMat);
    voidRing.position.set(0, 2.15, 1.15);
    locoGroup.add(voidRing);
    for (let vz = -0.8; vz >= -6.0; vz -= 1.3) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.16, 4, 6), chalkMat);
      rib.position.set(0, 2.45, vz);
      locoGroup.add(rib);
    }
  } else if (isCentipede) {
    // CENTOPEIA BLINDADA: Triple armored dome segments + side armored carapace pods
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(1.6, 7, 6), s % 2 === 0 ? steelMat : ironMat);
      seg.position.set(0, 2.1, 1.2 - s * 2.55);
      seg.scale.set(1.15, 0.9, 1.1);
      locoGroup.add(seg);
    }
    for (const side of [-1, 1]) {
      const mandible = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.7, 4), chalkMat);
      mandible.rotation.x = Math.PI / 2;
      mandible.rotation.z = side * -0.4;
      mandible.position.set(side * 1.1, 1.25, 2.5);
      locoGroup.add(mandible);
    }
  } else if (isBastion) {
    // CIDADELA MOVEL: 3-tier stepped armored fortress with 4 artillery barrels
    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 5.2), steelMat);
    tier2.position.set(0, 3.85, -3.2);
    const tier3 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 3.4), chalkMat);
    tier3.position.set(0, 4.95, -3.8);
    locoGroup.add(tier2, tier3);
    for (const bx of [-1.5, -0.5, 0.5, 1.5]) {
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.4, 6), chalkMat);
      gun.rotation.x = Math.PI / 2;
      gun.position.set(bx, 3.55, 0.4);
      locoGroup.add(gun);
    }
  } else if (isOmega) {
    // OMEGA ABSOLUTO (Boss Final 80): Crowned triple-jaw dreadnought, turbines, scythe wheels, swept blades
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.65, 2.5), ironMat);
    jaw.position.set(0, 1.6, 1.05);
    locoGroup.add(jaw);
    for (const sx of [-2.0, -1.0, 0, 1.0, 2.0]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.75, 4), chalkMat);
      tusk.rotation.x = Math.PI / 2 - 0.1;
      tusk.position.set(sx, 1.25, 2.85);
      locoGroup.add(tusk);
    }
    const megaWingGeo = new THREE.BoxGeometry(2.9, 0.28, 5.2);
    const rotorGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.25, 8);
    rotorGeo.rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(megaWingGeo, chalkMat);
      wing.position.set(side * 3.1, 2.4, -3.1);
      wing.rotation.z = side * -0.2;
      wing.rotation.y = side * -0.25;
      const saw = new THREE.Mesh(rotorGeo, steelMat);
      saw.position.set(side * 2.55, 1.65, 0.15);
      locoGroup.add(wing, saw);
      wheels.push(saw);
    }
    for (let dz = -0.6; dz >= -6.6; dz -= 1.2) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.68, 3.1, 4), chalkMat);
      spire.rotation.x = -0.32;
      spire.position.set(0, 4.9, dz);
      locoGroup.add(spire);
    }
  } else {
    // LEVIATHAN_BOSS: Armored sea-monster jaw, baleen tusks, side pectoral fins & serrated spine crest
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 2.1), ironMat);
    jaw.position.set(0, 1.5, 0.88);
    locoGroup.add(jaw);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.75, 2.6), steelMat);
    lowerJaw.position.set(0, 0.72, 1.4);
    locoGroup.add(lowerJaw);

    const tuskGeo = new THREE.ConeGeometry(0.34, 2.2, 4);
    for (const sx of [-1.65, -0.65, 0.65, 1.65]) {
      const tusk = new THREE.Mesh(tuskGeo, chalkMat);
      tusk.rotation.x = Math.PI / 2 - 0.12;
      tusk.position.set(sx, 1.15, 2.35);
      locoGroup.add(tusk);
    }

    const finGeo = new THREE.BoxGeometry(1.75, 0.22, 3.2);
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(finGeo, steelMat);
      fin.position.set(side * 2.55, 1.55, -2.8);
      fin.rotation.z = side * -0.35;
      fin.rotation.y = side * -0.28;
      locoGroup.add(fin);
    }
    const dorsalFinGeo = new THREE.ConeGeometry(0.55, 2.2, 4);
    for (let dz = -0.8; dz >= -6.4; dz -= 1.35) {
      const dorsalFin = new THREE.Mesh(dorsalFinGeo, chalkMat);
      dorsalFin.rotation.x = -0.42;
      dorsalFin.position.set(0, 4.45, dz);
      locoGroup.add(dorsalFin);
    }
  }

  if (isRipper || isSerpent) {
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(isSerpent ? 2.45 : 2.85, 2.15, 6.4),
      isSerpent ? ironMat : steelMat
    );
    hood.position.set(0, 2.35, -3.3);
    hood.castShadow = true;
    locoGroup.add(hood);
    if (isRipper) {
      const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 6.4), chalkMat);
      dorsal.position.set(0, 3.6, -3.3);
      locoGroup.add(dorsal);
    }
  } else {
    const boiler = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4 * widthScale, 1.5 * widthScale, 6.3, isBunker || isAnvil ? 4 : 8),
      ironMat
    );
    boiler.rotation.x = Math.PI / 2;
    if (isBunker || isAnvil) boiler.rotation.z = Math.PI / 4;
    boiler.position.set(0, 2.45, -3.3);
    boiler.castShadow = true;
    locoGroup.add(boiler);

    if (isBoss) {
      const armorGeo = new THREE.BoxGeometry(0.48, 1.95, 6.5);
      for (const side of [-1, 1]) {
        const armor = new THREE.Mesh(armorGeo, steelMat);
        armor.position.set(side * (1.64 * widthScale), 1.9, -3.3);
        armor.rotation.z = side * -0.18;
        locoGroup.add(armor);
      }
    }
  }

  const ringGeo = new THREE.CylinderGeometry(1.54 * widthScale, 1.54 * widthScale, 0.18, 8);
  ringGeo.rotateX(Math.PI / 2);
  for (let z = -1.2; z >= -5.6; z -= 1.4) {
    const ring = new THREE.Mesh(ringGeo, chalkMat);
    ring.position.set(0, 2.45, z);
    locoGroup.add(ring);
  }

  // Side furnace / gill vents
  const slitGeo = new THREE.BoxGeometry(
    0.16,
    isLeviathan || isEternal ? 0.56 : isFurnace ? 0.44 : 0.28,
    isLeviathan || isEternal ? 0.42 : 0.8
  );
  const slitStep = isLeviathan || isEternal ? 0.95 : 1.4;
  for (const side of [-1, 1]) {
    for (let z = -1.6; z >= -5.2; z -= slitStep) {
      const slit = new THREE.Mesh(slitGeo, furnaceMat);
      slit.position.set(side * (1.5 * widthScale), 2.2, z);
      if (isLeviathan || isEternal) slit.rotation.x = 0.28;
      locoGroup.add(slit);
    }
  }

  const stackXPositions = isOmega
    ? [-1.25, -0.62, 0, 0.62, 1.25]
    : isSovereign || isEternal || isBastion || isColossus
    ? [-1.05, -0.35, 0.35, 1.05]
    : isLeviathan || isHydra || isCathedral || isBell || isMagma
    ? [-0.95, 0, 0.95]
    : isArmored || isCarcara || isFurnace || isHammer || isBunker || isGlacier || isTurbine || isPendulum
    ? [-0.65, 0.65]
    : [0];
  const stackGeo = new THREE.CylinderGeometry(
    isFurnace || isMagma ? 0.78 : 0.62,
    isFurnace || isMagma ? 0.48 : 0.38,
    isBoss ? 2.8 : 2.4,
    7
  );
  for (let s = 0; s < stackXPositions.length; s++) {
    const stack = new THREE.Mesh(stackGeo, ironMat);
    stack.position.set(stackXPositions[s], isBoss ? 4.55 : 4.3, -1.2 - s * 0.65);
    stack.rotation.z = (s - (stackXPositions.length - 1) * 0.5) * 0.08;
    locoGroup.add(stack);
  }

  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.38 * widthScale, 3.25, 2.65), steelMat);
  cab.position.set(0, 2.85, -7.4);
  locoGroup.add(cab);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(3.75 * widthScale, 0.28, 3.15), chalkMat);
  cabRoof.position.set(0, 4.58, -7.4);
  cabRoof.rotation.z = 0.04;
  locoGroup.add(cabRoof);

  const headlight = new THREE.SpotLight(
    defaultLampColor,
    isBoss ? 240 : 180,
    56,
    Math.PI / 3.8,
    0.45,
    1.3
  );
  headlight.position.set(0, 3.05, 0.25);
  headlight.target.position.set(0, 0.4, 24);
  locoGroup.add(headlight);
  locoGroup.add(headlight.target);

  const lampXOffsets = isOmega
    ? [-1.6, -0.8, 0, 0.8, 1.6]
    : isBunker || isBastion || isSpider
    ? [-1.35, -0.45, 0.45, 1.35]
    : isLeviathan || isHydra || isEternal || isPrism || isColossus
    ? [-1.3, 0, 1.3]
    : isArmored ||
      isCarcara ||
      isFurnace ||
      isDrill ||
      isHammer ||
      isCathedral ||
      isSovereign ||
      isGlacier ||
      isTurbine ||
      isMagma ||
      isSawmill
    ? [-0.95, 0.95]
    : [0];

  const lampGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.35, 8);
  lampGeo.rotateX(Math.PI / 2);
  const lampMat = new THREE.MeshBasicMaterial({ color: defaultLampColor });
  const beamGeo = new THREE.ConeGeometry(8.5, 28, 10, 1, true);
  beamGeo.translate(0, -14, 0);
  beamGeo.rotateX(-Math.PI / 2);

  for (const lx of lampXOffsets) {
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(lx, 3.05, 0.1);
    locoGroup.add(lamp);

    const beamMat = new THREE.MeshBasicMaterial({
      color: defaultLampColor,
      transparent: true,
      opacity: isBoss ? 0.17 : 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(lx, 3.05, 0.25);
    locoGroup.add(beam);
    beamMeshes.push(beam);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.28, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const z of [-1.4, -3.4, -5.4, -7.4]) {
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, chalkMat);
      w.position.set(side * (1.55 * widthScale), 0.68, z);
      locoGroup.add(w);
      wheels.push(w);
    }
  }

  // Articulated wagons tailored per variant
  const wagonCount = isBoss ? 4 : 3;
  const wagonBodyGeo = new THREE.BoxGeometry(2.98 * widthScale, 1.85, 6.4);
  const rimGeo = new THREE.BoxGeometry(3.18 * widthScale, 0.22, 6.6);
  const heapGeo = new THREE.DodecahedronGeometry(1.45, 0);
  const linkGeo = new THREE.BoxGeometry(0.4, 0.25, 1.4);
  const spineConeGeo = new THREE.ConeGeometry(0.45, 1.65, 4);
  const ribBarGeo = new THREE.BoxGeometry(3.3 * widthScale, 0.18, 0.24);

  let sOff = -13.2;
  for (let c = 0; c < wagonCount; c++) {
    const wagonGroup = new THREE.Group();
    group.add(wagonGroup);

    const wagonBody = new THREE.Mesh(wagonBodyGeo, ironMat);
    wagonBody.position.set(0, 1.65, 0);
    wagonBody.castShadow = true;
    wagonGroup.add(wagonBody);

    const rim = new THREE.Mesh(rimGeo, steelMat);
    rim.position.set(0, 2.6, 0);
    wagonGroup.add(rim);

    if (isLeviathan || isEternal || isOmega) {
      for (const sz of [-1.8, 0, 1.8]) {
        const sp = new THREE.Mesh(spineConeGeo, chalkMat);
        sp.rotation.x = -0.35;
        sp.position.set(0, 3.2, sz);
        wagonGroup.add(sp);
      }
      for (const side of [-1, 1]) {
        const slit = new THREE.Mesh(slitGeo, furnaceMat);
        slit.position.set(side * (1.52 * widthScale), 1.75, 0);
        wagonGroup.add(slit);
      }
    } else if (isArmored || isBunker || isBastion || isCentipede) {
      for (const rz of [-2.0, 0, 2.0]) {
        const bar = new THREE.Mesh(ribBarGeo, chalkMat);
        bar.position.set(0, 3.1, rz);
        wagonGroup.add(bar);
      }
    } else if (isFurnace || isMagma) {
      const emberCore = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 4.8), furnaceMat);
      emberCore.position.set(0, 2.75, 0);
      wagonGroup.add(emberCore);
    } else if (isDrill || isHammer || isAnvil || isColossus) {
      for (const bz of [-1.5, 1.5]) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(2.55 * widthScale, 0.85, 1.65), chalkMat);
        block.position.set(0, 3.05, bz);
        wagonGroup.add(block);
      }
    } else if (isReaper || isCathedral || isSovereign || isBell || isObelisk || isPrism) {
      for (const rz of [-1.8, 0, 1.8]) {
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.65, 4), chalkMat);
        spire.position.set(0, 3.4, rz);
        wagonGroup.add(spire);
      }
    } else if (isHydra || isScorpion || isSpider) {
      for (const sx of [-0.9, 0.9]) {
        const spine = new THREE.Mesh(spineConeGeo, steelMat);
        spine.rotation.x = -0.3;
        spine.position.set(sx, 3.15, 0);
        wagonGroup.add(spine);
      }
    } else if (isCarcara || isGlacier || isTurbine) {
      for (const side of [-1, 1]) {
        const vane = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 4.4), chalkMat);
        vane.position.set(side * (1.75 * widthScale), 2.45, 0);
        vane.rotation.z = side * 0.35;
        wagonGroup.add(vane);
      }
    } else if (isPendulum || isSawmill || isVoid) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.35 * widthScale, 0.18, 4, 8, Math.PI), chalkMat);
      arch.position.set(0, 2.65, 0);
      wagonGroup.add(arch);
    } else if (isRipper || isSerpent) {
      const crest = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.95, 5.6),
        isRipper ? chalkMat : steelMat
      );
      crest.position.set(0, 2.95, 0);
      wagonGroup.add(crest);
    } else {
      const heap = new THREE.Mesh(heapGeo, coalMat);
      heap.position.set(0, 2.75, 0);
      heap.scale.set(0.95 * widthScale, 0.55, 1.85);
      wagonGroup.add(heap);
    }

    const link = new THREE.Mesh(linkGeo, chalkMat);
    link.position.set(0, 1.0, 3.6);
    wagonGroup.add(link);

    for (const wz of [1.8, -1.8]) {
      for (const side of [-1, 1]) {
        const w = new THREE.Mesh(wheelGeo, steelMat);
        w.position.set(side * (1.5 * widthScale), 0.68, wz);
        wagonGroup.add(w);
        wheels.push(w);
      }
    }

    cars.push({ group: wagonGroup, sOffset: sOff });
    sOff -= 7.6;
  }

  return {
    group,
    cars,
    wheels,
    headlight,
    beamMeshes,
    lampMat,
    furnaceMat,
    defaultLampColor,
    defaultFurnaceColor,
  };
}

export function createSupportModel(variant: number): SupportRig {
  const group = new THREE.Group();
  const barkMat = makeMat(0x28282f, 0.9, 0.04);
  const plankMat = makeMat(0x7c7c88, 0.65, 0.15);
  const chalkMat = makeMat(0xe8e8f0, 0.35, 0.2, 0xffffff, 0.28);

  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.85, 1.15, 7), barkMat);
  stump.position.y = 0.58;
  stump.rotation.z = ((variant % 3) - 1) * 0.08;
  stump.castShadow = true;
  stump.receiveShadow = true;
  group.add(stump);

  const springGroup = new THREE.Group();
  springGroup.position.y = 1.12;
  group.add(springGroup);

  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 0.92), plankMat);
  plank.rotation.z = (variant % 2 === 0 ? 1 : -1) * 0.16;
  plank.castShadow = true;
  springGroup.add(plank);

  const gripGeo = new THREE.BoxGeometry(0.16, 0.12, 0.98);
  for (const x of [-0.42, 0, 0.42]) {
    const grip = new THREE.Mesh(gripGeo, chalkMat);
    grip.position.set(x, 0.12, 0);
    springGroup.add(grip);
  }

  const ringGeo = new THREE.RingGeometry(1.22, 1.44, 18);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf4f4f8,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.05;
  group.add(ringMesh);

  return { group, springGroup, ringMesh };
}

export function createCoalSourceModel(armored = false): CoalRig {
  const group = new THREE.Group();
  const activeGroup = new THREE.Group();
  const craterGroup = new THREE.Group();
  craterGroup.visible = false;
  group.add(activeGroup, craterGroup);

  const ironMat = makeMat(armored ? 0x3b3d48 : 0x2d2d35, armored ? 0.36 : 0.5, armored ? 0.85 : 0.65);
  const trimMat = makeMat(armored ? 0xcbd5e1 : 0x6b6b78, armored ? 0.25 : 0.35, armored ? 0.92 : 0.78);
  const plateMat = makeMat(0xe2e8f0, 0.22, 0.88);
  const woodMat = makeMat(0x231d19, 0.92, 0.05);
  const coalMat = makeMat(0x0d0d11, 0.9, 0.1, 0xe8e8f0, 0.1);
  const crackMat = new THREE.MeshBasicMaterial({ color: armored ? 0xbae6fd : 0xf5f5fa });

  // Short mine rail bed under the cart
  const tieGeo = new THREE.BoxGeometry(2.8, 0.12, 0.35);
  for (const tz of [-1.9, -0.65, 0.65, 1.9]) {
    const tie = new THREE.Mesh(tieGeo, woodMat);
    tie.position.set(0, 0.06, tz);
    tie.receiveShadow = true;
    activeGroup.add(tie);
  }
  const railGeo = new THREE.BoxGeometry(0.15, 0.14, 4.6);
  for (const rx of [-0.92, 0.92]) {
    const rail = new THREE.Mesh(railGeo, trimMat);
    rail.position.set(rx, 0.16, 0);
    activeGroup.add(rail);
  }

  // Minecart chassis & 4 flanged iron wheels
  const axleGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.25, 6);
  axleGeo.rotateZ(Math.PI / 2);
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.16, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.22, 6);
  hubGeo.rotateZ(Math.PI / 2);

  for (const wz of [-1.15, 1.15]) {
    const axle = new THREE.Mesh(axleGeo, trimMat);
    axle.position.set(0, 0.54, wz);
    activeGroup.add(axle);
    for (const wx of [-0.94, 0.94]) {
      const wheel = new THREE.Mesh(wheelGeo, ironMat);
      wheel.position.set(wx, 0.54, wz);
      wheel.castShadow = true;
      const hub = new THREE.Mesh(hubGeo, trimMat);
      hub.position.set(wx, 0.54, wz);
      activeGroup.add(wheel, hub);
    }
  }

  const cartFrame = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.24, 3.65), trimMat);
  cartFrame.position.set(0, 0.88, 0);
  cartFrame.castShadow = true;
  activeGroup.add(cartFrame);

  // Angled minecart steel tub (flared sides + end walls + rim + bumper handles)
  const tubGroup = new THREE.Group();
  tubGroup.position.set(0, 1.56, 0);
  activeGroup.add(tubGroup);

  const floorPlate = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 3.25), ironMat);
  floorPlate.position.y = -0.58;
  tubGroup.add(floorPlate);

  const sideWallGeo = new THREE.BoxGeometry(0.18, 1.35, 3.45);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(sideWallGeo, ironMat);
    wall.position.set(side * 1.18, 0.05, 0);
    wall.rotation.z = side * -0.18;
    wall.castShadow = true;
    tubGroup.add(wall);
  }
  const endWallGeo = new THREE.BoxGeometry(2.55, 1.35, 0.18);
  for (const end of [-1, 1]) {
    const wall = new THREE.Mesh(endWallGeo, ironMat);
    wall.position.set(0, 0.05, end * 1.66);
    wall.rotation.x = end * 0.14;
    wall.castShadow = true;
    tubGroup.add(wall);
  }

  // Rim frame & vertical reinforcing ribs
  const rimSideGeo = new THREE.BoxGeometry(0.24, 0.16, 3.85);
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(rimSideGeo, trimMat);
    rim.position.set(side * 1.32, 0.7, 0);
    tubGroup.add(rim);
  }
  const rimEndGeo = new THREE.BoxGeometry(2.86, 0.16, 0.24);
  for (const end of [-1, 1]) {
    const rim = new THREE.Mesh(rimEndGeo, trimMat);
    rim.position.set(0, 0.7, end * 1.82);
    tubGroup.add(rim);

    // Push bar handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), trimMat);
    handle.position.set(0, 0.35, end * 1.98);
    tubGroup.add(handle);
  }
  const strapGeo = new THREE.BoxGeometry(0.16, 1.32, 0.18);
  for (const sx of [-1.24, 1.24]) {
    for (const sz of [-0.95, 0, 0.95]) {
      const strap = new THREE.Mesh(strapGeo, trimMat);
      strap.position.set(sx, 0.05, sz);
      strap.rotation.z = sx > 0 ? -0.18 : 0.18;
      tubGroup.add(strap);
    }
  }

  // Armored Minecart exclusive steel plating, corner shields, ram bumpers & overhead roll cage
  if (armored) {
    const shieldSideGeo = new THREE.BoxGeometry(0.24, 1.08, 3.15);
    for (const side of [-1, 1]) {
      const shield = new THREE.Mesh(shieldSideGeo, plateMat);
      shield.position.set(side * 1.34, 0.05, 0);
      shield.rotation.z = side * -0.18;
      shield.castShadow = true;
      tubGroup.add(shield);
    }
    const ramEndGeo = new THREE.BoxGeometry(2.75, 0.85, 0.32);
    for (const end of [-1, 1]) {
      const ram = new THREE.Mesh(ramEndGeo, plateMat);
      ram.position.set(0, -0.05, end * 1.86);
      tubGroup.add(ram);
    }
    const cageArcGeo = new THREE.TorusGeometry(1.36, 0.12, 5, 10, Math.PI);
    for (const cz of [-1.05, 0, 1.05]) {
      const cageBar = new THREE.Mesh(cageArcGeo, plateMat);
      cageBar.position.set(0, 0.72, cz);
      tubGroup.add(cageBar);
    }
    const spineBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 2.75), plateMat);
    spineBar.position.set(0, 2.08, 0);
    tubGroup.add(spineBar);
  }

  // Heaped coal chunks filling & overflowing the minecart
  const crystalMeshes: THREE.Mesh[] = [];
  const coalMoundBase = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 0), coalMat.clone());
  coalMoundBase.position.set(0, 2.02, 0);
  coalMoundBase.scale.set(1.02, 0.65, 1.28);
  coalMoundBase.castShadow = true;
  activeGroup.add(coalMoundBase);
  crystalMeshes.push(coalMoundBase);

  const coalOffsets: [number, number, number, number, number][] = [
    [0, 2.58, 0.1, 0.85, 0.85],
    [-0.58, 2.38, 0.75, 0.66, 0.75],
    [0.62, 2.36, 0.65, 0.64, 0.75],
    [-0.52, 2.35, -0.78, 0.68, 0.78],
    [0.56, 2.4, -0.72, 0.65, 0.74],
    [0.04, 2.46, -1.05, 0.58, 0.68],
    [-0.08, 2.44, 1.05, 0.56, 0.65],
  ];
  for (const [x, y, z, s, sy] of coalOffsets) {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), coalMat.clone());
    chunk.position.set(x, y, z);
    chunk.scale.set(1, sy, 1);
    chunk.rotation.set(x * 0.7, z * 0.9, 0.35);
    chunk.castShadow = true;
    activeGroup.add(chunk);
    crystalMeshes.push(chunk);
  }

  const cracksMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.65, 0), crackMat);
  cracksMesh.position.y = 2.1;
  cracksMesh.scale.setScalar(0.01);
  cracksMesh.visible = false;
  activeGroup.add(cracksMesh);

  const glowPlane = new THREE.PlaneGeometry(armored ? 13 : 11, armored ? 13 : 11);
  glowPlane.rotateX(-Math.PI / 2);
  const glowDisc = new THREE.Mesh(
    glowPlane,
    new THREE.MeshBasicMaterial({
      color: armored ? 0xe0f2fe : 0xffffff,
      map: getGlowTexture(),
      transparent: true,
      opacity: armored ? 0.85 : 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  glowDisc.position.y = 0.08;
  activeGroup.add(glowDisc);

  // Destroyed state: scorched rails + tipped/shattered empty minecart shell
  const scorch = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.14, 8),
    makeMat(0x070709, 0.98, 0)
  );
  scorch.position.y = 0.07;
  craterGroup.add(scorch);

  const wreckedTub = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.05, 3.2), ironMat);
  wreckedTub.position.set(0.35, 0.52, 0);
  wreckedTub.rotation.set(0.18, 0.3, 1.18);
  craterGroup.add(wreckedTub);

  const looseWheel = new THREE.Mesh(wheelGeo, trimMat);
  looseWheel.position.set(-1.35, 0.22, 0.95);
  looseWheel.rotation.set(Math.PI / 2, 0.4, 0.2);
  craterGroup.add(looseWheel);

  return { group, crystalMeshes, glowDisc, cracksMesh, craterGroup, activeGroup, armored };
}

export function createCoinModel(): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.62, 0.62, 0.16, 8);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f8,
    roughness: 0.25,
    metalness: 0.78,
    emissive: 0xd4d4dc,
    emissiveIntensity: 0.38,
    flatShading: true,
  });
  return new THREE.Mesh(geo, mat);
}

export { createStageEnvironment, type StageEnvironmentController } from './mapEnvironments';
