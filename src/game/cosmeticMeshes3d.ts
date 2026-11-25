import * as THREE from 'three';
import { CosmeticItemDef } from './cosmeticsCatalog';

export type CosmeticMaterialGetter = (
  color: number,
  emissive?: number,
  emissiveIntensity?: number,
  metalness?: number,
  roughness?: number
) => THREE.MeshStandardMaterial;

export function buildCosmeticMesh(
  def: CosmeticItemDef,
  getMat: CosmeticMaterialGetter
): THREE.Group {
  const g = new THREE.Group();
  const { archetype, primaryColor, secondaryColor, emissiveColor } = def.visual;
  const pMat = getMat(
    primaryColor,
    emissiveColor ?? 0x000000,
    emissiveColor ? 0.35 : 0,
    0.25,
    0.48
  );
  const sMat = getMat(
    secondaryColor,
    emissiveColor ?? 0x000000,
    emissiveColor ? 0.45 : 0,
    0.32,
    0.42
  );

  // ---------------- LEGACY HEAD ----------------
  if (archetype === 'legacy_top_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.06, 8), pMat);
    brim.position.y = 0.4;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.5, 8), pMat);
    crown.position.y = 0.66;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.09, 8), sMat);
    band.position.y = 0.48;
    g.add(brim, crown, band);
    return g;
  }
  if (archetype === 'legacy_bandana') {
    const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.15, 8), pMat);
    headband.position.y = 0.18;
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.32), pMat);
    knot.position.set(0, 0.16, -0.52);
    g.add(headband, knot);
    return g;
  }
  if (archetype === 'legacy_beanie') {
    const beanie = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.5, 7), pMat);
    beanie.position.y = 0.43;
    g.add(beanie);
    return g;
  }
  if (archetype === 'legacy_conductor_cap') {
    const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.46, 0.24, 8), pMat);
    capBase.position.y = 0.42;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.36), pMat);
    visor.position.set(0, 0.32, 0.36);
    const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), sMat);
    badge.position.set(0, 0.45, 0.47);
    g.add(capBase, visor, badge);
    return g;
  }
  if (archetype === 'legacy_iron_crown') {
    const crownRing = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.14, 8), pMat);
    crownRing.position.y = 0.38;
    g.add(crownRing);
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.36, 4);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = new THREE.Mesh(spikeGeo, sMat);
      sp.position.set(Math.cos(a) * 0.4, 0.56, Math.sin(a) * 0.4);
      g.add(sp);
    }
    return g;
  }
  if (archetype === 'legacy_expr_mask') {
    const maskPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.54, 0.12), pMat);
    maskPlate.position.set(0, 0.02, 0.46);
    const slitL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.14), sMat);
    slitL.position.set(-0.14, 0.1, 0.48);
    const slitR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.14), sMat);
    slitR.position.set(0.14, 0.1, 0.48);
    g.add(maskPlate, slitL, slitR);
    return g;
  }

  // ---------------- LEGACY BACK ----------------
  if (archetype === 'legacy_white_scarf') {
    const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.16, 8), pMat);
    neckRing.position.set(0, 1.32, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.92), pMat);
    tail.position.set(0, 1.26, -0.52);
    tail.rotation.x = -0.18;
    g.add(neckRing, tail);
    return g;
  }
  if (archetype === 'legacy_tattered_cape') {
    const capeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.1, 0.1), pMat);
    capeMesh.position.set(0, 0.85, -0.54);
    capeMesh.rotation.x = 0.22;
    g.add(capeMesh);
    return g;
  }
  if (archetype === 'legacy_coal_pack') {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.72, 6), pMat);
    tank.position.set(0, 0.92, -0.56);
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), sMat);
    core.position.set(0, 1.32, -0.56);
    g.add(tank, core);
    return g;
  }
  if (archetype === 'legacy_ash_halo') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.06, 6, 14), pMat);
    halo.position.set(0, 1.5, -0.45);
    g.add(halo);
    return g;
  }

  // ---------------- NEW HEAD ARCHETYPES ----------------
  if (archetype === 'halo_head') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 8, 20), pMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.72, 0);
    g.add(halo);
    return g;
  }

  if (archetype === 'crown') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.16, 8), pMat);
    ring.position.y = 0.42;
    g.add(ring);
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.28, 4);
    const gemGeo = new THREE.OctahedronGeometry(0.06, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = new THREE.Mesh(spikeGeo, pMat);
      sp.position.set(Math.cos(a) * 0.36, 0.58, Math.sin(a) * 0.36);
      g.add(sp);
      if (i % 2 === 0) {
        const gem = new THREE.Mesh(gemGeo, sMat);
        gem.position.set(Math.cos(a) * 0.43, 0.42, Math.sin(a) * 0.43);
        g.add(gem);
      }
    }
    return g;
  }

  if (archetype === 'wizard_hat' || archetype === 'witch_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.7, 0.05, 10), pMat);
    brim.position.y = 0.38;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.92, 8), pMat);
    cone.position.set(0, 0.82, -0.04);
    cone.rotation.x = -0.14;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.39, 0.09, 8), sMat);
    ribbon.position.y = 0.44;
    g.add(brim, cone, ribbon);
    return g;
  }

  if (archetype === 'cowboy_hat' || archetype === 'straw_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.66, 0.05, 12), pMat);
    brim.position.y = 0.39;
    brim.scale.set(1.05, 1, 1.18);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.34, 8), pMat);
    crown.position.y = 0.57;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.08, 8), sMat);
    band.position.y = 0.44;
    g.add(brim, crown, band);
    return g;
  }

  if (archetype === 'pirate_hat') {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.48, 0.36, 6), pMat);
    shell.position.y = 0.52;
    shell.scale.set(1.28, 1, 0.66);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), sMat);
    emblem.position.set(0, 0.55, 0.36);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 0.06), sMat);
    trim.position.set(0, 0.7, 0);
    g.add(shell, emblem, trim);
    return g;
  }

  if (archetype === 'chef_hat') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.42, 0.24, 10), sMat);
    band.position.y = 0.46;
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 1), pMat);
    puff.position.y = 0.74;
    puff.scale.set(1.05, 0.85, 1.05);
    g.add(band, puff);
    return g;
  }

  if (archetype === 'santa_hat' || archetype === 'party_hat') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 10), sMat);
    band.position.y = 0.38;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.78, 8), pMat);
    cone.position.set(0, 0.76, archetype === 'santa_hat' ? -0.06 : 0);
    if (archetype === 'santa_hat') cone.rotation.x = -0.22;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), sMat);
    pom.position.set(0, archetype === 'santa_hat' ? 1.12 : 1.16, archetype === 'santa_hat' ? -0.18 : 0);
    g.add(band, cone, pom);
    return g;
  }

  if (archetype === 'grad_cap') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.44, 0.18, 8), pMat);
    base.position.y = 0.44;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.86), pMat);
    board.position.y = 0.56;
    board.rotation.y = Math.PI / 4;
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.28, 6), sMat);
    tassel.position.set(0.36, 0.42, 0.25);
    g.add(base, board, tassel);
    return g;
  }

  if (archetype === 'viking_helm') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), pMat);
    dome.position.y = 0.22;
    const hornGeo = new THREE.ConeGeometry(0.1, 0.52, 6);
    for (const side of [-1, 1]) {
      const h = new THREE.Mesh(hornGeo, sMat);
      h.position.set(side * 0.48, 0.5, 0);
      h.rotation.z = side * -0.78;
      g.add(h);
    }
    g.add(dome);
    return g;
  }

  if (archetype === 'knight_helm') {
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.56, 8), pMat);
    helm.position.y = 0.25;
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.68), sMat);
    plume.position.set(0, 0.64, -0.05);
    g.add(helm, plume);
    return g;
  }

  if (archetype === 'samurai_helm') {
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), pMat);
    bowl.position.y = 0.24;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.64, 0.14, 8), pMat);
    brim.position.set(0, 0.26, -0.08);
    const crestL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), sMat);
    crestL.position.set(-0.18, 0.62, 0.4);
    crestL.rotation.z = 0.42;
    const crestR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), sMat);
    crestR.position.set(0.18, 0.62, 0.4);
    crestR.rotation.z = -0.42;
    g.add(bowl, brim, crestL, crestR);
    return g;
  }

  if (archetype === 'astronaut_helm') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), pMat);
    shell.position.set(0, 0.06, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.22), sMat);
    visor.position.set(0, 0.12, 0.52);
    g.add(shell, visor);
    return g;
  }

  if (archetype === 'glasses' || archetype === 'goggles') {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.06), pMat);
    bridge.position.set(0, 0.12, 0.48);
    const lensGeo =
      archetype === 'goggles'
        ? new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10)
        : new THREE.BoxGeometry(0.22, 0.14, 0.08);
    if (archetype === 'goggles') lensGeo.rotateX(Math.PI / 2);
    const l = new THREE.Mesh(lensGeo, sMat);
    l.position.set(-0.17, 0.12, 0.48);
    const r = new THREE.Mesh(lensGeo, sMat);
    r.position.set(0.17, 0.12, 0.48);
    g.add(bridge, l, r);
    return g;
  }

  if (archetype === 'visor') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.22), sMat);
    bar.position.set(0, 0.12, 0.46);
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.1, 10), pMat);
    strap.position.y = 0.12;
    g.add(bar, strap);
    return g;
  }

  if (archetype === 'animal_ears' || archetype === 'bunny_ears') {
    const isLong = archetype === 'bunny_ears';
    const outerGeo = isLong
      ? new THREE.BoxGeometry(0.16, 0.68, 0.12)
      : new THREE.ConeGeometry(0.16, 0.34, 4);
    const innerGeo = isLong
      ? new THREE.BoxGeometry(0.08, 0.5, 0.14)
      : new THREE.ConeGeometry(0.09, 0.22, 4);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(outerGeo, pMat);
      ear.position.set(side * 0.28, isLong ? 0.66 : 0.48, 0);
      ear.rotation.z = side * (isLong ? -0.15 : -0.25);
      const inner = new THREE.Mesh(innerGeo, sMat);
      inner.position.set(side * 0.28, isLong ? 0.64 : 0.46, 0.04);
      inner.rotation.z = side * (isLong ? -0.15 : -0.25);
      g.add(ear, inner);
    }
    return g;
  }

  if (archetype === 'frog_hood' || archetype === 'shark_hood') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), pMat);
    cap.position.y = 0.2;
    g.add(cap);
    if (archetype === 'frog_hood') {
      const eyeBallGeo = new THREE.SphereGeometry(0.14, 8, 8);
      for (const side of [-1, 1]) {
        const eb = new THREE.Mesh(eyeBallGeo, sMat);
        eb.position.set(side * 0.24, 0.56, 0.26);
        g.add(eb);
      }
    } else {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 4), pMat);
      fin.position.set(0, 0.72, -0.08);
      fin.rotation.x = -0.35;
      g.add(fin);
    }
    return g;
  }

  if (archetype === 'horns' || archetype === 'antlers' || archetype === 'unicorn_horn') {
    if (archetype === 'unicorn_horn') {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.66, 7), pMat);
      horn.position.set(0, 0.68, 0.22);
      horn.rotation.x = 0.28;
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.28), sMat);
      tuft.position.set(0, 0.48, 0.06);
      g.add(horn, tuft);
      return g;
    }
    const hGeo = new THREE.ConeGeometry(0.09, archetype === 'antlers' ? 0.65 : 0.48, 6);
    for (const side of [-1, 1]) {
      const h = new THREE.Mesh(hGeo, pMat);
      h.position.set(side * 0.34, 0.56, 0.08);
      h.rotation.z = side * -0.42;
      h.rotation.x = 0.18;
      g.add(h);
      if (archetype === 'antlers') {
        const branch = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 5), sMat);
        branch.position.set(side * 0.48, 0.72, 0.08);
        branch.rotation.z = side * 0.3;
        g.add(branch);
      }
    }
    return g;
  }

  if (archetype === 'headphones') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.055, 6, 14, Math.PI), pMat);
    arc.position.set(0, 0.14, 0);
    const cupGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10);
    cupGeo.rotateZ(Math.PI / 2);
    const lCup = new THREE.Mesh(cupGeo, sMat);
    lCup.position.set(-0.52, 0.04, 0);
    const rCup = new THREE.Mesh(cupGeo, sMat);
    rCup.position.set(0.52, 0.04, 0);
    g.add(arc, lCup, rCup);
    return g;
  }

  if (archetype === 'flower_crown') {
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.06, 6, 16), pMat);
    vine.rotation.x = Math.PI / 2;
    vine.position.y = 0.36;
    g.add(vine);
    const bloomGeo = new THREE.DodecahedronGeometry(0.1, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(bloomGeo, sMat);
      b.position.set(Math.cos(a) * 0.48, 0.4, Math.sin(a) * 0.48);
      g.add(b);
    }
    return g;
  }

  if (archetype === 'mohawk') {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.76), pMat);
    fin.position.set(0, 0.56, 0);
    g.add(fin);
    return g;
  }

  if (archetype === 'afro') {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), pMat);
    puff.position.set(0, 0.36, -0.05);
    g.add(puff);
    return g;
  }

  if (archetype === 'propeller_cap' || archetype === 'beret' || archetype === 'hard_hat' || archetype === 'mushroom_cap') {
    if (archetype === 'mushroom_cap') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.64, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), pMat);
      cap.position.y = 0.24;
      g.add(cap);
      const dotGeo = new THREE.SphereGeometry(0.11, 6, 6);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const dot = new THREE.Mesh(dotGeo, sMat);
        dot.position.set(Math.cos(a) * 0.42, 0.56, Math.sin(a) * 0.42);
        g.add(dot);
      }
      return g;
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), pMat);
    dome.position.y = 0.24;
    if (archetype === 'beret') {
      dome.scale.set(1.18, 0.55, 1.18);
      dome.rotation.z = 0.22;
      dome.position.y = 0.34;
    }
    g.add(dome);
    if (archetype === 'propeller_cap') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.1), sMat);
      blade.position.y = 0.78;
      g.add(blade);
    } else if (archetype === 'hard_hat') {
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.28), pMat);
      brim.position.set(0, 0.28, 0.38);
      g.add(brim);
    }
    return g;
  }

  if (archetype === 'mask_face') {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.14), pMat);
    plate.position.set(0, 0.04, 0.46);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), pMat);
    earL.position.set(-0.2, 0.34, 0.46);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), pMat);
    earR.position.set(0.2, 0.34, 0.46);
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.16), sMat);
    stripeL.position.set(-0.15, 0.1, 0.48);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.16), sMat);
    stripeR.position.set(0.15, 0.1, 0.48);
    g.add(plate, earL, earR, stripeL, stripeR);
    return g;
  }

  if (archetype === 'antenna') {
    for (const side of [-1, 1]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 5), pMat);
      stem.position.set(side * 0.2, 0.56, 0);
      stem.rotation.z = side * -0.25;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), sMat);
      bulb.position.set(side * 0.26, 0.8, 0);
      g.add(stem, bulb);
    }
    return g;
  }

  if (archetype === 'jester_hat') {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.64, 6), side === -1 ? pMat : sMat);
      horn.position.set(side * 0.3, 0.64, 0);
      horn.rotation.z = side * -0.55;
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), sMat);
      bell.position.set(side * 0.48, 0.88, 0);
      g.add(horn, bell);
    }
    return g;
  }

  // ---------------- NEW BACK ARCHETYPES ----------------
  if (archetype === 'angel_wings') {
    // Sculpted layered feathered angel wings on both shoulders
    for (const side of [-1, 1]) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.28, 1.18, -0.44);
      wingPivot.rotation.y = side * -0.34;
      wingPivot.rotation.x = 0.16;

      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.16), sMat);
      wingPivot.add(mount);

      const feathers: [number, number, number, number, number][] = [
        [0.44, 0.34, 1.18, 0.34, 0.52],
        [0.64, 0.16, 1.02, 0.28, 0.22],
        [0.54, -0.06, 0.86, 0.24, -0.08],
        [0.36, -0.26, 0.66, 0.2, -0.32],
      ];
      for (const [fx, fy, len, width, rot] of feathers) {
        const feather = new THREE.Mesh(new THREE.BoxGeometry(len, width, 0.08), pMat);
        feather.position.set(side * fx, fy, -0.04);
        feather.rotation.z = side * rot;
        feather.castShadow = true;
        wingPivot.add(feather);
      }

      const topTrim = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.11, 0.11), sMat);
      topTrim.position.set(side * 0.48, 0.48, -0.02);
      topTrim.rotation.z = side * 0.54;
      wingPivot.add(topTrim);

      g.add(wingPivot);
    }
    return g;
  }

  if (archetype === 'fairy_wings' || archetype === 'butterfly_wings') {
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.64, 0.05), pMat);
      upper.position.set(side * 0.58, 1.32, -0.48);
      upper.rotation.y = side * -0.36;
      upper.rotation.z = side * 0.36;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.05), sMat);
      lower.position.set(side * 0.46, 0.84, -0.46);
      lower.rotation.y = side * -0.3;
      lower.rotation.z = side * -0.26;
      g.add(upper, lower);
    }
    return g;
  }

  if (archetype === 'bat_wings' || archetype === 'dragon_wings') {
    const scale = archetype === 'dragon_wings' ? 1.24 : 1.0;
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.26, 1.18, -0.45);
      wing.rotation.y = side * -0.36;
      wing.scale.setScalar(scale);

      const spine = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.1), pMat);
      spine.position.set(side * 0.48, 0.28, 0);
      spine.rotation.z = side * 0.44;
      const web = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.92, 4), sMat);
      web.position.set(side * 0.52, -0.02, -0.04);
      web.rotation.z = side * -0.9;
      web.scale.set(1, 1, 0.14);
      wing.add(spine, web);
      g.add(wing);
    }
    return g;
  }

  if (archetype === 'cyber_wings') {
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.28, 1.16, -0.48);
      wing.rotation.y = side * -0.28;
      for (let k = 0; k < 3; k++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.95 - k * 0.16, 0.14, 0.06), k % 2 === 0 ? sMat : pMat);
        fin.position.set(side * (0.48 - k * 0.06), 0.34 - k * 0.24, -0.02 * k);
        fin.rotation.z = side * (0.45 - k * 0.24);
        wing.add(fin);
      }
      g.add(wing);
    }
    return g;
  }

  if (archetype === 'cape') {
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.18, 0.08), pMat);
    cloth.position.set(0, 0.84, -0.54);
    cloth.rotation.x = 0.2;
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.12), sMat);
    clasp.position.set(0, 1.38, -0.42);
    g.add(cloth, clasp);
    return g;
  }

  if (archetype === 'scarf') {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.16, 10), pMat);
    collar.position.set(0, 1.32, 0);
    const tailA = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.96), pMat);
    tailA.position.set(0.08, 1.24, -0.54);
    tailA.rotation.x = -0.22;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.22), sMat);
    tip.position.set(0.08, 1.14, -0.96);
    g.add(collar, tailA, tip);
    return g;
  }

  if (archetype === 'jetpack' || archetype === 'rocket_pack') {
    if (archetype === 'rocket_pack') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.88, 8), pMat);
      body.position.set(0, 1.0, -0.56);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.34, 8), sMat);
      nose.position.set(0, 1.6, -0.56);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 6), sMat);
      flame.rotation.x = Math.PI;
      flame.position.set(0, 0.44, -0.56);
      g.add(body, nose, flame);
      return g;
    }
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.72, 8), pMat);
      tank.position.set(side * 0.22, 0.96, -0.54);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 6), sMat);
      nozzle.rotation.x = Math.PI;
      nozzle.position.set(side * 0.22, 0.52, -0.54);
      g.add(tank, nozzle);
    }
    return g;
  }

  if (archetype === 'katana_pair') {
    for (const side of [-1, 1]) {
      const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.48, 0.09), pMat);
      scabbard.position.set(0, 1.05, -0.52);
      scabbard.rotation.z = side * 0.58;
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.12), sMat);
      hilt.position.set(side * -0.44, 1.66, -0.52);
      hilt.rotation.z = side * 0.58;
      g.add(scabbard, hilt);
    }
    return g;
  }

  if (archetype === 'guitar') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.14, 8), pMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(-0.08, 0.88, -0.52);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.96, 0.08), sMat);
    neck.position.set(0.24, 1.44, -0.52);
    neck.rotation.z = -0.48;
    g.add(body, neck);
    return g;
  }

  if (archetype === 'shield_back') {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.12, 12), pMat);
    shield.rotation.x = Math.PI / 2;
    shield.position.set(0, 0.96, -0.52);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), sMat);
    boss.position.set(0, 0.96, -0.6);
    g.add(shield, boss);
    return g;
  }

  if (archetype === 'quiver') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.82, 7), pMat);
    tube.position.set(0.14, 1.02, -0.52);
    tube.rotation.z = -0.36;
    for (let k = -1; k <= 1; k++) {
      const fletch = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), sMat);
      fletch.position.set(0.28 + k * 0.07, 1.48, -0.52);
      g.add(fletch);
    }
    g.add(tube);
    return g;
  }

  if (archetype === 'backpack' || archetype === 'speaker_pack') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.78, 0.34), pMat);
    pack.position.set(0, 0.95, -0.54);
    const pocket = new THREE.Mesh(
      archetype === 'speaker_pack'
        ? new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10)
        : new THREE.BoxGeometry(0.56, 0.32, 0.12),
      sMat
    );
    if (archetype === 'speaker_pack') pocket.rotation.x = Math.PI / 2;
    pocket.position.set(0, 0.88, -0.73);
    g.add(pack, pocket);
    return g;
  }

  if (archetype === 'plush_pack') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), pMat);
    body.position.set(0, 0.84, -0.56);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), pMat);
    head.position.set(0, 1.24, -0.56);
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), sMat);
    earL.position.set(-0.2, 1.44, -0.56);
    const earR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), sMat);
    earR.position.set(0.2, 1.44, -0.56);
    g.add(body, head, earL, earR);
    return g;
  }

  if (archetype === 'halo_back' || archetype === 'rings_back') {
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 6, 18), pMat);
    ring1.position.set(0, 1.38, -0.48);
    g.add(ring1);
    if (archetype === 'rings_back') {
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 6, 16), sMat);
      ring2.position.set(0, 1.38, -0.52);
      ring2.rotation.y = 0.6;
      ring2.rotation.x = 0.5;
      g.add(ring2);
    }
    return g;
  }

  if (archetype === 'balloons') {
    const offsets: [number, number, boolean][] = [
      [-0.28, 1.98, true],
      [0.24, 2.08, false],
      [0.02, 2.24, true],
    ];
    for (const [bx, by, useP] of offsets) {
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.72, 4), sMat);
      string.position.set(bx * 0.5, by - 0.52, -0.52);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), useP ? pMat : sMat);
      b.position.set(bx, by, -0.55);
      b.scale.set(0.95, 1.15, 0.95);
      g.add(string, b);
    }
    return g;
  }

  if (archetype === 'surfboard') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.56, 0.09), pMat);
    board.position.set(0, 1.08, -0.52);
    board.rotation.z = -0.32;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.48, 0.11), sMat);
    stripe.position.set(0, 1.08, -0.52);
    stripe.rotation.z = -0.32;
    g.add(board, stripe);
    return g;
  }

  if (archetype === 'banner') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.95, 6), sMat);
    pole.position.set(0, 1.45, -0.52);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.02, 0.05), pMat);
    flag.position.set(0, 1.92, -0.55);
    const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), sMat);
    badge.position.set(0, 1.92, -0.59);
    g.add(pole, flag, badge);
    return g;
  }

  if (archetype === 'gears_back') {
    for (const [gx, gy, r] of [
      [-0.22, 1.08, 0.32],
      [0.26, 0.88, 0.24],
    ]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 5, 10), pMat);
      wheel.position.set(gx, gy, -0.52);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.4, 0.08, 6), sMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(gx, gy, -0.52);
      g.add(wheel, hub);
    }
    return g;
  }

  if (archetype === 'wand_star') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.45, 6), pMat);
    rod.position.set(0, 1.1, -0.52);
    rod.rotation.z = -0.48;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), sMat);
    star.position.set(0.36, 1.72, -0.52);
    g.add(rod, star);
    return g;
  }

  if (archetype === 'anchor_back') {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.1), pMat);
    shaft.position.set(0, 1.06, -0.54);
    shaft.rotation.z = 0.25;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 10, Math.PI), sMat);
    hook.rotation.z = Math.PI + 0.25;
    hook.position.set(0.1, 0.62, -0.54);
    g.add(shaft, hook);
    return g;
  }

  // tail_devil fallback
  const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.95, 6), pMat);
  tailSeg.position.set(0, 0.56, -0.68);
  tailSeg.rotation.x = -0.82;
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.24, 4), sMat);
  arrow.position.set(0, 0.78, -1.12);
  arrow.rotation.x = -0.82;
  g.add(tailSeg, arrow);
  return g;
}
