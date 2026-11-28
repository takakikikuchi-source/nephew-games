// スマホ：ホーム画面に追加（GitHub Pages で ひらいた とき）と「ぜんがめん」ボタン
// PC（file:// で ひらく）では なにも しない。

// サービスワーカー：ネットが なくても あそべるように（http/https の ときだけ）
export function registerSW(): void {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* sw.js が ない ばしょ（claude.ai の おためしページなど）では なにも しない */
    });
  });
}

// ぜんがめんに できる スマホ だけ ボタンを だす（iPhone・claude.ai の なか・PC では でない）
export function canFullscreen(): boolean {
  return (
    !!document.fullscreenEnabled &&
    window.matchMedia('(pointer: coarse)').matches &&
    !document.fullscreenElement &&
    !window.matchMedia('(display-mode: fullscreen)').matches &&
    !window.matchMedia('(display-mode: standalone)').matches
  );
}

export const fullscreenButton = (): string => (canFullscreen() ? '<button class="fsbtn" id="fsbtn">⛶ ぜんがめん</button>' : '');

export function bindFullscreen(root: HTMLElement): void {
  const b = root.querySelector<HTMLButtonElement>('#fsbtn');
  if (!b) return;
  b.onclick = async () => {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o.lock?.('landscape').catch(() => {});
    } catch {
      /* できなかったら なにも しない */
    }
    b.remove();
  };
}
