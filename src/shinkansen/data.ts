// 新幹線うんてんし：駅・区間・列車・コースのデータ（東海道新幹線 下り）
// 距離はゲーム用に短くしている（実際の距離のままだと 東京〜新大阪で2時間半かかるため）

export interface Station {
  kanji: string;
  yomi: string;
  realKm: number;
  region: 'urban' | 'town' | 'rural';
  side: 'left' | 'right'; // ドアが開く側（下り）
  size: number; // 乗客の多さ 1〜3
}

export const STATIONS: Station[] = [
  { kanji: '東京', yomi: 'とうきょう', realKm: 0, region: 'urban', side: 'left', size: 3 },
  { kanji: '品川', yomi: 'しながわ', realKm: 6.8, region: 'urban', side: 'left', size: 3 },
  { kanji: '新横浜', yomi: 'しんよこはま', realKm: 25.5, region: 'urban', side: 'left', size: 3 },
  { kanji: '小田原', yomi: 'おだわら', realKm: 76.7, region: 'town', side: 'left', size: 2 },
  { kanji: '熱海', yomi: 'あたみ', realKm: 95.4, region: 'town', side: 'left', size: 2 },
  { kanji: '三島', yomi: 'みしま', realKm: 111.3, region: 'town', side: 'left', size: 2 },
  { kanji: '新富士', yomi: 'しんふじ', realKm: 135.0, region: 'rural', side: 'left', size: 1 },
  { kanji: '静岡', yomi: 'しずおか', realKm: 167.4, region: 'urban', side: 'left', size: 2 },
  { kanji: '掛川', yomi: 'かけがわ', realKm: 211.3, region: 'rural', side: 'left', size: 1 },
  { kanji: '浜松', yomi: 'はままつ', realKm: 238.9, region: 'urban', side: 'left', size: 2 },
  { kanji: '豊橋', yomi: 'とよはし', realKm: 274.2, region: 'town', side: 'left', size: 2 },
  { kanji: '三河安城', yomi: 'みかわあんじょう', realKm: 312.8, region: 'rural', side: 'left', size: 1 },
  { kanji: '名古屋', yomi: 'なごや', realKm: 342.0, region: 'urban', side: 'left', size: 3 },
  { kanji: '岐阜羽島', yomi: 'ぎふはしま', realKm: 367.1, region: 'rural', side: 'left', size: 1 },
  { kanji: '米原', yomi: 'まいばら', realKm: 408.2, region: 'rural', side: 'left', size: 1 },
  { kanji: '京都', yomi: 'きょうと', realKm: 476.3, region: 'urban', side: 'left', size: 3 },
  { kanji: '新大阪', yomi: 'しんおおさか', realKm: 515.4, region: 'urban', side: 'left', size: 3 },
];

// 駅と駅のあいだ（i → i+1）の様子。tunnels と river はその区間の中の位置（0〜1）
export interface Segment {
  limit: number; // 区間の最高速度 km/h
  tunnels?: [number, number][];
  rivers?: { at: number; name: string }[];
  sea?: boolean; // 左に海
  lake?: boolean; // 左に湖
  tea?: boolean; // 茶畑
  mountains?: boolean;
}

export const SEGMENTS: Segment[] = [
  { limit: 110 }, // 東京-品川
  { limit: 170, rivers: [{ at: 0.45, name: 'たまがわ' }] }, // 品川-新横浜
  { limit: 270, rivers: [{ at: 0.5, name: 'さがみがわ' }], mountains: true }, // 新横浜-小田原
  { limit: 250, tunnels: [[0.25, 0.4], [0.55, 0.85]], sea: true, mountains: true }, // 小田原-熱海
  { limit: 270, tunnels: [[0.12, 0.7]], mountains: true }, // 熱海-三島（新丹那トンネル）
  { limit: 285, mountains: true }, // 三島-新富士
  { limit: 285, rivers: [{ at: 0.2, name: 'ふじがわ' }], tunnels: [[0.7, 0.8]], mountains: true }, // 新富士-静岡
  { limit: 285, tunnels: [[0.15, 0.3]], rivers: [{ at: 0.65, name: 'おおいがわ' }], tea: true, mountains: true }, // 静岡-掛川
  { limit: 285, rivers: [{ at: 0.6, name: 'てんりゅうがわ' }], tea: true }, // 掛川-浜松
  { limit: 285, lake: true }, // 浜松-豊橋（浜名湖）
  { limit: 285 }, // 豊橋-三河安城
  { limit: 270 }, // 三河安城-名古屋
  { limit: 230, rivers: [{ at: 0.55, name: 'きそがわ' }] }, // 名古屋-岐阜羽島
  { limit: 270, rivers: [{ at: 0.15, name: 'ながらがわ' }], mountains: true }, // 岐阜羽島-米原
  { limit: 285, tunnels: [[0.82, 0.9]], mountains: true }, // 米原-京都
  { limit: 255, rivers: [{ at: 0.7, name: 'よどがわ' }] }, // 京都-新大阪
];

// ゲームでの距離（m）
export function segmentLength(i: number): number {
  const real = STATIONS[i + 1].realKm - STATIONS[i].realKm;
  return Math.round(3000 + real * 105);
}

// 各駅の停止位置（ルートの先頭からの距離 m）。最初の駅の前に 600m の余白を作る
export const START_MARGIN = 600;
export const STATION_POS: number[] = (() => {
  const pos = [START_MARGIN];
  for (let i = 0; i < SEGMENTS.length; i++) pos.push(pos[i] + segmentLength(i));
  return pos;
})();
export const ROUTE_LENGTH = STATION_POS[STATION_POS.length - 1] + 1500;

export type TrainType = 'kodama' | 'hikari' | 'nozomi';

export const TRAIN_TYPES: Record<TrainType, { name: string; color: string; stops: number[]; desc: string }> = {
  kodama: { name: 'こだま', color: '#2f9e44', stops: STATIONS.map((_, i) => i), desc: 'ぜんぶの えきに とまる' },
  hikari: { name: 'ひかり', color: '#f08c00', stops: [0, 1, 2, 3, 7, 9, 12, 15, 16], desc: 'おもな えきに とまる' },
  nozomi: { name: 'のぞみ', color: '#e03131', stops: [0, 1, 2, 12, 15, 16], desc: 'とまる えきが すくなくて はやい' },
};

export interface Course {
  id: string;
  type: TrainType;
  from: number;
  to: number;
  level: 1 | 2 | 3;
  note?: string;
}

export const COURSES: Course[] = [
  { id: 'k-tokyo', type: 'kodama', from: 0, to: 2, level: 1, note: 'はじめての うんてん' },
  { id: 'k-odawara', type: 'kodama', from: 2, to: 4, level: 1, note: 'うみが みえる' },
  { id: 'k-fuji', type: 'kodama', from: 4, to: 6, level: 1, note: 'ながい トンネルと ふじさん' },
  { id: 'k-hamamatsu', type: 'kodama', from: 8, to: 10, level: 1, note: 'はまなこ' },
  { id: 'h-shizuoka', type: 'hikari', from: 7, to: 12, level: 2, note: 'ふじかわ・はまなこ' },
  { id: 'h-nagoya', type: 'hikari', from: 12, to: 16, level: 2 },
  { id: 'n-nagoya', type: 'nozomi', from: 0, to: 12, level: 3, note: 'ながい ちょくつう' },
  { id: 'n-osaka', type: 'nozomi', from: 12, to: 16, level: 3 },
];

export function courseStops(c: Course): number[] {
  return TRAIN_TYPES[c.type].stops.filter((i) => i >= c.from && i <= c.to);
}

// 車両の性能（ゲーム用）。加速・ブレーキは km/h/s
export const VEHICLE = {
  name: 'しんかんせん',
  maxSpeed: 285,
  cars: 16,
  length: 400,
  powerAccel: [0, 0.9, 1.8, 2.7, 3.6, 4.5],
  brakeDecel: [0, 0.8, 1.5, 2.2, 2.9, 3.6, 4.3, 5.0],
  emergencyDecel: 6.0,
};

// ATC の表示に使う速度の段
export const ATC_STEPS = [285, 270, 255, 230, 210, 160, 110, 70, 30, 0];

// 区間ごとの最高速度（停車駅の前後はATCで下がる）
export function segmentIndexAt(s: number): number {
  for (let i = 0; i < SEGMENTS.length; i++) if (s < STATION_POS[i + 1]) return Math.max(0, i);
  return SEGMENTS.length - 1;
}

export interface Span {
  from: number;
  to: number;
}

export const TUNNELS: Span[] = SEGMENTS.flatMap((seg, i) =>
  (seg.tunnels ?? []).map(([a, b]) => ({
    from: STATION_POS[i] + (STATION_POS[i + 1] - STATION_POS[i]) * a,
    to: STATION_POS[i] + (STATION_POS[i + 1] - STATION_POS[i]) * b,
  })),
);

export const RIVERS: { at: number; name: string }[] = SEGMENTS.flatMap((seg, i) =>
  (seg.rivers ?? []).map((r) => ({ at: STATION_POS[i] + (STATION_POS[i + 1] - STATION_POS[i]) * r.at, name: r.name })),
);

export function inTunnel(s: number): boolean {
  return TUNNELS.some((t) => s >= t.from && s <= t.to);
}
