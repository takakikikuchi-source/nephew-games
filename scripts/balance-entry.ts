// バランスの確認（v4 じゃんけんバトル）：やせいバトルと ボスの 勝率・ターン数を 表にする。
// 実行: node scripts/balance.mjs
// 手の だしかた 2しゅるいで ためす：「てきとう」（ランダム）と「くせを よむ」（あいての くせに かつ 手を 60%）
import { BOSSES, HANDS, HAND_IDS, SPECIES, SPECIES_IDS, type Hand } from '../src/venom/data';
import { STAGE_START_LEVEL, WINS_PER_STAGE, emptyBonus, rollWild, runStats, type Run, type Stage } from '../src/venom/state';
import { Duel, bossFighter, playerFighter, wildFighter } from '../src/venom/battle';

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

// その すがたまでに ごはん・トレーニングで ふえた ぶん（めやす）
function makeRun(species: string, stage: Stage, level: number): Run {
  const b = emptyBonus();
  for (let s = 1; s < stage + 1; s++) {
    if (s > stage) break;
    const done = s < stage ? 1 : 0.5; // いまの すがたは はんぶん くらい おわっている
    b.hp += Math.round((2 + s) * done);
    b.atk += Math.round((1.5 + s) * done);
    b.def += Math.round(1 * s * done);
    b.spd += Math.round(0.5 * s * done);
    b.res += Math.round(1 * s * done);
  }
  const r: Run = { uid: 'x', species, stage, level, hp: 0, bonus: b, fed: true, trained: true, wins: 0, bossTries: 0, startedAt: 0 };
  r.hp = runStats(r).maxHp;
  return r;
}

const counter = (h: Hand): Hand => HAND_IDS.find((x) => HANDS[x].beats === h)!;
type Policy = 'random' | 'smart';
function choose(p: Policy, d: Duel): Hand {
  if (p === 'smart' && Math.random() < 0.6) return counter(d.foe.fav);
  return pick(HAND_IDS);
}

function fight(d: Duel, p: Policy): { win: boolean; turns: number } {
  while (!d.over && d.turns < 60) d.turn(choose(p, d));
  return { win: d.win, turns: d.turns };
}

let problems = 0;
const rows: string[] = ['すがた | Lv | 勝率(てきとう) | 勝率(くせをよむ) | 平均ターン'];
for (const stage of [1, 2, 3] as Stage[]) {
  for (const level of [STAGE_START_LEVEL[stage], STAGE_START_LEVEL[stage] + 2 * (WINS_PER_STAGE - 1)]) {
    const res: Record<Policy, boolean[]> = { random: [], smart: [] };
    const turns: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const r = makeRun(pick(SPECIES_IDS), stage, level);
      const w = rollWild(r);
      for (const p of ['random', 'smart'] as Policy[]) {
        const o = fight(new Duel(playerFighter(r), wildFighter(w.species, w.level, stage)), p);
        res[p].push(o.win);
        if (p === 'random') turns.push(o.turns);
      }
    }
    const wr = avg(res.random.map(Number));
    const ws = avg(res.smart.map(Number));
    const t = avg(turns);
    if (wr < 0.75 || ws < 0.85 || ws < wr - 0.03 || t < 2.5 || t > 7) problems++;
    rows.push(`${stage} | ${level} | ${(wr * 100).toFixed(0)}% | ${(ws * 100).toFixed(0)}% | ${t.toFixed(1)}`);
  }
}

rows.push('');
rows.push('ボス | 1かいめ(てきとう) | 1かいめ(くせをよむ) | 3かいまでに(てきとう) | 平均ターン');
BOSSES.forEach((b, bi) => {
  const first: Record<Policy, number[]> = { random: [], smart: [] };
  const within3: number[] = [];
  const turns: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const r = makeRun(pick(SPECIES_IDS), 3, STAGE_START_LEVEL[3] + 4);
    for (const p of ['random', 'smart'] as Policy[]) {
      r.bossTries = 0;
      const o = fight(new Duel(playerFighter(r), bossFighter(r, bi)), p);
      first[p].push(Number(o.win));
      if (p === 'random') turns.push(o.turns);
    }
    let ok = false;
    for (let k = 0; k < 3 && !ok; k++) {
      r.bossTries = k;
      ok = fight(new Duel(playerFighter(r), bossFighter(r, bi)), 'random').win;
    }
    within3.push(Number(ok));
  }
  const fr = avg(first.random);
  const fs = avg(first.smart);
  const w3 = avg(within3);
  if (fr < 0.35 || fr > 0.75 || fs < 0.55 || fs < fr || w3 < 0.88) problems++;
  rows.push(`${b.name} | ${(fr * 100).toFixed(0)}% | ${(fs * 100).toFixed(0)}% | ${(w3 * 100).toFixed(0)}% | ${avg(turns).toFixed(1)}`);
});

console.log(rows.join('\n'));
console.log(`\nspecies: ${SPECIES_IDS.length}, problems: ${problems}`);
void SPECIES;
process.exitCode = problems ? 1 : 0;
