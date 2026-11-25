// セーブはブラウザの localStorage に入れる。キーはすべて "ng." で始める。
// 万一に備えて、全部をファイルに書き出す／読み込む機能も持つ。
const PREFIX = 'ng.';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 保存できなくても遊びは続けられるようにする
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

interface Backup {
  app: 'nephew-games';
  savedAt: string;
  data: Record<string, string>;
}

export function exportAll(): void {
  const data: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) data[k] = localStorage.getItem(k) ?? '';
    }
  } catch {
    /* ignore */
  }
  const backup: Backup = { app: 'nephew-games', savedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  a.href = URL.createObjectURL(blob);
  a.download = `game-save-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export function importAll(): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(false);
      try {
        const backup = JSON.parse(await f.text()) as Backup;
        if (backup.app !== 'nephew-games' || typeof backup.data !== 'object') return resolve(false);
        for (const [k, v] of Object.entries(backup.data)) {
          if (k.startsWith(PREFIX) && typeof v === 'string') localStorage.setItem(k, v);
        }
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    input.click();
  });
}
