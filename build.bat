@echo off
REM Build script for YouTube Speed Control extension

setlocal enabledelayedexpansion

REM Get git short hash for dev version
for /f %%i in ('git rev-parse --short HEAD 2^>nul') do set DEV_SUFFIX=%%i
if "%DEV_SUFFIX%"=="" set DEV_SUFFIX=%date:~-4%%date:~4,2%%date:~7,2%

REM Get version from manifest (simple extraction)
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\"" manifest.json') do (
  set VER=%%~a
  set VER=!VER:"=!
  set VER=!VER: =!
)

set ZIP_FILE=yt-speed-%VER%-%DEV_SUFFIX%.zip
set XPI_FILE=yt-speed-%VER%-%DEV_SUFFIX%.xpi

REM Clean old builds
del /f yt-speed*.xpi 2>nul
del /f yt-speed*.zip 2>nul

REM Build
powershell -Command "Compress-Archive -Path manifest.json, background.js, content.js, popup.js, options.js, shared.css, content.css, popup.css, options.css, popup.html, options.html, icons -DestinationPath '%ZIP_FILE%' -Force"
copy %ZIP_FILE% %XPI_FILE% >nul

echo Built v%VER%-%DEV_SUFFIX%:
dir /b %XPI_FILE% %ZIP_FILE%
