// バランスの確認：レベルごとの「何回で倒せるか」「何回で倒れるか」「何バトルで1レベル」と、勝率を表にする。
// 実行: node scripts/balance.mjs
import { AREAS, BOSSES, SPECIES, SPECIES_IDS } from '../src/venom/data';
import { WILD_REWARD, enemyExp, expToNext, naturalMove, rollWild, statsFor, type Creature, type Move } from '../src/venom/state';
import { Battle } from '../src/venom/battle';

const K = 50;
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

// レベルLまで育てたときの、ごはん・トレーニングで ふえた ぶん（めやす）
// はやさ・どくたいせいは トレーニングだけなので すこし ひかえめ
const bonusAt = (L: number) => ({ hp: Math.round(0.6 * L), atk: Math.round(0.6 * L), def: Math.round(0.5 * L), spd: Math.round(0.25 * L), res: Math.round(0.8 * L) });

function makeCreature(species: string, level: number, extra?: Move): Creature {
  const bonus = bonusAt(level);
  return {
    uid: `${species}${level}`,
    species,
    hatched: true,
    level,
    exp: 0,
    hp: statsFor(species, level, bonus).maxHp,
    bonus,
    mealsToday: 0,
    trainsToday: 0,
    moves: extra ? [extra, naturalMove(species)] : [naturalMove(species)],
  };
}

function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

function simulate(team: Creature[], wild: { species: string; level: number }[] | null, boss: number | null): boolean {
  const b = new Battle(team, wild, boss);
  for (let t = 0; t < 200 && !b.over; t++) {
    if (b.needSendOut()) b.sendOut(b.benchAlive()[0].idx);
    b.turn({ kind: 'move', move: 0 });
  }
  return b.win;
}

const rows: string[] = [];
let problems = 0;
rows.push('Lv | 倒すのに(回) | 耐えられる(回) | 1Lvに必要なバトル | やせい勝率');
for (const L of [1, 3, 5, 8, 10, 12, 15, 18, 20, 24, 28]) {
  const kill: number[] = [];
  const survive: number[] = [];
  for (const a of SPECIES_IDS) {
    const sa = statsFor(a, L, bonusAt(L));
    for (const d of SPECIES_IDS) {
      const sd = statsFor(d, L);
      kill.push(sd.maxHp / ((sa.atk * 1.1 * K) / (K + sd.def)));
      survive.push(sa.maxHp / ((sd.atk * 1.1 * K) / (K + sa.def)));
    }
  }
  const area = Math.max(0, AREAS.findIndex((x, i) => L >= x.levels[0] && (i === AREAS.length - 1 || L < AREAS[i + 1].levels[0])));
  const battles = expToNext(L) / (WILD_REWARD * enemyExp(L));
  let wins = 0;
  const N = 300;
  for (let i = 0; i < N; i++) {
    const team = [0, 1, 2].map(() => makeCreature(pick(SPECIES_IDS), L));
    const wild = rollWild(area).map((w) => ({ ...w, level: Math.min(w.level, L + 2) }));
    if (simulate(team, wild, null)) wins++;
  }
  const k = avg(kill);
  const s = avg(survive);
  const wr = wins / N;
  if (k < 1.8 || k > 4.5 || s < 3 || wr < 0.8) problems++;
  rows.push(`${String(L).padStart(2)} | ${k.toFixed(1).padStart(4)} | ${s.toFixed(1).padStart(4)} | ${battles.toFixed(1).padStart(4)} | ${(wr * 100).toFixed(0)}%`);
}
rows.push('');
rows.push('ボス | おすすめLv | 勝率(おすすめLv) | 勝率(Lv-3) | 勝率(Lv+3)');
const CRAFTED: Move[] = [
  { id: 'x', name: 'ブラッドズキ', types: ['chi', 'itami'], power: 1.25 },
  { id: 'y', name: 'ブラッドメルト', types: ['chi', 'kowashi'], power: 1.25 },
  { id: 'z', name: 'ブラッドメルト', types: ['chi', 'kowashi'], power: 1.25 },
];
BOSSES.forEach((b, bi) => {
  const rate = (L: number) => {
    let w = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const team = [0, 1, 2].map(() => makeCreature(pick(SPECIES_IDS), L, bi > 0 ? CRAFTED[bi] : undefined));
      if (simulate(team, null, bi)) w++;
    }
    return w / N;
  };
  const r0 = rate(b.recLevel);
  const rLow = rate(Math.max(1, b.recLevel - 3));
  const rHigh = rate(b.recLevel + 3);
  if (r0 < 0.35 || r0 > 0.9 || rHigh < 0.7) problems++;
  rows.push(`${b.name} | ${b.recLevel} | ${(r0 * 100).toFixed(0)}% | ${(rLow * 100).toFixed(0)}% | ${(rHigh * 100).toFixed(0)}%`);
});
console.log(rows.join('\n'));
console.log(`\nspecies: ${SPECIES_IDS.length}, problems: ${problems}`);
void SPECIES;
process.exitCode = problems ? 1 : 0;
