import * as THREE from '../vendor/three.module.js';

/* ---------------------------------------------------------------------------
   Shared low-poly military material kit
--------------------------------------------------------------------------- */
const M = {
  olive: new THREE.MeshStandardMaterial({ color: 0x53613c, roughness: 0.92, metalness: 0.04, flatShading: true }),
  oliveDark: new THREE.MeshStandardMaterial({ color: 0x35412e, roughness: 0.95, flatShading: true }),
  oliveLight: new THREE.MeshStandardMaterial({ color: 0x7b8457, roughness: 0.9, flatShading: true }),
  sand: new THREE.MeshStandardMaterial({ color: 0x9b8c63, roughness: 1, flatShading: true }),
  canvas: new THREE.MeshStandardMaterial({ color: 0x796d4b, roughness: 1, side: THREE.DoubleSide }),
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x292d2b, roughness: 0.58, metalness: 0.55, flatShading: true }),
  gunmetalLight: new THREE.MeshStandardMaterial({ color: 0x4d5350, roughness: 0.5, metalness: 0.5, flatShading: true }),
  track: new THREE.MeshStandardMaterial({ color: 0x1e211f, roughness: 0.88, metalness: 0.25 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x171918, roughness: 0.95 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x536d6b, roughness: 0.2, metalness: 0.45, transparent: true, opacity: 0.72 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x9b6c4c, roughness: 0.9, flatShading: true }),
  red: new THREE.MeshStandardMaterial({ color: 0x883b30, roughness: 0.9, flatShading: true }),
  redDark: new THREE.MeshStandardMaterial({ color: 0x542723, roughness: 0.95, flatShading: true }),
  redBright: new THREE.MeshStandardMaterial({ color: 0xb54c36, roughness: 0.8, flatShading: true }),
  rust: new THREE.MeshStandardMaterial({ color: 0x6b4b37, roughness: 1, flatShading: true }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x8b887b, roughness: 1, flatShading: true }),
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x65645b, roughness: 1, flatShading: true }),
  black: new THREE.MeshStandardMaterial({ color: 0x151715, roughness: 0.8 }),
  tan: new THREE.MeshStandardMaterial({ color: 0xb6a277, roughness: 0.95, flatShading: true }),
  orange: new THREE.MeshBasicMaterial({ color: 0xffa13a }),
  greenLight: new THREE.MeshBasicMaterial({ color: 0xc9ff54 }),
  redLight: new THREE.MeshBasicMaterial({ color: 0xff5038 }),
};

const TEAM_COLORS = {
  player: {
    body: M.olive,
    bodyLight: M.oliveLight,
    bodyDark: M.oliveDark,
    accent: 0xc9ff54,
    beacon: M.greenLight,
  },
  enemy: {
    body: M.red,
    bodyLight: M.redBright,
    bodyDark: M.redDark,
    accent: 0xff5038,
    beacon: M.redLight,
  },
};

/* ---------------------------------------------------------------------------
   Geometry helpers
--------------------------------------------------------------------------- */
function addBox(parent, w, h, d, material, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, rTop, rBot, height, segments, material, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, material, x = 0, y = 0, z = 0, w = 8, h = 6, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, w, h), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function addWheel(parent, radius, width, x, y, z, side = 1) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.x = Math.PI / 2;
  parent.add(pivot);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 10), M.rubber);
  tire.castShadow = true;
  pivot.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, width + 0.02, 8), M.gunmetalLight);
  hub.position.y = side * 0.01;
  tire.add(hub);
  // Simple tread blocks make the silhouette read better at RTS distance.
  for (let i = 0; i < 8; i++) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.28, width * 1.03, radius * 0.26), M.track);
    const a = (i / 8) * Math.PI * 2;
    block.position.set(Math.cos(a) * radius * 0.93, 0, Math.sin(a) * radius * 0.93);
    block.rotation.y = -a;
    pivot.add(block);
  }
  return pivot;
}

function addMuzzle(parent, x, y, z) {
  const muzzle = new THREE.Object3D();
  muzzle.position.set(x, y, z);
  parent.add(muzzle);
  return muzzle;
}

function makeFlagTexture(color, sigil) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 80);
  ctx.fillStyle = 'rgba(10,14,9,.55)';
  ctx.fillRect(0, 60, 128, 20);
  if (sigil === 'star') {
    ctx.fillStyle = 'rgba(240,247,224,.82)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 18 : 7;
      ctx.lineTo(64 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(240,247,224,.75)';
    ctx.fillRect(20, 23, 88, 7);
    ctx.fillRect(54, 13, 8, 30);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------------------------------------------------------------------
   Infantry
--------------------------------------------------------------------------- */
function makeSoldier(team, sniper = false) {
  const c = TEAM_COLORS[team];
  const root = new THREE.Group();
  const rig = { legs: [], arms: [], turret: null, muzzle: null, type: 'infantry' };

  const hips = new THREE.Group();
  hips.position.y = 0.66;
  root.add(hips);

  const legGeo = new THREE.BoxGeometry(0.22, 0.62, 0.25);
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(0, 0.02, side * 0.15);
    hips.add(leg);
    const limb = new THREE.Mesh(legGeo, c.bodyDark);
    limb.position.y = -0.31;
    limb.castShadow = true;
    leg.add(limb);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.27), M.black);
    boot.position.set(0.08, -0.64, 0);
    boot.castShadow = true;
    leg.add(boot);
    rig.legs.push(leg);
  }

  const torso = addBox(root, 0.48, 0.58, 0.38, c.body, 0, 1.06, 0);
  torso.scale.set(1, 1, 1);
  addBox(root, 0.55, 0.4, 0.47, c.bodyDark, 0, 1.11, 0);
  addBox(root, 0.19, 0.38, 0.33, c.bodyDark, -0.3, 1.04, 0);
  if (!sniper) {
    addBox(root, 0.17, 0.09, 0.1, c.bodyLight, 0.0, 1.28, 0.24);
    addBox(root, 0.17, 0.09, 0.1, c.bodyLight, 0.0, 1.28, -0.24);
  }

  const head = addSphere(root, 0.18, M.skin, 0.02, 1.51, 0, 8, 6);
  head.scale.set(1, 1.05, 0.92);

  if (sniper) {
    // Boonie hat and camouflage veil.
    addCyl(root, 0.31, 0.35, 0.08, 10, c.bodyDark, 0, 1.65, 0);
    addCyl(root, 0.19, 0.22, 0.14, 8, c.body, 0, 1.72, 0);
    const veil = addBox(root, 0.14, 0.36, 0.3, M.canvas, -0.12, 1.42, 0, false);
    veil.rotation.z = -0.18;
  } else {
    const helmet = addSphere(root, 0.23, c.body, 0, 1.59, 0, 8, 5);
    helmet.scale.set(1, 0.65, 1.08);
    addBox(root, 0.06, 0.07, 0.17, c.bodyLight, 0.23, 1.52, 0, false);
  }

  const armMat = c.body;
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0.0, 1.3, side * 0.3);
    root.add(arm);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.17), armMat);
    upper.position.set(0.09, -0.2, side * 0.02);
    upper.rotation.z = -0.45;
    upper.castShadow = true;
    arm.add(upper);
    rig.arms.push(arm);
  }

  const weapon = new THREE.Group();
  weapon.position.set(0.34, 1.18, 0.18);
  root.add(weapon);
  if (sniper) {
    addBox(weapon, 1.12, 0.06, 0.065, M.gunmetal, 0.5, 0, 0);
    addBox(weapon, 0.33, 0.13, 0.12, c.bodyDark, -0.02, 0, 0);
    addCyl(weapon, 0.035, 0.045, 0.36, 6, M.gunmetal, 0.83, 0, 0, false).rotation.z = Math.PI / 2;
    addBox(weapon, 0.26, 0.1, 0.1, M.black, 0.02, 0.11, 0, false);
    const scope = addCyl(weapon, 0.055, 0.055, 0.3, 8, M.gunmetalLight, 0.12, 0.1, 0, false);
    scope.rotation.z = Math.PI / 2;
    const glint = addSphere(weapon, 0.042, M.cyan || M.greenLight, 0.28, 0.1, 0, 5, 4, false);
    glint.material = new THREE.MeshBasicMaterial({ color: 0xbdffe0 });
    // Bipod
    for (const s of [-1, 1]) {
      const leg = addBox(weapon, 0.4, 0.02, 0.02, M.gunmetal, 0.56, -0.14, s * 0.07, false);
      leg.rotation.z = -0.5;
      leg.rotation.y = s * 0.22;
    }
    rig.muzzle = addMuzzle(weapon, 1.02, 0, 0);
  } else {
    addBox(weapon, 0.78, 0.075, 0.08, M.gunmetal, 0.3, 0, 0);
    addBox(weapon, 0.32, 0.15, 0.14, c.bodyDark, -0.08, -0.015, 0);
    addBox(weapon, 0.2, 0.24, 0.1, M.gunmetal, 0.05, -0.14, 0, false);
    addBox(weapon, 0.06, 0.16, 0.05, M.gunmetal, 0.63, 0.09, 0, false);
    rig.muzzle = addMuzzle(weapon, 0.7, 0, 0);
  }

  // A tiny backpack silhouette helps the unit read from above.
  addBox(root, 0.22, 0.35, 0.32, c.bodyDark, -0.28, 1.08, 0);

  root.userData.rig = rig;
  root.userData.height = 1.9;
  root.userData.radius = 0.62;
  return root;
}

/* ---------------------------------------------------------------------------
   Humvee
--------------------------------------------------------------------------- */
function makeHumvee(team) {
  const c = TEAM_COLORS[team];
  const root = new THREE.Group();
  const rig = { wheels: [], turret: null, muzzle: null, type: 'vehicle' };

  addBox(root, 2.35, 0.38, 1.22, c.bodyDark, 0, 0.57, 0);
  addBox(root, 2.05, 0.48, 1.12, c.body, -0.08, 0.86, 0);
  addBox(root, 1.02, 0.58, 1.02, c.body, -0.5, 1.28, 0);
  addBox(root, 0.86, 0.38, 0.92, c.bodyDark, -0.58, 1.62, 0);
  addBox(root, 0.55, 0.35, 1.1, c.bodyLight, 0.65, 0.98, 0);
  addBox(root, 0.06, 0.34, 0.9, M.glass, 0.73, 1.34, 0, false);
  addBox(root, 0.05, 0.28, 0.84, M.glass, -0.03, 1.37, 0, false);
  addBox(root, 0.38, 0.08, 1.2, c.bodyDark, 0.96, 0.55, 0);
  addBox(root, 0.34, 0.24, 1.18, M.gunmetal, 1.05, 0.72, 0);
  addBox(root, 0.22, 0.2, 0.28, M.black, 0.85, 0.64, 0.42, false);
  addBox(root, 0.22, 0.2, 0.28, M.black, 0.85, 0.64, -0.42, false);

  for (const x of [-0.78, 0.76]) {
    for (const z of [-0.64, 0.64]) rig.wheels.push(addWheel(root, 0.38, 0.27, x, 0.4, z));
  }

  const spare = addWheel(root, 0.36, 0.2, -1.25, 1.08, 0);
  spare.rotation.z = Math.PI / 2;

  const turret = new THREE.Group();
  turret.position.set(-0.24, 1.82, 0);
  root.add(turret);
  const ring = addCyl(turret, 0.42, 0.46, 0.16, 10, c.bodyDark, 0, 0, 0);
  const shield = addBox(turret, 0.12, 0.45, 0.9, c.body, 0.2, 0.12, 0);
  shield.rotation.z = -0.12;
  addBox(turret, 0.98, 0.12, 0.13, M.gunmetal, 0.66, 0.17, 0);
  addBox(turret, 0.18, 0.22, 0.25, c.bodyDark, 0.15, 0.2, 0);
  const ammo = addBox(turret, 0.26, 0.18, 0.22, c.bodyDark, -0.18, 0.25, 0.24);
  ammo.rotation.y = 0.2;
  rig.muzzle = addMuzzle(turret, 1.16, 0.17, 0);

  // Antenna
  const antenna = addCyl(root, 0.012, 0.018, 1.35, 4, M.gunmetal, -0.85, 2.05, -0.42, false);
  antenna.rotation.z = -0.09;
  addSphere(root, 0.04, c.beacon, -0.78, 2.7, -0.42, 5, 4, false);

  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe6a1 });
  addBox(root, 0.045, 0.13, 0.22, lightMat, 1.06, 0.92, 0.38, false);
  addBox(root, 0.045, 0.13, 0.22, lightMat, 1.06, 0.92, -0.38, false);

  rig.turret = turret;
  root.userData.rig = rig;
  root.userData.height = 2.2;
  root.userData.radius = 1.4;
  return root;
}

/* ---------------------------------------------------------------------------
   Main battle tank
--------------------------------------------------------------------------- */
function makeTank(team) {
  const c = TEAM_COLORS[team];
  const root = new THREE.Group();
  const rig = { wheels: [], turret: null, barrel: null, muzzle: null, type: 'vehicle' };

  for (const z of [-0.92, 0.92]) {
    addBox(root, 3.05, 0.48, 0.46, M.track, 0, 0.38, z);
    addBox(root, 2.7, 0.16, 0.5, c.bodyDark, 0, 0.65, z);
    for (let i = 0; i < 7; i++) {
      const wheel = addCyl(root, 0.19, 0.19, 0.5, 10, M.gunmetalLight, -1.24 + i * 0.41, 0.38, z, false);
      wheel.rotation.x = Math.PI / 2;
      rig.wheels.push(wheel);
    }
  }
  addBox(root, 2.55, 0.22, 1.75, c.body, 0, 0.83, 0);
  addBox(root, 2.35, 0.38, 1.45, c.body, -0.1, 1.02, 0);
  const glacis = addBox(root, 0.72, 0.4, 1.62, c.bodyLight, 1.18, 0.97, 0);
  glacis.rotation.z = -0.17;
  addBox(root, 0.42, 0.02, 1.5, c.bodyDark, 1.42, 0.83, 0, false);
  addBox(root, 0.6, 0.24, 1.9, c.bodyDark, -1.26, 0.95, 0);
  addBox(root, 0.28, 0.24, 0.38, M.gunmetal, 1.38, 0.98, 0.52, false);
  addBox(root, 0.28, 0.24, 0.38, M.gunmetal, 1.38, 0.98, -0.52, false);
  for (const z of [-0.95, 0.95]) {
    addBox(root, 2.3, 0.22, 0.08, c.bodyDark, -0.05, 0.83, z, false);
  }

  const turret = new THREE.Group();
  turret.position.set(-0.1, 1.28, 0);
  root.add(turret);
  const turretBase = addCyl(turret, 0.76, 0.85, 0.3, 10, c.bodyDark, 0, 0, 0);
  addBox(turret, 1.48, 0.44, 1.22, c.body, 0.06, 0.27, 0);
  addBox(turret, 0.92, 0.26, 1.04, c.bodyLight, 0.36, 0.56, 0);
  addBox(turret, 0.36, 0.2, 0.42, c.bodyDark, -0.42, 0.61, 0.3, false);
  addCyl(turret, 0.16, 0.21, 0.18, 8, M.gunmetal, 0.65, 0.31, 0, false).rotation.z = Math.PI / 2;
  addBox(turret, 0.18, 0.2, 1.12, c.bodyDark, -0.66, 0.35, 0, false);
  // Smoke launchers
  for (const z of [-0.53, -0.31, 0.31, 0.53]) {
    const tube = addCyl(turret, 0.045, 0.045, 0.2, 6, M.gunmetal, 0.25, 0.57, z, false);
    tube.rotation.x = Math.PI / 2;
  }

  const barrel = new THREE.Group();
  barrel.position.set(0.4, 0.3, 0);
  turret.add(barrel);
  const tube = addCyl(barrel, 0.07, 0.095, 2.1, 8, M.gunmetal, 1.05, 0, 0);
  tube.rotation.z = Math.PI / 2;
  addCyl(barrel, 0.11, 0.11, 0.3, 8, M.gunmetalLight, 2.15, 0, 0).rotation.z = Math.PI / 2;
  addBox(barrel, 0.32, 0.16, 0.2, M.gunmetal, 1.96, 0, 0);
  // Thermal sleeve ring accents.
  addCyl(barrel, 0.105, 0.105, 0.12, 8, c.bodyDark, 0.55, 0, 0).rotation.z = Math.PI / 2;
  rig.muzzle = addMuzzle(barrel, 2.32, 0, 0);

  const cupola = addCyl(turret, 0.24, 0.27, 0.26, 8, c.bodyDark, -0.44, 0.46, -0.3, false);
  const mg = addBox(turret, 0.8, 0.07, 0.08, M.gunmetal, -0.02, 0.72, -0.3, false);
  addBox(turret, 0.14, 0.16, 0.14, M.gunmetal, -0.34, 0.69, -0.3, false);
  const antenna = addCyl(turret, 0.012, 0.014, 1.1, 4, M.gunmetal, -0.58, 0.96, 0.4, false);
  antenna.rotation.z = -0.1;

  rig.turret = turret;
  rig.barrel = barrel;
  root.userData.rig = rig;
  root.userData.height = 2.4;
  root.userData.radius = 1.8;
  return root;
}

/* ---------------------------------------------------------------------------
   Towed howitzer / self-propelled artillery
--------------------------------------------------------------------------- */
function makeArtillery(team) {
  const c = TEAM_COLORS[team];
  const root = new THREE.Group();
  const rig = { wheels: [], turret: null, barrel: null, muzzle: null, type: 'vehicle' };

  addBox(root, 2.0, 0.35, 1.28, c.bodyDark, 0, 0.56, 0);
  addBox(root, 1.6, 0.45, 1.08, c.body, -0.05, 0.84, 0);
  addBox(root, 0.5, 0.3, 1.2, c.body, -0.82, 0.82, 0);
  addBox(root, 0.5, 0.28, 1.0, c.body, 0.8, 0.78, 0);
  addBox(root, 0.7, 0.45, 1.05, c.bodyDark, -0.35, 1.24, 0);
  addBox(root, 0.42, 0.35, 0.95, c.body, -0.12, 1.5, 0);
  addBox(root, 0.06, 0.3, 0.78, M.glass, -0.38, 1.53, 0, false);
  addBox(root, 0.46, 0.3, 0.9, c.body, 0.45, 1.15, 0);

  for (const x of [-0.72, 0.68]) {
    for (const z of [-0.7, 0.7]) rig.wheels.push(addWheel(root, 0.47, 0.3, x, 0.48, z));
  }
  addWheel(root, 0.47, 0.3, -0.05, 0.48, -0.74);
  addWheel(root, 0.47, 0.3, -0.05, 0.48, 0.74);

  // Split trail legs, splayed toward the rear.
  for (const s of [-1, 1]) {
    const trail = addBox(root, 1.9, 0.13, 0.14, c.bodyDark, -1.6, 0.5, s * 0.44);
    trail.rotation.y = s * 0.22;
    trail.rotation.z = 0.02;
    addBox(root, 0.24, 0.13, 0.34, M.gunmetal, -2.5, 0.48, s * 0.65);
  }

  const turret = new THREE.Group();
  turret.position.set(-0.05, 1.18, 0);
  root.add(turret);
  addCyl(turret, 0.42, 0.48, 0.22, 10, c.bodyDark, 0, 0, 0);
  const shield = addBox(turret, 0.13, 0.78, 1.32, c.body, 0.22, 0.38, 0);
  shield.rotation.z = -0.16;
  addBox(turret, 0.4, 0.5, 0.52, c.bodyDark, -0.1, 0.22, 0.44, false);
  addBox(turret, 0.4, 0.5, 0.52, c.bodyDark, -0.1, 0.22, -0.44, false);

  const barrel = new THREE.Group();
  barrel.position.set(0.25, 0.52, 0);
  barrel.rotation.z = 0.22;
  turret.add(barrel);
  const tube = addCyl(barrel, 0.07, 0.11, 2.55, 8, M.gunmetal, 1.1, 0, 0);
  tube.rotation.z = Math.PI / 2;
  addBox(barrel, 0.6, 0.22, 0.3, M.gunmetal, 0.06, 0, 0);
  addCyl(barrel, 0.15, 0.15, 0.38, 8, M.gunmetalLight, 2.26, 0, 0).rotation.z = Math.PI / 2;
  addCyl(barrel, 0.12, 0.12, 0.15, 8, c.bodyDark, 0.52, 0, 0).rotation.z = Math.PI / 2;
  rig.muzzle = addMuzzle(barrel, 2.56, 0, 0);
  rig.turret = turret;
  rig.barrel = barrel;

  addBox(root, 0.42, 0.26, 0.36, c.bodyDark, -0.86, 1.32, 0, false);
  const antenna = addCyl(root, 0.012, 0.012, 1.2, 4, M.gunmetal, -0.88, 1.9, 0.43, false);
  antenna.rotation.z = -0.2;

  root.userData.rig = rig;
  root.userData.height = 2.5;
  root.userData.radius = 1.7;
  return root;
}

/* ---------------------------------------------------------------------------
   Fighter jet
--------------------------------------------------------------------------- */
function makeFighter(team) {
  const c = TEAM_COLORS[team];
  const root = new THREE.Group();
  const rig = { type: 'aircraft', afterburner: null };

  const fuselage = addCyl(root, 0.2, 0.34, 3.9, 8, c.body, 0, 0, 0);
  fuselage.rotation.z = Math.PI / 2;
  const nose = addCyl(root, 0.03, 0.21, 1.2, 8, c.bodyLight, 2.35, 0, 0);
  nose.rotation.z = Math.PI / 2;
  addSphere(root, 0.2, M.glass, 0.78, 0.18, 0, 8, 5).scale.set(1.55, 0.75, 0.95);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(1.1, 0);
  wingShape.lineTo(-0.5, 2.65);
  wingShape.lineTo(-1.18, 2.55);
  wingShape.lineTo(-0.7, 0.12);
  wingShape.lineTo(-1.3, 0);
  wingShape.lineTo(-0.7, -0.12);
  wingShape.lineTo(-1.18, -2.55);
  wingShape.lineTo(-0.5, -2.65);
  wingShape.lineTo(1.1, 0);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.09, bevelEnabled: false });
  wingGeo.rotateX(-Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, c.body);
  wings.position.y = -0.02;
  wings.castShadow = true;
  root.add(wings);

  for (const s of [-1, 1]) {
    const tail = addBox(root, 0.7, 0.72, 0.09, c.bodyDark, -1.75, 0.36, s * 0.42);
    tail.rotation.z = s * 0.42;
    tail.rotation.x = s * 0.22;
    const missile = addCyl(root, 0.055, 0.055, 1.3, 6, M.gunmetalLight, -0.35, -0.1, s * 1.75);
    missile.rotation.z = Math.PI / 2;
    addBox(root, 0.22, 0.16, 0.03, c.bodyLight, -0.65, -0.1, s * 1.75, false);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.45, 8), M.gunmetal);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-2.0, 0, s * 0.22);
    root.add(exhaust);
  }
  addBox(root, 1.25, 0.12, 0.12, c.body, -1.3, -0.02, 0, false);

  const flameMat = new THREE.MeshBasicMaterial({
    color: team === 'player' ? 0xaee9ff : 0xffb06a,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.35, 7), flameMat);
  flame.rotation.z = Math.PI / 2;
  flame.position.set(-2.55, 0, 0);
  flame.userData.baseScale = 1;
  root.add(flame);
  rig.afterburner = flame;

  root.userData.rig = rig;
  root.userData.height = 1;
  root.userData.radius = 2.5;
  return root;
}

/* ---------------------------------------------------------------------------
   Forward operating base
--------------------------------------------------------------------------- */
function makeBase(team) {
  const c = TEAM_COLORS[team];
  const root = new THREE.Group();
  const rig = { type: 'base', turret: null, muzzle: null, radar: null, flags: [] };

  // Concrete command pad.
  const pad = addBox(root, 7.6, 0.18, 7.0, M.concrete, 0, 0.09, 0);
  pad.receiveShadow = true;
  addBox(root, 7.2, 0.05, 6.6, M.concreteDark, 0, 0.2, 0, false);

  // Main bunker / command module.
  addBox(root, 3.8, 1.45, 3.0, c.bodyDark, -0.7, 1.0, 0);
  addBox(root, 3.3, 0.55, 2.55, c.body, -0.5, 1.85, 0);
  addBox(root, 3.1, 0.22, 2.4, c.bodyLight, -0.55, 2.19, 0);
  addBox(root, 0.7, 0.72, 0.1, M.glass, 1.08, 1.15, 0.9, false);
  addBox(root, 0.7, 0.72, 0.1, M.glass, 1.08, 1.15, -0.9, false);
  addBox(root, 0.2, 1.2, 0.68, M.gunmetal, 1.3, 1.1, 0, false);

  // Canvas command tent.
  addBox(root, 2.0, 0.9, 2.3, M.canvas, -2.2, 0.65, 2.5);
  const roof = addBox(root, 2.25, 0.12, 2.55, c.bodyDark, -2.2, 1.13, 2.5);
  roof.rotation.z = 0.04;

  // Containers.
  addBox(root, 1.6, 0.95, 0.92, c.body, 1.7, 0.69, 2.75);
  addBox(root, 1.6, 0.95, 0.92, c.bodyDark, -0.1, 0.69, 3.0);
  for (const x of [1.25, 2.15]) {
    addBox(root, 0.05, 0.75, 0.74, c.bodyDark, x, 0.69, 3.22, false);
  }

  // Sandbag wall facing the battlefield.
  for (let i = 0; i < 7; i++) {
    const z = -3.3 + i * 1.1;
    const bag = addBox(root, 0.72, 0.28, 0.86, M.sand, 3.25, 0.36 + (i % 2) * 0.25, z, true);
    bag.rotation.y = (i % 2 ? -1 : 1) * 0.07;
  }
  addBox(root, 0.18, 0.55, 0.18, M.gunmetal, 3.25, 0.6, 3.2, false);
  addBox(root, 0.18, 0.55, 0.18, M.gunmetal, 3.25, 0.6, -3.2, false);

  // Comms mast and radar dish.
  const mast = addCyl(root, 0.045, 0.06, 3.0, 6, M.gunmetal, -2.75, 2.0, -2.2);
  const radar = new THREE.Group();
  radar.position.set(-2.75, 3.45, -2.2);
  root.add(radar);
  addCyl(radar, 0.38, 0.38, 0.1, 12, M.gunmetal, 0, 0, 0).rotation.x = Math.PI / 2;
  const dish = addCyl(radar, 0.62, 0.16, 0.22, 12, c.bodyDark, 0, 0.02, 0);
  dish.rotation.x = Math.PI / 2;
  rig.radar = radar;
  addSphere(radar, 0.06, c.beacon, 0, 0.18, 0, 48, 30, false);

  // Flag pole.
  const pole = addCyl(root, 0.035, 0.05, 3.2, 6, M.gunmetal, -3.2, 2.0, 2.7);
  const flagTex = makeFlagTexture(team === 'player' ? '#53613c' : '#84392f', team === 'player' ? 'star' : 'bars');
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.65, 8, 2),
    new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 1 })
  );
  flag.position.set(-2.65, 3.25, 2.7);
  flag.castShadow = true;
  root.add(flag);
  const flagBase = flag.geometry.attributes.position.array.slice();
  rig.flags.push({ mesh: flag, base: flagBase, phase: team === 'player' ? 0 : 1.7 });

  // Roof turret.
  const turret = new THREE.Group();
  turret.position.set(-0.45, 2.38, 0);
  root.add(turret);
  addCyl(turret, 0.35, 0.42, 0.2, 10, c.bodyDark, 0, 0, 0);
  addBox(turret, 0.64, 0.3, 0.58, c.body, 0.02, 0.23, 0);
  addBox(turret, 0.9, 0.08, 0.09, M.gunmetal, 0.65, 0.29, 0);
  addBox(turret, 0.22, 0.18, 0.22, c.bodyDark, -0.1, 0.28, 0.24, false);
  rig.muzzle = addMuzzle(turret, 1.16, 0.29, 0);
  rig.turret = turret;

  // Crates, barrels, sandbags around the pad.
  for (const [x, z, s] of [[2.8, -2.7, 1], [2.2, -3.5, 0.7], [-2.9, -3.4, 0.8], [-3.5, -1.6, 0.65]]) {
    const crate = addBox(root, s, s * 0.75, s, M.sand, x, 0.4 * s + 0.18, z);
    crate.rotation.y = x * 0.3;
  }
  for (const [x, z] of [[1.5, -3.4], [1.9, -3.2], [-3.6, 0.4]]) {
    const barrel = addCyl(root, 0.22, 0.24, 0.8, 10, c.bodyDark, x, 0.58, z);
    barrel.rotation.z = 0.02;
  }

  // Lights and beacon.
  addSphere(root, 0.09, c.beacon, 1.1, 2.55, 1.15, 6, 5, false);
  addSphere(root, 0.09, c.beacon, 1.1, 2.55, -1.15, 6, 5, false);

  root.userData.rig = rig;
  root.userData.height = 3.6;
  root.userData.radius = 4.2;
  return root;
}

/* ---------------------------------------------------------------------------
   Scene props
--------------------------------------------------------------------------- */
function makeWatchtower(team) {
  const c = TEAM_COLORS[team];
  const root = new THREE.Group();
  const legMat = M.gunmetal;
  for (const x of [-0.8, 0.8]) {
    for (const z of [-0.8, 0.8]) {
      const leg = addCyl(root, 0.055, 0.08, 3.4, 5, legMat, x, 1.7, z);
      leg.rotation.z = x * 0.05;
      leg.rotation.x = z * 0.05;
    }
  }
  addBox(root, 2.2, 0.16, 2.2, M.gunmetal, 0, 3.35, 0);
  addBox(root, 2.05, 0.1, 2.05, c.bodyDark, 0, 3.65, 0, false);
  for (const z of [-1.0, 1.0]) addBox(root, 2.05, 0.55, 0.08, c.body, 0, 3.9, z);
  for (const x of [-1.0, 1.0]) addBox(root, 0.08, 0.55, 2.05, c.body, x, 3.9, 0);
  addBox(root, 2.35, 0.1, 2.35, c.bodyDark, 0, 4.25, 0);
  const ladder = addBox(root, 0.1, 3.1, 0.1, M.gunmetalLight, 1.02, 1.7, 0.55, false);
  ladder.rotation.z = -0.18;
  const spot = addCyl(root, 0.15, 0.19, 0.45, 8, M.gunmetal, 0.4, 4.05, 0.8);
  spot.rotation.x = Math.PI / 2;
  addBox(root, 0.1, 0.1, 0.2, c.beacon, 0.4, 4.05, 1.1, false);
  root.userData.radius = 1.3;
  return root;
}

function makeSackWall(length = 5) {
  const group = new THREE.Group();
  const count = Math.ceil(length / 0.66);
  for (let i = 0; i < count; i++) {
    const bag = addBox(group, 0.64, 0.27, 0.64, M.sand, -length / 2 + i * 0.66, 0.16, 0);
    bag.rotation.y = (i % 2 ? 1 : -1) * 0.06;
    if (i % 3 === 1) {
      const bag2 = addBox(group, 0.58, 0.25, 0.6, M.sand, -length / 2 + i * 0.66 + 0.15, 0.42, 0.04);
      bag2.rotation.y = 0.1;
    }
  }
  return group;
}

function makeCrate(size = 0.8) {
  const group = new THREE.Group();
  addBox(group, size, size * 0.72, size, M.sand, 0, size * 0.36, 0);
  addBox(group, size * 0.92, size * 0.08, size * 1.01, M.oliveDark, 0, size * 0.53, 0, false);
  addBox(group, size * 0.08, size * 0.7, size * 1.01, M.oliveDark, 0, size * 0.36, 0, false);
  return group;
}

function makeBarrel() {
  const group = new THREE.Group();
  const barrel = addCyl(group, 0.23, 0.25, 0.78, 10, M.redDark, 0, 0.39, 0);
  addCyl(group, 0.255, 0.255, 0.05, 10, M.gunmetal, 0, 0.18, 0, false);
  addCyl(group, 0.255, 0.255, 0.05, 10, M.gunmetal, 0, 0.6, 0, false);
  return group;
}

function makeTree(scale = 1, tone = 0) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x51432f, roughness: 1, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({
    color: [0x59603d, 0x6a6c42, 0x4b573a][tone % 3],
    roughness: 1,
    flatShading: true,
  });
  addCyl(group, 0.08, 0.13, 1.4 * scale, 5, trunkMat, 0, 0.7 * scale, 0);
  for (let i = 0; i < 3; i++) {
    const blob = addSphere(group, (0.52 - i * 0.08) * scale, leafMat, (i % 2 ? 0.18 : -0.12) * scale, (1.45 + i * 0.28) * scale, (i === 1 ? 0.14 : -0.08) * scale, 6, 5);
    blob.scale.y = 0.82;
    blob.castShadow = true;
  }
  return group;
}

function makeRock(scale = 1) {
  const rock = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x7d7665, roughness: 1, flatShading: true });
  const mesh = addSphere(rock, 0.7 * scale, mat, 0, 0.3 * scale, 0, 5, 4);
  mesh.scale.set(1.3, 0.75, 1.05);
  const chip = addSphere(rock, 0.28 * scale, mat, 0.52 * scale, 0.18 * scale, 0.24 * scale, 4, 3);
  chip.scale.y = 0.7;
  return rock;
}

function makeBush(scale = 1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x62653f, roughness: 1, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const blob = addSphere(group, 0.22 * scale, mat, (i - 1) * 0.2 * scale, 0.16 * scale, (i % 2) * 0.14 * scale, 5, 4);
    blob.scale.y = 0.55;
  }
  return group;
}

function makeTankTrap() {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const beam = addBox(group, 1.1, 0.09, 0.09, M.gunmetal, 0, 0.36, 0);
    beam.rotation.z = 0.6;
    beam.rotation.y = (i / 3) * Math.PI;
  }
  return group;
}

function makeMarkerRing(color = 0xc9ff54) {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.88, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.27, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
  );
  group.add(outer, inner);
  group.userData.outer = outer;
  group.userData.inner = inner;
  return group;
}

export {
  M,
  TEAM_COLORS,
  addBox,
  addCyl,
  addSphere,
  addMuzzle,
  makeSoldier,
  makeHumvee,
  makeTank,
  makeArtillery,
  makeFighter,
  makeBase,
  makeWatchtower,
  makeSackWall,
  makeCrate,
  makeBarrel,
  makeTree,
  makeRock,
  makeBush,
  makeTankTrap,
  makeMarkerRing,
};
