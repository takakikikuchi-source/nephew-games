# 甥っ子ゲーム

ブラウザで遊べるゲーム2本です。インストール不要で、ネットにつながっていなくても遊べます。

| ゲーム | ファイル | 対象 |
| --- | --- | --- |
| ベノムモンスター（毒生物の育成） | `play/venom.html` | 上の子（小3） |
| しんかんせん うんてんし | `play/shinkansen.html` | 下の子（年長） |

要件定義書は Claude Docs にあります。

## フォルダの中身

| 場所 | 中身 |
| --- | --- |
| `src/` | ゲームのソース（TypeScript） |
| `play/` | 遊ぶためのファイル（`npm run build` で作られる。GitHub にもこのまま置く） |
| `tools/` | 甥っ子さんのPCに入れるための bat と PowerShell |
| `scripts/` | ビルドと自動テスト |

## 開発のしかた

```
npm install
npm run build      # play/ を作り直す
npm run check      # 型チェック
npm test           # Edge でベノムモンスターを自動プレイ（test-output/ に画面が保存される）
node scripts/smoke.mjs shinkansen   # 新幹線を自動プレイ
```

`play/shinkansen.html?fast=6` のように開くと、テスト用に6倍速になります。

## 甥っ子さんのPCへの入れ方（はじめの1回）

1. 子ども用の Windows アカウントでサインインする
2. GitHub のリポジトリのページから「Code → Download ZIP」でダウンロードして、展開する
3. 展開したフォルダの `tools\setup.bat` をダブルクリックする

すると、次のようになります。

- ゲームが `%LOCALAPPDATA%\NephewGames\play` に入る
- デスクトップに「ベノムモンスター」「しんかんせん うんてんし」のアイコンができる
- スタートアップに `NephewGamesUpdate.bat` が入り、サインインのたびに GitHub から最新版を取ってくる

## 更新のしかた

1. ゲームを直して `npm run build` する
2. `git push` する
3. 甥っ子さんのPCは、次に電源を入れてサインインしたときに自動で最新版になる

更新の記録は `%LOCALAPPDATA%\NephewGames\update.log` に残ります。失敗したときは前の版のまま遊べます。

更新元は `tools/update.ps1` の `$Repo`（いまは `takakikikuchi-source/nephew-games`）です。

## セーブデータ

- ブラウザ（Edge）の中に、子どもごと・ゲームごとに保存されます
- ベノムモンスターの「せってい → セーブを ファイルに ほぞん」で、ファイルにバックアップできます
- Edge の「閲覧データの削除」でサイトデータを消すと、セーブも消えるので注意してください
