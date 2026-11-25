// 運転席から見える3Dの世界。1kmごとの「チャンク」に分けて、近くだけ作る。
import * as THREE from 'three';
import {
  RIVERS,
  ROUTE_LENGTH,
  SEGMENTS,
  STATIONS,
  STATION_POS,
  TUNNELS,
  segmentIndexAt,
  type Span,
} from './data';

// ---------------- 線路の形（ゆるいカーブ） ----------------
const curveX = (s: number) => 140 * Math.sin(s / 2300 + 0.4) + 80 * Math.sin(s / 760 + 1.9) + 18 * Math.sin(s / 330);
const curveDX = (s: number) => (140 / 2300) * Math.cos(s / 2300 + 0.4) + (80 / 760) * Math.cos(s / 760 + 1.9) + (18 / 330) * Math.cos(s / 330);

export function pathPos(s: number, lateral = 0, y = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const dx = curveDX(s);
  const n = Math.sqrt(dx * dx + 1);
  return out.set(curveX(s) + lateral / n, y, -s + (lateral * dx) / n);
}
export const pathYaw = (s: number) => -Math.atan(curveDX(s));

// ---------------- 乱数（チャンクごとに同じ結果になるように） ----------------
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

function ballastTexture(): THREE.CanvasTexture {
  return canvasTex(
    128,
    128,
    (g) => {
      g.fillStyle = '#7a756c';
      g.fillRect(0, 0, 128, 128);
      const r = rng(7);
      for (let i = 0; i < 900; i++) {
        const v = 90 + Math.floor(r() * 70);
        g.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
        g.fillRect(r() * 128, r() * 128, 2, 2);
      }
      g.fillStyle = '#a7a39a';
      g.fillRect(6, 40, 116, 40);
      g.fillStyle = '#8e8a82';
      g.fillRect(6, 74, 116, 6);
    },
    true,
  );
}

function groundTexture(): THREE.CanvasTexture {
  return canvasTex(
    128,
    128,
    (g) => {
      g.fillStyle = '#7fae5f';
      g.fillRect(0, 0, 128, 128);
      const r = rng(11);
      for (let i = 0; i < 500; i++) {
        g.fillStyle = r() < 0.5 ? '#76a457' : '#8bbb69';
        g.fillRect(r() * 128, r() * 128, 3 + r() * 6, 3 + r() * 6);
      }
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
// 線路に沿った帯（断面 profile を s0〜s1 に流す）。座標はチャンクの原点 origin からの相対
function ribbon(origin: THREE.Vector3, s0: number, s1: number, step: number, profile: [number, number][], uvAlong = 0): THREE.BufferGeometry {
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  const P = profile.length;
  const pos = new Float32Array((n + 1) * P * 3);
  const uv = new Float32Array((n + 1) * P * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const s = Math.min(s1, s0 + i * step);
    for (let j = 0; j < P; j++) {
      pathPos(s, profile[j][0], profile[j][1], v).sub(origin);
      const k = (i * P + j) * 3;
      pos[k] = v.x;
      pos[k + 1] = v.y;
      pos[k + 2] = v.z;
      uv[(i * P + j) * 2] = j / Math.max(1, P - 1);
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

// 区間 [a,b] から、除きたい区間を引いた残り
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

// ---------------- 材質 ----------------
const M = {
  ballast: new THREE.MeshLambertMaterial({ map: ballastTexture(), side: THREE.DoubleSide }),
  rail: new THREE.MeshLambertMaterial({ color: '#d4d7da', emissive: '#30343a', side: THREE.DoubleSide }),
  bank: new THREE.MeshLambertMaterial({ color: '#8f8a7f', side: THREE.DoubleSide }),
  concrete: new THREE.MeshLambertMaterial({ color: '#b9b8b2', side: THREE.DoubleSide }),
  wall: new THREE.MeshLambertMaterial({ color: '#c3c7cc', side: THREE.DoubleSide }),
  pole: new THREE.MeshLambertMaterial({ color: '#9aa1a8' }),
  wire: new THREE.LineBasicMaterial({ color: '#2b2b2b' }),
  platform: new THREE.MeshLambertMaterial({ color: '#d9d4c8', side: THREE.DoubleSide }),
  yellow: new THREE.MeshLambertMaterial({ color: '#ffd43b', side: THREE.DoubleSide }),
  roof: new THREE.MeshBasicMaterial({ color: '#cfd5db', side: THREE.DoubleSide }),
  tunnel: new THREE.MeshLambertMaterial({ color: '#4d4c48', side: THREE.DoubleSide }),
  lamp: new THREE.MeshBasicMaterial({ color: '#ffe8a3' }),
  hill: new THREE.MeshLambertMaterial({ color: '#6c9a52', side: THREE.DoubleSide }),
  water: new THREE.MeshLambertMaterial({ color: '#3d86c6', side: THREE.DoubleSide }),
  sand: new THREE.MeshLambertMaterial({ color: '#e5d3a1', side: THREE.DoubleSide }),
  build: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
  roofTile: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
  tree: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
  field: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
  mountain: new THREE.MeshLambertMaterial({ color: '#5f8f62' }),
  person: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
  sign: new THREE.MeshBasicMaterial({ map: stopSignTex, side: THREE.DoubleSide }),
};
const SHARED_MATS = new Set<THREE.Material>(Object.values(M));

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  roof: new THREE.ConeGeometry(0.75, 1, 4, 1).rotateY(Math.PI / 4),
  tree: new THREE.ConeGeometry(1, 1, 7, 1),
  person: new THREE.CapsuleGeometry(0.22, 1.0, 3, 6),
  mountain: new THREE.ConeGeometry(1, 1, 9, 1),
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

function placeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: Item[]): THREE.InstancedMesh | null {
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
  return mesh;
}

const BUILD_COLORS = ['#e9e4da', '#d6d2c8', '#c8ccd1', '#f2efe6', '#b8bec6', '#e3d7c3', '#a9b3bd', '#f5f3ee'];
const ROOF_COLORS = ['#59606b', '#7a4e3a', '#3f5a7a', '#6b6b6b', '#8a5a44'];
const TREE_COLORS = ['#3f7d3a', '#4b8a3f', '#356b33', '#5a9447'];
const FIELD_COLORS = ['#9cc46b', '#b7d17a', '#86b35a', '#c9c27a', '#7fae5f'];
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
  const R = (a: number, b: number, step: number, prof: [number, number][], mat: THREE.Material, uv = 0) =>
    group.add(new THREE.Mesh(ribbon(origin, a, b, step, prof, uv), mat));
  const addInst = (geo: THREE.BufferGeometry, mat: THREE.Material, items: Item[]) => {
    const m = placeInstanced(geo, mat, items);
    if (m) group.add(m);
    return m;
  };

  const tunnels = intersect(s0, s1, TUNNELS);
  const rivers = intersect(s0, s1, RIVER_SPANS);
  const platforms = PLATFORMS.filter((p) => p.to > s0 && p.from < s1);
  const open = subtract(s0, s1, [...TUNNELS, ...RIVER_SPANS]);

  // 線路（2本）
  for (const off of [0, OTHER]) {
    R(s0, s1, 10, [[off - 1.7, 0.02], [off + 1.7, 0.02]], M.ballast, 0.625);
    for (const r of [-0.7175, 0.7175])
      R(s0, s1, 10, [[off + r - 0.035, 0.02], [off + r - 0.035, 0.18], [off + r + 0.035, 0.18], [off + r + 0.035, 0.02]], M.rail);
  }
  // 盛り土
  for (const p of open) R(p.from, p.to, 20, [[-9, -2.2], [-3, 0], [OTHER + 3, 0], [OTHER + 9, -2.2]], M.bank);
  // 橋と川
  for (const p of rivers) {
    R(p.from, p.to, 10, [[-3.1, -1.4], [-3.1, 0.9]], M.concrete);
    R(p.from, p.to, 10, [[OTHER + 3.1, -1.4], [OTHER + 3.1, 0.9]], M.concrete);
    R(p.from, p.to, 10, [[-3.1, -1.4], [OTHER + 3.1, -1.4]], M.concrete);
    const piers: Item[] = [];
    for (let s = Math.ceil(p.from / 40) * 40; s < p.to; s += 40) piers.push({ p: at(s, OTHER / 2, -2.6), yaw: pathYaw(s), sx: 12, sy: 2.4, sz: 2 });
    addInst(G.box, M.concrete, piers);
    R(p.from - 20, p.to + 20, 20, [[-3000, -2.3], [3000, -2.3]], M.water);
  }
  // 防音壁（まちの中）
  for (const p of subtract(s0, s1, [...TUNNELS, ...RIVER_SPANS, ...PLATFORMS])) {
    if (regionAt((p.from + p.to) / 2) === 'urban') {
      R(p.from, p.to, 20, [[-3.4, 0], [-3.4, 2.0]], M.wall);
      R(p.from, p.to, 20, [[OTHER + 3.4, 0], [OTHER + 3.4, 2.0]], M.wall);
    }
  }
  // 架線柱と架線
  const poles: Item[] = [];
  const beams: Item[] = [];
  for (let s = Math.ceil(s0 / 50) * 50; s < s1; s += 50) {
    if (inSpan(s, TUNNELS)) continue;
    const yaw = pathYaw(s);
    poles.push({ p: at(s, -3.7, 3.7), yaw, sx: 0.35, sy: 7.4, sz: 0.35 });
    poles.push({ p: at(s, OTHER + 3.7, 3.7), yaw, sx: 0.35, sy: 7.4, sz: 0.35 });
    beams.push({ p: at(s, OTHER / 2, 7.1), yaw, sx: OTHER + 7.8, sy: 0.35, sz: 0.35 });
  }
  addInst(G.box, M.pole, poles);
  addInst(G.box, M.pole, beams);
  for (const off of [0, OTHER])
    for (const h of [5.1, 6.3]) {
      const pts: THREE.Vector3[] = [];
      for (let s = s0; s <= s1; s += 25) pts.push(at(s, off, h));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), M.wire));
    }

  // トンネル
  for (const t of tunnels) {
    const prof: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (Math.PI * i) / 12;
      prof.push([OTHER / 2 + 6.4 * Math.cos(a), -0.3 + 7.6 * Math.sin(a)]);
    }
    R(t.from, t.to, 10, prof, M.tunnel);
    R(t.from, t.to, 20, [[OTHER / 2 - 6.5, -0.02], [OTHER / 2 + 6.5, -0.02]], M.tunnel);
    const lamps: Item[] = [];
    for (let s = Math.ceil(t.from / 40) * 40; s < t.to; s += 40) lamps.push({ p: at(s, -3.4, 3.2), yaw: pathYaw(s), sx: 0.25, sy: 0.25, sz: 1.2 });
    addInst(G.box, M.lamp, lamps);
    // トンネルの上の山
    R(t.from, t.to, 20, [[-280, -2.5], [-90, 34], [-14, 15], [OTHER + 14, 15], [100, 34], [280, -2.5]], M.hill);
  }
  // トンネルの入口
  for (const t of TUNNELS) {
    for (const edge of [t.from, t.to]) {
      if (edge < s0 || edge >= s1) continue;
      const yaw = pathYaw(edge);
      addInst(G.box, M.concrete, [
        { p: at(edge, -5.2, 3.6), yaw, sx: 2.4, sy: 9, sz: 3 },
        { p: at(edge, OTHER + 5.2, 3.6), yaw, sx: 2.4, sy: 9, sz: 3 },
        { p: at(edge, OTHER / 2, 8.6), yaw, sx: OTHER + 13, sy: 2.6, sz: 3 },
      ]);
    }
  }

  // 駅
  for (const pl of platforms) {
    const a = Math.max(s0, pl.from);
    const b = Math.min(s1, pl.to);
    R(a, b, 10, [[-12, 1.25], [-1.8, 1.25], [-1.8, -0.3]], M.platform);
    R(a, b, 10, [[-2.75, 1.27], [-2.45, 1.27]], M.yellow);
    R(a, b, 10, [[OTHER + 1.8, -0.3], [OTHER + 1.8, 1.25], [OTHER + 13, 1.25]], M.platform);
    R(a, b, 10, [[OTHER + 2.45, 1.27], [OTHER + 2.75, 1.27]], M.yellow);
    R(a, b, 10, [[-12, 5.4], [-1.2, 5.4]], M.roof);
    R(a, b, 10, [[OTHER + 1.2, 5.4], [OTHER + 13, 5.4]], M.roof);
    const pillars: Item[] = [];
    for (let s = Math.ceil(a / 20) * 20; s < b; s += 20) {
      pillars.push({ p: at(s, -7, 3.3), yaw: pathYaw(s), sx: 0.5, sy: 4.2, sz: 0.5 });
      pillars.push({ p: at(s, OTHER + 8, 3.3), yaw: pathYaw(s), sx: 0.5, sy: 4.2, sz: 0.5 });
    }
    addInst(G.box, M.pole, pillars);
    // 駅名の看板（電車の方を向いて吊るす）
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
    // 停止位置の目印
    const stop = STATION_POS[pl.st];
    if (stop >= a && stop < b) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), M.sign);
      pathPos(stop, -2.3, 2.3, m.position).sub(origin);
      m.rotation.y = pathYaw(stop);
      group.add(m);
      addInst(G.box, M.pole, [{ p: at(stop, -2.3, 1.5), yaw: pathYaw(stop), sx: 0.08, sy: 0.7, sz: 0.08 }]);
    }
    // ホームで待つ人
    const r = rng(pl.st * 31 + k);
    const count = Math.round((STATIONS[pl.st].size * 45 * (b - a)) / 430);
    const ppl: Item[] = [];
    for (let i = 0; i < count; i++) {
      const s = a + r() * (b - a);
      ppl.push({ p: at(s, -3.3 - r() * 6, 2.0), yaw: 0, sx: 1, sy: 1, sz: 1, color: PEOPLE_COLORS[Math.floor(r() * PEOPLE_COLORS.length)] });
    }
    const pm = addInst(G.person, M.person, ppl);
    if (pm) people.set(pl.st, pm);
    const other: Item[] = [];
    for (let i = 0; i < count / 3; i++) {
      const s = a + r() * (b - a);
      other.push({ p: at(s, OTHER + 3.4 + r() * 6, 2.0), yaw: 0, sx: 1, sy: 1, sz: 1, color: PEOPLE_COLORS[Math.floor(r() * PEOPLE_COLORS.length)] });
    }
    addInst(G.person, M.person, other);
  }

  // 景色
  const r = rng(k * 7919 + 13);
  const seg = SEGMENTS[segmentIndexAt((s0 + s1) / 2)];
  const region = regionAt((s0 + s1) / 2);
  const builds: Item[] = [];
  const roofs: Item[] = [];
  const trees: Item[] = [];
  const fields: Item[] = [];
  const waterLeft = !!(seg.sea || seg.lake);
  if (waterLeft) {
    R(s0, s1, 25, [[-3000, -2.3], [-70, -2.3]], M.water);
    R(s0, s1, 25, [[-70, -2.25], [-24, -2.2]], M.sand);
  }
  const dens = region === 'urban' ? 60 : region === 'town' ? 34 : 18;
  for (let i = 0; i < dens; i++) {
    const s = s0 + r() * (s1 - s0);
    if (inSpan(s, TUNNELS, 60)) continue;
    const left = r() < 0.5;
    if (left && waterLeft) continue;
    const dist = 22 + Math.pow(r(), 1.6) * 420;
    const lat = left ? -dist : OTHER + dist;
    const yaw = pathYaw(s) + (r() - 0.5) * 0.3;
    const isBldg = region === 'urban' ? r() < 0.75 : region === 'town' ? r() < 0.3 : false;
    if (isBldg) {
      const h = 8 + r() * (region === 'urban' ? 55 : 18);
      builds.push({ p: at(s, lat, h / 2 - 2.5), yaw, sx: 10 + r() * 22, sy: h, sz: 10 + r() * 18, color: BUILD_COLORS[Math.floor(r() * BUILD_COLORS.length)] });
    } else {
      const w = 7 + r() * 5;
      const d = 7 + r() * 4;
      const h = 5 + r() * 2.5;
      builds.push({ p: at(s, lat, h / 2 - 2.5), yaw, sx: w, sy: h, sz: d, color: BUILD_COLORS[Math.floor(r() * BUILD_COLORS.length)] });
      roofs.push({ p: at(s, lat, h - 2.5 + 1.4), yaw, sx: w * 1.05, sy: 2.8, sz: d * 1.05, color: ROOF_COLORS[Math.floor(r() * ROOF_COLORS.length)] });
    }
  }
  const treeN = region === 'urban' ? 25 : 90;
  for (let i = 0; i < treeN; i++) {
    const s = s0 + r() * (s1 - s0);
    if (inSpan(s, TUNNELS, 40)) continue;
    const left = r() < 0.5;
    if (left && waterLeft) continue;
    const dist = 14 + Math.pow(r(), 1.3) * 500;
    const h = 6 + r() * 9;
    trees.push({ p: at(s, left ? -dist : OTHER + dist, h / 2 - 2.5), yaw: 0, sx: h * 0.35, sy: h, sz: h * 0.35, color: TREE_COLORS[Math.floor(r() * TREE_COLORS.length)] });
  }
  if (region !== 'urban') {
    const n = seg.tea ? 40 : 14;
    for (let i = 0; i < n; i++) {
      const s = s0 + r() * (s1 - s0);
      const left = r() < 0.5;
      if ((left && waterLeft) || inSpan(s, TUNNELS, 60)) continue;
      const dist = 20 + r() * 260;
      if (seg.tea) {
        // 茶畑：こんもりした緑の列
        for (let j = 0; j < 6; j++)
          fields.push({ p: at(s, left ? -(dist + j * 3) : OTHER + dist + j * 3, -1.8), yaw: pathYaw(s), sx: 1.8, sy: 1.4, sz: 40, color: '#2f6b2a' });
      } else {
        fields.push({ p: at(s, left ? -dist : OTHER + dist, -2.2), yaw: pathYaw(s), sx: 40 + r() * 40, sy: 0.1, sz: 50 + r() * 60, color: FIELD_COLORS[Math.floor(r() * FIELD_COLORS.length)] });
      }
    }
  }
  addInst(G.box, M.build, builds);
  addInst(G.roof, M.roofTile, roofs);
  addInst(G.tree, M.tree, trees);
  addInst(G.box, M.field, fields);
  // 遠くの山
  if (seg.mountains || region === 'rural') {
    const mts: Item[] = [];
    for (let i = 0; i < 3; i++) {
      const s = s0 + r() * (s1 - s0);
      const left = r() < 0.5;
      if (left && waterLeft) continue;
      const dist = 1600 + r() * 2600;
      const h = 300 + r() * 700;
      mts.push({ p: at(s, left ? -dist : dist, h / 2 - 2.5), yaw: r() * 6, sx: h * 2.4, sy: h, sz: h * 2.2 });
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
export class World {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private chunks = new Map<number, Chunk>();
  private ground: THREE.Mesh;
  private groundTex: THREE.Texture;
  private fuji: THREE.Group;
  private sky = new THREE.Color('#a9d8ff');
  private dark = new THREE.Color('#141414');
  private oncoming: THREE.Group;
  private oncS = -1;
  inTunnel = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 1, 16000);
    this.scene.background = this.sky.clone();
    this.scene.fog = new THREE.Fog(this.sky.clone(), 300, 4800);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#55704a', 1.6));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.6);
    sun.position.set(-0.6, 1, 0.4);
    this.scene.add(sun);
    this.groundTex = groundTexture();
    this.groundTex.repeat.set(600, 600);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshLambertMaterial({ map: this.groundTex }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -2.5;
    this.scene.add(this.ground);
    this.fuji = this.makeFuji();
    this.scene.add(this.fuji);
    this.oncoming = this.makeTrain();
    this.oncoming.visible = false;
    this.scene.add(this.oncoming);
  }

  private makeFuji(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(4500, 2600, 48, 1, true), new THREE.MeshBasicMaterial({ color: '#7d95ba', fog: false }));
    body.position.y = 1300 - 30;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1390, 805, 48, 1, true), new THREE.MeshBasicMaterial({ color: '#f4f7fb', fog: false }));
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
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 400), new THREE.MeshLambertMaterial({ map: tex }));
    body.position.set(0, 2.0, 200);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.8, 14, 12).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#f8f9fa' }));
    nose.scale.set(1, 0.9, 1);
    nose.position.set(0, 1.8, -7);
    g.add(body, nose);
    return g;
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // すれちがう新幹線を出す
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

  // 出発前に、まわりのチャンクをまとめて作っておく
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
    // チャンクの作成・削除
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
    pathPos(s, 0, 3.4 + Math.sin(time * 9) * 0.012 * sway, this.camera.position);
    this.camera.position.x += Math.sin(time * 1.7) * 0.03 * sway;
    this.camera.lookAt(pathPos(s + 160, 0, 2.2, tmpP));
    // 地面はカメラについてくる（模様は動かす）
    this.ground.position.x = this.camera.position.x;
    this.ground.position.z = this.camera.position.z;
    this.groundTex.offset.set(this.camera.position.x / 20, -this.camera.position.z / 20);
    // トンネルの中は暗くする
    const tun = TUNNELS.some((t) => s > t.from + 4 && s < t.to - 4);
    if (tun !== this.inTunnel) {
      this.inTunnel = tun;
      const fog = this.scene.fog as THREE.Fog;
      const col = tun ? this.dark : this.sky;
      (this.scene.background as THREE.Color).copy(col);
      fog.color.copy(col);
      fog.near = tun ? 20 : 300;
      fog.far = tun ? 700 : 4800;
    }
    this.fuji.visible = !tun && s > STATION_POS[4] && s < STATION_POS[8];
    // すれちがう電車
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
    this.renderer.dispose();
  }
}
