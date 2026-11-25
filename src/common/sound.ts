// 効果音・BGM・読み上げ。音のファイルは使わず、Web Audioでその場で鳴らす。
import { load, save } from './storage';

export interface SoundSettings {
  sfx: boolean;
  bgm: boolean;
  voice: boolean;
}

let settings: SoundSettings = load<SoundSettings>('sound', { sfx: true, bgm: true, voice: true });
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function getSoundSettings(): SoundSettings {
  return { ...settings };
}

export function setSoundSettings(s: Partial<SoundSettings>): void {
  settings = { ...settings, ...s };
  save('sound', settings);
  if (!settings.bgm) bgm.stop();
}

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function audioCtx(): { ctx: AudioContext; out: GainNode } | null {
  if (!ctx || !master) return null;
  return { ctx, out: master };
}

export function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, when = 0, slideTo?: number): void {
  if (!settings.sfx || !ctx || !master) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function noise(dur: number, vol = 0.1, when = 0, filterFreq = 1200): void {
  if (!settings.sfx || !ctx || !master) return;
  const t = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export type SfxName = 'click' | 'good' | 'bad' | 'coin' | 'levelup' | 'hatch' | 'hit' | 'miss' | 'heal' | 'win' | 'lose' | 'pop';

export function sfx(name: SfxName): void {
  switch (name) {
    case 'click':
      tone(660, 0.06, 'square', 0.06);
      break;
    case 'pop':
      tone(500, 0.08, 'sine', 0.12, 0, 900);
      break;
    case 'good':
      tone(660, 0.1, 'square', 0.08);
      tone(990, 0.15, 'square', 0.08, 0.1);
      break;
    case 'bad':
      tone(300, 0.15, 'sawtooth', 0.07);
      tone(220, 0.25, 'sawtooth', 0.07, 0.15);
      break;
    case 'coin':
      tone(988, 0.07, 'square', 0.08);
      tone(1319, 0.2, 'square', 0.08, 0.07);
      break;
    case 'levelup':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.08, i * 0.11));
      break;
    case 'hatch':
      noise(0.25, 0.15, 0, 3000);
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, 0.2 + i * 0.09));
      break;
    case 'hit':
      noise(0.15, 0.2, 0, 1800);
      tone(180, 0.12, 'square', 0.08, 0, 80);
      break;
    case 'miss':
      tone(400, 0.2, 'sine', 0.08, 0, 200);
      break;
    case 'heal':
      [523, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, i * 0.08));
      break;
    case 'win':
      [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.08, i * 0.12));
      break;
    case 'lose':
      [392, 370, 349, 330].forEach((f, i) => tone(f, 0.28, 'triangle', 0.1, i * 0.25));
      break;
  }
}

// --- 読み上げ（Windowsに入っている日本語の声を使う）---
let jaVoice: SpeechSynthesisVoice | null = null;
function pickVoice(): void {
  try {
    const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ja'));
    // ネットが不要なローカルの声を優先する
    jaVoice = vs.find((v) => v.localService) ?? vs[0] ?? null;
  } catch {
    jaVoice = null;
  }
}
try {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
} catch {
  /* ignore */
}

export function speak(text: string, rate = 1.0, pitch = 1.0): void {
  if (!settings.voice) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = rate;
    u.pitch = pitch;
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function stopSpeak(): void {
  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

// --- かんたんなBGM（ループする短い曲）---
// melody: [MIDIノート番号 or 0(休み), 長さ(拍)] の配列
export type Song = { bpm: number; melody: [number, number][]; bass?: [number, number][]; wave?: OscillatorType };

class Bgm {
  private timer: number | null = null;
  private song: Song | null = null;
  play(song: Song): void {
    if (this.song === song && this.timer != null) return;
    this.stop();
    this.song = song;
    if (!settings.bgm) return;
    const loop = () => {
      const a = audioCtx();
      if (!a || !this.song || !settings.bgm) return;
      const beat = 60 / this.song.bpm;
      let total = 0;
      const sched = (seq: [number, number][], wave: OscillatorType, vol: number) => {
        let t = 0;
        for (const [n, len] of seq) {
          if (n > 0) {
            const f = 440 * Math.pow(2, (n - 69) / 12);
            const start = a.ctx.currentTime + 0.05 + t * beat;
            const o = a.ctx.createOscillator();
            const g = a.ctx.createGain();
            o.type = wave;
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, start);
            g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, start + len * beat * 0.95);
            o.connect(g).connect(a.out);
            o.start(start);
            o.stop(start + len * beat);
          }
          t += len;
        }
        return t;
      };
      total = sched(this.song.melody, this.song.wave ?? 'triangle', 0.05);
      if (this.song.bass) sched(this.song.bass, 'sine', 0.06);
      this.timer = window.setTimeout(loop, total * beat * 1000);
    };
    loop();
  }
  stop(): void {
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;
    this.song = null;
  }
}

export const bgm = new Bgm();
