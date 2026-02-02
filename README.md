# YouTube Speed Control

A lightweight browser extension for controlling YouTube video playback speed. Works on Chrome, Firefox, Edge, Opera, Brave, and other Chromium-based browsers. Also supports mobile (Firefox for Android).

## Features

- **Default Speed Setting** - Set your preferred playback speed that applies to all videos
- **Extended Speed Range** - Go beyond YouTube's 2x limit (0.25x to 16x)
- **Mobile-Friendly UI** - Floating, draggable speed control button
- **Quick Presets** - One-tap access to common speeds (0.5x, 1x, 1.5x, 2x, 3x, 5x, 10x, 16x)
- **Custom Speed Input** - Set any speed value you want
- **Persistent Settings** - Your preferences are saved automatically
- **Lightweight** - No external dependencies, pure JavaScript

## Installation

### Quick Build (All Browsers)

```bash
./build.sh
```

This creates ready-to-install packages in the `dist/` folder for all supported browsers.

---

### Chrome / Chromium (Manual)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the folder containing `manifest-chrome.json` (rename to `manifest.json` first)
5. Visit YouTube to use the extension

**For permanent installation:** Submit to [Chrome Web Store](https://chrome.google.com/webstore/devconsole)

---

### Firefox Desktop (Manual)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Navigate to this folder and select `manifest-firefox.json` (or `manifest.json`)
4. Visit YouTube to use the extension

**For permanent installation:** Submit to [Firefox Add-ons](https://addons.mozilla.org/)

---

### Microsoft Edge

1. Open Edge and navigate to `edge://extensions/`
2. Enable "Developer mode" (toggle in bottom-left)
3. Click "Load unpacked"
4. Select the folder containing `manifest-chrome.json` (rename to `manifest.json` first)
5. Visit YouTube to use the extension

**For permanent installation:** Submit to [Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/)

---

### Opera / Brave / Vivaldi

These Chromium-based browsers use the same manifest as Chrome:

1. Navigate to the extensions page (`opera://extensions`, `brave://extensions`, etc.)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the folder with `manifest-chrome.json` (rename to `manifest.json`)

---

### Firefox for Android

1. Make sure you have Firefox for Android (version 113+)
2. Enable "Custom Add-on collection" in Firefox settings:
   - Go to Settings → About Firefox
   - Tap the Firefox logo 5 times to enable debug menu
   - Go back to Settings → Custom Add-on collection
   - Enter your collection details or use the extension ID
3. Alternatively, submit to Firefox Add-ons store for distribution

## Usage

### On-Page Controls (Mobile & Desktop)

1. **Red floating button** - Tap/click to open speed control panel
2. **Speed display** - Shows current playback speed
3. **Slider** - Drag to adjust speed smoothly
4. **Preset buttons** - Quick access to common speeds
5. **Custom input** - Enter any speed between 0.25x and 16x
6. **Save as Default** - Make current speed your new default
7. **Drag the button** - Move the control to any corner of the screen

### Popup Settings (Desktop Only)

Click the extension icon in toolbar to:

- View current default speed
- Set a new default speed
- Use preset buttons for quick changes
- Reset to 1x (normal speed)

## How It Works

The extension injects a content script into YouTube pages that:

1. Creates a floating UI overlay for speed control
2. Applies your saved default speed to videos automatically
3. Monitors for new videos and applies speed settings
4. Overrides YouTube's speed reset attempts
5. Stores preferences using browser.storage.local API

## File Structure

```
YT-speed/
├── manifest.json          # Default manifest (Firefox)
├── manifest-firefox.json  # Firefox manifest (Manifest V2)
├── manifest-chrome.json   # Chrome/Edge manifest (Manifest V3)
├── content.js             # Main script (speed control + UI)
├── content.css            # Content script styles
├── popup.html             # Settings popup (desktop)
├── popup.js               # Popup functionality
├── popup.css              # Popup styles
├── build.sh               # Build script for all browsers
├── icons/
│   ├── icon-48.svg        # Small icon
│   └── icon-96.svg        # Large icon
├── dist/                  # Built packages (after running build.sh)
│   ├── firefox/
│   ├── chrome/
│   └── *.zip files
└── README.md              # This file
```

## Browser Compatibility

| Browser | Version | Manifest |
|---------|---------|----------|
| Chrome | 88+ | V3 |
| Firefox Desktop | 57+ | V2 |
| Firefox Android | 113+ | V2 |
| Microsoft Edge | 88+ | V3 |
| Opera | 75+ | V3 |
| Brave | Latest | V3 |
| Vivaldi | 3.6+ | V3 |

**Note:** Chromium-based browsers (Chrome, Edge, Opera, Brave, Vivaldi) all use Manifest V3. Firefox uses Manifest V2 for broader compatibility.

## Permissions

- **storage** - Save your speed preferences locally

## Tips

- **Draggable UI**: Long-press and drag the red button to reposition it
- **Speed Persistence**: Your default speed applies to all YouTube videos
- **Override YouTube**: The extension counters YouTube's automatic speed resets
- **High Speeds**: Videos at 10x+ may have audio issues (browser limitation)

## Troubleshooting

**UI not appearing?**

- Refresh the YouTube page
- Check that the extension is enabled
- Try disabling other YouTube extensions that might conflict

**Speed keeps resetting?**

- The extension monitors and re-applies your speed
- Some YouTube updates may temporarily reset speed

**Audio issues at high speeds?**

- This is a browser limitation, not the extension
- Try reducing speed if audio cuts out

## Development

### Building for All Browsers

```bash
./build.sh
```

This creates distribution packages in `dist/` for Firefox, Chrome, and Edge.

### Manual Development

**Firefox:**
1. Edit the source files
2. Go to `about:debugging` → "This Firefox"
3. Click "Reload" on the extension
4. Refresh YouTube to see changes

**Chrome/Edge:**
1. Edit the source files
2. Go to `chrome://extensions/` or `edge://extensions/`
3. Click the refresh icon on the extension card
4. Refresh YouTube to see changes

### API Compatibility

The extension uses a compatibility layer to work across browsers:
```javascript
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
```

This automatically uses the correct API (`browser` for Firefox, `chrome` for Chromium).

## License

MIT License - Feel free to modify and distribute.

## Contributing

Contributions welcome! Feel free to submit issues and pull requests.
