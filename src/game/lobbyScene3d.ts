import * as THREE from 'three';
import { createTrainModel, TrainRig } from './models3d';

export interface LobbyDioramaController {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update: (dt: number, elapsed: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

interface SmokePuff {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
}

function createDarkPineTree(
  seed: number,
  trunkMat: THREE.Material,
  canopyMat: THREE.Material
): THREE.Group {
  const tree = new THREE.Group();
  const s = (n: number) => {
    const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Bottom-center grounded trunk
  const trunkH = 5.2 + s(1) * 2.2;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.44, trunkH, 5),
    trunkMat
  );
  trunk.position.y = trunkH * 0.5;
  trunk.rotation.z = (s(2) - 0.5) * 0.09;
  trunk.rotation.x = (s(3) - 0.5) * 0.06;
  tree.add(trunk);

  // Tiered low-poly pine/dead ash boughs (3 tiers + crooked dead limb)
  const tierSpecs = [
    { r: 1.85, h: 3.3, y: trunkH * 0.56, tilt: 0.06 },
    { r: 1.42, h: 3.1, y: trunkH * 0.8, tilt: -0.05 },
    { r: 0.95, h: 2.7, y: trunkH * 1.04, tilt: 0.04 },
  ];

  tierSpecs.forEach((tier, idx) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(tier.r * (0.88 + s(10 + idx) * 0.24), tier.h, 5),
      canopyMat
    );
    cone.position.y = tier.y;
    cone.rotation.y = s(20 + idx) * Math.PI * 2;
    cone.rotation.z = tier.tilt + (s(30 + idx) - 0.5) * 0.08;
    tree.add(cone);
  });

  // Crooked bare lower branch for eerie expressionist silhouette
  const branch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.11, 1.85, 4),
    trunkMat
  );
  const side = s(40) > 0.5 ? 1 : -1;
  branch.position.set(side * 0.68, trunkH * 0.44, 0.15);
  branch.rotation.z = -side * (0.9 + s(41) * 0.25);
  tree.add(branch);

  return tree;
}

export function createLobbyDiorama(
  width: number,
  height: number,
  lowDetail = false
): LobbyDioramaController {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.028);

  const aspect = Math.max(0.4, width / Math.max(1, height));
  const camera = new THREE.PerspectiveCamera(42, aspect, 0.2, 120);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  // Very subtle dark ambient so pitch-black mood holds
  const hemi = new THREE.HemisphereLight(0x3a3d48, 0x000000, 0.34);
  scene.add(hemi);

  // Pure black ground plane so floor blends seamlessly into #000000 void
  // while still catching the train's headlight cone & rail reflections
  const groundGeo = track(new THREE.PlaneGeometry(140, 140));
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x020203,
      roughness: 0.96,
      metalness: 0.04,
    })
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = 0;
  scene.add(ground);

  // =========================================================================
  // RIGHT SIDE: 3D In-Game Classic Train Facing Forward (+Z toward camera)
  // =========================================================================
  const trainRoot = new THREE.Group();
  scene.add(trainRoot);

  // Grounded 3D railway rails & ties directly under the train
  const railMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x626470,
      roughness: 0.36,
      metalness: 0.78,
      flatShading: true,
    })
  );
  const tieMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x16161a,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    })
  );
  const railGeo = track(new THREE.BoxGeometry(0.18, 0.14, 48));
  for (const rx of [-1.52, 1.52]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(rx, 0.07, -10);
    trainRoot.add(rail);
  }
  const tieGeo = track(new THREE.BoxGeometry(3.75, 0.1, 0.42));
  const tieCount = lowDetail ? 20 : 32;
  const tiesInst = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < tieCount; i++) {
    dummy.position.set(0, 0.05, 13 - i * 1.45);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    tiesInst.setMatrixAt(i, dummy.matrix);
  }
  tiesInst.instanceMatrix.needsUpdate = true;
  trainRoot.add(tiesInst);

  const trainRig: TrainRig = createTrainModel('classic');
  trainRig.group.position.set(0, 0.14, 1.8);
  // Align all trailing wagons along the straight track behind the locomotive
  for (const car of trainRig.cars) {
    car.group.position.set(0, 0, car.sOffset);
  }
  // Slightly accentuate the front headlight & beam on pitch black
  trainRig.headlight.intensity = 220;
  trainRig.headlight.distance = 44;
  trainRig.headlight.angle = Math.PI / 3.6;
  for (const bm of trainRig.beamMeshes) {
    const mat = bm.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.16;
  }
  trainRoot.add(trainRig.group);

  // Slight inward angle (~7 deg) so it reads dead-on front while revealing 3D depth
  trainRoot.rotation.y = -0.12;

  // Focused spotlight & rim light exclusively highlighting the 3D train on the right
  const trainKeySpot = new THREE.SpotLight(0xf2f4fa, 220, 42, 0.62, 0.72, 1.4);
  trainKeySpot.position.set(8.5, 9.5, 13.0);
  trainKeySpot.target = trainRig.group;
  scene.add(trainKeySpot);

  const trainRimSpot = new THREE.SpotLight(0xc8cedc, 160, 38, 0.65, 0.8, 1.3);
  trainRimSpot.position.set(11.0, 7.0, -7.5);
  trainRimSpot.target = trainRig.group;
  scene.add(trainRimSpot);

  // Subtle rising chimney smoke puffs from the locomotive stack
  const smokeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b3d46,
      roughness: 0.95,
      metalness: 0.02,
      transparent: true,
      opacity: 0.34,
      flatShading: true,
    })
  );
  const smokeGeo = track(new THREE.DodecahedronGeometry(0.45, 0));
  const smokePuffs: SmokePuff[] = [];
  const puffCount = lowDetail ? 5 : 9;
  for (let i = 0; i < puffCount; i++) {
    const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
    track(mesh.material as THREE.Material);
    trainRig.group.add(mesh);
    smokePuffs.push({
      mesh,
      age: (i / puffCount) * 2.4,
      maxAge: 2.2 + (i % 3) * 0.35,
      vx: ((i % 3) - 1) * 0.14,
      vy: 1.55 + (i % 2) * 0.25,
      vz: -1.6 - (i % 3) * 0.28,
      spin: ((i % 2 === 0 ? 1 : -1) * 0.8),
    });
  }

  // =========================================================================
  // LEFT SIDE: Very Darkened 3D Trees
  // =========================================================================
  const treesRoot = new THREE.Group();
  scene.add(treesRoot);

  const darkTrunkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: true,
    })
  );
  const darkCanopyMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x101014,
      roughness: 0.94,
      metalness: 0.03,
      flatShading: true,
    })
  );

  const treeSpecs: { x: number; z: number; scale: number; yaw: number }[] = [
    { x: -1.4, z: 3.4, scale: 1.05, yaw: 0.4 },
    { x: 0.6, z: 1.2, scale: 0.88, yaw: 1.8 },
    { x: -2.9, z: -0.8, scale: 1.28, yaw: 2.5 },
    { x: -0.2, z: -3.2, scale: 1.15, yaw: 4.1 },
    { x: 2.1, z: -2.0, scale: 0.82, yaw: 5.2 },
    { x: -4.1, z: 2.0, scale: 1.12, yaw: 1.1 },
    { x: -1.8, z: -5.8, scale: 1.35, yaw: 3.3 },
  ];

  const treeNodes: { group: THREE.Group; baseRotZ: number; phase: number }[] = [];
  treeSpecs.forEach((spec, idx) => {
    if (lowDetail && idx >= 5) return;
    const tree = createDarkPineTree(idx + 11, darkTrunkMat, darkCanopyMat);
    tree.position.set(spec.x, 0, spec.z);
    tree.scale.setScalar(spec.scale);
    tree.rotation.y = spec.yaw;
    treesRoot.add(tree);
    treeNodes.push({
      group: tree,
      baseRotZ: tree.rotation.z,
      phase: idx * 1.15,
    });
  });

  // Faint cold back-rim light ONLY so the dark trees keep a whisper of 3D edge on #000000
  const treesRimLight = new THREE.SpotLight(0x525866, 28, 36, 0.72, 0.9, 1.5);
  treesRimLight.position.set(-14.0, 9.5, -9.0);
  treesRimLight.target = treesRoot;
  scene.add(treesRimLight);

  const applyResponsiveFraming = () => {
    const a = camera.aspect;
    const portraitBoost = a < 1.0 ? (1.0 - a) * 6.5 : 0;
    const camZ = 15.6 + portraitBoost;
    camera.position.set(0, 3.35 + portraitBoost * 0.14, camZ);
    camera.lookAt(0, 2.25, -4.0);

    const halfW = (camZ - 1.5) * Math.tan((42 * Math.PI) / 360) * a;
    const trainX = THREE.MathUtils.clamp(halfW * 0.56, 1.35, 5.4);
    const treesX = -THREE.MathUtils.clamp(halfW * 0.68, 1.65, 6.8);

    trainRoot.position.set(trainX, 0, 0);
    trainKeySpot.position.set(trainX + 4.2, 9.5, 13.0);
    trainRimSpot.position.set(trainX + 5.8, 7.0, -7.5);

    treesRoot.position.set(treesX, 0, 0);
    treesRimLight.position.set(treesX - 7.5, 9.5, -9.0);
  };

  applyResponsiveFraming();

  const update = (dt: number, elapsed: number) => {
    // Rolling wheel cadence & gentle engine rumble
    for (const w of trainRig.wheels) {
      w.rotation.x += dt * 4.8;
    }
    trainRig.group.position.y = 0.14 + Math.sin(elapsed * 8.5) * 0.014;
    trainRig.group.rotation.z = Math.sin(elapsed * 3.1) * 0.004;

    // Subtle atmospheric headlight flicker
    const pulse = 0.94 + Math.sin(elapsed * 2.2) * 0.06;
    trainRig.headlight.intensity = 220 * pulse;

    // Rising chimney smoke particles
    for (const p of smokePuffs) {
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.age = 0;
      }
      const t = p.age / p.maxAge;
      p.mesh.position.set(
        p.vx * p.age + Math.sin(elapsed * 1.8 + p.spin) * 0.12 * t,
        5.55 + p.vy * p.age,
        -1.2 + p.vz * p.age
      );
      const sc = 0.65 + t * 2.2;
      p.mesh.scale.setScalar(sc);
      p.mesh.rotation.y += dt * p.spin;
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - t) * (1 - t) * 0.34;
    }

    // Subtle wind sway on darkened 3D trees
    for (const node of treeNodes) {
      node.group.rotation.z = node.baseRotZ + Math.sin(elapsed * 0.75 + node.phase) * 0.015;
    }
  };

  const resize = (w: number, h: number) => {
    camera.aspect = Math.max(0.4, w / Math.max(1, h));
    camera.updateProjectionMatrix();
    applyResponsiveFraming();
  };

  const dispose = () => {
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    });
    for (const d of disposables) d.dispose();
  };

  return { scene, camera, update, resize, dispose };
}
