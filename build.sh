#!/bin/bash

# YouTube Speed Control - Build Script
# Creates browser-specific packages for distribution

set -e

VERSION="1.0.0"
DIST_DIR="dist"
SHARED_FILES="content.js content.css popup.html popup.js popup.css icons"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  YouTube Speed Control - Build Script"
echo "  Version: $VERSION"
echo "=========================================="
echo ""

# Create dist directory
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Function to build for a specific browser
build_browser() {
    local browser=$1
    local manifest=$2
    local output_dir="$DIST_DIR/$browser"

    echo -e "${YELLOW}Building for $browser...${NC}"

    mkdir -p "$output_dir"

    # Copy shared files
    for file in $SHARED_FILES; do
        if [ -d "$file" ]; then
            cp -r "$file" "$output_dir/"
        else
            cp "$file" "$output_dir/"
        fi
    done

    # Copy browser-specific manifest
    cp "$manifest" "$output_dir/manifest.json"

    # Create zip file
    cd "$output_dir"
    zip -r "../yt-speed-control-$browser-v$VERSION.zip" . -x "*.DS_Store"
    cd - > /dev/null

    echo -e "${GREEN}✓ $browser build complete: $DIST_DIR/yt-speed-control-$browser-v$VERSION.zip${NC}"
}

# Build for Firefox (Manifest V2)
build_browser "firefox" "manifest-firefox.json"

# Build for Chrome/Chromium (Manifest V3)
build_browser "chrome" "manifest-chrome.json"

# Build for Edge (uses Chrome manifest)
echo -e "${YELLOW}Building for Edge...${NC}"
cp "$DIST_DIR/yt-speed-control-chrome-v$VERSION.zip" "$DIST_DIR/yt-speed-control-edge-v$VERSION.zip"
echo -e "${GREEN}✓ Edge build complete (same as Chrome): $DIST_DIR/yt-speed-control-edge-v$VERSION.zip${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Output files:"
echo "  • Firefox:  $DIST_DIR/yt-speed-control-firefox-v$VERSION.zip"
echo "  • Chrome:   $DIST_DIR/yt-speed-control-chrome-v$VERSION.zip"
echo "  • Edge:     $DIST_DIR/yt-speed-control-edge-v$VERSION.zip"
echo ""
echo "Installation:"
echo "  Firefox: about:debugging → Load Temporary Add-on → select zip"
echo "  Chrome:  chrome://extensions → Enable Developer mode → Load unpacked"
echo "  Edge:    edge://extensions → Enable Developer mode → Load unpacked"
echo "=========================================="
