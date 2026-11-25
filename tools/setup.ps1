# はじめに1回だけ動かす（子ども用のWindowsアカウントで setup.bat をダブルクリック）
# ・ゲームを %LOCALAPPDATA%\NephewGames に入れる
# ・デスクトップにゲームのアイコンを作る
# ・サインインしたときに自動で最新版にする bat を「スタートアップ」に入れる
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$Dest = Join-Path $env:LOCALAPPDATA 'NephewGames'

Write-Host 'ゲームを いれています…'
New-Item -ItemType Directory -Force $Dest | Out-Null
$play = Join-Path $Dest 'play'
if (Test-Path $play) { Remove-Item $play -Recurse -Force }
Copy-Item (Join-Path $root 'play') $play -Recurse
Copy-Item (Join-Path $here 'update.ps1') (Join-Path $Dest 'update.ps1') -Force
Copy-Item (Join-Path $here 'update.bat') (Join-Path $Dest 'update.bat') -Force

# スタートアップに更新用の bat を入れる
$startup = [Environment]::GetFolderPath('Startup')
Copy-Item (Join-Path $here 'update.bat') (Join-Path $startup 'NephewGamesUpdate.bat') -Force

# デスクトップにアイコンを作る
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$links = @(
  @{ Name = 'ベノムモンスター'; File = 'venom.html' },
  @{ Name = 'しんかんせん うんてんし'; File = 'shinkansen.html' }
)
foreach ($l in $links) {
  $lnk = $shell.CreateShortcut((Join-Path $desktop ($l.Name + '.lnk')))
  $lnk.TargetPath = Join-Path $play $l.File
  $lnk.Save()
}

Write-Host ''
Write-Host 'できました！ デスクトップの アイコンから あそべます。'
Write-Host "（ゲームの場所: $play）"
