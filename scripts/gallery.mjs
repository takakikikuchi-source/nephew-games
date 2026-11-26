// ① の絵をぜんぶ並べたコンタクトシートを撮る（絵を直したときの見比べ用）
// 使い方: node scripts/gallery.mjs <タグ> [幅px]  → test-output/gallery-<タグ>.png
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tag = process.argv[2] ?? 'now';
const cell = Number(process.argv[3] ?? 120);

const entry = `
import { SPECIES } from './src/venom/data';
import { creatureSvg, eggSvg, bossSvg } from './src/venom/art';
const rows = [];
const only = '${process.argv[4] ?? ''}'.split(',').filter(Boolean);
for (const id of Object.keys(SPECIES).filter((k) => !only.length || only.includes(k))) {
  rows.push('<div class="row"><div class="nm">' + SPECIES[id].name + '</div>' +
    [1, 2, 3].map((s) => '<div class="c">' + creatureSvg(id, s) + '</div>').join('') + '</div>');
}
rows.push('<div class="row"><div class="nm">たまご/ボス</div>' + ['N', 'R', 'SR'].map((r) => '<div class="c">' + eggSvg(r) + '</div>').join('') + '</div>');
rows.push('<div class="row"><div class="nm"></div>' + ['hebikui', 'mongoose', 'ratel'].map((b) => '<div class="c">' + bossSvg(b) + '</div>').join('') + '</div>');
document.getElementById('g').innerHTML = rows.join('');
`;
const r = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts' },
  bundle: true, format: 'iife', write: false, target: 'es2020',
});
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#f4efe3;font:12px sans-serif}
#g{display:grid;grid-template-columns:repeat(${process.argv[4] ? 2 : 4},auto);gap:4px 14px;padding:8px;width:max-content}
.row{display:flex;align-items:center;gap:2px}
.nm{width:70px;font-weight:700}
.c{width:${cell}px;height:${cell}px;background:linear-gradient(#e9f2df,#cfe0b8);border-radius:8px}
.c svg{width:100%;height:100%;display:block}
</style><div id="g"></div><script>${r.outputFiles[0].text}</script>`;
await fs.mkdir(path.join(root, 'test-output'), { recursive: true });
const file = path.join(root, 'test-output', `gallery-${tag}.html`);
await fs.writeFile(file, html);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto('file:///' + file.replace(/\\/g, '/'));
await page.waitForTimeout(300);
await page.locator('#g').screenshot({ path: path.join(root, 'test-output', `gallery-${tag}.png`) });
await browser.close();
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : `OK test-output/gallery-${tag}.png`);
