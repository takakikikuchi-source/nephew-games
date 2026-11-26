// 運転席から見える3Dの世界。1kmごとの「チャンク」に分けて、近くだけ作る。
// 空（Sky）・太陽の影・写真の素材（CC0）で、なるべく本物に近い見た目にする。
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RIVERS, ROUTE_LENGTH, SEGMENTS, STATIONS, STATION_POS, TUNNELS, segmentIndexAt, type Span } from './data';
import ballastUrl from './assets/ballast.jpg';
import ballastNorUrl from './assets/ballast_nor.jpg';
import grassUrl from './assets/grass.jpg';
import concreteUrl from './assets/concrete.jpg';

// ---------------- 線路の形（ゆるいカーブ） ----------------
const curveX = (s: number) => 140 * Math.sin(s / 2300 + 0.4) + 80 * Math.sin(s / 760 + 1.9) + 18 * Math.sin(s / 330);
const curveDX = (s: number) => (140 / 2300) * Math.cos(s / 2300 + 0.4) + (80 / 760) * Math.cos(s / 760 + 1.9) + (18 / 330) * Math.cos(s / 330);

export function pathPos(s: number, lateral = 0, y = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const dx = curveDX(s);
  const n = Math.sqrt(dx * dx + 1);
  return out.set(curveX(s) + lateral / n, y, -s + (lateral * dx) / n);
}
export const pathYaw = (s: number) => -Math.atan(curveDX(s));

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHUNK = 1000;
const OTHER = 4.3; // となりの線路
const inSpan = (s: number, spans: Span[], pad = 0) => spans.some((t) => s >= t.from - pad && s <= t.to + pad);
const RIVER_SPANS: Span[] = RIVERS.map((r) => ({ from: r.at - 90, to: r.at + 90 }));
const PLATFORMS: (Span & { st: number })[] = STATION_POS.map((p, i) => ({ from: p - 410, to: p + 20, st: i }));

export function regionAt(s: number): 'urban' | 'town' | 'rural' {
  let best = 0;
  let bd = Infinity;
  STATION_POS.forEach((p, i) => {
    const d = Math.abs(p - s);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  if (bd < 2200) return STATIONS[best].region;
  const seg = segmentIndexAt(s);
  if (STATIONS[seg].region === 'urban' && STATIONS[seg + 1]?.region === 'urban') return 'urban';
  return 'rural';
}

// ---------------- テクスチャ ----------------
const texLoader = new THREE.TextureLoader();
function photo(url: string, repeat: number, srgb = true): THREE.Texture {
  const t = texLoader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// まくら木（コンクリート）。すきまは透明にして、下の砂利が見えるようにする
function sleeperTexture(): THREE.CanvasTexture {
  return canvasTex(
    128,
    64,
    (g) => {
      g.clearRect(0, 0, 128, 64);
      const r = rng(5);
      g.fillStyle = '#a9a69e';
      g.fillRect(10, 4, 108, 26);
      for (let i = 0; i < 260; i++) {
        const v = 140 + Math.floor(r() * 50);
        g.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
        g.fillRect(10 + r() * 108, 4 + r() * 26, 2, 2);
      }
      g.fillStyle = '#6f6c66';
      g.fillRect(10, 28, 108, 3);
      g.fillStyle = '#3d3a36';
      g.fillRect(36, 12, 6, 10);
      g.fillRect(86, 12, 6, 10);
    },
    true,
  );
}

// ビルの窓。タイプごとに1枚
function facadeTexture(cols: number, rows: number, seed: number, glass: string): THREE.CanvasTexture {
  return canvasTex(256, 256, (g) => {
    const r = rng(seed);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 256);
    const cw = 256 / cols;
    const rh = 256 / rows;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const lit = r();
        g.fillStyle = lit < 0.15 ? '#9fb7c9' : glass;
        g.fillRect(x * cw + cw * 0.14, y * rh + rh * 0.22, cw * 0.72, rh * 0.56);
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.fillRect(x * cw + cw * 0.14, y * rh + rh * 0.22, cw * 0.72, rh * 0.08);
      }
  });
}

function tactileTexture(): THREE.CanvasTexture {
  return canvasTex(
    64,
    64,
    (g) => {
      g.fillStyle = '#f2c230';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#d9a91a';
      for (let y = 8; y < 64; y += 16) for (let x = 8; x < 64; x += 16) g.fillRect(x - 3, y - 3, 6, 6);
    },
    true,
  );
}

const signCache = new Map<number, THREE.CanvasTexture>();
export function stationSignTexture(i: number): THREE.CanvasTexture {
  const hit = signCache.get(i);
  if (hit) return hit;
  const st = STATIONS[i];
  const prev = STATIONS[i - 1];
  const next = STATIONS[i + 1];
  const t = canvasTex(512, 200, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 512, 200);
    g.fillStyle = '#1c5fb8';
    g.fillRect(0, 138, 512, 10);
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.font = 'bold 34px "BIZ UDPGothic","Meiryo",sans-serif';
    g.fillText(st.kanji, 256, 42);
    g.font = 'bold 72px "BIZ UDPGothic","Meiryo",sans-serif';
    g.fillText(st.yomi, 256, 122, 490);
    g.font = '26px "BIZ UDPGothic","Meiryo",sans-serif';
    g.textAlign = 'left';
    if (prev) g.fillText(`◀ ${prev.yomi}`, 12, 186);
    g.textAlign = 'right';
    if (next) g.fillText(`${next.yomi} ▶`, 500, 186);
  });
  signCache.set(i, t);
  return t;
}

const stopSignTex = canvasTex(128, 160, (g) => {
  g.fillStyle = '#ffd43b';
  g.fillRect(0, 0, 128, 160);
  g.fillStyle = '#111';
  g.fillRect(8, 8, 112, 112);
  g.fillStyle = '#fff';
  g.font = 'bold 76px sans-serif';
  g.textAlign = 'center';
  g.fillText('16', 64, 92);
  g.fillStyle = '#111';
  g.font = 'bold 26px "BIZ UDPGothic",sans-serif';
  g.fillText('とまる', 64, 150);
});

// ---------------- 形を作る道具 ----------------
function ribbon(origin: THREE.Vector3, s0: number, s1: number, step: number, profile: [number, number][], uvAlong = 0, uvAcross = 0): THREE.BufferGeometry {
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  const P = profile.length;
  const pos = new Float32Array((n + 1) * P * 3);
  const uv = new Float32Array((n + 1) * P * 2);
  const v = new THREE.Vector3();
  // 横方向のUV：uvAcross>0 なら距離(m)で、0 なら 0〜1
  const across: number[] = [0];
  for (let j = 1; j < P; j++) across.push(across[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
  for (let i = 0; i <= n; i++) {
    const s = Math.min(s1, s0 + i * step);
    for (let j = 0; j < P; j++) {
      pathPos(s, profile[j][0], profile[j][1], v).sub(origin);
      const k = (i * P + j) * 3;
      pos[k] = v.x;
      pos[k + 1] = v.y;
      pos[k + 2] = v.z;
      uv[(i * P + j) * 2] = uvAcross ? across[j] / uvAcross : j / Math.max(1, P - 1);
      uv[(i * P + j) * 2 + 1] = uvAlong ? (s - s0) / uvAlong : 0;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < P - 1; j++) {
      const a = i * P + j;
      const b = a + P;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function subtract(a: number, b: number, cut: Span[]): Span[] {
  let parts: Span[] = [{ from: a, to: b }];
  for (const c of cut) {
    const next: Span[] = [];
    for (const p of parts) {
      if (c.to <= p.from || c.from >= p.to) next.push(p);
      else {
        if (c.from > p.from) next.push({ from: p.from, to: c.from });
        if (c.to < p.to) next.push({ from: c.to, to: p.to });
      }
    }
    parts = next;
  }
  return parts.filter((p) => p.to - p.from > 1);
}

function intersect(a: number, b: number, spans: Span[]): Span[] {
  return spans.map((t) => ({ from: Math.max(a, t.from), to: Math.min(b, t.to) })).filter((p) => p.to - p.from > 1);
}

// ---------------- 材質（PBR） ----------------
const T = {
  ballast: photo(ballastUrl, 1),
  ballastNor: photo(ballastNorUrl, 1, false),
  grass: photo(grassUrl, 1),
  concrete: photo(concreteUrl, 1),
};
const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
const M = {
  ballast: std({ map: T.ballast, normalMap: T.ballastNor, normalScale: new THREE.Vector2(1.2, 1.2), side: THREE.DoubleSide }),
  sleeper: std({ map: sleeperTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 }),
  rail: std({ color: '#b9bec4', metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide }),
  bank: std({ map: T.ballast, color: '#9a958a', side: THREE.DoubleSide }),
  concrete: std({ map: T.concrete, color: '#d8d6cf', side: THREE.DoubleSide }),
  wall: std({ map: T.concrete, color: '#e3e5e6', side: THREE.DoubleSide }),
  pole: std({ color: '#8a939b', metalness: 0.55, roughness: 0.45 }),
  footing: std({ map: T.concrete, color: '#cfccc4' }),
  wire: new THREE.LineBasicMaterial({ color: '#2b2b2b' }),
  platform: std({ map: T.concrete, color: '#e6e1d6', side: THREE.DoubleSide }),
  tactile: std({ map: tactileTexture(), side: THREE.DoubleSide, roughness: 0.7 }),
  white: std({ color: '#f4f4f0', side: THREE.DoubleSide }),
  roof: std({ color: '#c9d0d6', metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }),
  tunnel: std({ map: T.concrete, color: '#6e6c66', side: THREE.DoubleSide }),
  lamp: new THREE.MeshBasicMaterial({ color: '#ffe8a3' }),
  hill: std({ map: T.grass, color: '#6f9a55', side: THREE.DoubleSide }),
  water: std({ color: '#2f6f9e', roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide }),
  sand: std({ color: '#e0cfa0', side: THREE.DoubleSide }),
  officeLow: std({ map: facadeTexture(6, 4, 3, '#3d5163'), roughness: 0.6 }),
  officeHigh: std({ map: facadeTexture(6, 12, 7, '#33475a'), roughness: 0.5 }),
  house: std({ map: facadeTexture(3, 2, 11, '#4a5560'), roughness: 0.85 }),
  roofTile: std({ roughness: 0.75 }),
  trunk: std({ color: '#5a4632' }),
  tree: std({ roughness: 1 }),
  field: std({ map: T.grass, color: '#b5d18c', roughness: 1 }),
  mountain: std({ color: '#5e7d5a', roughness: 1 }),
  person: std({ roughness: 0.8 }),
  sign: new THREE.MeshBasicMaterial({ map: stopSignTex, side: THREE.DoubleSide }),
};
M.field.map = T.grass;
const SHARED_MATS = new Set<THREE.Material>(Object.values(M));

// 三角屋根（切妻）の形
function gableGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0, 0.5);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

// でこぼこした山
function mountainGeometry(): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(1, 1, 28, 6);
  const p = g.attributes.position as THREE.BufferAttribute;
  const r = rng(42);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0.49) continue;
    const k = 0.75 + r() * 0.5;
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
    p.setY(i, y + (r() - 0.5) * 0.08);
  }
  g.computeVertexNormals();
  return g;
}

// もこもこした木の葉
function crownGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  const r = rng(9);
  for (let i = 0; i < p.count; i++) {
    const k = 0.85 + r() * 0.3;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 1.15, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  gable: gableGeometry(),
  crown: crownGeometry(),
  trunk: new THREE.CylinderGeometry(0.12, 0.16, 1, 6),
  person: new THREE.CapsuleGeometry(0.22, 1.0, 3, 6),
  mountain: mountainGeometry(),
};
const SHARED_GEOS = new Set<THREE.BufferGeometry>(Object.values(G));

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const tmpC = new THREE.Color();

interface Item {
  p: THREE.Vector3;
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
  color?: string;
}

function placeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: Item[], cast = false, receive = false): THREE.InstancedMesh | null {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    tmpQ.setFromAxisAngle(UP, it.yaw);
    tmpS.set(it.sx, it.sy, it.sz);
    tmpM.compose(it.p, tmpQ, tmpS);
    mesh.setMatrixAt(i, tmpM);
    if (it.color) mesh.setColorAt(i, tmpC.set(it.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.computeBoundingSphere();
  return mesh;
}

const BUILD_COLORS = ['#d9d4ca', '#c8c2b6', '#b9bec4', '#e2ddd2', '#aeb4bb', '#d6c9b4', '#a4adb6', '#e6e2d8'];
const HOUSE_COLORS = ['#f2ede2', '#e6dccb', '#d9d4c8', '#efe6d4', '#cdd2d6'];
const ROOF_COLORS = ['#4f5661', '#6e4637', '#38506c', '#5e5e5e', '#7a4f3c', '#3b4a3a'];
const TREE_COLORS = ['#3e6e35', '#4a7a3b', '#35602f', '#557f43', '#2f5a2c'];
const PEOPLE_COLORS = ['#e03131', '#1c7ed6', '#f08c00', '#2f9e44', '#7048e8', '#495057', '#f783ac', '#212529', '#ffd43b'];

// ---------------- チャンクを作る ----------------
interface Chunk {
  group: THREE.Group;
  people: Map<number, THREE.InstancedMesh>;
}

function buildChunk(k: number): Chunk {
  const s0 = k * CHUNK;
  const s1 = Math.min(ROUTE_LENGTH, s0 + CHUNK);
  const origin = pathPos(s0);
  const group = new THREE.Group();
  group.position.copy(origin);
  const people = new Map<number, THREE.InstancedMesh>();
  const at = (s: number, lat: number, y: number) => pathPos(s, lat, y, new THREE.Vector3()).sub(origin);
  const R = (a: number, b: number, step: number, prof: [number, number][], mat: THREE.Material, uvAlong = 0, uvAcross = 0, cast = false) => {
    const m = new THREE.Mesh(ribbon(origin, a, b, step, prof, uvAlong, uvAcross), mat);
    m.receiveShadow = true;
    m.castShadow = cast;
    group.add(m);
  };
  const addInst = (geo: THREE.BufferGeometry, mat: THREE.Material, items: Item[], cast = false, receive = false) => {
    const m = placeInstanced(geo, mat, items, cast, receive);
    if (m) group.add(m);
    return m;
  };

  const tunnels = intersect(s0, s1, TUNNELS);
  const rivers = intersect(s0, s1, RIVER_SPANS);
  const platforms = PLATFORMS.filter((p) => p.to > s0 && p.from < s1);
  const open = subtract(s0, s1, [...TUNNELS, ...RIVER_SPANS]);

  // 線路（2本）：砂利・まくら木・レール
  for (const off of [0, OTHER]) {
    R(s0, s1, 10, [[off - 1.9, 0.0], [off - 1.5, 0.1], [off + 1.5, 0.1], [off + 1.9, 0.0]], M.ballast, 3.4, 3.4);
    R(s0, s1, 10, [[off - 1.3, 0.13], [off + 1.3, 0.13]], M.sleeper, 0.625);
    for (const r of [-0.7175, 0.7175])
      R(s0, s1, 10, [[off + r - 0.04, 0.13], [off + r - 0.035, 0.29], [off + r + 0.035, 0.29], [off + r + 0.04, 0.13]], M.rail);
  }
  // 盛り土
  for (const p of open) R(p.from, p.to, 20, [[-10, -2.4], [-2.2, 0], [OTHER + 2.2, 0], [OTHER + 10, -2.4]], M.bank, 6, 6);
  // 橋と川
  for (const p of rivers) {
    R(p.from, p.to, 10, [[-3.1, -1.6], [-3.1, 1.0]], M.concrete, 4, 4);
    R(p.from, p.to, 10, [[OTHER + 3.1, -1.6], [OTHER + 3.1, 1.0]], M.concrete, 4, 4);
    R(p.from, p.to, 10, [[-3.1, -1.6], [OTHER + 3.1, -1.6]], M.concrete, 4, 4);
    const piers: Item[] = [];
    for (let s = Math.ceil(p.from / 40) * 40; s < p.to; s += 40) piers.push({ p: at(s, OTHER / 2, -2.8), yaw: pathYaw(s), sx: 12, sy: 2.4, sz: 2.2 });
    addInst(G.box, M.concrete, piers, true, true);
    R(p.from - 20, p.to + 20, 20, [[-3000, -2.3], [3000, -2.3]], M.water);
  }
  // 防音壁（まちの中）
  for (const p of subtract(s0, s1, [...TUNNELS, ...RIVER_SPANS, ...PLATFORMS])) {
    if (regionAt((p.from + p.to) / 2) === 'urban') {
      R(p.from, p.to, 20, [[-3.6, 0], [-3.6, 2.2]], M.wall, 4, 4, true);
      R(p.from, p.to, 20, [[OTHER + 3.6, 0], [OTHER + 3.6, 2.2]], M.wall, 4, 4, true);
    }
  }
  // 架線柱（門の形）と架線
  const poles: Item[] = [];
  const beams: Item[] = [];
  const arms: Item[] = [];
  const foots: Item[] = [];
  for (let s = Math.ceil(s0 / 50) * 50; s < s1; s += 50) {
    if (inSpan(s, TUNNELS)) continue;
    const yaw = pathYaw(s);
    for (const lat of [-3.9, OTHER + 3.9]) {
      poles.push({ p: at(s, lat, 3.7), yaw, sx: 0.3, sy: 7.6, sz: 0.3 });
      foots.push({ p: at(s, lat, 0.0), yaw, sx: 0.8, sy: 0.6, sz: 0.8 });
    }
    beams.push({ p: at(s, OTHER / 2, 7.2), yaw, sx: OTHER + 8.2, sy: 0.32, sz: 0.32 });
    beams.push({ p: at(s, OTHER / 2, 6.7), yaw, sx: OTHER + 8.2, sy: 0.14, sz: 0.14 });
    for (const off of [0, OTHER]) arms.push({ p: at(s, off, 6.2), yaw, sx: 0.08, sy: 1.0, sz: 0.08 });
  }
  addInst(G.box, M.pole, poles, true);
  addInst(G.box, M.pole, beams, true);
  addInst(G.box, M.pole, arms);
  addInst(G.box, M.footing, foots, false, true);
  for (const off of [0, OTHER])
    for (const h of [5.25, 6.4]) {
      const pts: THREE.Vector3[] = [];
      for (let s = s0; s <= s1; s += 25) pts.push(at(s, off, h + (h > 6 ? 0.15 * Math.sin(((s % 50) / 50) * Math.PI) * -1 : 0)));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), M.wire));
    }

  // トンネル
  for (const t of tunnels) {
    const prof: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (Math.PI * i) / 12;
      prof.push([OTHER / 2 + 6.4 * Math.cos(a), -0.3 + 7.6 * Math.sin(a)]);
    }
    R(t.from, t.to, 10, prof, M.tunnel, 4, 4);
    R(t.from, t.to, 20, [[OTHER / 2 - 6.5, -0.02], [OTHER / 2 + 6.5, -0.02]], M.tunnel, 4, 4);
    const lamps: Item[] = [];
    for (let s = Math.ceil(t.from / 40) * 40; s < t.to; s += 40) lamps.push({ p: at(s, -3.4, 3.2), yaw: pathYaw(s), sx: 0.25, sy: 0.25, sz: 1.2 });
    addInst(G.box, M.lamp, lamps);
    R(t.from, t.to, 20, [[-280, -2.5], [-90, 34], [-14, 15], [OTHER + 14, 15], [100, 34], [280, -2.5]], M.hill, 40, 40);
  }
  for (const t of TUNNELS) {
    for (const edge of [t.from, t.to]) {
      if (edge < s0 || edge >= s1) continue;
      const yaw = pathYaw(edge);
      addInst(
        G.box,
        M.concrete,
        [
          { p: at(edge, -5.2, 3.6), yaw, sx: 2.4, sy: 9, sz: 3 },
          { p: at(edge, OTHER + 5.2, 3.6), yaw, sx: 2.4, sy: 9, sz: 3 },
          { p: at(edge, OTHER / 2, 8.6), yaw, sx: OTHER + 13, sy: 2.6, sz: 3 },
        ],
        true,
        true,
      );
    }
  }

  // 駅
  for (const pl of platforms) {
    const a = Math.max(s0, pl.from);
    const b = Math.min(s1, pl.to);
    R(a, b, 10, [[-12, 1.25], [-2.9, 1.25]], M.platform, 4, 4);
    R(a, b, 10, [[-2.9, 1.26], [-2.3, 1.26]], M.tactile, 0.6, 0.6);
    R(a, b, 10, [[-2.3, 1.25], [-1.8, 1.25], [-1.8, -0.3]], M.white, 4, 4);
    R(a, b, 10, [[OTHER + 1.8, -0.3], [OTHER + 1.8, 1.25], [OTHER + 2.3, 1.25]], M.white, 4, 4);
    R(a, b, 10, [[OTHER + 2.3, 1.26], [OTHER + 2.9, 1.26]], M.tactile, 0.6, 0.6);
    R(a, b, 10, [[OTHER + 2.9, 1.25], [OTHER + 13, 1.25]], M.platform, 4, 4);
    R(a, b, 10, [[-12, 5.2], [-7, 5.8], [-1.2, 5.4]], M.roof, 0, 0, true);
    R(a, b, 10, [[OTHER + 1.2, 5.4], [OTHER + 8, 5.8], [OTHER + 13, 5.2]], M.roof, 0, 0, true);
    const pillars: Item[] = [];
    for (let s = Math.ceil(a / 20) * 20; s < b; s += 20) {
      pillars.push({ p: at(s, -7, 3.4), yaw: pathYaw(s), sx: 0.4, sy: 4.4, sz: 0.4 });
      pillars.push({ p: at(s, OTHER + 8, 3.4), yaw: pathYaw(s), sx: 0.4, sy: 4.4, sz: 0.4 });
    }
    addInst(G.box, M.pole, pillars, true);
    const signMat = new THREE.MeshBasicMaterial({ map: stationSignTexture(pl.st), side: THREE.DoubleSide });
    for (const off of [-380, -250, -120, 5]) {
      const s = pl.to - 20 + off;
      if (s < a || s >= b) continue;
      for (const lat of [-6.5, OTHER + 7.5]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.4), signMat);
        pathPos(s, lat, 3.9, m.position).sub(origin);
        m.rotation.y = pathYaw(s);
        group.add(m);
      }
    }
    const stop = STATION_POS[pl.st];
    if (stop >= a && stop < b) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), M.sign);
      pathPos(stop, -2.3, 2.3, m.position).sub(origin);
      m.rotation.y = pathYaw(stop);
      group.add(m);
      addInst(G.box, M.pole, [{ p: at(stop, -2.3, 1.5), yaw: pathYaw(stop), sx: 0.08, sy: 0.7, sz: 0.08 }]);
    }
    const r = rng(pl.st * 31 + k);
    const count = Math.round((STATIONS[pl.st].size * 45 * (b - a)) / 430);
    const ppl: Item[] = [];
    for (let i = 0; i < count; i++) ppl.push({ p: at(a + r() * (b - a), -3.4 - r() * 6, 2.0), yaw: 0, sx: 1, sy: 1, sz: 1, color: PEOPLE_COLORS[Math.floor(r() * PEOPLE_COLORS.length)] });
    const pm = addInst(G.person, M.person, ppl, true);
    if (pm) people.set(pl.st, pm);
    const other: Item[] = [];
    for (let i = 0; i < count / 3; i++) other.push({ p: at(a + r() * (b - a), OTHER + 3.4 + r() * 6, 2.0), yaw: 0, sx: 1, sy: 1, sz: 1, color: PEOPLE_COLORS[Math.floor(r() * PEOPLE_COLORS.length)] });
    addInst(G.person, M.person, other, true);
  }

  // 景色
  const r = rng(k * 7919 + 13);
  const seg = SEGMENTS[segmentIndexAt((s0 + s1) / 2)];
  const region = regionAt((s0 + s1) / 2);
  const low: Item[] = [];
  const high: Item[] = [];
  const houses: Item[] = [];
  const roofs: Item[] = [];
  const trunks: Item[] = [];
  const crowns: Item[] = [];
  const fields: Item[] = [];
  const waterLeft = !!(seg.sea || seg.lake);
  if (waterLeft) {
    R(s0, s1, 25, [[-3000, -2.3], [-70, -2.3]], M.water);
    R(s0, s1, 25, [[-70, -2.25], [-24, -2.2]], M.sand);
  }
  const dens = region === 'urban' ? 70 : region === 'town' ? 40 : 20;
  for (let i = 0; i < dens; i++) {
    const s = s0 + r() * (s1 - s0);
    if (inSpan(s, TUNNELS, 60)) continue;
    const left = r() < 0.5;
    if (left && waterLeft) continue;
    const dist = 24 + Math.pow(r(), 1.5) * 420;
    const lat = left ? -dist : OTHER + dist;
    const yaw = pathYaw(s) + (r() - 0.5) * 0.25;
    const isBldg = region === 'urban' ? r() < 0.7 : region === 'town' ? r() < 0.25 : false;
    if (isBldg) {
      const h = 9 + r() * (region === 'urban' ? 60 : 16);
      const item = { p: at(s, lat, h / 2 - 2.5), yaw, sx: 12 + r() * 22, sy: h, sz: 12 + r() * 16, color: BUILD_COLORS[Math.floor(r() * BUILD_COLORS.length)] };
      (h > 28 ? high : low).push(item);
    } else {
      const w = 7 + r() * 4;
      const d = 8 + r() * 4;
      const h = 5.5 + r() * 2;
      houses.push({ p: at(s, lat, h / 2 - 2.5), yaw, sx: w, sy: h, sz: d, color: HOUSE_COLORS[Math.floor(r() * HOUSE_COLORS.length)] });
      roofs.push({ p: at(s, lat, h - 2.5), yaw, sx: w * 1.12, sy: 3.4, sz: d * 1.1, color: ROOF_COLORS[Math.floor(r() * ROOF_COLORS.length)] });
    }
  }
  const treeN = region === 'urban' ? 30 : 110;
  for (let i = 0; i < treeN; i++) {
    const s = s0 + r() * (s1 - s0);
    if (inSpan(s, TUNNELS, 40)) continue;
    const left = r() < 0.5;
    if (left && waterLeft) continue;
    const dist = 14 + Math.pow(r(), 1.3) * 500;
    const h = 7 + r() * 9;
    const lat = left ? -dist : OTHER + dist;
    trunks.push({ p: at(s, lat, -2.5 + h * 0.25), yaw: 0, sx: h * 0.12, sy: h * 0.5, sz: h * 0.12 });
    crowns.push({ p: at(s, lat, -2.5 + h * 0.62), yaw: r() * 6, sx: h * 0.34, sy: h * 0.36, sz: h * 0.34, color: TREE_COLORS[Math.floor(r() * TREE_COLORS.length)] });
  }
  if (region !== 'urban') {
    const n = seg.tea ? 40 : 14;
    for (let i = 0; i < n; i++) {
      const s = s0 + r() * (s1 - s0);
      const left = r() < 0.5;
      if ((left && waterLeft) || inSpan(s, TUNNELS, 60)) continue;
      const dist = 20 + r() * 260;
      if (seg.tea) {
        for (let j = 0; j < 6; j++)
          crowns.push({ p: at(s, left ? -(dist + j * 3) : OTHER + dist + j * 3, -1.9), yaw: pathYaw(s), sx: 0.9, sy: 0.7, sz: 20, color: '#2f6b2a' });
      } else {
        fields.push({ p: at(s, left ? -dist : OTHER + dist, -2.2), yaw: pathYaw(s), sx: 40 + r() * 40, sy: 0.1, sz: 50 + r() * 60, color: ['#b7cf8a', '#9fbf6f', '#c9c27a', '#a8c27a'][Math.floor(r() * 4)] });
      }
    }
  }
  addInst(G.box, M.officeLow, low, true, true);
  addInst(G.box, M.officeHigh, high, true, true);
  addInst(G.box, M.house, houses, true, true);
  addInst(G.gable, M.roofTile, roofs, true);
  addInst(G.trunk, M.trunk, trunks, true);
  addInst(G.crown, M.tree, crowns, true);
  addInst(G.box, M.field, fields, false, true);
  if (seg.mountains || region === 'rural') {
    const mts: Item[] = [];
    for (let i = 0; i < 3; i++) {
      const s = s0 + r() * (s1 - s0);
      const left = r() < 0.5;
      if (left && waterLeft) continue;
      const dist = 1600 + r() * 2600;
      const h = 300 + r() * 700;
      mts.push({ p: at(s, left ? -dist : dist, h / 2 - 2.5), yaw: r() * 6, sx: h * 2.6, sy: h, sz: h * 2.3 });
    }
    addInst(G.mountain, M.mountain, mts);
  }
  return { group, people };
}

function disposeChunk(c: Chunk): void {
  c.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !SHARED_GEOS.has(m.geometry)) m.geometry.dispose();
    const mat = m.material as THREE.Material | undefined;
    if (mat && !Array.isArray(mat) && !SHARED_MATS.has(mat)) mat.dispose();
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
  });
}

// ---------------- 世界 ----------------
// 太陽は うしろ左の ななめ上（前の景色が 明るく見えるように）
const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(-40));

export class World {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private chunks = new Map<number, Chunk>();
  private ground: THREE.Mesh;
  private sky: Sky;
  private sun: THREE.DirectionalLight;
  private fuji: THREE.Group;
  private haze = new THREE.Color('#c3d5e4');
  private dark = new THREE.Color('#141414');
  private oncoming: THREE.Group;
  private oncS = -1;
  inTunnel = false;
  lowQuality = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.62;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 1, 16000);
    this.scene.background = this.haze.clone();
    this.scene.fog = new THREE.Fog(this.haze.clone(), 400, 5200);

    // 空（太陽の高さで色が変わる）と、その空から作る環境光
    this.sky = new Sky();
    this.sky.scale.setScalar(12000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 4;
    u.rayleigh.value = 1.4;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.8;
    u.sunPosition.value.copy(SUN_DIR);
    this.scene.add(this.sky);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const envSky = new Sky();
    envSky.scale.setScalar(1000);
    Object.assign(envSky.material.uniforms.sunPosition.value, SUN_DIR);
    envSky.material.uniforms.turbidity.value = 4;
    envSky.material.uniforms.rayleigh.value = 1.4;
    envScene.add(envSky);
    this.scene.environment = pmrem.fromScene(envScene).texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight('#d6e6ff', '#4d5b3a', 0.4));
    this.sun = new THREE.DirectionalLight('#fff1dc', 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.near = 1;
    sc.far = 500;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);

    T.grass.repeat.set(1, 1);
    const groundTex = T.grass.clone();
    groundTex.repeat.set(400, 400);
    groundTex.needsUpdate = true;
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), std({ map: groundTex, color: '#a8cc80', roughness: 1 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -2.5;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.fuji = this.makeFuji();
    this.scene.add(this.fuji);
    this.oncoming = this.makeTrain();
    this.oncoming.visible = false;
    this.scene.add(this.oncoming);
  }

  private makeFuji(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(4500, 2600, 64, 1, true), new THREE.MeshBasicMaterial({ color: '#7088ad', fog: false }));
    body.position.y = 1300 - 30;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1390, 805, 64, 1, true), new THREE.MeshBasicMaterial({ color: '#f1f5fa', fog: false }));
    cap.position.y = 2200 - 28;
    g.add(body, cap);
    pathPos(STATION_POS[6] + 1500, 12500, 0, g.position);
    return g;
  }

  private makeTrain(): THREE.Group {
    const g = new THREE.Group();
    const tex = canvasTex(
      256,
      64,
      (c) => {
        c.fillStyle = '#f8f9fa';
        c.fillRect(0, 0, 256, 64);
        c.fillStyle = '#1c4fa3';
        c.fillRect(0, 40, 256, 8);
        c.fillRect(0, 50, 256, 3);
        c.fillStyle = '#2a3a4a';
        for (let x = 6; x < 256; x += 16) c.fillRect(x, 20, 10, 12);
      },
      true,
    );
    tex.repeat.set(40, 1);
    const mat = std({ map: tex, metalness: 0.2, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 400), mat);
    body.position.set(0, 2.2, 200);
    body.castShadow = true;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.8, 14, 16).rotateX(-Math.PI / 2), std({ color: '#f8f9fa', metalness: 0.2, roughness: 0.3 }));
    nose.scale.set(1, 0.9, 1);
    nose.position.set(0, 2.0, -7);
    g.add(body, nose);
    return g;
  }

  // PCが重いときは、影をやめて解像度を下げる
  setLowQuality(): void {
    if (this.lowQuality) return;
    this.lowQuality = true;
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = false;
    this.sun.castShadow = false;
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && !Array.isArray(m)) m.needsUpdate = true;
    });
    const c = this.renderer.domElement;
    this.resize(c.clientWidth, c.clientHeight);
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  spawnOncoming(s: number): void {
    this.oncS = s + 2600;
    this.oncoming.visible = true;
  }

  setPeople(station: number, fraction: number): void {
    for (const c of this.chunks.values()) {
      const m = c.people.get(station);
      if (m) {
        if (m.userData.full == null) m.userData.full = m.count;
        m.count = Math.round((m.userData.full as number) * fraction);
      }
    }
  }

  prebuild(s: number): void {
    const kNow = Math.floor(s / CHUNK);
    for (let k = kNow - 1; k <= kNow + 5; k++) {
      if (k < 0 || k * CHUNK > ROUTE_LENGTH || this.chunks.has(k)) continue;
      const c = buildChunk(k);
      this.chunks.set(k, c);
      this.scene.add(c.group);
    }
  }

  update(s: number, dt: number, kmh: number, time: number): void {
    const kNow = Math.floor(s / CHUNK);
    for (let k = kNow - 1; k <= kNow + 5; k++) {
      if (k < 0 || k * CHUNK > ROUTE_LENGTH || this.chunks.has(k)) continue;
      const c = buildChunk(k);
      this.chunks.set(k, c);
      this.scene.add(c.group);
      break; // 1フレームに1つだけ作る（カクつかないように）
    }
    for (const [k, c] of this.chunks) {
      if (k < kNow - 1 || k > kNow + 6) {
        this.scene.remove(c.group);
        disposeChunk(c);
        this.chunks.delete(k);
      }
    }
    // カメラ（運転席の目の高さ）
    const sway = Math.min(1, kmh / 250);
    pathPos(s, 0, 3.5 + Math.sin(time * 9) * 0.012 * sway, this.camera.position);
    this.camera.position.x += Math.sin(time * 1.7) * 0.03 * sway;
    this.camera.lookAt(pathPos(s + 160, 0, 2.3, tmpP));
    const cam = this.camera.position;
    this.sky.position.copy(cam);
    // 太陽の影は、電車のまわりだけ（前を広めに）
    const focus = pathPos(s + 45, OTHER / 2, 0, tmpP);
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(SUN_DIR, 220);
    this.ground.position.x = cam.x;
    this.ground.position.z = cam.z;
    const gm = (this.ground.material as THREE.MeshStandardMaterial).map!;
    gm.offset.set(cam.x / 30, -cam.z / 30);
    // トンネルの中は暗くする
    const tun = TUNNELS.some((t) => s > t.from + 4 && s < t.to - 4);
    if (tun !== this.inTunnel) {
      this.inTunnel = tun;
      const fog = this.scene.fog as THREE.Fog;
      const col = tun ? this.dark : this.haze;
      (this.scene.background as THREE.Color).copy(col);
      fog.color.copy(col);
      fog.near = tun ? 20 : 400;
      fog.far = tun ? 700 : 5200;
      this.sky.visible = !tun;
      this.sun.intensity = tun ? 0 : 2.4;
      this.scene.environmentIntensity = tun ? 0.12 : 0.45;
    }
    this.fuji.visible = !tun && s > STATION_POS[4] && s < STATION_POS[8];
    if (this.oncoming.visible) {
      this.oncS -= (270 / 3.6) * dt;
      pathPos(this.oncS, OTHER, 0, this.oncoming.position);
      this.oncoming.rotation.y = pathYaw(this.oncS) + Math.PI;
      if (this.oncS < s - 450) this.oncoming.visible = false;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const c of this.chunks.values()) {
      this.scene.remove(c.group);
      disposeChunk(c);
    }
    this.chunks.clear();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
