// 新幹線うんてんし：画面・操作・ゲームの流れ
import * as THREE from 'three';
import { PROFILE_CSS, renderProfilePicker, type Profile } from '../common/profiles';
import { COMMON_CSS, dialog, sleep as wait } from '../common/ui';
import { bindFullscreen, fullscreenButton, markPortraitAllowed, registerSW } from '../common/pwa';
import { esc, rb } from '../common/text';
import { bgm, getSoundSettings, setSoundSettings, sfx, speak, unlockAudio, type Song } from '../common/sound';
import { load, save } from '../common/storage';
import { COURSES, STATIONS, STATION_POS, TRAIN_TYPES, courseStops, inTunnel, type Course, type TrainType } from './data';
import { BRAKE_MAX, POWER_MAX, Sim, brakeLabel, fmtClock, powerLabel, type Mode } from './sim';
import { World } from './world';
import { TrainAudio, announceChime, atcBell, departMelody, doorCloseSound, doorOpenChime, horn, overspeedAlarm, whoosh } from './audio';

// 1かいの うんてんは 15ふん いないで おわる（コースえらび・けっかを いれて）。うんてんは この じかんまで。
const MAX_DRIVE_SEC = 13.5 * 60;
const driveMin = (c: Course) => Math.max(1, Math.round(new Sim(c, 'normal').wallEstimate / 60));

// スマホ（ゆびで そうさ）かどうか。あんないの ことばを かえる
const TOUCH = window.matchMedia('(pointer: coarse)').matches;

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
    <button class="btn primary big" id="start">はじめる</button>
    <a href="index.html" style="color:#d0ebff;font-size:16px">◀ ほかの ゲーム</a>${fullscreenButton()}`;
  bindFullscreen(el);
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
    ['easy', '🐣', 'かんたん', 'こえで おしえてくれるよ。スピードの だしすぎも じどうで まもってくれる'],
    ['normal', '🚄', 'ふつう', 'じこくひょうと ATCを まもって うんてんしよう'],
    ['hard', '🔥', 'むずかしい', 'ひょうじが すくなくて、はんていも きびしい'],
  ];
  el.innerHTML = rb(`
    <header class="topbar"><div class="who">${profile.icon} ${esc(profile.name)}</div>
      <div class="chip">⭐ ${sv.totalStars}　${rankName(sv.totalStars)}</div><div class="spacer"></div>
      <button class="tb" id="stamps">📕 スタンプちょう</button><button class="tb" id="snd">🔊 おと</button><button class="tb" id="who">👥 かわる</button></header>
    <div class="page">
      <h2>どの モードで うんてんする？</h2>
      <div class="modes">${modes
        .map(([m, ic, name, desc]) => `<button class="modecard ${m}" data-mode="${m}"><span class="mic">${ic}</span><span class="mname">${name}</span><span class="mdesc">${desc}</span></button>`)
        .join('')}</div>
      <div class="keyhelp">
        <div><b>アクセル</b>（ひだりて）　<kbd>W</kbd> つよく　<kbd>S</kbd> よわく</div>
        <div><b>ブレーキ</b>（みぎて）　<kbd>↓</kbd> つよく　<kbd>↑</kbd> ゆるめる</div>
        <div><kbd>D</kbd> ドア　<kbd>A</kbd> アナウンス　<kbd>スペース</kbd> けいてき</div>
      </div>
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
          <span class="cinfo">とまる えき ${courseStops(c).length - 1}こ ・ やく ${driveMin(c)}ぷん ・ むずかしさ ${'🚄'.repeat(c.level)}</span>
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
      sfx('good');
      void startGame(COURSES.find((x) => x.id === b.dataset.c)!);
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
  const from = await dialog('どこから しゅっぱつ する？', stops.slice(0, -1).map((i) => ({ label: stName(i), value: String(i) })));
  // 15ふんで おわる えきまで（とおすぎる えきは だせない）
  const mk = (i: number): Course => ({ id: `custom-${type}-${from}-${i}`, type, from: Number(from), to: i, level: 2 });
  const reach = stops.filter((i) => i > Number(from) && new Sim(mk(i), 'normal').wallEstimate <= MAX_DRIVE_SEC);
  const to = await dialog('どこまで いく？<br><small>15ふんで いける えきまで だよ</small>', reach.map((i) => ({ label: `${stName(i)}（やく ${driveMin(mk(i))}ぷん）`, value: String(i) })));
  void startGame({ id: `custom-${type}-${from}-${to}`, type, from: Number(from), to: Number(to), level: 2 });
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
        return `<div class="stamp ${got ? 'got' : ''}" style="--sc:${STAMP_COLORS[i % STAMP_COLORS.length]}"><div class="sic">${got ? STAMP_ICONS[i] : '？'}</div><div class="snm">${got ? st.yomi : '？？？'}</div><div class="skj">${got ? st.kanji : ''}</div></div>`;
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
  timer: THREE.Timer;
  t: number;
  perfSum: number;
  perfN: number;
  paused: boolean;
  busy: boolean;
  guideUntil: number;
  brakeHinted: boolean;
  powerHinted: boolean;
  releaseHinted: boolean;
  announcedAuto: boolean;
  nextOncoming: number;
  pax: number;
  padPrev: boolean[];
  padTrig: [number, number];
  ended: boolean;
  handled: number;
}
let game: Game | null = null;
// テスト用の早送り（URLに ?fast=4 などを付けたときだけ）
const FAST = Math.max(1, Math.min(20, Number(new URLSearchParams(location.search).get('fast')) || 1));
// テスト用：?hq=1 なら、重くても影を切らない
const FORCE_HQ = new URLSearchParams(location.search).get('hq') === '1';

function gaugeSvg(): string {
  const cx = 120;
  const cy = 120;
  const r = 96;
  let ticks = '';
  for (let v = 0; v <= 300; v += 10) {
    const a = ((150 + (240 * v) / 300) * Math.PI) / 180;
    const big = v % 50 === 0;
    const r1 = big ? r - 14 : r - 7;
    ticks += `<line x1="${cx + r1 * Math.cos(a)}" y1="${cy + r1 * Math.sin(a)}" x2="${cx + r * Math.cos(a)}" y2="${cy + r * Math.sin(a)}" stroke="#e9eef5" stroke-width="${big ? 3 : 1.5}"/>`;
    if (big) ticks += `<text x="${cx + (r - 30) * Math.cos(a)}" y="${cy + (r - 30) * Math.sin(a) + 6}" fill="#e9eef5" font-size="16" text-anchor="middle">${v}</text>`;
  }
  // ATCの信号灯（速度計のまわりに並ぶ）
  let lamps = '';
  for (const v of [30, 70, 110, 160, 210, 230, 255, 270, 285]) {
    const a = ((150 + (240 * v) / 300) * Math.PI) / 180;
    lamps += `<circle class="atclamp" data-v="${v}" cx="${cx + (r + 12) * Math.cos(a)}" cy="${cy + (r + 12) * Math.sin(a)}" r="5"/>`;
  }
  return `<svg viewBox="-4 -4 248 248" class="gsvg">
    <circle cx="${cx}" cy="${cy}" r="${r + 20}" fill="#1b222c" stroke="#3b4757" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="#0a0f16"/>
    ${ticks}${lamps}
    <line id="needle" x1="${cx}" y1="${cy}" x2="${cx + r - 18}" y2="${cy}" stroke="#ff5a4d" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="10" fill="#d9e1ea"/>
    <text id="spdnum" x="${cx}" y="${cy + 54}" fill="#fff" font-size="38" font-weight="700" text-anchor="middle">0</text>
    <text x="${cx}" y="${cy + 74}" fill="#9fb0c4" font-size="13" text-anchor="middle">km/h</text>
  </svg>`;
}

function leverHtml(kind: 'power' | 'brake'): string {
  const rows =
    kind === 'power'
      ? Array.from({ length: POWER_MAX + 1 }, (_, i) => POWER_MAX - i).map((n) => [n, powerLabel(n)] as const)
      : Array.from({ length: BRAKE_MAX + 1 }, (_, i) => i).map((n) => [n, brakeLabel(n)] as const);
  return `<div class="lever ${kind}" id="${kind}-lever">
    <div class="slot"></div>
    <div class="handle" id="${kind}-handle"><span></span></div>
    ${rows.map(([n, l]) => `<button class="nl ${kind === 'brake' && n === BRAKE_MAX ? 'eb' : ''}" data-${kind}="${n}">${l}</button>`).join('')}
  </div>`;
}

async function startGame(c: Course): Promise<void> {
  bgm.stop();
  const el = scr('s-game');
  el.innerHTML = rb(`
    <canvas id="view"></canvas>
    <div class="cab"></div>
    <div class="hud-tl" id="tt"></div>
    <div class="guide" id="guide"></div>
    <div class="ffbadge" id="ff">⏩ はやおくり</div>
    <div class="resultpop" id="pop"></div>
    <div class="board" id="board"></div>
    <button class="pausebtn" id="pause" aria-label="ちょっと やすむ">⏸</button>
    <div class="desk">
      <div class="lw">
        <div class="lt">アクセル</div>
        ${leverHtml('power')}
        <div class="kh"><kbd>W</kbd> つよく<br><kbd>S</kbd> よわく</div>
      </div>
      <div class="mon">
        <div class="mrow"><span class="ml">つぎは</span><b id="nextname"></b><span class="dside" id="dside"></span></div>
        <div class="dist" id="dist"></div>
        <div class="meter" id="meter"><div class="mtrack"><div class="mtrain" id="mtrain">🚄</div><div class="mflag">🚩</div></div></div>
        <div class="clock" id="clock"></div>
      </div>
      <div class="gauge">
        <div class="atcbox"><span>ATC</span><b id="atc">—</b></div>
        ${gaugeSvg()}
      </div>
      <div class="mon right">
        <div class="lamps">
          <span class="lamp" id="lamp-door">とびら</span>
          <span class="lamp" id="lamp-atc">ATC</span>
          <span class="lamp" id="lamp-brake">ブレーキ</span>
        </div>
        <div class="notchinfo"><span>アクセル <b id="pinfo">きる</b></span><span>ブレーキ <b id="binfo">B7</b></span></div>
        <div class="sbtns">
          <button class="sbtn" id="door">🚪<span>ドア</span></button>
          <button class="sbtn" id="ann">📢<span>アナウンス</span></button>
          <button class="sbtn" id="horn">📯<span>けいてき</span></button>
        </div>
      </div>
      <div class="lw">
        <div class="lt">ブレーキ</div>
        ${leverHtml('brake')}
        <div class="kh"><kbd>↓</kbd> つよく<br><kbd>↑</kbd> ゆるめる</div>
      </div>
    </div>
    <div class="loading" id="loading">じゅんびちゅう…</div>`);
  show('s-game');
  shownNotch.power = -1;
  shownNotch.brake = -1;
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
    timer: new THREE.Timer(),
    t: 0,
    perfSum: 0,
    perfN: 0,
    paused: false,
    busy: false,
    guideUntil: 0,
    brakeHinted: false,
    powerHinted: false,
    releaseHinted: false,
    announcedAuto: false,
    nextOncoming: 40 + Math.random() * 40,
    pax: 0,
    padPrev: [],
    padTrig: [0, 0],
    ended: false,
    handled: 0,
  };
  const resize = () => world.resize(canvas.clientWidth, canvas.clientHeight);
  resize();
  window.onresize = resize;
  el.querySelector('#loading')?.remove();
  audio.start();

  sim.onAtcChange = (lim) => {
    if (sim.phase !== 'running') return;
    atcBell();
    const box = document.querySelector('.atcbox');
    box?.classList.remove('flash');
    void (box as HTMLElement | null)?.offsetWidth;
    box?.classList.add('flash');
    if (mode === 'normal' && game && sim.kmh > lim + 1 && game.t > game.guideUntil) guide(`ATC ${lim}！ ブレーキで スピードを おとそう`, 2000);
  };
  sim.onOverspeed = () => {
    overspeedAlarm();
    guide('ATC ブレーキ！ スピードの だしすぎ', 2500);
  };
  sim.onShortStop = () => {
    guide('もうすこし まえへ（ブレーキを ゆるめて アクセル）', 3500, mode === 'easy');
    if (game) game.brakeHinted = false;
  };
  bindControls();
  const startSt = sim.stops[0];
  guide(`${STATIONS[startSt].yomi} から しゅっぱつ！`, 2500);
  speak(`${STATIONS[startSt].yomi}から、${STATIONS[sim.stops[sim.stops.length - 1]].yomi}ゆきの うんてんを はじめます。`);
  game.pax = 40 + STATIONS[startSt].size * 60;
  game.timer.connect(document);
  (window as unknown as { renderer: unknown }).renderer = world.renderer;
  world.renderer.setAnimationLoop(loop);
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
  if (voice) speak(text.replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2').replace(/（.*?）/g, ''));
}

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
    guide(TOUCH ? 'ドアを しめよう（🚪ボタン）' : 'ドアを しめよう（🚪ボタン ／ Dキー）', 4000);
    document.getElementById('door')?.classList.add('blink');
  }
}

function closeDoors(): void {
  if (!game || game.busy) return;
  if (!game.sim.closeDoors()) return;
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
  g.powerHinted = false;
  g.releaseHinted = false;
  g.announcedAuto = false;
  if (mode === 'easy') {
    g.sim.setBrake(0);
    guide(TOUCH ? 'アクセルを うえに あげよう！' : 'W キーで アクセルを いれよう！', 4000, true);
  } else {
    guide('↑で ブレーキを ゆるめて、W で アクセル！', 4000);
  }
}

function openDoors(): void {
  if (!game) return;
  const sim = game.sim;
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
    setTimeout(() => guide(`📕 スタンプ ゲット！「${STATIONS[st].yomi}」`, 2500), 1200);
  }
  if (sim.phase === 'done') void finishRun();
  else void beginBoarding(false);
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
  setTimeout(() => speak(`まもなく、${last}${STATIONS[st].yomi}です。おでぐちは、${side}です。`, 0.95), len * 1000);
}

function setPower(n: number): void {
  if (!game) return;
  const sim = game.sim;
  const before = sim.power;
  sim.setPower(n);
  if (sim.power !== before) sfx('click');
  if (sim.power > 0 && sim.doorsOpen) guide('ドアが あいているよ', 1500);
}

function setBrake(n: number): void {
  if (!game) return;
  const sim = game.sim;
  const before = sim.brake;
  sim.setBrake(n);
  if (sim.brake !== before) sfx('click');
}

function toggleDoor(): void {
  if (!game) return;
  const sim = game.sim;
  if (sim.phase === 'arrived') openDoors();
  else if (sim.phase === 'boarding') closeDoors();
  else if (sim.phase === 'running' && sim.kmh > 0.5) guide('はしっている あいだは あけられないよ', 1500);
}

// 操作は「アクション名」で扱い、キーの割り当ては表にしておく。
// e.code（キーの物理的な位置）で読むので、日本語入力がONでも同じように効く。
type Action = 'powerUp' | 'powerDown' | 'brakeUp' | 'brakeDown' | 'door' | 'announce' | 'horn' | 'pause';
const KEY_BINDINGS: Record<Action, string[]> = {
  powerUp: ['KeyW'],
  powerDown: ['KeyS'],
  brakeUp: ['ArrowDown'], // ブレーキを強く
  brakeDown: ['ArrowUp'], // ブレーキをゆるめる
  door: ['KeyD'],
  announce: ['KeyA'],
  horn: ['Space', 'KeyH'],
  pause: ['Escape', 'KeyP'],
};
const KEY_TO_ACTION = new Map<string, Action>(
  (Object.entries(KEY_BINDINGS) as [Action, string[]][]).flatMap(([a, keys]) => keys.map((k) => [k, a] as [string, Action])),
);

function doAction(a: Action): void {
  if (!game) return;
  const sim = game.sim;
  switch (a) {
    case 'powerUp':
      return setPower(sim.power + 1);
    case 'powerDown':
      return setPower(sim.power - 1);
    case 'brakeUp':
      return setBrake(sim.brake + 1);
    case 'brakeDown':
      return setBrake(sim.brake - 1);
    case 'door':
      return toggleDoor();
    case 'announce':
      return doAnnounce(true);
    case 'horn':
      return horn();
    case 'pause':
      return void pauseMenu();
  }
}

function bindControls(): void {
  const el = scr('s-game');
  el.querySelectorAll<HTMLButtonElement>('[data-power]').forEach((b) => (b.onclick = () => setPower(Number(b.dataset.power))));
  el.querySelectorAll<HTMLButtonElement>('[data-brake]').forEach((b) => (b.onclick = () => setBrake(Number(b.dataset.brake))));
  // スマホ：レバーを ゆびで なぞると、ゆびの いちの だんに うごく
  for (const kind of ['power', 'brake'] as const) {
    const lever = el.querySelector<HTMLElement>(`#${kind}-lever`);
    if (!lever) continue;
    const pick = (y: number) => {
      let best: HTMLElement | null = null;
      let bd = Infinity;
      lever.querySelectorAll<HTMLElement>('.nl').forEach((r) => {
        const b = r.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - y);
        if (d < bd) {
          bd = d;
          best = r;
        }
      });
      if (!best) return;
      const n = Number((best as HTMLElement).dataset[kind]);
      if (kind === 'power') setPower(n);
      else setBrake(n);
    };
    lever.onpointerdown = (e) => {
      if (e.pointerType === 'mouse') return; // マウスは いままでどおり クリック
      lever.setPointerCapture(e.pointerId);
      pick(e.clientY);
    };
    lever.onpointermove = (e) => {
      if (lever.hasPointerCapture(e.pointerId)) pick(e.clientY);
    };
  }
  el.querySelector<HTMLButtonElement>('#door')!.onclick = () => toggleDoor();
  el.querySelector<HTMLButtonElement>('#ann')!.onclick = () => doAnnounce(true);
  el.querySelector<HTMLButtonElement>('#horn')!.onclick = () => horn();
  el.querySelector<HTMLButtonElement>('#pause')!.onclick = () => void pauseMenu();
  window.onkeydown = (e) => {
    if (!game || game.paused) return;
    const a = KEY_TO_ACTION.get(e.code);
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return; // 押しっぱなしの連打はしない（1回で1段）
    doAction(a);
  };
  window.onkeyup = null;
}

function pollGamepad(): void {
  if (!game || !navigator.getGamepads) return;
  const g = game;
  const sim = g.sim;
  const pad = navigator.getGamepads().find((p): p is Gamepad => !!p);
  if (!pad) return;
  const btn = (i: number) => !!pad.buttons[i]?.pressed;
  const edge = (i: number) => btn(i) && !g.padPrev[i];
  // トリガー：右＝アクセル、左＝ブレーキ（押しこむほど強く）
  const rt = pad.buttons[7]?.value ?? 0;
  const lt = pad.buttons[6]?.value ?? 0;
  if (Math.abs(rt - g.padTrig[0]) > 0.04) {
    sim.setPower(Math.round(rt * POWER_MAX));
    g.padTrig[0] = rt;
  }
  if (Math.abs(lt - g.padTrig[1]) > 0.04) {
    sim.setBrake(Math.round(lt * 7));
    g.padTrig[1] = lt;
  }
  if (edge(12)) setPower(sim.power + 1);
  if (edge(13)) setPower(sim.power - 1);
  if (edge(15)) setBrake(sim.brake + 1);
  if (edge(14)) setBrake(sim.brake - 1);
  if (edge(0)) toggleDoor();
  if (edge(1)) horn();
  if (edge(2)) doAnnounce(true);
  if (edge(3)) setBrake(BRAKE_MAX);
  if (edge(9)) void pauseMenu();
  g.padPrev = pad.buttons.map((b) => b.pressed);
}

function loop(): void {
  if (!game) return;
  const g = game;
  g.timer.update(); // 引数なしで呼ぶ（タブを戻したときにマイナスの時間にならないように）
  const rawDt = Math.max(g.timer.getDelta(), 0);
  const dt = Math.min(rawDt, 0.05);
  if (g.paused) return;
  // はじめの数秒で なめらかさを はかり、重いPCなら 影を切って 軽くする
  if (!FORCE_HQ && !g.world.lowQuality && g.t > 2 && g.t < 6) {
    g.perfSum += rawDt;
    g.perfN++;
    if (g.t > 5.5 && g.perfN > 0 && g.perfSum / g.perfN > 1 / 32) g.world.setLowQuality();
  }
  g.t += dt;
  pollGamepad();
  const sim = g.sim;
  // はやおくり（さいこうそくど ちかくで、つぎの えきが まだ とおい とき）
  const ff = sim.fastForward();
  for (let i = 0; i < 4 * FAST * ff; i++) sim.update(dt / 4);
  document.getElementById('ff')?.classList.toggle('on', ff > 1);
  if (sim.phase === 'arrived' && sim.records.length > g.handled) {
    g.handled = sim.records.length;
    onArrive();
  }
  if (sim.phase === 'running') {
    const d = sim.distToStop();
    const v = sim.kmh / 3.6;
    if (mode === 'easy' && !g.announcedAuto && d < 3500) {
      g.announcedAuto = true;
      doAnnounce(false);
    }
    if (mode === 'normal' && sim.canAnnounce()) document.getElementById('ann')?.classList.add('blink');
    // ブレーキがかかったままアクセルを入れたとき
    if (!g.releaseHinted && sim.power > 0 && sim.brake > 0 && sim.kmh < 1 && mode !== 'hard') {
      g.releaseHinted = true;
      guide(TOUCH ? 'ブレーキが かかっているよ（ブレーキを うえの ゆるめに）' : 'ブレーキが かかっているよ（↑で ゆるめる）', 3000, mode === 'easy');
    }
    // かんたん：アクセルを入れるのを忘れていたら
    if (mode === 'easy' && !g.powerHinted && sim.kmh < 1 && sim.power === 0 && sim.brake === 0 && d > 200 && g.t > g.guideUntil + 4) {
      g.powerHinted = true;
      guide(TOUCH ? 'アクセルを うえに あげよう！' : 'W キーで アクセル！', 3000, true);
    }
    const decel = (mode === 'easy' ? 3.6 : 2.9) / 3.6;
    const brakeDist = (v * v) / (2 * decel);
    if (!g.brakeHinted && mode !== 'hard' && sim.kmh > 8 && d < brakeDist * 1.2 + 40) {
      g.brakeHinted = true;
      if (mode === 'easy') guide(TOUCH ? 'アクセルを きって、ブレーキを したに！' : '↓ キーで ブレーキ！ アクセルは S で きる', 4500, true);
      else guide('そろそろ ブレーキ！', 3000, true);
    }
    g.nextOncoming -= dt;
    if (g.nextOncoming <= 0 && sim.kmh > 80 && !inTunnel(sim.s) && !STATION_POS.some((p) => Math.abs(p - sim.s) < 3000)) {
      g.world.spawnOncoming(sim.s);
      setTimeout(() => whoosh(), Math.max(0, 2600 / (75 + v) - 0.6) * 1000);
      g.nextOncoming = 70 + Math.random() * 80;
    }
  }
  g.world.update(sim.s, dt, sim.kmh, g.t);
  g.audio.update(sim.kmh, sim.brake > 0 ? -1 : sim.power, g.world.inTunnel);
  (window as unknown as { __inTunnel: boolean }).__inTunnel = g.world.inTunnel;
  updateHud();
}

const shownNotch = { power: -1, brake: -1 };
function placeHandle(kind: 'power' | 'brake', n: number): void {
  if (shownNotch[kind] === n) return; // 変わったときだけ動かす
  shownNotch[kind] = n;
  const lever = document.getElementById(`${kind}-lever`);
  const h = document.getElementById(`${kind}-handle`);
  const b = lever?.querySelector<HTMLElement>(`[data-${kind}="${n}"]`);
  if (!lever || !h || !b) return;
  h.style.top = `${b.offsetTop + b.offsetHeight / 2}px`;
  lever.querySelectorAll('.nl').forEach((x) => x.classList.toggle('on', x === b));
}

function updateHud(): void {
  if (!game) return;
  const g = game;
  const sim = g.sim;
  const $ = (id: string) => document.getElementById(id);
  const kmh = sim.kmh;
  $('needle')?.setAttribute('transform', `rotate(${150 + (240 * Math.min(300, kmh)) / 300} 120 120)`);
  const sp = $('spdnum');
  if (sp) sp.textContent = String(Math.round(kmh));
  const running = sim.phase === 'running';
  const lim = running ? sim.atcLimit : 0;
  document.querySelectorAll<SVGCircleElement>('.atclamp').forEach((c) => c.classList.toggle('on', running && Number(c.dataset.v) === lim));
  const atc = $('atc');
  if (atc) {
    atc.textContent = running ? String(lim) : '—';
    atc.parentElement!.classList.toggle('warn', sim.atcBraking);
  }
  placeHandle('power', sim.power);
  placeHandle('brake', sim.brake);
  const pi = $('pinfo');
  if (pi) pi.textContent = powerLabel(sim.power);
  const bi = $('binfo');
  if (bi) bi.textContent = brakeLabel(sim.brake);
  $('lamp-door')?.classList.toggle('on', !sim.doorsOpen);
  $('lamp-atc')?.classList.toggle('warn', sim.atcBraking);
  $('lamp-brake')?.classList.toggle('on', sim.brake > 0);
  const st = sim.nextStation();
  const nn = $('nextname');
  if (nn && st != null && nn.dataset.st !== String(st)) {
    nn.innerHTML = rb(stName(st));
    nn.dataset.st = String(st);
    const ds = $('dside');
    if (ds) ds.textContent = sim.isLast() ? 'しゅうてん' : '';
  }
  const d = sim.distToStop();
  const dist = $('dist');
  if (dist) {
    let txt = '';
    if (running) {
      if (mode !== 'hard' || d < 300) txt = d >= 1000 ? `あと ${(d / 1000).toFixed(1)} km` : d >= 50 ? `あと ${Math.round(d)} m` : `あと ${d.toFixed(1)} m`;
    } else if (sim.phase === 'boarding' || sim.phase === 'ready') txt = 'えきに とまっているよ';
    dist.textContent = txt;
  }
  const meter = $('meter');
  if (meter) {
    const range = mode === 'easy' ? 1500 : 600;
    const showM = running && d < range && (mode !== 'hard' || d < 200);
    meter.classList.toggle('on', showM);
    if (showM) {
      const mt = $('mtrain');
      if (mt) mt.style.left = `${Math.max(0, Math.min(100, 100 - (d / range) * 100)) * 0.86}%`;
    }
  }
  const clock = $('clock');
  if (clock) {
    if (mode === 'easy') clock.textContent = `🧑‍🤝‍🧑 のっている ひと ${g.pax}にん`;
    else {
      const sched = running ? sim.schedule[Math.min(sim.next, sim.schedule.length - 1)].arr : sim.schedule[sim.records.length]?.dep ?? 0;
      clock.textContent = `🕙 ${fmtClock(sim.time, mode === 'hard')}　${running ? 'とうちゃく' : 'しゅっぱつ'} ${fmtClock(sched, mode === 'hard')}`;
    }
  }
  const tt = $('tt');
  if (tt && mode !== 'easy' && tt.dataset.v !== `${sim.next}:${sim.records.length}`) {
    tt.dataset.v = `${sim.next}:${sim.records.length}`;
    tt.innerHTML = rb(
      `<b>${TRAIN_TYPES[sim.course.type].name}</b> じこくひょう<br>` +
        sim.stops
          .map((s, i) => {
            const done = i <= sim.records.length && i < sim.next + (sim.phase === 'running' ? 0 : 1) && i !== sim.next;
            return `<span class="${done ? 'done' : i === sim.next ? 'cur' : ''}">${STATIONS[s].yomi}　${i === 0 ? '' : fmtClock(sim.schedule[i].arr, mode === 'hard') + 'ちゃく'}</span>`;
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
      guide(TOUCH ? 'ドアを あけよう（🚪ボタン）' : 'ドアを あけよう（🚪ボタン ／ Dキー）', 4000);
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
  const course = sim.course;
  endGame();
  const el = scr('s-result');
  el.innerHTML = rb(`
    <div class="page">
      <h2>🚄 しゅうてんに ついたよ！ うんてん おしまい</h2>
      <div class="bigstars">${'⭐'.repeat(res.stars)}${'☆'.repeat(3 - res.stars)}</div>
      <div class="score">てんすう ${res.avg} てん</div>
      <div class="tablewrap"><table class="rtable"><tr><th>えき</th><th>とまった ところ</th>${mode !== 'easy' ? '<th>じかん</th><th>ATC</th><th>アナウンス</th>' : ''}<th>てん</th></tr>
      ${records
        .map(
          (r) =>
            `<tr><td>${STATIONS[r.station].yomi}</td><td>${r.stopLabel} ${Math.abs(r.diff).toFixed(1)}m</td>${
              mode !== 'easy'
                ? `<td>${r.timeDiff == null ? '-' : Math.abs(r.timeDiff) <= 5 ? 'ぴったり' : r.timeDiff > 0 ? `${r.timeDiff}びょう おくれ` : `${-r.timeDiff}びょう はやい`}</td><td>${r.atc ? `⚠️${r.atc}かい` : '✅'}</td><td>${r.announced ? '✅' : '—'}</td>`
                : ''
            }<td>${r.score}</td></tr>`,
        )
        .join('')}</table></div>
      <div class="rank">⭐ ぜんぶで ${sv.totalStars}こ ・ ${rankName(sv.totalStars)}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center">
        <button class="btn primary" id="again">もういちど</button>
        <button class="btn" id="courses">コースを えらぶ</button>
        <button class="btn" id="stamps">📕 スタンプちょう</button>
      </div>
    </div>`);
  el.querySelector<HTMLButtonElement>('#again')!.onclick = () => void startGame(course);
  el.querySelector<HTMLButtonElement>('#courses')!.onclick = () => renderCourses();
  el.querySelector<HTMLButtonElement>('#stamps')!.onclick = () => renderStamps();
  show('s-result');
  sfx('levelup');
  speak(`ほしが ${res.stars}こ！ よく がんばったね！`);
}

function endGame(): void {
  if (!game) return;
  game.world.renderer.setAnimationLoop(null);
  game.timer.dispose();
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
}

registerSW();
markPortraitAllowed();
renderTitle();
