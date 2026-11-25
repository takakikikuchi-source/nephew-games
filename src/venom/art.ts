// 図鑑風のイラスト（SVG）。体の形ごとの「型」に、実物の色や模様をつけて描き分ける。
// stage: 0=たまご 1=あかちゃん 2=こども 3=おとな
import { SPECIES, type BossId, type Rarity } from './data';

let uidSeq = 0;
const uid = (p: string) => `${p}${++uidSeq}`;
const wrap = (inner: string, label: string) =>
  `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${inner}</svg>`;

// 左右対称の形を作る（M/L/Q だけの path を左右反転）
const mirrorX = (d: string) =>
  d
    .replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_m, c: string, x: string, y: string) => `${c}${240 - Number(x)} ${y}`)
    .replace(/Q\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_m, x1: string, y1: string, x2: string, y2: string) => `Q${240 - Number(x1)} ${y1} ${240 - Number(x2)} ${y2}`);
const both = (d: string, attrs: string) => `<path d="${d}" ${attrs}/><path d="${mirrorX(d)}" ${attrs}/>`;

// 色を白っぽくする（あかちゃん用）
function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
type Pal = Record<string, string>;
const soften = (p: Pal, stage: number): Pal =>
  stage >= 3 ? p : Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.startsWith('#') ? lighten(v, stage === 1 ? 0.35 : 0.15) : v]));

// ---------------- サソリ（上から見た図） ----------------
function scorpion(stage: number, custom?: Pal): string {
  const adult = custom ?? { b1: '#e6b458', b2: '#9a6620', line: '#4a2f0e', dark: '#2a1906' };
  const pal = stage === 1 ? { b1: '#fffaf0', b2: '#ddd0b4', line: '#a49576', dark: '#7d705a', thin: adult.thin } : stage === 2 ? { ...soften(adult, 2), thin: adult.thin } : adult;
  const g = uid('sc');
  const legs = ['M100 100 L80 86 L66 92 L60 104', 'M98 112 L74 106 L58 116 L52 130', 'M98 124 L72 126 L58 140 L54 156', 'M100 136 L76 146 L66 164 L64 180'];
  const legAttr = `stroke="${pal.line}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const legInner = `stroke="${pal.b2}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const tail: [number, number, number][] = [[120, 184, 9], [124, 200, 9], [132, 214, 9], [146, 222, 9], [162, 220, 10]];
  const cs = pal.thin ? 0.7 : 1;
  const chela = (flip: boolean) => `<g${flip ? ' transform="translate(240 0) scale(-1 1)"' : ''}>
      <path d="M104 82 L90 66 L84 54" stroke="${pal.line}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M104 82 L90 66 L84 54" stroke="url(#${g})" stroke-width="6" fill="none" stroke-linecap="round"/>
      <g transform="translate(80 40) scale(${cs}) translate(-80 -40)">
      <ellipse cx="80" cy="40" rx="12" ry="17" transform="rotate(-18 80 40)" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/>
      <path d="M71 30 Q64 14 75 6 Q78 18 77 28 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/>
      <path d="M86 28 Q93 14 85 6 Q81 16 81 27 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/></g>
    </g>`;
  return wrap(
    `<defs><radialGradient id="${g}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${pal.b1}"/><stop offset="1" stop-color="${pal.b2}"/></radialGradient></defs>
    ${legs.map((d) => both(d, legAttr) + both(d, legInner)).join('')}
    ${tail.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/>`).join('')}
    <ellipse cx="176" cy="208" rx="12" ry="9" transform="rotate(-40 176 208)" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/>
    <path d="M182 201 Q192 186 180 176" stroke="${pal.dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M96 106 Q120 100 144 106 L150 150 Q148 172 120 178 Q92 172 90 150 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2.5"/>
    ${[116, 126, 136, 146, 156, 166].map((y, i) => `<path d="M${94 + i * 0.6} ${y} Q120 ${y + 5} ${146 - i * 0.6} ${y}" stroke="${pal.line}" stroke-width="1.6" fill="none" opacity=".8"/>`).join('')}
    ${chela(false)}${chela(true)}
    <path d="M100 76 Q120 66 140 76 L146 106 Q120 112 94 106 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2.5"/>
    <ellipse cx="120" cy="86" rx="12" ry="6" fill="#fff" opacity=".25"/>
    <circle cx="115" cy="84" r="3" fill="${pal.dark}"/><circle cx="125" cy="84" r="3" fill="${pal.dark}"/>`,
    'サソリ',
  );
}

// ---------------- クモ（上から見た図） ----------------
function spider(stage: number, custom?: Pal): string {
  const adult = custom ?? { abd: '#2b2b33', abd2: '#0b0b0f', stripe: '#e3262d', leg: '#141418', ceph: '#18181c' };
  const pal = stage === 1 ? { abd: '#efe4cf', abd2: '#c7b494', stripe: lighten(adult.stripe, 0.4), leg: '#a48a68', ceph: '#b9a07c' } : soften(adult, stage);
  const g = uid('sp');
  const legs = ['M108 90 Q90 70 82 50 Q78 40 70 26', 'M106 94 Q82 82 64 72 Q52 66 38 64', 'M106 100 Q84 108 64 120 Q54 126 44 140', 'M108 104 Q92 124 82 150 Q76 166 70 186'];
  return wrap(
    `<defs><radialGradient id="${g}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="${pal.abd}"/><stop offset="1" stop-color="${pal.abd2}"/></radialGradient></defs>
    ${legs.map((d) => both(d, `stroke="${pal.leg}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"`)).join('')}
    ${both('M114 84 L110 74', `stroke="${pal.leg}" stroke-width="3" stroke-linecap="round"`)}
    <ellipse cx="120" cy="96" rx="16" ry="14" fill="${pal.ceph}"/>
    <circle cx="116" cy="88" r="1.8" fill="#666"/><circle cx="124" cy="88" r="1.8" fill="#666"/>
    <ellipse cx="120" cy="148" rx="38" ry="44" fill="url(#${g})"/>
    ${pal.stripe !== pal.abd ? `<path d="M120 110 C112 120 112 130 118 138 C110 146 110 160 120 180 C130 160 130 146 122 138 C128 130 128 120 120 110 Z" fill="${pal.stripe}"/>` : ''}
    <ellipse cx="104" cy="128" rx="9" ry="16" fill="#fff" opacity=".22" transform="rotate(20 104 128)"/>`,
    'クモ',
  );
}

// ---------------- ハチ ----------------
function larva(): string {
  let circles = '';
  for (let i = 9; i >= 0; i--) {
    const a = ((-40 - i * 26) * Math.PI) / 180;
    circles += `<circle cx="${(120 + 50 * Math.cos(a)).toFixed(1)}" cy="${(126 + 50 * Math.sin(a)).toFixed(1)}" r="${(24 - i * 1.1).toFixed(1)}" fill="#f8f3e6" stroke="#d6cab2" stroke-width="2"/>`;
  }
  const ha = (-40 * Math.PI) / 180;
  const hx = 120 + 50 * Math.cos(ha) + 14;
  const hy = 126 + 50 * Math.sin(ha) - 10;
  return wrap(
    `${circles}<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="13" fill="#e8b866" stroke="#9c6b22" stroke-width="2"/>
    <path d="M${(hx + 8).toFixed(1)} ${(hy + 6).toFixed(1)} l8 4 l-6 4" stroke="#6b4310" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    'ようちゅう',
  );
}

function wasp(stage: number, custom?: Pal, fuzzy = false): string {
  const pupa = stage === 2;
  const adult = custom ?? { head: '#f0a01e', eye: '#2a1a0c', thorax: '#4b2c12', abd: '#f3b52f', band: '#3b220d', leg: '#5a3510', line: '#3b220d' };
  const pal = pupa ? { head: '#f2e6cb', eye: '#9b6a45', thorax: '#efe0c2', abd: '#f6ecd6', band: '#e2cfa8', leg: '#e0cfac', line: '#c9b48c' } : adult;
  const clip = uid('hb');
  const legs = ['M104 92 L86 86 L78 94', 'M102 100 L82 106 L74 120', 'M104 108 L88 128 L84 148'];
  const wings = pupa
    ? ''
    : `<g fill="rgba(240,222,180,.5)" stroke="rgba(120,90,40,.55)" stroke-width="1.5">
        <ellipse cx="96" cy="134" rx="13" ry="42" transform="rotate(16 96 134)"/><ellipse cx="144" cy="134" rx="13" ry="42" transform="rotate(-16 144 134)"/>
        <ellipse cx="104" cy="140" rx="8" ry="28" transform="rotate(8 104 140)"/><ellipse cx="136" cy="140" rx="8" ry="28" transform="rotate(-8 136 140)"/></g>`;
  return wrap(
    `<defs><clipPath id="${clip}"><ellipse cx="120" cy="156" rx="26" ry="38"/></clipPath></defs>
    ${legs.map((d) => both(d, `stroke="${pal.leg}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"`)).join('')}
    ${both('M112 56 Q100 36 92 26', `stroke="${pal.line}" stroke-width="3" fill="none" stroke-linecap="round"`)}
    <g clip-path="url(#${clip})">
      <rect x="90" y="114" width="60" height="90" fill="${pal.abd}"/><rect x="90" y="114" width="60" height="18" fill="${pal.band}"/>
      <rect x="90" y="142" width="60" height="6" fill="${pal.band}"/><rect x="90" y="158" width="60" height="6" fill="${pal.band}"/>
      <rect x="90" y="174" width="60" height="7" fill="${pal.band}"/><rect x="90" y="188" width="60" height="20" fill="${pal.band}"/>
    </g>
    <ellipse cx="120" cy="156" rx="26" ry="38" fill="none" stroke="${pal.line}" stroke-width="2"/>
    <ellipse cx="120" cy="98" rx="20" ry="18" fill="${pal.thorax}" stroke="${pal.line}" stroke-width="2"/>
    ${fuzzy && !pupa ? `<ellipse cx="120" cy="98" rx="20" ry="18" fill="none" stroke="${lighten(pal.thorax, 0.4)}" stroke-width="5" stroke-dasharray="2 3" opacity=".7"/>` : ''}
    <ellipse cx="120" cy="66" rx="23" ry="17" fill="${pal.head}" stroke="${pal.line}" stroke-width="2"/>
    <path d="M100 58 Q95 67 102 77 Q109 70 106 60 Z" fill="${pal.eye}"/><path d="M140 58 Q145 67 138 77 Q131 70 134 60 Z" fill="${pal.eye}"/>
    <path d="M112 80 Q115 90 120 85 Q125 90 128 80" fill="${pal.eye}" stroke="${pal.line}" stroke-width="1.5"/>
    ${wings}`,
    pupa ? 'さなぎ' : 'ハチ',
  );
}

// ---------------- カエル（前から見た図） ----------------
function tadpole(dark = '#26232b'): string {
  const g = uid('td');
  return wrap(
    `<defs><radialGradient id="${g}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${lighten(dark, 0.3)}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>
    <path d="M136 118 Q170 96 210 120 Q174 136 136 130 Z" fill="${lighten(dark, 0.15)}" opacity=".85"/>
    <ellipse cx="108" cy="122" rx="36" ry="27" fill="url(#${g})"/>
    <circle cx="92" cy="112" r="6" fill="#111"/><circle cx="90" cy="110" r="2" fill="#fff"/>`,
    'おたまじゃくし',
  );
}

function frog(stage: number, custom?: Pal, warty = false): string {
  const adult = custom ?? { b1: '#3d86f2', b2: '#163e9c', leg: '#2a3fa8', pad: '#1a2c78', spot: '#0d0d14' };
  const pal = stage === 2 ? (custom ? soften(adult, 2) : { b1: '#3a4f8a', b2: '#1b2346', leg: '#2f5fc4', pad: '#22397a', spot: '#0d0d14' }) : adult;
  const g = uid('fr');
  const spots: [number, number, number][] = warty
    ? [[100, 100, 3], [140, 102, 3], [112, 140, 4], [130, 150, 3], [96, 160, 3], [148, 136, 4], [120, 122, 3], [108, 170, 3], [138, 172, 3]]
    : [[108, 96, 5], [133, 95, 4], [120, 140, 7], [100, 152, 5], [142, 156, 6], [118, 168, 4], [88, 132, 4], [153, 130, 5], [128, 118, 3], [104, 112, 3]];
  return wrap(
    `<defs><radialGradient id="${g}" cx="45%" cy="30%" r="80%"><stop offset="0" stop-color="${pal.b1}"/><stop offset="1" stop-color="${pal.b2}"/></radialGradient></defs>
    <ellipse cx="74" cy="172" rx="32" ry="18" transform="rotate(-18 74 172)" fill="${pal.leg}"/><ellipse cx="166" cy="172" rx="32" ry="18" transform="rotate(18 166 172)" fill="${pal.leg}"/>
    <ellipse cx="120" cy="150" rx="50" ry="42" fill="url(#${g})"/>
    <ellipse cx="120" cy="104" rx="44" ry="30" fill="url(#${g})"/>
    ${spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${pal.spot}" ${warty ? 'opacity=".55"' : ''}/>`).join('')}
    ${warty ? `<ellipse cx="86" cy="100" rx="12" ry="7" fill="${pal.b2}" opacity=".7"/><ellipse cx="154" cy="100" rx="12" ry="7" fill="${pal.b2}" opacity=".7"/>` : ''}
    <circle cx="94" cy="86" r="${warty ? 12 : 16}" fill="${warty ? '#c9a227' : '#0b0b10'}"/><circle cx="146" cy="86" r="${warty ? 12 : 16}" fill="${warty ? '#c9a227' : '#0b0b10'}"/>
    ${warty ? '<ellipse cx="94" cy="86" rx="8" ry="3" fill="#111"/><ellipse cx="146" cy="86" rx="8" ry="3" fill="#111"/>' : ''}
    <circle cx="89" cy="80" r="4" fill="#fff" opacity=".85"/><circle cx="141" cy="80" r="4" fill="#fff" opacity=".85"/>
    <path d="M92 118 Q120 130 148 118" stroke="#0b0b10" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${both('M90 148 Q78 172 84 196', `stroke="${pal.leg}" stroke-width="10" fill="none" stroke-linecap="round"`)}
    ${[76, 84, 92].map((x, i) => `<circle cx="${x}" cy="${200 + (i === 1 ? 3 : 0)}" r="4.5" fill="${pal.pad}"/><circle cx="${240 - x}" cy="${200 + (i === 1 ? 3 : 0)}" r="4.5" fill="${pal.pad}"/>`).join('')}`,
    'カエル',
  );
}

// ---------------- とぐろを巻くヘビ ----------------
function coil(stage: number, custom?: Pal): string {
  const adult = custom ?? { base: '#b3a24e', pat: '#40381a', head: '#9e8f42', dash: '9 13' };
  const pal = soften(adult, stage);
  const body = (d: string, w: number) =>
    `<path d="${d}" stroke="${pal.pat}" stroke-width="${w + 4}" fill="none" stroke-linecap="round"/>
     <path d="${d}" stroke="${pal.base}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
     <path d="${d}" stroke="${pal.pat}" stroke-width="${w - 10}" fill="none" stroke-dasharray="${adult.dash}" opacity=".9"/>`;
  const rattle = adult.rattle
    ? `<g fill="#d9c9a0" stroke="#7a6640" stroke-width="1.5">${[0, 1, 2, 3].map((i) => `<ellipse cx="${56 - i * 7}" cy="${186 + i * 2}" rx="5" ry="7"/>`).join('')}</g>`
    : '';
  return wrap(
    `${body('M60 182 A62 22 0 1 0 184 182 A62 22 0 1 0 60 182', 26)}${rattle}
    ${body('M74 158 A46 16 0 1 0 166 158 A46 16 0 1 0 98 168', 24)}
    ${body('M150 152 C174 132 160 108 140 100 C124 94 124 80 140 72', 20)}
    ${adult.neck ? `<path d="M142 96 C128 90 128 80 140 74" stroke="${adult.neck}" stroke-width="16" fill="none" opacity=".9"/>` : ''}
    <path d="M132 74 Q140 52 162 49 Q183 51 188 62 Q184 73 160 78 Q144 80 132 74 Z" fill="${pal.head}" stroke="${pal.pat}" stroke-width="2.5"/>
    <circle cx="166" cy="60" r="4.4" fill="#e8c840"/><ellipse cx="166" cy="60" rx="1.3" ry="3.6" fill="#111"/>
    <circle cx="178" cy="65" r="1.9" fill="#222"/>
    ${adult.mouth ? '<path d="M176 70 Q190 78 196 68 Q186 72 178 68 Z" fill="#0a0a0a"/>' : ''}
    <path d="M188 64 L200 66 L207 61 M200 66 L207 71" stroke="#d63333" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    'ヘビ',
  );
}

function cobra(stage: number): string {
  const pal =
    stage === 1
      ? { base: '#1d1d1f', band: '#f2d63a', hood: '#2a2a2c', throat: '#f4e39a', eye: '#e9c46a' }
      : stage === 2
        ? { base: '#45402a', band: '#d8c46a', hood: '#57502f', throat: '#efdc94', eye: '#e2b74f' }
        : { base: '#6c5d33', band: '#d9cf9f', hood: '#85743f', throat: '#ead98f', eye: '#d9a63a' };
  const g = uid('cb');
  const body = (d: string, w: number) =>
    `<path d="${d}" stroke="#1a160c" stroke-width="${w + 4}" fill="none" stroke-linecap="round"/>
     <path d="${d}" stroke="${pal.base}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
     <path d="${d}" stroke="${pal.band}" stroke-width="${w}" fill="none" stroke-dasharray="5 19" opacity=".85"/>`;
  return wrap(
    `<defs><radialGradient id="${g}" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="${pal.throat}"/><stop offset=".55" stop-color="${pal.hood}"/><stop offset="1" stop-color="${pal.base}"/></radialGradient></defs>
    ${body('M50 196 A70 22 0 1 0 190 196 A70 22 0 1 0 60 200', 24)}
    ${body('M150 196 C162 176 150 152 130 140 C112 128 112 116 120 104', 26)}
    <path d="M120 40 C90 44 74 72 80 102 C84 122 104 134 120 136 C136 134 156 122 160 102 C166 72 150 44 120 40 Z" fill="url(#${g})" stroke="#1a160c" stroke-width="2.5"/>
    <ellipse cx="120" cy="48" rx="18" ry="15" fill="${pal.base}" stroke="#1a160c" stroke-width="2"/>
    <circle cx="110" cy="46" r="3.6" fill="${pal.eye}"/><circle cx="110" cy="46" r="2" fill="#0a0a0a"/>
    <circle cx="130" cy="46" r="3.6" fill="${pal.eye}"/><circle cx="130" cy="46" r="2" fill="#0a0a0a"/>
    <path d="M120 62 L120 72 M120 72 L115 78 M120 72 L125 78" stroke="#d63333" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    'キングコブラ',
  );
}

// ---------------- ムカデ（上から） ----------------
function centipede(stage: number): string {
  const p = soften({ head: '#c8401e', body: '#1f3a3a', leg: '#e3b23c', line: '#0f1f1f' }, stage);
  let segs = '';
  const n = 14;
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1);
    const x = 120 + 46 * Math.sin(t * Math.PI * 1.6);
    const y = 40 + t * 170;
    const dx = 46 * Math.PI * 1.6 * Math.cos(t * Math.PI * 1.6) / 170;
    const ang = (Math.atan(dx) * 180) / Math.PI;
    segs += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-ang).toFixed(1)})">
      <path d="M-14 0 L-30 -6 M14 0 L30 -6" stroke="${p.leg}" stroke-width="3" stroke-linecap="round"/>
      <rect x="-14" y="-6.5" width="28" height="13" rx="5" fill="${i === 0 ? p.head : p.body}" stroke="${p.line}" stroke-width="1.5"/></g>`;
  }
  return wrap(
    `${segs}
    <path d="M114 36 Q104 18 96 10 M126 36 Q136 18 144 10" stroke="${p.head}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M112 44 Q108 52 114 56 M128 44 Q132 52 126 56" stroke="#2a1006" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    'ムカデ',
  );
}

// ---------------- イモムシ（横から） ----------------
function caterpillar(stage: number): string {
  const p = soften({ body: '#9acd32', dark: '#5f8f1f', saddle: '#7a5a2b', spine: '#3d5f12' }, stage);
  let segs = '';
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 20;
    segs += `<ellipse cx="${x}" cy="140" rx="16" ry="24" fill="${p.body}" stroke="${p.dark}" stroke-width="1.5"/>`;
    for (const dx of [-8, 8]) segs += `<path d="M${x + dx} 118 l${dx / 2} -18 M${x + dx} 118 l${dx} -12 M${x + dx} 118 l0 -20" stroke="${p.spine}" stroke-width="1.6" stroke-linecap="round"/>`;
    segs += `<path d="M${x - 14} 150 l-4 14 M${x + 14} 150 l4 14" stroke="${p.spine}" stroke-width="1.4"/>`;
  }
  return wrap(
    `${segs}<path d="M70 124 Q120 112 170 124 Q150 136 120 134 Q90 136 70 124 Z" fill="${p.saddle}" opacity=".85"/>
    <circle cx="190" cy="146" r="14" fill="${p.dark}"/><circle cx="196" cy="142" r="2.5" fill="#111"/>`,
    'イモムシ',
  );
}

// ---------------- タコ ----------------
function octopus(stage: number): string {
  const p = soften({ body: '#d4b26a', dark: '#9c7a38', ring: '#1e6bff' }, stage);
  const g = uid('oc');
  const arms = [-70, -50, -30, -10, 10, 30, 50, 70]
    .map((a, i) => {
      const r = (a * Math.PI) / 180;
      const x1 = 120 + Math.sin(r) * 20;
      const x2 = 120 + Math.sin(r) * 80;
      const y2 = 196 + Math.cos(r) * 10;
      return `<path d="M${x1.toFixed(1)} 140 Q${(x2 + (i % 2 ? 20 : -20)).toFixed(1)} 170 ${x2.toFixed(1)} ${y2.toFixed(1)} q${i % 2 ? 10 : -10} 10 0 16" stroke="${p.body}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    })
    .join('');
  const rings: [number, number][] = [[104, 92], [134, 84], [120, 112], [96, 122], [146, 116], [118, 70]];
  return wrap(
    `<defs><radialGradient id="${g}" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="${lighten(p.body, 0.2)}"/><stop offset="1" stop-color="${p.dark}"/></radialGradient></defs>
    ${arms}<ellipse cx="120" cy="100" rx="44" ry="50" fill="url(#${g})"/>
    ${rings.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${p.ring}" stroke-width="3.5"/>`).join('')}
    <circle cx="104" cy="136" r="7" fill="#fff"/><circle cx="104" cy="136" r="3" fill="#111"/><circle cx="136" cy="136" r="7" fill="#fff"/><circle cx="136" cy="136" r="3" fill="#111"/>`,
    'タコ',
  );
}

// ---------------- さかな（横から） ----------------
function fishBody(p: Pal, extra: string, bodyPath: string, eye: [number, number]): string {
  const g = uid('fi');
  return wrap(
    `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.belly}"/></linearGradient></defs>
    <path d="M196 120 L226 92 L222 150 Z" fill="${p.fin}"/>
    <path d="${bodyPath}" fill="url(#${g})" stroke="${p.line}" stroke-width="2"/>
    ${extra}
    <circle cx="${eye[0]}" cy="${eye[1]}" r="7" fill="#fff"/><circle cx="${eye[0]}" cy="${eye[1]}" r="3.5" fill="#111"/>`,
    'さかな',
  );
}

function lionfish(stage: number): string {
  const p = soften({ top: '#c0392b', belly: '#f3d1c4', fin: '#e8a49a', line: '#7a2018' }, stage);
  const stripes = [70, 92, 114, 136, 158, 180].map((x) => `<path d="M${x} 92 Q${x + 6} 120 ${x} 150" stroke="#fff" stroke-width="5" fill="none" opacity=".85"/>`).join('');
  const spines = [70, 86, 102, 118, 134, 150, 166].map((x, i) => `<path d="M${x} 96 L${x - 6 + i} ${40 + (i % 2) * 10}" stroke="#7a2018" stroke-width="2.5"/><circle cx="${x - 6 + i}" cy="${40 + (i % 2) * 10}" r="2" fill="#7a2018"/>`).join('');
  const fan = [0, 1, 2, 3, 4].map((i) => `<path d="M100 140 L${70 + i * 12} ${200 + (i % 2) * 8}" stroke="#e8a49a" stroke-width="5" stroke-linecap="round"/>`).join('');
  return fishBody(p, spines + fan + stripes, 'M40 122 Q56 92 110 90 Q170 92 200 120 Q170 152 110 154 Q56 152 40 122 Z', [62, 114]);
}

function stonefish(stage: number): string {
  const p = soften({ top: '#8a7f6a', belly: '#b3a58a', fin: '#7d725e', line: '#4e4636' }, stage);
  const warts = [[80, 104], [100, 96], [124, 98], [148, 104], [170, 112], [92, 128], [118, 124], [142, 130], [164, 134], [110, 146]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${5 + (i % 3) * 2}" fill="${i % 2 ? '#6e6452' : '#a3967c'}" opacity=".9"/>`)
    .join('');
  const spines = [86, 104, 122, 140, 158].map((x) => `<path d="M${x} 94 L${x + 2} 70" stroke="#5e5444" stroke-width="3"/>`).join('');
  return fishBody(p, spines + warts + '<path d="M44 108 Q60 100 72 104" stroke="#4e4636" stroke-width="3" fill="none"/>', 'M38 116 Q50 88 110 86 Q172 88 200 122 Q172 160 110 160 Q50 156 38 116 Z', [70, 98]);
}

function puffer(stage: number): string {
  const p = soften({ top: '#55524c', belly: '#f4f1ea', fin: '#6b675f', line: '#2e2c28' }, stage);
  const spots = [[100, 96], [124, 90], [146, 98], [112, 112], [136, 110], [90, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#2e2c28" opacity=".5"/>`).join('');
  const mark = '<circle cx="132" cy="134" r="13" fill="#fff"/><circle cx="132" cy="134" r="9" fill="#151413"/>';
  return fishBody(p, spots + mark + '<path d="M150 120 Q166 110 170 126 Q160 132 150 128 Z" fill="#6b675f"/>', 'M50 122 Q54 70 120 68 Q186 70 196 122 Q186 176 120 178 Q54 176 50 122 Z', [82, 108]);
}

// ---------------- クラゲ（カツオノエボシ） ----------------
function jelly(stage: number): string {
  const p = soften({ float: '#8fbfff', crest: '#c48bff', tent: '#3b6fd8' }, stage);
  const tents = [90, 104, 118, 132, 146, 160].map((x, i) => `<path d="M${x} 120 q${i % 2 ? 10 : -10} 20 0 40 q${i % 2 ? -10 : 10} 20 0 40 q${i % 2 ? 8 : -8} 15 0 30" stroke="${p.tent}" stroke-width="3" fill="none" opacity=".8"/>`).join('');
  return wrap(
    `${tents}<path d="M60 110 Q70 60 140 64 Q196 70 188 108 Q150 126 60 110 Z" fill="${p.float}" opacity=".85" stroke="#4d7fd6" stroke-width="2"/>
    <path d="M80 80 Q110 40 150 52 Q170 60 176 80 Q140 70 80 80 Z" fill="${p.crest}" opacity=".8"/>
    <ellipse cx="110" cy="84" rx="20" ry="8" fill="#fff" opacity=".4"/>`,
    'クラゲ',
  );
}

// ---------------- イモガイ ----------------
function cone(stage: number): string {
  const p = soften({ shell: '#f3e7cf', dark: '#7a4b23', line: '#5e3a1a' }, stage);
  const clip = uid('cn');
  let tents = '';
  for (let y = 72; y < 200; y += 14) for (let x = 60 + ((y / 14) % 2) * 9; x < 190; x += 18) tents += `<path d="M${x} ${y} l7 -9 l7 9 Z" fill="${p.dark}" opacity=".85"/>`;
  return wrap(
    `<defs><clipPath id="${clip}"><path d="M120 214 L58 78 Q120 54 182 78 Z"/></clipPath></defs>
    <path d="M120 214 L58 78 Q120 54 182 78 Z" fill="${p.shell}" stroke="${p.line}" stroke-width="2.5"/>
    <g clip-path="url(#${clip})">${tents}<rect x="50" y="120" width="140" height="10" fill="${p.dark}" opacity=".5"/><rect x="50" y="160" width="140" height="10" fill="${p.dark}" opacity=".5"/></g>
    <path d="M58 78 Q120 30 182 78 Q120 62 58 78 Z" fill="${p.shell}" stroke="${p.line}" stroke-width="2"/>
    <path d="M90 66 Q120 46 150 66 M104 60 Q120 50 136 60" stroke="${p.line}" stroke-width="2" fill="none"/>`,
    'イモガイ',
  );
}

// ---------------- エイ（上から） ----------------
function ray(stage: number): string {
  const p = soften({ top: '#8b6b4a', dark: '#5c4530', line: '#3c2c1d' }, stage);
  return wrap(
    `<path d="M120 150 Q150 190 214 226" stroke="${p.dark}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M150 182 l10 2 l-6 6 Z" fill="#e8dcc0"/>
    <path d="M120 40 Q170 60 214 110 Q170 150 120 160 Q70 150 26 110 Q70 60 120 40 Z" fill="${p.top}" stroke="${p.line}" stroke-width="2"/>
    <ellipse cx="120" cy="100" rx="40" ry="36" fill="${p.dark}" opacity=".25"/>
    <circle cx="108" cy="78" r="5" fill="#2a1d12"/><circle cx="132" cy="78" r="5" fill="#2a1d12"/>
    <circle cx="108" cy="78" r="2" fill="#e8c840"/><circle cx="132" cy="78" r="2" fill="#e8c840"/>`,
    'エイ',
  );
}

// ---------------- トカゲ（アメリカドクトカゲ・上から） ----------------
function lizard(stage: number): string {
  const p = soften({ orange: '#f09878', black: '#3a2620', line: '#1a100c' }, stage);
  const legs = ['M96 96 L70 80 L60 90', 'M96 160 L70 178 L62 168'];
  let beads = '';
  for (let y = 92; y < 176; y += 12) for (let x = 94; x <= 146; x += 13) beads += `<circle cx="${x + ((y / 12) % 2) * 6}" cy="${y}" r="4.5" fill="${(x + y) % 3 ? p.orange : p.black}"/>`;
  return wrap(
    `${legs.map((d) => both(d, `stroke="${p.black}" stroke-width="12" fill="none" stroke-linecap="round"`)).join('')}
    <path d="M120 176 Q122 206 108 228" stroke="${p.black}" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M120 186 Q121 206 112 222" stroke="${p.orange}" stroke-width="7" fill="none" stroke-dasharray="6 7" stroke-linecap="round"/>
    <ellipse cx="120" cy="132" rx="38" ry="52" fill="${p.black}" stroke="${p.line}" stroke-width="2"/>
    ${beads}
    <ellipse cx="120" cy="66" rx="24" ry="22" fill="${p.black}" stroke="${p.line}" stroke-width="2"/>
    <circle cx="108" cy="58" r="3" fill="#c9a227"/><circle cx="132" cy="58" r="3" fill="#c9a227"/>
    <path d="M110 74 Q120 80 130 74" stroke="${p.orange}" stroke-width="2" fill="none"/>`,
    'トカゲ',
  );
}

// ---------------- イモリ（横から） ----------------
function newt(stage: number): string {
  const p = soften({ back: '#2b221d', belly: '#e8452a', line: '#120e0c' }, stage);
  return wrap(
    `<path d="M150 132 Q200 120 230 98 Q210 132 156 146 Z" fill="${p.back}"/>
    <path d="M60 128 Q70 100 120 102 Q160 104 170 130 Q150 152 110 152 Q70 150 60 128 Z" fill="${p.belly}" stroke="${p.line}" stroke-width="2"/>
    <path d="M60 128 Q70 100 120 102 Q160 104 170 130 Q140 124 110 126 Q80 128 60 128 Z" fill="${p.back}"/>
    ${[[90, 140], [110, 144], [130, 142], [150, 138]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#111"/>`).join('')}
    <path d="M86 148 L80 172 M104 150 L102 174 M136 148 L140 172 M152 144 L160 166" stroke="${p.back}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="74" cy="118" r="4" fill="#d9a63a"/><circle cx="74" cy="118" r="2" fill="#111"/>`,
    'イモリ',
  );
}

// ---------------- カモノハシ（横から） ----------------
function platypus(stage: number): string {
  const p = soften({ fur: '#6b4a2f', light: '#a07a55', bill: '#3a3a3c', line: '#2b1d12' }, stage);
  return wrap(
    `<path d="M168 136 Q214 130 226 150 Q206 166 170 156 Z" fill="${p.fur}" stroke="${p.line}" stroke-width="2"/>
    <ellipse cx="128" cy="140" rx="54" ry="30" fill="${p.fur}" stroke="${p.line}" stroke-width="2"/>
    <ellipse cx="128" cy="150" rx="40" ry="14" fill="${p.light}" opacity=".6"/>
    <ellipse cx="78" cy="128" rx="22" ry="18" fill="${p.fur}" stroke="${p.line}" stroke-width="2"/>
    <path d="M60 122 Q30 118 22 128 Q30 140 60 136 Z" fill="${p.bill}"/>
    <circle cx="78" cy="122" r="3" fill="#111"/>
    <path d="M100 164 l-8 14 l14 0 Z M150 164 l6 14 l-14 0 Z" fill="${p.bill}"/>
    <path d="M152 170 l10 6" stroke="#e8dcc0" stroke-width="3" stroke-linecap="round"/>`,
    'カモノハシ',
  );
}

// ---------------- スローロリス（前から） ----------------
function loris(stage: number): string {
  const p = soften({ fur: '#b79d80', dark: '#5a4532', light: '#efe4d4' }, stage);
  return wrap(
    `<path d="M20 190 L220 168" stroke="#6b4a2f" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="120" cy="160" rx="44" ry="40" fill="${p.fur}"/>
    <path d="M86 168 Q70 186 78 194 M154 168 Q170 186 162 194" stroke="${p.fur}" stroke-width="16" fill="none" stroke-linecap="round"/>
    <ellipse cx="120" cy="100" rx="46" ry="40" fill="${p.fur}"/>
    <ellipse cx="78" cy="78" rx="9" ry="8" fill="${p.dark}"/><ellipse cx="162" cy="78" rx="9" ry="8" fill="${p.dark}"/>
    <ellipse cx="100" cy="98" rx="20" ry="22" fill="${p.dark}"/><ellipse cx="140" cy="98" rx="20" ry="22" fill="${p.dark}"/>
    <path d="M120 66 L120 120" stroke="${p.light}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="100" cy="98" r="12" fill="#c98a2a"/><circle cx="140" cy="98" r="12" fill="#c98a2a"/>
    <circle cx="100" cy="98" r="6" fill="#111"/><circle cx="140" cy="98" r="6" fill="#111"/>
    <circle cx="97" cy="94" r="2.5" fill="#fff"/><circle cx="137" cy="94" r="2.5" fill="#fff"/>
    <ellipse cx="120" cy="124" rx="6" ry="4" fill="#3a2a1f"/>`,
    'スローロリス',
  );
}

// ---------------- ウミヘビ（およいでいる） ----------------
function seasnake(stage: number): string {
  const p = soften({ base: '#8fb1cf', band: '#14161c', head: '#6f92b2' }, stage);
  const d = 'M210 150 C180 120 160 180 130 150 C100 120 80 180 50 140';
  return wrap(
    `<path d="M210 150 Q228 140 230 156 Q222 166 208 158 Z" fill="${p.band}"/>
    <path d="${d}" stroke="${p.base}" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="${p.band}" stroke-width="20" fill="none" stroke-dasharray="9 14"/>
    <ellipse cx="44" cy="136" rx="18" ry="12" fill="${p.band}"/><path d="M30 136 Q40 126 54 132" stroke="${p.base}" stroke-width="5" fill="none"/>
    <circle cx="38" cy="132" r="2.5" fill="#fff"/>`,
    'ウミヘビ',
  );
}

export function creatureSvg(id: string, stage: number): string {
  const sp = SPECIES[id];
  if (!sp) return eggSvg('N');
  if (stage <= 0) return eggSvg(sp.rarity);
  switch (sp.art) {
    case 'scorpion':
      return scorpion(stage, sp.pal);
    case 'spider':
      return spider(stage, sp.pal);
    case 'hornet':
      return stage === 1 ? larva() : wasp(stage);
    case 'bee':
      return stage === 1 ? larva() : wasp(stage, { head: '#3a2a14', eye: '#120b04', thorax: '#b07a2a', abd: '#e0a640', band: '#3b2510', leg: '#3a2a14', line: '#2a1a08' }, true);
    case 'frog':
      return stage === 1 ? tadpole() : frog(stage);
    case 'toad':
      return stage === 1 ? tadpole('#3b3026') : frog(stage, { b1: '#b8925e', b2: '#6e5232', leg: '#8a6a44', pad: '#6e5232', spot: '#4a3622' }, true);
    case 'coil':
      return coil(stage, sp.pal);
    case 'cobra':
      return cobra(stage);
    case 'centipede':
      return centipede(stage);
    case 'caterpillar':
      return caterpillar(stage);
    case 'octopus':
      return octopus(stage);
    case 'stonefish':
      return stonefish(stage);
    case 'lionfish':
      return lionfish(stage);
    case 'puffer':
      return puffer(stage);
    case 'jelly':
      return jelly(stage);
    case 'cone':
      return cone(stage);
    case 'ray':
      return ray(stage);
    case 'lizard':
      return lizard(stage);
    case 'newt':
      return newt(stage);
    case 'platypus':
      return platypus(stage);
    case 'loris':
      return loris(stage);
    case 'seasnake':
      return seasnake(stage);
  }
}

// ---------------- たまご ----------------
export function eggSvg(r: Rarity): string {
  const g = uid('eg');
  const pal =
    r === 'SR'
      ? { a: '#fff6c2', b: '#f2b705', spot: '#ffffff', line: '#b88400' }
      : r === 'R'
        ? { a: '#d5fbf6', b: '#2fb3a6', spot: '#7c4dff', line: '#1d7c73' }
        : { a: '#fffaf0', b: '#e2d3b0', spot: '#a07a4a', line: '#b9a47c' };
  const spots: [number, number, number][] = [[100, 100, 6], [140, 92, 4], [126, 132, 7], [96, 152, 5], [150, 150, 6], [118, 176, 4], [112, 80, 3]];
  const sparkle =
    r === 'SR'
      ? `<path d="M176 64 l5 13 l13 5 l-13 5 l-5 13 l-5 -13 l-13 -5 l13 -5 Z" fill="#fff59d"/><path d="M62 150 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#fff59d"/>`
      : '';
  return wrap(
    `<defs><radialGradient id="${g}" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${pal.a}"/><stop offset="1" stop-color="${pal.b}"/></radialGradient></defs>
    <ellipse cx="120" cy="210" rx="52" ry="10" fill="rgba(0,0,0,.18)"/>
    <path d="M120 40 C162 40 184 110 184 148 C184 190 156 212 120 212 C84 212 56 190 56 148 C56 110 78 40 120 40 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2.5"/>
    ${spots.map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="${pal.spot}" opacity="${r === 'SR' ? 0.7 : 0.55}"/>`).join('')}
    <ellipse cx="98" cy="88" rx="12" ry="22" fill="#fff" opacity=".35" transform="rotate(20 98 88)"/>${sparkle}`,
    'たまご',
  );
}

// ---------------- ボス ----------------
export function bossSvg(id: BossId): string {
  if (id === 'hebikui')
    return wrap(
      `<path d="M166 128 L218 172 L210 180 L160 138 Z" fill="#e9ebee" stroke="#555" stroke-width="1.5"/><path d="M206 168 L218 172 L210 180 Z" fill="#111"/>
      <path d="M124 146 L130 186" stroke="#1d1d1d" stroke-width="12" stroke-linecap="round"/><path d="M144 146 L146 186" stroke="#1d1d1d" stroke-width="12" stroke-linecap="round"/>
      <path d="M130 186 L124 224 M146 186 L148 224" stroke="#c7b8a8" stroke-width="5" stroke-linecap="round"/>
      <path d="M124 224 L112 228 M124 224 L132 229 M148 224 L136 228 M148 224 L158 229" stroke="#c7b8a8" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="140" cy="122" rx="36" ry="25" transform="rotate(-14 140 122)" fill="#cfd4da" stroke="#555" stroke-width="1.5"/>
      <path d="M118 134 Q146 150 176 128 Q160 146 128 146 Z" fill="#1b1b1b"/>
      <path d="M114 112 Q104 92 102 76" stroke="#cfd4da" stroke-width="16" stroke-linecap="round"/>
      <path d="M108 60 L140 40 M110 64 L144 54 M106 58 L132 30 M108 66 L138 66" stroke="#151515" stroke-width="4" stroke-linecap="round"/>
      <circle cx="98" cy="66" r="15" fill="#d5d9de" stroke="#555" stroke-width="1.5"/><ellipse cx="92" cy="66" rx="10" ry="8" fill="#f06a2a"/>
      <circle cx="92" cy="64" r="2.8" fill="#3a1d0c"/><path d="M84 66 Q68 68 73 80 Q79 73 86 73 Z" fill="#8c939a" stroke="#555" stroke-width="1.2"/>`,
      'ヘビクイワシ',
    );
  if (id === 'mongoose') {
    const g = uid('mg');
    return wrap(
      `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a89274"/><stop offset="1" stop-color="#6f5d45"/></linearGradient></defs>
      <path d="M176 148 Q210 156 228 190 Q214 186 200 176 Q186 166 170 160 Z" fill="url(#${g})" stroke="#4d3f2d" stroke-width="1.5"/>
      ${[104, 120, 160, 176].map((x) => `<rect x="${x}" y="160" width="12" height="38" rx="6" fill="#5e4f3b"/>`).join('')}
      <ellipse cx="140" cy="150" rx="50" ry="23" fill="url(#${g})" stroke="#4d3f2d" stroke-width="1.5"/>
      <ellipse cx="86" cy="138" rx="24" ry="17" transform="rotate(-10 86 138)" fill="url(#${g})" stroke="#4d3f2d" stroke-width="1.5"/>
      <path d="M70 132 Q56 138 54 146 Q66 150 76 148 Z" fill="#8a765a" stroke="#4d3f2d" stroke-width="1.5"/><circle cx="55" cy="145" r="3.2" fill="#1a120a"/>
      <path d="M90 124 a7 7 0 1 1 12 4" fill="#7a6750" stroke="#4d3f2d" stroke-width="1.5"/><circle cx="78" cy="133" r="3.4" fill="#1a120a"/>`,
      'マングース',
    );
  }
  return wrap(
    `<path d="M186 138 Q202 128 210 116 Q206 134 194 146 Z" fill="#141414"/>
    ${[88, 108, 156, 176].map((x) => `<rect x="${x}" y="162" width="18" height="36" rx="8" fill="#121212"/><path d="M${x} 198 l-4 6 M${x + 6} 199 l-3 7 M${x + 12} 199 l-2 7" stroke="#d9d4c7" stroke-width="2.5" stroke-linecap="round"/>`).join('')}
    <ellipse cx="134" cy="150" rx="62" ry="32" fill="#161616"/>
    <path d="M60 134 Q120 104 190 128 Q194 138 186 142 Q120 124 70 150 Z" fill="#d1d0c8"/>
    <ellipse cx="70" cy="150" rx="25" ry="21" fill="#151515"/><path d="M52 140 Q66 126 92 130 Q78 136 60 146 Z" fill="#d1d0c8"/>
    <circle cx="80" cy="136" r="5" fill="#2a2a2a"/><circle cx="60" cy="149" r="2.6" fill="#c9c2a8"/><circle cx="47" cy="157" r="3.5" fill="#050505"/>`,
    'ラーテル',
  );
}
