@echo off
chcp 932 > nul
setlocal enabledelayedexpansion
title AutoSaver Next - GitHub プッシュ
cd /d "%~dp0"

set "REPO_URL=https://github.com/KisaragiIchigo/AutoSaveBrowser.git"

rem ---- コミット者情報（実メールアドレスを公開しないため GitHub の noreply を使用）----
rem  GitHub の設定で「メールアドレスを公開しない」を有効にしている場合は、
rem  Settings ＞ Emails に表示される「数字＋ユーザー名」形式のアドレスに書き換えてください。
rem  例: set "GIT_MAIL_DEFAULT=12345678+KisaragiIchigo@users.noreply.github.com"
set "GIT_NAME_DEFAULT=KisaragiIchigo"
set "GIT_MAIL_DEFAULT=KisaragiIchigo@users.noreply.github.com"

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
  git config user.name "%GIT_NAME_DEFAULT%"
  echo [INFO] コミット者名を設定しました: %GIT_NAME_DEFAULT%
)
for /f "delims=" %%i in ('git config user.email 2^>nul') do set "GIT_MAIL=%%i"
if not defined GIT_MAIL (
  git config user.email "%GIT_MAIL_DEFAULT%"
  echo [INFO] コミット用アドレスを設定しました: %GIT_MAIL_DEFAULT%
  echo        ［実メールアドレスは公開されません］
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
if not errorlevel 1 goto PUSH_OK

echo.
echo [WARN] プッシュが拒否されました。
echo        リモート側に、手元には無いコミット［GitHub 上で作成した README 等］がある可能性があります。
echo.
set "ANSWER="
set /p "ANSWER=  リモートの変更を取り込んでから再試行しますか？ ［Y / N］: "
if /i not "!ANSWER!"=="Y" goto PUSH_FAILED

echo.
echo [INFO] リモートの変更を取り込んでいます...
git pull --rebase origin !BRANCH!
if errorlevel 1 goto REBASE_FAILED

echo.
echo [INFO] 再プッシュ中...
git push -u origin !BRANCH!
if errorlevel 1 goto PUSH_FAILED

:PUSH_OK
echo.
echo [OK] プッシュ完了: %REPO_URL%
pause
exit /b 0

:REBASE_FAILED
echo.
echo [ERROR] リモートの変更を取り込めませんでした。
echo         同じファイルが両方で変更されている［競合］可能性があります。
echo         競合したファイルを編集して解決した後、次を実行してください:
echo           git add -A
echo           git rebase --continue
echo         README.md などで手元の内容をそのまま採用したい場合は、解決の代わりに:
echo           git checkout --theirs README.md
echo         取り込み自体をやめる場合: git rebase --abort
pause
exit /b 1

:PUSH_FAILED
echo.
echo [ERROR] プッシュに失敗しました。よくある原因:
echo   1. リモートに先行コミットがある場合
echo      git pull --rebase origin !BRANCH!   を実行してから、もう一度このバッチを実行してください。
echo   2. 認証エラーの場合
echo      GitHub のユーザー名と Personal Access Token ［パスワード欄に入力］ を確認してください。
pause
exit /b 1
