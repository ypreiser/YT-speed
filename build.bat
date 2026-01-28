@echo off
REM Build script for YouTube Speed Control extension
REM Usage: build.bat [alpha|beta|rc|dev|release]

setlocal enabledelayedexpansion

REM Get git short hash
for /f %%i in ('git rev-parse --short HEAD 2^>nul') do set HASH=%%i
if "%HASH%"=="" set HASH=%date:~-4%%date:~4,2%%date:~7,2%

REM Get version from manifest
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\"" manifest.json') do (
  set VER=%%~a
  set VER=!VER:"=!
  set VER=!VER: =!
)

REM Pre-release type (default: dev)
set TYPE=%1
if "%TYPE%"=="" set TYPE=dev

REM Build version string
if "%TYPE%"=="alpha" set BUILD_VER=%VER%-alpha.%HASH%
if "%TYPE%"=="beta" set BUILD_VER=%VER%-beta.%HASH%
if "%TYPE%"=="rc" set BUILD_VER=%VER%-rc.%HASH%
if "%TYPE%"=="release" set BUILD_VER=%VER%
if "%TYPE%"=="dev" set BUILD_VER=%VER%-dev.%HASH%
if "%BUILD_VER%"=="" set BUILD_VER=%VER%-dev.%HASH%

REM Clean old builds
del /f yt-speed*.xpi 2>nul
del /f yt-speed*.zip 2>nul

REM Build
powershell -Command "Compress-Archive -Path manifest.json, background.js, content.js, popup.js, options.js, shared.css, content.css, popup.css, options.css, popup.html, options.html, icons -DestinationPath 'yt-speed-%BUILD_VER%.zip' -Force"
copy "yt-speed-%BUILD_VER%.zip" "yt-speed-%BUILD_VER%.xpi" >nul

echo Built yt-speed v%BUILD_VER%
dir /b yt-speed-%BUILD_VER%.*
