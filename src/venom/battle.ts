// 1たい1 バトル。チーム（3びき まで）の 1ぴきずつが ばに でて、たおれたら つぎを だす。
// じぶんの ばんに「こうたい」も できる（こうたいは こうげきより さきに おこる）。
// ダメージは「こうげき × 50 ÷（50 ＋ ぼうぎょ）」の わりあい式（ぼうぎょを あげても むてきに ならない）。
// はやさ：はやい ほうが さきに うごく。あいてより ずっと はやいと、こうげきを よけることが ある。
// どくたいせい：どくの ききめ（じょうたい）と、どくわざの ダメージを へらす。
import { BOSSES, PTYPES, SPECIES, type Boss, type PType } from './data';
import { basicMove, naturalMove, resistFrac, stats, statsFor, type Creature, type Move } from './state';

const K = 50;
const CRIT_RATE = 0.05;
const CRIT_MULT = 1.5;
const DODGE_MAX = 0.2; // よける かくりつの さいだい
const DODGE_SLOPE = 0.2; // はやさが あいての 2ばいで 20%

interface Status {
  para: boolean;
  bleedTurns: number;
  bleedDmg: number;
  atkDown: number;
  atkDownTurns: number;
  defDown: number;
  defDownTurns: number;
  defUp: number;
  defUpTurns: number;
}

export type Side = 'p' | 'e';

export interface Unit {
  side: Side;
  idx: number;
  name: string;
  species: string | null;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  res: number; // どくたいせい
  moves: Move[];
  resist: Partial<Record<PType, number>>; // ボスの「この どくが ききにくい」
  st: Status;
}

export type BattleEvent =
  | { kind: 'text'; text: string }
  | { kind: 'hit'; side: Side; idx: number; amount: number; hp: number; crit: boolean }
  | { kind: 'dodge'; side: Side; idx: number }
  | { kind: 'mark'; side: Side; idx: number }
  | { kind: 'ko'; side: Side; idx: number }
  | { kind: 'switch'; side: Side; idx: number }
  | { kind: 'end'; win: boolean };

export type Choice = { kind: 'move'; move: number } | { kind: 'switch'; to: number };

const newStatus = (): Status => ({ para: false, bleedTurns: 0, bleedDmg: 0, atkDown: 0, atkDownTurns: 0, defDown: 0, defDownTurns: 0, defUp: 0, defUpTurns: 0 });

export function dodgeChance(attackerSpd: number, defenderSpd: number): number {
  if (attackerSpd <= 0) return DODGE_MAX;
  return Math.min(DODGE_MAX, Math.max(0, ((defenderSpd - attackerSpd) / attackerSpd) * DODGE_SLOPE));
}

export class Battle {
  readonly players: Unit[];
  readonly enemies: Unit[];
  readonly boss: Boss | null;
  active: Record<Side, number> = { p: 0, e: 0 };
  over = false;
  win = false;

  constructor(team: Creature[], wild: { species: string; level: number }[] | null, bossIndex: number | null) {
    this.players = team.map((c, i) => {
      const s = stats(c);
      return {
        side: 'p',
        idx: i,
        name: SPECIES[c.species].name,
        species: c.species,
        level: c.level,
        maxHp: s.maxHp,
        hp: Math.min(c.hp, s.maxHp),
        atk: s.atk,
        def: s.def,
        spd: s.spd,
        res: s.res,
        moves: [...c.moves, basicMove()],
        resist: {},
        st: newStatus(),
      };
    });
    this.active.p = Math.max(0, this.players.findIndex((u) => u.hp > 0));
    this.boss = bossIndex != null ? BOSSES[bossIndex] : null;
    if (this.boss) {
      const b = this.boss;
      this.enemies = [{ side: 'e', idx: 0, name: b.name, species: null, level: b.recLevel, maxHp: b.stats.hp, hp: b.stats.hp, atk: b.stats.atk, def: b.stats.def, spd: b.stats.spd, res: 0, moves: [], resist: b.resist, st: newStatus() }];
    } else {
      this.enemies = (wild ?? []).map((w, i) => {
        const s = statsFor(w.species, w.level);
        return {
          side: 'e',
          idx: i,
          name: SPECIES[w.species].name,
          species: w.species,
          level: w.level,
          maxHp: s.maxHp,
          hp: s.maxHp,
          atk: s.atk,
          def: s.def,
          spd: s.spd,
          res: s.res,
          moves: [naturalMove(w.species), basicMove()],
          resist: {},
          st: newStatus(),
        };
      });
    }
  }

  me(): Unit {
    return this.players[this.active.p];
  }

  foe(): Unit {
    return this.enemies[this.active.e];
  }

  alive(side: Side): Unit[] {
    return (side === 'p' ? this.players : this.enemies).filter((u) => u.hp > 0);
  }

  // ばに いる なかまが たおれて、つぎを えらぶ ひつようが あるか
  needSendOut(): boolean {
    return !this.over && this.me().hp <= 0 && this.alive('p').length > 0;
  }

  // こうたいできる なかま（ばに いない、げんきな こ）
  benchAlive(): Unit[] {
    return this.players.filter((u) => u.hp > 0 && u.idx !== this.active.p);
  }

  sendOut(idx: number): BattleEvent[] {
    const ev: BattleEvent[] = [];
    const u = this.players[idx];
    if (!u || u.hp <= 0) return ev;
    this.active.p = idx;
    u.st = newStatus();
    ev.push({ kind: 'switch', side: 'p', idx });
    ev.push({ kind: 'text', text: `いけ！ ${u.name}！` });
    return ev;
  }

  private damage(a: Unit, d: Unit, power: number, mult: number): { amount: number; crit: boolean } {
    const atk = a.atk * (1 - a.st.atkDown);
    const def = d.def * (1 - d.st.defDown) * (1 + d.st.defUp);
    const crit = Math.random() < CRIT_RATE;
    const rnd = 0.9 + Math.random() * 0.2;
    const raw = ((atk * power * K) / (K + def)) * mult * rnd * (crit ? CRIT_MULT : 1);
    return { amount: Math.max(1, Math.round(raw)), crit };
  }

  private hit(target: Unit, amount: number, crit: boolean, ev: BattleEvent[]): void {
    target.hp = Math.max(0, target.hp - amount);
    ev.push({ kind: 'hit', side: target.side, idx: target.idx, amount, hp: target.hp, crit });
    if (target.hp === 0) {
      ev.push({ kind: 'ko', side: target.side, idx: target.idx });
      ev.push({ kind: 'text', text: `${target.name}は たおれた！` });
    }
  }

  private dodged(a: Unit, t: Unit, ev: BattleEvent[]): boolean {
    if (Math.random() >= dodgeChance(a.spd, t.spd)) return false;
    ev.push({ kind: 'dodge', side: t.side, idx: t.idx });
    ev.push({ kind: 'text', text: `${t.name}は すばやく よけた！` });
    return true;
  }

  private useMove(a: Unit, m: Move, t: Unit, ev: BattleEvent[]): void {
    ev.push({ kind: 'text', text: `${a.name}の ${m.name}！` });
    if (this.dodged(a, t, ev)) return;
    const cut = resistFrac(t.res); // どくたいせいで へる わりあい
    const typeRes = m.types.length ? m.types.reduce((acc, ty) => acc + (t.resist[ty] ?? 1), 0) / m.types.length : 1;
    const mult = m.types.length ? typeRes * (1 - cut / 2) : 1;
    const { amount, crit } = this.damage(a, t, m.power, mult);
    if (crit) ev.push({ kind: 'text', text: 'きゅうしょに あたった！' });
    this.hit(t, amount, crit, ev);
    if (m.types.length && typeRes < 0.6) ev.push({ kind: 'text', text: 'あまり きいていない みたい…' });
    if (t.hp <= 0) return;
    const counts = new Map<PType, number>();
    for (const ty of m.types) counts.set(ty, (counts.get(ty) ?? 0) + 1);
    for (const [ty, n] of counts) {
      const r = (t.resist[ty] ?? 1) * (1 - cut);
      const weak = r < 0.7;
      if (ty === 'shibire') {
        if (Math.random() < Math.min(0.6, 0.28 * n) * r) {
          t.st.para = true;
          ev.push({ kind: 'mark', side: t.side, idx: t.idx });
          ev.push({ kind: 'text', text: `${t.name}は しびれて うごけなく なった！` });
        } else if (weak) ev.push({ kind: 'text', text: `${t.name}には しびれどくが ききにくい！` });
      } else if (ty === 'chi') {
        t.st.bleedTurns = 3;
        t.st.bleedDmg = Math.max(1, Math.round(t.maxHp * 0.045 * n * r));
        ev.push({ kind: 'mark', side: t.side, idx: t.idx });
        ev.push({ kind: 'text', text: `${t.name}の {血|ち}が とまらなく なった！` });
      } else if (ty === 'itami') {
        const amt = Math.min(0.5, 0.22 * n * r);
        if (amt >= 0.1) {
          t.st.atkDown = Math.max(t.st.atkDown, amt);
          t.st.atkDownTurns = 3;
          ev.push({ kind: 'mark', side: t.side, idx: t.idx });
          ev.push({ kind: 'text', text: `いたみで ${t.name}の こうげきが さがった！` });
        } else ev.push({ kind: 'text', text: `${t.name}には いたみどくが ききにくい！` });
      } else if (ty === 'kowashi') {
        t.st.defDown = Math.max(t.st.defDown, Math.min(0.6, 0.28 * n * r));
        t.st.defDownTurns = 3;
        ev.push({ kind: 'mark', side: t.side, idx: t.idx });
        ev.push({ kind: 'text', text: `${t.name}の ぼうぎょが さがった！` });
      }
    }
  }

  private bossAct(b: Unit, ev: BattleEvent[]): void {
    const boss = this.boss!;
    const total = boss.moves.reduce((a, m) => a + m.weight, 0);
    let r = Math.random() * total;
    let mv = boss.moves[0];
    for (const m of boss.moves) {
      r -= m.weight;
      if (r < 0) {
        mv = m;
        break;
      }
    }
    if (mv.defUp && b.st.defUpTurns > 0) mv = boss.moves[0];
    ev.push({ kind: 'text', text: `${b.name}の ${mv.name}！` });
    if (mv.defUp) {
      b.st.defUp = mv.defUp;
      b.st.defUpTurns = 3;
      ev.push({ kind: 'mark', side: b.side, idx: b.idx });
      ev.push({ kind: 'text', text: `${b.name}の ぼうぎょが あがった！` });
      return;
    }
    const t = this.me();
    if (this.dodged(b, t, ev)) return;
    for (let i = 0; i < (mv.hits ?? 1) && t.hp > 0; i++) {
      const { amount, crit } = this.damage(b, t, mv.power, 1);
      this.hit(t, amount, crit, ev);
    }
  }

  private act(u: Unit, choice: Choice, ev: BattleEvent[]): void {
    if (u.hp <= 0 || this.over) return;
    const target = u.side === 'p' ? this.foe() : this.me();
    if (target.hp <= 0) return;
    if (u.st.para) {
      u.st.para = false;
      ev.push({ kind: 'text', text: `${u.name}は しびれて うごけない！` });
      return;
    }
    if (u.side === 'p') {
      const m = choice.kind === 'move' ? u.moves[choice.move] ?? u.moves[0] : u.moves[0];
      this.useMove(u, m, target, ev);
    } else if (this.boss) {
      this.bossAct(u, ev);
    } else {
      const m = Math.random() < 0.7 ? u.moves[0] : u.moves[1];
      this.useMove(u, m, target, ev);
    }
  }

  private endRound(ev: BattleEvent[]): void {
    for (const u of [this.me(), this.foe()]) {
      if (u.hp <= 0) continue;
      const st = u.st;
      if (st.bleedTurns > 0) {
        ev.push({ kind: 'text', text: `どくで ${u.name}に ダメージ！` });
        this.hit(u, st.bleedDmg, false, ev);
        st.bleedTurns--;
      }
      if (st.atkDownTurns > 0 && --st.atkDownTurns === 0) st.atkDown = 0;
      if (st.defDownTurns > 0 && --st.defDownTurns === 0) st.defDown = 0;
      if (st.defUpTurns > 0 && --st.defUpTurns === 0) st.defUp = 0;
      if (this.checkEnd(ev)) return;
    }
  }

  turn(choice: Choice): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over || this.me().hp <= 0) return ev;
    if (choice.kind === 'switch') {
      const before = this.me();
      if (choice.to !== before.idx && this.players[choice.to]?.hp > 0) {
        ev.push({ kind: 'text', text: `${before.name}、もどって！` });
        before.st = newStatus(); // ひっこむと じょうたいが なおる
        ev.push(...this.sendOut(choice.to));
      }
      this.act(this.foe(), choice, ev);
    } else {
      const me = this.me();
      const foe = this.foe();
      const order = me.spd === foe.spd ? (Math.random() < 0.5 ? [me, foe] : [foe, me]) : me.spd > foe.spd ? [me, foe] : [foe, me];
      for (const u of order) {
        this.act(u, choice, ev);
        if (this.checkEnd(ev)) return ev;
      }
    }
    if (this.checkEnd(ev)) return ev;
    this.endRound(ev);
    this.checkEnd(ev);
    // あいてが たおれて、まだ のこっていれば つぎが でてくる
    if (!this.over && this.foe().hp <= 0) {
      const next = this.enemies.findIndex((u) => u.hp > 0);
      if (next >= 0) {
        this.active.e = next;
        ev.push({ kind: 'switch', side: 'e', idx: next });
        ev.push({ kind: 'text', text: `${this.enemies[next].name}が でてきた！` });
      }
    }
    return ev;
  }

  private checkEnd(ev: BattleEvent[]): boolean {
    if (this.over) return true;
    if (this.alive('e').length === 0) {
      this.over = true;
      this.win = true;
      ev.push({ kind: 'text', text: this.boss ? `${this.boss.name}を たおした！` : 'かった！' });
      ev.push({ kind: 'end', win: true });
      return true;
    }
    if (this.alive('p').length === 0) {
      this.over = true;
      ev.push({ kind: 'text', text: 'みんな つかれて たおれて しまった…' });
      ev.push({ kind: 'end', win: false });
      return true;
    }
    return false;
  }
}

export const markLabels = (u: Unit): [string, string][] => {
  const m: [string, string][] = [];
  if (u.st.para) m.push(['⚡しびれ', PTYPES.shibire.color]);
  if (u.st.bleedTurns > 0) m.push(['🩸', PTYPES.chi.color]);
  if (u.st.atkDown > 0) m.push(['💥↓', PTYPES.itami.color]);
  if (u.st.defDown > 0) m.push(['🧪↓', PTYPES.kowashi.color]);
  if (u.st.defUp > 0) m.push(['🛡️↑', '#868e96']);
  return m;
};
