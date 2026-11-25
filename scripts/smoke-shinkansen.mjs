// 新幹線うんてんし の自動プレイ（smoke.mjs から呼ばれる）
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function ({ page, shot, click, root }) {
  const url = pathToFileURL(path.join(root, 'play', 'shinkansen.html')).href + '?fast=6';
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await shot('01-title');
  await click('#start');
  await click('#pp-new');
  await page.fill('#pp-input', 'テスト');
  await shot('02-name');
  await click('.pp-ok');
  await shot('03-mode');
  const guide = async () => page.evaluate(() => document.getElementById('guide')?.textContent ?? '');
  const distTxt = async () => page.evaluate(() => document.getElementById('dist')?.textContent ?? '');
  const isResult = async () => (await page.locator('#s-result.on').count()) > 0;
  const press = async (k, n) => {
    for (let i = 0; i < n; i++) await page.keyboard.press(k);
  };

  // ---- かんたんモード ----
  await click('[data-mode="easy"]');
  await click('[data-c="k-tokyo"]');
  await page.waitForFunction(() => window.renderer?.info.render.calls > 0, null, { timeout: 15000 });
  console.log('draw calls:', await page.evaluate(() => window.renderer.info.render.calls));
  await page.waitForTimeout(2500);
  await shot('04-start');
  await page.waitForTimeout(12000);
  for (let leg = 0; leg < 2; leg++) {
    await press('w', 5);
    let braking = false;
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(300);
      if (i === 15 && leg === 0) await shot('06-running');
      const g = await guide();
      if (g.includes('ブレーキ！') && !braking) {
        braking = true;
        await press('s', 5);
        await press('ArrowDown', 5);
      }
      if (braking && g.includes('まえへ')) {
        await press('ArrowUp', 8);
        await press('w', 2);
        await page.waitForTimeout(1200);
        await press('s', 2);
        await press('ArrowDown', 3);
        await page.waitForTimeout(1500);
      }
      if (braking && (await distTxt()).includes('とまって')) break;
      if (await isResult()) break;
    }
    await page.waitForTimeout(800);
    await shot(`08-stopped-${leg}`);
    if (await isResult()) break;
    await page.waitForTimeout(14000);
  }
  for (let i = 0; i < 40 && !(await isResult()); i++) await page.waitForTimeout(500);
  await shot('09-result');

  // ---- ふつうモード ----
  await click('#courses');
  await click('#back');
  await click('[data-mode="normal"]');
  await click('[data-c="k-odawara"]');
  await page.waitForTimeout(7000);
  await page.keyboard.press('d');
  await page.waitForTimeout(9000);
  await press('ArrowUp', 8);
  await press('w', 5);
  let maxKmh = 0;
  for (let i = 0; i < 200; i++) {
    await page.waitForTimeout(250);
    const k = await page.evaluate(() => Number(document.getElementById('spdnum')?.textContent ?? 0));
    maxKmh = Math.max(maxKmh, k);
    if (i === 40) await shot('10-normal-fast');
    if ((await guide()).includes('そろそろ')) break;
  }
  console.log('max speed in normal run:', maxKmh);
  await shot('11-normal-brake-hint');
}
