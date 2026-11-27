// バランスの確認（v5 じゃんけんバトル・わざ3つ・スキル・わざの やすみ）
// 実行: node scripts/balance.mjs
// こどもの わざの だしかた 3しゅるいで ためす：
//   てきとう … つかえる わざから ランダム
//   よむ     … あいてが いま だせる 手に いちばん かてる わざ
//   パー     … パーが つかえれば いつも パー（「パー れんだ」で かてて しまわないかの かくにん）
import { BOSSES, HANDS, SPECIES_IDS, type Hand } from '../src/venom/data';
import { STAGE_START_LEVEL, WINS_PER_STAGE, emptyBonus, rollWild, runStats, startMoves, type Run, type Stage } from '../src/venom/state';
import { Duel, available, bossFighter, playerFighter, wildFighter } from '../src/venom/battle';

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

// その すがたまでに ごはん・トレーニングで ふえた ぶん（めやす）
function makeRun(species: string, stage: Stage, level: number): Run {
  const b = emptyBonus();
  for (let s = 1; s <= stage; s++) {
    const done = s < stage ? 1 : 0.5; // いまの すがたは はんぶん くらい おわっている
    b.hp += Math.round((2 + s) * done);
    b.atk += Math.round((1.5 + s) * done);
    b.def += Math.round(1 * s * done);
    b.res += Math.round(1 * s * done);
  }
  const r: Run = { uid: 'x', species, stage, level, hp: 0, bonus: b, fed: true, trained: true, wins: 0, bossTries: 0, startedAt: 0, moves: startMoves(species) };
  r.hp = runStats(r).maxHp;
  return r;
}

type Policy = 'random' | 'smart' | 'pa';
function choose(p: Policy, d: Duel): number {
  const mine = available(d.me);
  if (p === 'pa') {
    const pa = mine.filter((i) => d.me.moves[i].hand === 'pa');
    if (pa.length) return pick(pa);
  }
  if (p === 'smart') {
    const foeHands = available(d.foe).map((i) => d.foe.moves[i].hand);
    const score = (h: Hand) => foeHands.filter((f) => HANDS[h].beats === f).length - foeHands.filter((f) => HANDS[f].beats === h).length;
    const best = Math.max(...mine.map((i) => score(d.me.moves[i].hand)));
    return pick(mine.filter((i) => score(d.me.moves[i].hand) === best));
  }
  return pick(mine);
}

function fight(d: Duel, p: Policy): { win: boolean; turns: number } {
  while (!d.over && d.turns < 60) d.turn(choose(p, d));
  return { win: d.win, turns: d.turns };
}

let problems = 0;
const rows: string[] = ['すがた | Lv | 勝率(てきとう) | 勝率(よむ) | 勝率(パー) | 平均ターン'];
for (const stage of [1, 2, 3] as Stage[]) {
  for (const level of [STAGE_START_LEVEL[stage], STAGE_START_LEVEL[stage] + 2 * (WINS_PER_STAGE - 1)]) {
    const res: Record<Policy, number[]> = { random: [], smart: [], pa: [] };
    const turns: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const r = makeRun(pick(SPECIES_IDS), stage, level);
      const w = rollWild(r);
      for (const p of ['random', 'smart', 'pa'] as Policy[]) {
        const o = fight(new Duel(playerFighter(r), wildFighter(w.species, w.level, stage)), p);
        res[p].push(Number(o.win));
        if (p === 'random') turns.push(o.turns);
      }
    }
    const [wr, ws, wp] = [avg(res.random), avg(res.smart), avg(res.pa)];
    const t = avg(turns);
    if (wr < 0.75 || ws < wr - 0.02 || t < 2.5 || t > 7) problems++;
    rows.push(`${stage} | ${level} | ${(wr * 100).toFixed(0)}% | ${(ws * 100).toFixed(0)}% | ${(wp * 100).toFixed(0)}% | ${t.toFixed(1)}`);
  }
}

rows.push('');
rows.push('ボス | 1かいめ(てきとう) | 1かいめ(よむ) | 1かいめ(パー) | 3かいまでに(てきとう) | 平均ターン');
BOSSES.forEach((b, bi) => {
  const first: Record<Policy, number[]> = { random: [], smart: [], pa: [] };
  const within3: number[] = [];
  const turns: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const r = makeRun(pick(SPECIES_IDS), 3, STAGE_START_LEVEL[3] + 4);
    for (const p of ['random', 'smart', 'pa'] as Policy[]) {
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
  const [fr, fs, fp] = [avg(first.random), avg(first.smart), avg(first.pa)];
  const w3 = avg(within3);
  if (fr < 0.35 || fr > 0.75 || fs < fr || fp > 0.85 || w3 < 0.88) problems++;
  rows.push(`${b.name} | ${(fr * 100).toFixed(0)}% | ${(fs * 100).toFixed(0)}% | ${(fp * 100).toFixed(0)}% | ${(w3 * 100).toFixed(0)}% | ${avg(turns).toFixed(1)}`);
});

console.log(rows.join('\n'));
console.log(`\nspecies: ${SPECIES_IDS.length}, problems: ${problems}`);
process.exitCode = problems ? 1 : 0;
