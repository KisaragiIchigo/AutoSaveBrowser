@echo off
chcp 932 > nul
title AutoSaver Next - コンパイル
cd /d "%~dp0"
call npm run build:portable
if errorlevel 1 (
  echo.
  echo [ERROR] ビルドに失敗しました。上のログを確認してください。
  pause
  exit /b 1
)
echo.
echo [OK] ポータブルEXEを出力しました: "%~dp0release\AutoSaverNext 1.0.0.exe"
pause
