# はじめに1回だけ動かす（子ども用のWindowsアカウントで setup.bat をダブルクリック）
# ・ゲームを %LOCALAPPDATA%\NephewGames に入れる
# ・デスクトップにゲームのアイコンを作る
# ・サインインしたときに自動で最新版にする bat を「スタートアップ」に入れる
#
# おためし：-TestDir を付けると、このPCの本当のデスクトップやスタートアップは使わず、
#           指定したフォルダの中に すべて作る（test-setup.bat から使う）
param([string]$TestDir = '', [switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$test = $TestDir -ne ''
if ($test) {
  New-Item -ItemType Directory -Force $TestDir | Out-Null
  $TestDir = (Resolve-Path $TestDir).Path
  $localApp = Join-Path $TestDir 'LocalAppData'
  $startup = Join-Path $TestDir 'Startup'
  $desktop = Join-Path $TestDir 'Desktop'
  New-Item -ItemType Directory -Force $localApp, $startup, $desktop | Out-Null
  Write-Host "【おためし】 $TestDir の中に インストールします"
} else {
  $localApp = $env:LOCALAPPDATA
  $startup = [Environment]::GetFolderPath('Startup')
  $desktop = [Environment]::GetFolderPath('Desktop')
}
$Dest = Join-Path $localApp 'NephewGames'

Write-Host 'ゲームを いれています…'
New-Item -ItemType Directory -Force $Dest | Out-Null
$play = Join-Path $Dest 'play'
if (Test-Path $play) { Remove-Item $play -Recurse -Force }
Copy-Item (Join-Path $root 'play') $play -Recurse
Copy-Item (Join-Path $here 'update.ps1') (Join-Path $Dest 'update.ps1') -Force
Copy-Item (Join-Path $here 'update.bat') (Join-Path $Dest 'update.bat') -Force

# スタートアップに更新用の bat を入れる
Copy-Item (Join-Path $here 'update.bat') (Join-Path $startup 'NephewGamesUpdate.bat') -Force

# デスクトップにアイコンを作る
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

if ($test) {
  # 電源を入れたときの自動更新を、ここで1回だけ試す
  Write-Host 'GitHub から さいしんばんを とってきます（電源を入れたときと おなじ しょり）…'
  $env:LOCALAPPDATA = $localApp
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dest 'update.ps1')
  $log = Join-Path $Dest 'update.log'
  if (Test-Path $log) { Write-Host ('更新の きろく: ' + (Get-Content $log -Encoding UTF8 | Select-Object -Last 1)) }
  Write-Host ''
  Write-Host "できました！ $desktop の アイコンから あそべます。"
  Write-Host '（このPCの 本当の デスクトップと スタートアップは かえていません）'
  if (-not $NoOpen) { Start-Process explorer.exe $desktop }
} else {
  Write-Host ''
  Write-Host 'できました！ デスクトップの アイコンから あそべます。'
  Write-Host "（ゲームの場所: $play）"
}
