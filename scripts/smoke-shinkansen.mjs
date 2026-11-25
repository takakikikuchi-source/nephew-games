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
  await click('.pp-pick[data-id="p2"]');
  await shot('02-mode');
  const guide = async () => page.evaluate(() => document.getElementById('guide')?.textContent ?? '');
  const distTxt = async () => page.evaluate(() => document.getElementById('dist')?.textContent ?? '');
  const isResult = async () => (await page.locator('#s-result.on').count()) > 0;

  // ---- かんたんモード ----
  await click('[data-mode="easy"]');
  await shot('03-courses');
  await click('[data-c="k-tokyo"]');
  await page.waitForTimeout(2500);
  await shot('04-start');
  await page.waitForTimeout(12000);
  for (let leg = 0; leg < 2; leg++) {
    await page.keyboard.down('ArrowUp');
    let braking = false;
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(300);
      if (i === 20 && leg === 0) await shot('06-running');
      if ((await guide()).includes('とまる') && !braking) {
        braking = true;
        await page.keyboard.up('ArrowUp');
        await page.keyboard.down('ArrowDown');
      }
      if (braking && (await guide()).includes('まえへ')) {
        await page.keyboard.up('ArrowDown');
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(700);
        await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(500);
        await page.keyboard.down('ArrowDown');
      }
      if (braking && (await distTxt()).includes('とまって')) break;
      if (await isResult()) break;
    }
    await page.keyboard.up('ArrowDown');
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(800);
    await shot(`08-stopped-${leg}`);
    if (await isResult()) break;
    await page.waitForTimeout(14000);
  }
  for (let i = 0; i < 40 && !(await isResult()); i++) await page.waitForTimeout(500);
  await shot('09-result');

  // ---- ふつうモード（レバー）：熱海→三島（長いトンネル）----
  await click('#courses');
  await click('#back');
  await click('[data-mode="normal"]');
  await click('[data-c="k-fuji"]');
  await page.waitForTimeout(7000);
  await page.keyboard.press('d'); // ドアを閉める
  await page.waitForTimeout(9000);
  await shot('10-normal-depart');
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowUp');
  let tunnelShot = false;
  let braking = false;
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(250);
    const inTunnel = await page.evaluate(() => (window).__inTunnel === true);
    if (inTunnel && !tunnelShot) {
      tunnelShot = true;
      await shot('11-tunnel');
    }
    const g = await guide();
    if (g.includes('ATC ブレーキ')) await shot('12-atc-brake');
    if (g.includes('そろそろ') && !braking) {
      braking = true;
      for (let k = 0; k < 9; k++) await page.keyboard.press('ArrowDown');
      await shot('13-braking');
    }
    if (braking && (await distTxt()).includes('とまって')) break;
  }
  await page.waitForTimeout(1200);
  await shot('14-normal-arrived');
}
