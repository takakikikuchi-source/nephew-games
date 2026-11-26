// 画像は esbuild で data URL として埋め込む（file:// で開いても WebGL で使えるように）
declare module '*.jpg' {
  const url: string;
  export default url;
}
