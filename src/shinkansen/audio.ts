// 新幹線の音：モーター音・走る音・風の音、ATCのチャイム、警笛、ドア、発車メロディ（すべてオリジナル）
import { audioCtx, getSoundSettings, noise, tone } from '../common/sound';

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export class TrainAudio {
  private nodes: {
    motor: OscillatorNode;
    motor2: OscillatorNode;
    motorGain: GainNode;
    roll: GainNode;
    rollFilter: BiquadFilterNode;
    wind: GainNode;
    squeal: OscillatorNode;
    squealGain: GainNode;
    srcs: AudioScheduledSourceNode[];
  } | null = null;

  start(): void {
    const a = audioCtx();
    if (!a || this.nodes) return;
    const { ctx, out } = a;
    const buf = noiseBuffer(ctx);
    const mkNoise = () => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      return s;
    };
    // モーター（インバーターのうなり）
    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    const motor2 = ctx.createOscillator();
    motor2.type = 'square';
    const mf = ctx.createBiquadFilter();
    mf.type = 'lowpass';
    mf.frequency.value = 1400;
    const motorGain = ctx.createGain();
    motorGain.gain.value = 0;
    motor.connect(mf);
    motor2.connect(mf);
    mf.connect(motorGain).connect(out);
    // 走る音
    const rs = mkNoise();
    const rollFilter = ctx.createBiquadFilter();
    rollFilter.type = 'bandpass';
    rollFilter.frequency.value = 300;
    rollFilter.Q.value = 0.7;
    const roll = ctx.createGain();
    roll.gain.value = 0;
    rs.connect(rollFilter).connect(roll).connect(out);
    // 風の音
    const ws = mkNoise();
    const wf = ctx.createBiquadFilter();
    wf.type = 'highpass';
    wf.frequency.value = 1800;
    const wind = ctx.createGain();
    wind.gain.value = 0;
    ws.connect(wf).connect(wind).connect(out);
    // 止まる直前のブレーキの音
    const squeal = ctx.createOscillator();
    squeal.type = 'sine';
    squeal.frequency.value = 2300;
    const squealGain = ctx.createGain();
    squealGain.gain.value = 0;
    squeal.connect(squealGain).connect(out);
    const srcs = [motor, motor2, rs, ws, squeal];
    srcs.forEach((s) => s.start());
    this.nodes = { motor, motor2, motorGain, roll, rollFilter, wind, squeal, squealGain, srcs };
  }

  update(kmh: number, notch: number, inTunnel: boolean): void {
    const n = this.nodes;
    const a = audioCtx();
    if (!n || !a) return;
    const on = getSoundSettings().sfx;
    const t = a.ctx.currentTime;
    const sp = kmh / 285;
    const motorOn = on && kmh > 0.5 && notch !== 0 ? (notch > 0 ? 0.05 : 0.03) : 0;
    const f = 60 + kmh * 7.5;
    n.motor.frequency.setTargetAtTime(f, t, 0.1);
    n.motor2.frequency.setTargetAtTime(f * 1.5, t, 0.1);
    n.motorGain.gain.setTargetAtTime(motorOn * (1 - sp * 0.5), t, 0.15);
    n.roll.gain.setTargetAtTime(on ? Math.min(0.35, sp * 0.35) * (inTunnel ? 1.6 : 1) : 0, t, 0.2);
    n.rollFilter.frequency.setTargetAtTime(200 + kmh * 3, t, 0.2);
    n.wind.gain.setTargetAtTime(on ? sp * sp * (inTunnel ? 0.18 : 0.08) : 0, t, 0.3);
    n.squealGain.gain.setTargetAtTime(on && notch < 0 && kmh > 0.3 && kmh < 15 ? 0.015 : 0, t, 0.1);
  }

  stop(): void {
    if (!this.nodes) return;
    this.nodes.srcs.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    });
    this.nodes = null;
  }
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function atcBell(): void {
  tone(2100, 0.5, 'triangle', 0.12);
  tone(4200, 0.25, 'sine', 0.03);
}

export function overspeedAlarm(): void {
  for (let i = 0; i < 3; i++) tone(1000, 0.12, 'square', 0.07, i * 0.2);
}

export function horn(): void {
  tone(466, 0.9, 'square', 0.07);
  tone(587, 0.9, 'square', 0.06);
  noise(0.9, 0.03, 0, 900);
}

export function doorOpenChime(): void {
  tone(midi(81), 0.35, 'sine', 0.12);
  tone(midi(77), 0.6, 'sine', 0.12, 0.35);
  noise(0.8, 0.05, 0.2, 600);
}

export function doorCloseSound(): void {
  for (let i = 0; i < 4; i++) tone(660, 0.18, 'square', 0.05, i * 0.3);
  noise(0.6, 0.05, 1.1, 500);
}

// 発車メロディ（オリジナル）。長さ（秒）を返す
export function departMelody(): number {
  const notes = [76, 79, 84, 83, 79, 81, 83, 84, 0, 79, 81, 79, 76, 74, 76, 79];
  notes.forEach((n, i) => {
    if (n) tone(midi(n), 0.2, 'triangle', 0.1, i * 0.19);
  });
  return notes.length * 0.19 + 0.3;
}

export function announceChime(): number {
  [72, 76, 79, 84].forEach((n, i) => tone(midi(n), 0.3, 'sine', 0.12, i * 0.22));
  return 1.1;
}

export function whoosh(): void {
  noise(1.6, 0.25, 0, 2200);
}
