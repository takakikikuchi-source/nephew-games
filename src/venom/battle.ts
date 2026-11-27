// じゃんけんバトル（1たい1）
// まいターン、じぶんと あいてが どうじに わざを 1つ えらぶ。わざに ついた 手（✊✌️🖐️）で じゃんけんを して、
// かった ほうが さきに わざを だし、まけた ほうも たおれていなければ あとから だす（はんげき）。
// あいこは どちらが さきか ランダム（スキル「はやわざ」なら さき）。
// ✊グー＝はやい こうげき（ダメージ大）、✌️チョキ＝どく（ダメージ小＋どくの こうか）、
// 🖐️パー＝まもり（その ターンの こうげきを へらして、へらした ぶんを はねかえす＋すこし かいふく）
// つかった わざは 0〜2ターン やすみ（わざごと）。わざは 3つで やすみは さいだい 2ターンなので、かならず 1つは つかえる。
// ダメージは「こうげき × 50 ÷（50 ＋ ぼうぎょ）」の わりあい式。
import { BOSSES, HANDS, PTYPES, SPECIES, janken, type Hand, type PType } from './data';
import { SKILLS } from './moves';
import { bossMoves, bossStats, buildMove, resistFrac, runMoves, runStats, statsFor, startMoves, type Move, type Run } from './state';

const K = 50;
const CRIT_RATE = 0.05;
const CRIT_MULT = 1.5;
const WIN_CRIT_RATE = 0.3; // じゃんけんに かつと「いきおい」で きゅうしょに あたりやすい
const WILD_SCALE = [0, 0.75, 0.85, 0.85]; // やせいの あいては すこし よわい（あかちゃんの うちは もっと よわい）
const MACHIBUSE = 1.6; // まちぶせ：かった とき
const RENSOKU_EACH = 0.65; // れんぞく：1かいの つよさ
const IKAKU = 0.25; // いかく：あいての こうげきを さげる

interface Status {
  para: boolean;
  bleedTurns: number;
  bleedDmg: number;
  atkDown: number;
  atkDownTurns: number;
  defDown: number;
  defDownTurns: number;
}

export type Side = 'p' | 'e';

export interface Fighter {
  side: Side;
  name: string;
  species: string | null;
  bossIndex: number | null;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  res: number;
  moves: Move[];
  cooldown: number[]; // わざごとの のこり やすみ ターン
  resist: Partial<Record<PType, number>>; // ボスの「この どくが ききにくい」
  shield: number; // パーで つくった まもり（その ターンだけ）
  shieldSkill: Move['skill'];
  hiding: boolean; // かくれる（その ターンの こうげきを ぜんぶ よける）
  st: Status;
}

export type BattleEvent =
  | { kind: 'janken'; me: Hand; foe: Hand; result: 'win' | 'lose' | 'draw'; first: Side }
  | { kind: 'text'; text: string }
  | { kind: 'hit'; side: Side; amount: number; hp: number; crit: boolean }
  | { kind: 'heal'; side: Side; amount: number; hp: number }
  | { kind: 'dodge'; side: Side }
  | { kind: 'mark'; side: Side }
  | { kind: 'ko'; side: Side }
  | { kind: 'end'; win: boolean };

const newStatus = (): Status => ({ para: false, bleedTurns: 0, bleedDmg: 0, atkDown: 0, atkDownTurns: 0, defDown: 0, defDownTurns: 0 });

function base(side: Side, name: string, species: string | null, level: number, hp: number, atk: number, def: number, res: number, moves: Move[]): Fighter {
  return { side, name, species, bossIndex: null, level, maxHp: hp, hp, atk, def, res, moves, cooldown: moves.map(() => 0), resist: {}, shield: 0, shieldSkill: undefined, hiding: false, st: newStatus() };
}

export function playerFighter(r: Run): Fighter {
  const s = runStats(r);
  const f = base('p', SPECIES[r.species].name, r.species, r.level, s.maxHp, s.atk, s.def, s.res, runMoves(r));
  f.hp = Math.min(r.hp, s.maxHp);
  return f;
}

export function wildFighter(species: string, level: number, stage: number): Fighter {
  const s = statsFor(species, level);
  const k = WILD_SCALE[Math.max(1, Math.min(3, stage))];
  const moves = startMoves(species).map((m) => buildMove(m, species, stage));
  return base('e', SPECIES[species].name, species, level, Math.round(s.maxHp * k), Math.round(s.atk * k), s.def, s.res, moves);
}

export function bossFighter(r: Run, bossIndex: number): Fighter {
  const b = BOSSES[bossIndex];
  const s = bossStats(r, bossIndex);
  const f = base('e', b.name, null, r.level + 2, s.maxHp, s.atk, s.def, s.res, bossMoves(b.id));
  f.bossIndex = bossIndex;
  f.resist = b.resist;
  return f;
}

export const available = (u: Fighter): number[] => {
  const a = u.moves.map((_, i) => i).filter((i) => u.cooldown[i] <= 0);
  return a.length ? a : u.moves.map((_, i) => i); // ねんのため（ふつうは かならず 1つは のこる）
};

export class Duel {
  readonly me: Fighter;
  readonly foe: Fighter;
  over = false;
  win = false;
  turns = 0;
  private jankenWinner: Fighter | null = null;

  constructor(me: Fighter, foe: Fighter) {
    this.me = me;
    this.foe = foe;
  }

  // あいての わざ：つかえる わざから おなじ かくりつで
  foeMove(): number {
    const a = available(this.foe);
    return a[Math.floor(Math.random() * a.length)];
  }

  private other(u: Fighter): Fighter {
    return u === this.me ? this.foe : this.me;
  }

  private damage(a: Fighter, d: Fighter, power: number, mult: number): { amount: number; crit: boolean } {
    const atk = a.atk * (1 - a.st.atkDown);
    const def = d.def * (1 - d.st.defDown);
    const crit = Math.random() < (a === this.jankenWinner ? WIN_CRIT_RATE : CRIT_RATE);
    const rnd = 0.9 + Math.random() * 0.2;
    const raw = ((atk * power * K) / (K + def)) * mult * rnd * (crit ? CRIT_MULT : 1);
    return { amount: Math.max(1, Math.round(raw)), crit };
  }

  private hit(t: Fighter, amount: number, crit: boolean, ev: BattleEvent[]): void {
    t.hp = Math.max(0, t.hp - amount);
    ev.push({ kind: 'hit', side: t.side, amount, hp: t.hp, crit });
    if (t.hp === 0) {
      ev.push({ kind: 'ko', side: t.side });
      ev.push({ kind: 'text', text: `${t.name}は たおれた！` });
    }
  }

  // わざを だす。だせたら true（しびれて うごけない ときは false で、やすみも つかない）
  private act(u: Fighter, mi: number, ev: BattleEvent[]): boolean {
    const t = this.other(u);
    if (u.hp <= 0 || t.hp <= 0 || this.over) return false;
    if (u.st.para) {
      u.st.para = false;
      ev.push({ kind: 'text', text: `${u.name}は しびれて うごけない！` });
      return false;
    }
    const m = u.moves[mi];
    ev.push({ kind: 'text', text: `${u.name}の ${HANDS[m.hand].icon}${m.name}！` });
    if (m.hand === 'pa') {
      if (m.skill === 'kakureru') {
        u.hiding = true;
        ev.push({ kind: 'mark', side: u.side });
        ev.push({ kind: 'text', text: `${u.name}は かくれた！` });
        return true;
      }
      u.shield = Math.max(u.shield, m.guard ?? 0.6);
      u.shieldSkill = m.skill;
      const heal = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * (m.heal ?? 0)));
      ev.push({ kind: 'mark', side: u.side });
      if (heal > 0) {
        u.hp += heal;
        ev.push({ kind: 'heal', side: u.side, amount: heal, hp: u.hp });
      }
      if (m.skill === 'ikaku') {
        t.st.atkDown = Math.max(t.st.atkDown, IKAKU);
        t.st.atkDownTurns = Math.max(t.st.atkDownTurns, 2);
        ev.push({ kind: 'mark', side: t.side });
        ev.push({ kind: 'text', text: `${t.name}は こわがって こうげきが さがった！` });
      } else ev.push({ kind: 'text', text: `${u.name}は まもりを かためた！` });
      return true;
    }
    if (t.hiding) {
      ev.push({ kind: 'dodge', side: t.side });
      ev.push({ kind: 'text', text: `${t.name}が かくれていて あたらない！` });
      return true;
    }
    const ignore = m.skill === 'taiseiwari';
    const cut = ignore ? 0 : resistFrac(t.res); // どくたいせいで へる わりあい
    const typeRes = m.types.length ? (ignore ? 1 : m.types.reduce((a, ty) => a + (t.resist[ty] ?? 1), 0) / m.types.length) : 1;
    let mult = m.types.length ? typeRes * (1 - cut / 2) : 1;
    if (m.skill === 'machibuse' && this.jankenWinner === u) mult *= MACHIBUSE;
    const hits = m.hits ?? 1;
    const each = hits > 1 ? m.power * RENSOKU_EACH : m.power;
    for (let i = 0; i < hits && t.hp > 0 && u.hp > 0; i++) {
      let { amount, crit } = this.damage(u, t, each, mult);
      let back = 0;
      if (t.shield > 0) {
        if (m.skill === 'zusshiri') {
          ev.push({ kind: 'text', text: 'ずっしり！ まもりを やぶった！' });
        } else {
          const blocked = Math.round(amount * t.shield);
          amount = Math.max(1, amount - blocked);
          back = Math.max(1, blocked);
          ev.push({ kind: 'text', text: `${t.name}が うけとめた！` });
        }
        const skin = t.shieldSkill === 'dokuhifu' ? t.moves.find((x) => x.skill === 'dokuhifu') : undefined;
        t.shield = 0;
        if (skin) this.poison(skin, u, ev, true);
      }
      if (crit) ev.push({ kind: 'text', text: 'きゅうしょに あたった！' });
      this.hit(t, amount, crit, ev);
      if (back > 0 && u.hp > 0 && !this.over) {
        ev.push({ kind: 'text', text: 'はねかえした！' });
        this.hit(u, back, false, ev);
        if (u.hp <= 0) return true;
      }
    }
    if (m.hand === 'choki' && m.types.length && t.hp > 0) this.poison(m, t, ev, false);
    return true;
  }

  // どくの こうか。fromSkin は「どくのひふ」で はんげき した とき
  private poison(m: Move, t: Fighter, ev: BattleEvent[], fromSkin: boolean): void {
    if (!m.types.length || t.hp <= 0) return;
    if (fromSkin) ev.push({ kind: 'text', text: `${t.name}は どくの ひふに さわって しまった！` });
    const ignore = m.skill === 'taiseiwari';
    const cut = ignore ? 0 : resistFrac(t.res);
    const power = m.skill === 'moudoku' ? 2 : 1;
    const turns = m.skill === 'jiwajiwa' ? 5 : 3;
    const sure = m.skill === 'kakujitsu';
    for (const ty of new Set(m.types)) {
      const r = (ignore ? 1 : t.resist[ty] ?? 1) * (1 - cut);
      if (ty === 'shibire') {
        const chance = sure ? Math.min(1, r * 1.5) : Math.min(0.9, 0.45 * r * power);
        if (Math.random() < chance) {
          t.st.para = true;
          ev.push({ kind: 'mark', side: t.side });
          ev.push({ kind: 'text', text: `${t.name}は しびれて うごけなく なった！` });
        } else if (r < 0.7) ev.push({ kind: 'text', text: `${t.name}には しびれどくが ききにくい！` });
      } else if (ty === 'chi') {
        t.st.bleedTurns = Math.max(t.st.bleedTurns, turns);
        t.st.bleedDmg = Math.max(t.st.bleedDmg, Math.max(1, Math.round(t.maxHp * 0.06 * r * power)));
        ev.push({ kind: 'mark', side: t.side });
        ev.push({ kind: 'text', text: `${t.name}の {血|ち}が とまらなく なった！` });
      } else if (ty === 'itami') {
        const amt = Math.min(0.6, 0.3 * r * power);
        if (amt >= 0.1 || sure) {
          t.st.atkDown = Math.max(t.st.atkDown, Math.max(amt, 0.15));
          t.st.atkDownTurns = Math.max(t.st.atkDownTurns, turns);
          ev.push({ kind: 'mark', side: t.side });
          ev.push({ kind: 'text', text: `いたみで ${t.name}の こうげきが さがった！` });
        } else ev.push({ kind: 'text', text: `${t.name}には いたみどくが ききにくい！` });
      } else if (ty === 'kowashi') {
        t.st.defDown = Math.max(t.st.defDown, Math.min(0.7, 0.35 * r * power));
        t.st.defDownTurns = Math.max(t.st.defDownTurns, turns);
        ev.push({ kind: 'mark', side: t.side });
        ev.push({ kind: 'text', text: `${t.name}の ぼうぎょが さがった！` });
      }
    }
  }

  private endRound(ev: BattleEvent[], used: [Fighter, number][]): void {
    // パーの まもり・かくれるは その ターンだけ
    for (const u of [this.me, this.foe]) {
      u.shield = 0;
      u.shieldSkill = undefined;
      u.hiding = false;
    }
    // わざの やすみ：ぜんぶ 1へらしてから、いま つかった わざに やすみを つける
    for (const u of [this.me, this.foe]) u.cooldown = u.cooldown.map((c) => Math.max(0, c - 1));
    for (const [u, mi] of used) {
      const m = u.moves[mi];
      u.cooldown[mi] = m.cd;
      if (m.cd >= 2 && u.hp > 0)
        ev.push({
          kind: 'text',
          text: m.types.length ? `${u.name}は どくを つかいきった！ つぎの どくが たまるまで やすみ` : `${u.name}は ちからを つかいきった！ ${m.name}は 2ターン やすみ`,
        });
    }
    for (const u of [this.me, this.foe]) {
      if (u.hp <= 0 || this.over) continue;
      const st = u.st;
      if (st.bleedTurns > 0) {
        ev.push({ kind: 'text', text: `どくで ${u.name}に ダメージ！` });
        this.hit(u, st.bleedDmg, false, ev);
        st.bleedTurns--;
        if (st.bleedTurns === 0) st.bleedDmg = 0;
      }
      if (st.atkDownTurns > 0 && --st.atkDownTurns === 0) st.atkDown = 0;
      if (st.defDownTurns > 0 && --st.defDownTurns === 0) st.defDown = 0;
      this.checkEnd(ev);
    }
  }

  turn(myMove: number, foeMove: number = this.foeMove()): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over) return ev;
    if (!available(this.me).includes(myMove)) myMove = available(this.me)[0];
    if (!available(this.foe).includes(foeMove)) foeMove = available(this.foe)[0];
    this.turns++;
    const mh = this.me.moves[myMove].hand;
    const fh = this.foe.moves[foeMove].hand;
    const result = janken(mh, fh);
    this.jankenWinner = result === 'win' ? this.me : result === 'lose' ? this.foe : null;
    let meFirst: boolean;
    if (result !== 'draw') meFirst = result === 'win';
    else {
      const mq = this.me.moves[myMove].skill === 'hayawaza';
      const fq = this.foe.moves[foeMove].skill === 'hayawaza';
      meFirst = mq !== fq ? mq : Math.random() < 0.5;
    }
    ev.push({ kind: 'janken', me: mh, foe: fh, result, first: meFirst ? 'p' : 'e' });
    const order: [Fighter, number][] = meFirst ? [[this.me, myMove], [this.foe, foeMove]] : [[this.foe, foeMove], [this.me, myMove]];
    const used: [Fighter, number][] = [];
    for (const [u, mi] of order) {
      if (this.act(u, mi, ev)) used.push([u, mi]);
      if (this.checkEnd(ev)) return ev;
    }
    this.endRound(ev, used);
    return ev;
  }

  private checkEnd(ev: BattleEvent[]): boolean {
    if (this.over) return true;
    if (this.foe.hp <= 0 || this.me.hp <= 0) {
      this.over = true;
      this.win = this.foe.hp <= 0;
      ev.push({ kind: 'end', win: this.win });
      return true;
    }
    return false;
  }
}

export const markLabels = (u: Fighter): [string, string][] => {
  const m: [string, string][] = [];
  if (u.hiding) m.push(['🫥かくれた', HANDS.pa.color]);
  if (u.shield > 0) m.push(['🖐️まもり', HANDS.pa.color]);
  if (u.st.para) m.push(['⚡しびれ', PTYPES.shibire.color]);
  if (u.st.bleedTurns > 0) m.push(['🩸', PTYPES.chi.color]);
  if (u.st.atkDown > 0) m.push(['💥↓', PTYPES.itami.color]);
  if (u.st.defDown > 0) m.push(['🧪↓', PTYPES.kowashi.color]);
  return m;
};

export const skillName = (m: Move): string => (m.skill ? SKILLS[m.skill].name : '');
