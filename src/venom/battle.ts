// じゃんけんバトル（1たい1）
// まいターン、じぶんと あいてが どうじに 手（わざ）を えらぶ。じゃんけんに かった ほうが さきに わざを だし、
// まけた ほうも たおれていなければ あとから わざを だす（はんげき）。あいこは はやさが はやい ほうが さき。
// ✊グー＝はやい こうげき（ダメージ大）、✌️チョキ＝どく（ダメージ小＋どくの こうか）、
// 🖐️パー＝まもり（その ターンの こうげきを 6わり へらして、へらした ぶんを はねかえす＋すこし かいふく）
// ダメージは「こうげき × 50 ÷（50 ＋ ぼうぎょ）」の わりあい式。
import { BOSSES, HANDS, HAND_IDS, PTYPES, SPECIES, favoriteHand, janken, type Hand, type PType } from './data';
import { bossStats, movesFor, resistFrac, runStats, statsFor, type Move, type Run } from './state';

const K = 50;
const CRIT_RATE = 0.05;
const WIN_CRIT_RATE = 0.3; // じゃんけんに かつと「いきおい」で きゅうしょに あたりやすい
const WILD_SCALE = [0, 0.75, 0.85, 0.85]; // やせいの あいては すこし よわい（あかちゃんの うちは もっと よわい）
const CRIT_MULT = 1.5;
const DODGE_MAX = 0.2; // よける かくりつの さいだい
const DODGE_SLOPE = 0.2; // はやさが あいての 2ばいで 20%
const FAV_RATE = 0.6; // くせの 手を だす かくりつ
const REFLECT = 1.0; // パーで へらした ダメージを そのまま はねかえす

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
  spd: number;
  res: number;
  moves: Record<Hand, Move>;
  resist: Partial<Record<PType, number>>;
  fav: Hand;
  shield: number; // パーで つくった まもり（その ターンに うける ダメージを へらす）
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

export function dodgeChance(attackerSpd: number, defenderSpd: number): number {
  if (attackerSpd <= 0) return DODGE_MAX;
  return Math.min(DODGE_MAX, Math.max(0, ((defenderSpd - attackerSpd) / attackerSpd) * DODGE_SLOPE));
}

export function playerFighter(r: Run): Fighter {
  const s = runStats(r);
  return {
    side: 'p',
    name: SPECIES[r.species].name,
    species: r.species,
    bossIndex: null,
    level: r.level,
    maxHp: s.maxHp,
    hp: Math.min(r.hp, s.maxHp),
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    res: s.res,
    moves: movesFor(r.species, r.stage),
    resist: {},
    fav: 'gu',
    shield: 0,
    st: newStatus(),
  };
}

export function wildFighter(species: string, level: number, stage: number): Fighter {
  const s = statsFor(species, level);
  const sp = SPECIES[species];
  const k = WILD_SCALE[Math.max(1, Math.min(3, stage))];
  return {
    side: 'e',
    name: sp.name,
    species,
    bossIndex: null,
    level,
    maxHp: Math.round(s.maxHp * k),
    hp: Math.round(s.maxHp * k),
    atk: Math.round(s.atk * k),
    def: s.def,
    spd: s.spd,
    res: s.res,
    moves: movesFor(species, stage),
    resist: {},
    fav: favoriteHand(sp),
    shield: 0,
    st: newStatus(),
  };
}

export function bossFighter(r: Run, bossIndex: number): Fighter {
  const b = BOSSES[bossIndex];
  const s = bossStats(r, bossIndex);
  const mv = (h: Hand): Move => {
    const m = b.moves[h];
    return { hand: h, name: m.name, power: m.power, types: [], hits: m.hits, guard: h === 'pa' ? 0.6 : undefined, heal: h === 'pa' ? 0.06 : undefined };
  };
  return {
    side: 'e',
    name: b.name,
    species: null,
    bossIndex,
    level: r.level + 2,
    maxHp: s.maxHp,
    hp: s.maxHp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    res: s.res,
    moves: { gu: mv('gu'), choki: mv('choki'), pa: mv('pa') },
    resist: b.resist,
    fav: b.fav,
    shield: 0,
    st: newStatus(),
  };
}

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

  // あいての 手：くせの 手が 60%、のこりは 20%ずつ
  foeHand(): Hand {
    if (Math.random() < FAV_RATE) return this.foe.fav;
    const others = HAND_IDS.filter((h) => h !== this.foe.fav);
    return others[Math.floor(Math.random() * others.length)];
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

  private act(u: Fighter, h: Hand, ev: BattleEvent[]): void {
    const t = this.other(u);
    if (u.hp <= 0 || t.hp <= 0 || this.over) return;
    if (u.st.para) {
      u.st.para = false;
      ev.push({ kind: 'text', text: `${u.name}は しびれて うごけない！` });
      return;
    }
    const m = u.moves[h];
    ev.push({ kind: 'text', text: `${u.name}の ${HANDS[h].icon}${m.name}！` });
    if (h === 'pa') {
      u.shield = Math.max(u.shield, m.guard ?? 0.6);
      const heal = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * (m.heal ?? 0)));
      ev.push({ kind: 'mark', side: u.side });
      if (heal > 0) {
        u.hp += heal;
        ev.push({ kind: 'heal', side: u.side, amount: heal, hp: u.hp });
      }
      ev.push({ kind: 'text', text: `${u.name}は まもりを かためた！` });
      return;
    }
    if (Math.random() < dodgeChance(u.spd, t.spd)) {
      ev.push({ kind: 'dodge', side: t.side });
      ev.push({ kind: 'text', text: `${t.name}は すばやく よけた！` });
      return;
    }
    const cut = resistFrac(t.res); // どくたいせいで へる わりあい
    const typeRes = m.types.length ? m.types.reduce((a, ty) => a + (t.resist[ty] ?? 1), 0) / m.types.length : 1;
    const mult = m.types.length ? typeRes * (1 - cut / 2) : 1;
    for (let i = 0; i < (m.hits ?? 1) && t.hp > 0; i++) {
      let { amount, crit } = this.damage(u, t, m.power, mult);
      let back = 0;
      if (t.shield > 0) {
        const blocked = Math.round(amount * t.shield);
        amount = Math.max(1, amount - blocked);
        back = Math.max(1, Math.round(blocked * REFLECT));
        t.shield = 0;
        ev.push({ kind: 'text', text: `${t.name}が うけとめた！` });
      }
      if (crit) ev.push({ kind: 'text', text: 'きゅうしょに あたった！' });
      this.hit(t, amount, crit, ev);
      if (back > 0 && u.hp > 0 && !this.over) {
        ev.push({ kind: 'text', text: `はねかえした！` });
        this.hit(u, back, false, ev);
        if (u.hp <= 0) return;
      }
    }
    if (h === 'choki' && t.hp > 0) this.poison(m, t, cut, ev);
  }

  private poison(m: Move, t: Fighter, cut: number, ev: BattleEvent[]): void {
    for (const ty of new Set(m.types)) {
      const r = (t.resist[ty] ?? 1) * (1 - cut);
      if (ty === 'shibire') {
        if (Math.random() < 0.45 * r) {
          t.st.para = true;
          ev.push({ kind: 'mark', side: t.side });
          ev.push({ kind: 'text', text: `${t.name}は しびれて うごけなく なった！` });
        } else if (r < 0.7) ev.push({ kind: 'text', text: `${t.name}には しびれどくが ききにくい！` });
      } else if (ty === 'chi') {
        t.st.bleedTurns = 3;
        t.st.bleedDmg = Math.max(1, Math.round(t.maxHp * 0.06 * r));
        ev.push({ kind: 'mark', side: t.side });
        ev.push({ kind: 'text', text: `${t.name}の {血|ち}が とまらなく なった！` });
      } else if (ty === 'itami') {
        const amt = Math.min(0.5, 0.3 * r);
        if (amt >= 0.1) {
          t.st.atkDown = Math.max(t.st.atkDown, amt);
          t.st.atkDownTurns = 3;
          ev.push({ kind: 'mark', side: t.side });
          ev.push({ kind: 'text', text: `いたみで ${t.name}の こうげきが さがった！` });
        } else ev.push({ kind: 'text', text: `${t.name}には いたみどくが ききにくい！` });
      } else if (ty === 'kowashi') {
        t.st.defDown = Math.max(t.st.defDown, Math.min(0.6, 0.35 * r));
        t.st.defDownTurns = 3;
        ev.push({ kind: 'mark', side: t.side });
        ev.push({ kind: 'text', text: `${t.name}の ぼうぎょが さがった！` });
      }
    }
  }

  private endRound(ev: BattleEvent[]): void {
    // パーの まもりは その ターンだけ（まけて あとから だすと まにあわない）
    this.me.shield = 0;
    this.foe.shield = 0;
    for (const u of [this.me, this.foe]) {
      if (u.hp <= 0 || this.over) continue;
      const st = u.st;
      if (st.bleedTurns > 0) {
        ev.push({ kind: 'text', text: `どくで ${u.name}に ダメージ！` });
        this.hit(u, st.bleedDmg, false, ev);
        st.bleedTurns--;
      }
      if (st.atkDownTurns > 0 && --st.atkDownTurns === 0) st.atkDown = 0;
      if (st.defDownTurns > 0 && --st.defDownTurns === 0) st.defDown = 0;
      this.checkEnd(ev);
    }
  }

  turn(myHand: Hand, foeHand: Hand = this.foeHand()): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over) return ev;
    this.turns++;
    const result = janken(myHand, foeHand);
    this.jankenWinner = result === 'win' ? this.me : result === 'lose' ? this.foe : null;
    const meFirst = result === 'win' || (result === 'draw' && (this.me.spd > this.foe.spd || (this.me.spd === this.foe.spd && Math.random() < 0.5)));
    ev.push({ kind: 'janken', me: myHand, foe: foeHand, result, first: meFirst ? 'p' : 'e' });
    const order: [Fighter, Hand][] = meFirst ? [[this.me, myHand], [this.foe, foeHand]] : [[this.foe, foeHand], [this.me, myHand]];
    for (const [u, h] of order) {
      this.act(u, h, ev);
      if (this.checkEnd(ev)) return ev;
    }
    this.endRound(ev);
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
  if (u.shield > 0) m.push(['🖐️まもり', HANDS.pa.color]);
  if (u.st.para) m.push(['⚡しびれ', PTYPES.shibire.color]);
  if (u.st.bleedTurns > 0) m.push(['🩸', PTYPES.chi.color]);
  if (u.st.atkDown > 0) m.push(['💥↓', PTYPES.itami.color]);
  if (u.st.defDown > 0) m.push(['🧪↓', PTYPES.kowashi.color]);
  return m;
};
