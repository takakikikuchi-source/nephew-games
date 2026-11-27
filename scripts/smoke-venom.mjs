// ベノムモンスター（v4）の自動プレイ（smoke.mjs から呼ばれる）
// たまご → ごはん → トレーニング → じゃんけんバトルで せいちょう → ボス → 完成体 → おしまい → でんどう → もう1かい → ふるい セーブの いこう
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function ({ page, shot, click, root }) {
  const dlg = page.locator('.dlg-back');
  const dlgOk = async () => {
    for (let i = 0; i < 15; i++) {
      const b = page.locator('.dlg-back .btn.primary, .dlg-back .btn').first();
      if (await b.count()) {
        await b.click();
        await page.waitForTimeout(300);
        return true;
      }
      await page.waitForTimeout(300);
    }
    return false;
  };
  const clearDialogs = async () => {
    while (await dlg.count()) {
      await dlgOk();
      await page.waitForTimeout(200);
    }
  };
  const save = () =>
    page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => x.startsWith('ng.venom.') && !x.endsWith('.bak'));
      return JSON.parse(localStorage.getItem(k));
    });
  const editSave = async (fn) => {
    await page.evaluate((src) => {
      const k = Object.keys(localStorage).find((x) => x.startsWith('ng.venom.') && !x.endsWith('.bak'));
      const s = JSON.parse(localStorage.getItem(k));
      new Function('s', src)(s);
      localStorage.setItem(k, JSON.stringify(s));
    }, `(${fn.toString()})(s)`);
  };
  const reopen = async () => {
    await page.reload();
    await click('#start');
    await click('.pp-pick[data-id]');
    await page.waitForTimeout(300);
    await clearDialogs();
  };
  // バトルを さいごまで（手は じゅんばんに）
  const fight = async (label) => {
    let shotJk = false;
    let shotCd = false;
    for (let t = 0; t < 200; t++) {
      if (await dlg.count()) break;
      if (!shotCd && (await page.locator('#cmd [data-mv][disabled]').count())) {
        shotCd = true;
        await shot(`${label}-cooldown`);
      }
      const h = page.locator('#cmd [data-mv]:not([disabled])');
      if (await h.count()) {
        await h.nth(t % (await h.count())).click();
        if (!shotJk) {
          await page.waitForTimeout(350);
          await shot(`${label}-janken`);
          shotJk = true;
        }
      }
      await page.waitForTimeout(300);
    }
    await shot(`${label}-end`);
    const won = (await dlg.innerText()).includes('かった') || (await dlg.innerText()).includes('かんせいたい');
    await clearDialogs();
    return won;
  };

  await page.goto(pathToFileURL(path.join(root, 'play', 'venom.html')).href);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await shot('01-title');
  await click('#start');
  await click('#pp-new');
  await page.fill('#pp-input', 'テスト');
  await click('.pp-ok');
  await dlgOk(); // ようこそ
  await shot('02-gacha');
  await click('#pull');
  await page.waitForTimeout(3800);
  await shot('03-hatch');
  await clearDialogs();
  await shot('04-home');

  // ごはん（まちがえたら もういちど）
  for (let i = 0; i < 8 && !(await save()).run.fed; i++) {
    await click('[data-act="feed"]');
    if (i === 0) await shot('05-feed');
    await click('[data-food]');
    await page.waitForTimeout(500);
    await clearDialogs();
  }
  if (!(await save()).run.fed) throw new Error('ごはんが たべられなかった');
  // トレーニング
  await click('[data-act="train"]');
  await shot('06-train-pick');
  await click('[data-stat="res"]');
  // ひらめきを かならず おこす（さいごの ストップの あとだけ）
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(400);
    if (i === 2) await page.evaluate(() => { window.__rnd = Math.random; Math.random = () => 0.01; });
    await click('#tstop');
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(1800);
  await page.evaluate(() => { Math.random = window.__rnd; });
  const before = (await save()).run.moves.map((m) => m[1]).join(',');
  await page.locator('.dlg-back [data-rep]').first().waitFor({ timeout: 5000 });
  await shot('06c-inspire');
  await click('.dlg-back [data-rep]:not([disabled])');
  await page.waitForTimeout(500);
  const after = (await save()).run.moves.map((m) => m[1]).join(',');
  if (before === after) throw new Error('わざの いれかえが できていない');
  await shot('06d-home-moves');
  // やせいバトル（2かい かつと こどもに なる）
  let wins = 0;
  for (let i = 0; i < 8 && (await save()).run.stage === 1; i++) {
    await click('[data-act="battle"]');
    await page.waitForTimeout(1200);
    if (i === 0) await shot('07-battle');
    if (await fight(i === 0 ? '08' : `08-${i}`)) wins++;
    await clearDialogs();
  }
  const s1 = await save();
  if (s1.run.stage !== 2) throw new Error(`こどもに ならなかった（stage=${s1.run.stage}, wins=${wins}）`);
  await shot('09-home-child');

  // おとなの さいごまで すすめて ボスへ
  await editSave((s) => {
    s.run.stage = 3;
    s.run.level = 15;
    s.run.fed = true;
    s.run.trained = true;
    s.run.wins = 2;
    s.run.bonus = { hp: 8, atk: 9, def: 6, spd: 3, res: 6 };
    s.run.hp = 999;
  });
  await reopen();
  await shot('10-home-boss-ready');
  for (let i = 0; i < 8 && (await save()).run; i++) {
    await click('#boss');
    await page.waitForTimeout(1200);
    if (i === 0) await shot('11-boss');
    await fight(i === 0 ? '12-boss' : `12-boss-${i}`);
    await page.waitForTimeout(300);
    await clearDialogs();
  }
  const s2 = await save();
  if (s2.run || s2.hall.length !== 1) throw new Error('かんせいたいに ならなかった');
  await shot('13-done');
  // でんどう
  await click('#toHall');
  await shot('14-hall');
  await click('[data-back="home"]');
  // おうちの ひとの「もう1かい」
  await click('[data-go="settings"]');
  await click('#extra');
  const q = await dlg.innerText();
  const m = q.match(/(\d+)\s*×\s*(\d+)/);
  await page.fill('#pc-ans', String(Number(m[1]) * Number(m[2])));
  await click('.dlg-back [data-ok]');
  await page.waitForTimeout(500);
  await shot('15-extra-gacha');
  if (!(await page.locator('#pull').count())) throw new Error('もう1かいで ガチャに もどらなかった');

  // ふるい セーブ（v3：チーム）からの いこう
  await editSave((s) => {
    for (const k of Object.keys(s)) delete s[k];
    Object.assign(s, {
      v: 3,
      day: 5,
      coins: 300,
      creatures: [
        { uid: 'a', species: 'cobra', hatched: true, level: 22, exp: 0, hp: 50, bonus: { hp: 1, atk: 1, def: 1, spd: 0, res: 0 }, moves: [] },
        { uid: 'b', species: 'sasori', hatched: true, level: 8, exp: 0, hp: 50, bonus: { hp: 1, atk: 1, def: 1, spd: 0, res: 0 }, moves: [] },
      ],
      team: ['a', 'b'],
      owned: ['cobra', 'sasori'],
      met: [],
      factsSeen: { cobra: 3, sasori: 1 },
      bossBeaten: ['hebikui'],
      cards: [],
    });
  });
  await reopen();
  const s3 = await save();
  if (s3.v !== 5 || s3.hall.length !== 1 || s3.hall[0].species !== 'cobra') throw new Error('v3 → v4 の いこうが おかしい: ' + JSON.stringify(s3).slice(0, 200));
  await shot('16-migrated');
  // v4（とちゅうの 1ぴき・わざ なし）→ v5
  await editSave((s) => {
    s.v = 4;
    s.run = { uid: 'r', species: 'mamba', stage: 2, level: 7, hp: 30, bonus: { hp: 1, atk: 1, def: 1, spd: 2, res: 0 }, fed: true, trained: false, wins: 1, bossTries: 0, startedAt: 0 };
    s.lastDone = null;
  });
  await reopen();
  const s4 = await save();
  if (s4.v !== 5 || !s4.run || s4.run.moves.length !== 3 || 'spd' in s4.run.bonus) throw new Error('v4 → v5 の いこうが おかしい: ' + JSON.stringify(s4.run));
  await shot('16b-migrated-run');
  await click('[data-go="zukan"]');
  await shot('17-zukan');
}
