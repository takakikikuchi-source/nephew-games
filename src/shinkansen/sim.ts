// 運転のしくみ：アクセル（マスコン）とブレーキの2本のレバー、ATC、時刻表、採点
import { ATC_STEPS, SEGMENTS, STATION_POS, VEHICLE, courseStops, segmentIndexAt, type Course } from './data';

export type Mode = 'easy' | 'normal' | 'hard';
export type Phase = 'boarding' | 'ready' | 'running' | 'arrived' | 'done';

export const POWER_MAX = 5; // P1〜P5
export const BRAKE_MAX = 8; // B1〜B7、8=非常

export function powerLabel(n: number): string {
  return n === 0 ? 'きる' : `P${n}`;
}
export function brakeLabel(n: number): string {
  if (n === 0) return 'ゆるめ';
  if (n === BRAKE_MAX) return 'ひじょう';
  return `B${n}`;
}

const ATC_DECEL = 0.9; // m/s² ATCが想定するブレーキの強さ

export interface StopRecord {
  station: number;
  diff: number; // +ならてまえ、-なら行きすぎ（m）
  timeDiff: number | null; // +なら遅れ（秒）
  atc: number;
  harsh: number;
  announced: boolean;
  score: number;
  stopLabel: string;
}

interface Phys {
  s: number;
  kmh: number;
  acc: number; // 実際の加速度 km/h/s
}

function resistance(kmh: number): number {
  return kmh <= 0 ? 0 : 0.02 + kmh * kmh * 0.000004;
}

function powerAccel(p: number, kmh: number): number {
  const base = VEHICLE.powerAccel[p] ?? 0;
  return base * Math.max(0.25, Math.min(1, (330 - kmh) / 220));
}

function brakeDecel(b: number): number {
  return b >= BRAKE_MAX ? VEHICLE.emergencyDecel : VEHICLE.brakeDecel[b] ?? 0;
}

function stepPhys(p: Phys, cmd: number, dt: number): void {
  // ブレーキは少し遅れてきく（本物と同じ）。cmd は km/h/s（+加速 -減速）
  const tau = cmd < p.acc ? 0.6 : 0.3;
  p.acc += (cmd - p.acc) * Math.min(1, dt / tau);
  let a = p.acc - resistance(p.kmh);
  if (p.kmh <= 0 && a < 0) a = 0;
  p.kmh = Math.max(0, p.kmh + a * dt);
  p.s += (p.kmh / 3.6) * dt;
}

// ある場所での ATC の制限速度（段で表示する値）
export function atcLimitAt(s: number, stopPos: number | null): number {
  const seg = segmentIndexAt(s);
  let raw: number = Math.min(VEHICLE.maxSpeed, SEGMENTS[seg].limit);
  // 次の区間の制限が低いときは、手前から下げる
  if (seg + 1 < SEGMENTS.length) {
    const b = STATION_POS[seg + 1];
    const l2 = SEGMENTS[seg + 1].limit;
    if (l2 < raw && b > s) raw = Math.min(raw, 3.6 * Math.sqrt((l2 / 3.6) ** 2 + 2 * ATC_DECEL * (b - s)));
  }
  if (stopPos != null) {
    const d = stopPos - s;
    let curve: number;
    if (d < -30) curve = 0;
    else if (d < 60) curve = 30;
    else curve = Math.max(30, 3.6 * Math.sqrt(2 * ATC_DECEL * d));
    raw = Math.min(raw, curve);
  }
  for (const step of ATC_STEPS) if (step <= raw + 0.01) return step;
  return 0;
}

export class Sim {
  readonly mode: Mode;
  readonly course: Course;
  readonly stops: number[];
  next = 1; // stops[next] が次にとまる駅
  p: Phys;
  power = 0;
  brake = 7;
  time = 0;
  phase: Phase = 'boarding';
  doorsOpen = true;
  atcLimit = 0;
  atcBraking = false;
  legAtc = 0;
  legHarsh = 0;
  legAnnounced = false;
  private harshLatched = false;
  private shortWarned = false;
  private stoppedFor = 0;
  schedule: { arr: number; dep: number }[] = [];
  records: StopRecord[] = [];
  onAtcChange: ((limit: number) => void) | null = null;
  onOverspeed: (() => void) | null = null;
  onShortStop: (() => void) | null = null;

  constructor(course: Course, mode: Mode) {
    this.course = course;
    this.mode = mode;
    this.stops = courseStops(course);
    this.p = { s: STATION_POS[this.stops[0]], kmh: 0, acc: 0 };
    this.atcLimit = atcLimitAt(this.p.s, this.stopPos());
    this.buildSchedule();
  }

  get kmh(): number {
    return this.p.kmh;
  }
  get s(): number {
    return this.p.s;
  }
  stopPos(): number | null {
    const st = this.stops[this.next];
    return st == null ? null : STATION_POS[st];
  }
  nextStation(): number | null {
    return this.stops[this.next] ?? null;
  }
  distToStop(): number {
    const sp = this.stopPos();
    return sp == null ? 0 : sp - this.p.s;
  }
  isLast(): boolean {
    return this.next === this.stops.length - 1;
  }
  canAnnounce(): boolean {
    const d = this.distToStop();
    return this.phase === 'running' && !this.legAnnounced && d < 4500 && d > 300;
  }

  // 時刻表：上手な運転士が走った時間＋すこし余裕
  private buildSchedule(): void {
    const DWELL = 30;
    let t = DWELL;
    this.schedule = [{ arr: 0, dep: DWELL }];
    for (let k = 1; k < this.stops.length; k++) {
      const stop = STATION_POS[this.stops[k]];
      const p: Phys = { s: STATION_POS[this.stops[k - 1]], kmh: 0, acc: 0 };
      let time = 0;
      const dt = 0.1;
      while (time < 3600) {
        const lim = atcLimitAt(p.s, stop);
        const d = stop - p.s;
        let cmd: number;
        const need = d > 0.5 ? (p.kmh / 3.6) ** 2 / (2 * d) : 9; // m/s²
        if (need > 0.8 || d < 1) cmd = -brakeDecel(Math.min(7, Math.max(2, Math.ceil((need * 3.6) / 0.7))));
        else if (p.kmh > lim - 3) cmd = -brakeDecel(2);
        else if (p.kmh < lim - 8) cmd = powerAccel(4, p.kmh);
        else cmd = 0;
        stepPhys(p, cmd, dt);
        time += dt;
        if (p.kmh <= 0.01 && d < 5 && time > 5) break;
      }
      t += Math.round(time * 1.1 + 10);
      this.schedule.push({ arr: t, dep: t + DWELL });
      t += DWELL;
    }
  }

  setPower(n: number): void {
    this.power = Math.max(0, Math.min(POWER_MAX, n));
  }
  setBrake(n: number): void {
    this.brake = Math.max(0, Math.min(BRAKE_MAX, n));
  }

  update(dt: number): void {
    this.time += dt;
    if (this.phase !== 'running') return;
    const stop = this.stopPos();
    const lim = atcLimitAt(this.p.s, stop);
    if (lim !== this.atcLimit) {
      this.atcLimit = lim;
      this.onAtcChange?.(lim);
    }
    const kmh = this.p.kmh;
    let cmd = 0;
    // ブレーキが少しでも入っていれば、アクセルはきかない（本物と同じ）
    if (this.brake > 0) cmd = -brakeDecel(this.brake);
    else if (this.power > 0 && !this.doorsOpen) cmd = powerAccel(this.power, kmh);

    if (this.mode === 'easy') {
      // かんたん：ATCが自動で速度を守る（減点なし）。止まる位置を過ぎたら しっかり止める
      const d = stop != null ? stop - this.p.s : Infinity;
      if (kmh > lim - 2 && cmd > 0) cmd = 0;
      if (kmh > lim + 0.5) cmd = Math.min(cmd, -brakeDecel(lim === 0 ? 7 : 4));
      if (d < 2 && kmh > 0.01) cmd = -brakeDecel(7);
    } else {
      if (kmh > lim + 1.5 && !this.atcBraking) {
        this.atcBraking = true;
        this.legAtc++;
        this.onOverspeed?.();
      }
      if (this.atcBraking) {
        cmd = Math.min(cmd, -brakeDecel(lim === 0 ? 7 : 6));
        if (kmh <= Math.max(0, lim - 3)) this.atcBraking = false;
      }
    }
    if (this.brake === BRAKE_MAX && kmh > 30 && !this.harshLatched) {
      this.legHarsh++;
      this.harshLatched = true;
    }
    if (this.brake !== BRAKE_MAX) this.harshLatched = false;

    stepPhys(this.p, cmd, dt);
    if (this.p.kmh <= 0.01 && stop != null && cmd <= 0) {
      const d = stop - this.p.s;
      this.stoppedFor += dt;
      if (d > 60) {
        // 止まったままなら、6秒ごとにもう一度知らせる
        if (this.stoppedFor > 1 && !this.shortWarned) {
          this.shortWarned = true;
          this.onShortStop?.();
        } else if (this.stoppedFor > 7) {
          this.stoppedFor = 1;
          this.shortWarned = false;
        }
      } else {
        this.arrive(d);
      }
    } else {
      this.stoppedFor = 0;
      if (this.p.kmh > 3) this.shortWarned = false;
    }
  }

  private arrive(d: number): void {
    const mode = this.mode;
    const ad = Math.abs(d);
    const th = mode === 'easy' ? [3, 6, 10, 20, 35] : mode === 'normal' ? [0.5, 1, 2, 5, 10] : [0.3, 0.6, 1.2, 3, 6];
    const pts = [40, 36, 32, 25, 15];
    const labels = ['ぴったり！', 'すごい！', 'いいね！', 'おしい！', 'もうすこし！'];
    const i = th.findIndex((x) => ad <= x);
    let stopScore = i >= 0 ? pts[i] : 5;
    let stopLabel = i >= 0 ? labels[i] : d < 0 ? 'いきすぎ…' : 'てまえ…';
    if (d < -30 && mode !== 'easy') {
      stopScore = 0;
      stopLabel = 'オーバーラン…';
    }
    let timeDiff: number | null = null;
    let timeScore = 30;
    if (mode !== 'easy') {
      timeDiff = Math.round(this.time - this.schedule[this.next].arr);
      const tt = mode === 'normal' ? [15, 30, 60] : [3, 10, 20];
      const k = tt.findIndex((x) => Math.abs(timeDiff!) <= x);
      timeScore = k >= 0 ? [30, 24, 15][k] : 5;
    }
    const atcScore = mode === 'easy' ? 20 : Math.max(0, 20 - this.legAtc * 10);
    const comfort = Math.max(0, 10 - this.legHarsh * 5);
    this.records.push({
      station: this.stops[this.next],
      diff: d,
      timeDiff,
      atc: this.legAtc,
      harsh: this.legHarsh,
      announced: this.legAnnounced,
      score: stopScore + timeScore + atcScore + comfort,
      stopLabel,
    });
    this.phase = 'arrived';
    this.atcBraking = false;
    this.power = 0;
    this.brake = Math.max(this.brake, 4);
  }

  announce(): void {
    this.legAnnounced = true;
  }

  openDoors(): boolean {
    if (this.p.kmh > 0.01 || this.doorsOpen || this.phase !== 'arrived') return false;
    this.doorsOpen = true;
    this.phase = this.isLast() ? 'done' : 'boarding';
    return true;
  }

  closeDoors(): boolean {
    if (!this.doorsOpen || this.phase !== 'boarding') return false;
    this.doorsOpen = false;
    this.phase = 'ready';
    return true;
  }

  depart(): void {
    if (this.phase !== 'ready') return;
    if (this.records.length > 0) this.next++;
    this.phase = 'running';
    this.legAtc = 0;
    this.legHarsh = 0;
    this.legAnnounced = false;
    this.atcLimit = atcLimitAt(this.p.s, this.stopPos());
    this.onAtcChange?.(this.atcLimit);
  }

  totalScore(): { avg: number; stars: number } {
    if (!this.records.length) return { avg: 0, stars: 1 };
    const avg = this.records.reduce((a, r) => a + r.score, 0) / this.records.length;
    return { avg: Math.round(avg), stars: avg >= 85 ? 3 : avg >= 60 ? 2 : 1 };
  }
}

export function fmtClock(sec: number, withSec: boolean): string {
  const t = Math.max(0, Math.floor(10 * 3600 + sec));
  const h = Math.floor(t / 3600) % 24;
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return withSec ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${h}:${String(m).padStart(2, '0')}`;
}
