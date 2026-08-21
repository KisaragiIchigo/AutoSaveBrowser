@echo off
chcp 932 > nul
title AutoSaver Next - 起動テスト
cd /d "%~dp0"
call npm run dev
if errorlevel 1 (
  echo.
  echo [ERROR] 開発サーバーの起動に失敗しました。上のログを確認してください。
  pause
)
