#!/bin/bash
# Build script for YouTube Speed Control extension
# Usage: ./build.sh [alpha|beta|rc|dev|release]

# Change to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Get version from manifest
VERSION=$(grep '"version"' manifest.json | sed 's/.*: "\(.*\)".*/\1/')

# Git hash
HASH=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)

# Pre-release type (default: dev)
TYPE=${1:-dev}

# Build version string
case $TYPE in
  alpha|beta|rc)
    BUILD_VER="${VERSION}-${TYPE}.${HASH}"
    ;;
  release)
    BUILD_VER="${VERSION}"
    ;;
  *)
    BUILD_VER="${VERSION}-dev.${HASH}"
    ;;
esac

# Clean old builds
rm -f yt-speed*.zip yt-speed*.xpi

# Build
powershell -Command "Compress-Archive -Path 'manifest.json','src','icons' -DestinationPath 'yt-speed-${BUILD_VER}.zip' -Force"

cp "yt-speed-${BUILD_VER}.zip" "yt-speed-${BUILD_VER}.xpi"

echo "Built yt-speed-${BUILD_VER}.xpi"
