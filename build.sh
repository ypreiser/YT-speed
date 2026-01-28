#!/bin/bash
# Build script for YouTube Speed Control extension

cd "$(dirname "$0")"

# Get version from manifest
VERSION=$(grep '"version"' manifest.json | sed 's/.*: "\(.*\)".*/\1/')

# Dev suffix: short git hash
DEV=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)

# Clean old builds
rm -f yt-speed*.zip yt-speed*.xpi

# Build
powershell -Command "Compress-Archive -Path 'manifest.json','background.js','content.js','popup.js','options.js','shared.css','content.css','popup.css','options.css','popup.html','options.html','icons' -DestinationPath 'yt-speed-${VERSION}-${DEV}.zip' -Force"

cp "yt-speed-${VERSION}-${DEV}.zip" "yt-speed-${VERSION}-${DEV}.xpi"

printf "Built v%s-%s:\n" "$VERSION" "$DEV"
ls -la yt-speed-${VERSION}-${DEV}.*
