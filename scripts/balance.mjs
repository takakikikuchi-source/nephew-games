// balance-entry.ts を node で動くようにまとめて実行する
import { build } from 'esbuild';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(os.tmpdir(), `venom-balance-${Date.now()}.mjs`);
await build({
  entryPoints: [path.join(root, 'scripts', 'balance-entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  logLevel: 'warning',
});
await import(pathToFileURL(out).href);
