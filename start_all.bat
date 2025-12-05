@echo off
REM 開始ディレクトリをこのバッチのある場所に移動
cd /d %~dp0

REM バックエンド（Node サーバー）を別ウィンドウで起動
start "API Server" cmd /k "node picture_trance_server.cjs"

REM フロントエンド（Vite）を別ウィンドウで起動
start "Frontend (Vite)" cmd /k "npm run dev"

exit /b 0