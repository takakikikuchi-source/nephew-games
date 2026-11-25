# ゲームを最新版にする（サインインしたときに update.bat から自動で動く）
# ネットにつながっていなければ何もしない。失敗しても前の版のまま遊べる。
$ErrorActionPreference = 'Stop'

# ---- ここを GitHub の「ユーザー名/リポジトリ名」にする ----
$Repo = 'takakikikuchi-source/nephew-games'
$Branch = 'main'
# ---------------------------------------------------------

$Dest = Join-Path $env:LOCALAPPDATA 'NephewGames'
$Log = Join-Path $Dest 'update.log'

function Write-Log([string]$m) {
  try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" | Out-File -FilePath $Log -Append -Encoding utf8 } catch { }
}

try {
  New-Item -ItemType Directory -Force $Dest | Out-Null
  if ($Repo -eq 'OWNER/REPO') { Write-Log 'リポジトリが設定されていないので終了'; exit 0 }
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  # ネットにつながるまで少し待つ（最大およそ1分）
  $online = $false
  for ($i = 0; $i -lt 12; $i++) {
    try {
      Invoke-WebRequest -Uri 'https://github.com' -Method Head -UseBasicParsing -TimeoutSec 10 | Out-Null
      $online = $true
      break
    } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $online) { Write-Log 'オフラインなので更新しない'; exit 0 }

  $tmp = Join-Path $env:TEMP 'NephewGamesUpdate'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  New-Item -ItemType Directory $tmp | Out-Null
  $zip = Join-Path $tmp 'games.zip'
  Invoke-WebRequest -Uri "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile $zip -UseBasicParsing -TimeoutSec 120
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $src = Get-ChildItem $tmp -Directory | Select-Object -First 1
  $newPlay = Join-Path $src.FullName 'play'

  # 中身を確かめてから入れ替える
  foreach ($f in @('index.html', 'venom.html', 'shinkansen.html')) {
    if (-not (Test-Path (Join-Path $newPlay $f))) { throw "ダウンロードした中に $f がない" }
  }
  $play = Join-Path $Dest 'play'
  $staging = Join-Path $Dest 'play.new'
  $old = Join-Path $Dest 'play.old'
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  Copy-Item $newPlay $staging -Recurse
  if (Test-Path $old) { Remove-Item $old -Recurse -Force }
  if (Test-Path $play) { Rename-Item $play 'play.old' }
  Rename-Item $staging 'play'

  # 更新のしくみ自体も新しくする
  $tools = Join-Path $src.FullName 'tools'
  foreach ($f in @('update.ps1', 'update.bat')) {
    $p = Join-Path $tools $f
    if (Test-Path $p) { Copy-Item $p (Join-Path $Dest $f) -Force }
  }
  Remove-Item $tmp -Recurse -Force
  Write-Log '更新しました'
} catch {
  Write-Log "更新できませんでした: $($_.Exception.Message)"
  # 入れ替えの途中で失敗したら、前の版にもどす
  $play = Join-Path $Dest 'play'
  $old = Join-Path $Dest 'play.old'
  if (-not (Test-Path $play) -and (Test-Path $old)) { Rename-Item $old 'play' }
}
exit 0
