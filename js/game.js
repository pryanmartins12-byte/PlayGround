import * as THREE from '../vendor/three.module.js';
import {
  M, addBox, addCyl, addSphere,
  makeSoldier, makeHumvee, makeTank, makeArtillery, makeFighter, makeBase,
  makeWatchtower, makeSackWall, makeCrate, makeBarrel, makeTree, makeRock, makeBush,
  makeTankTrap, makeMarkerRing,
} from './models.js';
import { SoundSystem } from './audio.js';

/* ---------------------------------------------------------------------------
   Core constants and definitions
--------------------------------------------------------------------------- */
const canvas = document.getElementById('battlefield');
const app = document.getElementById('app');
const sound = new SoundSystem();
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

const FIELD = { minX: -34, maxX: 34, minZ: -15.5, maxZ: 15.5 };
const BASE_PLAYER_X = -27;
const BASE_ENEMY_X = 27;
const DEPLOY = { minX: -32.5, maxX: -14.2, minZ: -13.5, maxZ: 13.5 };
const MAX_CP = 20;
const JET_COOLDOWN = 30;
const PLAYER_CP_RATE = 1.8;

const UNIT_DEFS = {
  rifleman: {
    name: 'RIFLEMAN', role: 'LINE INFANTRY', cost: 2, hp: 95, damage: 8, range: 7,
    interval: 0.82, speed: 3.6, radius: 0.72, reward: 0.55, height: 1.95, weapon: 'rifle',
  },
  sniper: {
    name: 'SNIPER', role: 'LONG RANGE', cost: 3, hp: 75, damage: 36, range: 19,
    interval: 2.55, speed: 2.8, radius: 0.68, reward: 0.7, height: 1.95, weapon: 'sniper',
  },
  humvee: {
    name: 'HUMVEE', role: 'FAST ATTACK', cost: 4, hp: 220, damage: 6, range: 9,
    interval: 0.2, speed: 5.2, radius: 1.32, reward: 0.9, height: 2.25, weapon: 'mg',
  },
  tank: {
    name: 'TANK', role: 'MAIN BATTLE', cost: 6, hp: 560, damage: 55, range: 12,
    interval: 2.3, speed: 3.0, radius: 1.82, reward: 1.5, height: 2.45, weapon: 'cannon', splash: 2.4,
  },
  artillery: {
    name: 'ARTILLERY', role: 'SIEGE SUPPORT', cost: 7, hp: 190, damage: 95, range: 27,
    minRange: 9, interval: 5.4, speed: 1.7, radius: 1.65, reward: 1.4, height: 2.55, weapon: 'artillery', splash: 4.1,
  },
  fighter: {
    name: 'FIGHTER JET', role: 'AIR STRIKE', cost: 8, hp: 1, damage: 0, range: 0,
    interval: 0, speed: 0, radius: 0, reward: 0, height: 0, weapon: 'air',
  },
};

const WAVE_PATTERNS = [
  ['rifleman', 'rifleman', 'humvee'],
  ['rifleman', 'sniper', 'humvee', 'rifleman'],
  ['humvee', 'rifleman', 'tank', 'sniper', 'rifleman'],
  ['tank', 'humvee', 'artillery', 'rifleman', 'rifleman'],
  ['tank', 'tank', 'sniper', 'humvee', 'rifleman'],
  ['tank', 'artillery', 'humvee', 'sniper', 'rifleman', 'rifleman'],
];
const WAVE_NAMES = [
  'MECHANIZED SCOUTS', 'RECON IN FORCE', 'ARMORED SPEARHEAD', 'FIREBASE PUNCH',
  'HEAVY ASSAULT GROUP', 'CITADEL GUARD', 'DESPERATION RESERVES', 'LAST STAND',
];

const state = {
  started: false,
  running: false,
  paused: false,
  gameOver: false,
  selected: null,
  cp: 12,
  cpRate: PLAYER_CP_RATE,
  missionTime: 0,
  wave: 0,
  waveTimer: 10,
  nextAirRaid: 62,
  jetCooldown: 0,
  kills: 0,
  losses: 0,
  deployed: 0,
  cpEarned: 0,
  shake: 0,
  pointerInside: false,
  pointerWorld: new THREE.Vector3(),
  units: [],
  projectiles: [],
  effects: [],
  jets: [],
  pendingSpawns: [],
  pendingEnd: null,
  playerHq: null,
  enemyHq: null,
  helpFrom: 'start',
};

/* ---------------------------------------------------------------------------
   Renderer, scene and camera
--------------------------------------------------------------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc7b48d);
scene.fog = new THREE.Fog(0xcebd9a, 62, 148);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.OrthographicCamera(-40, 40, 30, -30, 0.1, 240);
camera.up.set(0, 1, 0);
const cameraBase = new THREE.Vector3(0, 58, 43);
const view = { portrait: false, height: 60 };

const unitLayer = new THREE.Group();
const barLayer = new THREE.Group();
const projectileLayer = new THREE.Group();
const jetLayer = new THREE.Group();
const fxLayer = new THREE.Group();
const craterLayer = new THREE.Group();
scene.add(unitLayer, barLayer, projectileLayer, jetLayer, fxLayer, craterLayer);

const cursorGroup = new THREE.Group();
const cursorRing = new THREE.Mesh(
  new THREE.RingGeometry(0.72, 0.92, 36),
  new THREE.MeshBasicMaterial({ color: 0xd7ff4f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
);
const cursorInner = new THREE.Mesh(
  new THREE.RingGeometry(0.13, 0.2, 20),
  new THREE.MeshBasicMaterial({ color: 0xd7ff4f, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false })
);
const cursorBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.018, 4, 4),
  new THREE.MeshBasicMaterial({ color: 0xd7ff4f, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
);
const cursorBracketGeo = new THREE.BufferGeometry();
{
  const s = 1.25, l = 0.38, y = 0.05, pts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * s, z = sz * s;
    pts.push(x, y, z, x - sx * l, y, z);
    pts.push(x, y, z, x, y, z - sz * l);
  }
  cursorBracketGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}
const cursorBrackets = new THREE.LineSegments(
  cursorBracketGeo,
  new THREE.LineBasicMaterial({ color: 0xd7ff4f, transparent: true, opacity: 0.7 })
);
cursorRing.rotation.x = -Math.PI / 2;
cursorInner.rotation.x = -Math.PI / 2;
cursorBeam.position.y = 2;
cursorGroup.add(cursorRing, cursorInner, cursorBeam, cursorBrackets);
cursorGroup.visible = false;
scene.add(cursorGroup);

/* ---------------------------------------------------------------------------
   Textures
--------------------------------------------------------------------------- */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,244,204,.95)');
  g.addColorStop(0.46, 'rgba(255,184,82,.38)');
  g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function smokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const rand = mulberry32(77);
  for (let i = 0; i < 20; i++) {
    const x = 28 + rand() * 72;
    const y = 28 + rand() * 72;
    const r = 14 + rand() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.08 + rand() * 0.12})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function dustTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,.85)');
  g.addColorStop(0.5, 'rgba(255,255,255,.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const TEX = { glow: glowTexture(), smoke: smokeTexture(), dust: dustTexture() };

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 740;
  const ctx = c.getContext('2d');
  const rand = mulberry32(9001);
  ctx.fillStyle = '#b29b6d';
  ctx.fillRect(0, 0, 1200, 740);

  for (let i = 0; i < 9500; i++) {
    const x = rand() * 1200, y = rand() * 740;
    const a = 0.025 + rand() * 0.07;
    const shade = rand() > 0.5 ? '95,79,49' : '213,195,152';
    ctx.fillStyle = `rgba(${shade},${a})`;
    const s = 0.6 + rand() * 2.4;
    ctx.fillRect(x, y, s, s);
  }

  for (let i = 0; i < 32; i++) {
    const x = rand() * 1200, y = rand() * 740, r = 35 + rand() * 130;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.6;
    g.addColorStop(0, light ? 'rgba(211,196,153,.08)' : 'rgba(91,82,54,.065)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // The east-west supply road.
  const road = ctx.createLinearGradient(0, 320, 0, 420);
  road.addColorStop(0, 'rgba(130,111,78,0)');
  road.addColorStop(0.18, 'rgba(142,121,84,.7)');
  road.addColorStop(0.5, 'rgba(146,125,89,.82)');
  road.addColorStop(0.82, 'rgba(142,121,84,.7)');
  road.addColorStop(1, 'rgba(130,111,78,0)');
  ctx.fillStyle = road;
  ctx.fillRect(0, 315, 1200, 110);
  ctx.strokeStyle = 'rgba(74,65,45,.3)';
  ctx.lineWidth = 1.2;
  for (const y of [346, 390]) {
    ctx.setLineDash([20, 12, 5, 16]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 1200; x += 34) ctx.lineTo(x, y + Math.sin(x * 0.035) * 2.2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(84,72,50,.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = 330 + rand() * 80;
    ctx.beginPath();
    ctx.moveTo(rand() * 900, y);
    ctx.lineTo(rand() * 300 + 900, y + (rand() - 0.5) * 6);
    ctx.stroke();
  }

  // Stencilled ground markings.
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#4e4b37';
  ctx.font = '700 35px Arial';
  ctx.fillText('FOB ANVIL', 92, 214);
  ctx.textAlign = 'right';
  ctx.fillText('CITADEL', 1111, 566);
  ctx.textAlign = 'left';
  ctx.font = '700 19px Arial';
  ctx.fillText('SECTOR 14 // DUST HAMMER', 92, 586);
  ctx.restore();

  // Fixed old battle damage painted into the terrain.
  for (const [x, y, r] of [[406, 262, 24], [686, 497, 31], [858, 216, 18], [274, 540, 20], [556, 605, 16]]) {
    ctx.fillStyle = 'rgba(61,55,42,.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.62, rand() * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,190,147,.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.15, r * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeGridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(150,210,40,.055)';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(205,255,80,.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(205,255,80,.65)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 253, 253);
  ctx.lineWidth = 6;
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [256, 0, -1, 1], [0, 256, 1, -1], [256, 256, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * 33);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * 33, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------------------------------------------------------------------
   Effects
--------------------------------------------------------------------------- */
function addEffect(life, update, cleanup) {
  const e = { age: 0, life, update, cleanup };
  state.effects.push(e);
  return e;
}

function updateEffects(dt) {
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const e = state.effects[i];
    e.age += dt;
    if (e.age >= e.life) {
      if (e.cleanup) e.cleanup();
      state.effects.splice(i, 1);
      continue;
    }
    if (e.update) e.update(dt, e);
  }
}

function addSprite(tex, color, position, size, life, options = {}) {
  const material = new THREE.SpriteMaterial({
    map: tex,
    color,
    transparent: true,
    opacity: options.opacity ?? 0.85,
    depthWrite: false,
    blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.setScalar(size);
  fxLayer.add(sprite);
  const vel = options.velocity || new THREE.Vector3();
  const grow = options.grow || 0;
  addEffect(life, (dt, e) => {
    const t = e.age / e.life;
    sprite.position.addScaledVector(vel, dt);
    if (options.gravity) vel.y -= options.gravity * dt;
    const s = size + grow * t;
    sprite.scale.setScalar(s);
    material.opacity = (options.opacity ?? 0.85) * (1 - t) ** (options.fadePower ?? 1);
  }, () => {
    fxLayer.remove(sprite);
    material.dispose();
  });
  return sprite;
}

function spawnMuzzleFlash(position, scale = 0.55, color = 0xffd47a) {
  addSprite(TEX.glow, color, position, scale, 0.08, { additive: true, opacity: 1, fadePower: 1.6 });
}

function spawnBeam(from, to, color = 0xffdc92, width = 0.045, life = 0.11) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  if (length < 0.01) return;
  const geo = new THREE.BoxGeometry(length, width, width);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
  fxLayer.add(mesh);
  addEffect(life, (dt, e) => {
    mat.opacity = 0.9 * (1 - e.age / e.life);
  }, () => {
    fxLayer.remove(mesh);
    geo.dispose();
    mat.dispose();
  });
}

function spawnImpact(position, color = 0xffca7a, size = 0.45) {
  addSprite(TEX.glow, color, position, size, 0.16, {
    additive: true, opacity: 0.85, grow: size * 0.8,
  });
  const dustPos = position.clone();
  dustPos.y = Math.max(0.15, dustPos.y);
  addSprite(TEX.dust, 0xc3ae83, dustPos, size * 0.9, 0.32, {
    opacity: 0.32, grow: size * 2.2, velocity: new THREE.Vector3(0, 0.35, 0), fadePower: 1.4,
  });
}

function spawnDust(position, scale = 0.7, count = 1, color = 0xbaa57b) {
  for (let i = 0; i < count; i++) {
    const p = position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.1, (Math.random() - 0.5) * 0.8));
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.28 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8);
    addSprite(TEX.dust, color, p, scale * (0.7 + Math.random() * 0.5), 0.65 + Math.random() * 0.45, {
      opacity: 0.27, grow: scale * 1.8, velocity: v, fadePower: 1.5,
    });
  }
}

function spawnSmokePuff(position, scale = 1, life = 1.6, color = 0x39352c) {
  const p = position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.55, 0, (Math.random() - 0.5) * 0.55));
  const v = new THREE.Vector3((Math.random() - 0.5) * 0.35, 0.55 + Math.random() * 0.5, (Math.random() - 0.5) * 0.35);
  addSprite(TEX.smoke, color, p, scale * (0.65 + Math.random() * 0.5), life, {
    opacity: 0.24, grow: scale * 2.2, velocity: v, fadePower: 1.4,
  });
}

function addCrater(x, z, radius = 1.2) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x4d4435, transparent: true, opacity: 0.38, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.035, z);
  craterLayer.add(mesh);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x6d624b, transparent: true, opacity: 0.22, depthWrite: false });
  const rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.88, radius * 1.12, 18), rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(x, 0.037, z);
  craterLayer.add(rim);

  while (craterLayer.children.length > 56) {
    const old = craterLayer.children[0];
    craterLayer.remove(old);
    old.geometry.dispose();
    old.material.dispose();
  }
}

function spawnExplosion(position, size = 1, options = {}) {
  const p = position.clone();
  p.y = Math.max(0.2, p.y);
  const flash = p.clone();
  flash.y += 0.4 * size;
  addSprite(TEX.glow, options.color || 0xffb25a, flash, 2.6 * size, 0.2, {
    additive: true, opacity: 1, grow: 2.4 * size, fadePower: 1.3,
  });

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff8b42, transparent: true, opacity: 0.72, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.52, 26), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(p.x, 0.08, p.z);
  fxLayer.add(ring);
  addEffect(0.55, (dt, e) => {
    const t = e.age / e.life;
    ring.scale.setScalar(1 + t * 5.5 * size);
    ringMat.opacity = 0.72 * (1 - t);
  }, () => { fxLayer.remove(ring); ring.geometry.dispose(); ringMat.dispose(); });

  const fireMat = new THREE.MeshBasicMaterial({
    color: 0xff8036, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const fire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), fireMat);
  fire.position.copy(p);
  fire.scale.setScalar(size);
  fxLayer.add(fire);
  addEffect(0.46, (dt, e) => {
    const t = e.age / e.life;
    fire.scale.setScalar(size * (1 + t * 1.9));
    fireMat.opacity = 0.7 * (1 - t);
    fire.position.y = p.y + t * 0.55;
  }, () => { fxLayer.remove(fire); fire.geometry.dispose(); fireMat.dispose(); });

  const puffs = Math.round(4 + size * 3);
  for (let i = 0; i < puffs; i++) {
    spawnSmokePuff(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * size, 0.2 + Math.random() * 0.6 * size, (Math.random() - 0.5) * size)), size * 1.1, 1.2 + Math.random() * 0.9);
  }

  if (size >= 0.9) {
    for (let i = 0; i < 4 + Math.floor(size * 2); i++) {
      const geo = new THREE.BoxGeometry(0.08 + Math.random() * 0.13, 0.06 + Math.random() * 0.1, 0.08 + Math.random() * 0.12);
      const mat = new THREE.MeshBasicMaterial({ color: 0x342e24, transparent: true, opacity: 0.9 });
      const debris = new THREE.Mesh(geo, mat);
      debris.position.copy(p);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 9, 3 + Math.random() * 6, (Math.random() - 0.5) * 9);
      fxLayer.add(debris);
      addEffect(0.65 + Math.random() * 0.5, (dt) => {
        debris.position.addScaledVector(vel, dt);
        vel.y -= 18 * dt;
        if (debris.position.y < 0.04) { debris.position.y = 0.04; vel.y *= -0.24; vel.x *= 0.7; vel.z *= 0.7; }
        debris.rotation.x += dt * 8;
        debris.rotation.z += dt * 6;
        mat.opacity = Math.max(0, mat.opacity - dt * 1.1);
      }, () => { fxLayer.remove(debris); geo.dispose(); mat.dispose(); });
    }
  }

  if (size >= 1.2) {
    const light = new THREE.PointLight(0xff9a43, 70 * size, 15, 2);
    light.position.copy(p).add(new THREE.Vector3(0, 1.1, 0));
    fxLayer.add(light);
    addEffect(0.28, (dt, e) => {
      light.intensity = 70 * size * (1 - e.age / e.life) ** 2;
    }, () => { fxLayer.remove(light); });
  }

  if (options.crater !== false) addCrater(p.x, p.z, 0.8 + size * 0.65);
  state.shake = Math.max(state.shake, Math.min(1.5, 0.12 + size * 0.2));
  sound.explosion(p.x / 34, size);
}

function spawnDeployRing(x, z, color = 0xd7ff4f) {
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.78, 30), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.08, z);
  fxLayer.add(ring);
  addEffect(0.65, (dt, e) => {
    const t = e.age / e.life;
    ring.scale.setScalar(1 + t * 2.8);
    mat.opacity = 0.85 * (1 - t);
  }, () => { fxLayer.remove(ring); ring.geometry.dispose(); mat.dispose(); });
  spawnDust(new THREE.Vector3(x, 0.08, z), 0.85, 6, 0xc2ae82);
}

function spawnTargetMarker(x, z, color = 0xffb547, life = 1.8) {
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.55, 36), mat);
  ring.rotation.x = -Math.PI / 2;
  const crossMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.04), crossMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.y = 0.01;
    if (s > 0) bar.rotation.z = Math.PI / 2;
    group.add(bar);
  }
  group.add(ring);
  group.position.set(x, 0.07, z);
  fxLayer.add(group);
  addEffect(life, (dt, e) => {
    const t = e.age / e.life;
    group.rotation.y += dt * 0.8;
    ring.scale.setScalar(1 + Math.sin(t * Math.PI * 6) * 0.06);
    mat.opacity = 0.9 * Math.min(1, (1 - t) * 2);
    crossMat.opacity = 0.55 * Math.min(1, (1 - t) * 2);
  }, () => {
    fxLayer.remove(group);
    ring.geometry.dispose();
    mat.dispose();
    crossMat.dispose();
    group.children.forEach(c => { if (c.geometry) c.geometry.dispose(); });
  });
}
