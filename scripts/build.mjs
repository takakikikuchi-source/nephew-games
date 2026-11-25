// 各ゲームを「ダブルクリックで開ける1つのHTMLファイル」にまとめる。
// file:// で開くとES Modulesが使えないので、IIFEにバンドルしてHTMLに埋め込む。
import { build, context } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'play');
const games = ['venom', 'shinkansen'];
const watch = process.argv.includes('--watch');

async function writeGame(id, js) {
  const tpl = await fs.readFile(path.join(root, 'src', id, 'index.html'), 'utf8');
  const safe = js.replace(/<\/script/gi, '<\\/script');
  const html = tpl.replace('<!--APP-->', () => `<script>${safe}</script>`);
  await fs.writeFile(path.join(out, `${id}.html`), html);
  console.log(`built play/${id}.html (${Math.round(html.length / 1024)} KB)`);
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  await fs.copyFile(path.join(root, 'src', 'menu.html'), path.join(out, 'index.html'));
  for (const id of games) {
    try {
      await fs.access(path.join(root, 'src', id, 'main.ts'));
    } catch {
      continue;
    }
    const opts = {
      entryPoints: [path.join(root, 'src', id, 'main.ts')],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      minify: !watch,
      write: false,
      charset: 'utf8',
      logLevel: 'warning',
    };
    if (watch) {
      const ctx = await context({
        ...opts,
        plugins: [{
          name: 'write-html',
          setup(b) {
            b.onEnd(async (r) => {
              if (r.errors.length === 0) await writeGame(id, r.outputFiles[0].text);
            });
          },
        }],
      });
      await ctx.watch();
    } else {
      const r = await build(opts);
      await writeGame(id, r.outputFiles[0].text);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
