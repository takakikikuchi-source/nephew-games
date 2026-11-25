// Edge を自動で動かして、ゲームが最後まで動くか・エラーが出ないかを確かめる。
// 使い方: node scripts/smoke.mjs [venom|shinkansen]
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'test-output');
await fs.mkdir(outDir, { recursive: true });
const which = process.argv[2] ?? 'venom';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('dialog', (d) => d.accept('テスト'));

const shot = async (name) => page.screenshot({ path: path.join(outDir, `${which}-${name}.png`) });
const click = async (sel) => {
  await page.locator(sel).filter({ visible: true }).first().click();
  await page.waitForTimeout(250);
};
const dlgOk = async () => {
  // ダイアログの最初の primary ボタン（なければ最初のボタン）を押す
  for (let i = 0; i < 10; i++) {
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

async function venom() {
  await page.goto(pathToFileURL(path.join(root, 'play', 'venom.html')).href);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await shot('01-title');
  await click('#start');
  await shot('02-profile');
  await click('.pp-pick[data-id="p1"]');
  await dlgOk(); // ようこそ
  await shot('03-gacha');
  await click('#pull');
  await page.waitForTimeout(3600);
  await shot('04-gacha-result');
  await dlgOk();
  await shot('05-home-egg');
  await click('[data-act="pet"]');
  await page.waitForTimeout(1000);
  await click('[data-act="sleep"]');
  await dlgOk();
  await page.waitForTimeout(1800);
  await shot('06-hatch');
  await dlgOk();
  await shot('07-home-baby');
  // ごはん（正しいもの・まちがい）
  await click('[data-act="feed"]');
  await shot('08-feed');
  await click('[data-food]');
  await page.waitForTimeout(500);
  if (await page.locator('.dlg-back').count()) await dlgOk();
  // トレーニング
  await click('[data-act="train"]');
  await click('[data-stat="doku"]');
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(400);
    await click('#tstop');
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(1800);
  // 何日か すすめて おとなに する
  for (let d = 0; d < 6; d++) {
    await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => x.startsWith('ng.venom.'));
      const s = JSON.parse(localStorage.getItem(k));
      const c = s.creatures[0];
      c.hunger = 90; c.mood = 90; c.clean = 90; c.poops = []; c.sick = false;
      localStorage.setItem(k, JSON.stringify(s));
    });
    await page.reload();
    await click('#start');
    await click('.pp-pick[data-id="p1"]');
    await click('[data-act="sleep"]');
    await dlgOk();
    await page.waitForTimeout(1800);
    await dlgOk();
  }
  await shot('09-home-adult');
  // どくラボ
  await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('ng.venom.'));
    const s = JSON.parse(localStorage.getItem(k));
    s.moto = { shibire: 3, chi: 3, itami: 3, kowashi: 3 }; s.essence = 2; s.coins = 500;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await click('#start');
  await click('.pp-pick[data-id="p1"]');
  await click('[data-act="lab"]');
  await click('[data-put="chi"]');
  await click('[data-put="chi"]');
  await shot('10-lab');
  await click('#mix');
  await page.waitForTimeout(1900);
  await shot('11-craft');
  await dlgOk();
  await dlgOk();
  await page.waitForTimeout(400);
  // バトル
  await click('[data-back="home"]');
  await click('[data-act="boss"]');
  await shot('12-boss');
  await click('[data-boss="0"]');
  await shot('13-battle');
  for (let t = 0; t < 30; t++) {
    if (!(await page.locator('#s-battle.on').count())) break;
    if (await page.locator('.dlg-back').count()) {
      await shot('14-battle-end');
      await dlgOk();
      break;
    }
    const mv = page.locator('.bmove[data-mv]:not([disabled])').first();
    if (await mv.count()) await mv.click();
    await page.waitForTimeout(1200);
  }
  // ずかん
  await click('[data-back="home"]');
  await click('[data-go="zukan"]');
  await click('[data-sp]');
  await shot('15-zukan');
  await dlgOk();
  await click('[data-tab="kusuri"]');
  await shot('16-kusuri');
  // ほかの生き物の絵を全部見る
  await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('ng.venom.'));
    const s = JSON.parse(localStorage.getItem(k));
    s.seen = ['sasori', 'seaka', 'suzumebachi', 'yadoku', 'habu', 'cobra'];
    s.factsSeen = { sasori: 3, seaka: 3, suzumebachi: 3, yadoku: 3, habu: 3, cobra: 3 };
    s.bossBeaten = ['hebikui', 'mongoose', 'mitsuanaguma'];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await click('#start');
  await click('.pp-pick[data-id="p1"]');
  await click('[data-go="zukan"]');
  await shot('17-zukan-all');
  await click('[data-tab="boss"]');
  await shot('18-zukan-boss');
}

try {
  if (which === 'venom') await venom();
  else {
    const mod = await import(pathToFileURL(path.join(root, 'scripts', `smoke-${which}.mjs`)).href);
    await mod.default({ page, shot, click, root, errors });
  }
} catch (e) {
  errors.push(`script: ${e.message}`);
  await shot('zz-failure').catch(() => {});
}
await browser.close();
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
} else console.log('OK: no errors');
