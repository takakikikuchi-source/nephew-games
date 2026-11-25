// 「だれが あそぶ？」：名前ごとのセーブデータ。2つのゲームで共通の一覧を使う。
import { load, remove, save } from './storage';
import { esc } from './text';

export type ProfileId = string;

export interface Profile {
  id: ProfileId;
  name: string;
  color: string;
  icon: string;
}

const COLORS = ['#d9480f', '#1c7ed6', '#2f9e44', '#9c36b5', '#e8590c', '#0c8599', '#c2255c', '#5c940d'];
const ICONS = ['🦂', '🚄', '🐍', '🚅', '🕷️', '🐸', '⭐', '🦖'];
const MAX_PLAYERS = 8;

export function getProfiles(): Profile[] {
  const list = load<Profile[]>('players', []);
  return Array.isArray(list) ? list.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string') : [];
}

function saveProfiles(list: Profile[]): void {
  save('players', list);
}

export function addProfile(name: string): Profile {
  const list = getProfiles();
  const n = list.length;
  const p: Profile = {
    id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim().slice(0, 8),
    color: COLORS[n % COLORS.length],
    icon: ICONS[n % ICONS.length],
  };
  list.push(p);
  saveProfiles(list);
  return p;
}

export function removeProfile(id: ProfileId): void {
  saveProfiles(getProfiles().filter((p) => p.id !== id));
  remove(`venom.${id}`);
  remove(`shinkansen.${id}`);
}

// プロフィール選択の画面を container に作る。選ばれたら onPick が呼ばれる。
export function renderProfilePicker(container: HTMLElement, onPick: (p: Profile, isNew: boolean) => void, onSound?: () => void): void {
  const profiles = getProfiles();
  container.innerHTML = `
    <div class="pp-wrap">
      <h2 class="pp-title">だれが あそぶ？</h2>
      <div class="pp-row">
        ${profiles
          .map(
            (p) => `
          <div class="pp-card" style="--pc:${p.color}">
            <button class="pp-pick" data-id="${p.id}">
              <span class="pp-icon">${p.icon}</span>
              <span class="pp-name">${esc(p.name)}</span>
            </button>
            <button class="pp-del" data-del="${p.id}">けす</button>
          </div>`,
          )
          .join('')}
        ${
          profiles.length < MAX_PLAYERS
            ? `<div class="pp-card" style="--pc:#868e96"><button class="pp-pick pp-new" id="pp-new"><span class="pp-icon">＋</span><span class="pp-name">あたらしく<br>はじめる</span></button></div>`
            : ''
        }
      </div>
      <form class="pp-form" id="pp-form" hidden>
        <label for="pp-input">なまえを いれてね（8もじまで）</label>
        <input id="pp-input" maxlength="8" autocomplete="off" placeholder="なまえ">
        <div class="pp-form-btns"><button type="submit" class="pp-ok">はじめる</button><button type="button" class="pp-cancel">やめる</button></div>
      </form>
    </div>`;
  const form = container.querySelector<HTMLFormElement>('#pp-form')!;
  const input = container.querySelector<HTMLInputElement>('#pp-input')!;
  container.querySelectorAll<HTMLButtonElement>('.pp-pick[data-id]').forEach((b) => {
    b.onclick = () => {
      onSound?.();
      const p = getProfiles().find((x) => x.id === b.dataset.id)!;
      onPick(p, false);
    };
  });
  container.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => {
    b.onclick = () => {
      onSound?.();
      if (b.dataset.confirm !== '1') {
        b.dataset.confirm = '1';
        b.textContent = 'ほんとうに けす？';
        b.classList.add('warn');
        setTimeout(() => {
          if (b.isConnected) {
            b.dataset.confirm = '';
            b.textContent = 'けす';
            b.classList.remove('warn');
          }
        }, 4000);
        return;
      }
      removeProfile(b.dataset.del!);
      renderProfilePicker(container, onPick, onSound);
    };
  });
  const newBtn = container.querySelector<HTMLButtonElement>('#pp-new');
  if (newBtn)
    newBtn.onclick = () => {
      onSound?.();
      form.hidden = false;
      input.value = '';
      input.focus();
    };
  container.querySelector<HTMLButtonElement>('.pp-cancel')!.onclick = () => {
    form.hidden = true;
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    onSound?.();
    onPick(addProfile(name), true);
  };
}

export const PROFILE_CSS = `
.pp-wrap{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px;max-width:100%}
.pp-title{font-size:clamp(28px,4vw,44px);margin:0}
.pp-row{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
.pp-card{display:flex;flex-direction:column;align-items:center;gap:8px}
.pp-pick{width:min(190px,40vw);aspect-ratio:1;border-radius:26px;border:6px solid var(--pc);background:#fff;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;
  box-shadow:0 8px 0 var(--pc);transition:transform .1s;padding:8px}
.pp-pick:hover{transform:translateY(-4px)}
.pp-pick:active{transform:translateY(4px);box-shadow:0 2px 0 var(--pc)}
.pp-icon{font-size:clamp(48px,7vw,76px);line-height:1}
.pp-new .pp-icon{color:#868e96;font-weight:900}
.pp-name{font-size:clamp(20px,2.6vw,28px);font-weight:700;color:#222;text-align:center;line-height:1.3;word-break:break-all}
.pp-del{font-size:14px;padding:5px 12px;border-radius:999px;border:2px solid #aaa;background:#fff;color:#555;cursor:pointer}
.pp-del.warn{border-color:#e03131;color:#e03131;font-weight:700}
.pp-form{display:flex;flex-direction:column;align-items:center;gap:12px;background:#fff;color:#222;padding:20px 26px;border-radius:22px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.pp-form[hidden]{display:none}
.pp-form label{font-size:20px;font-weight:700}
.pp-form input{font-size:28px;padding:10px 14px;border-radius:14px;border:3px solid #adb5bd;width:min(320px,70vw);text-align:center;font-family:inherit}
.pp-form-btns{display:flex;gap:12px}
.pp-form-btns button{font-size:20px;font-weight:700;padding:10px 22px;border-radius:14px;border:none;cursor:pointer;font-family:inherit}
.pp-ok{background:#ffd43b;color:#3b2a00}
.pp-cancel{background:#e9ecef;color:#333}
`;
