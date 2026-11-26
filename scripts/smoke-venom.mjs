// ベノムモンスター の自動プレイ（smoke.mjs から呼ばれる）
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function ({ page, shot, click, root }) {
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
    while (await page.locator('.dlg-back').count()) {
      await dlgOk();
      await page.waitForTimeout(200);
    }
  };
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
  await click('#pull');
  await page.waitForTimeout(3600);
  await shot('02-gacha');
  await dlgOk();
  await shot('03-home-egg');
  await click('[data-act="sleep"]');
  await dlgOk();
  await page.waitForTimeout(1700);
  await shot('04-hatch');
  await dlgOk();
  await shot('05-home-baby');
  // ごはん
  await click('[data-act="feed"]');
  await shot('06-feed');
  await click('[data-food]');
  await page.waitForTimeout(500);
  await clearDialogs();
  // トレーニング
  await click('[data-act="train"]');
  await shot('06b-train-pick');
  await click('[data-stat="res"]');
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(400);
    await click('#tstop');
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(1800);
  // やせいバトル
  await click('[data-act="battle"]');
  await shot('07-battle-select');
  await click('[data-area="0"]');
  await page.waitForTimeout(1200);
  await shot('08-battle');
  for (let t = 0; t < 80; t++) {
    if (await page.locator('.dlg-back').count()) break;
    const mv = page.locator('#cmd [data-mv]').first();
    if (await mv.count()) await mv.click();
    await page.waitForTimeout(400);
  }
  await shot('09-battle-end');
  await clearDialogs();

  // 3びきの チームを Lv20 にして、ホーム・バトル・図鑑を見る
  await editSave((s) => {
    const ids = ['cobra', 'hyoumon', 'kamonohashi'];
    const mk = (id, i) => ({ uid: 'u' + i, species: id, hatched: true, level: 20, exp: 10, hp: 999, bonus: { hp: 8, atk: 9, def: 6 }, mealsToday: 1, trainsToday: 2, moves: [{ id: 'n' + i, name: 'わざ', types: ['shibire'], power: 1.1 }] });
    s.creatures = ids.map(mk);
    s.team = ['u0', 'u1', 'u2'];
    s.focus = 'u0';
    s.owned = ['seaka', 'suzumebachi', 'mamushi', 'yamakagashi', 'tobizu', 'kabaki', 'mitsubachi', 'iraga', 'imori', 'hikigaeru', 'shidoni', 'sasori', 'deathstalker', 'garagara', 'gila', 'taipan', 'minokasago', 'akaei', 'torafugu', 'hyoumon', 'onidaruma', 'katsuo', 'anboina', 'erabu', 'kamonohashi', 'yadoku', 'habu', 'cobra', 'mamba', 'loris'];
    s.factsSeen = Object.fromEntries(s.owned.map((id) => [id, 3]));
    s.coins = 500;
    s.essence = 3;
  });
  await reopen();
  await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('ng.venom.') && !x.endsWith('.bak'));
    const s = JSON.parse(localStorage.getItem(k));
    for (const c of s.creatures) c.hp = 120;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await reopen();
  await shot('10-home-team');
  await click('[data-act="battle"]');
  await click('[data-boss="0"]');
  await page.waitForTimeout(1200);
  await shot('11-boss');
  let swapped = false;
  for (let t = 0; t < 200; t++) {
    if (await page.locator('.dlg-back').count()) break;
    const pick = page.locator('#cmd [data-to]').first();
    const swap = page.locator('#cmd [data-swap]:not([disabled])');
    const mv = page.locator('#cmd [data-mv]').first();
    if (await pick.count()) {
      await shot('11b-switch');
      await pick.click();
    } else if (!swapped && (await swap.count())) {
      swapped = true;
      await swap.click();
    } else if (await mv.count()) await mv.click();
    await page.waitForTimeout(350);
  }
  if (!swapped) throw new Error('こうたい ボタンが でなかった');
  await shot('12-boss-end');
  await clearDialogs();
  await click('[data-back="home"]');
  await click('[data-go="zukan"]');
  await shot('13-zukan');
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(300);
  await shot('14-zukan-2');
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(300);
  await shot('15-zukan-3');
  await click('[data-sp="kamonohashi"]');
  await shot('16-zukan-detail');
}
