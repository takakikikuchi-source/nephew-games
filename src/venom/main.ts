// ベノムモンスター：画面と操作
import { PROFILE_CSS, renderProfilePicker, type Profile } from '../common/profiles';
import { COMMON_CSS, dialog, sleep as wait, toast } from '../common/ui';
import { esc, rb } from '../common/text';
import { bgm, getSoundSettings, setSoundSettings, sfx, unlockAudio, type Song } from '../common/sound';
import { exportAll, importAll, remove } from '../common/storage';
import {
  BOSSES,
  FOODS,
  MED_CARDS,
  PTYPES,
  PTYPE_IDS,
  RARITY,
  SPECIES,
  SPECIES_IDS,
  type FoodId,
  type Habitat,
  type PType,
  type SpeciesId,
  type Stats,
} from './data';
import { bossSvg, creatureSvg, eggSvg } from './art';
import * as G from './state';
import { Battle, type BattleEvent } from './battle';

const css = document.createElement('style');
css.textContent = PROFILE_CSS + COMMON_CSS;
document.head.appendChild(css);

const HOME_SONG: Song = {
  bpm: 96,
  wave: 'triangle',
  melody: [
    [72, 1], [76, 1], [79, 1], [76, 1], [74, 1], [77, 1], [81, 1], [77, 1],
    [72, 1], [76, 1], [79, 1], [84, 1], [83, 2], [79, 2],
  ],
  bass: [[48, 4], [53, 4], [48, 4], [43, 4]],
};
const BATTLE_SONG: Song = {
  bpm: 150,
  wave: 'square',
  melody: [
    [69, 0.5], [72, 0.5], [76, 0.5], [72, 0.5], [69, 0.5], [72, 0.5], [77, 0.5], [76, 0.5],
    [74, 0.5], [71, 0.5], [67, 0.5], [71, 0.5], [74, 1], [76, 1],
  ],
  bass: [[45, 2], [45, 2], [43, 2], [40, 2]],
};

const STAT_NAMES: Record<keyof Stats, string> = { hp: 'たいりょく', doku: 'どくパワー', def: 'ぼうぎょ', spd: 'すばやさ' };
const STAT_KEYS: (keyof Stats)[] = ['hp', 'doku', 'def', 'spd'];

const DECOS: Record<Habitat | 'egg', [string, number, number][]> = {
  desert: [['🌵', 6, 58], ['🪨', 80, 76], ['🌵', 86, 40], ['☀️', 8, 6]],
  town: [['🧱', 6, 70], ['🕳️', 82, 78], ['🍂', 76, 20]],
  forest: [['🌲', 4, 30], ['🌲', 84, 26], ['🍂', 12, 80], ['🍄', 82, 76]],
  rainforest: [['🌿', 2, 40], ['🍃', 84, 22], ['💧', 18, 14], ['🌿', 82, 70], ['🌺', 8, 78]],
  okinawa: [['🌴', 4, 24], ['🌺', 84, 74], ['🌴', 82, 18], ['🪨', 10, 80]],
  jungle: [['🌳', 2, 22], ['🍃', 84, 30], ['🌳', 80, 60], ['🍂', 10, 80]],
  egg: [['✨', 20, 20], ['✨', 76, 30], ['🌾', 8, 78], ['🌾', 84, 78]],
};

let profile: Profile;
let s: G.VenomSave;
let labSlots: PType[] = [];
let zTab: 'ikimono' | 'doku' | 'boss' | 'kusuri' = 'ikimono';
let blacklight = false;

const persist = () => G.saveGame(profile.id, s);
const scr = (id: string) => document.getElementById(id)!;

function show(id: string): void {
  document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('on', e.id === id));
}

function modal(inner: string): { el: HTMLElement; close: () => void } {
  const back = document.createElement('div');
  back.className = 'dlg-back';
  back.innerHTML = `<div class="dlg">${inner}</div>`;
  document.body.appendChild(back);
  return { el: back, close: () => back.remove() };
}

function topbar(back?: string): string {
  return `<header class="topbar">
    <div class="who">${profile.icon} ${esc(profile.name)}</div>
    <div class="chip coin">🪙 ${s.coins}</div>
    <div class="chip">💧 エキス ${s.essence}</div>
    <div class="spacer"></div>
    ${
      back
        ? `<button class="tb" data-back="${back}">◀ もどる</button>`
        : `<button class="tb" data-go="nakama">🐾 なかま</button><button class="tb" data-go="zukan">📖 ずかん</button><button class="tb" data-go="settings">⚙️ せってい</button>`
    }
  </header>`;
}

function bindTop(el: HTMLElement): void {
  el.querySelectorAll<HTMLButtonElement>('[data-back]').forEach((b) => (b.onclick = () => go(b.dataset.back!)));
  el.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go!)));
}

function go(where: string): void {
  sfx('click');
  switch (where) {
    case 'home':
      return renderHome();
    case 'nakama':
      return renderNakama();
    case 'zukan':
      return renderZukan();
    case 'settings':
      return renderSettings();
    case 'gacha':
      return renderGacha();
    case 'lab':
      return renderLab();
    case 'boss':
      return renderBossSelect();
  }
}

// ======================= タイトル・プロフィール =======================
function renderTitle(): void {
  const el = scr('s-title');
  el.innerHTML = `
    <div class="title-art">
      <div class="mini">${creatureSvg('sasori', 3)}</div>
      <div class="mini">${creatureSvg('yadoku', 3)}</div>
      <div class="mini">${creatureSvg('cobra', 3)}</div>
    </div>
    <h1 class="logo">ベノムモンスター</h1>
    <p class="logo-sub">もうどく いきもの いくせいゲーム</p>
    <button class="btn primary" id="start" style="font-size:28px;padding:16px 48px">はじめる</button>`;
  scr('s-title').querySelector<HTMLButtonElement>('#start')!.onclick = () => {
    unlockAudio();
    sfx('good');
    bgm.play(HOME_SONG);
    renderProfile();
  };
  show('s-title');
}

function renderProfile(): void {
  const el = scr('s-profile');
  renderProfilePicker(
    el,
    async (p) => {
      profile = p;
      s = G.loadGame(p.id);
      if (s.creatures.length === 0) {
        await dialog(
          `<b>ようこそ ベノムラボへ！</b><br>ここでは ほんものの どく{生|い}き{物|もの}を、たまごから そだてるよ。<br>まずは むりょうで たまごを 1こ ひいてみよう！`,
          [{ label: 'ガチャへ いく', value: 'ok', primary: true }],
        );
        renderGacha();
      } else {
        renderHome();
      }
    },
    () => sfx('click'),
  );
  show('s-profile');
}

// ======================= ホーム =======================
function bubbleText(c: G.Creature): string {
  if (c.stage === 0) return c.mood > 85 ? 'ぽかぽか… もうすぐ うまれそう！' : 'たまごを あたためてね';
  if (c.sick) return 'ぐあいが わるい… 🤒';
  if (c.hunger < 30) return 'おなか すいた… 🍽️';
  if (c.poops.length > 0 || c.clean < 40) return 'よごれてる… 🧹';
  if (c.mood < 30) return 'あそんで… 🥺';
  if (c.stage === 3) return 'ボスに ちょうせんできるよ！ ⚔️';
  return ['げんきだよ！', 'きょうも がんばる！', 'もっと つよく なりたい！'][c.day % 3];
}

function bar(label: string, v: number, color: string): string {
  return `<div class="bar"><span>${label}</span><div class="track"><div class="fill" style="width:${v}%;background:${color}"></div></div><span>${Math.round(v)}</span></div>`;
}

function renderHome(): void {
  const c = G.current(s);
  if (!c) return renderGacha();
  bgm.play(HOME_SONG);
  const sp = SPECIES[c.species];
  const isEgg = c.stage === 0;
  const hab = isEgg ? 'egg' : sp.habitat;
  const st = G.stats(c);
  const name = isEgg ? '？？？の たまご' : `${sp.name}（${sp.stageNames[c.stage - 1]}）`;
  let growth = '';
  if (c.stage === 1 || c.stage === 2) {
    const lo = G.STAGE_EXP[c.stage];
    const hi = G.STAGE_EXP[c.stage + 1];
    const pct = Math.max(0, Math.min(100, ((c.exp - lo) / (hi - lo)) * 100));
    growth = bar('せいちょう', pct, 'linear-gradient(90deg,#b197fc,#ff6bd6)');
  } else if (c.stage === 3) {
    growth = `<div class="hint" style="font-size:17px">🌟 おとなに なった！ ボスに ちょうせんしよう</div>`;
  } else {
    growth = `<div class="hint" style="font-size:17px">🥚 ねると たまごが かえるよ</div>`;
  }
  const A = (act: string, ic: string, label: string, cls = '', dis = false) =>
    `<button class="act ${cls}" data-act="${act}" ${dis ? 'disabled' : ''}><span class="ic">${ic}</span>${rb(label)}</button>`;
  let actions: string;
  if (isEgg) {
    actions = A('pet', '🔥', 'あたためる') + A('sleep', '🌙', 'ねる', 'sleep') + A('gacha', '🥚', 'ガチャ', 'gacha') + A('nakama', '🐾', 'なかま');
  } else if (c.sick) {
    actions = A('sleep', '🛏️', 'やすませる', 'sleep') + A('pet', '🤲', 'なでる') + A('lab', '🧪', 'どくラボ', 'lab') + A('nakama', '🐾', 'なかま');
  } else {
    actions =
      A('feed', '🍽️', 'ごはん') +
      A('clean', '🧹', 'そうじ') +
      A('train', '🏋️', 'トレーニング', '', c.trainsToday >= G.MAX_TRAINS) +
      A('sleep', '🌙', 'ねる', 'sleep') +
      A('lab', '🧪', 'どくラボ', 'lab') +
      A('boss', '⚔️', 'バトル', 'battle') +
      A('gacha', '🥚', 'ガチャ', 'gacha');
  }
  const el = scr('s-home');
  el.innerHTML = rb(`${topbar()}
  <main class="home-main">
    <div class="habitat hab-${hab} ${blacklight && sp.glow && !isEgg ? 'blacklight' : ''}" id="habitat">
      ${DECOS[hab].map(([e, x, y]) => `<span class="deco" style="left:${x}%;top:${y}%">${e}</span>`).join('')}
      <div class="bubble">${rb(bubbleText(c))}</div>
      <div class="creature s${c.stage} ${isEgg ? 'egg' : ''}" id="creature"><div class="bob">${isEgg ? eggSvg(sp.rarity) : creatureSvg(c.species, c.stage)}</div></div>
      ${c.poops.map((p, i) => `<button class="poop" data-poop="${i}" style="left:${p.x}%;top:${p.y}%" aria-label="うんち">💩</button>`).join('')}
      ${sp.glow && !isEgg ? `<button class="blb" id="blb">🔦 ブラックライト ${blacklight ? 'OFF' : 'ON'}</button>` : ''}
      <div class="name-tag">${rb(name)}</div>
    </div>
    <aside class="panel">
      <div class="daybox"><span>📅 ${c.day}{日|にち}め</span><span>${isEgg ? 'たまご' : rb(sp.stageNames[c.stage - 1])}</span></div>
      ${growth}
      ${isEgg ? '' : bar('おなか', c.hunger, '#ffa94d') + bar('げんき', c.mood, '#ff6bd6') + bar('きれい', c.clean, '#4dabf7')}
      ${
        isEgg
          ? ''
          : `<div class="stats4">${STAT_KEYS.map((k) => `<span>${STAT_NAMES[k]} <b>${st[k]}</b></span>`).join('')}</div>`
      }
      <div class="hint">${isEgg ? 'たまごを タップすると あたためられるよ' : `タップで なでる ／ トレーニング のこり ${G.MAX_TRAINS - c.trainsToday}かい`}</div>
      <div class="actions">${actions}</div>
    </aside>
  </main>`);
  bindTop(el);
  el.querySelector<HTMLElement>('#creature')!.onclick = (e) => doPet(c, e);
  el.querySelectorAll<HTMLButtonElement>('[data-poop]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      G.cleanPoop(c, Number(b.dataset.poop));
      sfx('pop');
      persist();
      renderHome();
    };
  });
  const blb = el.querySelector<HTMLButtonElement>('#blb');
  if (blb)
    blb.onclick = () => {
      blacklight = !blacklight;
      sfx('click');
      renderHome();
      if (blacklight) toast('サソリは ブラックライトで みどりいろに ひかるんだ！');
    };
  el.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
    b.onclick = () => homeAction(c, b.dataset.act!);
  });
  show('s-home');
}

function homeAction(c: G.Creature, act: string): void {
  switch (act) {
    case 'pet':
      return void doPet(c);
    case 'feed':
      return openFeed(c);
    case 'clean':
      sfx('click');
      if (c.poops.length) toast('💩を タップして そうじしよう！');
      else toast('ぴかぴか！ きれいだよ ✨');
      return;
    case 'train':
      return openTraining(c);
    case 'sleep':
      return void doSleep(c);
    default:
      return go(act);
  }
}

async function doPet(c: G.Creature, e?: MouseEvent): Promise<void> {
  if (c.stage > 0 && !s.petWarned) {
    s.petWarned = true;
    persist();
    await dialog(
      '⚠️ ほんものの どく{生|い}き{物|もの}は、ぜったいに さわっちゃ ダメ！<br>これは ゲームの なかだけの とくべつだよ。',
      [{ label: 'わかった！', value: 'ok', primary: true }],
    );
  }
  if (!G.pet(c)) {
    toast(c.stage === 0 ? 'たまごは じゅうぶん あたたかいよ' : 'いまは ひとりで いたい みたい');
    return;
  }
  persist();
  sfx('pop');
  const hab = document.getElementById('habitat');
  if (hab) {
    const r = hab.getBoundingClientRect();
    const h = document.createElement('span');
    h.className = 'heart';
    h.textContent = c.stage === 0 ? '🔥' : '💜';
    const x = e ? e.clientX - r.left : r.width / 2;
    const y = e ? e.clientY - r.top : r.height / 2;
    h.style.left = `${x - 16}px`;
    h.style.top = `${y - 30}px`;
    hab.appendChild(h);
    document.getElementById('creature')?.classList.add('happy');
  }
  setTimeout(renderHome, 900);
}

function openFeed(c: G.Creature): void {
  sfx('click');
  const sp = SPECIES[c.species];
  const choices = G.foodChoices(c);
  const m = modal(`<div class="dlg-body"><h3 style="margin:0 0 12px">なにを あげる？</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    ${choices
      .map(
        (f) =>
          `<button class="btn" data-food="${f}" style="display:flex;flex-direction:column;align-items:center;gap:4px;background:#f3eeff"><span style="font-size:52px">${FOODS[f].emoji}</span>${rb(FOODS[f].name)}</button>`,
      )
      .join('')}
    </div></div><div class="dlg-btns"><button class="btn" data-x>やめる</button></div>`);
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
  m.el.querySelectorAll<HTMLButtonElement>('[data-food]').forEach((b) => {
    b.onclick = async () => {
      const food = b.dataset.food as FoodId;
      const r = G.feed(c, food);
      persist();
      m.close();
      if (r.ok) {
        sfx('good');
        let msg = `${FOODS[food].emoji} おいしそうに たべた！`;
        if (r.poisonUp) msg += `<br>どくパワーが あがった！ ${sp.name}は たべものから どくを ためるんだ。`;
        toast(msg, 3200);
      } else if (r.full) {
        toast('おなか いっぱい みたい');
      } else {
        sfx('bad');
        const real = sp.foods.map((f) => `${FOODS[f].emoji}${FOODS[f].name}`).join('や ');
        const why = FOODS[food].junk ? `${sp.name}は ${FOODS[food].name}は たべないよ。` : `${sp.name}は ${FOODS[food].name}は あまり たべないよ。`;
        await dialog(`${FOODS[food].emoji} ぷいっ！<br>${why}<br>ほんとうは <b>${real}</b> を たべるんだ。`, [
          { label: 'わかった', value: 'ok', primary: true },
        ]);
      }
      renderHome();
    };
  });
}

function openTraining(c: G.Creature): void {
  if (c.trainsToday >= G.MAX_TRAINS) {
    toast('きょうは もう つかれた みたい。ねて やすもう！');
    return;
  }
  sfx('click');
  const st = G.stats(c);
  const m = modal(`<div class="dlg-body"><h3 style="margin:0 0 12px">なにを きたえる？</h3>
    <div class="statpick">${STAT_KEYS.map(
      (k) => `<button class="btn" data-stat="${k}" style="background:#f3eeff">${STAT_NAMES[k]}<br><small>いま ${st[k]}</small></button>`,
    ).join('')}</div></div><div class="dlg-btns"><button class="btn" data-x>やめる</button></div>`);
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
  m.el.querySelectorAll<HTMLButtonElement>('[data-stat]').forEach((b) => {
    b.onclick = () => runTiming(c, b.dataset.stat as keyof Stats, m);
  });
}

function runTiming(c: G.Creature, stat: keyof Stats, m: { el: HTMLElement; close: () => void }): void {
  sfx('click');
  const center = 25 + Math.random() * 50;
  const dlg = m.el.querySelector('.dlg')!;
  dlg.innerHTML = `<div class="dlg-body" style="text-align:center"><h3 style="margin:0">${STAT_NAMES[stat]}トレーニング</h3>
    <div>しろい ぼうが みどりに きたら「ストップ！」（スペースキーでも OK）</div>
    <div class="tbar" id="tbar">
      <div class="tzone" style="left:${center - 16}%;width:32%;background:#2b8a3e"></div>
      <div class="tzone" style="left:${center - 9}%;width:18%;background:#51cf66"></div>
      <div class="tzone" style="left:${center - 4}%;width:8%;background:#d3f9d8"></div>
      <div class="tmark" id="tmark"></div>
    </div>
    <div class="tres" id="tres">のこり 3かい</div>
    <button class="btn primary" id="tstop" style="font-size:28px;padding:14px 50px">ストップ！</button></div>`;
  const mark = dlg.querySelector<HTMLElement>('#tmark')!;
  const res = dlg.querySelector<HTMLElement>('#tres')!;
  let t0 = performance.now();
  let tries = 0;
  let total = 0;
  let pos = 0;
  let paused = false;
  let raf = 0;
  const speed = 1.6 + c.stage * 0.25;
  const loop = (now: number) => {
    if (!paused) {
      const t = (now - t0) / 1000;
      pos = 50 + 48 * Math.sin(t * speed);
      mark.style.left = `${pos}%`;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const press = async () => {
    if (paused || tries >= 3) return;
    paused = true;
    tries++;
    const d = Math.abs(pos - center);
    const pts = d < 4 ? 3 : d < 9 ? 2 : d < 16 ? 1 : 0;
    total += pts;
    sfx(pts >= 2 ? 'good' : pts === 1 ? 'click' : 'miss');
    res.textContent = `${['ざんねん…', 'いいね！', 'すごい！', 'パーフェクト！！'][pts]}  （のこり ${3 - tries}かい）`;
    await wait(700);
    if (tries >= 3) {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', key);
      const gain = Math.max(1, total);
      G.applyTraining(c, stat, gain);
      persist();
      sfx('levelup');
      res.innerHTML = `${STAT_NAMES[stat]}が <b>+${stat === 'hp' ? gain * 3 : gain}</b> あがった！`;
      await wait(1400);
      m.close();
      renderHome();
      return;
    }
    t0 = performance.now() - Math.random() * 2000;
    paused = false;
  };
  const key = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      void press();
    }
  };
  document.addEventListener('keydown', key);
  dlg.querySelector<HTMLButtonElement>('#tstop')!.onclick = () => void press();
  dlg.querySelector<HTMLElement>('#tbar')!.onclick = () => void press();
}

async function doSleep(c: G.Creature): Promise<void> {
  sfx('click');
  const q = c.sick ? 'やすませる？ 1にち すすむよ。' : c.stage === 0 ? 'ねる？ あしたの あさ、たまごが かえるよ！' : 'ねる？ 1にち すすむよ。';
  const ok = await dialog(q, [
    { label: 'ねる', value: 'yes', primary: true },
    { label: 'まだ', value: 'no' },
  ]);
  if (ok !== 'yes') return;
  const night = document.createElement('div');
  night.className = 'night';
  night.textContent = '🌙 💤';
  document.body.appendChild(night);
  await wait(1500);
  const r = G.sleep(s, c);
  persist();
  night.remove();
  const sp = SPECIES[c.species];
  const lines: string[] = ['☀️ おはよう！'];
  if (r.hatched) {
    sfx('hatch');
    lines.push(`<div style="width:170px;height:170px;margin:8px auto">${creatureSvg(c.species, 1)}</div>`);
    lines.push(`<b>たまごが かえった！ ${sp.name}の ${sp.stageNames[0]}が うまれた！</b>`);
    if (r.newSpecies) lines.push('📖 ずかんに あたらしい いきものが のった！ 🪙+20');
  } else if (r.grewTo) {
    sfx('levelup');
    lines.push(`<div style="width:170px;height:170px;margin:8px auto">${creatureSvg(c.species, r.grewTo)}</div>`);
    lines.push(`<b>せいちょうした！ ${sp.stageNames[r.grewTo - 1]}に なった！</b>`);
  } else if (r.cured) {
    sfx('heal');
    lines.push('<b>げんきに なった！</b>');
  } else {
    sfx('coin');
  }
  if (r.exp > 0) lines.push(`せいちょうポイント +${r.exp}`);
  lines.push(`🪙 +${r.coins}${r.careBonus ? '（おせわ ボーナス！）' : ''}`);
  if (r.moto) lines.push(`どくのもと「${PTYPES[r.moto].icon}${PTYPES[r.moto].name}」を 1こ ゲット！`);
  if (r.gotSick) lines.push('🤒 ぐあいが わるく なっちゃった… やすませて あげよう。');
  if (r.newFact) lines.push(`<div style="background:#f1ecff;border-radius:12px;padding:8px 12px;margin-top:6px">📖 まめちしき：${r.newFact}</div>`);
  await dialog(lines.join('<br>'), [{ label: 'OK', value: 'ok', primary: true }]);
  renderHome();
}

// ======================= ガチャ =======================
function renderGacha(): void {
  const el = scr('s-gacha');
  const hasAny = s.creatures.length > 0;
  el.innerHTML = rb(`${topbar(hasAny ? 'home' : undefined)}
  <div class="page">
    <h2>たまごガチャ</h2>
    <div class="machine" id="machine">
      <div class="dome"></div>
      <div class="balls">${['🥚', '🥚', '🥚', '🥚', '🥚'].map((e, i) => `<span style="left:${22 + i * 12}%;top:${18 + (i % 2) * 16}%">${e}</span>`).join('')}</div>
      <div class="base"></div><div class="slot"></div><div class="knob"></div>
    </div>
    <div id="gout" style="min-height:40px"></div>
    <button class="btn primary" id="pull" style="font-size:26px;padding:14px 40px">${s.freeGacha ? 'むりょうで ひく！' : `🪙${G.GACHA_COST}で ひく`}</button>
    <div class="hint">ノーマル 60% ／ レア 30% ／ げきレア 10%　・　おなじ いきものが でたら「どくエキス」に なるよ</div>
  </div>`);
  bindTop(el);
  el.querySelector<HTMLButtonElement>('#pull')!.onclick = () => void pull();
  show('s-gacha');
}

async function pull(): Promise<void> {
  if (!G.canGacha(s)) {
    sfx('bad');
    toast('コインが たりないよ。おせわや ボスバトルで コインを ためよう！', 3200);
    return;
  }
  const el = scr('s-gacha');
  const btn = el.querySelector<HTMLButtonElement>('#pull')!;
  btn.disabled = true;
  sfx('click');
  el.querySelector('#machine')!.classList.add('spin');
  await wait(1200);
  const r = G.rollGacha(s)!;
  persist();
  const out = el.querySelector<HTMLElement>('#gout')!;
  out.innerHTML = `<div class="gacha-egg" id="gegg">${eggSvg(r.rarity)}</div><div style="text-align:center;font-size:24px;font-weight:700;color:${RARITY[r.rarity].color}">${RARITY[r.rarity].name}の たまご！</div>`;
  sfx(r.rarity === 'N' ? 'coin' : 'levelup');
  await wait(900);
  el.querySelector('#gegg')?.classList.add('shake');
  await wait(1300);
  const sp = SPECIES[r.species];
  if (r.kind === 'dup') {
    await dialog(
      `<div style="width:150px;height:150px;margin:auto">${creatureSvg(r.species, 3)}</div>なかを みたら… <b>${sp.name}</b>だった！<br>もう なかまに いるので、<b>どくエキス ×${r.essence}</b> に なった！<br><small>どくエキスは どくラボで「どくのもと」に かえられるよ。</small>`,
      [{ label: 'OK', value: 'ok', primary: true }],
    );
    renderGacha();
    return;
  }
  const cur = G.current(s);
  if (cur && cur.uid !== r.creature.uid) {
    const a = await dialog('あたらしい たまご！ なにが うまれるかな？<br>この たまごを いま そだてる？', [
      { label: 'そだてる', value: 'yes', primary: true },
      { label: 'あとで（なかまで えらべるよ）', value: 'no' },
    ]);
    if (a === 'yes') s.current = r.creature.uid;
    persist();
  } else {
    await dialog('あたらしい たまご！ なにが うまれるかな？<br>たまごを あたためて、ねると かえるよ。', [{ label: 'そだてに いく', value: 'ok', primary: true }]);
  }
  renderHome();
}

// ======================= どくラボ =======================
function renderLab(): void {
  const el = scr('s-lab');
  const c = G.current(s);
  const used = (t: PType) => labSlots.filter((x) => x === t).length;
  el.innerHTML = rb(`${topbar('home')}
  <div class="page">
    <h2>🧪 どくラボ</h2>
    <div class="hint" style="font-size:17px">「どくのもと」を 2つ まぜて、オリジナルの どくを つくろう！</div>
    <div class="lab-wrap">
      <div class="motos">
        ${PTYPE_IDS.map((t) => {
          const p = PTYPES[t];
          const left = s.moto[t] - used(t);
          return `<div class="moto" style="--tc:${p.color}">
            <div class="head">${p.icon} ${p.name}<span class="cnt">×${s.moto[t]}</span></div>
            <div class="desc">ほんとうの なまえ：${p.real}<br>${p.body}<br>⚔️ ${p.effect}</div>
            <div class="row">
              <button data-put="${t}" style="background:${p.color};color:#111" ${left <= 0 || labSlots.length >= 2 ? 'disabled' : ''}>いれる</button>
              <button data-ess="${t}" style="background:#e7f5ff;color:#1c3d5a" ${s.essence <= 0 ? 'disabled' : ''}>エキスで つくる</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="flask">
        <div class="slots">
          <div class="slotx">${labSlots[0] ? PTYPES[labSlots[0]].icon : ''}</div>＋
          <div class="slotx">${labSlots[1] ? PTYPES[labSlots[1]].icon : ''}</div>
        </div>
        <div class="pot" id="pot">⚗️</div>
        <div style="display:flex;gap:10px">
          <button class="btn primary" id="mix" ${labSlots.length < 2 ? 'disabled' : ''}>まぜる！</button>
          <button class="btn" id="clear" ${labSlots.length === 0 ? 'disabled' : ''}>とりだす</button>
        </div>
        ${
          c && c.stage > 0
            ? `<div style="width:100%"><b>${SPECIES[c.species].name}の わざ（${c.moves.length}/${G.MAX_MOVES}）</b>
                <div class="movelist">${c.moves.map((mv) => `<div class="mv">${esc(mv.name)}<span class="tps">${mv.types.map((t) => PTYPES[t].icon).join('')}</span></div>`).join('')}</div></div>`
            : '<div class="hint">うまれた いきものが わざを おぼえられるよ</div>'
        }
      </div>
    </div>
  </div>`);
  bindTop(el);
  el.querySelectorAll<HTMLButtonElement>('[data-put]').forEach((b) => {
    b.onclick = () => {
      sfx('pop');
      labSlots.push(b.dataset.put as PType);
      renderLab();
    };
  });
  el.querySelectorAll<HTMLButtonElement>('[data-ess]').forEach((b) => {
    b.onclick = () => {
      if (G.essenceToMoto(s, b.dataset.ess as PType)) {
        sfx('coin');
        persist();
        renderLab();
      }
    };
  });
  el.querySelector<HTMLButtonElement>('#clear')!.onclick = () => {
    labSlots = [];
    sfx('click');
    renderLab();
  };
  el.querySelector<HTMLButtonElement>('#mix')!.onclick = () => void mix();
  show('s-lab');
}

async function mix(): Promise<void> {
  if (labSlots.length < 2) return;
  const [a, b] = labSlots;
  const pot = document.getElementById('pot');
  pot?.classList.add('brew');
  sfx('click');
  await wait(1600);
  const r = G.craft(s, a, b);
  labSlots = [];
  if (!r) {
    renderLab();
    return;
  }
  persist();
  sfx('levelup');
  const kinds = [...new Set(r.move.types)];
  let html = `<b>あたらしい どく「${esc(r.move.name)}」が できた！</b><br>${r.move.types.map((t) => PTYPES[t].icon).join(' ＋ ')}<br>`;
  html += kinds.map((t) => `・${PTYPES[t].name}：${PTYPES[t].effect}`).join('<br>');
  if (r.newCard) {
    const card = MED_CARDS.find((m) => m.id === r.newCard)!;
    html += `<div style="background:#e6fcf5;border-radius:12px;padding:10px;margin-top:10px">💊 <b>くすりカードを ゲット！</b><br>${card.from}の どくから、<b>${card.drug}</b>（${card.use}）が うまれたんだ。<br><small>どくは つかいかたしだいで くすりにも なるよ。ずかんで くわしく みられるよ。</small></div>`;
  }
  await dialog(html, [{ label: 'つぎへ', value: 'ok', primary: true }]);
  const c = G.current(s);
  if (!c || c.stage === 0) {
    toast('うまれた いきもの しか わざを おぼえられないよ');
    renderLab();
    return;
  }
  const nm = await dialog(`「${esc(r.move.name)}」に じぶんで なまえを つける？`, [
    { label: 'このままで いい', value: 'keep', primary: true },
    { label: 'なまえを つける', value: 'name' },
  ]);
  if (nm === 'name') {
    const n = window.prompt('わざの なまえ（10もじまで）', r.move.name);
    if (n && n.trim()) r.move.name = n.trim().slice(0, 10);
  }
  if (c.moves.length < G.MAX_MOVES) {
    G.learn(c, r.move);
    sfx('good');
    toast(`${SPECIES[c.species].name}は「${esc(r.move.name)}」を おぼえた！`);
  } else {
    const opts = c.moves.map((mv, i) => ({ label: `${esc(mv.name)} を わすれる`, value: String(i) }));
    const pick = await dialog(`わざは 4つまで。どれを わすれて「${esc(r.move.name)}」を おぼえる？`, [
      ...opts,
      { label: 'おぼえない', value: 'no' },
    ]);
    if (pick !== 'no') {
      G.learn(c, r.move, Number(pick));
      sfx('good');
      toast(`「${esc(r.move.name)}」を おぼえた！`);
    }
  }
  persist();
  renderLab();
}

// ======================= ボス =======================
function renderBossSelect(): void {
  const el = scr('s-boss');
  const c = G.current(s);
  el.innerHTML = rb(`${topbar('home')}
  <div class="page">
    <h2>⚔️ ボスに ちょうせん</h2>
    ${
      c && c.stage > 0
        ? `<div class="hint" style="font-size:18px">たたかう いきもの：<b style="color:#fff">${SPECIES[c.species].name}（${SPECIES[c.species].stageNames[c.stage - 1]}）</b>　${STAT_KEYS.map((k) => `${STAT_NAMES[k]} ${G.stats(c)[k]}`).join(' ／ ')}</div>`
        : ''
    }
    <div class="cards">
      ${BOSSES.map((b, i) => {
        const open = G.bossUnlocked(s, i);
        const beaten = s.bossBeaten.includes(b.id);
        const weak = Object.keys(b.resist) as PType[];
        return `<div class="card ${open ? '' : 'locked'}" style="width:260px">
          <div class="pic" style="width:180px;height:180px">${bossSvg(b.id)}</div>
          <div class="ttl">${open ? b.name : '？？？'} ${beaten ? '✅' : ''}</div>
          <div class="sub">${open ? `すみか：${b.where}<br>ききにくい どく：${weak.length ? weak.map((t) => PTYPES[t].icon + PTYPES[t].name).join('、') : 'なし'}` : 'まえの ボスを たおすと あらわれる'}</div>
          ${open ? `<button class="btn ${beaten ? '' : 'pink'}" data-boss="${i}">${beaten ? 'もういちど' : 'たたかう！'}</button>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`);
  bindTop(el);
  el.querySelectorAll<HTMLButtonElement>('[data-boss]').forEach((b) => {
    b.onclick = () => {
      const cc = G.current(s);
      if (!cc || cc.stage === 0) return toast('たまごの ままでは たたかえないよ');
      if (cc.sick) return toast('ぐあいが わるいので、やすませて あげよう');
      if (cc.hunger < 20) return toast('おなかが すいて たたかえない… ごはんを あげよう');
      startBattle(cc, Number(b.dataset.boss));
    };
  });
  show('s-boss');
}

function startBattle(c: G.Creature, bi: number): void {
  sfx('click');
  bgm.play(BATTLE_SONG);
  const battle = new Battle(c, bi);
  const boss = battle.boss;
  const el = scr('s-battle');
  el.innerHTML = rb(`
  <div class="arena" style="background:${boss.bg}">
    <div class="fighter boss">
      <div class="hpbox"><div class="nm"><span>${boss.name}</span><span id="bhp">${battle.b.hp}/${battle.b.maxHp}</span></div>
        <div class="track"><div class="fill" id="bfill" style="width:100%"></div></div><div class="marks" id="bmarks"></div></div>
      <div class="pic" id="bpic">${bossSvg(boss.id)}</div>
    </div>
    <div class="fighter me">
      <div class="pic" id="ppic">${creatureSvg(c.species, c.stage)}</div>
      <div class="hpbox"><div class="nm"><span>${SPECIES[c.species].name}</span><span id="php">${battle.p.hp}/${battle.p.maxHp}</span></div>
        <div class="track"><div class="fill" id="pfill" style="width:100%"></div></div></div>
    </div>
  </div>
  <div class="bpanel">
    <div class="msg" id="bmsg">${boss.name}が あらわれた！</div>
    <div class="bmoves">
      ${battle.moves
        .map(
          (m, i) =>
            `<button class="bmove" data-mv="${i}">${m.types.map((t) => PTYPES[t].icon).join('') || '👊'} ${esc(m.name)}</button>`,
        )
        .join('')}
      <button class="bmove" data-run style="background:#e9ecef">🏃 にげる</button>
    </div>
  </div>`);
  const msg = el.querySelector<HTMLElement>('#bmsg')!;
  const btns = () => el.querySelectorAll<HTMLButtonElement>('.bmove');
  const setHp = (side: 'p' | 'b') => {
    const f = side === 'p' ? battle.p : battle.b;
    const pct = (f.hp / f.maxHp) * 100;
    const fill = el.querySelector<HTMLElement>(side === 'p' ? '#pfill' : '#bfill')!;
    fill.style.width = `${pct}%`;
    fill.classList.toggle('low', pct <= 50 && pct > 20);
    fill.classList.toggle('crit', pct <= 20);
    el.querySelector<HTMLElement>(side === 'p' ? '#php' : '#bhp')!.textContent = `${f.hp}/${f.maxHp}`;
  };
  const refreshMarks = () => {
    const st = battle.b.st;
    const ms: [string, string][] = [];
    if (st.para) ms.push(['⚡しびれ', PTYPES.shibire.color]);
    if (st.bleedTurns > 0) ms.push(['🩸ちのどく', PTYPES.chi.color]);
    if (st.atkDown > 0) ms.push(['💥こうげき↓', PTYPES.itami.color]);
    if (st.defDown > 0) ms.push(['🧪ぼうぎょ↓', PTYPES.kowashi.color]);
    if (st.defUp > 0) ms.push(['🛡️ぼうぎょ↑', '#868e96']);
    el.querySelector<HTMLElement>('#bmarks')!.innerHTML = ms.map(([l, col]) => `<span style="background:${col}">${l}</span>`).join('');
  };
  const play = async (events: BattleEvent[]) => {
    for (const e of events) {
      if (e.kind === 'text') {
        msg.innerHTML = rb(esc(e.text));
        await wait(850);
      } else if (e.kind === 'hit') {
        const pic = el.querySelector<HTMLElement>(e.target === 'p' ? '#ppic' : '#bpic')!;
        pic.classList.remove('shake', 'flash');
        void pic.offsetWidth;
        pic.classList.add('shake', 'flash');
        sfx('hit');
        const r = pic.getBoundingClientRect();
        const d = document.createElement('div');
        d.className = 'dmg';
        d.textContent = `-${e.amount}`;
        d.style.left = `${r.left + r.width / 2 - 30}px`;
        d.style.top = `${r.top + r.height / 3}px`;
        d.style.position = 'fixed';
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 1000);
        setHp(e.target);
        await wait(550);
      } else if (e.kind === 'mark') {
        refreshMarks();
        sfx('pop');
        await wait(250);
      } else if (e.kind === 'end') {
        await wait(500);
        await finishBattle(c, bi, e.win);
        return;
      }
    }
    refreshMarks();
    btns().forEach((b) => (b.disabled = false));
    msg.innerHTML = 'どうする？';
  };
  el.querySelectorAll<HTMLButtonElement>('[data-mv]').forEach((b) => {
    b.onclick = () => {
      btns().forEach((x) => (x.disabled = true));
      sfx('click');
      void play(battle.turn(Number(b.dataset.mv)));
    };
  });
  el.querySelector<HTMLButtonElement>('[data-run]')!.onclick = async () => {
    const a = await dialog('にげる？', [
      { label: 'にげる', value: 'yes' },
      { label: 'たたかう', value: 'no', primary: true },
    ]);
    if (a === 'yes') {
      bgm.play(HOME_SONG);
      renderBossSelect();
    }
  };
  show('s-battle');
}

async function finishBattle(c: G.Creature, bi: number, win: boolean): Promise<void> {
  const boss = BOSSES[bi];
  c.hunger = Math.max(0, c.hunger - 10);
  if (win) {
    sfx('win');
    const r = G.giveBossReward(s, bi);
    persist();
    let html = `<b>🎉 ${boss.name}を たおした！</b><br>🪙 +${r.coins}<br>どくのもと ぜんぶの しゅるい +${r.moto}`;
    if (r.first) html += `<div style="background:#f1ecff;border-radius:12px;padding:8px 12px;margin-top:8px">📖 ${boss.fact}</div>`;
    if (r.first && bi === BOSSES.length - 1) html += '<br><b>👑 ぜんぶの ボスを たおした！ きみは ベノムマスター！</b>';
    else if (r.first && bi < BOSSES.length - 1) html += '<br>あたらしい ボスが あらわれた…！';
    await dialog(html, [{ label: 'OK', value: 'ok', primary: true }]);
  } else {
    sfx('lose');
    persist();
    await dialog(
      `まけちゃった… でも だいじょうぶ！<br><div style="background:#fff4d6;border-radius:12px;padding:8px 12px;margin-top:8px">💡 ヒント：${boss.hint}</div><div style="background:#f1ecff;border-radius:12px;padding:8px 12px;margin-top:8px">📖 ${boss.fact}</div>`,
      [{ label: 'OK', value: 'ok', primary: true }],
    );
  }
  bgm.play(HOME_SONG);
  renderBossSelect();
}

// ======================= なかま =======================
function renderNakama(): void {
  const el = scr('s-nakama');
  el.innerHTML = rb(`${topbar('home')}
  <div class="page">
    <h2>🐾 なかま</h2>
    <div class="hint" style="font-size:17px">そだてる いきものを えらぼう。えらんでいない なかまは おやすみちゅう だよ。</div>
    <div class="cards">
      ${s.creatures
        .map((c) => {
          const sp = SPECIES[c.species];
          const egg = c.stage === 0;
          return `<div class="card ${c.uid === s.current ? 'sel' : ''}">
          <div class="pic">${egg ? eggSvg(sp.rarity) : creatureSvg(c.species, c.stage)}</div>
          <div class="ttl">${egg ? '？？？の たまご' : sp.name}</div>
          <div class="sub">${egg ? 'たまご' : sp.stageNames[c.stage - 1]} ・ ${c.day}{日|にち}め${egg ? '' : `<br>わざ：${c.moves.map((m) => esc(m.name)).join('、')}`}</div>
          ${c.uid === s.current ? '<div class="sub" style="color:#9cff57;font-weight:700">そだてている</div>' : `<button class="btn" data-pick="${c.uid}">このこを そだてる</button>`}
        </div>`;
        })
        .join('')}
    </div>
  </div>`);
  bindTop(el);
  el.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((b) => {
    b.onclick = () => {
      s.current = b.dataset.pick!;
      blacklight = false;
      persist();
      sfx('good');
      renderHome();
    };
  });
  show('s-nakama');
}

// ======================= ずかん =======================
function renderZukan(): void {
  const el = scr('s-zukan');
  const tabs: [typeof zTab, string][] = [
    ['ikimono', '🐍 いきもの'],
    ['doku', '🧪 どく'],
    ['boss', '⚔️ ボス'],
    ['kusuri', '💊 くすりカード'],
  ];
  let body = '';
  if (zTab === 'ikimono') {
    body = `<div class="hint" style="font-size:17px">あつめた いきもの ${s.seen.length} / ${SPECIES_IDS.length}</div><div class="cards">${SPECIES_IDS.map((id) => {
      const seen = s.seen.includes(id);
      const sp = SPECIES[id];
      const stg = Math.max(1, s.factsSeen[id] ?? 1);
      return `<div class="card ${seen ? '' : 'locked'}" ${seen ? `data-sp="${id}" style="cursor:pointer"` : ''}>
        <div class="pic">${creatureSvg(id, seen ? stg : 3)}</div>
        <div class="ttl">${seen ? sp.name : '？？？'}</div>
        <div class="sub">${RARITY[sp.rarity].name}</div></div>`;
    }).join('')}</div>`;
  } else if (zTab === 'doku') {
    body = `<div class="motos">${PTYPE_IDS.map((t) => {
      const p = PTYPES[t];
      return `<div class="moto" style="--tc:${p.color}"><div class="head">${p.icon} ${p.name}</div>
        <div class="desc" style="font-size:16px">ほんとうの なまえ：${p.real}<br>からだへの ききかた：${p.body}<br>バトルでは：${p.effect}</div></div>`;
    }).join('')}</div>`;
  } else if (zTab === 'boss') {
    body = `<div class="cards">${BOSSES.map((b) => {
      const ok = s.bossBeaten.includes(b.id);
      return `<div class="card ${ok ? '' : 'locked'}" style="width:280px"><div class="pic">${bossSvg(b.id)}</div>
        <div class="ttl">${ok ? b.name : '？？？'}</div><div class="sub">${ok ? `${b.where}<br>${b.fact}` : 'たおすと わかるよ'}</div></div>`;
    }).join('')}</div>`;
  } else {
    body = `<div class="hint" style="font-size:17px">どくは つかいかたしだいで くすりにも なる！ どくラボで どくを まぜると てに はいるよ。</div><div class="cards">${MED_CARDS.map((m) => {
      const ok = s.cards.includes(m.id);
      return `<div class="card" style="width:280px;${ok ? '' : 'opacity:.6'}"><div style="font-size:64px">${ok ? '💊' : '❓'}</div>
        <div class="ttl">${ok ? m.drug : '？？？'}</div>
        <div class="sub">${ok ? `${m.from}の どくから<br>→ ${m.use}` : `ヒント：${PTYPES[m.unlock[0]].icon} と ${PTYPES[m.unlock[1]].icon} を まぜてみよう`}</div>
        ${ok ? `<button class="btn" data-card="${m.id}">もっと しる</button>` : ''}</div>`;
    }).join('')}</div>`;
  }
  el.innerHTML = rb(`${topbar('home')}
  <div class="page">
    <h2>📖 ずかん</h2>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${zTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    ${body}
  </div>`);
  bindTop(el);
  el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
    b.onclick = () => {
      zTab = b.dataset.tab as typeof zTab;
      sfx('click');
      renderZukan();
    };
  });
  el.querySelectorAll<HTMLElement>('[data-sp]').forEach((d) => (d.onclick = () => openSpecies(d.dataset.sp as SpeciesId)));
  el.querySelectorAll<HTMLButtonElement>('[data-card]').forEach((b) => {
    b.onclick = () => {
      const m = MED_CARDS.find((x) => x.id === b.dataset.card)!;
      void dialog(`💊 <b>${m.drug}</b><br>${m.use}<br><div style="background:#e6fcf5;border-radius:12px;padding:8px 12px;margin-top:8px">${m.more}</div><small>※ {薬|くすり}は おいしゃさんが つかうもの。ほんものの どくは ぜったいに さわらないでね。</small>`, [
        { label: 'とじる', value: 'ok', primary: true },
      ]);
    };
  });
  show('s-zukan');
}

function openSpecies(id: SpeciesId): void {
  sfx('click');
  const sp = SPECIES[id];
  const stg = Math.max(1, s.factsSeen[id] ?? 1);
  const facts = sp.facts
    .map((f, i) => (i < stg ? `<div class="fact">📖 ${f}</div>` : `<div class="fact" style="opacity:.6">？ もっと そだてると わかるよ</div>`))
    .join('');
  const m = modal(rb(`<div class="zk-detail">
    <div class="bigpic">${creatureSvg(id, stg)}</div>
    <div class="zk-text">
      <b style="font-size:26px">${sp.name}</b>（${RARITY[sp.rarity].name}）<br>
      🏠 すむところ：${sp.where}<br>
      📏 おおきさ：${sp.size}<br>
      🍽️ たべもの：${sp.foods.map((f) => FOODS[f].emoji + FOODS[f].name).join('、')}<br>
      🧪 どく：${sp.types.map((t) => PTYPES[t].icon + PTYPES[t].name).join('、')}<br>
      ${facts}
      ${sp.truth ? `<div class="truth">🔎 ほんとうは… ${sp.truth}</div>` : ''}
      <div class="safe">⚠️ ほんものを {見|み}つけても ぜったいに さわらないで、おとなに しらせてね！</div>
    </div></div><div class="dlg-btns"><button class="btn primary" data-x>とじる</button></div>`));
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
}

// ======================= せってい =======================
function renderSettings(): void {
  const el = scr('s-settings');
  const ss = getSoundSettings();
  const T = (k: keyof typeof ss, label: string) =>
    `<div class="toggle"><span>${label}</span><button class="btn ${ss[k] ? 'primary' : ''}" data-snd="${k}">${ss[k] ? 'ON' : 'OFF'}</button></div>`;
  el.innerHTML = rb(`${topbar('home')}
  <div class="page">
    <h2>⚙️ せってい</h2>
    ${T('bgm', '🎵 おんがく')}${T('sfx', '🔔 こうかおん')}${T('voice', '🗣️ こえ')}
    <div class="toggle"><span>💾 セーブを ファイルに ほぞん</span><button class="btn" id="exp">ほぞん</button></div>
    <div class="toggle"><span>📂 ファイルから よみこむ</span><button class="btn" id="imp">よみこむ</button></div>
    <div class="toggle"><span>👥 だれが あそぶ？に もどる</span><button class="btn" id="who">もどる</button></div>
    <div class="toggle"><span>🗑️ さいしょから やりなおす</span><button class="btn" id="reset" style="background:#ffc9c9">やりなおす</button></div>
  </div>`);
  bindTop(el);
  el.querySelectorAll<HTMLButtonElement>('[data-snd]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.snd as keyof typeof ss;
      setSoundSettings({ [k]: !ss[k] });
      if (k === 'bgm' && !ss.bgm) bgm.play(HOME_SONG);
      sfx('click');
      renderSettings();
    };
  });
  el.querySelector<HTMLButtonElement>('#exp')!.onclick = () => {
    exportAll();
    toast('ファイルに ほぞんしたよ');
  };
  el.querySelector<HTMLButtonElement>('#imp')!.onclick = async () => {
    if (await importAll()) {
      s = G.loadGame(profile.id);
      toast('よみこんだよ！');
      renderSettings();
    } else toast('よみこめなかった…');
  };
  el.querySelector<HTMLButtonElement>('#who')!.onclick = () => {
    sfx('click');
    renderProfile();
  };
  el.querySelector<HTMLButtonElement>('#reset')!.onclick = async () => {
    const a = await dialog(`${esc(profile.name)}の データを ぜんぶ けして、さいしょから やりなおす？`, [
      { label: 'やめる', value: 'no', primary: true },
      { label: 'けす', value: 'yes' },
    ]);
    if (a !== 'yes') return;
    const b = await dialog('ほんとうに いいの？ もとに もどせないよ。', [
      { label: 'やめる', value: 'no', primary: true },
      { label: 'ほんとうに けす', value: 'yes' },
    ]);
    if (b !== 'yes') return;
    remove(`venom.${profile.id}`);
    s = G.newSave();
    renderProfile();
  };
  show('s-settings');
}

// 遊んでいる間、1分ごとに すこし おなかが へる
setInterval(() => {
  if (!profile || !s) return;
  const c = G.current(s);
  if (!c) return;
  G.tick(c);
  persist();
  if (scr('s-home').classList.contains('on') && !document.querySelector('.dlg-back')) renderHome();
}, 60_000);

renderTitle();
