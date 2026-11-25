// 新幹線うんてんし：画面・操作・ゲームの流れ
import { PROFILE_CSS, renderProfilePicker, type Profile } from '../common/profiles';
import { COMMON_CSS, dialog, sleep as wait } from '../common/ui';
import { esc, rb } from '../common/text';
import { bgm, getSoundSettings, setSoundSettings, sfx, speak, unlockAudio, type Song } from '../common/sound';
import { load, save } from '../common/storage';
import { COURSES, STATIONS, STATION_POS, TRAIN_TYPES, courseStops, inTunnel, type Course, type TrainType } from './data';
import { Sim, fmtClock, notchLabel, NOTCH_MAX, NOTCH_MIN, type Mode } from './sim';
import { World } from './world';
import {
  TrainAudio,
  announceChime,
  atcBell,
  departMelody,
  doorCloseSound,
  doorOpenChime,
  horn,
  overspeedAlarm,
  whoosh,
} from './audio';

const css = document.createElement('style');
css.textContent = PROFILE_CSS + COMMON_CSS;
document.head.appendChild(css);

const MENU_SONG: Song = {
  bpm: 112,
  wave: 'triangle',
  melody: [
    [72, 1], [74, 1], [76, 1], [79, 1], [77, 1], [76, 1], [74, 2],
    [76, 1], [77, 1], [79, 1], [84, 1], [83, 1], [79, 1], [81, 2],
  ],
  bass: [[48, 2], [55, 2], [53, 2], [55, 2], [48, 2], [52, 2], [53, 2], [55, 2]],
};

const STAMP_ICONS = ['🗼', '🏙️', '⚽', '🏯', '♨️', '💧', '🗻', '🍵', '🌿', '🎹', '🚋', '🚗', '🍤', '🌸', '⛄', '⛩️', '🐙'];
const STAMP_COLORS = ['#e03131', '#1c7ed6', '#2f9e44', '#f08c00', '#7048e8', '#0c8599', '#c2255c', '#5c940d'];

interface ShinSave {
  stamps: number[];
  totalStars: number;
  best: Record<string, number>;
  runs: number;
  mode: Mode;
}

let profile: Profile;
let sv: ShinSave;
let mode: Mode = 'easy';

const key = () => `shinkansen.${profile.id}`;
const persist = () => save(key(), sv);
const scr = (id: string) => document.getElementById(id)!;
function show(id: string): void {
  document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('on', e.id === id));
}

function rankName(stars: number): string {
  if (stars >= 30) return 'めいじん うんてんし';
  if (stars >= 15) return 'ベテラン うんてんし';
  if (stars >= 5) return 'うんてんし';
  return 'みならい うんてんし';
}

const stName = (i: number) => `{${STATIONS[i].kanji}|${STATIONS[i].yomi}}`;

// ======================= タイトル・プロフィール =======================
function renderTitle(): void {
  const el = scr('s-title');
  el.innerHTML = `
    <div class="title-train">🚄</div>
    <h1 class="logo">しんかんせん<br>うんてんし</h1>
    <button class="btn primary big" id="start">はじめる</button>`;
  el.querySelector<HTMLButtonElement>('#start')!.onclick = () => {
    unlockAudio();
    sfx('good');
    speak('しんかんせん うんてんし！');
    bgm.play(MENU_SONG);
    renderProfile();
  };
  show('s-title');
}

function renderProfile(): void {
  renderProfilePicker(
    scr('s-profile'),
    (p) => {
      profile = p;
      sv = { stamps: [], totalStars: 0, best: {}, runs: 0, mode: 'easy', ...load<Partial<ShinSave>>(key(), {}) };
      mode = sv.mode;
      speak(`${p.name}、よろしくね！`);
      renderMode();
    },
    () => sfx('click'),
  );
  show('s-profile');
}

// ======================= モード =======================
function renderMode(): void {
  bgm.play(MENU_SONG);
  const el = scr('s-mode');
  const modes: [Mode, string, string, string][] = [
    ['easy', '🐣', 'かんたん', '「すすむ」と「とまる」の ボタンだけ。こえで おしえてくれるよ'],
    ['normal', '🚄', 'ふつう', 'レバーで うんてん。じこくひょうも あるよ'],
    ['hard', '🔥', 'むずかしい', 'ひょうじが すくなくて、はんていも きびしい'],
  ];
  el.innerHTML = rb(`
    <header class="topbar"><div class="who">${profile.icon} ${esc(profile.name)}</div>
      <div class="chip">⭐ ${sv.totalStars}　${rankName(sv.totalStars)}</div><div class="spacer"></div>
      <button class="tb" id="stamps">📕 スタンプちょう</button><button class="tb" id="snd">🔊 おと</button><button class="tb" id="who">👥 かわる</button></header>
    <div class="page">
      <h2>どの モードで うんてんする？</h2>
      <div class="modes">${modes
        .map(
          ([m, ic, name, desc]) => `<button class="modecard ${m}" data-mode="${m}"><span class="mic">${ic}</span><span class="mname">${name}</span><span class="mdesc">${desc}</span></button>`,
        )
        .join('')}</div>
    </div>`);
  el.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => {
    b.onclick = () => {
      mode = b.dataset.mode as Mode;
      sv.mode = mode;
      persist();
      sfx('good');
      speak(modes.find((m) => m[0] === mode)![2]);
      renderCourses();
    };
  });
  el.querySelector<HTMLButtonElement>('#stamps')!.onclick = () => renderStamps();
  el.querySelector<HTMLButtonElement>('#who')!.onclick = () => renderProfile();
  el.querySelector<HTMLButtonElement>('#snd')!.onclick = () => void soundDialog();
  show('s-mode');
}

async function soundDialog(): Promise<void> {
  const ss = getSoundSettings();
  const a = await dialog(`🎵 おんがく：${ss.bgm ? 'ON' : 'OFF'}<br>🔔 こうかおん：${ss.sfx ? 'ON' : 'OFF'}<br>🗣️ こえ：${ss.voice ? 'ON' : 'OFF'}`, [
    { label: '🎵 きりかえ', value: 'bgm' },
    { label: '🔔 きりかえ', value: 'sfx' },
    { label: '🗣️ きりかえ', value: 'voice' },
    { label: 'とじる', value: 'x', primary: true },
  ]);
  if (a === 'x') return;
  setSoundSettings({ [a]: !ss[a as 'bgm'] });
  if (a === 'bgm' && !ss.bgm) bgm.play(MENU_SONG);
  return soundDialog();
}

// ======================= コース =======================
function renderCourses(): void {
  const el = scr('s-course');
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  el.innerHTML = rb(`
    <header class="topbar"><div class="who">${profile.icon} ${esc(profile.name)}</div><div class="chip">${{ easy: '🐣 かんたん', normal: '🚄 ふつう', hard: '🔥 むずかしい' }[mode]}</div>
      <div class="spacer"></div><button class="tb" id="back">◀ もどる</button></header>
    <div class="page">
      <h2>コースを えらぼう</h2>
      <div class="courses">${COURSES.map((c) => {
        const t = TRAIN_TYPES[c.type];
        const best = sv.best[`${c.id}:${mode}`] ?? 0;
        return `<button class="course" data-c="${c.id}">
          <span class="ttype" style="background:${t.color}">${t.name}</span>
          <span class="cname">${stName(c.from)} → ${stName(c.to)}</span>
          <span class="cinfo">とまる えき ${courseStops(c).length - 1}こ ・ むずかしさ ${'🚄'.repeat(c.level)}</span>
          ${c.note ? `<span class="cnote">${c.note}</span>` : ''}
          <span class="cbest">${best ? stars(best) : 'まだ はしっていない'}</span>
        </button>`;
      }).join('')}
      <button class="course custom" id="custom"><span class="ttype" style="background:#495057">じゆう</span><span class="cname">じぶんで えらぶ</span><span class="cinfo">れっしゃと えきを えらべるよ</span></button>
      </div>
    </div>`);
  el.querySelector<HTMLButtonElement>('#back')!.onclick = () => renderMode();
  el.querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) => {
    b.onclick = () => {
      const c = COURSES.find((x) => x.id === b.dataset.c)!;
      sfx('good');
      void startGame(c);
    };
  });
  el.querySelector<HTMLButtonElement>('#custom')!.onclick = () => void customCourse();
  show('s-course');
}

async function customCourse(): Promise<void> {
  sfx('click');
  const type = (await dialog('どの れっしゃに する？', [
    { label: '🟢 こだま（ぜんぶの えきに とまる）', value: 'kodama' },
    { label: '🟠 ひかり（おもな えきに とまる）', value: 'hikari' },
    { label: '🔴 のぞみ（はやい）', value: 'nozomi' },
    { label: 'やめる', value: 'x' },
  ])) as TrainType | 'x';
  if (type === 'x') return;
  const stops = TRAIN_TYPES[type].stops;
  const from = await dialog(
    'どこから しゅっぱつ する？',
    stops.slice(0, -1).map((i) => ({ label: stName(i), value: String(i) })),
  );
  const to = await dialog(
    'どこまで いく？',
    stops.filter((i) => i > Number(from)).map((i) => ({ label: stName(i), value: String(i) })),
  );
  const c: Course = { id: `custom-${type}-${from}-${to}`, type, from: Number(from), to: Number(to), level: 2 };
  void startGame(c);
}

// ======================= スタンプちょう =======================
function renderStamps(): void {
  sfx('click');
  const el = scr('s-stamps');
  el.innerHTML = rb(`
    <header class="topbar"><div class="who">${profile.icon} ${esc(profile.name)}</div><div class="chip">📕 ${sv.stamps.length} / ${STATIONS.length}</div>
      <div class="spacer"></div><button class="tb" id="back">◀ もどる</button></header>
    <div class="page">
      <h2>📕 えきの スタンプちょう</h2>
      <div class="hint">えきに とまると スタンプが もらえるよ</div>
      <div class="stamps">${STATIONS.map((st, i) => {
        const got = sv.stamps.includes(i);
        const col = STAMP_COLORS[i % STAMP_COLORS.length];
        return `<div class="stamp ${got ? 'got' : ''}" style="--sc:${col}"><div class="sic">${got ? STAMP_ICONS[i] : '？'}</div><div class="snm">${got ? st.yomi : '？？？'}</div><div class="skj">${got ? st.kanji : ''}</div></div>`;
      }).join('')}</div>
    </div>`);
  el.querySelector<HTMLButtonElement>('#back')!.onclick = () => renderMode();
  show('s-stamps');
}

// ======================= ゲーム =======================
interface Game {
  sim: Sim;
  world: World;
  audio: TrainAudio;
  raf: number;
  last: number;
  t: number;
  paused: boolean;
  busy: boolean; // 演出中（発車メロディなど）
  guideUntil: number;
  brakeHinted: boolean;
  announcedAuto: boolean;
  nextOncoming: number;
  pax: number;
  padPrev: boolean[];
  padAxisPrev: number;
  ended: boolean;
  handled: number;
}
let game: Game | null = null;
// テスト用の早送り（URLに ?fast=4 などを付けたときだけ）
const FAST = Math.max(1, Math.min(20, Number(new URLSearchParams(location.search).get('fast')) || 1));

function speakStation(i: number): string {
  return STATIONS[i].yomi;
}

function gaugeSvg(): string {
  const cx = 120;
  const cy = 120;
  const r = 96;
  let ticks = '';
  for (let v = 0; v <= 300; v += 10) {
    const a = ((150 + (240 * v) / 300) * Math.PI) / 180;
    const big = v % 50 === 0;
    const r1 = big ? r - 14 : r - 7;
    ticks += `<line x1="${cx + r1 * Math.cos(a)}" y1="${cy + r1 * Math.sin(a)}" x2="${cx + r * Math.cos(a)}" y2="${cy + r * Math.sin(a)}" stroke="#dfe6ee" stroke-width="${big ? 3 : 1.5}"/>`;
    if (big) ticks += `<text x="${cx + (r - 30) * Math.cos(a)}" y="${cy + (r - 30) * Math.sin(a) + 6}" fill="#dfe6ee" font-size="16" text-anchor="middle">${v}</text>`;
  }
  return `<svg viewBox="0 0 240 240" class="gsvg">
    <circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="#0b1220" stroke="#2b3a4f" stroke-width="4"/>
    ${ticks}
    <g id="atcmark"><path d="M0 0 L-9 -16 L9 -16 Z" fill="#ff922b"/></g>
    <line id="needle" x1="${cx}" y1="${cy}" x2="${cx + r - 18}" y2="${cy}" stroke="#ff4d4d" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="10" fill="#dfe6ee"/>
    <text id="spdnum" x="${cx}" y="${cy + 56}" fill="#fff" font-size="40" font-weight="700" text-anchor="middle">0</text>
    <text x="${cx}" y="${cy + 76}" fill="#9fb0c4" font-size="14" text-anchor="middle">km/h</text>
  </svg>`;
}

async function startGame(c: Course): Promise<void> {
  bgm.stop();
  const el = scr('s-game');
  const easy = mode === 'easy';
  el.innerHTML = rb(`
    <canvas id="view"></canvas>
    <div class="cab"></div>
    <div class="hud-tl" id="tt"></div>
    <div class="guide" id="guide"></div>
    <div class="resultpop" id="pop"></div>
    <div class="board" id="board"></div>
    <button class="pausebtn" id="pause">⏸</button>
    <div class="dash ${easy ? 'easy' : ''}">
      <div class="gauge">
        <div class="atcbox"><span>ATC</span><b id="atc">0</b></div>
        ${gaugeSvg()}
      </div>
      <div class="center">
        <div class="nextst"><span class="lbl">つぎは</span><b id="nextname"></b><span class="dside" id="dside"></span></div>
        <div class="dist" id="dist"></div>
        <div class="meter" id="meter"><div class="mtrack"><div class="mtrain" id="mtrain">🚄</div><div class="mflag">🚩</div></div></div>
        <div class="clock" id="clock"></div>
      </div>
      <div class="ctrl">
        ${
          easy
            ? `<button class="ebtn go" id="ego">すすむ<small>▲</small></button><button class="ebtn stop" id="estop">とまる<small>▼</small></button>`
            : `<div class="lever" id="lever">${Array.from({ length: NOTCH_MAX - NOTCH_MIN + 1 }, (_, i) => NOTCH_MAX - i)
                .map((n) => `<button class="notch ${n > 0 ? 'p' : n < 0 ? 'b' : 'n'} ${n === -8 ? 'eb' : ''}" data-n="${n}">${notchLabel(n)}</button>`)
                .join('')}</div>`
        }
        <div class="sidebtns">
          <button class="sbtn" id="door">🚪<span>ドア</span></button>
          <button class="sbtn" id="ann">📢<span>アナウンス</span></button>
          <button class="sbtn" id="horn">📯<span>けいてき</span></button>
        </div>
      </div>
    </div>
    <div class="loading" id="loading">じゅんびちゅう…</div>`);
  show('s-game');
  await wait(30);
  const canvas = el.querySelector<HTMLCanvasElement>('#view')!;
  const world = new World(canvas);
  const sim = new Sim(c, mode);
  const audio = new TrainAudio();
  world.prebuild(sim.s);
  game = {
    sim,
    world,
    audio,
    raf: 0,
    last: performance.now(),
    t: 0,
    paused: false,
    busy: false,
    guideUntil: 0,
    brakeHinted: false,
    announcedAuto: false,
    nextOncoming: 40 + Math.random() * 40,
    pax: 0,
    padPrev: [],
    padAxisPrev: 0,
    ended: false,
    handled: 0,
  };
  const resize = () => world.resize(canvas.clientWidth, canvas.clientHeight);
  resize();
  window.onresize = resize;
  el.querySelector('#loading')?.remove();
  audio.start();

  sim.onAtcChange = (lim) => {
    if (sim.phase === 'running') {
      atcBell();
      const box = document.querySelector('.atcbox');
      box?.classList.remove('flash');
      void (box as HTMLElement | null)?.offsetWidth;
      box?.classList.add('flash');
      if (mode === 'normal' && game && sim.kmh > lim + 1 && game.t > game.guideUntil) guide(`ATC ${lim}！ ブレーキで スピードを おとそう`, 2000);
    }
  };
  sim.onOverspeed = () => {
    overspeedAlarm();
    guide('ATC ブレーキ！ スピードの だしすぎ', 2500);
  };
  sim.onShortStop = () => {
    guide('もうすこし まえへ すすもう', 3000, mode === 'easy');
    if (game) game.brakeHinted = false;
  };
  bindControls();
  const startSt = sim.stops[0];
  guide(`${STATIONS[startSt].yomi} から しゅっぱつ！`, 2500);
  speak(`${speakStation(startSt)}から、${speakStation(sim.stops[sim.stops.length - 1])}ゆきの うんてんを はじめます。`);
  game.pax = 40 + STATIONS[startSt].size * 60;
  loop();
  await wait(2500);
  void beginBoarding(true);
}

function guide(text: string, ms = 2500, voice = false): void {
  if (!game) return;
  const g = document.getElementById('guide');
  if (!g) return;
  g.innerHTML = rb(text);
  g.classList.add('on');
  game.guideUntil = game.t + ms / 1000;
  if (voice) speak(text.replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2'));
}

// 乗り降り → ドアを閉める → 発車
async function beginBoarding(first: boolean): Promise<void> {
  if (!game) return;
  const g = game;
  const sim = g.sim;
  const st = first ? sim.stops[0] : sim.stops[sim.next];
  const board = document.getElementById('board')!;
  const on = first ? g.pax : Math.round(20 + STATIONS[st].size * (30 + Math.random() * 50));
  const off = first ? 0 : Math.min(g.pax - 10, Math.round(10 + STATIONS[st].size * (20 + Math.random() * 40)));
  board.innerHTML = rb(`<div class="btrain">${'<span class="bdoor"></span>'.repeat(6)}</div>
    <div class="bpeople">${'🧑🏻👩🏽🧒🏻👴🏼👩🏻‍🦰🧑🏽‍💼👧🏻🧓🏽'.repeat(2)}</div>
    <div class="btext">${first ? 'おきゃくさんが のっているよ' : `のる ${on}にん ／ おりる ${off}にん`}</div>`);
  board.classList.add('on');
  g.busy = true;
  g.world.setPeople(st, 1);
  for (let i = 1; i <= 10; i++) {
    await wait(450);
    if (!game) return;
    g.world.setPeople(st, 1 - i / 10);
  }
  g.pax = first ? on : g.pax + on - off;
  board.classList.remove('on');
  g.busy = false;
  if (mode === 'easy') {
    await wait(600);
    closeDoors();
  } else {
    guide('ドアを しめよう（🚪ボタン ／ Dキー）', 4000);
    document.getElementById('door')?.classList.add('blink');
  }
}

function closeDoors(): void {
  if (!game) return;
  const sim = game.sim;
  if (game.busy) return;
  if (!sim.closeDoors()) return;
  document.getElementById('door')?.classList.remove('blink');
  doorCloseSound();
  void departSequence();
}

async function departSequence(): Promise<void> {
  if (!game) return;
  const g = game;
  g.busy = true;
  await wait(1400);
  const len = departMelody();
  guide('🎵 はっしゃ メロディ', len * 1000);
  await wait(len * 1000);
  if (!game) return;
  speak('しゅっぱつ しんこう！');
  await wait(1200);
  g.sim.depart();
  g.busy = false;
  g.brakeHinted = false;
  g.announcedAuto = false;
  if (mode === 'easy') guide('「すすむ」を おしてね！', 3500, true);
  else guide('レバーを ↑ で かそく！', 3500);
}

function openDoors(): void {
  if (!game) return;
  const g = game;
  const sim = g.sim;
  if (sim.kmh > 0.01) {
    guide('とまってから あけてね', 1800);
    return;
  }
  if (!sim.openDoors()) return;
  document.getElementById('door')?.classList.remove('blink');
  doorOpenChime();
  const st = sim.records[sim.records.length - 1].station;
  if (!sv.stamps.includes(st)) {
    sv.stamps.push(st);
    persist();
    setTimeout(() => guide(`📕 スタンプ ゲット！「${STATIONS[st].yomi}」`, 2500, false), 1200);
  }
  if (sim.phase === 'done') {
    void finishRun();
  } else {
    void beginBoarding(false);
  }
}

function doAnnounce(manual: boolean): void {
  if (!game) return;
  const sim = game.sim;
  const st = sim.nextStation();
  if (st == null) return;
  if (manual && !sim.canAnnounce()) {
    if (sim.phase === 'running') guide('いまは アナウンスの じかんじゃ ないよ', 1500);
    return;
  }
  sim.announce();
  document.getElementById('ann')?.classList.remove('blink');
  const len = announceChime();
  const side = STATIONS[st].side === 'left' ? 'ひだりがわ' : 'みぎがわ';
  const last = sim.isLast() ? 'しゅうてんの ' : '';
  setTimeout(() => speak(`まもなく、${last}${speakStation(st)}です。おでぐちは、${side}です。`, 0.95), len * 1000);
}

function bindControls(): void {
  const el = scr('s-game');
  const g = game!;
  const sim = g.sim;
  if (mode === 'easy') {
    const hold = (id: string, set: (v: boolean) => void) => {
      const b = el.querySelector<HTMLButtonElement>(id)!;
      const down = (e: Event) => {
        e.preventDefault();
        set(true);
        b.classList.add('down');
      };
      const up = () => {
        set(false);
        b.classList.remove('down');
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
    };
    hold('#ego', (v) => (sim.easyGo = v));
    hold('#estop', (v) => (sim.easyStop = v));
  } else {
    el.querySelectorAll<HTMLButtonElement>('.notch').forEach((b) => {
      b.onclick = () => setNotch(Number(b.dataset.n));
    });
  }
  el.querySelector<HTMLButtonElement>('#door')!.onclick = () => toggleDoor();
  el.querySelector<HTMLButtonElement>('#ann')!.onclick = () => doAnnounce(true);
  el.querySelector<HTMLButtonElement>('#horn')!.onclick = () => horn();
  el.querySelector<HTMLButtonElement>('#pause')!.onclick = () => void pauseMenu();
  window.onkeydown = (e) => {
    if (!game || game.paused) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') {
      e.preventDefault();
      if (mode === 'easy') {
        sim.easyGo = true;
        el.querySelector('#ego')?.classList.add('down');
      } else if (!e.repeat) setNotch(sim.notch + 1);
    } else if (k === 'arrowdown' || k === 's') {
      e.preventDefault();
      if (mode === 'easy') {
        sim.easyStop = true;
        el.querySelector('#estop')?.classList.add('down');
      } else if (!e.repeat) setNotch(sim.notch - 1);
    } else if (k === 'd' && !e.repeat) toggleDoor();
    else if (k === 'a' && !e.repeat) doAnnounce(true);
    else if ((k === ' ' || k === 'h') && !e.repeat) {
      e.preventDefault();
      horn();
    } else if (k === 'escape' || k === 'p') void pauseMenu();
  };
  window.onkeyup = (e) => {
    if (!game) return;
    const k = e.key.toLowerCase();
    if (mode === 'easy') {
      if (k === 'arrowup' || k === 'w') {
        sim.easyGo = false;
        el.querySelector('#ego')?.classList.remove('down');
      }
      if (k === 'arrowdown' || k === 's') {
        sim.easyStop = false;
        el.querySelector('#estop')?.classList.remove('down');
      }
    }
  };
}

function setNotch(n: number): void {
  if (!game) return;
  const sim = game.sim;
  const before = sim.notch;
  sim.setNotch(n);
  if (sim.notch !== before) sfx('click');
  if (sim.notch > 0 && sim.doorsOpen) guide('ドアが あいているよ', 1500);
}

function toggleDoor(): void {
  if (!game) return;
  const sim = game.sim;
  if (sim.phase === 'arrived') openDoors();
  else if (sim.phase === 'boarding') closeDoors();
  else if (sim.phase === 'running' && sim.kmh > 0.5) guide('はしっている あいだは あけられないよ', 1500);
}

function pollGamepad(): void {
  if (!game || !navigator.getGamepads) return;
  const g = game;
  const sim = g.sim;
  const pads = navigator.getGamepads().filter((p): p is Gamepad => !!p);
  if (!pads.length) return;
  const pad = pads[0];
  const btn = (i: number) => !!pad.buttons[i]?.pressed;
  const edge = (i: number) => btn(i) && !g.padPrev[i];
  const ay = pad.axes[1] ?? 0;
  if (mode === 'easy') {
    sim.easyGo = btn(0) || btn(12) || btn(7) || ay < -0.5;
    sim.easyStop = btn(1) || btn(13) || btn(6) || ay > 0.5;
    document.getElementById('ego')?.classList.toggle('down', sim.easyGo);
    document.getElementById('estop')?.classList.toggle('down', sim.easyStop);
    if (edge(2)) toggleDoor();
    if (edge(3)) horn();
  } else {
    if (edge(12)) setNotch(sim.notch + 1);
    if (edge(13)) setNotch(sim.notch - 1);
    const axisDir = ay < -0.6 ? -1 : ay > 0.6 ? 1 : 0;
    if (axisDir !== g.padAxisPrev && axisDir !== 0) setNotch(sim.notch - axisDir);
    g.padAxisPrev = axisDir;
    if (edge(0)) toggleDoor();
    if (edge(1)) horn();
    if (edge(2)) doAnnounce(true);
  }
  if (edge(9)) void pauseMenu();
  g.padPrev = pad.buttons.map((b) => b.pressed);
}

function loop(): void {
  if (!game) return;
  const g = game;
  const now = performance.now();
  const dt = Math.min(0.05, (now - g.last) / 1000);
  g.last = now;
  g.raf = requestAnimationFrame(loop);
  if (g.paused) return;
  g.t += dt;
  pollGamepad();
  const sim = g.sim;
  const steps = 4 * FAST;
  for (let i = 0; i < steps; i++) sim.update(dt / 4);
  // 到着したら
  if (sim.phase === 'arrived' && sim.records.length > g.handled) {
    g.handled = sim.records.length;
    onArrive();
  }
  // 案内
  if (sim.phase === 'running') {
    const d = sim.distToStop();
    const v = sim.kmh / 3.6;
    if (mode === 'easy' && !g.announcedAuto && d < 3200) {
      g.announcedAuto = true;
      doAnnounce(false);
    }
    if (mode === 'normal' && sim.canAnnounce()) document.getElementById('ann')?.classList.add('blink');
    const decel = (mode === 'easy' ? 3.0 : 2.4) / 3.6;
    const brakeDist = (v * v) / (2 * decel);
    if (!g.brakeHinted && mode !== 'hard' && sim.kmh > 8 && d < brakeDist * 1.2 + 40) {
      g.brakeHinted = true;
      if (mode === 'easy') guide('「とまる」を おして！', 4000, true);
      else guide('そろそろ ブレーキ！', 3000, true);
    }
    // すれちがい
    g.nextOncoming -= dt;
    if (g.nextOncoming <= 0 && sim.kmh > 80 && !inTunnel(sim.s) && !STATION_POS.some((p) => Math.abs(p - sim.s) < 3000)) {
      g.world.spawnOncoming(sim.s);
      const meet = 2600 / (75 + v);
      setTimeout(() => whoosh(), Math.max(0, meet - 0.6) * 1000);
      g.nextOncoming = 70 + Math.random() * 80;
    }
  }
  g.world.update(sim.s, dt, sim.kmh, g.t);
  g.audio.update(sim.kmh, sim.notch, g.world.inTunnel);
  (window as unknown as { __inTunnel: boolean }).__inTunnel = g.world.inTunnel;
  updateHud();
}

function updateHud(): void {
  if (!game) return;
  const g = game;
  const sim = g.sim;
  const $ = (id: string) => document.getElementById(id);
  const kmh = sim.kmh;
  const ang = 150 + (240 * Math.min(300, kmh)) / 300;
  $('needle')?.setAttribute('transform', `rotate(${ang} 120 120)`);
  const sp = $('spdnum');
  if (sp) sp.textContent = String(Math.round(kmh));
  const lim = sim.phase === 'running' ? sim.atcLimit : 0;
  const la = ((150 + (240 * lim) / 300) * Math.PI) / 180;
  $('atcmark')?.setAttribute('transform', `translate(${120 + 108 * Math.cos(la)} ${120 + 108 * Math.sin(la)}) rotate(${(la * 180) / Math.PI + 90})`);
  const atc = $('atc');
  if (atc) {
    atc.textContent = sim.phase === 'running' ? String(lim) : '—';
    atc.parentElement!.classList.toggle('warn', sim.atcBraking);
  }
  const st = sim.nextStation();
  const nn = $('nextname');
  if (nn && st != null) {
    const html = rb(stName(st));
    if (nn.dataset.st !== String(st)) {
      nn.innerHTML = html;
      nn.dataset.st = String(st);
      const ds = $('dside');
      if (ds) ds.textContent = sim.isLast() ? 'しゅうてん' : '';
    }
  }
  const d = sim.distToStop();
  const dist = $('dist');
  if (dist) {
    let txt = '';
    if (sim.phase === 'running') {
      const showDist = mode !== 'hard' || d < 300;
      if (showDist) txt = d >= 1000 ? `あと ${(d / 1000).toFixed(1)} km` : d >= 50 ? `あと ${Math.round(d)} m` : `あと ${d.toFixed(1)} m`;
    } else if (sim.phase === 'boarding' || sim.phase === 'ready') txt = 'えきに とまっているよ';
    dist.textContent = txt;
  }
  const meter = $('meter');
  if (meter) {
    const show = sim.phase === 'running' && d < (mode === 'easy' ? 1500 : 600) && (mode !== 'hard' || d < 200);
    meter.classList.toggle('on', show);
    if (show) {
      const range = mode === 'easy' ? 1500 : 600;
      const pct = Math.max(0, Math.min(100, 100 - (d / range) * 100));
      const mt = $('mtrain');
      if (mt) mt.style.left = `calc(${pct * 0.86}% )`;
    }
  }
  const clock = $('clock');
  if (clock) {
    if (mode === 'easy') clock.textContent = `🧑‍🤝‍🧑 のっている ひと ${g.pax}にん`;
    else {
      const k = Math.min(sim.next, sim.schedule.length - 1);
      const sched = sim.phase === 'running' ? sim.schedule[k].arr : sim.schedule[Math.max(0, sim.records.length)]?.dep ?? 0;
      const label = sim.phase === 'running' ? 'とうちゃく よてい' : 'しゅっぱつ よてい';
      clock.textContent = `🕙 ${fmtClock(sim.time, mode === 'hard')}　${label} ${fmtClock(sched, mode === 'hard')}`;
    }
  }
  if (mode !== 'easy') {
    document.querySelectorAll<HTMLElement>('.notch').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) === sim.notch));
  }
  const tt = $('tt');
  if (tt && mode !== 'easy' && tt.dataset.v !== `${sim.next}:${sim.records.length}`) {
    tt.dataset.v = `${sim.next}:${sim.records.length}`;
    tt.innerHTML = rb(
      `<b>${TRAIN_TYPES[sim.course.type].name}</b> じこくひょう<br>` +
        sim.stops
          .map((s, i) => {
            const done = i < sim.records.length + 1 && i <= sim.next - (sim.phase === 'running' ? 1 : 0);
            const sch = sim.schedule[i];
            return `<span class="${done ? 'done' : i === sim.next ? 'cur' : ''}">${STATIONS[s].yomi}　${i === 0 ? '' : fmtClock(sch.arr, mode === 'hard') + 'ちゃく'}</span>`;
          })
          .join('<br>'),
    );
  }
  const gd = $('guide');
  if (gd && gd.classList.contains('on') && g.t > g.guideUntil) gd.classList.remove('on');
}

function onArrive(): void {
  if (!game) return;
  const g = game;
  const sim = g.sim;
  const r = sim.records[sim.records.length - 1];
  const pop = document.getElementById('pop')!;
  const stars = r.score >= 85 ? 3 : r.score >= 60 ? 2 : 1;
  const diffTxt = Math.abs(r.diff) < 0.05 ? 'ぴったり 0.0m' : `${r.diff > 0 ? 'てまえ' : 'いきすぎ'} ${Math.abs(r.diff).toFixed(1)}m`;
  let timeTxt = '';
  if (r.timeDiff != null) timeTxt = Math.abs(r.timeDiff) <= 5 ? 'じかん ぴったり！' : r.timeDiff > 0 ? `${r.timeDiff}びょう おくれ` : `${-r.timeDiff}びょう はやい`;
  pop.innerHTML = rb(`<div class="plabel">${r.stopLabel}</div><div class="pstars">${'⭐'.repeat(stars)}</div><div>${diffTxt}</div>${timeTxt ? `<div>${timeTxt}</div>` : ''}`);
  pop.classList.add('on');
  sfx(stars >= 3 ? 'win' : stars === 2 ? 'good' : 'click');
  speak(r.stopLabel.replace('…', ''));
  setTimeout(() => pop.classList.remove('on'), 3200);
  g.busy = true;
  setTimeout(() => {
    if (!game) return;
    g.busy = false;
    if (mode === 'easy') openDoors();
    else {
      guide('ドアを あけよう（🚪ボタン ／ Dキー）', 4000);
      document.getElementById('door')?.classList.add('blink');
    }
  }, 2200);
}

async function finishRun(): Promise<void> {
  if (!game) return;
  const g = game;
  g.ended = true;
  const sim = g.sim;
  await wait(2500);
  speak('ごじょうしゃ ありがとうございました。');
  await wait(1500);
  const res = sim.totalScore();
  const k = `${sim.course.id}:${mode}`;
  sv.best[k] = Math.max(sv.best[k] ?? 0, res.stars);
  sv.totalStars += res.stars;
  sv.runs++;
  persist();
  const records = sim.records;
  endGame();
  const el = scr('s-result');
  el.innerHTML = rb(`
    <div class="page">
      <h2>うんてん おつかれさま！</h2>
      <div class="bigstars">${'⭐'.repeat(res.stars)}${'☆'.repeat(3 - res.stars)}</div>
      <div class="score">てんすう ${res.avg} てん</div>
      <table class="rtable"><tr><th>えき</th><th>とまった ところ</th>${mode !== 'easy' ? '<th>じかん</th><th>ATC</th><th>アナウンス</th>' : ''}<th>てん</th></tr>
      ${records
        .map(
          (r) => `<tr><td>${STATIONS[r.station].yomi}</td><td>${r.stopLabel} ${Math.abs(r.diff).toFixed(1)}m</td>${
            mode !== 'easy'
              ? `<td>${r.timeDiff == null ? '-' : Math.abs(r.timeDiff) <= 5 ? 'ぴったり' : r.timeDiff > 0 ? `${r.timeDiff}びょう おくれ` : `${-r.timeDiff}びょう はやい`}</td><td>${r.atc ? `⚠️${r.atc}かい` : '✅'}</td><td>${r.announced ? '✅' : '—'}</td>`
              : ''
          }<td>${r.score}</td></tr>`,
        )
        .join('')}</table>
      <div class="rank">⭐ ぜんぶで ${sv.totalStars}こ ・ ${rankName(sv.totalStars)}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center">
        <button class="btn primary" id="again">もういちど</button>
        <button class="btn" id="courses">コースを えらぶ</button>
        <button class="btn" id="stamps">📕 スタンプちょう</button>
      </div>
    </div>`);
  const course = sim.course;
  el.querySelector<HTMLButtonElement>('#again')!.onclick = () => void startGame(course);
  el.querySelector<HTMLButtonElement>('#courses')!.onclick = () => renderCourses();
  el.querySelector<HTMLButtonElement>('#stamps')!.onclick = () => renderStamps();
  show('s-result');
  sfx('levelup');
  speak(`ほしが ${res.stars}こ！ よく がんばったね！`);
}

function endGame(): void {
  if (!game) return;
  cancelAnimationFrame(game.raf);
  game.audio.stop();
  game.world.dispose();
  window.onkeydown = null;
  window.onkeyup = null;
  window.onresize = null;
  game = null;
  bgm.play(MENU_SONG);
}

async function pauseMenu(): Promise<void> {
  if (!game || game.paused) return;
  game.paused = true;
  game.audio.update(0, 0, false);
  const a = await dialog('⏸ ちょっと やすみ', [
    { label: 'つづける', value: 'go', primary: true },
    { label: 'やめて コースを えらぶ', value: 'quit' },
  ]);
  if (!game) return;
  if (a === 'quit') {
    endGame();
    renderCourses();
    return;
  }
  game.paused = false;
  game.last = performance.now();
}

renderTitle();
