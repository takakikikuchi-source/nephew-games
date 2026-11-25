// 「{漢字|かんじ}」の書き方を <ruby> に変える。子ども向けに、漢字には必ずふりがなを付ける。
export function rb(s: string): string {
  return s.replace(/\{([^|{}]+)\|([^{}]+)\}/g, (_m, kanji: string, yomi: string) => `<ruby>${kanji}<rt>${yomi}</rt></ruby>`);
}

// ふりがな記法を外して、読み（ひらがな）だけにする。音声読み上げ用。
export function yomi(s: string): string {
  return s.replace(/\{([^|{}]+)\|([^{}]+)\}/g, (_m, _k: string, y: string) => y);
}

// ふりがな記法を外して、漢字だけにする。
export function plain(s: string): string {
  return s.replace(/\{([^|{}]+)\|([^{}]+)\}/g, (_m, k: string) => k);
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
