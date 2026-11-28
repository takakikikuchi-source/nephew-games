// ベノムモンスター：画面と操作（v4：たまご 1こを 15ふんで 完成体まで そだてる・じゃんけんバトル）
import { PROFILE_CSS, renderProfilePicker, type Profile } from '../common/profiles';
import { COMMON_CSS, dialog, sleep as wait, toast } from '../common/ui';
import { bindFullscreen, fullscreenButton, registerSW } from '../common/pwa';
import { esc, rb } from '../common/text';
import { bgm, getSoundSettings, setSoundSettings, sfx, unlockAudio, type Song } from '../common/sound';
import { exportAll, importAll, remove } from '../common/storage';
import {
  AREAS,
  BOSSES,
  FOODS,
  HANDS,
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
  type Hand,
  type StatKey,
} from './data';
import { bossSvg, creatureSvg, eggSvg } from './art';
import { MOVESETS, SKILLS, type MoveDef } from './moves';
import * as G from './state';
import { Duel, available, bossFighter, markLabels, playerFighter, wildFighter, type BattleEvent, type Fighter, type Side } from './battle';

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
let zTab: 'ikimono' | 'hall' | 'doku' | 'boss' | 'kusuri' = 'ikimono';
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

// 完成体の 絵（おとなの 絵に きんいろの ひかり）
const kanseiArt = (id: string, flip = false) => `<div class="kansei">${creatureSvg(id, 3, flip)}</div>`;

function topbar(back?: string): string {
  return `<header class="topbar">
    <div class="who">${profile.icon} ${esc(profile.name)}</div>
    <div class="chip">👑 でんどう ${new Set(s.hall.map((h) => h.species)).size} / ${SPECIES_IDS.length}</div>
    <div class="spacer"></div>
    ${
      back
        ? `<button class="tb" data-back="${back}">◀ もどる</button>`
        : `<button class="tb" data-go="zukan">📖 ずかん</button><button class="tb" data-go="settings">⚙️ せってい</button>`
    }
  </header>`;
}
function bindTop(el: HTMLElement): void {
  el.querySelectorAll<HTMLButtonElement>('[data-back]').forEach((b) => (b.onclick = () => go(b.dataset.back!)));
  el.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go!)));
}
function go(where: string): void {
  sfx('click');
  const map: Record<string, () => void> = { home: renderHome, zukan: renderZukan, settings: renderSettings };
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
    <a href="index.html" style="color:#c9bdf0;font-size:16px">◀ ほかの ゲーム</a>${fullscreenButton()}`;
  bindFullscreen(el);
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
      persist();
      if (!s.run && !G.doneToday(s) && s.gachaCount === 0 && s.hall.length === 0) {
        await dialog(
          `<b>ようこそ ベノムラボへ！</b><br>ほんものの どく{生|い}き{物|もの}を、たまごから「かんせいたい」まで そだてよう。<br>
          あかちゃん → こども → おとなで、それぞれ ごはん・トレーニング・バトル 2かい。さいごに ボスに かつと かんせいたいだ！<br>
          <small>1ぴき そだてたら、その日は おしまい。また あした あそぼう。</small>`,
          [{ label: 'たまごを ひきに いく', value: 'ok', primary: true }],
        );
      }
      renderHome();
    },
    () => sfx('click'),
  );
  show('s-profile');
}

// ======================= ホーム =======================
function statCard(k: StatKey, r: G.Run): string {
  const st = G.runStats(r);
  const info = STAT_INFO[k];
  const bonus = r.bonus[k] * (k === 'hp' ? G.HP_PER_POINT : 1);
  if (k === 'hp') {
    const pct = Math.max(0, Math.min(100, (r.hp / st.maxHp) * 100));
    return `<div class="scard" style="--sc:${info.color}"><div class="sname">${info.icon} ${info.name}</div>
      <div class="sval">${r.hp}<small> / ${st.maxHp}</small></div>
      <div class="sbar"><div style="width:${pct}%;background:${pct < 34 ? '#ff6b6b' : '#51cf66'}"></div></div>
      <div class="sbonus">そだてて +${bonus}</div></div>`;
  }
  const v = st[k as Exclude<StatKey, 'hp'>];
  // どくたいせいの バーは「どくの ききめを どれだけ へらせるか」（さいだい 75%）
  const bar = k === 'res' ? (G.resistFrac(v) / 0.75) * 100 : Math.min(100, v);
  const note = k === 'res' ? `どくの ききめ −${Math.round(G.resistFrac(v) * 100)}%・` : '';
  return `<div class="scard ${k === 'res' ? 'wide' : ''}" style="--sc:${info.color}"><div class="sname">${info.icon} ${info.name}</div>
    <div class="sval">${v}</div><div class="sbar"><div style="width:${bar}%;background:${info.color}"></div></div>
    <div class="sbonus">${note}そだてて +${bonus}</div></div>`;
}

function stageBar(r: G.Run): string {
  const steps = ['あかちゃん', 'こども', 'おとな', '👑 かんせいたい'];
  return `<div class="stagebar">${steps
    .map((n, i) => `<span class="${i + 1 < r.stage ? 'done' : i + 1 === r.stage ? 'now' : ''}">${n}</span>`)
    .join('<b>›</b>')}</div>`;
}

// わざの カード（ホーム・ひらめき・ずかんで つかう）
function moveCard(m: G.Move, attrs = ''): string {
  const sk = m.skill ? SKILLS[m.skill] : null;
  return `<button class="mchip h-${m.hand}" ${attrs}><span class="mi">${HANDS[m.hand].icon}</span><b>${esc(m.name)}</b>
    <small>${sk ? `〔${sk.name}〕` : 'ふつう'}・${m.cd ? `やすみ ${m.cd}` : 'やすみ なし'}</small></button>`;
}
const moveChips = (r: G.Run) => G.runMoves(r).map((m, i) => moveCard(m, `data-mv="${i}"`)).join('');
function moveHelp(m: G.Move): string {
  const sk = m.skill ? SKILLS[m.skill] : null;
  const base = { gu: 'はやい こうげき（ダメージ 大）', choki: 'どく（ダメージ 小＋どくの こうか）', pa: 'まもり（うけとめて はねかえす＋かいふく）' }[m.hand];
  return `<b>${HANDS[m.hand].icon}${m.name}</b>　${base}<br>${sk ? `<span class="sk">${sk.name}</span>${sk.desc}　` : ''}⏳ つかったら ${m.cd ? `${m.cd}ターン やすみ` : 'やすまず つかえる'}`;
}
// わざを おすと、したの わくに せつめいを だす（さいしょは 1つめ）
const HAND_COLOR = { gu: '#ff6b6b', choki: '#be4bdb', pa: '#339af0' };
function bindMoveChips(el: HTMLElement, r: G.Run): void {
  const ms = G.runMoves(r);
  const box = el.querySelector<HTMLElement>('#movehelp');
  const chips = [...el.querySelectorAll<HTMLButtonElement>('.mymoves [data-mv]')];
  const select = (i: number) => {
    chips.forEach((c, k) => c.classList.toggle('sel', k === i));
    if (box) {
      box.style.setProperty('--hc', HAND_COLOR[ms[i].hand]);
      box.innerHTML = rb(moveHelp(ms[i]));
    }
  };
  chips.forEach((b) => (b.onclick = () => {
    sfx('click');
    select(Number(b.dataset.mv));
  }));
  if (chips.length) select(0);
}

function bubbleText(r: G.Run): string {
  return { feed: 'おなか すいた！ 🍽️', train: 'きたえて つよく なりたい！ 🏋️', battle: 'バトルに いこう！ ⚔️', boss: 'ボスに ちょうせんだ！ 👑' }[G.nextTask(r)];
}

function renderHome(): void {
  bgm.play(HOME_SONG);
  if (!s.run) return G.doneToday(s) ? renderDone() : renderGacha();
  const r = s.run;
  const sp = SPECIES[r.species];
  const next = G.nextTask(r);
  const boss = BOSSES[G.bossFor(s)];
  const M = (act: G.Task, ic: string, label: string, done: boolean, extra = '') =>
    `<button class="mission ${done ? 'done' : ''} ${next === act ? 'next' : ''}" data-act="${act}" ${done ? 'disabled' : ''}>
      <span class="ic">${done ? '✅' : ic}</span><span class="ml">${rb(label)}</span><span class="mx">${extra}</span></button>`;
  const el = scr('s-home');
  el.innerHTML = rb(`${topbar()}
  <main class="home-main">
    <div class="habitat hab-${sp.habitat} ${blacklight && sp.glow ? 'blacklight' : ''}" id="habitat">
      ${DECOS[sp.habitat].map(([e, x, y]) => `<span class="deco" style="left:${x}%;top:${y}%">${e}</span>`).join('')}
      <div class="bubble">${bubbleText(r)}</div>
      <div class="creature s${r.stage}" id="creature"><div class="bob">${creatureSvg(r.species, r.stage)}</div></div>
      ${sp.glow ? `<button class="blb" id="blb">🔦 ブラックライト ${blacklight ? 'OFF' : 'ON'}</button>` : ''}
      <div class="name-tag">${sp.name}（${sp.stageNames[r.stage - 1]}）</div>
    </div>
    <aside class="panel">
      <div class="lvrow"><span class="lv">Lv ${r.level}</span>${stageBar(r)}</div>
      <div class="scards">${STAT_KEYS.map((k) => statCard(k, r)).join('')}</div>
      <div class="mtitle">${G.STAGE_NAMES[r.stage]}の あいだに やること</div>
      <div class="missions">
        ${M('feed', '🍽️', 'ごはん', r.fed)}
        ${M('train', '🏋️', 'トレーニング', r.trained)}
        ${M('battle', '⚔️', 'やせいバトル', r.wins >= G.WINS_PER_STAGE, `${'●'.repeat(r.wins)}${'○'.repeat(G.WINS_PER_STAGE - r.wins)}`)}
      </div>
      <div class="mtitle">わざ（おすと せつめいが でるよ）</div>
      <div class="mymoves">${moveChips(r)}</div>
      <div class="movehelp" id="movehelp"></div>
      ${
        r.stage === 3
          ? `<button class="bossbtn ${next === 'boss' ? 'ready' : ''}" id="boss" ${next === 'boss' ? '' : 'disabled'}>
              <span class="bpic">${bossSvg(boss.id)}</span><span>👑 ボス「${boss.name}」に かつと かんせいたい！${next === 'boss' ? '<br><b>ちょうせん する！</b>' : '<br><small>やることを ぜんぶ おわらせよう</small>'}</span></button>`
          : `<div class="nextstage">ぜんぶ おわると「${G.STAGE_NAMES[r.stage + 1]}」に なるよ</div>`
      }
    </aside>
  </main>`);
  bindTop(el);
  el.querySelector<HTMLElement>('#creature')!.onclick = (e) => void doPet(e);
  const blb = el.querySelector<HTMLButtonElement>('#blb');
  if (blb)
    blb.onclick = () => {
      blacklight = !blacklight;
      sfx('click');
      renderHome();
      if (blacklight) toast('サソリは ブラックライトで みどりいろに ひかるんだ！');
    };
  el.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
    b.onclick = () => {
      const act = b.dataset.act as G.Task;
      if (act === 'feed') openFeed(r);
      else if (act === 'train') openTraining(r);
      else if (act === 'battle') startWild(r);
    };
  });
  const bb = el.querySelector<HTMLButtonElement>('#boss');
  if (bb) bb.onclick = () => startBoss(r);
  bindMoveChips(el, r);
  show('s-home');
}

async function doPet(e?: MouseEvent): Promise<void> {
  if (!s.petWarned) {
    s.petWarned = true;
    persist();
    await dialog('⚠️ ほんものの どく{生|い}き{物|もの}は、ぜったいに さわっちゃ ダメ！<br>これは ゲームの なかだけの とくべつだよ。', [{ label: 'わかった！', value: 'ok', primary: true }]);
  }
  sfx('pop');
  const hab = document.getElementById('habitat');
  if (!hab) return;
  const rect = hab.getBoundingClientRect();
  const h = document.createElement('span');
  h.className = 'heart';
  h.textContent = '💜';
  h.style.left = `${(e ? e.clientX - rect.left : rect.width / 2) - 16}px`;
  h.style.top = `${(e ? e.clientY - rect.top : rect.height / 2) - 30}px`;
  hab.appendChild(h);
  document.getElementById('creature')?.classList.add('happy');
  setTimeout(() => h.remove(), 1000);
}

// ======================= ごはん =======================
function openFeed(r: G.Run): void {
  sfx('click');
  const sp = SPECIES[r.species];
  const m = modal(rb(`<div class="dlg-body"><h3 style="margin:0 0 12px">${sp.name}は なにを たべる？</h3>
    <div class="foods">${G.foodChoices(r.species)
      .map((f) => `<button class="btn food" data-food="${f}"><span class="fe">${FOODS[f].emoji}</span>${FOODS[f].name}</button>`)
      .join('')}</div></div><div class="dlg-btns"><button class="btn" data-x>やめる</button></div>`));
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
  m.el.querySelectorAll<HTMLButtonElement>('[data-food]').forEach((b) => {
    b.onclick = async () => {
      const food = b.dataset.food as FoodId;
      const res = G.feed(r, food);
      persist();
      m.close();
      if (res.ok) {
        sfx('good');
        const info = STAT_INFO[res.stat];
        let msg = `${FOODS[food].emoji} おいしそうに たべた！<br>${info.icon} ${info.name} +${res.gain}！`;
        if (res.poisonUp) msg += `<br>⚔️ こうげきも あがった！ ${sp.name}は たべものから どくを ためるんだ。`;
        toast(msg, 3200);
      } else if (res.reason === 'wrong') {
        sfx('bad');
        const real = sp.foods.map((f) => `${FOODS[f].emoji}${FOODS[f].name}`).join('や ');
        const why = FOODS[food].junk ? `${sp.name}は ${FOODS[food].name}は たべないよ。` : `${sp.name}は ${FOODS[food].name}は あまり たべないよ。`;
        await dialog(`${FOODS[food].emoji} ぷいっ！<br>${why}<br>ほんとうは <b>${real}</b> を たべるんだ。`, [{ label: 'わかった', value: 'ok', primary: true }]);
      }
      renderHome();
    };
  });
}

// ======================= トレーニング =======================
const TRAIN_HINT: Partial<Record<StatKey, string>> = { res: 'どくに つよく' };

function openTraining(r: G.Run): void {
  sfx('click');
  const st = G.runStats(r);
  const cur: Record<StatKey, number> = { hp: st.maxHp, atk: st.atk, def: st.def, res: st.res };
  const m = modal(rb(`<div class="dlg-body"><h3 style="margin:0 0 12px">なにを きたえる？（1かいだけ）</h3>
    <div class="statpick">${STAT_KEYS.map((k) => `<button class="btn" data-stat="${k}">${STAT_INFO[k].icon} ${STAT_INFO[k].name}<br><small>いま ${cur[k]}${TRAIN_HINT[k] ? `・${TRAIN_HINT[k]}` : ''}</small></button>`).join('')}</div></div>
    <div class="dlg-btns"><button class="btn" data-x>やめる</button></div>`));
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
  m.el.querySelectorAll<HTMLButtonElement>('[data-stat]').forEach((b) => (b.onclick = () => runTiming(r, b.dataset.stat as StatKey, m)));
}

function runTiming(r: G.Run, stat: StatKey, m: { el: HTMLElement; close: () => void }): void {
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
  const speed = 1.6 + r.stage * 0.25;
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
      const gain = G.applyTraining(r, stat, total);
      persist();
      sfx('levelup');
      res.innerHTML = rb(`${STAT_INFO[stat].icon} ${STAT_INFO[stat].name}が <b>+${gain}</b> あがった！`);
      await wait(1400);
      m.close();
      await maybeInspire(r, G.LEARN_CHANCE.train);
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

// ======================= たまごガチャ（1かいの プレイに 1かい） =======================
function renderGacha(): void {
  const el = scr('s-gacha');
  el.innerHTML = rb(`${topbar()}
  <div class="page">
    <h2>きょうの たまご</h2>
    <div class="machine" id="machine">
      <div class="dome"></div>
      <div class="balls">${[0, 1, 2, 3, 4].map((i) => `<span style="left:${22 + i * 12}%;top:${18 + (i % 2) * 16}%">🥚</span>`).join('')}</div>
      <div class="base"></div><div class="slot"></div><div class="knob"></div>
    </div>
    <div id="gout" style="min-height:40px"></div>
    <button class="btn primary" id="pull" style="font-size:26px;padding:14px 40px">たまごを ひく！</button>
    <div class="hint">ノーマル 60% ／ レア 30% ／ げきレア 10%　・　${SPECIES_IDS.length}しゅるい　・　まだ かんせいたいに していない いきものが でやすいよ</div>
  </div>`);
  bindTop(el);
  el.querySelector<HTMLButtonElement>('#pull')!.onclick = () => void pull();
  show('s-gacha');
}

async function pull(): Promise<void> {
  const el = scr('s-gacha');
  el.querySelector<HTMLButtonElement>('#pull')!.disabled = true;
  sfx('click');
  el.querySelector('#machine')!.classList.add('spin');
  await wait(1200);
  const g = G.startRun(s);
  persist();
  el.querySelector<HTMLElement>('#gout')!.innerHTML = `<div class="gacha-egg" id="gegg">${eggSvg(g.rarity)}</div><div style="text-align:center;font-size:24px;font-weight:700;color:${RARITY[g.rarity].color}">${RARITY[g.rarity].name}の たまご！</div>`;
  sfx(g.rarity === 'N' ? 'coin' : 'levelup');
  await wait(900);
  el.querySelector('#gegg')?.classList.add('shake');
  await wait(1300);
  sfx('hatch');
  const sp = SPECIES[g.run.species];
  await dialog(
    `<div style="width:170px;height:170px;margin:auto">${creatureSvg(g.run.species, 1)}</div>
    <b>たまごが かえった！ ${sp.name}の ${sp.stageNames[0]}だ！</b>${g.isNew ? '<br>🆕 はじめて そだてる いきもの！' : ''}
    <div class="factbox">📖 まめちしき：${sp.facts[0]}</div>
    <small>15ふんで かんせいたいを めざそう！</small>`,
    [{ label: 'そだてる！', value: 'ok', primary: true }],
  );
  renderHome();
}

// ======================= きょうは おしまい =======================
function renderDone(): void {
  const el = scr('s-home');
  const todays = s.hall.filter((h) => h.date === G.today());
  const last = todays[todays.length - 1] ?? s.hall[s.hall.length - 1];
  el.innerHTML = rb(`${topbar()}
  <div class="page done-page">
    <h2>🌙 きょうは おしまい！</h2>
    ${
      last
        ? `<div class="done-card">${kanseiArt(last.species)}<div><b style="font-size:26px">${SPECIES[last.species].name}</b><br>かんせいたいに なって でんどう いり！</div></div>`
        : ''
    }
    <p style="font-size:20px">また あした、あたらしい たまごを そだてよう 👋<br>ずかんや でんどうは いつでも みられるよ。</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
      <button class="btn primary" id="toHall">👑 でんどうを みる</button>
      <button class="btn" id="toZukan">📖 ずかん</button>
      <button class="btn" id="toWho">👥 だれが あそぶ？</button>
    </div>
  </div>`);
  bindTop(el);
  el.querySelector<HTMLButtonElement>('#toHall')!.onclick = () => {
    zTab = 'hall';
    go('zukan');
  };
  el.querySelector<HTMLButtonElement>('#toZukan')!.onclick = () => {
    zTab = 'ikimono';
    go('zukan');
  };
  el.querySelector<HTMLButtonElement>('#toWho')!.onclick = () => renderProfile();
  show('s-home');
}

// ======================= じゃんけんバトル =======================
function startWild(r: G.Run): void {
  const w = G.rollWild(r);
  runDuel(r, new Duel(playerFighter(r), wildFighter(w.species, w.level, r.stage)), null);
}

function startBoss(r: G.Run): void {
  runDuel(r, new Duel(playerFighter(r), bossFighter(r, G.bossFor(s))), G.bossFor(s));
}


// じょうほう パネル（なまえ・HP・じょうたい・わざ）。じぶんの パネルには わざボタンが はいる
function infoPanel(u: Fighter): string {
  return `<div class="ipanel ${u.side}" data-side="${u.side}">
    <div class="ihead"><span class="iname">${u.name}</span><span class="ilv">Lv${u.level}</span></div>
    <div class="ihp"><span class="ihplabel">HP</span><div class="track"><div class="fill"></div></div><span class="uhpn"></span></div>
    <div class="marks"></div>
    ${u.side === 'e' ? '<div class="ilabel">あいての わざ</div><div class="mlist foe-moves"></div>' : '<div class="ilabel">どの わざを だす？ <small>（キーボードの 1・2・3 でも）</small></div><div class="cmdgrid" id="cmd"></div>'}
  </div>`;
}

function runDuel(r: G.Run, duel: Duel, bossIndex: number | null): void {
  sfx('click');
  bgm.play(BATTLE_SONG);
  const area = G.areaOf(r.species);
  const bg = bossIndex != null ? BOSSES[bossIndex].bg : area.bg;
  const foeArt = bossIndex != null ? bossSvg(BOSSES[bossIndex].id) : creatureSvg(duel.foe.species!, r.stage);
  const el = scr('s-battle');
  el.innerHTML = rb(`
  <div class="arena duel" style="background:${bg}">
    <div class="cell foe-info">${infoPanel(duel.foe)}</div>
    <div class="cell foe-pic"><div class="unit e" data-side="e"><div class="pic">${foeArt}</div></div></div>
    <div class="cell me-pic"><div class="unit p" data-side="p"><div class="pic">${creatureSvg(r.species, r.stage, true)}</div></div></div>
    <div class="cell me-info">${infoPanel(duel.me)}</div>
    <div class="jk" id="jk"></div>
  </div>
  <div class="bpanel">
    <div class="msg" id="bmsg">${bossIndex != null ? `ボス ${BOSSES[bossIndex].name}が あらわれた！` : `やせいの ${duel.foe.name}が あらわれた！`}</div>
  </div>`);
  const msg = el.querySelector<HTMLElement>('#bmsg')!;
  const jk = el.querySelector<HTMLElement>('#jk')!;
  const unitEl = (side: Side) => el.querySelector<HTMLElement>(`.unit[data-side="${side}"]`)!;
  const infoEl = (side: Side) => el.querySelector<HTMLElement>(`.ipanel[data-side="${side}"]`)!;
  const refresh = () => {
    for (const u of [duel.me, duel.foe]) {
      const ie = infoEl(u.side);
      const pct = (u.hp / u.maxHp) * 100;
      const fill = ie.querySelector<HTMLElement>('.fill')!;
      fill.style.width = `${pct}%`;
      fill.className = `fill ${pct <= 20 ? 'crit' : pct <= 50 ? 'low' : ''}`;
      ie.querySelector<HTMLElement>('.uhpn')!.textContent = `${u.hp} / ${u.maxHp}`;
      ie.querySelector<HTMLElement>('.marks')!.innerHTML = markLabels(u).map(([l, c]) => `<span style="background:${c}">${l}</span>`).join('');
      unitEl(u.side).classList.toggle('ko', u.hp <= 0);
      ie.classList.toggle('ko', u.hp <= 0);
    }
    // あいての わざ（やすみちゅうは うすく）
    infoEl('e').querySelector<HTMLElement>('.foe-moves')!.innerHTML = rb(
      duel.foe.moves
        .map((m, i) => {
          const cd = duel.foe.cooldown[i];
          return `<div class="mrow h-${m.hand} ${cd > 0 ? 'rest' : ''}"><span class="mi">${HANDS[m.hand].icon}</span><span class="mn">${esc(m.name)}</span><small>${m.skill ? `〔${SKILLS[m.skill].name}〕` : ''}</small><span class="mcd">${cd > 0 ? `⏳${cd}` : 'OK'}</span></div>`;
        })
        .join(''),
    );
  };
  const floatText = (side: Side, text: string, cls: string) => {
    const rect = unitEl(side).querySelector<HTMLElement>('.pic')!.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = `dmg ${cls}`;
    d.textContent = text;
    d.style.left = `${rect.left + rect.width / 2 - 30}px`;
    d.style.top = `${rect.top + rect.height / 3}px`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  };
  let busy = false;
  // じぶんの わざボタン（うごいている あいだは おせない だけで、けさない）
  const renderCmd = () => {
    const cmd = el.querySelector<HTMLElement>('#cmd')!;
    cmd.innerHTML = rb(
      duel.me.moves
        .map((m, i) => {
          const cd = duel.me.cooldown[i];
          const sk = m.skill ? SKILLS[m.skill] : null;
          return `<button class="hand h-${m.hand}" data-mv="${i}" ${cd > 0 || busy || duel.over ? 'disabled' : ''}>
            <span class="hk">${i + 1}</span><span class="hi">${HANDS[m.hand].icon}</span>
            <span class="htext"><span class="hn">${esc(m.name)}</span><small>${sk ? `〔${sk.name}〕${sk.desc}` : HANDS[m.hand].role}</small></span>
            <span class="hcd">${cd > 0 ? `⏳${cd}` : m.cd ? `やすみ${m.cd}` : ''}</span></button>`;
        })
        .join('') + `<button class="bmove run" data-run ${busy ? 'disabled' : ''}>🏃 にげる</button>`,
    );
    cmd.querySelectorAll<HTMLButtonElement>('[data-mv]').forEach((b) => (b.onclick = () => void choose(Number(b.dataset.mv))));
    cmd.querySelector<HTMLButtonElement>('[data-run]')!.onclick = () => void runAway();
  };
  const menu = () => {
    busy = false;
    const foeAv = available(duel.foe).map((i) => HANDS[duel.foe.moves[i].hand].icon).join('');
    msg.innerHTML = rb(`どの わざを だす？　<small>（あいてが いま だせる 手：${foeAv}）</small>`);
    renderCmd();
  };
  const choose = async (h: number) => {
    if (busy || duel.over || !available(duel.me).includes(h)) return;
    busy = true;
    sfx('click');
    renderCmd();
    await play(duel.turn(h));
    if (!duel.over) menu();
  };
  const keys = (e: KeyboardEvent) => {
    const map: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
    if (map[e.code] != null && !busy && scr('s-battle').classList.contains('on')) void choose(map[e.code]);
  };
  document.addEventListener('keydown', keys);
  const cleanup = () => document.removeEventListener('keydown', keys);
  const showJanken = async (me: Hand, foe: Hand, result: 'win' | 'lose' | 'draw', first: Side) => {
    const word = result === 'win' ? 'かち！ さきに こうげき！' : result === 'lose' ? 'まけ… あいてが さきに こうげき' : `あいこ！ ${first === 'p' ? 'こっちが さきに こうげき！' : 'あいてが さきに こうげき'}`;
    jk.innerHTML = rb(`<div class="jk-row"><span class="jk-h">${HANDS[me].icon}</span><span class="jk-vs">VS</span><span class="jk-h">${HANDS[foe].icon}</span></div><div class="jk-res ${result}">${word}</div>`);
    jk.classList.add('on');
    sfx(result === 'win' ? 'good' : result === 'lose' ? 'bad' : 'pop');
    await wait(1300);
    jk.classList.remove('on');
  };
  const play = async (events: BattleEvent[]) => {
    for (const e of events) {
      if (e.kind === 'janken') {
        await showJanken(e.me, e.foe, e.result, e.first);
      } else if (e.kind === 'text') {
        msg.innerHTML = rb(esc(e.text));
        await wait(700);
      } else if (e.kind === 'hit') {
        const pic = unitEl(e.side).querySelector<HTMLElement>('.pic')!;
        pic.classList.remove('shake', 'flash');
        void pic.offsetWidth;
        pic.classList.add('shake', 'flash');
        sfx('hit');
        floatText(e.side, `-${e.amount}`, e.crit ? 'crit' : '');
        refresh();
        await wait(450);
      } else if (e.kind === 'heal') {
        sfx('good');
        floatText(e.side, `+${e.amount}`, 'heal');
        refresh();
        await wait(300);
      } else if (e.kind === 'dodge') {
        sfx('miss');
        floatText(e.side, 'ミス！', 'miss');
        await wait(300);
      } else if (e.kind === 'mark' || e.kind === 'ko') {
        refresh();
        sfx(e.kind === 'ko' ? 'miss' : 'pop');
        await wait(250);
      } else if (e.kind === 'end') {
        await wait(400);
        cleanup();
        await finish(e.win);
        return;
      }
    }
    refresh();
  };
  const runAway = async () => {
    const a = await dialog('にげる？（バトルは かぞえないよ）', [
      { label: 'にげる', value: 'yes' },
      { label: 'たたかう', value: 'no', primary: true },
    ]);
    if (a !== 'yes') return;
    cleanup();
    G.healFull(r);
    persist();
    renderHome();
  };
  const finish = async (win: boolean) => {
    if (bossIndex != null) {
      if (win) return void celebrateKansei(bossIndex);
      sfx('lose');
      G.loseBoss(r);
      persist();
      await dialog(
        `まけちゃった… でも だいじょうぶ！ HPは もとに もどったよ。<div class="factbox" style="background:#fff4d6">💡 ヒント：${BOSSES[bossIndex].hint}</div>`,
        [{ label: 'もういちど いどむ', value: 'ok', primary: true }],
      );
      renderHome();
      return;
    }
    if (win) {
      sfx('win');
      const up = G.winWild(s, r, duel.foe.species!);
      persist();
      await dialog(`<b>🎉 かった！</b><br>レベル ${up.from} → <b>${up.to}</b>　（バトル ${r.wins} / ${G.WINS_PER_STAGE}）`, [{ label: 'OK', value: 'ok', primary: true }]);
      await maybeInspire(r, G.LEARN_CHANCE.win);
      await maybeGrow(r);
    } else {
      sfx('lose');
      G.healFull(r);
      persist();
      await dialog(`まけちゃった… HPは もとに もどったよ。<div class="factbox" style="background:#fff4d6">💡 あいての わざと やすみを みて、かてる 手を だそう！ ${HANDS.gu.icon}は${HANDS.choki.icon}に、${HANDS.choki.icon}は${HANDS.pa.icon}に、${HANDS.pa.icon}は${HANDS.gu.icon}に かつよ。</div>`, [{ label: 'OK', value: 'ok', primary: true }]);
    }
    renderHome();
  };
  busy = true;
  renderCmd();
  refresh();
  show('s-battle');
  setTimeout(menu, 900);
}

// わざを ひらめく（トレーニングの あと・やせいバトルに かった あと）
async function maybeInspire(r: G.Run, chance: number): Promise<void> {
  const def = G.rollInspiration(r, chance);
  if (!def) return;
  sfx('levelup');
  const nm = G.buildMove(def, r.species, r.stage);
  const cur = G.runMoves(r);
  await new Promise<void>((resolve) => {
    const m = modal(
      rb(`<div class="dlg-body" style="text-align:center"><h3 style="margin:0 0 8px">💡 ${SPECIES[r.species].name}は あたらしい わざを ひらめいた！</h3>
      <div class="mymoves one">${moveCard(nm)}</div>
      <div class="factbox" style="text-align:left">${moveHelp(nm)}</div>
      <div style="margin-top:8px">どの わざと いれかえる？ <small>（おなじ 手は 2つまで）</small></div>
      <div class="mymoves pick">${cur.map((c, i) => moveCard(c, `data-rep="${i}" ${G.canReplace(r, i, def) ? '' : 'disabled'}`)).join('')}</div></div>
      <div class="dlg-btns"><button class="btn" data-keep>いまの まま</button></div>`),
    );
    m.el.querySelector<HTMLButtonElement>('[data-keep]')!.onclick = () => {
      sfx('click');
      m.close();
      resolve();
    };
    m.el.querySelectorAll<HTMLButtonElement>('[data-rep]').forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.rep);
        const old = cur[i].name;
        if (!G.replaceMove(r, i, def)) return;
        persist();
        sfx('good');
        m.close();
        toast(rb(`${old}を わすれて、${HANDS[nm.hand].icon}${nm.name}を おぼえた！`), 3000);
        resolve();
      };
    });
  });
}

// やることが ぜんぶ おわったら つぎの すがたへ
async function maybeGrow(r: G.Run): Promise<void> {
  if (r.stage < 3 && G.stageDone(r)) {
    G.growUp(s, r);
    persist();
    sfx('levelup');
    const sp = SPECIES[r.species];
    const mv = G.runMoves(r);
    await dialog(
      `<div style="width:170px;height:170px;margin:auto">${creatureSvg(r.species, r.stage)}</div>
      ✨ <b>${sp.name}が ${sp.stageNames[r.stage - 1]}に せいちょうした！</b>（Lv ${r.level}）
      <div class="factbox">📖 まめちしき：${sp.facts[r.stage - 1]}</div>
      わざが つよく なった！ ${mv.map((m) => `${HANDS[m.hand].icon}${m.name}`).join('　')}`,
      [{ label: 'やったね！', value: 'ok', primary: true }],
    );
  } else if (r.stage === 3 && G.stageDone(r)) {
    await dialog(`👑 じゅんび OK！ ボス「${BOSSES[G.bossFor(s)].name}」に かつと かんせいたいに なれるよ！`, [{ label: 'OK', value: 'ok', primary: true }]);
  }
}

async function celebrateKansei(bossIndex: number): Promise<void> {
  const r = s.run!;
  const sp = SPECIES[r.species];
  const boss = BOSSES[bossIndex];
  const res = G.completeRun(s, bossIndex);
  persist();
  sfx('win');
  await wait(300);
  sfx('levelup');
  let html = `<div style="width:200px;height:200px;margin:auto">${kanseiArt(sp.id)}</div>
    <b style="font-size:24px">👑 ${sp.name}は かんせいたいに なった！</b><br>でんどうに はいったよ！（${new Set(s.hall.map((h) => h.species)).size} / ${SPECIES_IDS.length}）`;
  if (res.firstBoss) html += `<div class="factbox">⚔️ ${boss.name}を はじめて たおした！ 📖 ${boss.fact}</div>`;
  for (const id of res.newCards) {
    const c = MED_CARDS.find((m) => m.id === id)!;
    html += `<div class="factbox" style="background:#e6fcf5">💊 くすりカード「${c.drug}」を てに いれた！ ${c.from}の どくから うまれた ${c.use}。</div>`;
  }
  await dialog(html, [{ label: 'やったね！', value: 'ok', primary: true }]);
  renderHome();
}

// ======================= ずかん =======================
function renderZukan(): void {
  const el = scr('s-zukan');
  const hallSet = new Set(s.hall.map((h) => h.species));
  const tabs: [typeof zTab, string][] = [['ikimono', '🐍 いきもの'], ['hall', '👑 でんどう'], ['doku', '🧪 どく'], ['boss', '⚔️ ボス'], ['kusuri', '💊 くすりカード']];
  let body = '';
  if (zTab === 'ikimono') {
    body = `<div class="hint" style="font-size:17px">そだてた いきもの ${s.owned.length} / ${SPECIES_IDS.length}　・　かんせいたい ${hallSet.size}　・　であった いきもの ${new Set([...s.owned, ...s.met]).size}</div>
    ${AREAS.map(
      (a) => `<h3 class="sect">${a.icon} ${a.name}</h3><div class="cards">${SPECIES_IDS.filter((id) => SPECIES[id].area === a.id)
        .map((id) => {
          const own = s.owned.includes(id);
          const met = own || s.met.includes(id);
          const sp = SPECIES[id];
          return `<div class="card zk ${met ? '' : 'locked'}" ${met ? `data-sp="${id}" style="cursor:pointer"` : ''}>
            <div class="pic">${hallSet.has(id) ? kanseiArt(id) : creatureSvg(id, own ? Math.max(1, s.factsSeen[id] ?? 1) : 3)}</div>
            <div class="ttl">${hallSet.has(id) ? '👑 ' : ''}${met ? sp.name : '？？？'}</div><div class="sub">${RARITY[sp.rarity].name}${met && !own ? '・であった' : ''}</div></div>`;
        })
        .join('')}</div>`,
    ).join('')}`;
  } else if (zTab === 'hall') {
    body = s.hall.length
      ? `<div class="hint" style="font-size:17px">かんせいたいに した いきもの（${hallSet.size} / ${SPECIES_IDS.length}しゅるい）。ぜんぶ あつめよう！</div>
        <div class="cards">${[...s.hall]
          .reverse()
          .map((h) => `<div class="card zk hall" data-sp="${h.species}" style="cursor:pointer"><div class="pic">${kanseiArt(h.species)}</div><div class="ttl">👑 ${SPECIES[h.species].name}</div><div class="sub">${h.date.replace(/-/g, '/')}</div></div>`)
          .join('')}</div>`
      : '<div class="hint" style="font-size:18px">まだ だれも いないよ。たまごを かんせいたいまで そだてると、ここに のるよ！</div>';
  } else if (zTab === 'doku') {
    body = `<div class="motos">${(['gu', 'choki', 'pa'] as Hand[])
      .map((h) => `<div class="moto" style="--tc:${HANDS[h].color}"><div class="head">${HANDS[h].icon} ${HANDS[h].name}：${HANDS[h].role}</div><div class="desc" style="font-size:16px">${HANDS[HANDS[h].beats].icon}${HANDS[HANDS[h].beats].name}に かつ（${HANDS[h].why}）</div></div>`)
      .join('')}${PTYPE_IDS.map((t) => {
      const p = PTYPES[t];
      return `<div class="moto" style="--tc:${p.color}"><div class="head">${p.icon} ${p.name}</div><div class="desc" style="font-size:16px">ほんとうの なまえ：${p.real}<br>からだへの ききかた：${p.body}<br>バトルでは（✌️チョキの とき）：${p.effect}</div></div>`;
    }).join('')}</div>`;
  } else if (zTab === 'boss') {
    body = `<div class="cards">${BOSSES.map((b) => {
      const ok = s.bossBeaten.includes(b.id);
      return `<div class="card ${ok ? '' : 'locked'}" style="width:280px"><div class="pic">${bossSvg(b.id)}</div><div class="ttl">${ok ? b.name : '？？？'}</div><div class="sub">${ok ? `${b.where}<br>${b.fact}<br>わざ：${G.bossMoves(b.id).map((m) => `${HANDS[m.hand].icon}${m.name}${G.skillText(m)}`).join('・')}` : 'たおすと わかるよ'}</div></div>`;
    }).join('')}</div>`;
  } else {
    body = `<div class="hint" style="font-size:17px">どくは つかいかたしだいで くすりにも なる！ かんけいする いきものを かんせいたいに すると てに はいるよ。</div><div class="cards">${MED_CARDS.map((m) => {
      const ok = s.cards.includes(m.id);
      return `<div class="card" style="width:280px;${ok ? '' : 'opacity:.6'}"><div style="font-size:64px">${ok ? '💊' : '❓'}</div><div class="ttl">${ok ? m.drug : '？？？'}</div>
        <div class="sub">${ok ? `${m.from}の どくから<br>→ ${m.use}` : `ヒント：${m.species.map((id) => SPECIES[id].name).join('か ')}を かんせいたいに しよう`}</div>
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
  const done = s.hall.some((h) => h.species === id);
  const stg = own ? Math.max(1, s.factsSeen[id] ?? 1) : 0;
  const facts = sp.facts.map((f, i) => (i < stg ? `<div class="fact">📖 ${f}</div>` : `<div class="fact" style="opacity:.6">？ ${own ? 'もっと そだてると わかるよ' : 'そだてると わかるよ'}</div>`)).join('');
  const set = MOVESETS[id];
  const ml = (ms: MoveDef[]) => ms.map((m) => `${HANDS[m[0]].icon}${m[1]}${G.skillText(m)}`).join('・');
  const m = modal(rb(`<div class="zk-detail">
    <div class="bigpic">${done ? kanseiArt(id) : creatureSvg(id, Math.max(1, stg || 3))}</div>
    <div class="zk-text">
      <b style="font-size:26px">${done ? '👑 ' : ''}${sp.name}</b>（${RARITY[sp.rarity].name}）<br>
      🏠 すむところ：${sp.where}<br>📏 おおきさ：${sp.size}<br>
      🍽️ たべもの：${sp.foods.map((f) => FOODS[f].emoji + FOODS[f].name).join('、')}<br>
      🧪 どく：${sp.types.map((t) => PTYPES[t].icon + PTYPES[t].name).join('、')}<br>
      🎮 さいしょの わざ：${ml(set.start)}<br>💡 ひらめく わざ：${ml(set.learn)}<br>
      ${facts}
      ${sp.truth && own ? `<div class="truth">🔎 ほんとうは… ${sp.truth}</div>` : ''}
      <div class="safe">⚠️ ほんものを {見|み}つけても ぜったいに さわらないで、おとなに しらせてね！</div>
    </div></div><div class="dlg-btns"><button class="btn primary" data-x>とじる</button></div>`));
  m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => m.close();
}

// ======================= せってい =======================
async function parentCheck(): Promise<boolean> {
  const a = 6 + Math.floor(Math.random() * 7);
  const b = 12 + Math.floor(Math.random() * 8);
  return new Promise((resolve) => {
    const m = modal(`<div class="dlg-body"><h3 style="margin:0 0 8px">おうちの かたへ</h3>
      きょう もう1ぴき そだてられるように します。<br>おうちの かたが こたえて ください：<b style="font-size:22px">${a} × ${b} = ?</b>
      <input id="pc-ans" inputmode="numeric" style="font-size:24px;width:140px;margin-top:10px;padding:6px 10px;border-radius:10px;border:2px solid #b9add9" autocomplete="off"></div>
      <div class="dlg-btns"><button class="btn" data-x>やめる</button><button class="btn primary" data-ok>OK</button></div>`);
    const input = m.el.querySelector<HTMLInputElement>('#pc-ans')!;
    input.focus();
    m.el.querySelector<HTMLButtonElement>('[data-x]')!.onclick = () => {
      m.close();
      resolve(false);
    };
    m.el.querySelector<HTMLButtonElement>('[data-ok]')!.onclick = () => {
      m.close();
      resolve(Number(input.value.trim()) === a * b);
    };
  });
}

function renderSettings(): void {
  const el = scr('s-settings');
  const ss = getSoundSettings();
  const T = (k: keyof typeof ss, label: string) => `<div class="toggle"><span>${label}</span><button class="btn ${ss[k] ? 'primary' : ''}" data-snd="${k}">${ss[k] ? 'ON' : 'OFF'}</button></div>`;
  const state = s.run ? 'いま そだてている とちゅう' : G.doneToday(s) ? 'きょうは おしまい（1ぴき そだてた）' : 'あたらしい たまごを ひける';
  el.innerHTML = rb(`${topbar('home')}
  <div class="page"><h2>⚙️ せってい</h2>
    ${T('bgm', '🎵 おんがく')}${T('sfx', '🔔 こうかおん')}${T('voice', '🗣️ こえ')}
    <div class="toggle"><span>💾 セーブを ファイルに ほぞん</span><button class="btn" id="exp">ほぞん</button></div>
    <div class="toggle"><span>📂 ファイルから よみこむ</span><button class="btn" id="imp">よみこむ</button></div>
    <div class="toggle"><span>👥 だれが あそぶ？に もどる</span><button class="btn" id="who">もどる</button></div>
    <div class="toggle"><span>👪 おうちの かた：きょう もう1ぴき<br><small>いまは：${state}</small></span><button class="btn" id="extra" ${G.doneToday(s) ? '' : 'disabled'}>ゆるす</button></div>
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
  el.querySelector<HTMLButtonElement>('#extra')!.onclick = async () => {
    if (await parentCheck()) {
      G.allowExtra(s);
      persist();
      sfx('good');
      toast('きょう もう1ぴき そだてられるよ！');
      renderHome();
    } else {
      sfx('bad');
      toast('こたえが ちがうみたい');
    }
  };
  el.querySelector<HTMLButtonElement>('#reset')!.onclick = async () => {
    if ((await dialog(`${esc(profile.name)}の ベノムモンスターの データを ぜんぶ けして、さいしょから やりなおす？`, [{ label: 'やめる', value: 'no', primary: true }, { label: 'けす', value: 'yes' }])) !== 'yes') return;
    if ((await dialog('ほんとうに いいの？ もとに もどせないよ。', [{ label: 'やめる', value: 'no', primary: true }, { label: 'ほんとうに けす', value: 'yes' }])) !== 'yes') return;
    remove(`venom.${profile.id}`);
    s = G.newSave();
    renderProfile();
  };
  show('s-settings');
}

registerSW();
renderTitle();
