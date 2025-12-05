@echo off
REM setup_deps.bat -- Deletes node_modules and reinstalls all dependencies.

REM 1) スクリプトのあるディレクトリに移動
cd /d %~dp0

REM 2) 古い node_modules を強制削除（存在する場合）
if exist node_modules (
  echo Removing existing node_modules...
  rd /s /q node_modules
) else (
  echo No node_modules folder found.
)

REM 3) npm キャッシュを検証（必要ならキャッシュをクリアする手順を追加可）
echo Verifying npm cache...
npm cache verify >nul 2>&1

REM 4) package-lock.json があれば npm ci（決定論的インストール）、なければ npm install
if exist package-lock.json (
  echo package-lock.json found. Running: npm ci
  npm ci
  set EXITCODE=%ERRORLEVEL%
) else (
  echo package-lock.json not found. Running: npm install
  npm install
  set EXITCODE=%ERRORLEVEL%
)

REM 5) ネイティブモジュールの再ビルド（問題があれば有効）
echo Rebuilding native modules (npm rebuild)...
npm rebuild

REM 6) 完了メッセージと終了コード
if %EXITCODE% == 0 (
  echo Dependencies installed successfully.
) else (
  echo ERROR: npm finished with exit code %EXITCODE%.
)

pause
exit /b %EXITCODE%