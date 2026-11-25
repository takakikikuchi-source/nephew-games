// ターン制のボスバトル。毒タイプごとの効き目と、ボスの「効きにくさ」を計算する。
import { BOSSES, PTYPES, SPECIES, type Boss, type PType } from './data';
import { basicMove, stats, type Creature, type Move } from './state';

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

export interface Fighter {
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  st: Status;
}

export type Side = 'p' | 'b';

export type BattleEvent =
  | { kind: 'text'; text: string }
  | { kind: 'hit'; target: Side; amount: number; hp: number }
  | { kind: 'mark'; target: Side; label: string; color: string }
  | { kind: 'end'; win: boolean };

const newStatus = (): Status => ({
  para: false,
  bleedTurns: 0,
  bleedDmg: 0,
  atkDown: 0,
  atkDownTurns: 0,
  defDown: 0,
  defDownTurns: 0,
  defUp: 0,
  defUpTurns: 0,
});

export class Battle {
  readonly boss: Boss;
  readonly p: Fighter;
  readonly b: Fighter;
  readonly moves: Move[];
  over = false;
  win = false;

  constructor(c: Creature, bossIndex: number) {
    this.boss = BOSSES[bossIndex];
    const s = stats(c);
    const sp = SPECIES[c.species];
    this.p = { name: sp.name, maxHp: s.hp, hp: s.hp, atk: s.doku, def: s.def, spd: s.spd, st: newStatus() };
    const bs = this.boss.stats;
    this.b = { name: this.boss.name, maxHp: bs.hp, hp: bs.hp, atk: bs.doku, def: bs.def, spd: bs.spd, st: newStatus() };
    this.moves = [...c.moves, basicMove()];
  }

  private resistOf(t: PType): number {
    return this.boss.resist[t] ?? 1;
  }

  private damage(att: Fighter, def: Fighter, power: number, resist: number): number {
    const a = att.atk * (1 - att.st.atkDown);
    const d = def.def * (1 - def.st.defDown) * (1 + def.st.defUp);
    const rnd = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.round(((a * power * 50) / (50 + d)) * resist * rnd));
  }

  private apply(target: Side, amount: number, ev: BattleEvent[]): void {
    const f = target === 'p' ? this.p : this.b;
    f.hp = Math.max(0, f.hp - amount);
    ev.push({ kind: 'hit', target, amount, hp: f.hp });
  }

  private playerAct(m: Move, ev: BattleEvent[]): void {
    ev.push({ kind: 'text', text: `${this.p.name}の ${m.name}！` });
    const res = m.types.length ? m.types.reduce((acc, t) => acc + this.resistOf(t), 0) / m.types.length : 1;
    this.apply('b', this.damage(this.p, this.b, m.power, res), ev);
    if (m.types.length && res < 0.6) ev.push({ kind: 'text', text: 'あまり きいていない みたい…' });
    else if (m.types.length && res >= 1) ev.push({ kind: 'text', text: 'どくが よく きいた！' });
    if (this.b.hp <= 0) return;
    // 毒の効果
    const counts = new Map<PType, number>();
    for (const t of m.types) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const [t, n] of counts) {
      const r = this.resistOf(t);
      const info = PTYPES[t];
      if (t === 'shibire') {
        if (Math.random() < Math.min(0.6, 0.28 * n) * r) {
          this.b.st.para = true;
          ev.push({ kind: 'mark', target: 'b', label: '⚡しびれ', color: info.color });
          ev.push({ kind: 'text', text: `${this.b.name}は しびれて うごけなく なった！` });
        } else if (r < 1) {
          ev.push({ kind: 'text', text: `${this.b.name}には しびれどくが ききにくい！` });
        }
      } else if (t === 'chi') {
        this.b.st.bleedTurns = 3;
        this.b.st.bleedDmg = Math.max(1, Math.round(this.b.maxHp * 0.045 * n * r));
        ev.push({ kind: 'mark', target: 'b', label: '🩸ちのどく', color: info.color });
        ev.push({ kind: 'text', text: `${this.b.name}の {血|ち}が とまらなく なった！` });
      } else if (t === 'itami') {
        const amt = Math.min(0.5, 0.22 * n * r);
        if (amt >= 0.1) {
          this.b.st.atkDown = Math.max(this.b.st.atkDown, amt);
          this.b.st.atkDownTurns = 3;
          ev.push({ kind: 'mark', target: 'b', label: '💥こうげき↓', color: info.color });
          ev.push({ kind: 'text', text: `いたみで ${this.b.name}の こうげきが さがった！` });
        } else {
          ev.push({ kind: 'text', text: `${this.b.name}には いたみどくが ききにくい！` });
        }
      } else if (t === 'kowashi') {
        const amt = Math.min(0.6, 0.28 * n * r);
        this.b.st.defDown = Math.max(this.b.st.defDown, amt);
        this.b.st.defDownTurns = 3;
        ev.push({ kind: 'mark', target: 'b', label: '🧪ぼうぎょ↓', color: info.color });
        ev.push({ kind: 'text', text: `${this.b.name}の ぼうぎょが さがった！` });
      }
    }
  }

  private bossAct(ev: BattleEvent[]): void {
    const total = this.boss.moves.reduce((a, m) => a + m.weight, 0);
    let r = Math.random() * total;
    let move = this.boss.moves[0];
    for (const m of this.boss.moves) {
      r -= m.weight;
      if (r < 0) {
        move = m;
        break;
      }
    }
    if (move.defUp && this.b.st.defUpTurns > 0) move = this.boss.moves[0];
    ev.push({ kind: 'text', text: `${this.b.name}の ${move.name}！` });
    if (move.defUp) {
      this.b.st.defUp = move.defUp;
      this.b.st.defUpTurns = 3;
      ev.push({ kind: 'mark', target: 'b', label: '🛡️ぼうぎょ↑', color: '#868e96' });
      ev.push({ kind: 'text', text: `${this.b.name}の ぼうぎょが あがった！` });
      return;
    }
    const hits = move.hits ?? 1;
    for (let i = 0; i < hits && this.p.hp > 0; i++) this.apply('p', this.damage(this.b, this.p, move.power, 1), ev);
  }

  private act(side: Side, m: Move, ev: BattleEvent[]): void {
    const f = side === 'p' ? this.p : this.b;
    if (f.st.para) {
      f.st.para = false;
      ev.push({ kind: 'text', text: `${f.name}は しびれて うごけない！` });
      return;
    }
    if (side === 'p') this.playerAct(m, ev);
    else this.bossAct(ev);
  }

  private endRound(ev: BattleEvent[]): void {
    const st = this.b.st;
    if (st.bleedTurns > 0 && this.b.hp > 0) {
      ev.push({ kind: 'text', text: `どくで ${this.b.name}に ダメージ！` });
      this.apply('b', st.bleedDmg, ev);
      st.bleedTurns--;
    }
    if (st.atkDownTurns > 0 && --st.atkDownTurns === 0) st.atkDown = 0;
    if (st.defDownTurns > 0 && --st.defDownTurns === 0) st.defDown = 0;
    if (st.defUpTurns > 0 && --st.defUpTurns === 0) st.defUp = 0;
  }

  turn(moveIndex: number): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over) return ev;
    const m = this.moves[moveIndex] ?? basicMove();
    const playerFirst = this.p.spd > this.b.spd || (this.p.spd === this.b.spd && Math.random() < 0.5);
    const order: Side[] = playerFirst ? ['p', 'b'] : ['b', 'p'];
    for (const side of order) {
      this.act(side, m, ev);
      if (this.checkEnd(ev)) return ev;
    }
    this.endRound(ev);
    this.checkEnd(ev);
    return ev;
  }

  private checkEnd(ev: BattleEvent[]): boolean {
    if (this.b.hp <= 0) {
      this.over = true;
      this.win = true;
      ev.push({ kind: 'text', text: `${this.b.name}を たおした！` });
      ev.push({ kind: 'end', win: true });
      return true;
    }
    if (this.p.hp <= 0) {
      this.over = true;
      this.win = false;
      ev.push({ kind: 'text', text: `${this.p.name}は つかれて たおれて しまった…` });
      ev.push({ kind: 'end', win: false });
      return true;
    }
    return false;
  }
}
