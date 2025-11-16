# YouTube Speed Control

A lightweight Firefox extension for controlling YouTube video playback speed. Works on both desktop and mobile (Firefox for Android).

## Features

- **Default Speed Setting** - Set your preferred playback speed that applies to all videos
- **Extended Speed Range** - Go beyond YouTube's 2x limit (0.25x to 16x)
- **Mobile-Friendly UI** - Floating, draggable speed control button
- **Quick Presets** - One-tap access to common speeds (0.5x, 1x, 1.5x, 2x, 3x, 5x, 10x, 16x)
- **Custom Speed Input** - Set any speed value you want
- **Persistent Settings** - Your preferences are saved automatically
- **Lightweight** - No external dependencies, pure JavaScript

## Installation

### Firefox Desktop (Temporary - for development)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on..."
4. Navigate to this folder and select `manifest.json`
5. The extension is now loaded! Visit YouTube to use it.

### Firefox Desktop (Permanent)

1. Zip all the extension files (manifest.json, content.js, popup.html, popup.js, icons/)
2. Submit to [Firefox Add-ons](https://addons.mozilla.org/) for review
3. Once approved, users can install directly from the store

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
├── manifest.json      # Extension configuration
├── content.js         # Main script (speed control + UI)
├── popup.html         # Settings popup (desktop)
├── popup.js           # Popup functionality
├── icons/
│   ├── icon-48.svg    # Small icon
│   └── icon-96.svg    # Large icon
└── README.md          # This file
```

## Browser Compatibility

- **Firefox Desktop**: v57.0+
- **Firefox for Android**: v113.0+
- Uses Manifest V2 for broader compatibility

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

To modify the extension:

1. Edit the source files
2. Go to `about:debugging` → "This Firefox"
3. Click "Reload" on the extension
4. Refresh YouTube to see changes

## License

MIT License - Feel free to modify and distribute.

## Contributing

Contributions welcome! Feel free to submit issues and pull requests.
