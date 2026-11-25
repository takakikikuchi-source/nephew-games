// ベノムモンスター：画面と操作（v2：レベル・チームバトル・強さ3つ）
import { PROFILE_CSS, renderProfilePicker, type Profile } from '../common/profiles';
import { COMMON_CSS, dialog, sleep as wait, toast } from '../common/ui';
import { esc, rb } from '../common/text';
import { bgm, getSoundSettings, setSoundSettings, sfx, unlockAudio, type Song } from '../common/sound';
import { exportAll, importAll, remove } from '../common/storage';
import {
  AREAS,
  BOSSES,
  FOODS,
  MED_CARDS,
  PTYPES,
  PTYPE_IDS,
  RARITY,
  SPECIES,
  SPECIES_IDS,
  STAT_INFO,
  STAT_KEYS,
  type FoodId,
  type Habitat,
  type PType,
  type StatKey,
} from './data';
import { bossSvg, creatureSvg, eggSvg } from './art';
import * as G from './state';
import { TeamBattle, markLabels, type BattleEvent, type Choice } from './battle';

const css = document.createElement('style');
css.textContent = PROFILE_CSS + COMMON_CSS;
document.head.appendChild(css);

const HOME_SONG: Song = {
  bpm: 96,
  wave: 'triangle',
  melody: [[72, 1], [76, 1], [79, 1], [76, 1], [74, 1], [77, 1], [81, 1], [77, 1], [72, 1], [76, 1], [79, 1], [84, 1], [83, 2], [79, 2]],
  bass: [[48, 4], [53, 4], [48, 4], [43, 4]],
};
const BATTLE_SONG: Song = {
  bpm: 150,
  wave: 'square',
  melody: [[69, 0.5], [72, 0.5], [76, 0.5], [72, 0.5], [69, 0.5], [72, 0.5], [77, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [67, 0.5], [71, 0.5], [74, 1], [76, 1]],
  bass: [[45, 2], [45, 2], [43, 2], [40, 2]],
};

const DECOS: Record<Habitat | 'egg', [string, number, number][]> = {
  desert: [['🌵', 6, 58], ['🪨', 80, 76], ['🌵', 86, 40], ['☀️', 8, 6]],
  town: [['🧱', 6, 70], ['🕳️', 82, 78], ['🍂', 76, 20]],
  forest: [['🌲', 4, 30], ['🌲', 84, 26], ['🍂', 12, 80], ['🍄', 82, 76]],
  field: [['🌾', 4, 66], ['🌾', 86, 70], ['🌼', 12, 84], ['🌿', 80, 24]],
  river: [['🪷', 8, 76], ['🌿', 84, 24], ['💧', 18, 14], ['🪨', 82, 80]],
  sea: [['🫧', 8, 20], ['🪸', 6, 76], ['🐚', 84, 80], ['🫧', 86, 30]],
  rainforest: [['🌿', 2, 40], ['🍃', 84, 22], ['💧', 18, 14], ['🌺', 8, 78]],
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

const spName = (c: G.Creature) => (c.hatched ? SPECIES[c.species].name : '？？？の たまご');
const artOf = (c: G.Creature) => (c.hatched ? creatureSvg(c.species, G.stageOf(c)) : eggSvg(SPECIES[c.species].rarity));

function topbar(back?: string): string {
  return `<header class="topbar">
    <div class="who">${profile.icon} ${esc(profile.name)}</div>
    <div class="chip">📅 ${s.day}{日|にち}め</div>
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
  const map: Record<string, () => void> = {
    home: renderHome,
    nakama: renderNakama,
    zukan: renderZukan,
    settings: renderSettings,
    gacha: renderGacha,
    lab: renderLab,
    battle: renderBattleSelect,
  };
  map[where]?.();
}

// ======================= タイトル・プロフィール =======================
function renderTitle(): void {
  const el = scr('s-title');
  el.innerHTML = `
    <div class="title-art">
      <div class="mini">${creatureSvg('sasori', 3)}</div><div class="mini">${creatureSvg('yadoku', 3)}</div>
      <div class="mini">${creatureSvg('hyoumon', 3)}</div><div class="mini">${creatureSvg('cobra', 3)}</div>
    </div>
    <h1 class="logo">ベノムモンスター</h1>
    <p class="logo-sub">もうどく いきもの いくせいゲーム</p>
    <button class="btn primary" id="start" style="font-size:28px;padding:16px 48px">はじめる</button>
    <a href="index.html" style="color:#c9bdf0;font-size:16px">◀ ほかの ゲーム</a>`;
  el.querySelector<HTMLButtonElement>('#start')!.onclick = () => {
    unlockAudio();
    sfx('good');
    bgm.play(HOME_SONG);
    renderProfile();
  };
  show('s-title');
}

function renderProfile(): void {
  renderProfilePicker(
    scr('s-profile'),
    async (p) => {
      profile = p;
      const r = G.loadGame(p.id);
      if (!r.ok) {
        await dialog('この データは、あたらしい ばんの ゲームで つくられているよ。ゲームを さいしんに してから あそんでね。', [{ label: 'OK', value: 'ok', primary: true }]);
        return;
      }
      s = r.save;
      if (s.creatures.length === 0) {
        await dialog(`<b>ようこそ ベノムラボへ！</b><br>ここでは ほんものの どく{生|い}き{物|もの}を、たまごから そだてるよ。<br>まずは むりょうで たまごを 1こ ひいてみよう！`, [
          { label: 'ガチャへ いく', value: 'ok', primary: true },
        ]);
        renderGacha();
      } else renderHome();
    },
    () => sfx('click'),
  );
  show('s-profile');
}

// ======================= ホーム =======================
function bubbleText(c: G.Creature): string {
  if (!c.hatched) return 'ねると たまごが かえるよ';
  const st = G.stats(c);
  if (c.hp <= 0) return 'つかれて ねむっている… 💤';
  if (c.hp < st.maxHp / 3) return 'HPが すくない… ねて かいふくしよう';
  if (c.mealsToday < G.MAX_MEALS) return 'おなか すいた！ 🍽️';
  return ['バトルに いこう！ ⚔️', 'もっと つよく なりたい！', 'きょうも がんばる！'][s.day % 3];
}

function statCard(k: StatKey, c: G.Creature): string {
  const st = G.stats(c);
  const info = STAT_INFO[k];
  const bonus = c.bonus[k] * (k === 'hp' ? G.HP_PER_POINT : 1);
  if (k === 'hp') {
    const pct = Math.max(0, Math.min(100, (c.hp / st.maxHp) * 100));
    return `<div class="scard" style="--sc:${info.color}"><div class="sname">${info.icon} ${info.name}</div>
      <div class="sval">${c.hp}<small> / ${st.maxHp}</small></div>
      <div class="sbar"><div style="width:${pct}%;background:${pct < 34 ? '#ff6b6b' : '#51cf66'}"></div></div>
      <div class="sbonus">ごはん・トレーニングで +${bonus}</div></div>`;
  }
  const v = k === 'atk' ? st.atk : st.def;
  return `<div class="scard" style="--sc:${info.color}"><div class="sname">${info.icon} ${info.name}</div>
    <div class="sval">${v}</div><div class="sbar"><div style="width:${Math.min(100, v)}%;background:${info.color}"></div></div>
    <div class="sbonus">ごはん・トレーニングで +${bonus}</div></div>`;
}

const dots = (n: number, max: number) => '●'.repeat(Math.min(n, max)) + '○'.repeat(Math.max(0, max - n));

function renderHome(): void {
  const c = G.focused(s);
  if (!c) return renderGacha();
  bgm.play(HOME_SONG);
  const sp = SPECIES[c.species];
  const hab = c.hatched ? sp.habitat : 'egg';
  const st = G.stageOf(c);
  const team = G.teamMembers(s);
  const A = (act: string, ic: string, label: string, cls = '', dis = false) =>
    `<button class="act ${cls}" data-act="${act}" ${dis ? 'disabled' : ''}><span class="ic">${ic}</span>${rb(label)}</button>`;
  const lvBox = c.hatched
    ? c.level >= G.MAX_LEVEL
      ? `<div class="lvrow"><span class="lv">Lv ${c.level}</span><span>さいこう レベル！</span></div>`
      : `<div class="lvrow"><span class="lv">Lv ${c.level}</span><span>つぎの レベルまで あと <b>${G.expToNext(c.level) - c.exp}</b></span></div>
         <div class="xpbar"><div style="width:${(c.exp / G.expToNext(c.level)) * 100}%"></div></div>`
    : '<div class="lvrow"><span class="lv">たまご</span><span>ねると かえるよ</span></div>';
  const el = scr('s-home');
  el.innerHTML = rb(`${topbar()}
  <main class="home-main">
    <div class="habitat hab-${hab} ${blacklight && sp.glow && c.hatched ? 'blacklight' : ''}" id="habitat">
      ${DECOS[hab].map(([e, x, y]) => `<span class="deco" style="left:${x}%;top:${y}%">${e}</span>`).join('')}
      <div class="bubble">${bubbleText(c)}</div>
      <div class="creature s${st} ${c.hatched ? '' : 'egg'} ${c.hatched && c.hp <= 0 ? 'tired' : ''}" id="creature"><div class="bob">${artOf(c)}</div></div>
      ${sp.glow && c.hatched ? `<button class="blb" id="blb">🔦 ブラックライト ${blacklight ? 'OFF' : 'ON'}</button>` : ''}
      <div class="name-tag">${spName(c)}${c.hatched ? `（${sp.stageNames[st - 1]}）` : ''}</div>
    </div>
    <aside class="panel">
      ${lvBox}
      ${c.hatched ? `<div class="scards">${STAT_KEYS.map((k) => statCard(k, c)).join('')}</div>` : ''}
      ${c.hatched ? `<div class="today">きょうの ごはん <b>${dots(c.mealsToday, G.MAX_MEALS)}</b>　トレーニング <b>${dots(c.trainsToday, G.MAX_TRAINS)}</b></div>` : ''}
      <div class="teamrow">${[0, 1, 2]
        .map((i) => {
          const m = team[i];
          if (!m) return `<button class="tslot empty" data-go="nakama">＋<span>なかまから えらぶ</span></button>`;
          const ms = G.stats(m);
          return `<button class="tslot ${m.uid === c.uid ? 'on' : ''}" data-focus="${m.uid}"><span class="tpic">${artOf(m)}</span>
            <span class="tname">${m.hatched ? `Lv${m.level}` : 'たまご'}</span>
            ${m.hatched ? `<span class="thp"><span style="width:${(m.hp / ms.maxHp) * 100}%"></span></span>` : ''}</button>`;
        })
        .join('')}</div>
      <div class="actions">
        ${A('feed', '🍽️', 'ごはん', '', !c.hatched || c.mealsToday >= G.MAX_MEALS)}
        ${A('train', '🏋️', 'トレーニング', '', !c.hatched || c.trainsToday >= G.MAX_TRAINS)}
        ${A('battle', '⚔️', 'バトル', 'battle')}
        ${A('sleep', '🌙', 'ねる', 'sleep')}
        ${A('lab', '🧪', 'どくラボ', 'lab')}
        ${A('gacha', '🥚', 'ガチャ', 'gacha')}
        ${s.essence > 0 && c.hatched && c.level < G.MAX_LEVEL ? A('essence', '💧', `エキスを のませる（けいけんち +${G.ESSENCE_EXP}）`, 'wide') : ''}
      </div>
    </aside>
  </main>`);
  bindTop(el);
  el.querySelector<HTMLElement>('#creature')!.onclick = (e) => void doPet(c, e);
  el.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach((b) => {
    b.onclick = () => {
      s.focus = b.dataset.focus!;
      blacklight = false;
      persist();
      sfx('click');
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
  el.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => (b.onclick = () => homeAction(c, b.dataset.act!)));
  show('s-home');
}

function homeAction(c: G.Creature, act: string): void {
  if (act === 'feed') return openFeed(c);
  if (act === 'train') return openTraining(c);
  if (act === 'sleep') return void doSleep();
  if (act === 'essence') return void drinkEssence(c);
  go(act);
}

async function doPet(c: G.Creature, e?: MouseEvent): Promise<void> {
  if (c.hatched && !s.petWarned) {
    s.petWarned = true;
    persist();
    await dialog('⚠️ ほんものの どく{生|い}き{物|もの}は、ぜったいに さわっちゃ ダメ！<br>これは ゲームの なかだけの とくべつだよ。', [{ label: 'わかった！', value: 'ok', primary: true }]);
  }
  sfx('pop');
  const hab = document.getElementById('habitat');
  if (!hab) return;
  const r = hab.getBoundingClientRect();
  const h = document.createElement('span');
  h.className = 'heart';
  h.textContent = c.hatched ? '💜' : '🔥';
  h.style.left = `${(e ? e.clientX - r.left : r.width / 2) - 16}px`;
  h.style.top = `${(e ? e.clientY - r.top : r.height / 2) - 30}px`;
  hab.appendChild(h);
  document.getElementById('creature')?.classList.add('happy');
  setTimeout(() => h.remove(), 1000);
}

async function drinkEssence(c: G.Creature): Promise<void> {
  const up = G.useEssence(s, c);
  if (up === false) return;
  persist();
  sfx('coin');
  if (up) await showLevelUps([up]);
  else toast(`けいけんち +${G.ESSENCE_EXP}！`);
  renderHome();
}

function openFeed(c: G.Creature): void {
  sfx('click');
  const sp = SPECIES[c.species];
  const m = modal(rb(`<div class="dlg-body"><h3 style="margin:0 0 12px">なにを あげる？（のこり ${G.MAX_MEALS - c.mealsToday}かい）</h3>
    <div class="foods">${G.foodChoices(c)
      .map((f) => `<button class="btn food" data-food="${f}"><span class="fe">${FOODS[f].emoji}</span>${FOODS[f].name}</button>`)
      .join('')}</div></div><div class="dlg-btns"><button class="btn" data-x>やめる</button></div>`));
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
  m.el.querySelectorAll<HTMLButtonElement>('[data-food]').forEach((b) => {
    b.onclick = async () => {
      const food = b.dataset.food as FoodId;
      const r = G.feed(c, food);
      persist();
      m.close();
      if (r.ok) {
        sfx('good');
        const info = STAT_INFO[r.stat];
        let msg = `${FOODS[food].emoji} おいしそうに たべた！<br>${info.icon} ${info.name} +${r.gain * (r.stat === 'hp' ? G.HP_PER_POINT : 1)}！`;
        if (r.poisonUp) msg += `<br>⚔️ どくも つよく なった！ ${sp.name}は たべものから どくを ためるんだ。`;
        toast(msg, 3200);
      } else if (r.reason === 'wrong') {
        sfx('bad');
        const real = sp.foods.map((f) => `${FOODS[f].emoji}${FOODS[f].name}`).join('や ');
        const why = FOODS[food].junk ? `${sp.name}は ${FOODS[food].name}は たべないよ。` : `${sp.name}は ${FOODS[food].name}は あまり たべないよ。`;
        await dialog(`${FOODS[food].emoji} ぷいっ！<br>${why}<br>ほんとうは <b>${real}</b> を たべるんだ。`, [{ label: 'わかった', value: 'ok', primary: true }]);
      }
      renderHome();
    };
  });
}

function openTraining(c: G.Creature): void {
  if (c.trainsToday >= G.MAX_TRAINS) return toast('きょうは もう つかれた みたい。ねて やすもう！');
  sfx('click');
  const st = G.stats(c);
  const cur: Record<StatKey, number> = { hp: st.maxHp, atk: st.atk, def: st.def };
  const m = modal(rb(`<div class="dlg-body"><h3 style="margin:0 0 12px">なにを きたえる？</h3>
    <div class="statpick">${STAT_KEYS.map((k) => `<button class="btn" data-stat="${k}">${STAT_INFO[k].icon} ${STAT_INFO[k].name}<br><small>いま ${cur[k]}</small></button>`).join('')}</div></div>
    <div class="dlg-btns"><button class="btn" data-x>やめる</button></div>`));
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
  m.el.querySelectorAll<HTMLButtonElement>('[data-stat]').forEach((b) => (b.onclick = () => runTiming(c, b.dataset.stat as StatKey, m)));
}

function runTiming(c: G.Creature, stat: StatKey, m: { el: HTMLElement; close: () => void }): void {
  sfx('click');
  const center = 25 + Math.random() * 50;
  const dlg = m.el.querySelector('.dlg')!;
  dlg.innerHTML = rb(`<div class="dlg-body" style="text-align:center"><h3 style="margin:0">${STAT_INFO[stat].icon} ${STAT_INFO[stat].name} トレーニング</h3>
    <div>しろい ぼうが みどりに きたら「ストップ！」（スペースキーでも OK）</div>
    <div class="tbar" id="tbar">
      <div class="tzone" style="left:${center - 16}%;width:32%;background:#2b8a3e"></div>
      <div class="tzone" style="left:${center - 9}%;width:18%;background:#51cf66"></div>
      <div class="tzone" style="left:${center - 4}%;width:8%;background:#d3f9d8"></div>
      <div class="tmark" id="tmark"></div>
    </div>
    <div class="tres" id="tres">のこり 3かい</div>
    <button class="btn primary" id="tstop" style="font-size:28px;padding:14px 50px">ストップ！</button></div>`);
  const mark = dlg.querySelector<HTMLElement>('#tmark')!;
  const res = dlg.querySelector<HTMLElement>('#tres')!;
  let t0 = performance.now();
  let tries = 0;
  let total = 0;
  let pos = 0;
  let paused = false;
  let raf = 0;
  const speed = 1.6 + G.stageOf(c) * 0.25;
  const loop = (now: number) => {
    if (!paused) {
      pos = 50 + 48 * Math.sin(((now - t0) / 1000) * speed);
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
      const gain = G.applyTraining(c, stat, total);
      persist();
      sfx('levelup');
      res.innerHTML = rb(`${STAT_INFO[stat].icon} ${STAT_INFO[stat].name}が <b>+${stat === 'hp' ? gain * G.HP_PER_POINT : gain}</b> あがった！`);
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

async function doSleep(): Promise<void> {
  sfx('click');
  const eggs = s.creatures.some((c) => !c.hatched);
  const ok = await dialog(`ねる？ 1にち すすんで、みんなの HPが ぜんぶ かいふくするよ。${eggs ? '<br>たまごも かえるよ！' : ''}`, [
    { label: 'ねる', value: 'yes', primary: true },
    { label: 'まだ', value: 'no' },
  ]);
  if (ok !== 'yes') return;
  const night = document.createElement('div');
  night.className = 'night';
  night.textContent = '🌙 💤';
  document.body.appendChild(night);
  await wait(1400);
  const r = G.sleep(s);
  persist();
  night.remove();
  const lines: string[] = ['☀️ おはよう！ みんな げんきに なった（HP かいふく）'];
  if (r.hatched.length) sfx('hatch');
  else sfx('coin');
  for (const uid of r.hatched) {
    const c = s.creatures.find((x) => x.uid === uid)!;
    const sp = SPECIES[c.species];
    lines.push(`<div style="width:150px;height:150px;margin:6px auto">${creatureSvg(c.species, 1)}</div><b>たまごが かえった！ ${sp.name}が うまれた！</b>`);
    lines.push(`<div class="factbox">📖 まめちしき：${sp.facts[0]}</div>`);
  }
  if (r.newOwned.length) lines.push('📖 ずかんに あたらしい いきものが のった！');
  lines.push(`🪙 +${r.coins}`);
  if (r.moto) lines.push(`どくのもと「${PTYPES[r.moto].icon}${PTYPES[r.moto].name}」を 1こ ゲット！`);
  await dialog(lines.join('<br>'), [{ label: 'OK', value: 'ok', primary: true }]);
  renderHome();
}

async function showLevelUps(ups: G.LevelUp[]): Promise<void> {
  if (!ups.length) return;
  sfx('levelup');
  const parts: string[] = [];
  for (const u of ups) {
    const c = s.creatures.find((x) => x.uid === u.uid);
    if (!c) continue;
    const sp = SPECIES[c.species];
    parts.push(`<b>${sp.name}が レベル${u.to}に なった！</b>`);
    if (u.newStage) {
      const st = G.stageOf(c);
      parts.push(`<div style="width:140px;height:140px;margin:6px auto">${creatureSvg(c.species, st)}</div>✨ ${sp.stageNames[st - 1]}に せいちょうした！`);
      parts.push(`<div class="factbox">📖 まめちしき：${sp.facts[st - 1]}</div>`);
    }
  }
  await dialog(parts.join('<br>'), [{ label: 'やったね！', value: 'ok', primary: true }]);
}

// ======================= ガチャ =======================
function renderGacha(): void {
  const el = scr('s-gacha');
  el.innerHTML = rb(`${topbar(s.creatures.length ? 'home' : undefined)}
  <div class="page">
    <h2>たまごガチャ</h2>
    <div class="machine" id="machine">
      <div class="dome"></div>
      <div class="balls">${[0, 1, 2, 3, 4].map((i) => `<span style="left:${22 + i * 12}%;top:${18 + (i % 2) * 16}%">🥚</span>`).join('')}</div>
      <div class="base"></div><div class="slot"></div><div class="knob"></div>
    </div>
    <div id="gout" style="min-height:40px"></div>
    <button class="btn primary" id="pull" style="font-size:26px;padding:14px 40px">${s.freeGacha ? 'むりょうで ひく！' : `🪙${G.GACHA_COST}で ひく`}</button>
    <div class="hint">ノーマル 60% ／ レア 30% ／ げきレア 10%　・　${SPECIES_IDS.length}しゅるい　・　おなじ いきものが でたら「どくエキス」に なるよ</div>
  </div>`);
  bindTop(el);
  el.querySelector<HTMLButtonElement>('#pull')!.onclick = () => void pull();
  show('s-gacha');
}

async function pull(): Promise<void> {
  if (!G.canGacha(s)) {
    sfx('bad');
    toast('コインが たりないよ。バトルで コインを ためよう！', 3200);
    return;
  }
  const el = scr('s-gacha');
  el.querySelector<HTMLButtonElement>('#pull')!.disabled = true;
  sfx('click');
  el.querySelector('#machine')!.classList.add('spin');
  await wait(1200);
  const r = G.rollGacha(s)!;
  persist();
  el.querySelector<HTMLElement>('#gout')!.innerHTML = `<div class="gacha-egg" id="gegg">${eggSvg(r.rarity)}</div><div style="text-align:center;font-size:24px;font-weight:700;color:${RARITY[r.rarity].color}">${RARITY[r.rarity].name}の たまご！</div>`;
  sfx(r.rarity === 'N' ? 'coin' : 'levelup');
  await wait(900);
  el.querySelector('#gegg')?.classList.add('shake');
  await wait(1300);
  if (r.kind === 'dup') {
    await dialog(
      `<div style="width:150px;height:150px;margin:auto">${creatureSvg(r.species, 3)}</div>なかを みたら… <b>${SPECIES[r.species].name}</b>だった！<br>もう なかまに いるので、<b>どくエキス ×${r.essence}</b> に なった！<br><small>どくエキスは、のませると けいけんちに なるよ。</small>`,
      [{ label: 'OK', value: 'ok', primary: true }],
    );
    renderGacha();
    return;
  }
  const inTeam = s.team.includes(r.creature.uid);
  await dialog(`あたらしい たまご！ なにが うまれるかな？<br>ねると かえるよ。${inTeam ? '<br>チームに はいったよ！' : '<br>チームが いっぱいなので、なかまで いれかえてね。'}`, [
    { label: 'OK', value: 'ok', primary: true },
  ]);
  s.focus = r.creature.uid;
  persist();
  renderHome();
}

// ======================= どくラボ =======================
function renderLab(): void {
  const el = scr('s-lab');
  const c = G.focused(s);
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
            </div></div>`;
        }).join('')}
      </div>
      <div class="flask">
        <div class="slots"><div class="slotx">${labSlots[0] ? PTYPES[labSlots[0]].icon : ''}</div>＋<div class="slotx">${labSlots[1] ? PTYPES[labSlots[1]].icon : ''}</div></div>
        <div class="pot" id="pot">⚗️</div>
        <div style="display:flex;gap:10px">
          <button class="btn primary" id="mix" ${labSlots.length < 2 ? 'disabled' : ''}>まぜる！</button>
          <button class="btn" id="clear" ${labSlots.length === 0 ? 'disabled' : ''}>とりだす</button>
        </div>
        ${
          c && c.hatched
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
    renderLab();
  };
  el.querySelector<HTMLButtonElement>('#mix')!.onclick = () => void mix();
  show('s-lab');
}

async function mix(): Promise<void> {
  if (labSlots.length < 2) return;
  const [a, b] = labSlots;
  document.getElementById('pot')?.classList.add('brew');
  sfx('click');
  await wait(1600);
  const r = G.craft(s, a, b);
  labSlots = [];
  if (!r) return renderLab();
  persist();
  sfx('levelup');
  const kinds = [...new Set(r.move.types)];
  let html = `<b>あたらしい どく「${esc(r.move.name)}」が できた！</b><br>${r.move.types.map((t) => PTYPES[t].icon).join(' ＋ ')}<br>`;
  html += kinds.map((t) => `・${PTYPES[t].name}：${PTYPES[t].effect}`).join('<br>');
  if (r.newCard) {
    const card = MED_CARDS.find((m) => m.id === r.newCard)!;
    html += `<div class="factbox" style="background:#e6fcf5">💊 <b>くすりカードを ゲット！</b><br>${card.from}の どくから、<b>${card.drug}</b>（${card.use}）が うまれたんだ。</div>`;
  }
  await dialog(html, [{ label: 'つぎへ', value: 'ok', primary: true }]);
  const c = G.focused(s);
  if (!c || !c.hatched) {
    toast('うまれた いきもの しか わざを おぼえられないよ');
    return renderLab();
  }
  if (c.moves.length < G.MAX_MOVES) {
    G.learn(c, r.move);
    sfx('good');
    toast(`${SPECIES[c.species].name}は「${esc(r.move.name)}」を おぼえた！`);
  } else {
    const pick = await dialog(`わざは 4つまで。どれを わすれて「${esc(r.move.name)}」を おぼえる？`, [
      ...c.moves.map((mv, i) => ({ label: `${esc(mv.name)} を わすれる`, value: String(i) })),
      { label: 'おぼえない', value: 'no' },
    ]);
    if (pick !== 'no') {
      G.learn(c, r.move, Number(pick));
      sfx('good');
    }
  }
  persist();
  renderLab();
}

// ======================= バトルを えらぶ =======================
function renderBattleSelect(): void {
  const el = scr('s-boss');
  const top = G.topLevel(s);
  el.innerHTML = rb(`${topbar('home')}
  <div class="page">
    <h2>⚔️ バトル</h2>
    <div class="hint" style="font-size:17px">チームの いちばん たかい レベル：<b style="color:#fff">Lv${top}</b></div>
    <h3 class="sect">やせいの いきもの（なんかいでも たたかえる）</h3>
    <div class="cards">${AREAS.map((a, i) => {
      const open = G.areaUnlocked(s, i);
      const pool = SPECIES_IDS.filter((id) => SPECIES[id].area === a.id);
      const met = pool.filter((id) => s.met.includes(id) || s.owned.includes(id)).length;
      return `<button class="card area ${open ? '' : 'locked'}" data-area="${i}" ${open ? '' : 'disabled'} style="background:${a.bg}">
        <span class="aicon">${a.icon}</span><span class="ttl">${a.name}</span>
        <span class="sub">${open ? `Lv${a.levels[0]}〜${a.levels[1]}　であった ${met}/${pool.length}` : `Lv${a.unlockLevel}に なると いける`}</span></button>`;
    }).join('')}</div>
    <h3 class="sect">ボス</h3>
    <div class="cards">${BOSSES.map((b, i) => {
      const beaten = s.bossBeaten.includes(b.id);
      const weak = Object.keys(b.resist) as PType[];
      return `<div class="card" style="width:250px"><div class="pic" style="width:150px;height:150px">${bossSvg(b.id)}</div>
        <div class="ttl">${b.name} ${beaten ? '✅' : ''}</div>
        <div class="sub">おすすめ Lv${b.recLevel}<br>ききにくい どく：${weak.length ? weak.map((t) => PTYPES[t].icon + PTYPES[t].name).join('、') : 'なし'}</div>
        <button class="btn ${beaten ? '' : 'pink'}" data-boss="${i}">${beaten ? 'もういちど' : 'たたかう！'}</button></div>`;
    }).join('')}</div>
  </div>`);
  bindTop(el);
  const ready = () => {
    const fighters = G.teamMembers(s).filter((c) => c.hatched && c.hp > 0);
    if (!fighters.length) {
      toast(G.teamMembers(s).some((c) => c.hatched) ? 'チームが つかれているよ。ねて かいふくしよう！' : 'たまごの ままでは たたかえないよ。ねて かえそう！', 3000);
      return null;
    }
    return fighters;
  };
  el.querySelectorAll<HTMLButtonElement>('[data-area]').forEach((b) => {
    b.onclick = () => {
      const f = ready();
      if (f) startBattle(f, G.rollWild(Number(b.dataset.area)), null);
    };
  });
  el.querySelectorAll<HTMLButtonElement>('[data-boss]').forEach((b) => {
    b.onclick = () => {
      const f = ready();
      if (f) startBattle(f, null, Number(b.dataset.boss));
    };
  });
  show('s-boss');
}

// ======================= バトル =======================
function unitCard(side: 'p' | 'e', i: number, name: string, lv: number, hp: number, max: number, art: string): string {
  return `<div class="unit ${side}" data-side="${side}" data-idx="${i}">
    <div class="uhp"><div class="unm"><span>${name}</span><span>Lv${lv}</span></div>
      <div class="track"><div class="fill" style="width:${(hp / max) * 100}%"></div></div>
      <div class="uhpn">${hp}/${max}</div><div class="marks"></div></div>
    <div class="pic">${art}</div></div>`;
}

function startBattle(team: G.Creature[], wild: { species: string; level: number }[] | null, bossIndex: number | null): void {
  sfx('click');
  bgm.play(BATTLE_SONG);
  const battle = new TeamBattle(team, wild, bossIndex);
  const bg = bossIndex != null ? BOSSES[bossIndex].bg : AREAS[AREAS.findIndex((a) => SPECIES[wild![0].species].area === a.id)]?.bg ?? AREAS[0].bg;
  const el = scr('s-battle');
  el.innerHTML = rb(`
  <div class="arena" style="background:${bg}">
    <div class="row enemies">${battle.enemies
      .map((u) => unitCard('e', u.idx, u.name, u.level, u.hp, u.maxHp, bossIndex != null ? bossSvg(BOSSES[bossIndex].id) : creatureSvg(u.species!, 3)))
      .join('')}</div>
    <div class="row players">${battle.players
      .map((u, i) => unitCard('p', u.idx, u.name, u.level, u.hp, u.maxHp, artOf(team[i])))
      .join('')}</div>
  </div>
  <div class="bpanel">
    <div class="msg" id="bmsg">${bossIndex != null ? `${BOSSES[bossIndex].name}が あらわれた！` : `やせいの ${battle.enemies.map((e) => e.name).join('と ')}が あらわれた！`}</div>
    <div class="cmd" id="cmd"></div>
  </div>`);
  const msg = el.querySelector<HTMLElement>('#bmsg')!;
  const cmd = el.querySelector<HTMLElement>('#cmd')!;
  const unitEl = (side: string, idx: number) => el.querySelector<HTMLElement>(`.unit[data-side="${side}"][data-idx="${idx}"]`)!;
  const refresh = () => {
    for (const u of [...battle.players, ...battle.enemies]) {
      const ue = unitEl(u.side, u.idx);
      const pct = (u.hp / u.maxHp) * 100;
      const fill = ue.querySelector<HTMLElement>('.fill')!;
      fill.style.width = `${pct}%`;
      fill.className = `fill ${pct <= 20 ? 'crit' : pct <= 50 ? 'low' : ''}`;
      ue.querySelector<HTMLElement>('.uhpn')!.textContent = `${u.hp}/${u.maxHp}`;
      ue.querySelector<HTMLElement>('.marks')!.innerHTML = markLabels(u).map(([l, c]) => `<span style="background:${c}">${l}</span>`).join('');
      ue.classList.toggle('ko', u.hp <= 0);
    }
  };
  let choices: Choice[] = [];
  let actor = 0;
  const nextActor = () => {
    while (actor < battle.players.length && battle.players[actor].hp <= 0) actor++;
    if (actor >= battle.players.length) return void runTurn();
    const u = battle.players[actor];
    el.querySelectorAll('.unit.p').forEach((x) => x.classList.toggle('active', Number((x as HTMLElement).dataset.idx) === actor));
    msg.innerHTML = rb(`${esc(u.name)}の ばん。わざを えらんでね`);
    cmd.innerHTML = rb(
      u.moves.map((m, i) => `<button class="bmove" data-mv="${i}">${m.types.map((t) => PTYPES[t].icon).join('') || '👊'} ${esc(m.name)}</button>`).join('') +
        `<button class="bmove run" data-run>🏃 にげる</button>`,
    );
    cmd.querySelectorAll<HTMLButtonElement>('[data-mv]').forEach((b) => (b.onclick = () => chooseTarget(Number(b.dataset.mv))));
    cmd.querySelector<HTMLButtonElement>('[data-run]')!.onclick = () => void runAway();
  };
  const chooseTarget = (mv: number) => {
    sfx('click');
    const alive = battle.alive('e');
    if (alive.length === 1) {
      choices[actor] = { move: mv, target: alive[0].idx };
      actor++;
      return nextActor();
    }
    msg.innerHTML = 'だれを ねらう？ てきを タップしてね';
    cmd.innerHTML = '';
    alive.forEach((e) => {
      const ue = unitEl('e', e.idx);
      ue.classList.add('targetable');
      ue.onclick = () => {
        el.querySelectorAll('.unit.e').forEach((x) => {
          x.classList.remove('targetable');
          (x as HTMLElement).onclick = null;
        });
        choices[actor] = { move: mv, target: e.idx };
        actor++;
        nextActor();
      };
    });
  };
  const runTurn = async () => {
    el.querySelectorAll('.unit.p').forEach((x) => x.classList.remove('active'));
    cmd.innerHTML = '';
    const events = battle.turn(choices);
    choices = [];
    actor = 0;
    await play(events);
    if (!battle.over) nextActor();
  };
  const play = async (events: BattleEvent[]) => {
    for (const e of events) {
      if (e.kind === 'text') {
        msg.innerHTML = rb(esc(e.text));
        await wait(750);
      } else if (e.kind === 'hit') {
        const ue = unitEl(e.side, e.idx);
        const pic = ue.querySelector<HTMLElement>('.pic')!;
        pic.classList.remove('shake', 'flash');
        void pic.offsetWidth;
        pic.classList.add('shake', 'flash');
        sfx('hit');
        const r = pic.getBoundingClientRect();
        const d = document.createElement('div');
        d.className = `dmg ${e.crit ? 'crit' : ''}`;
        d.textContent = `-${e.amount}`;
        d.style.left = `${r.left + r.width / 2 - 30}px`;
        d.style.top = `${r.top + r.height / 3}px`;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 1000);
        refresh();
        await wait(450);
      } else if (e.kind === 'mark' || e.kind === 'ko') {
        refresh();
        sfx(e.kind === 'ko' ? 'miss' : 'pop');
        await wait(250);
      } else if (e.kind === 'end') {
        await wait(400);
        await finish(e.win);
        return;
      }
    }
    refresh();
  };
  const writeBack = () => battle.players.forEach((u, i) => (team[i].hp = u.hp));
  const runAway = async () => {
    const a = await dialog('にげる？', [
      { label: 'にげる', value: 'yes' },
      { label: 'たたかう', value: 'no', primary: true },
    ]);
    if (a !== 'yes') return;
    writeBack();
    persist();
    bgm.play(HOME_SONG);
    renderBattleSelect();
  };
  const finish = async (win: boolean) => {
    writeBack();
    const survivors = team.filter((c) => c.hp > 0);
    if (win) {
      sfx('win');
      if (bossIndex != null) {
        const boss = BOSSES[bossIndex];
        const r = G.bossReward(s, bossIndex, survivors);
        persist();
        let html = `<b>🎉 ${boss.name}を たおした！</b><br>けいけんち +${r.exp}　🪙 +${r.coins}<br>どくのもと ぜんぶの しゅるい +${r.moto}`;
        if (r.first) html += `<div class="factbox">📖 ${boss.fact}</div>`;
        if (r.first && bossIndex === BOSSES.length - 1) html += '<br><b>👑 ぜんぶの ボスを たおした！ きみは ベノムマスター！</b>';
        await dialog(html, [{ label: 'OK', value: 'ok', primary: true }]);
        await showLevelUps(r.ups);
      } else {
        const r = G.wildReward(s, wild!, survivors);
        persist();
        const drops = r.moto.map((t) => PTYPES[t].icon + PTYPES[t].name).join('、');
        await dialog(`<b>🎉 かった！</b><br>けいけんち +${r.exp}（たおれていない なかま みんなに）<br>🪙 +${r.coins}${drops ? `<br>どくのもと ゲット：${drops}` : ''}`, [{ label: 'OK', value: 'ok', primary: true }]);
        await showLevelUps(r.ups);
      }
    } else {
      sfx('lose');
      persist();
      const hint = bossIndex != null ? `<div class="factbox" style="background:#fff4d6">💡 ヒント：${BOSSES[bossIndex].hint}</div><div class="factbox">📖 ${BOSSES[bossIndex].fact}</div>` : '<div class="factbox" style="background:#fff4d6">💡 ねて HPを かいふくしてから、もういちど いどもう！ ごはんや トレーニングでも つよく なれるよ。</div>';
      await dialog(`まけちゃった… でも だいじょうぶ！<br>${hint}`, [{ label: 'OK', value: 'ok', primary: true }]);
    }
    bgm.play(HOME_SONG);
    renderBattleSelect();
  };
  refresh();
  show('s-battle');
  setTimeout(nextActor, 900);
}

// ======================= なかま（チームへんしゅう） =======================
function renderNakama(): void {
  const el = scr('s-nakama');
  el.innerHTML = rb(`${topbar('home')}
  <div class="page">
    <h2>🐾 なかま</h2>
    <div class="hint" style="font-size:17px">チームは 3びきまで。チームの なかまが バトルに でるよ。</div>
    <div class="cards">${s.creatures
      .map((c) => {
        const inTeam = s.team.includes(c.uid);
        const st = G.stats(c);
        return `<div class="card ${inTeam ? 'sel' : ''}">
          <div class="pic">${artOf(c)}</div>
          <div class="ttl">${spName(c)}</div>
          <div class="sub">${c.hatched ? `Lv${c.level}　❤️${c.hp}/${st.maxHp}　⚔️${st.atk}　🛡️${st.def}` : 'ねると かえるよ'}</div>
          <div class="cardbtns">
            <button class="btn small" data-team="${c.uid}">${inTeam ? 'チームから はずす' : 'チームに いれる'}</button>
            <button class="btn small" data-look="${c.uid}">ホームで みる</button>
          </div></div>`;
      })
      .join('')}</div>
  </div>`);
  bindTop(el);
  el.querySelectorAll<HTMLButtonElement>('[data-team]').forEach((b) => {
    b.onclick = () => {
      const u = b.dataset.team!;
      if (s.team.includes(u)) s.team = s.team.filter((x) => x !== u);
      else if (s.team.length >= G.TEAM_SIZE) return toast('チームは 3びきまで。だれかを はずしてね');
      else s.team.push(u);
      sfx('click');
      persist();
      renderNakama();
    };
  });
  el.querySelectorAll<HTMLButtonElement>('[data-look]').forEach((b) => {
    b.onclick = () => {
      s.focus = b.dataset.look!;
      blacklight = false;
      persist();
      go('home');
    };
  });
  show('s-nakama');
}

// ======================= ずかん =======================
function renderZukan(): void {
  const el = scr('s-zukan');
  const tabs: [typeof zTab, string][] = [['ikimono', '🐍 いきもの'], ['doku', '🧪 どく'], ['boss', '⚔️ ボス'], ['kusuri', '💊 くすりカード']];
  let body = '';
  if (zTab === 'ikimono') {
    body = `<div class="hint" style="font-size:17px">なかまに した いきもの ${s.owned.length} / ${SPECIES_IDS.length}　・　であった いきもの ${new Set([...s.owned, ...s.met]).size}</div>
    ${AREAS.map(
      (a) => `<h3 class="sect">${a.icon} ${a.name}</h3><div class="cards">${SPECIES_IDS.filter((id) => SPECIES[id].area === a.id)
        .map((id) => {
          const own = s.owned.includes(id);
          const met = own || s.met.includes(id);
          const sp = SPECIES[id];
          return `<div class="card zk ${met ? '' : 'locked'}" ${met ? `data-sp="${id}" style="cursor:pointer"` : ''}>
            <div class="pic">${creatureSvg(id, own ? Math.max(1, s.factsSeen[id] ?? 1) : 3)}</div>
            <div class="ttl">${met ? sp.name : '？？？'}</div><div class="sub">${RARITY[sp.rarity].name}${met && !own ? '・であった' : ''}</div></div>`;
        })
        .join('')}</div>`,
    ).join('')}`;
  } else if (zTab === 'doku') {
    body = `<div class="motos">${PTYPE_IDS.map((t) => {
      const p = PTYPES[t];
      return `<div class="moto" style="--tc:${p.color}"><div class="head">${p.icon} ${p.name}</div><div class="desc" style="font-size:16px">ほんとうの なまえ：${p.real}<br>からだへの ききかた：${p.body}<br>バトルでは：${p.effect}</div></div>`;
    }).join('')}</div>`;
  } else if (zTab === 'boss') {
    body = `<div class="cards">${BOSSES.map((b) => {
      const ok = s.bossBeaten.includes(b.id);
      return `<div class="card ${ok ? '' : 'locked'}" style="width:280px"><div class="pic">${bossSvg(b.id)}</div><div class="ttl">${ok ? b.name : '？？？'}</div><div class="sub">${ok ? `${b.where}<br>${b.fact}` : 'たおすと わかるよ'}</div></div>`;
    }).join('')}</div>`;
  } else {
    body = `<div class="hint" style="font-size:17px">どくは つかいかたしだいで くすりにも なる！ どくラボで どくを まぜると てに はいるよ。</div><div class="cards">${MED_CARDS.map((m) => {
      const ok = s.cards.includes(m.id);
      return `<div class="card" style="width:280px;${ok ? '' : 'opacity:.6'}"><div style="font-size:64px">${ok ? '💊' : '❓'}</div><div class="ttl">${ok ? m.drug : '？？？'}</div>
        <div class="sub">${ok ? `${m.from}の どくから<br>→ ${m.use}` : `ヒント：${PTYPES[m.unlock[0]].icon} と ${PTYPES[m.unlock[1]].icon} を まぜてみよう`}</div>
        ${ok ? `<button class="btn" data-card="${m.id}">もっと しる</button>` : ''}</div>`;
    }).join('')}</div>`;
  }
  el.innerHTML = rb(`${topbar('home')}<div class="page"><h2>📖 ずかん</h2>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${zTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}</div>`);
  bindTop(el);
  el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
    b.onclick = () => {
      zTab = b.dataset.tab as typeof zTab;
      sfx('click');
      renderZukan();
    };
  });
  el.querySelectorAll<HTMLElement>('[data-sp]').forEach((d) => (d.onclick = () => openSpecies(d.dataset.sp!)));
  el.querySelectorAll<HTMLButtonElement>('[data-card]').forEach((b) => {
    b.onclick = () => {
      const m = MED_CARDS.find((x) => x.id === b.dataset.card)!;
      void dialog(`💊 <b>${m.drug}</b><br>${m.use}<div class="factbox" style="background:#e6fcf5">${m.more}</div><small>※ {薬|くすり}は おいしゃさんが つかうもの。ほんものの どくは ぜったいに さわらないでね。</small>`, [{ label: 'とじる', value: 'ok', primary: true }]);
    };
  });
  show('s-zukan');
}

function openSpecies(id: string): void {
  sfx('click');
  const sp = SPECIES[id];
  const own = s.owned.includes(id);
  const stg = own ? Math.max(1, s.factsSeen[id] ?? 1) : 0;
  const facts = sp.facts.map((f, i) => (i < stg ? `<div class="fact">📖 ${f}</div>` : `<div class="fact" style="opacity:.6">？ ${own ? 'もっと そだてると わかるよ' : 'なかまに すると わかるよ'}</div>`)).join('');
  const m = modal(rb(`<div class="zk-detail">
    <div class="bigpic">${creatureSvg(id, Math.max(1, stg || 3))}</div>
    <div class="zk-text">
      <b style="font-size:26px">${sp.name}</b>（${RARITY[sp.rarity].name}）<br>
      🏠 すむところ：${sp.where}<br>📏 おおきさ：${sp.size}<br>
      🍽️ たべもの：${sp.foods.map((f) => FOODS[f].emoji + FOODS[f].name).join('、')}<br>
      🧪 どく：${sp.types.map((t) => PTYPES[t].icon + PTYPES[t].name).join('、')}<br>
      ${facts}
      ${sp.truth && own ? `<div class="truth">🔎 ほんとうは… ${sp.truth}</div>` : ''}
      <div class="safe">⚠️ ほんものを {見|み}つけても ぜったいに さわらないで、おとなに しらせてね！</div>
    </div></div><div class="dlg-btns"><button class="btn primary" data-x>とじる</button></div>`));
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
}

// ======================= せってい =======================
function renderSettings(): void {
  const el = scr('s-settings');
  const ss = getSoundSettings();
  const T = (k: keyof typeof ss, label: string) => `<div class="toggle"><span>${label}</span><button class="btn ${ss[k] ? 'primary' : ''}" data-snd="${k}">${ss[k] ? 'ON' : 'OFF'}</button></div>`;
  el.innerHTML = rb(`${topbar('home')}
  <div class="page"><h2>⚙️ せってい</h2>
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
      const r = G.loadGame(profile.id);
      if (r.ok) s = r.save;
      toast('よみこんだよ！');
      renderSettings();
    } else toast('よみこめなかった…');
  };
  el.querySelector<HTMLButtonElement>('#who')!.onclick = () => renderProfile();
  el.querySelector<HTMLButtonElement>('#reset')!.onclick = async () => {
    if ((await dialog(`${esc(profile.name)}の ベノムモンスターの データを ぜんぶ けして、さいしょから やりなおす？`, [{ label: 'やめる', value: 'no', primary: true }, { label: 'けす', value: 'yes' }])) !== 'yes') return;
    if ((await dialog('ほんとうに いいの？ もとに もどせないよ。', [{ label: 'やめる', value: 'no', primary: true }, { label: 'ほんとうに けす', value: 'yes' }])) !== 'yes') return;
    remove(`venom.${profile.id}`);
    s = G.newSave();
    renderProfile();
  };
  show('s-settings');
}

renderTitle();
