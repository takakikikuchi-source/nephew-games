// チームバトル（3びき まで）。ターン制で、すばやい じゅんに うごく。
// ダメージは「こうげき × 50 ÷（50 ＋ ぼうぎょ）」の わりあい式（ぼうぎょを あげても むてきに ならない）。
import { BOSSES, PTYPES, SPECIES, type Boss, type PType } from './data';
import { basicMove, naturalMove, stats, statsFor, type Creature, type Move } from './state';

const K = 50;
const CRIT_RATE = 0.05;
const CRIT_MULT = 1.5;

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
  moves: Move[];
  resist: Partial<Record<PType, number>>;
  st: Status;
}

export type BattleEvent =
  | { kind: 'text'; text: string }
  | { kind: 'hit'; side: Side; idx: number; amount: number; hp: number; crit: boolean }
  | { kind: 'mark'; side: Side; idx: number }
  | { kind: 'ko'; side: Side; idx: number }
  | { kind: 'end'; win: boolean };

export interface Choice {
  move: number;
  target: number;
}

const newStatus = (): Status => ({ para: false, bleedTurns: 0, bleedDmg: 0, atkDown: 0, atkDownTurns: 0, defDown: 0, defDownTurns: 0, defUp: 0, defUpTurns: 0 });

export class TeamBattle {
  readonly players: Unit[];
  readonly enemies: Unit[];
  readonly boss: Boss | null;
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
        moves: [...c.moves, basicMove()],
        resist: {},
        st: newStatus(),
      };
    });
    this.boss = bossIndex != null ? BOSSES[bossIndex] : null;
    if (this.boss) {
      const b = this.boss;
      this.enemies = [{ side: 'e', idx: 0, name: b.name, species: null, level: b.recLevel, maxHp: b.stats.hp, hp: b.stats.hp, atk: b.stats.atk, def: b.stats.def, spd: b.stats.spd, moves: [], resist: b.resist, st: newStatus() }];
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
          moves: [naturalMove(w.species), basicMove()],
          resist: {},
          st: newStatus(),
        };
      });
    }
  }

  alive(side: Side): Unit[] {
    return (side === 'p' ? this.players : this.enemies).filter((u) => u.hp > 0);
  }

  private damage(a: Unit, d: Unit, power: number, resist: number): { amount: number; crit: boolean } {
    const atk = a.atk * (1 - a.st.atkDown);
    const def = d.def * (1 - d.st.defDown) * (1 + d.st.defUp);
    const crit = Math.random() < CRIT_RATE;
    const rnd = 0.9 + Math.random() * 0.2;
    const raw = ((atk * power * K) / (K + def)) * resist * rnd * (crit ? CRIT_MULT : 1);
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

  private useMove(a: Unit, m: Move, t: Unit, ev: BattleEvent[]): void {
    ev.push({ kind: 'text', text: `${a.name}の ${m.name}！` });
    const res = m.types.length ? m.types.reduce((acc, ty) => acc + (t.resist[ty] ?? 1), 0) / m.types.length : 1;
    const { amount, crit } = this.damage(a, t, m.power, res);
    if (crit) ev.push({ kind: 'text', text: 'きゅうしょに あたった！' });
    this.hit(t, amount, crit, ev);
    if (m.types.length && res < 0.6) ev.push({ kind: 'text', text: 'あまり きいていない みたい…' });
    if (t.hp <= 0) return;
    const counts = new Map<PType, number>();
    for (const ty of m.types) counts.set(ty, (counts.get(ty) ?? 0) + 1);
    for (const [ty, n] of counts) {
      const r = t.resist[ty] ?? 1;
      if (ty === 'shibire') {
        if (Math.random() < Math.min(0.6, 0.28 * n) * r) {
          t.st.para = true;
          ev.push({ kind: 'mark', side: t.side, idx: t.idx });
          ev.push({ kind: 'text', text: `${t.name}は しびれて うごけなく なった！` });
        } else if (r < 1) ev.push({ kind: 'text', text: `${t.name}には しびれどくが ききにくい！` });
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
    const targets = mv.all ? this.alive('p') : [this.pickPlayerTarget()];
    for (const t of targets) {
      for (let i = 0; i < (mv.hits ?? 1) && t.hp > 0; i++) {
        const { amount, crit } = this.damage(b, t, mv.power, 1);
        this.hit(t, amount, crit, ev);
      }
    }
  }

  private pickPlayerTarget(): Unit {
    const a = this.alive('p');
    return a[Math.floor(Math.random() * a.length)];
  }

  private act(u: Unit, choices: Choice[], ev: BattleEvent[]): void {
    if (u.hp <= 0) return;
    if (u.st.para) {
      u.st.para = false;
      ev.push({ kind: 'text', text: `${u.name}は しびれて うごけない！` });
      return;
    }
    if (u.side === 'p') {
      const c = choices[u.idx] ?? { move: 0, target: 0 };
      const m = u.moves[c.move] ?? u.moves[0];
      let t = this.enemies[c.target];
      if (!t || t.hp <= 0) t = this.alive('e')[0];
      if (t) this.useMove(u, m, t, ev);
    } else if (this.boss) {
      this.bossAct(u, ev);
    } else {
      const m = Math.random() < 0.7 ? u.moves[0] : u.moves[1];
      this.useMove(u, m, this.pickPlayerTarget(), ev);
    }
  }

  private endRound(ev: BattleEvent[]): void {
    for (const u of [...this.players, ...this.enemies]) {
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

  turn(choices: Choice[]): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over) return ev;
    const order = [...this.alive('p'), ...this.alive('e')].sort((a, b) => b.spd - a.spd || Math.random() - 0.5);
    for (const u of order) {
      this.act(u, choices, ev);
      if (this.checkEnd(ev)) return ev;
    }
    this.endRound(ev);
    this.checkEnd(ev);
    return ev;
  }

  private checkEnd(ev: BattleEvent[]): boolean {
    if (this.over) return true;
    if (this.alive('e').length === 0) {
      this.over = true;
      this.win = true;
      ev.push({ kind: 'text', text: this.boss ? `${this.boss.name}を たおした！` : 'ぜんぶ たおした！' });
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
