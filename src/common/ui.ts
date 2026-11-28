// 小さなUI部品：メッセージ表示、確認ダイアログ。
import { rb } from './text';

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const e = root.querySelector<HTMLElement>(sel);
  if (!e) throw new Error(`not found: ${sel}`);
  return e;
}

let toastTimer: number | null = null;
export function toast(msg: string, ms = 2200): void {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.innerHTML = rb(msg);
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('show'), ms);
}

// ボタン付きのダイアログ。押されたボタンの値を返す。
export function dialog<T extends string>(html: string, buttons: { label: string; value: T; primary?: boolean }[]): Promise<T> {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'dlg-back';
    back.innerHTML = `<div class="dlg"><div class="dlg-body">${rb(html)}</div><div class="dlg-btns">${buttons
      .map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''}" data-i="${i}">${rb(b.label)}</button>`)
      .join('')}</div></div>`;
    document.body.appendChild(back);
    back.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach((btn) => {
      btn.onclick = () => {
        back.remove();
        resolve(buttons[Number(btn.dataset.i)].value);
      };
    });
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const COMMON_CSS = `
#toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,40px);opacity:0;pointer-events:none;
  background:rgba(20,20,30,.92);color:#fff;font-size:22px;padding:14px 24px;border-radius:16px;transition:.25s;z-index:1000;
  max-width:90vw;text-align:center;line-height:1.7}
#toast.show{opacity:1;transform:translate(-50%,0)}
.dlg-back{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:900}
.dlg{background:#fff;color:#222;border-radius:24px;padding:28px 32px;max-width:min(640px,92vw);max-height:90vh;overflow:auto;
  box-shadow:0 12px 40px rgba(0,0,0,.4)}
.dlg-body{font-size:22px;line-height:1.9}
.dlg-btns{display:flex;gap:14px;justify-content:center;margin-top:22px;flex-wrap:wrap}
rt{font-size:.5em}
/* スマホ（おためし）：ダブルタップで ズームしない・タップの いろを けす */
html{touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
input,textarea{-webkit-user-select:text;user-select:text}
/* スマホを たてに した ときは「よこむきに してね」 */
@media (orientation:portrait) and (pointer:coarse) and (max-width:820px){
  body::after{content:'📱 よこむきに してね';position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;
    background:#141030;color:#fff;font-size:28px;font-weight:900;text-align:center;padding:20px}
}
/* よこが ひくい がめん（スマホの よこむき）：ダイアログを つめる */
@media (max-height:520px){
  .dlg{padding:12px 16px;border-radius:16px;max-height:94vh}
  .dlg-body{font-size:16px;line-height:1.6}
  .dlg-btns{margin-top:10px;gap:8px}
  .dlg .btn{font-size:16px;padding:8px 16px}
  #toast{font-size:15px;padding:8px 14px;bottom:10px}
}
`;
