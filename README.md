# YouTube Speed Control

A lightweight Firefox extension for controlling video playback speed on any website with HTML5 video.

## Features

- **Universal Video Support** - Works on YouTube, Vimeo, Twitch, and any HTML5 video
- **Per-Site Defaults** - Save different default speeds for different sites
- **Global Default** - Fallback speed when no site-specific setting exists
- **Extended Speed Range** - 0.25x to 16x (beyond YouTube's 2x limit)
- **Draggable UI** - Floating panel that remembers position per-site
- **Quick Presets** - One-tap access to common speeds (0.25x - 4x)
- **Hide Options** - Hide button for this tab, this site, or all sites
- **Disable Options** - Disable speed control per-site or globally (use native player)
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
- **Save for Site** - Save speed as default for current site
- **Save for All** - Save speed as global default (all sites)
- **Reset to 1x** - Reset speed and site default to 1x
- **Hide button** - Hide for this tab, this site, or all sites
- **Disable button** - Disable speed control (use native player controls)
- **Settings** - Open options page

### Options Page

- Global default speed (used when no site-specific default)
- Global hide toggle (hides button on all sites)
- Global disable toggle (disables speed control on all sites)
- Per-site configuration list (edit speed, visibility, disabled; delete)
- Export/import settings (JSON backup)
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
npm test              # Unit tests
npm run e2e           # E2E tests (prefers .xpi if exists)
npm run e2e:source    # E2E tests from source
npm run e2e:xpi       # E2E tests from built .xpi
```

Requires Firefox for E2E tests.

## Browser Compatibility

- Firefox Desktop: v57.0+
- Firefox for Android: v113.0+
- Manifest V2

## Permissions

- **storage** - Save preferences locally
- **tabs** - Communicate with content scripts

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT License
