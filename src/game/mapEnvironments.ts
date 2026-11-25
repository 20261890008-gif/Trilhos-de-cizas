import * as THREE from 'three';
import { groundHeightAt } from './stages';
import { StageConfig } from './types';

export interface StageEnvironmentController {
  dispose: () => void;
  update: (elapsed: number, dt: number) => void;
}

function makeEnvMat(
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

export function createStageEnvironment(
  scene: THREE.Scene,
  playRadius: number,
  stage: StageConfig,
  lowDetail = false
): StageEnvironmentController {
  const disposables: { dispose: () => void }[] = [];
  const addedObjects: THREE.Object3D[] = [];
  const updaters: ((elapsed: number, dt: number) => void)[] = [];

  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };
  const addObj = <T extends THREE.Object3D>(o: T): T => {
    scene.add(o);
    addedObjects.push(o);
    return o;
  };

  let seed = 4242 + stage.id * 173;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // =========================================================================
  // 1. PRIMARY BIOME ARCHITECTURE (13 DISTINCT BIOMES)
  // =========================================================================

  if (stage.theme === 'leviathan_sea') {
    const seaGeo = track(new THREE.PlaneGeometry(340, 340, 1, 1));
    seaGeo.rotateX(-Math.PI / 2);
    const seaMat = track(
      lowDetail
        ? new THREE.MeshLambertMaterial({
            color: stage.id === 36 ? 0x091624 : 0x0e2336,
            emissive: 0x071521,
            transparent: true,
            opacity: 0.85,
          })
        : new THREE.MeshStandardMaterial({
            color: stage.id === 36 ? 0x091624 : 0x0b1a28,
            roughness: 0.16,
            metalness: 0.76,
            emissive: 0x071521,
            emissiveIntensity: 0.55,
            transparent: true,
            opacity: 0.86,
          })
    );
    const seaMesh = addObj(new THREE.Mesh(seaGeo, seaMat));
    const seaBaseY = stage.terrainAmplitude > 0.5 ? -0.35 : -0.85;
    seaMesh.position.y = seaBaseY;

    const surfGeo = track(
      new THREE.RingGeometry(playRadius + 0.2, playRadius + 2.6, lowDetail ? 40 : 64)
    );
    surfGeo.rotateX(-Math.PI / 2);
    const surfMat = track(
      new THREE.MeshBasicMaterial({
        color: stage.id === 36 ? 0xbae6fd : 0x7dd3fc,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      })
    );
    const surfMesh = addObj(new THREE.Mesh(surfGeo, surfMat));
    surfMesh.position.y = seaBaseY + 0.12;

    const ribCount = lowDetail ? 18 : 34;
    const ribGeo = track(new THREE.TorusGeometry(6.5, 0.52, 5, 10, Math.PI * 0.72));
    const boneMat = track(makeEnvMat(0xcbd5e1, 0.7, 0.12, 0x1e293b, 0.18));
    const ribs = addObj(new THREE.InstancedMesh(ribGeo, boneMat, ribCount));
    for (let i = 0; i < ribCount; i++) {
      const a = (i / ribCount) * Math.PI * 2 + (rand() - 0.5) * 0.12;
      const d = playRadius + 4 + rand() * 34;
      const s = 0.85 + rand() * 1.15;
      dummy.position.set(Math.cos(a) * d, seaBaseY - 0.8, Math.sin(a) * d);
      dummy.rotation.set((rand() - 0.5) * 0.22, -a + Math.PI / 2, -0.35 + (rand() - 0.5) * 0.25);
      dummy.scale.set(s, s * (1.0 + rand() * 0.35), s);
      dummy.updateMatrix();
      ribs.setMatrixAt(i, dummy.matrix);
      const shade = 0.75 + rand() * 0.25;
      ribs.setColorAt(i, color.setRGB(shade * 0.9, shade * 0.95, shade));
    }
    ribs.instanceMatrix.needsUpdate = true;
    if (ribs.instanceColor) ribs.instanceColor.needsUpdate = true;
    ribs.computeBoundingSphere();

    const spineCount = lowDetail ? 14 : 24;
    const spineGeo = track(new THREE.ConeGeometry(2.1, 13.5, 5));
    spineGeo.translate(0, 6.0, 0);
    const spineMat = track(makeEnvMat(0x1b2b3a, 0.45, 0.52, 0x0f172a, 0.2));
    const spines = addObj(new THREE.InstancedMesh(spineGeo, spineMat, spineCount));
    for (let i = 0; i < spineCount; i++) {
      const a = (i / spineCount) * Math.PI * 2 + 0.18;
      const d = playRadius + 8 + rand() * 38;
      dummy.position.set(Math.cos(a) * d, seaBaseY - 1.2, Math.sin(a) * d);
      dummy.rotation.set(-0.28 + rand() * 0.56, a + Math.PI / 2, (rand() - 0.5) * 0.3);
      const sc = 0.75 + rand() * 1.05;
      dummy.scale.set(sc, sc * (0.9 + rand() * 0.5), sc * 0.45);
      dummy.updateMatrix();
      spines.setMatrixAt(i, dummy.matrix);
    }
    spines.instanceMatrix.needsUpdate = true;
    spines.computeBoundingSphere();

    const fishCount = lowDetail ? 32 : 64;
    const fishBodyGeo = track(new THREE.ConeGeometry(0.42, 1.95, 5));
    fishBodyGeo.rotateX(Math.PI / 2);
    const fishMat = track(makeEnvMat(0xe2e8f0, 0.25, 0.65, 0x38bdf8, 0.28));
    const fishMesh = addObj(new THREE.InstancedMesh(fishBodyGeo, fishMat, fishCount));
    fishMesh.frustumCulled = false;

    const fishTailGeo = track(new THREE.ConeGeometry(0.45, 0.85, 3));
    fishTailGeo.rotateX(-Math.PI / 2);
    fishTailGeo.translate(0, 0, -1.15);
    const fishTails = addObj(new THREE.InstancedMesh(fishTailGeo, fishMat, fishCount));
    fishTails.frustumCulled = false;

    const fishOrbitRadius: number[] = [];
    const fishAngleOffset: number[] = [];
    const fishSpeed: number[] = [];
    const fishScale: number[] = [];
    const fishDir: number[] = [];

    for (let i = 0; i < fishCount; i++) {
      const r = i < 16 ? playRadius - 2.5 + rand() * 5.5 : playRadius + 3.5 + rand() * 32;
      fishOrbitRadius.push(r);
      fishAngleOffset.push(rand() * Math.PI * 2);
      const dir = i % 3 === 0 ? -1 : 1;
      fishDir.push(dir);
      fishSpeed.push((0.14 + rand() * 0.22) * dir);
      fishScale.push(0.75 + rand() * 1.15);
      const cVal = 0.65 + rand() * 0.35;
      fishMesh.setColorAt(i, color.setRGB(cVal * 0.85, cVal * 0.95, cVal));
    }
    if (fishMesh.instanceColor) fishMesh.instanceColor.needsUpdate = true;

    updaters.push((elapsed) => {
      seaMesh.position.y = seaBaseY + Math.sin(elapsed * 1.35) * 0.14;
      surfMat.opacity = 0.16 + Math.sin(elapsed * 2.1) * 0.06;
      for (let i = 0; i < fishCount; i++) {
        const ang = fishAngleOffset[i] + elapsed * fishSpeed[i];
        const r = fishOrbitRadius[i] + Math.sin(elapsed * 1.4 + i) * 2.2;
        const hop = Math.max(-0.25, Math.sin(elapsed * 2.6 + i * 1.7)) * 0.95;
        const heading = fishDir[i] > 0 ? -ang : -ang + Math.PI;
        const sc = fishScale[i];

        dummy.position.set(Math.cos(ang) * r, seaBaseY + 0.18 + hop, Math.sin(ang) * r);
        dummy.rotation.set(
          Math.cos(elapsed * 2.6 + i * 1.7) * 0.18,
          heading + Math.sin(elapsed * 8.5 + i) * 0.12,
          0
        );
        dummy.scale.set(sc * 0.72, sc * 0.85, sc);
        dummy.updateMatrix();
        fishMesh.setMatrixAt(i, dummy.matrix);

        dummy.rotation.y += Math.sin(elapsed * 10 + i) * 0.34;
        dummy.updateMatrix();
        fishTails.setMatrixAt(i, dummy.matrix);
      }
      fishMesh.instanceMatrix.needsUpdate = true;
      fishTails.instanceMatrix.needsUpdate = true;
    });
  } else if (stage.theme === 'mining_cave') {
    // Subterranean mining cavern: perimeter jagged cave walls, wooden timber shoring frames,
    // hanging mine lanterns, gleaming ore crystal veins & ceiling stalactite crown
    const rockMat = track(makeEnvMat(0x211e1c, 0.96, 0.05));
    const timberMat = track(makeEnvMat(0x3b2b20, 0.92, 0.04));
    const oreMat = track(
      makeEnvMat(
        stage.id === 34 ? 0x67e8f9 : 0xeab308,
        0.25,
        0.72,
        stage.id === 34 ? 0x22d3ee : 0xf59e0b,
        0.48
      )
    );
    const lanternMat = track(new THREE.MeshBasicMaterial({ color: 0xfef08a }));

    // Cave rock perimeter slabs
    const wallCount = lowDetail ? 46 : 86;
    const wallGeo = track(new THREE.DodecahedronGeometry(4.4, 0));
    wallGeo.translate(0, 3.6, 0);
    const walls = addObj(new THREE.InstancedMesh(wallGeo, rockMat, wallCount));
    for (let i = 0; i < wallCount; i++) {
      const a = (i / wallCount) * Math.PI * 2 + (rand() - 0.5) * 0.08;
      const d = playRadius + 3.2 + rand() * 26;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const sc = 0.85 + rand() * 1.45;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.8, z);
      dummy.rotation.set(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4);
      dummy.scale.set(sc, sc * (1.45 + rand() * 1.25), sc);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
      const v = 0.65 + rand() * 0.4;
      walls.setColorAt(i, color.setRGB(v, v * 0.96, v * 0.92));
    }
    walls.instanceMatrix.needsUpdate = true;
    if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
    walls.computeBoundingSphere();

    // Wooden mine timber shoring portals (2 posts + angled braces + lintel cap + hanging lamp)
    const portalCount = lowDetail ? 14 : 22;
    const postGeo = track(new THREE.BoxGeometry(0.65, 11.5, 0.65));
    postGeo.translate(0, 5.75, 0);
    const lintelGeo = track(new THREE.BoxGeometry(6.8, 0.72, 0.75));
    lintelGeo.translate(0, 11.2, 0);
    const lanternGeo = track(new THREE.OctahedronGeometry(0.42, 0));

    const posts = addObj(new THREE.InstancedMesh(postGeo, timberMat, portalCount * 2));
    const lintels = addObj(new THREE.InstancedMesh(lintelGeo, timberMat, portalCount));
    const lanterns = addObj(new THREE.InstancedMesh(lanternGeo, lanternMat, portalCount));
    lanterns.frustumCulled = false;

    const lanternBases: { x: number; y: number; z: number; phase: number }[] = [];
    for (let i = 0; i < portalCount; i++) {
      const a = (i / portalCount) * Math.PI * 2;
      const d = playRadius + 2.5 + (i % 2) * 3.5;
      const cx = Math.cos(a) * d;
      const cz = Math.sin(a) * d;
      const gy = groundHeightAt(cx, cz, stage);
      const yaw = -a + Math.PI / 2;

      dummy.position.set(cx, gy - 0.3, cz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      lintels.setMatrixAt(i, dummy.matrix);

      for (const side of [-1, 1]) {
        const px = cx + Math.cos(yaw) * side * 2.7;
        const pz = cz - Math.sin(yaw) * side * 2.7;
        dummy.position.set(px, gy - 0.3, pz);
        dummy.rotation.set(0, yaw, side * 0.06);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        posts.setMatrixAt(i * 2 + (side < 0 ? 0 : 1), dummy.matrix);
      }
      lanternBases.push({ x: cx, y: gy + 9.8, z: cz, phase: i * 0.9 });
    }
    posts.instanceMatrix.needsUpdate = true;
    lintels.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();
    lintels.computeBoundingSphere();

    // Glowing ore crystal clusters jutting along the mine rim
    const oreCount = lowDetail ? 26 : 48;
    const oreGeo = track(new THREE.OctahedronGeometry(0.9, 0));
    const ores = addObj(new THREE.InstancedMesh(oreGeo, oreMat, oreCount));
    for (let i = 0; i < oreCount; i++) {
      const a = (i / oreCount) * Math.PI * 2 + rand() * 0.1;
      const d = playRadius + 1.8 + rand() * 14;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const y = groundHeightAt(x, z, stage) + 0.6 + rand() * 5.2;
      dummy.position.set(x, y, z);
      dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2);
      const sc = 0.65 + rand() * 0.95;
      dummy.scale.set(sc * 0.6, sc * 1.4, sc * 0.6);
      dummy.updateMatrix();
      ores.setMatrixAt(i, dummy.matrix);
    }
    ores.instanceMatrix.needsUpdate = true;
    ores.computeBoundingSphere();

    // High cavern ceiling rock vault arches + hanging stalactites (outside camera path r >= playRadius + 2)
    const stalCount = lowDetail ? 36 : 70;
    const stalGeo = track(new THREE.ConeGeometry(1.15, 7.8, 5));
    stalGeo.rotateX(Math.PI);
    const stalactites = addObj(new THREE.InstancedMesh(stalGeo, rockMat, stalCount));
    for (let i = 0; i < stalCount; i++) {
      const a = (i / stalCount) * Math.PI * 2 + rand() * 0.15;
      const d = playRadius + 4 + rand() * 30;
      const ceilY = stage.id === 34 ? 22 + rand() * 4 : 26 + rand() * 6;
      dummy.position.set(Math.cos(a) * d, ceilY, Math.sin(a) * d);
      dummy.rotation.set((rand() - 0.5) * 0.15, rand() * Math.PI, (rand() - 0.5) * 0.15);
      const sc = 0.7 + rand() * 1.1;
      dummy.scale.set(sc, sc * (0.9 + rand() * 0.6), sc);
      dummy.updateMatrix();
      stalactites.setMatrixAt(i, dummy.matrix);
    }
    stalactites.instanceMatrix.needsUpdate = true;
    stalactites.computeBoundingSphere();

    // Enclosed high dark cavern ceiling ring for deep mine immersion (above y=26, safe from camera)
    if (stage.id === 34) {
      const archGeo = track(new THREE.TorusGeometry(playRadius + 10, 4.2, 6, lowDetail ? 20 : 32));
      archGeo.rotateX(Math.PI / 2);
      const archRing = addObj(new THREE.Mesh(archGeo, rockMat));
      archRing.position.y = 25;
    }

    updaters.push((elapsed) => {
      for (let i = 0; i < portalCount; i++) {
        const b = lanternBases[i];
        const swing = Math.sin(elapsed * 2.1 + b.phase) * 0.25;
        dummy.position.set(b.x + swing, b.y, b.z);
        dummy.rotation.set(0, elapsed + b.phase, swing);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        lanterns.setMatrixAt(i, dummy.matrix);
      }
      lanterns.instanceMatrix.needsUpdate = true;
    });
  } else if (stage.theme === 'sawmill_yard') {
    // Timber sawmill: wooden shed frames, stacked pine log piles & giant spinning circular sawblades
    const woodMat = track(makeEnvMat(0x3a2e25, 0.9, 0.04));
    const darkBarkMat = track(makeEnvMat(0x211a15, 0.94, 0.02));
    const bladeMat = track(makeEnvMat(0xcbd5e1, 0.28, 0.88));
    const shedMat = track(makeEnvMat(0x272320, 0.85, 0.12));

    const logCount = lowDetail ? 44 : 84;
    const logGeo = track(new THREE.CylinderGeometry(0.65, 0.72, 6.2, 7));
    logGeo.rotateZ(Math.PI / 2);
    const logs = addObj(new THREE.InstancedMesh(logGeo, darkBarkMat, logCount));
    for (let i = 0; i < logCount; i++) {
      const pileIdx = Math.floor(i / 3);
      const tier = i % 3;
      const a = (pileIdx / Math.ceil(logCount / 3)) * Math.PI * 2 + 0.12;
      const d = playRadius + 4.5 + (pileIdx % 3) * 7.5;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const gy = groundHeightAt(x, z, stage);
      const offsetSide = tier === 0 ? -0.75 : tier === 1 ? 0.75 : 0;
      const offsetY = tier === 2 ? 1.75 : 0.68;
      dummy.position.set(
        x + Math.cos(a) * offsetSide,
        gy + offsetY,
        z + Math.sin(a) * offsetSide
      );
      dummy.rotation.set(0, a, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      logs.setMatrixAt(i, dummy.matrix);
    }
    logs.instanceMatrix.needsUpdate = true;
    logs.computeBoundingSphere();

    // Sawmill frames + spinning sawblades around rim
    const sawCount = lowDetail ? 10 : 16;
    const postGeo = track(new THREE.BoxGeometry(0.75, 7.5, 0.75));
    postGeo.translate(0, 3.75, 0);
    const roofGeo = track(new THREE.ConeGeometry(4.6, 3.2, 4));
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 8.9, 0);
    const bladeGeo = track(new THREE.CylinderGeometry(2.6, 2.6, 0.16, 16));
    bladeGeo.rotateX(Math.PI / 2);

    const posts = addObj(new THREE.InstancedMesh(postGeo, woodMat, sawCount * 2));
    const roofs = addObj(new THREE.InstancedMesh(roofGeo, shedMat, sawCount));
    const blades = addObj(new THREE.InstancedMesh(bladeGeo, bladeMat, sawCount));
    blades.frustumCulled = false;

    const sawData: { x: number; y: number; z: number; yaw: number }[] = [];
    for (let i = 0; i < sawCount; i++) {
      const a = (i / sawCount) * Math.PI * 2 + 0.08;
      const d = playRadius + 6.5 + (i % 2) * 8;
      const cx = Math.cos(a) * d;
      const cz = Math.sin(a) * d;
      const gy = groundHeightAt(cx, cz, stage);
      const yaw = -a + Math.PI / 2;

      dummy.position.set(cx, gy - 0.2, cz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      roofs.setMatrixAt(i, dummy.matrix);

      for (const s of [-1, 1]) {
        dummy.position.set(cx + Math.cos(yaw) * s * 2.4, gy - 0.2, cz - Math.sin(yaw) * s * 2.4);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        posts.setMatrixAt(i * 2 + (s < 0 ? 0 : 1), dummy.matrix);
      }
      sawData.push({ x: cx, y: gy + 3.1, z: cz, yaw });
    }
    posts.instanceMatrix.needsUpdate = true;
    roofs.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();
    roofs.computeBoundingSphere();

    updaters.push((elapsed) => {
      for (let i = 0; i < sawCount; i++) {
        const s = sawData[i];
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(0, s.yaw, elapsed * (i % 2 === 0 ? 4.8 : -4.8));
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        blades.setMatrixAt(i, dummy.matrix);
      }
      blades.instanceMatrix.needsUpdate = true;
    });
  } else if (stage.theme === 'viaduct_bridge') {
    // High elevated stone bridge parapets, plunging chasm piers & iron suspension lanterns
    const stoneMat = track(makeEnvMat(0x31353e, 0.86, 0.1));
    const darkPierMat = track(makeEnvMat(0x1b1e24, 0.92, 0.14));
    const cableMat = track(makeEnvMat(0x71717a, 0.4, 0.8));
    const lampMat = track(new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));

    const parapetCount = lowDetail ? 36 : 56;
    const blockGeo = track(new THREE.BoxGeometry(3.4, 2.3, 1.35));
    blockGeo.translate(0, 1.15, 0);
    const pierGeo = track(new THREE.BoxGeometry(2.6, 26, 2.6));
    pierGeo.translate(0, -13, 0);

    const parapets = addObj(new THREE.InstancedMesh(blockGeo, stoneMat, parapetCount));
    const piers = addObj(new THREE.InstancedMesh(pierGeo, darkPierMat, parapetCount));
    for (let i = 0; i < parapetCount; i++) {
      const a = (i / parapetCount) * Math.PI * 2;
      const d = playRadius + 1.8;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const gy = groundHeightAt(x, z, stage);
      // Leave rhythmic openings in Stage 7 (Trilho Partido)
      const skip = stage.id === 7 && i % 5 === 0;
      dummy.position.set(x, gy - 0.2, z);
      dummy.rotation.set(0, -a + Math.PI / 2, skip ? 0.25 : 0);
      dummy.scale.set(skip ? 0.5 : 1, skip ? 0.45 : 1, 1);
      dummy.updateMatrix();
      parapets.setMatrixAt(i, dummy.matrix);

      dummy.position.set(Math.cos(a) * (d + 2.4), gy, Math.sin(a) * (d + 2.4));
      dummy.rotation.set(0, -a, 0);
      dummy.scale.setScalar(i % 2 === 0 ? 1 : 0.75);
      dummy.updateMatrix();
      piers.setMatrixAt(i, dummy.matrix);
    }
    parapets.instanceMatrix.needsUpdate = true;
    piers.instanceMatrix.needsUpdate = true;
    parapets.computeBoundingSphere();
    piers.computeBoundingSphere();

    // Tall bridge lamp posts along the parapet
    const lampCount = lowDetail ? 14 : 24;
    const poleGeo = track(new THREE.CylinderGeometry(0.16, 0.22, 8.2, 6));
    poleGeo.translate(0, 4.1, 0);
    const bulbGeo = track(new THREE.SphereGeometry(0.45, 6, 6));
    bulbGeo.translate(0, 8.4, 0);
    const poles = addObj(new THREE.InstancedMesh(poleGeo, cableMat, lampCount));
    const bulbs = addObj(new THREE.InstancedMesh(bulbGeo, lampMat, lampCount));
    for (let i = 0; i < lampCount; i++) {
      const a = (i / lampCount) * Math.PI * 2;
      const x = Math.cos(a) * (playRadius + 2.2);
      const z = Math.sin(a) * (playRadius + 2.2);
      dummy.position.set(x, groundHeightAt(x, z, stage), z);
      dummy.rotation.set(0, a, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      bulbs.setMatrixAt(i, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    bulbs.computeBoundingSphere();
  } else if (stage.theme === 'collapsed_tunnel') {
    // Curved tunnel masonry arch ribs framing the rim + rubble boulders + pressurized steam pipes
    const brickMat = track(makeEnvMat(0x232329, 0.9, 0.14));
    const pipeMat = track(makeEnvMat(0x4b5563, 0.42, 0.75));
    const rubbleMat = track(makeEnvMat(0x2e2e36, 0.95, 0.05));
    const warnMat = track(new THREE.MeshBasicMaterial({ color: stage.id === 30 ? 0xfb923c : 0xe4e4ec }));

    const archCount = lowDetail ? 16 : 26;
    const archGeo = track(new THREE.TorusGeometry(6.2, 1.15, 6, 12, Math.PI));
    const arches = addObj(new THREE.InstancedMesh(archGeo, brickMat, archCount));
    const lampGeo = track(new THREE.BoxGeometry(0.65, 0.4, 0.45));
    lampGeo.translate(0, 6.4, 0);
    const lamps = addObj(new THREE.InstancedMesh(lampGeo, warnMat, archCount));

    for (let i = 0; i < archCount; i++) {
      const a = (i / archCount) * Math.PI * 2;
      const d = playRadius + 6.5 + (i % 2) * 6;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const gy = groundHeightAt(x, z, stage);
      const tilt = stage.id === 15 ? (rand() - 0.5) * 0.35 : 0;
      dummy.position.set(x, gy - 0.5, z);
      dummy.rotation.set(tilt, -a, tilt * 0.6);
      dummy.scale.set(1.2, 1.35 + (i % 3) * 0.25, 1.2);
      dummy.updateMatrix();
      arches.setMatrixAt(i, dummy.matrix);
      lamps.setMatrixAt(i, dummy.matrix);
    }
    arches.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;
    arches.computeBoundingSphere();
    lamps.computeBoundingSphere();

    // Collapsed boulder piles & thick tunnel pipe rings
    const rockCount = lowDetail ? 36 : 64;
    const rockGeo = track(new THREE.DodecahedronGeometry(2.6, 0));
    const rocks = addObj(new THREE.InstancedMesh(rockGeo, rubbleMat, rockCount));
    for (let i = 0; i < rockCount; i++) {
      const a = (i / rockCount) * Math.PI * 2 + rand() * 0.1;
      const d = playRadius + 3 + rand() * 24;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const sc = 0.7 + rand() * 1.2;
      dummy.position.set(x, groundHeightAt(x, z, stage) + sc * 0.7, z);
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      dummy.scale.set(sc * 1.1, sc * 0.85, sc);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.computeBoundingSphere();

    // Horizontal iron steam pipes bordering the tunnel rim
    const pipeRingGeo = track(new THREE.TorusGeometry(playRadius + 3.2, 0.48, 6, lowDetail ? 24 : 42));
    pipeRingGeo.rotateX(Math.PI / 2);
    const pipeRing = addObj(new THREE.Mesh(pipeRingGeo, pipeMat));
    pipeRing.position.y = 3.4;
  } else if (stage.theme === 'bunker_fortress') {
    // Brutalist slanted concrete bunker blast walls, embrasure turrets & sweeping searchlights
    const wallMat = track(makeEnvMat(0x272a30, 0.88, 0.18));
    const steelMat = track(makeEnvMat(0x14161a, 0.45, 0.72));
    const beamMat = track(
      new THREE.MeshBasicMaterial({
        color: stage.isBoss ? 0xfca5a5 : 0xf4f4f8,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );

    const panelCount = lowDetail ? 22 : 36;
    const panelGeo = track(new THREE.BoxGeometry(8.5, 11.5, 3.2));
    panelGeo.translate(0, 5.5, 0);
    const panels = addObj(new THREE.InstancedMesh(panelGeo, wallMat, panelCount));

    const gateGeo = track(new THREE.BoxGeometry(5.2, 7.5, 3.6));
    gateGeo.translate(0, 3.75, 0);
    const gates = addObj(new THREE.InstancedMesh(gateGeo, steelMat, 8));

    for (let i = 0; i < panelCount; i++) {
      const a = (i / panelCount) * Math.PI * 2;
      const d = playRadius + 4.5 + (i % 2) * 4;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.5, z);
      dummy.rotation.set(-0.18, -a + Math.PI / 2, 0);
      dummy.scale.set(1, 0.85 + (i % 3) * 0.25, 1);
      dummy.updateMatrix();
      panels.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const d = playRadius + 3.2;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.2, z);
      dummy.rotation.set(0, -a + Math.PI / 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      gates.setMatrixAt(i, dummy.matrix);
    }
    panels.instanceMatrix.needsUpdate = true;
    gates.instanceMatrix.needsUpdate = true;
    panels.computeBoundingSphere();
    gates.computeBoundingSphere();

    // Sweeping searchlight cones mounted along perimeter towers
    const beamCount = lowDetail ? 4 : 8;
    const coneGeo = track(new THREE.ConeGeometry(4.5, 34, 12, 1, true));
    coneGeo.translate(0, -17, 0);
    coneGeo.rotateX(Math.PI / 2);
    const beams = addObj(new THREE.InstancedMesh(coneGeo, beamMat, beamCount));
    beams.frustumCulled = false;

    updaters.push((elapsed) => {
      for (let i = 0; i < beamCount; i++) {
        const a = (i / beamCount) * Math.PI * 2;
        const d = playRadius + 4.5;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        dummy.position.set(x, groundHeightAt(x, z, stage) + 11.5, z);
        const sweep = Math.sin(elapsed * (0.7 + (i % 3) * 0.2) + i * 1.4) * 0.55;
        dummy.rotation.set(-0.38, -a - Math.PI / 2 + sweep, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        beams.setMatrixAt(i, dummy.matrix);
      }
      beams.instanceMatrix.needsUpdate = true;
    });
  } else if (stage.theme === 'shipyard_grave') {
    // Shallow dark marsh / tidewater + beached ship skeletons, shipyard gantry cranes & swamp reeds
    const waterGeo = track(new THREE.PlaneGeometry(340, 340, 1, 1));
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = track(
      makeEnvMat(stage.id === 29 ? 0x0b161b : 0x0d1514, 0.22, 0.65, 0x061012, 0.35)
    );
    waterMat.transparent = true;
    waterMat.opacity = 0.84;
    const waterMesh = addObj(new THREE.Mesh(waterGeo, waterMat));
    waterMesh.position.y = stage.id === 25 ? -0.65 : -0.35;

    const hullWoodMat = track(makeEnvMat(0x28211b, 0.9, 0.08));
    const rustIronMat = track(makeEnvMat(0x3a2b25, 0.65, 0.52));
    const reedMat = track(makeEnvMat(0x3f473e, 0.88, 0.02));
    const wispMat = track(new THREE.MeshBasicMaterial({ color: 0xa7f3d0 }));

    // Skeletal ship hull ribs curving out of the mire (especially prominent in Estaleiro Morto 29)
    const hullRibCount = lowDetail ? 16 : 30;
    const hullRibGeo = track(new THREE.TorusGeometry(4.8, 0.36, 5, 10, Math.PI * 0.95));
    hullRibGeo.rotateX(Math.PI);
    const hullRibs = addObj(new THREE.InstancedMesh(hullRibGeo, hullWoodMat, hullRibCount));
    for (let i = 0; i < hullRibCount; i++) {
      const shipIdx = Math.floor(i / 5);
      const localRib = i % 5;
      const a = (shipIdx / Math.ceil(hullRibCount / 5)) * Math.PI * 2 + 0.3;
      const d = playRadius + 9 + (shipIdx % 2) * 14;
      const cx = Math.cos(a) * d + Math.cos(a + 1.2) * (localRib - 2) * 2.4;
      const cz = Math.sin(a) * d + Math.sin(a + 1.2) * (localRib - 2) * 2.4;
      dummy.position.set(cx, 1.4, cz);
      dummy.rotation.set(0.22, a + 0.5, 0.32);
      const taper = 1 - Math.abs(localRib - 2) * 0.18;
      dummy.scale.set(taper, taper * 1.15, 1);
      dummy.updateMatrix();
      hullRibs.setMatrixAt(i, dummy.matrix);
    }
    hullRibs.instanceMatrix.needsUpdate = true;
    hullRibs.computeBoundingSphere();

    // Tall shipyard cranes & reeds
    const reedCount = lowDetail ? 48 : 96;
    const reedGeo = track(new THREE.ConeGeometry(0.22, 4.2, 4));
    reedGeo.translate(0, 2.1, 0);
    const reeds = addObj(new THREE.InstancedMesh(reedGeo, reedMat, reedCount));
    for (let i = 0; i < reedCount; i++) {
      const a = (i / reedCount) * Math.PI * 2 + rand() * 0.15;
      const d = playRadius + 1.5 + rand() * 28;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.3, z);
      dummy.rotation.set((rand() - 0.5) * 0.28, rand() * Math.PI, (rand() - 0.5) * 0.28);
      const sc = 0.7 + rand() * 0.9;
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      reeds.setMatrixAt(i, dummy.matrix);
    }
    reeds.instanceMatrix.needsUpdate = true;
    reeds.computeBoundingSphere();

    // Shipyard tower cranes on 29 & 16
    const craneCount = stage.id === 29 ? 8 : 4;
    const mastGeo = track(new THREE.BoxGeometry(1.1, 18, 1.1));
    mastGeo.translate(0, 9, 0);
    const boomGeo = track(new THREE.BoxGeometry(1.0, 0.85, 14));
    boomGeo.translate(0, 17.5, 5);
    const masts = addObj(new THREE.InstancedMesh(mastGeo, rustIronMat, craneCount));
    const booms = addObj(new THREE.InstancedMesh(boomGeo, rustIronMat, craneCount));
    for (let i = 0; i < craneCount; i++) {
      const a = (i / craneCount) * Math.PI * 2 + 0.15;
      const d = playRadius + 7 + (i % 2) * 10;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.4, z);
      dummy.rotation.set(0, -a + Math.PI / 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      masts.setMatrixAt(i, dummy.matrix);
      booms.setMatrixAt(i, dummy.matrix);
    }
    masts.instanceMatrix.needsUpdate = true;
    booms.instanceMatrix.needsUpdate = true;
    masts.computeBoundingSphere();
    booms.computeBoundingSphere();

    // Drifting marsh willow-wisps
    const wispCount = lowDetail ? 14 : 26;
    const wispGeo = track(new THREE.SphereGeometry(0.26, 6, 6));
    const wisps = addObj(new THREE.InstancedMesh(wispGeo, wispMat, wispCount));
    wisps.frustumCulled = false;

    updaters.push((elapsed) => {
      waterMesh.position.y = (stage.id === 25 ? -0.65 : -0.35) + Math.sin(elapsed * 1.1) * 0.08;
      for (let i = 0; i < wispCount; i++) {
        const a = (i / wispCount) * Math.PI * 2 + elapsed * 0.08;
        const d = playRadius + 3 + (i % 5) * 4.5;
        dummy.position.set(
          Math.cos(a) * d,
          1.4 + Math.sin(elapsed * 1.8 + i * 1.3) * 0.9,
          Math.sin(a) * d
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.75 + Math.sin(elapsed * 3.2 + i) * 0.35);
        dummy.updateMatrix();
        wisps.setMatrixAt(i, dummy.matrix);
      }
      wisps.instanceMatrix.needsUpdate = true;
    });
  } else if (stage.theme === 'chalk_void') {
    // Stark Caligari-style skewed expressionist monoliths, bone ribs, & jagged rail-teeth
    const isBoneRib = stage.id === 28;
    const isSkewed = stage.id === 32;
    const isSawTeeth = stage.id === 26;
    const monoMat = track(
      makeEnvMat(stage.id === 31 ? 0x101014 : 0xd4d4dc, 0.78, 0.16)
    );
    const darkTrimMat = track(makeEnvMat(0x18181d, 0.65, 0.38));

    const monoCount = lowDetail ? 30 : 54;
    const monoGeo = track(
      isBoneRib
        ? new THREE.TorusGeometry(6.8, 0.62, 5, 10, Math.PI * 0.68)
        : isSawTeeth
        ? new THREE.ConeGeometry(2.1, 18, 4)
        : new THREE.BoxGeometry(2.2, 16, 2.2)
    );
    if (!isBoneRib) monoGeo.translate(0, 8, 0);

    const monos = addObj(new THREE.InstancedMesh(monoGeo, monoMat, monoCount));
    const trimGeo = track(new THREE.BoxGeometry(2.5, 0.65, 2.5));
    trimGeo.translate(0, 13.5, 0);
    const trims = addObj(new THREE.InstancedMesh(trimGeo, darkTrimMat, monoCount));

    for (let i = 0; i < monoCount; i++) {
      const a = (i / monoCount) * Math.PI * 2 + (rand() - 0.5) * 0.1;
      const d = playRadius + 3.5 + rand() * 34;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const gy = groundHeightAt(x, z, stage);
      const tilt = isSkewed ? (i % 2 === 0 ? 0.34 : -0.34) : (rand() - 0.5) * 0.22;
      const sc = 0.75 + rand() * 0.95;

      dummy.position.set(x, gy - 0.5, z);
      dummy.rotation.set(tilt * 0.5, -a + Math.PI / 2, tilt);
      dummy.scale.set(sc, sc * (0.85 + rand() * 0.65), sc);
      dummy.updateMatrix();
      monos.setMatrixAt(i, dummy.matrix);
      trims.setMatrixAt(i, dummy.matrix);

      const shade = stage.id === 31 ? 0.55 + rand() * 0.25 : 0.7 + rand() * 0.3;
      monos.setColorAt(i, color.setRGB(shade, shade, shade));
    }
    monos.instanceMatrix.needsUpdate = true;
    trims.instanceMatrix.needsUpdate = true;
    if (monos.instanceColor) monos.instanceColor.needsUpdate = true;
    monos.computeBoundingSphere();
    trims.computeBoundingSphere();

    // Giant looming eclipse ring on Horizonte Negro (31)
    if (stage.id === 31) {
      const eclipseRing = addObj(
        new THREE.Mesh(
          track(new THREE.RingGeometry(15, 16.4, 48)),
          track(new THREE.MeshBasicMaterial({ color: 0xf4f4f8, side: THREE.DoubleSide }))
        )
      );
      eclipseRing.position.set(0, 26, -85);
      const eclipseCore = addObj(
        new THREE.Mesh(
          track(new THREE.CircleGeometry(14.8, 48)),
          track(new THREE.MeshBasicMaterial({ color: 0x050507, side: THREE.DoubleSide }))
        )
      );
      eclipseCore.position.set(0, 26, -85.2);
    }
  } else if (stage.theme === 'industrial_furnace') {
    const stackCount = lowDetail ? 36 : 68;
    const stackGeo = track(new THREE.CylinderGeometry(1.1, 2.0, 18, 7));
    stackGeo.translate(0, 9, 0);
    const stackMat = track(makeEnvMat(0x1a181c, 0.84, 0.35));
    const stacks = addObj(new THREE.InstancedMesh(stackGeo, stackMat, stackCount));

    const capGeo = track(new THREE.CylinderGeometry(1.22, 1.22, 0.55, 7));
    capGeo.translate(0, 18.1, 0);
    const glowMat = track(
      new THREE.MeshBasicMaterial({ color: stage.id === 18 ? 0xfbbf24 : 0xea580c })
    );
    const caps = addObj(new THREE.InstancedMesh(capGeo, glowMat, stackCount));

    const tankCount = lowDetail ? 22 : 44;
    const tankGeo = track(new THREE.CylinderGeometry(1.75, 1.75, 7.2, 8));
    tankGeo.rotateZ(Math.PI / 2);
    tankGeo.translate(0, 1.85, 0);
    const tankMat = track(makeEnvMat(0x2e2e36, 0.5, 0.62));
    const tanks = addObj(new THREE.InstancedMesh(tankGeo, tankMat, tankCount));

    for (let i = 0; i < stackCount; i++) {
      const angle = (i / stackCount) * Math.PI * 2 + (rand() - 0.5) * 0.1;
      const dist = playRadius + 5 + rand() * 38;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const sc = 0.75 + rand() * 0.9;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.4, z);
      dummy.rotation.set((rand() - 0.5) * 0.08, rand() * Math.PI, (rand() - 0.5) * 0.08);
      dummy.scale.set(sc, sc * (0.85 + rand() * 0.55), sc);
      dummy.updateMatrix();
      stacks.setMatrixAt(i, dummy.matrix);
      caps.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < tankCount; i++) {
      const angle = (i / tankCount) * Math.PI * 2 + 0.2;
      const dist = playRadius + 3 + rand() * 24;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.2, z);
      dummy.rotation.set(0, angle + Math.PI / 2, 0);
      dummy.scale.setScalar(0.9 + rand() * 0.6);
      dummy.updateMatrix();
      tanks.setMatrixAt(i, dummy.matrix);
    }
    stacks.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    tanks.instanceMatrix.needsUpdate = true;
    stacks.computeBoundingSphere();
    caps.computeBoundingSphere();
    tanks.computeBoundingSphere();

    // Enclosed steel boiler hall truss ring on Stage 9 (Galpao das Caldeiras)
    if (stage.id === 9) {
      const trussRingGeo = track(
        new THREE.TorusGeometry(playRadius + 4, 0.75, 4, lowDetail ? 16 : 28)
      );
      trussRingGeo.rotateX(Math.PI / 2);
      const trussRing = addObj(new THREE.Mesh(trussRingGeo, tankMat));
      trussRing.position.y = 14.5;
    }
  } else if (stage.theme === 'quarry_canyon') {
    const isSlagHeaps = stage.id === 23;
    const isIronRidge = stage.id === 13;
    const rockCount = lowDetail ? 64 : 120;
    const rockGeo = track(
      isSlagHeaps
        ? new THREE.ConeGeometry(4.2, 9.5, 6)
        : new THREE.DodecahedronGeometry(3.2, 0)
    );
    rockGeo.translate(0, isSlagHeaps ? 4.4 : 2.4, 0);
    const rockMat = track(
      makeEnvMat(isIronRidge ? 0x382b27 : 0x2c2c34, 0.94, isIronRidge ? 0.28 : 0.04)
    );
    const rocks = addObj(new THREE.InstancedMesh(rockGeo, rockMat, rockCount));

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + (rand() - 0.5) * 0.14;
      const dist = playRadius + 3 + rand() * 42;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const sc = 0.8 + rand() * 1.45;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.6, z);
      dummy.rotation.set(
        isSlagHeaps ? 0 : rand() * 0.5,
        rand() * Math.PI * 2,
        isSlagHeaps ? 0 : rand() * 0.5
      );
      dummy.scale.set(sc, sc * (1.2 + rand() * 1.4), sc);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      const v = 0.72 + rand() * 0.4;
      rocks.setColorAt(i, color.setRGB(v, v, v));
    }
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    rocks.computeBoundingSphere();
  } else if (stage.theme === 'station_ruins') {
    const pillarCount = lowDetail ? 40 : 76;
    const pillarGeo = track(new THREE.BoxGeometry(2.4, 9.5, 2.4));
    pillarGeo.translate(0, 4.75, 0);
    const pillarMat = track(makeEnvMat(0x2b2b33, 0.85, 0.14));
    const pillars = addObj(new THREE.InstancedMesh(pillarGeo, pillarMat, pillarCount));

    const poleCount = lowDetail ? 20 : 38;
    const poleGeo = track(new THREE.CylinderGeometry(0.18, 0.24, 9.2, 6));
    poleGeo.translate(0, 4.6, 0);
    const lampMat = track(
      new THREE.MeshBasicMaterial({ color: stage.id === 35 ? 0xfdba74 : 0xd4d4dc })
    );
    const lampGeo = track(new THREE.BoxGeometry(0.95, 0.35, 0.35));
    lampGeo.translate(0.45, 8.7, 0);
    const poles = addObj(new THREE.InstancedMesh(poleGeo, pillarMat, poleCount));
    const lamps = addObj(new THREE.InstancedMesh(lampGeo, lampMat, poleCount));

    for (let i = 0; i < pillarCount; i++) {
      const a = (i / pillarCount) * Math.PI * 2 + (rand() - 0.5) * 0.08;
      const d = playRadius + 4 + rand() * 36;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.4, z);
      dummy.rotation.set((rand() - 0.5) * 0.15, a, (rand() - 0.5) * 0.15);
      dummy.scale.set(1, 0.55 + rand() * 0.85, 1);
      dummy.updateMatrix();
      pillars.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < poleCount; i++) {
      const a = (i / poleCount) * Math.PI * 2;
      const d = playRadius + 2.5 + rand() * 14;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.2, z);
      dummy.rotation.set(0, a + Math.PI / 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      lamps.setMatrixAt(i, dummy.matrix);
    }
    pillars.instanceMatrix.needsUpdate = true;
    poles.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;
    pillars.computeBoundingSphere();
    poles.computeBoundingSphere();
    lamps.computeBoundingSphere();

    // Station canopy roofs on Stage 11 (Estação Quebrada)
    if (stage.id === 11) {
      const roofCount = 10;
      const roofGeo = track(new THREE.BoxGeometry(8.5, 0.35, 4.2));
      roofGeo.translate(0, 7.6, 0);
      const roofs = addObj(new THREE.InstancedMesh(roofGeo, pillarMat, roofCount));
      for (let i = 0; i < roofCount; i++) {
        const a = (i / roofCount) * Math.PI * 2;
        const x = Math.cos(a) * (playRadius + 5.5);
        const z = Math.sin(a) * (playRadius + 5.5);
        dummy.position.set(x, groundHeightAt(x, z, stage), z);
        dummy.rotation.set(0.18, -a + Math.PI / 2, 0.08);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        roofs.setMatrixAt(i, dummy.matrix);
      }
      roofs.instanceMatrix.needsUpdate = true;
      roofs.computeBoundingSphere();
    }
  } else if (stage.theme === 'cathedral_shadow') {
    const spireCount = lowDetail ? 46 : 88;
    const spireGeo = track(new THREE.ConeGeometry(1.75, 17, 4));
    spireGeo.translate(0, 8.5, 0);
    const spireMat = track(makeEnvMat(0x16161b, 0.72, 0.35));
    const spires = addObj(new THREE.InstancedMesh(spireGeo, spireMat, spireCount));

    const orbCount = lowDetail ? 18 : 34;
    const orbGeo = track(new THREE.OctahedronGeometry(0.45, 0));
    orbGeo.translate(0, 11.2, 0);
    const orbMat = track(new THREE.MeshBasicMaterial({ color: 0xe4e4ec }));
    const orbs = addObj(new THREE.InstancedMesh(orbGeo, orbMat, orbCount));
    orbs.frustumCulled = false;

    const orbPositions: { x: number; y: number; z: number; yaw: number }[] = [];
    for (let i = 0; i < spireCount; i++) {
      const a = (i / spireCount) * Math.PI * 2 + (rand() - 0.5) * 0.1;
      const d = playRadius + 4 + rand() * 38;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const gy = groundHeightAt(x, z, stage) - 0.4;
      const sc = 0.8 + rand() * 0.9;
      dummy.position.set(x, gy, z);
      dummy.rotation.set((rand() - 0.5) * 0.18, a, (rand() - 0.5) * 0.18);
      dummy.scale.set(sc, sc * (0.9 + rand() * 0.6), sc);
      dummy.updateMatrix();
      spires.setMatrixAt(i, dummy.matrix);
      if (i < orbCount) {
        orbPositions.push({ x, y: gy, z, yaw: a });
      }
    }
    spires.instanceMatrix.needsUpdate = true;
    spires.computeBoundingSphere();

    // Gothic flying-buttress ring overhead in Stage 27 (Catedral do Carvão)
    if (stage.id === 27) {
      const roseGeo = track(
        new THREE.TorusGeometry(playRadius + 3.5, 0.55, 5, lowDetail ? 20 : 36)
      );
      roseGeo.rotateX(Math.PI / 2);
      const roseRing = addObj(new THREE.Mesh(roseGeo, spireMat));
      roseRing.position.y = 18;
    }

      updaters.push((elapsed) => {
        for (let i = 0; i < orbPositions.length; i++) {
          const op = orbPositions[i];
          dummy.position.set(op.x, op.y + Math.sin(elapsed * 2.2 + i) * 0.65, op.z);
          dummy.rotation.set(0, op.yaw + elapsed * 1.4, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          orbs.setMatrixAt(i, dummy.matrix);
        }
        orbs.instanceMatrix.needsUpdate = true;
      });
    } else if (stage.theme === 'clockwork_foundry') {
      // Towering bronze-slate foundry pillars + giant rotating perimeter cogwheels + swinging pendulum beams
      const wheelCount = lowDetail ? 10 : 18;
      const rimGeo = track(new THREE.TorusGeometry(4.2, 0.55, 5, 12));
      const spokeGeo = track(new THREE.BoxGeometry(8.2, 0.6, 0.5));
      const pillarGeo = track(new THREE.CylinderGeometry(1.1, 1.45, 15, 7));
      pillarGeo.translate(0, 7.5, 0);

      const brassMat = track(makeEnvMat(0x2d241b, 0.52, 0.72));
      const darkSteelMat = track(makeEnvMat(0x16161b, 0.6, 0.55));
      const wheels = addObj(new THREE.InstancedMesh(rimGeo, brassMat, wheelCount));
      const spokes = addObj(new THREE.InstancedMesh(spokeGeo, darkSteelMat, wheelCount));
      const pillars = addObj(new THREE.InstancedMesh(pillarGeo, darkSteelMat, wheelCount));
      wheels.frustumCulled = false;
      spokes.frustumCulled = false;

      const wheelMeta: { x: number; y: number; z: number; yaw: number; dir: number; scale: number }[] = [];
      for (let i = 0; i < wheelCount; i++) {
        const a = (i / wheelCount) * Math.PI * 2 + (rand() - 0.5) * 0.08;
        const d = playRadius + 5.5 + (i % 3) * 7.5;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const gy = groundHeightAt(x, z, stage);
        const sc = 0.78 + (i % 4) * 0.22;

        dummy.position.set(x, gy - 0.5, z);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        pillars.setMatrixAt(i, dummy.matrix);

        wheelMeta.push({
          x,
          y: gy + 9.2 * sc,
          z,
          yaw: -a + Math.PI / 2,
          dir: i % 2 === 0 ? 1 : -1,
          scale: sc,
        });
      }
      pillars.instanceMatrix.needsUpdate = true;
      pillars.computeBoundingSphere();

      updaters.push((elapsed) => {
        for (let i = 0; i < wheelMeta.length; i++) {
          const w = wheelMeta[i];
          dummy.position.set(w.x, w.y, w.z);
          dummy.rotation.set(0, w.yaw, elapsed * 0.55 * w.dir);
          dummy.scale.setScalar(w.scale);
          dummy.updateMatrix();
          wheels.setMatrixAt(i, dummy.matrix);
          spokes.setMatrixAt(i, dummy.matrix);
        }
        wheels.instanceMatrix.needsUpdate = true;
        spokes.instanceMatrix.needsUpdate = true;
      });
    } else if (stage.theme === 'salt_flats') {
      // Bleached crystalline salt spires and translucent mineral shards around open pale flats
      const spireCount = lowDetail ? 60 : 120;
      const spireGeo = track(new THREE.ConeGeometry(1.4, 9.5, 5));
      spireGeo.translate(0, 4.75, 0);
      const crystalGeo = track(new THREE.OctahedronGeometry(1.2, 0));
      crystalGeo.translate(0, 2.2, 0);

      const saltMat = track(makeEnvMat(0xc4c4cc, 0.72, 0.08, 0x26262c, 0.14));
      const shardMat = track(makeEnvMat(0xe5e5ed, 0.35, 0.18));
      const spires = addObj(new THREE.InstancedMesh(spireGeo, saltMat, spireCount));
      const crystals = addObj(new THREE.InstancedMesh(crystalGeo, shardMat, lowDetail ? 26 : 52));

      for (let i = 0; i < spireCount; i++) {
        const a = (i / spireCount) * Math.PI * 2 + (rand() - 0.5) * 0.14;
        const d = playRadius + 3.5 + rand() * 44;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const gy = groundHeightAt(x, z, stage) - 0.35;
        const sc = 0.75 + rand() * 1.15;

        dummy.position.set(x, gy, z);
        dummy.rotation.set((rand() - 0.5) * 0.35, rand() * Math.PI * 2, (rand() - 0.5) * 0.35);
        dummy.scale.set(sc, sc * (0.85 + rand() * 0.75), sc);
        dummy.updateMatrix();
        spires.setMatrixAt(i, dummy.matrix);

        if (i < crystals.count) {
          dummy.position.set(x * 0.94, gy + 0.2, z * 0.94);
          dummy.rotation.set(rand() * 0.5, rand() * Math.PI, rand() * 0.5);
          dummy.scale.set(0.9 + rand() * 0.9, 1.4 + rand() * 1.1, 0.9 + rand() * 0.9);
          dummy.updateMatrix();
          crystals.setMatrixAt(i, dummy.matrix);
        }
      }
      spires.instanceMatrix.needsUpdate = true;
      crystals.instanceMatrix.needsUpdate = true;
      spires.computeBoundingSphere();
      crystals.computeBoundingSphere();
    } else if (stage.theme === 'iron_forest') {
      // Angular forged black-iron trees with jagged branches & gently swaying suspended foundry lanterns
      const treeCount = lowDetail ? 68 : 132;
      const trunkGeo = track(new THREE.CylinderGeometry(0.32, 0.68, 9.2, 4));
      trunkGeo.translate(0, 4.6, 0);
      const boughGeo = track(new THREE.BoxGeometry(4.8, 0.35, 0.35));
      boughGeo.translate(0, 7.2, 0);
      const ironMat = track(makeEnvMat(0x141418, 0.45, 0.78));

      const trunks = addObj(new THREE.InstancedMesh(trunkGeo, ironMat, treeCount));
      const boughs = addObj(new THREE.InstancedMesh(boughGeo, ironMat, treeCount));

      const lanternCount = lowDetail ? 14 : 28;
      const lanternGeo = track(new THREE.OctahedronGeometry(0.42, 0));
      const lanternMat = track(new THREE.MeshBasicMaterial({ color: 0xfcd34d }));
      const lanterns = addObj(new THREE.InstancedMesh(lanternGeo, lanternMat, lanternCount));
      lanterns.frustumCulled = false;

      const lanternAnchors: { x: number; y: number; z: number; yaw: number }[] = [];
      for (let i = 0; i < treeCount; i++) {
        const a = (i / treeCount) * Math.PI * 2 + (rand() - 0.5) * 0.14;
        const d = playRadius + 3.2 + rand() * 42;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const gy = groundHeightAt(x, z, stage) - 0.3;
        const sc = 0.8 + rand() * 0.85;
        const yaw = rand() * Math.PI * 2;

        dummy.position.set(x, gy, z);
        dummy.rotation.set((rand() - 0.5) * 0.16, yaw, (rand() - 0.5) * 0.16);
        dummy.scale.set(sc, sc * (0.9 + rand() * 0.45), sc);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        boughs.setMatrixAt(i, dummy.matrix);

        if (i < lanternCount) {
          lanternAnchors.push({ x, y: gy + 6.4 * sc, z, yaw });
        }
      }
      trunks.instanceMatrix.needsUpdate = true;
      boughs.instanceMatrix.needsUpdate = true;
      trunks.computeBoundingSphere();
      boughs.computeBoundingSphere();

      updaters.push((elapsed) => {
        for (let i = 0; i < lanternAnchors.length; i++) {
          const la = lanternAnchors[i];
          const sway = Math.sin(elapsed * 2.1 + i * 0.9) * 0.45;
          dummy.position.set(la.x + Math.cos(la.yaw) * sway, la.y, la.z + Math.sin(la.yaw) * sway);
          dummy.rotation.set(0, elapsed + i, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          lanterns.setMatrixAt(i, dummy.matrix);
        }
        lanterns.instanceMatrix.needsUpdate = true;
      });
    } else if (stage.theme === 'slag_volcano') {
      // Jagged dark obsidian basalt crags + glowing lava crater vents around the caldera perimeter
      const cragCount = lowDetail ? 56 : 110;
      const cragGeo = track(new THREE.ConeGeometry(2.1, 13, 5));
      cragGeo.translate(0, 6.5, 0);
      const basaltMat = track(makeEnvMat(0x121012, 0.88, 0.15));
      const crags = addObj(new THREE.InstancedMesh(cragGeo, basaltMat, cragCount));

      const ventCount = lowDetail ? 12 : 22;
      const ventGeo = track(new THREE.CylinderGeometry(1.75, 2.35, 1.4, 7));
      ventGeo.translate(0, 0.7, 0);
      const magmaMat = track(new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      const vents = addObj(new THREE.InstancedMesh(ventGeo, magmaMat, ventCount));

      for (let i = 0; i < cragCount; i++) {
        const a = (i / cragCount) * Math.PI * 2 + (rand() - 0.5) * 0.12;
        const d = playRadius + 3.5 + rand() * 44;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const gy = groundHeightAt(x, z, stage) - 0.45;
        const sc = 0.8 + rand() * 1.1;

        dummy.position.set(x, gy, z);
        dummy.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
        dummy.scale.set(sc, sc * (0.9 + rand() * 0.75), sc);
        dummy.updateMatrix();
        crags.setMatrixAt(i, dummy.matrix);

        if (i < ventCount) {
          const vd = playRadius + 4.5 + (i % 3) * 5.5;
          const vx = Math.cos(a) * vd;
          const vz = Math.sin(a) * vd;
          dummy.position.set(vx, groundHeightAt(vx, vz, stage) - 0.25, vz);
          dummy.rotation.set(0, a, 0);
          dummy.scale.setScalar(0.9 + (i % 3) * 0.25);
          dummy.updateMatrix();
          vents.setMatrixAt(i, dummy.matrix);
        }
      }
      crags.instanceMatrix.needsUpdate = true;
      vents.instanceMatrix.needsUpdate = true;
      crags.computeBoundingSphere();
      vents.computeBoundingSphere();
    } else if (stage.theme === 'glacier_rail') {
      // Towering tilted translucent cyan-ice monolith shards + frozen frost ribs
      const shardCount = lowDetail ? 56 : 112;
      const shardGeo = track(new THREE.BoxGeometry(2.6, 15, 2.1));
      shardGeo.translate(0, 7.5, 0);
      const iceMat = track(makeEnvMat(0xbae6fd, 0.16, 0.28, 0x0284c7, 0.18));
      const deepIceMat = track(makeEnvMat(0x7dd3fc, 0.22, 0.22));
      const shards = addObj(new THREE.InstancedMesh(shardGeo, iceMat, shardCount));

      const archCount = lowDetail ? 8 : 14;
      const archGeo = track(new THREE.TorusGeometry(6.8, 1.05, 5, 10, Math.PI));
      const arches = addObj(new THREE.InstancedMesh(archGeo, deepIceMat, archCount));

      for (let i = 0; i < shardCount; i++) {
        const a = (i / shardCount) * Math.PI * 2 + (rand() - 0.5) * 0.1;
        const d = playRadius + 3.5 + rand() * 44;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const gy = groundHeightAt(x, z, stage) - 0.5;
        const sc = 0.75 + rand() * 0.95;

        dummy.position.set(x, gy, z);
        dummy.rotation.set((rand() - 0.5) * 0.36, rand() * Math.PI, (rand() - 0.5) * 0.36);
        dummy.scale.set(sc, sc * (0.85 + rand() * 0.8), sc);
        dummy.updateMatrix();
        shards.setMatrixAt(i, dummy.matrix);
      }
      for (let i = 0; i < archCount; i++) {
        const a = (i / archCount) * Math.PI * 2 + 0.15;
        const d = playRadius + 6.5 + (i % 2) * 8;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        dummy.position.set(x, groundHeightAt(x, z, stage) - 0.3, z);
        dummy.rotation.set(0, -a, 0);
        dummy.scale.setScalar(1 + (i % 2) * 0.22);
        dummy.updateMatrix();
        arches.setMatrixAt(i, dummy.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
      arches.instanceMatrix.needsUpdate = true;
      shards.computeBoundingSphere();
      arches.computeBoundingSphere();
    } else if (stage.theme === 'bone_viaduct') {
      // Colossal curving pale ivory rib arches and carved obelisk monoliths framing the viaduct canyon
      const ribCount = lowDetail ? 28 : 54;
      const ribGeo = track(new THREE.TorusGeometry(6.4, 0.72, 6, 12, Math.PI * 0.78));
      const pillarGeo = track(new THREE.ConeGeometry(1.3, 14, 4));
      pillarGeo.translate(0, 7, 0);

      const boneMat = track(makeEnvMat(0xd4d2c8, 0.76, 0.06));
      const slateMat = track(makeEnvMat(0x27272e, 0.85, 0.12));
      const ribs = addObj(new THREE.InstancedMesh(ribGeo, boneMat, ribCount));
      const monoliths = addObj(new THREE.InstancedMesh(pillarGeo, slateMat, lowDetail ? 22 : 42));

      for (let i = 0; i < ribCount; i++) {
        const a = (i / ribCount) * Math.PI * 2 + (rand() - 0.5) * 0.08;
        const d = playRadius + 4.5 + (i % 3) * 6.5;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const gy = groundHeightAt(x, z, stage) - 0.4;
        const sc = 0.8 + rand() * 0.65;

        dummy.position.set(x, gy + 1.5, z);
        dummy.rotation.set(0, -a, 0.25);
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        ribs.setMatrixAt(i, dummy.matrix);

        if (i < monoliths.count) {
          const md = playRadius + 10 + rand() * 32;
          const mx = Math.cos(a + 0.1) * md;
          const mz = Math.sin(a + 0.1) * md;
          dummy.position.set(mx, groundHeightAt(mx, mz, stage) - 0.4, mz);
          dummy.rotation.set(0, a, 0);
          dummy.scale.setScalar(0.85 + rand() * 0.75);
          dummy.updateMatrix();
          monoliths.setMatrixAt(i, dummy.matrix);
        }
      }
      ribs.instanceMatrix.needsUpdate = true;
      monoliths.instanceMatrix.needsUpdate = true;
      ribs.computeBoundingSphere();
      monoliths.computeBoundingSphere();
    } else {
      // forest_ash: dead ash pines (1) or charred smoldering forest (14)
    const isCharred = stage.id === 14;
    const treeCount = lowDetail ? 90 : 175;
    const trunkGeo = track(new THREE.CylinderGeometry(0.45, 0.9, 7.5, 5));
    trunkGeo.translate(0, 3.75, 0);
    const canopyGeo = track(new THREE.ConeGeometry(isCharred ? 1.8 : 3.4, isCharred ? 6.5 : 9.5, 5));
    canopyGeo.translate(0, 9.0, 0);

    const trunkMat = track(makeEnvMat(isCharred ? 0x101012 : 0x16161a, 0.92, 0.02));
    const canopyMat = track(
      makeEnvMat(isCharred ? 0x1c1917 : 0x25252d, 0.88, 0.02, isCharred ? 0x7c2d12 : 0x000000, isCharred ? 0.16 : 0)
    );
    const trunks = addObj(new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount));
    const canopies = addObj(new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount));

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (rand() - 0.5) * 0.14;
      const dist = playRadius + 3 + rand() * 44;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = groundHeightAt(x, z, stage);
      const scale = 0.85 + rand() * 0.75;

      dummy.position.set(x, y - 0.3, z);
      dummy.rotation.set((rand() - 0.5) * 0.14, rand() * Math.PI * 2, (rand() - 0.5) * 0.16);
      dummy.scale.set(scale, scale * (0.9 + rand() * 0.45), scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      canopies.setMatrixAt(i, dummy.matrix);

      const shade = 0.78 + rand() * 0.38;
      canopies.setColorAt(i, color.setRGB(shade, shade, shade));
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
  }

  // =========================================================================
  // 2. PER-STAGE UNIQUE SIGNATURE LANDMARKS & SKY / ATMOSPHERE LAYER (1..80)
  // =========================================================================

  const sigMat = track(makeEnvMat(0x2d2f36, 0.55, 0.45));
  const sigGlowMat = track(
    new THREE.MeshBasicMaterial({
      color:
        stage.theme === 'industrial_furnace' ||
        stage.theme === 'slag_volcano' ||
        stage.id === 14 ||
        stage.id === 35
          ? 0xfb923c
          : stage.theme === 'leviathan_sea' || stage.theme === 'glacier_rail' || stage.id === 34
          ? 0x7dd3fc
          : stage.theme === 'clockwork_foundry'
          ? 0xfcd34d
          : stage.isBoss
          ? 0xfca5a5
          : 0xf4f4f8,
    })
  );

  // Stage-specific landmark ring variations so EVERY stage (1..36) has distinct silhouettes
  if (stage.id === 1 || stage.id === 5 || stage.id === 36) {
    // Pale Crescent/Full Moon or Grand Boss Finale Halo in distant sky
    const moonMesh = addObj(
      new THREE.Mesh(
        track(new THREE.CircleGeometry(stage.id === 36 ? 13 : 9, 32)),
        track(
          new THREE.MeshBasicMaterial({
            color: stage.id === 5 ? 0xd4d4dc : 0xf4f4f8,
            transparent: true,
            opacity: stage.id === 36 ? 0.85 : 0.72,
            side: THREE.DoubleSide,
          })
        )
      )
    );
    moonMesh.position.set(stage.id === 5 ? -36 : 24, 34, -88);
  }

  if (stage.id === 7 || stage.id === 17 || stage.id === 26) {
    // Jagged upturned severed railway spurs piercing skyward around the arena perimeter
    const spurCount = lowDetail ? 8 : 14;
    const railBeamGeo = track(new THREE.BoxGeometry(0.45, 11, 1.8));
    railBeamGeo.translate(0, 5, 0);
    const spurs = addObj(new THREE.InstancedMesh(railBeamGeo, sigMat, spurCount));
    for (let i = 0; i < spurCount; i++) {
      const a = (i / spurCount) * Math.PI * 2 + stage.id * 0.17;
      const d = playRadius + 3.2 + (i % 3) * 2.5;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.4, z);
      dummy.rotation.set(0.45, -a + Math.PI / 2, (i % 2 === 0 ? 1 : -1) * 0.25);
      dummy.scale.setScalar(0.85 + (i % 3) * 0.25);
      dummy.updateMatrix();
      spurs.setMatrixAt(i, dummy.matrix);
    }
    spurs.instanceMatrix.needsUpdate = true;
    spurs.computeBoundingSphere();
  }

  if (stage.id === 12 || stage.id === 33 || stage.id === 36) {
    // Giant slowly rotating iron clockwork gears / ventilation turbines framing the rim
    const gearCount = stage.id === 36 ? 6 : 8;
    const gearGeo = track(new THREE.TorusGeometry(4.4, 0.65, 5, 10));
    const spokeGeo = track(new THREE.BoxGeometry(8.5, 0.65, 0.5));
    const gears = addObj(new THREE.InstancedMesh(gearGeo, sigMat, gearCount));
    const spokes = addObj(new THREE.InstancedMesh(spokeGeo, sigMat, gearCount));
    gears.frustumCulled = false;
    spokes.frustumCulled = false;

    const gearBase: { x: number; y: number; z: number; yaw: number; dir: number }[] = [];
    for (let i = 0; i < gearCount; i++) {
      const a = (i / gearCount) * Math.PI * 2 + 0.2;
      const d = playRadius + 7.5;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      gearBase.push({
        x,
        y: groundHeightAt(x, z, stage) + 8.5,
        z,
        yaw: -a + Math.PI / 2,
        dir: i % 2 === 0 ? 1 : -1,
      });
    }
    updaters.push((elapsed) => {
      for (let i = 0; i < gearCount; i++) {
        const g = gearBase[i];
        dummy.position.set(g.x, g.y, g.z);
        dummy.rotation.set(0, g.yaw, elapsed * 0.45 * g.dir);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        gears.setMatrixAt(i, dummy.matrix);
        spokes.setMatrixAt(i, dummy.matrix);
      }
      gears.instanceMatrix.needsUpdate = true;
      spokes.instanceMatrix.needsUpdate = true;
    });
  }

  if (stage.id === 3 || stage.id === 10 || stage.id === 24) {
    // Quarry derrick cranes (3), coal conveyor chutes (10), or hanging iron chains (24)
    const count = lowDetail ? 8 : 14;
    const beamGeo = track(
      stage.id === 10
        ? new THREE.BoxGeometry(1.8, 0.7, 11)
        : stage.id === 24
        ? new THREE.CylinderGeometry(0.14, 0.14, 8.5, 5)
        : new THREE.BoxGeometry(0.85, 13.5, 0.85)
    );
    const meshes = addObj(new THREE.InstancedMesh(beamGeo, sigMat, count));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.1;
      const d = playRadius + 5.5 + (i % 2) * 3;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const gy = groundHeightAt(x, z, stage);
      dummy.position.set(x, gy + (stage.id === 24 ? 9.5 : 5.2), z);
      dummy.rotation.set(stage.id === 10 ? 0.42 : stage.id === 3 ? 0.35 : 0, -a + Math.PI / 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      meshes.setMatrixAt(i, dummy.matrix);
    }
    meshes.instanceMatrix.needsUpdate = true;
    meshes.computeBoundingSphere();
  }

  if (stage.id === 13 || stage.id === 19 || stage.id === 20) {
    // Steel cliff buttresses (13), upright sleeper palisades (19), or canyon rock arches (20)
    const count = lowDetail ? 12 : 20;
    const archGeo = track(
      stage.id === 20
        ? new THREE.TorusGeometry(7.2, 1.45, 5, 10, Math.PI * 0.85)
        : stage.id === 19
        ? new THREE.BoxGeometry(0.95, 7.2, 0.55)
        : new THREE.BoxGeometry(1.6, 11, 4.2)
    );
    if (stage.id !== 20) archGeo.translate(0, stage.id === 19 ? 3.6 : 5.5, 0);
    const arches = addObj(new THREE.InstancedMesh(archGeo, sigMat, count));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.25;
      const d = playRadius + 4.2 + (i % 3) * 3.5;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.3, z);
      dummy.rotation.set(stage.id === 19 ? (rand() - 0.5) * 0.25 : 0, -a, stage.id === 13 ? 0.28 : 0);
      dummy.scale.setScalar(1 + (i % 2) * 0.2);
      dummy.updateMatrix();
      arches.setMatrixAt(i, dummy.matrix);
    }
    arches.instanceMatrix.needsUpdate = true;
    arches.computeBoundingSphere();
  }

  if (stage.id === 18) {
    // Molten crucible forge vats glowing around the perimeter
    const vatCount = lowDetail ? 6 : 10;
    const vatGeo = track(new THREE.CylinderGeometry(2.6, 1.9, 3.2, 8));
    vatGeo.translate(0, 1.6, 0);
    const lavaGeo = track(new THREE.CylinderGeometry(2.3, 2.3, 0.35, 8));
    lavaGeo.translate(0, 3.25, 0);
    const vats = addObj(new THREE.InstancedMesh(vatGeo, sigMat, vatCount));
    const lavas = addObj(new THREE.InstancedMesh(lavaGeo, sigGlowMat, vatCount));
    for (let i = 0; i < vatCount; i++) {
      const a = (i / vatCount) * Math.PI * 2;
      const x = Math.cos(a) * (playRadius + 5.2);
      const z = Math.sin(a) * (playRadius + 5.2);
      dummy.position.set(x, groundHeightAt(x, z, stage) - 0.3, z);
      dummy.rotation.set(0, a, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      vats.setMatrixAt(i, dummy.matrix);
      lavas.setMatrixAt(i, dummy.matrix);
    }
    vats.instanceMatrix.needsUpdate = true;
    lavas.instanceMatrix.needsUpdate = true;
    vats.computeBoundingSphere();
    lavas.computeBoundingSphere();
  }

  if (stage.id === 21) {
    // Rotating bunker radar dishes on perimeter towers
    const dishCount = 4;
    const dishGeo = track(new THREE.CylinderGeometry(2.2, 0.4, 1.1, 8));
    dishGeo.rotateX(Math.PI / 3);
    const dishes = addObj(new THREE.InstancedMesh(dishGeo, sigMat, dishCount));
    dishes.frustumCulled = false;
    updaters.push((elapsed) => {
      for (let i = 0; i < dishCount; i++) {
        const a = (i / dishCount) * Math.PI * 2 + 0.4;
        const x = Math.cos(a) * (playRadius + 5);
        const z = Math.sin(a) * (playRadius + 5);
        dummy.position.set(x, groundHeightAt(x, z, stage) + 12.2, z);
        dummy.rotation.set(0, elapsed * 0.9 + i * 1.5, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        dishes.setMatrixAt(i, dummy.matrix);
      }
      dishes.instanceMatrix.needsUpdate = true;
    });
  }

  if (stage.id === 35) {
    // Low amber dusk sun & telegraph horizon glow
    const sunMesh = addObj(
      new THREE.Mesh(
        track(new THREE.CircleGeometry(14, 32)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0xfb923c,
            transparent: true,
            opacity: 0.42,
            side: THREE.DoubleSide,
          })
        )
      )
    );
    sunMesh.position.set(-22, 16, -92);
  }

  if (stage.id === 22) {
    // Twin colossal suspension bridge pylon towers with steel catenary cables
    const pylonGeo = track(new THREE.BoxGeometry(2.8, 28, 2.8));
    pylonGeo.translate(0, 14, 0);
    for (const side of [-1, 1]) {
      const px = side * (playRadius + 6);
      const tower = addObj(new THREE.Mesh(pylonGeo, sigMat));
      tower.position.set(px, groundHeightAt(px, 0, stage) - 0.5, 0);
    }
  }

  // Distinct signature sky landmarks for stages 37..80
  if (stage.id >= 37) {
    if (stage.id % 6 === 3 || stage.id === 80) {
      // Overhead rotating orbital iron halo ring for late Boss encounters & Stage 80 Finale
      const ringGeo = track(
        new THREE.TorusGeometry(playRadius + (stage.id === 80 ? 5.5 : 2.5), stage.id === 80 ? 0.85 : 0.48, 6, lowDetail ? 22 : 40)
      );
      ringGeo.rotateX(Math.PI / 2);
      const skyRing = addObj(new THREE.Mesh(ringGeo, sigMat));
      skyRing.position.y = stage.id === 80 ? 22 : 19;
      updaters.push((elapsed) => {
        skyRing.rotation.y = elapsed * (stage.id === 80 ? 0.28 : 0.16);
      });
    } else if (stage.id % 5 === 0) {
      // Towering distant lunar eclipse or volcanic ash disk on the horizon
      const eclipseMesh = addObj(
        new THREE.Mesh(
          track(new THREE.CircleGeometry(stage.isBoss ? 14 : 10, 32)),
          track(
            new THREE.MeshBasicMaterial({
              color:
                stage.theme === 'slag_volcano'
                  ? 0xf97316
                  : stage.theme === 'glacier_rail'
                  ? 0xbae6fd
                  : 0xe4e4ec,
              transparent: true,
              opacity: 0.65,
              side: THREE.DoubleSide,
            })
          )
        )
      );
      eclipseMesh.position.set(stage.id % 2 === 0 ? 28 : -28, 30, -90);
    }
  }

  // Distinct animated ambient atmospheric motes for EVERY stage (snow/embers/steam/spores/dust)
  const moteCount = lowDetail ? 26 : 52;
  const isRisingMotes =
    stage.theme === 'industrial_furnace' ||
    stage.theme === 'slag_volcano' ||
    stage.theme === 'clockwork_foundry' ||
    stage.theme === 'collapsed_tunnel' ||
    stage.id === 14 ||
    stage.id === 36 ||
    stage.id === 80;
  const moteGeo = track(
    stage.id === 30
      ? new THREE.CylinderGeometry(0.18, 0.55, 2.2, 6)
      : new THREE.DodecahedronGeometry(stage.theme === 'mining_cave' ? 0.22 : 0.26, 0)
  );
  const motes = addObj(new THREE.InstancedMesh(moteGeo, sigGlowMat, moteCount));
  motes.frustumCulled = false;

  const moteAngles: number[] = [];
  const moteRadii: number[] = [];
  const motePhases: number[] = [];
  for (let i = 0; i < moteCount; i++) {
    moteAngles.push(rand() * Math.PI * 2);
    moteRadii.push(8 + rand() * (playRadius + 16));
    motePhases.push(rand() * 20);
  }

  updaters.push((elapsed) => {
    for (let i = 0; i < moteCount; i++) {
      const ph = motePhases[i];
      const ang = moteAngles[i] + elapsed * (isRisingMotes ? 0.06 : 0.12);
      const r = moteRadii[i];
      const cycle = ((elapsed * (isRisingMotes ? 2.4 : 1.1) + ph) % 16) / 16;
      const y = isRisingMotes ? 0.6 + cycle * 16 : 16 - cycle * 15;
      const sc = Math.sin(cycle * Math.PI) * (stage.id === 30 ? 1.5 : 1.0);
      dummy.position.set(
        Math.cos(ang) * r + Math.sin(elapsed + ph) * 1.1,
        y,
        Math.sin(ang) * r + Math.cos(elapsed * 0.8 + ph) * 1.1
      );
      dummy.rotation.set(elapsed + ph, elapsed * 0.7, 0);
      dummy.scale.setScalar(Math.max(0.05, sc));
      dummy.updateMatrix();
      motes.setMatrixAt(i, dummy.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;
  });

  return {
    update: (elapsed: number, dt: number) => {
      for (const fn of updaters) fn(elapsed, dt);
    },
    dispose: () => {
      for (const d of disposables) d.dispose();
      for (const o of addedObjects) scene.remove(o);
    },
  };
}
