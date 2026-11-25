// 図鑑風のイラスト（SVG）。色や模様は実物に合わせている。
// stage: 0=たまご 1=あかちゃん 2=こども 3=おとな
import type { BossId, Rarity, SpeciesId } from './data';

let uidSeq = 0;
const uid = (p: string) => `${p}${++uidSeq}`;

const wrap = (inner: string, label: string) =>
  `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${inner}</svg>`;

const mirrorX = (d: string) =>
  d.replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_m, c: string, x: string, y: string) => `${c}${240 - Number(x)} ${y}`)
    .replace(/Q\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
      (_m, x1: string, y1: string, x2: string, y2: string) => `Q${240 - Number(x1)} ${y1} ${240 - Number(x2)} ${y2}`);

const both = (d: string, attrs: string) => `<path d="${d}" ${attrs}/><path d="${mirrorX(d)}" ${attrs}/>`;

// ---------------- サソリ（上から見た図） ----------------
function scorpion(stage: number): string {
  const pal =
    stage === 1
      ? { b1: '#fffaf0', b2: '#ddd0b4', line: '#a49576', dark: '#7d705a' }
      : stage === 2
        ? { b1: '#efcd84', b2: '#b98a3a', line: '#5d3e15', dark: '#3b2709' }
        : { b1: '#e6b458', b2: '#9a6620', line: '#4a2f0e', dark: '#2a1906' };
  const g = uid('sc');
  const legs = [
    'M100 100 L80 86 L66 92 L60 104',
    'M98 112 L74 106 L58 116 L52 130',
    'M98 124 L72 126 L58 140 L54 156',
    'M100 136 L76 146 L66 164 L64 180',
  ];
  const legAttr = `stroke="${pal.line}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const legInner = `stroke="${pal.b2}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const tail: [number, number, number][] = [
    [120, 184, 9],
    [124, 200, 9],
    [132, 214, 9],
    [146, 222, 9],
    [162, 220, 10],
  ];
  const chela = (flip: boolean) => {
    const t = flip ? ' transform="translate(240 0) scale(-1 1)"' : '';
    return `<g${t}>
      <path d="M104 82 L90 66 L84 54" stroke="${pal.line}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M104 82 L90 66 L84 54" stroke="url(#${g})" stroke-width="6" fill="none" stroke-linecap="round"/>
      <ellipse cx="80" cy="40" rx="12" ry="17" transform="rotate(-18 80 40)" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/>
      <path d="M71 30 Q64 14 75 6 Q78 18 77 28 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/>
      <path d="M86 28 Q93 14 85 6 Q81 16 81 27 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2"/>
    </g>`;
  };
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

// ---------------- セアカゴケグモ（上から見た図） ----------------
function spider(stage: number): string {
  const pal =
    stage === 1
      ? { abd: '#efe4cf', abd2: '#c7b494', stripe: '#c98d5c', leg: '#a48a68', ceph: '#b9a07c' }
      : stage === 2
        ? { abd: '#4a3b2f', abd2: '#2a211a', stripe: '#d9572b', leg: '#3a2e25', ceph: '#3a2e25' }
        : { abd: '#2b2b33', abd2: '#0b0b0f', stripe: '#e3262d', leg: '#141418', ceph: '#18181c' };
  const g = uid('sp');
  const legs = [
    'M108 90 Q90 70 82 50 Q78 40 70 26',
    'M106 94 Q82 82 64 72 Q52 66 38 64',
    'M106 100 Q84 108 64 120 Q54 126 44 140',
    'M108 104 Q92 124 82 150 Q76 166 70 186',
  ];
  const babyStripes =
    stage === 1
      ? `<path d="M90 140 Q120 150 150 140" stroke="${pal.abd2}" stroke-width="5" fill="none"/><path d="M94 160 Q120 170 146 160" stroke="${pal.abd2}" stroke-width="5" fill="none"/>`
      : '';
  return wrap(
    `<defs><radialGradient id="${g}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="${pal.abd}"/><stop offset="1" stop-color="${pal.abd2}"/></radialGradient></defs>
    ${legs.map((d) => both(d, `stroke="${pal.leg}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"`)).join('')}
    ${both('M114 84 L110 74', `stroke="${pal.leg}" stroke-width="3" stroke-linecap="round"`)}
    <ellipse cx="120" cy="96" rx="16" ry="14" fill="${pal.ceph}"/>
    <circle cx="116" cy="88" r="1.8" fill="#666"/><circle cx="124" cy="88" r="1.8" fill="#666"/>
    <ellipse cx="120" cy="148" rx="38" ry="44" fill="url(#${g})"/>
    ${babyStripes}
    <path d="M120 110 C112 120 112 130 118 138 C110 146 110 160 120 180 C130 160 130 146 122 138 C128 130 128 120 120 110 Z" fill="${pal.stripe}"/>
    <ellipse cx="104" cy="128" rx="9" ry="16" fill="#fff" opacity=".22" transform="rotate(20 104 128)"/>`,
    'セアカゴケグモ',
  );
}

// ---------------- オオスズメバチ ----------------
function hornetLarva(): string {
  let circles = '';
  const n = 10;
  for (let i = n - 1; i >= 0; i--) {
    const a = ((-40 - i * 26) * Math.PI) / 180;
    const x = 120 + 50 * Math.cos(a);
    const y = 126 + 50 * Math.sin(a);
    const r = 24 - i * 1.1;
    circles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#f8f3e6" stroke="#d6cab2" stroke-width="2"/>`;
  }
  const ha = (-40 * Math.PI) / 180;
  const hx = 120 + 50 * Math.cos(ha) + 14;
  const hy = 126 + 50 * Math.sin(ha) - 10;
  return wrap(
    `${circles}
    <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="13" fill="#e8b866" stroke="#9c6b22" stroke-width="2"/>
    <path d="M${(hx + 8).toFixed(1)} ${(hy + 6).toFixed(1)} l8 4 l-6 4" stroke="#6b4310" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    'オオスズメバチの ようちゅう',
  );
}

function hornet(stage: number): string {
  const pupa = stage === 2;
  const pal = pupa
    ? { head: '#f2e6cb', eye: '#9b6a45', thorax: '#efe0c2', abd: '#f6ecd6', band: '#e2cfa8', leg: '#e0cfac', line: '#c9b48c' }
    : { head: '#f0a01e', eye: '#2a1a0c', thorax: '#4b2c12', abd: '#f3b52f', band: '#3b220d', leg: '#5a3510', line: '#3b220d' };
  const clip = uid('hb');
  const legs = ['M104 92 L86 86 L78 94', 'M102 100 L82 106 L74 120', 'M104 108 L88 128 L84 148'];
  const wings = pupa
    ? ''
    : `<g fill="rgba(240,222,180,.5)" stroke="rgba(120,90,40,.55)" stroke-width="1.5">
        <ellipse cx="96" cy="134" rx="13" ry="42" transform="rotate(16 96 134)"/>
        <ellipse cx="144" cy="134" rx="13" ry="42" transform="rotate(-16 144 134)"/>
        <ellipse cx="104" cy="140" rx="8" ry="28" transform="rotate(8 104 140)"/>
        <ellipse cx="136" cy="140" rx="8" ry="28" transform="rotate(-8 136 140)"/>
      </g>`;
  return wrap(
    `<defs><clipPath id="${clip}"><ellipse cx="120" cy="156" rx="26" ry="38"/></clipPath></defs>
    ${legs.map((d) => both(d, `stroke="${pal.leg}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"`)).join('')}
    ${both('M112 56 Q100 36 92 26', `stroke="${pal.line}" stroke-width="3" fill="none" stroke-linecap="round"`)}
    <g clip-path="url(#${clip})">
      <rect x="90" y="114" width="60" height="90" fill="${pal.abd}"/>
      <rect x="90" y="114" width="60" height="18" fill="${pal.band}"/>
      <rect x="90" y="142" width="60" height="6" fill="${pal.band}"/>
      <rect x="90" y="158" width="60" height="6" fill="${pal.band}"/>
      <rect x="90" y="174" width="60" height="7" fill="${pal.band}"/>
      <rect x="90" y="188" width="60" height="20" fill="${pal.band}"/>
    </g>
    <ellipse cx="120" cy="156" rx="26" ry="38" fill="none" stroke="${pal.line}" stroke-width="2"/>
    <ellipse cx="120" cy="116" rx="5" ry="4" fill="${pal.thorax}"/>
    <ellipse cx="120" cy="98" rx="20" ry="18" fill="${pal.thorax}" stroke="${pal.line}" stroke-width="2"/>
    ${pupa ? '' : '<circle cx="112" cy="104" r="3" fill="#c98a2a"/><circle cx="128" cy="104" r="3" fill="#c98a2a"/>'}
    <ellipse cx="120" cy="66" rx="23" ry="17" fill="${pal.head}" stroke="${pal.line}" stroke-width="2"/>
    <path d="M100 58 Q95 67 102 77 Q109 70 106 60 Z" fill="${pal.eye}"/>
    <path d="M140 58 Q145 67 138 77 Q131 70 134 60 Z" fill="${pal.eye}"/>
    <path d="M112 80 Q115 90 120 85 Q125 90 128 80" fill="${pal.eye}" stroke="${pal.line}" stroke-width="1.5"/>
    <circle cx="116" cy="56" r="1.8" fill="${pal.eye}"/><circle cx="124" cy="56" r="1.8" fill="${pal.eye}"/><circle cx="120" cy="52" r="1.8" fill="${pal.eye}"/>
    ${wings}`,
    pupa ? 'オオスズメバチの さなぎ' : 'オオスズメバチ',
  );
}

// ---------------- ヤドクガエル ----------------
function tadpole(): string {
  const g = uid('td');
  return wrap(
    `<defs><radialGradient id="${g}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#5b5560"/><stop offset="1" stop-color="#26232b"/></radialGradient></defs>
    <path d="M136 118 Q170 96 210 120 Q174 136 136 130 Z" fill="#3c3842" opacity=".85"/>
    <path d="M136 118 Q170 104 206 120" stroke="#8d8794" stroke-width="1.5" fill="none" opacity=".6"/>
    <ellipse cx="108" cy="122" rx="36" ry="27" fill="url(#${g})"/>
    <circle cx="92" cy="112" r="6" fill="#111"/><circle cx="90" cy="110" r="2" fill="#fff"/>
    <ellipse cx="100" cy="132" rx="14" ry="6" fill="#6e6876" opacity=".5"/>`,
    'おたまじゃくし',
  );
}

function frog(stage: number): string {
  const juv = stage === 2;
  const pal = juv
    ? { b1: '#3a4f8a', b2: '#1b2346', leg: '#2f5fc4', pad: '#22397a' }
    : { b1: '#3d86f2', b2: '#163e9c', leg: '#2a3fa8', pad: '#1a2c78' };
  const g = uid('fr');
  const spots: [number, number, number][] = [
    [108, 96, 5],
    [133, 95, 4],
    [120, 140, 7],
    [100, 152, 5],
    [142, 156, 6],
    [118, 168, 4],
    [88, 132, 4],
    [153, 130, 5],
    [128, 118, 3],
    [104, 112, 3],
  ];
  return wrap(
    `<defs><radialGradient id="${g}" cx="45%" cy="30%" r="80%"><stop offset="0" stop-color="${pal.b1}"/><stop offset="1" stop-color="${pal.b2}"/></radialGradient></defs>
    <ellipse cx="74" cy="172" rx="32" ry="18" transform="rotate(-18 74 172)" fill="${pal.leg}"/>
    <ellipse cx="166" cy="172" rx="32" ry="18" transform="rotate(18 166 172)" fill="${pal.leg}"/>
    ${[48, 58, 68].map((x, i) => `<circle cx="${x}" cy="${194 + i * 3}" r="4.5" fill="${pal.pad}"/><circle cx="${240 - x}" cy="${194 + i * 3}" r="4.5" fill="${pal.pad}"/>`).join('')}
    <ellipse cx="120" cy="150" rx="50" ry="42" fill="url(#${g})"/>
    <ellipse cx="120" cy="104" rx="44" ry="30" fill="url(#${g})"/>
    ${spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#0d0d14"/>`).join('')}
    <circle cx="94" cy="86" r="16" fill="#0b0b10"/><circle cx="146" cy="86" r="16" fill="#0b0b10"/>
    <circle cx="89" cy="80" r="5" fill="#fff" opacity=".85"/><circle cx="141" cy="80" r="5" fill="#fff" opacity=".85"/>
    <path d="M92 118 Q120 130 148 118" stroke="#0b0b10" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${both('M90 148 Q78 172 84 196', `stroke="${pal.leg}" stroke-width="10" fill="none" stroke-linecap="round"`)}
    ${[76, 84, 92].map((x, i) => `<circle cx="${x}" cy="${200 + (i === 1 ? 3 : 0)}" r="4.5" fill="${pal.pad}"/><circle cx="${240 - x}" cy="${200 + (i === 1 ? 3 : 0)}" r="4.5" fill="${pal.pad}"/>`).join('')}
    <ellipse cx="108" cy="96" rx="16" ry="8" fill="#fff" opacity=".18"/>`,
    juv ? 'こがえる' : 'ヤドクガエル',
  );
}

// ---------------- ヘビ（ハブ・キングコブラ） ----------------
function habu(stage: number): string {
  const pal =
    stage === 1
      ? { base: '#cdc184', pat: '#76683a', head: '#bdb173' }
      : stage === 2
        ? { base: '#bfb164', pat: '#5a5026', head: '#ada055' }
        : { base: '#b3a24e', pat: '#40381a', head: '#9e8f42' };
  const bodyPath = (d: string, w: number) =>
    `<path d="${d}" stroke="${pal.pat}" stroke-width="${w + 4}" fill="none" stroke-linecap="round"/>
     <path d="${d}" stroke="${pal.base}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
     <path d="${d}" stroke="${pal.pat}" stroke-width="${w - 10}" fill="none" stroke-dasharray="9 13" stroke-linecap="butt" opacity=".9"/>`;
  return wrap(
    `${bodyPath('M60 182 A62 22 0 1 0 184 182 A62 22 0 1 0 60 182', 26)}
    ${bodyPath('M74 158 A46 16 0 1 0 166 158 A46 16 0 1 0 98 168', 24)}
    ${bodyPath('M150 152 C174 132 160 108 140 100 C124 94 124 80 140 72', 20)}
    <path d="M132 74 Q140 52 162 49 Q183 51 188 62 Q184 73 160 78 Q144 80 132 74 Z" fill="${pal.head}" stroke="${pal.pat}" stroke-width="2.5"/>
    <path d="M146 60 Q160 56 176 58" stroke="${pal.pat}" stroke-width="3" fill="none" opacity=".7"/>
    <circle cx="166" cy="60" r="4.4" fill="#e8c840"/><ellipse cx="166" cy="60" rx="1.3" ry="3.6" fill="#111"/>
    <circle cx="178" cy="65" r="1.9" fill="#222"/>
    <path d="M188 64 L200 66 L207 61 M200 66 L207 71" stroke="#d63333" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    'ハブ',
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
    <path d="M112 76 Q120 70 128 76 M110 96 Q120 90 130 96" stroke="${pal.base}" stroke-width="3" fill="none" opacity=".55"/>
    <ellipse cx="120" cy="48" rx="18" ry="15" fill="${pal.base}" stroke="#1a160c" stroke-width="2"/>
    <path d="M108 42 Q120 36 132 42 M110 50 L130 50" stroke="#1a160c" stroke-width="1.4" fill="none" opacity=".6"/>
    <circle cx="110" cy="46" r="3.6" fill="${pal.eye}"/><circle cx="110" cy="46" r="2" fill="#0a0a0a"/>
    <circle cx="130" cy="46" r="3.6" fill="${pal.eye}"/><circle cx="130" cy="46" r="2" fill="#0a0a0a"/>
    <path d="M120 62 L120 72 M120 72 L115 78 M120 72 L125 78" stroke="#d63333" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    'キングコブラ',
  );
}

export function creatureSvg(id: SpeciesId, stage: number): string {
  if (stage <= 0) return eggSvg('N');
  switch (id) {
    case 'sasori':
      return scorpion(stage);
    case 'seaka':
      return spider(stage);
    case 'suzumebachi':
      return stage === 1 ? hornetLarva() : hornet(stage);
    case 'yadoku':
      return stage === 1 ? tadpole() : frog(stage);
    case 'habu':
      return habu(stage);
    case 'cobra':
      return cobra(stage);
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
  const spots: [number, number, number][] = [
    [100, 100, 6],
    [140, 92, 4],
    [126, 132, 7],
    [96, 152, 5],
    [150, 150, 6],
    [118, 176, 4],
    [112, 80, 3],
  ];
  const sparkle =
    r === 'SR'
      ? `<path d="M176 64 l5 13 l13 5 l-13 5 l-5 13 l-5 -13 l-13 -5 l13 -5 Z" fill="#fff59d"/><path d="M62 150 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#fff59d"/>`
      : '';
  return wrap(
    `<defs><radialGradient id="${g}" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${pal.a}"/><stop offset="1" stop-color="${pal.b}"/></radialGradient></defs>
    <ellipse cx="120" cy="210" rx="52" ry="10" fill="rgba(0,0,0,.18)"/>
    <path d="M120 40 C162 40 184 110 184 148 C184 190 156 212 120 212 C84 212 56 190 56 148 C56 110 78 40 120 40 Z" fill="url(#${g})" stroke="${pal.line}" stroke-width="2.5"/>
    ${spots.map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="${pal.spot}" opacity="${r === 'SR' ? 0.7 : 0.55}"/>`).join('')}
    <ellipse cx="98" cy="88" rx="12" ry="22" fill="#fff" opacity=".35" transform="rotate(20 98 88)"/>
    ${sparkle}`,
    'たまご',
  );
}

// ---------------- ボス ----------------
function secretaryBird(): string {
  return wrap(
    `<path d="M166 128 L218 172 L210 180 L160 138 Z" fill="#e9ebee" stroke="#555" stroke-width="1.5"/>
    <path d="M206 168 L218 172 L210 180 Z" fill="#111"/>
    <path d="M124 146 L130 186" stroke="#1d1d1d" stroke-width="12" stroke-linecap="round"/>
    <path d="M144 146 L146 186" stroke="#1d1d1d" stroke-width="12" stroke-linecap="round"/>
    <path d="M130 186 L124 224 M146 186 L148 224" stroke="#c7b8a8" stroke-width="5" stroke-linecap="round"/>
    <path d="M124 224 L112 228 M124 224 L132 229 M148 224 L136 228 M148 224 L158 229" stroke="#c7b8a8" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="140" cy="122" rx="36" ry="25" transform="rotate(-14 140 122)" fill="#cfd4da" stroke="#555" stroke-width="1.5"/>
    <path d="M118 134 Q146 150 176 128 Q160 146 128 146 Z" fill="#1b1b1b"/>
    <path d="M114 112 Q104 92 102 76" stroke="#cfd4da" stroke-width="16" stroke-linecap="round"/>
    <path d="M108 60 L140 40 M110 64 L144 54 M106 58 L132 30 M108 66 L138 66" stroke="#151515" stroke-width="4" stroke-linecap="round"/>
    <circle cx="98" cy="66" r="15" fill="#d5d9de" stroke="#555" stroke-width="1.5"/>
    <ellipse cx="92" cy="66" rx="10" ry="8" fill="#f06a2a"/>
    <circle cx="92" cy="64" r="2.8" fill="#3a1d0c"/>
    <path d="M84 66 Q68 68 73 80 Q79 73 86 73 Z" fill="#8c939a" stroke="#555" stroke-width="1.2"/>`,
    'ヘビクイワシ',
  );
}

function mongoose(): string {
  const g = uid('mg');
  return wrap(
    `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a89274"/><stop offset="1" stop-color="#6f5d45"/></linearGradient></defs>
    <path d="M176 148 Q210 156 228 190 Q214 186 200 176 Q186 166 170 160 Z" fill="url(#${g})" stroke="#4d3f2d" stroke-width="1.5"/>
    ${[104, 120, 160, 176].map((x) => `<rect x="${x}" y="160" width="12" height="38" rx="6" fill="#5e4f3b"/>`).join('')}
    <ellipse cx="140" cy="150" rx="50" ry="23" fill="url(#${g})" stroke="#4d3f2d" stroke-width="1.5"/>
    ${[110, 126, 142, 158, 172].map((x, i) => `<path d="M${x} ${138 + (i % 2) * 6} l6 -3" stroke="#e3d6bf" stroke-width="1.5" opacity=".7"/>`).join('')}
    <ellipse cx="86" cy="138" rx="24" ry="17" transform="rotate(-10 86 138)" fill="url(#${g})" stroke="#4d3f2d" stroke-width="1.5"/>
    <path d="M70 132 Q56 138 54 146 Q66 150 76 148 Z" fill="#8a765a" stroke="#4d3f2d" stroke-width="1.5"/>
    <circle cx="55" cy="145" r="3.2" fill="#1a120a"/>
    <path d="M90 124 a7 7 0 1 1 12 4" fill="#7a6750" stroke="#4d3f2d" stroke-width="1.5"/>
    <circle cx="78" cy="133" r="3.4" fill="#1a120a"/><circle cx="77" cy="132" r="1.1" fill="#fff"/>`,
    'マングース',
  );
}

function honeyBadger(): string {
  return wrap(
    `<path d="M186 138 Q202 128 210 116 Q206 134 194 146 Z" fill="#141414"/>
    ${[88, 108, 156, 176].map((x) => `<rect x="${x}" y="162" width="18" height="36" rx="8" fill="#121212"/><path d="M${x} 198 l-4 6 M${x + 6} 199 l-3 7 M${x + 12} 199 l-2 7" stroke="#d9d4c7" stroke-width="2.5" stroke-linecap="round"/>`).join('')}
    <ellipse cx="134" cy="150" rx="62" ry="32" fill="#161616"/>
    <path d="M60 134 Q120 104 190 128 Q194 138 186 142 Q120 124 70 150 Z" fill="#d1d0c8"/>
    <ellipse cx="70" cy="150" rx="25" ry="21" fill="#151515"/>
    <path d="M52 140 Q66 126 92 130 Q78 136 60 146 Z" fill="#d1d0c8"/>
    <circle cx="80" cy="136" r="5" fill="#2a2a2a"/>
    <circle cx="60" cy="149" r="2.6" fill="#c9c2a8"/>
    <circle cx="47" cy="157" r="3.5" fill="#050505"/>`,
    'ミツアナグマ',
  );
}

export function bossSvg(id: BossId): string {
  switch (id) {
    case 'hebikui':
      return secretaryBird();
    case 'mongoose':
      return mongoose();
    case 'mitsuanaguma':
      return honeyBadger();
  }
}
