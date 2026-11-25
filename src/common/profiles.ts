// 「だれがあそぶ？」のプロフィール。2つのゲームで共通。本名ではなくニックネームだけを持つ。
import { load, save } from './storage';
import { esc } from './text';

export type ProfileId = 'p1' | 'p2';

export interface Profile {
  id: ProfileId;
  name: string;
  color: string;
  icon: string;
}

const DEFAULTS: Profile[] = [
  { id: 'p1', name: 'おにいちゃん', color: '#d9480f', icon: '🦂' },
  { id: 'p2', name: 'おとうと', color: '#1c7ed6', icon: '🚄' },
];

export function getProfiles(): Profile[] {
  const saved = load<Partial<Record<ProfileId, string>>>('profiles', {});
  return DEFAULTS.map((p) => ({ ...p, name: saved[p.id] || p.name }));
}

export function setProfileName(id: ProfileId, name: string): void {
  const saved = load<Partial<Record<ProfileId, string>>>('profiles', {});
  saved[id] = name.trim().slice(0, 8);
  save('profiles', saved);
}

// プロフィール選択の画面を container に作る。選ばれたら onPick が呼ばれる。
export function renderProfilePicker(container: HTMLElement, onPick: (p: Profile) => void, onSound?: () => void): void {
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
            <button class="pp-rename" data-id="${p.id}">なまえを かえる</button>
          </div>`,
          )
          .join('')}
      </div>
    </div>`;
  container.querySelectorAll<HTMLButtonElement>('.pp-pick').forEach((b) => {
    b.onclick = () => {
      onSound?.();
      const p = getProfiles().find((x) => x.id === b.dataset.id)!;
      onPick(p);
    };
  });
  container.querySelectorAll<HTMLButtonElement>('.pp-rename').forEach((b) => {
    b.onclick = () => {
      const p = getProfiles().find((x) => x.id === b.dataset.id)!;
      const name = window.prompt('あたらしい なまえ（8もじまで）', p.name);
      if (name && name.trim()) {
        setProfileName(p.id, name);
        renderProfilePicker(container, onPick, onSound);
      }
    };
  });
}

export const PROFILE_CSS = `
.pp-wrap{display:flex;flex-direction:column;align-items:center;gap:28px;padding:24px}
.pp-title{font-size:clamp(28px,4vw,44px);margin:0}
.pp-row{display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
.pp-card{display:flex;flex-direction:column;align-items:center;gap:10px}
.pp-pick{width:min(260px,40vw);aspect-ratio:1;border-radius:28px;border:6px solid var(--pc);background:#fff;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:pointer;
  box-shadow:0 8px 0 var(--pc);transition:transform .1s}
.pp-pick:hover{transform:translateY(-4px)}
.pp-pick:active{transform:translateY(4px);box-shadow:0 2px 0 var(--pc)}
.pp-icon{font-size:clamp(56px,9vw,96px);line-height:1}
.pp-name{font-size:clamp(22px,3vw,32px);font-weight:700;color:#222}
.pp-rename{font-size:14px;padding:6px 12px;border-radius:999px;border:2px solid #aaa;background:#fff;color:#444;cursor:pointer}
`;
