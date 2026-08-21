@echo off
chcp 932 > nul
setlocal enabledelayedexpansion
title AutoSaver Next - GitHub プッシュ
cd /d "%~dp0"

set "REPO_URL=https://github.com/KisaragiIchigo/AutoSaveBrowser.git"

echo ==================================================
echo  AutoSaver Next - GitHub プッシュ
echo  送信先: %REPO_URL%
echo ==================================================
echo.

if not exist ".gitignore" (
  echo [ERROR] .gitignore が見つかりません。
  echo         portable_data ［Cookie・ログインセッション］ を誤って公開する危険があるため中止します。
  pause
  exit /b 1
)

git --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] git が見つかりません。Git for Windows をインストールしてください。
  pause
  exit /b 1
)

git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
  echo [INFO] Git リポジトリを新規作成します...
  git init -b main
  if errorlevel 1 (
    echo [ERROR] git init に失敗しました。
    pause
    exit /b 1
  )
  echo.
)

git config i18n.commitEncoding utf-8
git config i18n.logOutputEncoding utf-8
git config core.quotepath false

for /f "delims=" %%i in ('git config user.name 2^>nul') do set "GIT_USER=%%i"
if not defined GIT_USER (
  echo [INFO] コミット者情報が未設定です。このリポジトリ用に設定します。
  set /p "GIT_USER=  GitHub ユーザー名: "
  git config user.name "!GIT_USER!"
)
for /f "delims=" %%i in ('git config user.email 2^>nul') do set "GIT_MAIL=%%i"
if not defined GIT_MAIL (
  set /p "GIT_MAIL=  メールアドレス: "
  git config user.email "!GIT_MAIL!"
  echo.
)

for /f "delims=" %%i in ('git remote get-url origin 2^>nul') do set "ORIGIN=%%i"
if not defined ORIGIN (
  echo [INFO] リモート origin を登録します。
  git remote add origin %REPO_URL%
) else (
  if not "!ORIGIN!"=="%REPO_URL%" (
    echo [INFO] リモート origin を更新します。
    echo        旧: !ORIGIN!
    echo        新: %REPO_URL%
    git remote set-url origin %REPO_URL%
  )
)

git check-ignore -q portable_data
if errorlevel 1 (
  echo [ERROR] portable_data が .gitignore で除外されていません。
  echo         Cookie やログインセッションが公開されるため中止します。
  pause
  exit /b 1
)

for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%i"
if not defined BRANCH set "BRANCH=main"
if "!BRANCH!"=="HEAD" set "BRANCH=main"

echo [INFO] ブランチ: !BRANCH!
echo [INFO] 変更内容:
git status --short
echo.

set "MSG="
set /p "MSG=  コミットメッセージ ［空欄で既定値］: "
if not defined MSG set "MSG=更新: %DATE% %TIME%"

git add -A
if errorlevel 1 (
  echo [ERROR] git add に失敗しました。
  pause
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "!MSG!"
  if errorlevel 1 (
    echo [ERROR] コミットに失敗しました。
    pause
    exit /b 1
  )
  echo.
) else (
  echo [INFO] コミット対象の変更はありません。既存コミットのプッシュのみ行います。
  echo.
)

echo [INFO] プッシュ中...
git push -u origin !BRANCH!
if errorlevel 1 (
  echo.
  echo [ERROR] プッシュに失敗しました。よくある原因:
  echo   1. リモートに先行コミットがある場合
  echo      git pull --rebase origin !BRANCH!   を実行してから、もう一度このバッチを実行してください。
  echo   2. 認証エラーの場合
  echo      GitHub のユーザー名と Personal Access Token ［パスワード欄に入力］ を確認してください。
  pause
  exit /b 1
)

echo.
echo [OK] プッシュ完了: %REPO_URL%
pause
