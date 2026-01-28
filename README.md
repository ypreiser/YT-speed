# YouTube Speed Control

A lightweight Firefox extension for controlling video playback speed on any website. Works on YouTube, Vimeo, Twitch, and any site with HTML5 video.

## Features

- **Universal Video Support** - Works on YouTube, Vimeo, Twitch, and any HTML5 video
- **Per-Site Settings** - Different default speeds for different sites
- **Extended Speed Range** - 0.25x to 16x (beyond YouTube's 2x limit)
- **Draggable UI** - Floating panel that remembers position per-site
- **Quick Presets** - One-tap access to common speeds
- **Hide Options** - Hide button per-tab, per-site, or globally
- **Export/Import** - Backup and restore all settings
- **Mobile-Friendly** - Works on Firefox for Android

## Installation

### Firefox Desktop

**Temporary (development):**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `manifest.json`

**Permanent:**
1. Build with `./build.sh` or `build.bat`
2. Install the generated `.xpi` file
3. Or submit to [Firefox Add-ons](https://addons.mozilla.org/)

### Firefox for Android

1. Firefox for Android v113+
2. Enable custom add-on collection in Settings
3. Install from your collection or Firefox Add-ons store

## Usage

### Floating Panel

- **Speed button** - Click to open panel, drag to reposition
- **Slider** - Smooth speed adjustment
- **Presets** - Quick access to common speeds (0.25x - 4x)
- **Custom input** - Enter any speed 0.25x - 16x
- **Save for Site** - Save speed for current site
- **Save for All** - Save as global default
- **Reset to 1x** - Reset speed and default
- **Hide button** - Hide per-tab, per-site, or globally
- **Settings** - Open options page

### Options Page

- Global default speed
- Global hide toggle
- Per-site configuration list (edit/delete)
- Export/import settings
- Reset all settings

### YouTube Player Integration

On YouTube, a speed button appears in the player controls for quick access.

## File Structure

```
YT-speed/
├── manifest.json      # Extension manifest
├── content.js         # Floating panel + speed control
├── content.css        # Panel styles
├── background.js      # Message routing
├── popup.html/js      # Toolbar popup
├── options.html/js    # Settings page
├── shared.css         # Shared styles
├── icons/             # Extension icons
├── tests/             # Test suite
│   ├── extension.test.js  # E2E tests (Selenium)
│   ├── unit.test.js       # Unit tests
│   └── helpers.js         # Test utilities
└── package.json       # Test dependencies
```

## Testing

```bash
npm install
npm test                           # All tests
npm test -- --testPathPattern=unit # Unit tests only
```

Requires Firefox for E2E tests.

## Browser Compatibility

- Firefox Desktop: v57.0+
- Firefox for Android: v113.0+
- Manifest V2

## Permissions

- **storage** - Save preferences locally
- **tabs** - Communicate with content scripts

## License

MIT License
