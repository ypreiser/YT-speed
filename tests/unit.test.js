/**
 * Unit tests for extension logic (no browser required)
 * Tests pure JavaScript functions from shared utils
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const {
  SPEED_MIN,
  SPEED_MAX,
  clampSpeed,
  roundSpeed,
  validateSpeed,
  normalizeHostname,
  validateImportData,
  VALID_CONFIG_KEYS
} = require('../src/shared/utils');

describe('UMD Export (browser context)', () => {
  test('exports to window.YTSpeedUtils when module is undefined', () => {
    const code = fs.readFileSync(path.join(__dirname, '../src/shared/utils.js'), 'utf8');
    const window = {};
    const context = vm.createContext({ window });
    vm.runInContext(code, context);

    expect(window.YTSpeedUtils).toBeDefined();
    expect(typeof window.YTSpeedUtils.clampSpeed).toBe('function');
    expect(typeof window.YTSpeedUtils.validateSpeed).toBe('function');
    expect(window.YTSpeedUtils.SPEED_MIN).toBe(0.25);
  });
});

describe('Speed Clamping Logic', () => {
  // Combined clamp + round (matches content.js behavior)
  function clampAndRound(speed) {
    return roundSpeed(clampSpeed(speed));
  }

  test('clamps below minimum', () => {
    expect(clampAndRound(0.1)).toBe(SPEED_MIN);
    expect(clampAndRound(-1)).toBe(SPEED_MIN);
    expect(clampAndRound(0)).toBe(SPEED_MIN);
  });

  test('clamps above maximum', () => {
    expect(clampAndRound(17)).toBe(SPEED_MAX);
    expect(clampAndRound(100)).toBe(SPEED_MAX);
    expect(clampAndRound(20)).toBe(SPEED_MAX);
  });

  test('rounds to 2 decimal places', () => {
    expect(clampAndRound(1.234)).toBe(1.23);
    expect(clampAndRound(1.999)).toBe(2);
    expect(clampAndRound(2.555)).toBe(2.56);
  });

  test('allows valid speeds unchanged', () => {
    expect(clampAndRound(1)).toBe(1);
    expect(clampAndRound(1.5)).toBe(1.5);
    expect(clampAndRound(2)).toBe(2);
    expect(clampAndRound(SPEED_MIN)).toBe(SPEED_MIN);
    expect(clampAndRound(SPEED_MAX)).toBe(SPEED_MAX);
  });
});

describe('Hostname Normalization', () => {
  // Uses imported normalizeHostname from utils

  test('removes www prefix', () => {
    expect(normalizeHostname('www.youtube.com')).toBe('youtube.com');
    expect(normalizeHostname('www.vimeo.com')).toBe('vimeo.com');
  });

  test('removes m prefix', () => {
    expect(normalizeHostname('m.youtube.com')).toBe('youtube.com');
    expect(normalizeHostname('m.twitch.tv')).toBe('twitch.tv');
  });

  test('removes mobile prefix', () => {
    expect(normalizeHostname('mobile.twitter.com')).toBe('twitter.com');
  });

  test('leaves plain hostnames unchanged', () => {
    expect(normalizeHostname('youtube.com')).toBe('youtube.com');
    expect(normalizeHostname('vimeo.com')).toBe('vimeo.com');
  });
});

describe('Speed Presets', () => {
  const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 4];

  test('presets do not include 1x', () => {
    expect(SPEED_PRESETS).not.toContain(1);
  });

  test('presets are sorted', () => {
    const sorted = [...SPEED_PRESETS].sort((a, b) => a - b);
    expect(SPEED_PRESETS).toEqual(sorted);
  });

  test('all presets are within valid range', () => {
    SPEED_PRESETS.forEach(speed => {
      expect(speed).toBeGreaterThanOrEqual(0.25);
      expect(speed).toBeLessThanOrEqual(16);
    });
  });
});

describe('Video Detection Logic', () => {
  // Simulates the hasVideo check
  function hasVideo(videos) {
    for (const video of videos) {
      if (video.width > 50 && video.height > 50) {
        return true;
      }
    }
    return false;
  }

  test('detects visible video', () => {
    const videos = [{ width: 640, height: 360 }];
    expect(hasVideo(videos)).toBe(true);
  });

  test('ignores small videos', () => {
    const videos = [{ width: 1, height: 1 }];
    expect(hasVideo(videos)).toBe(false);
  });

  test('ignores hidden videos', () => {
    const videos = [{ width: 0, height: 0 }];
    expect(hasVideo(videos)).toBe(false);
  });

  test('returns false for no videos', () => {
    expect(hasVideo([])).toBe(false);
  });

  test('finds video among multiple elements', () => {
    const videos = [
      { width: 10, height: 10 }, // too small
      { width: 200, height: 150 }, // valid
    ];
    expect(hasVideo(videos)).toBe(true);
  });
});

describe('Site Config Merging', () => {
  function getEffectiveSettings(siteConfig, globalConfig) {
    return {
      defaultSpeed: siteConfig?.defaultSpeed ?? globalConfig?.defaultSpeed ?? 1.0,
      hidden: globalConfig?.hideGlobal || siteConfig?.hidden || false,
      panelPosition: siteConfig?.panelPosition ?? globalConfig?.panelPosition ?? { x: 8, y: 80 }
    };
  }

  test('uses site config when available', () => {
    const site = { defaultSpeed: 2 };
    const global = { defaultSpeed: 1.5 };
    const result = getEffectiveSettings(site, global);
    expect(result.defaultSpeed).toBe(2);
  });

  test('falls back to global config', () => {
    const site = {};
    const global = { defaultSpeed: 1.5 };
    const result = getEffectiveSettings(site, global);
    expect(result.defaultSpeed).toBe(1.5);
  });

  test('uses defaults when no config', () => {
    const result = getEffectiveSettings(null, {});
    expect(result.defaultSpeed).toBe(1);
    expect(result.hidden).toBe(false);
    expect(result.panelPosition).toEqual({ x: 8, y: 80 });
  });

  test('global hide overrides site visible', () => {
    const site = { hidden: false };
    const global = { hideGlobal: true };
    const result = getEffectiveSettings(site, global);
    expect(result.hidden).toBe(true);
  });
});

describe('Disabled vs Hidden State', () => {
  // Simulates the separate visibility and speed control logic
  function shouldHideUI(siteConfig, globalConfig, hiddenInTab) {
    if (hiddenInTab) return true;
    return globalConfig?.hideGlobal || siteConfig?.hidden || false;
  }

  function shouldDisableSpeedControl(siteConfig, globalConfig) {
    return globalConfig?.disableGlobal || siteConfig?.disabled || false;
  }

  test('hidden only hides UI, does not disable speed', () => {
    const site = { hidden: true, disabled: false };
    expect(shouldHideUI(site, {}, false)).toBe(true);
    expect(shouldDisableSpeedControl(site, {})).toBe(false);
  });

  test('disabled only disables speed, does not hide UI', () => {
    const site = { hidden: false, disabled: true };
    expect(shouldHideUI(site, {}, false)).toBe(false);
    expect(shouldDisableSpeedControl(site, {})).toBe(true);
  });

  test('both hidden and disabled can be set independently', () => {
    const site = { hidden: true, disabled: true };
    expect(shouldHideUI(site, {}, false)).toBe(true);
    expect(shouldDisableSpeedControl(site, {})).toBe(true);
  });

  test('neither hidden nor disabled by default', () => {
    const site = {};
    expect(shouldHideUI(site, {}, false)).toBe(false);
    expect(shouldDisableSpeedControl(site, {})).toBe(false);
  });

  test('global hide does not affect disabled state', () => {
    const site = { disabled: false };
    const global = { hideGlobal: true };
    expect(shouldHideUI(site, global, false)).toBe(true);
    expect(shouldDisableSpeedControl(site, global)).toBe(false);
  });

  test('tab hidden does not affect disabled state', () => {
    const site = { disabled: false };
    expect(shouldHideUI(site, {}, true)).toBe(true);
    expect(shouldDisableSpeedControl(site, {})).toBe(false);
  });

  test('global disable overrides site enabled', () => {
    const site = { disabled: false };
    const global = { disableGlobal: true };
    expect(shouldDisableSpeedControl(site, global)).toBe(true);
  });

  test('site disabled works without global disable', () => {
    const site = { disabled: true };
    const global = { disableGlobal: false };
    expect(shouldDisableSpeedControl(site, global)).toBe(true);
  });
});

describe('Speed Control When Disabled', () => {
  // Simulates applySpeedToAllVideos behavior
  function applySpeed(videos, speed, siteDisabled) {
    if (siteDisabled) return videos; // no change
    return videos.map(v => ({ ...v, playbackRate: speed }));
  }

  function resetToNative(videos) {
    return videos.map(v => ({ ...v, playbackRate: 1.0 }));
  }

  test('applies speed when not disabled', () => {
    const videos = [{ playbackRate: 1 }, { playbackRate: 1 }];
    const result = applySpeed(videos, 2, false);
    expect(result[0].playbackRate).toBe(2);
    expect(result[1].playbackRate).toBe(2);
  });

  test('does not apply speed when disabled', () => {
    const videos = [{ playbackRate: 1.5 }, { playbackRate: 1.5 }];
    const result = applySpeed(videos, 2, true);
    expect(result[0].playbackRate).toBe(1.5);
    expect(result[1].playbackRate).toBe(1.5);
  });

  test('resets to native 1x when disabling', () => {
    const videos = [{ playbackRate: 2.5 }, { playbackRate: 1.75 }];
    const result = resetToNative(videos);
    expect(result[0].playbackRate).toBe(1);
    expect(result[1].playbackRate).toBe(1);
  });
});

describe('Settings Export/Import Format', () => {
  test('exported data is valid JSON', () => {
    const data = {
      defaultSpeed: 1.5,
      hideGlobal: false,
      siteConfigs: {
        'youtube.com': { defaultSpeed: 2, hidden: false },
        'vimeo.com': { defaultSpeed: 1.25 }
      }
    };

    const json = JSON.stringify(data, null, 2);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(data);
    expect(parsed.siteConfigs['youtube.com'].defaultSpeed).toBe(2);
  });
});

describe('Drag Threshold Logic', () => {
  const DRAG_THRESHOLD = 5;

  function exceedsThreshold(startX, startY, currentX, currentY) {
    const dx = Math.abs(currentX - startX);
    const dy = Math.abs(currentY - startY);
    return dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD;
  }

  test('small movement does not trigger drag', () => {
    expect(exceedsThreshold(100, 100, 102, 101)).toBe(false);
    expect(exceedsThreshold(100, 100, 104, 104)).toBe(false);
  });

  test('movement at threshold triggers drag', () => {
    expect(exceedsThreshold(100, 100, 105, 100)).toBe(true);
    expect(exceedsThreshold(100, 100, 100, 105)).toBe(true);
  });

  test('larger movement triggers drag', () => {
    expect(exceedsThreshold(100, 100, 120, 100)).toBe(true);
    expect(exceedsThreshold(100, 100, 100, 150)).toBe(true);
  });

  test('diagonal movement counts', () => {
    expect(exceedsThreshold(100, 100, 106, 106)).toBe(true);
  });
});

describe('Exponential Backoff Delays', () => {
  const delays = [10, 25, 50, 100, 200];
  const maxAttempts = 5;

  test('has correct number of attempts', () => {
    expect(delays.length).toBe(maxAttempts);
  });

  test('delays increase exponentially', () => {
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  test('final delay is reasonable', () => {
    expect(delays[delays.length - 1]).toBeLessThanOrEqual(200);
  });

  test('total wait time is bounded', () => {
    const totalWait = delays.reduce((a, b) => a + b, 0);
    expect(totalWait).toBeLessThan(500); // under 500ms total
  });
});

describe('Drag Bounds Calculation', () => {
  const TOGGLE_SIZE = 40;
  const PANEL_GAP = 50; // panel is 50px below toggle

  function calcDragBounds(panelVisible, panelWidth, panelHeight, windowWidth, windowHeight) {
    const w = panelVisible ? panelWidth : TOGGLE_SIZE;
    const h = panelVisible ? PANEL_GAP + panelHeight : TOGGLE_SIZE;
    return {
      maxX: windowWidth - w,
      maxY: windowHeight - h
    };
  }

  function clampPosition(x, y, bounds) {
    return {
      x: Math.max(0, Math.min(x, bounds.maxX)),
      y: Math.max(0, Math.min(y, bounds.maxY))
    };
  }

  test('allows full movement when panel closed', () => {
    const bounds = calcDragBounds(false, 300, 400, 1000, 800);
    expect(bounds.maxX).toBe(960); // 1000 - 40
    expect(bounds.maxY).toBe(760); // 800 - 40
  });

  test('restricts movement when panel open', () => {
    const bounds = calcDragBounds(true, 300, 400, 1000, 800);
    expect(bounds.maxX).toBe(700); // 1000 - 300
    expect(bounds.maxY).toBe(350); // 800 - (50 + 400)
  });

  test('clamps position to stay on screen', () => {
    const bounds = calcDragBounds(true, 300, 400, 1000, 800);

    // trying to go off right edge
    expect(clampPosition(800, 100, bounds)).toEqual({ x: 700, y: 100 });

    // trying to go off bottom
    expect(clampPosition(100, 500, bounds)).toEqual({ x: 100, y: 350 });

    // trying to go negative
    expect(clampPosition(-50, -50, bounds)).toEqual({ x: 0, y: 0 });
  });

  test('handles small viewport with panel open', () => {
    const bounds = calcDragBounds(true, 300, 400, 320, 500);
    expect(bounds.maxX).toBe(20); // 320 - 300
    expect(bounds.maxY).toBe(50); // 500 - 450
  });

  test('valid position stays unchanged', () => {
    const bounds = calcDragBounds(true, 300, 400, 1000, 800);
    expect(clampPosition(100, 100, bounds)).toEqual({ x: 100, y: 100 });
  });
});

describe('validateSpeed', () => {
  // Uses imported validateSpeed from utils

  test('accepts valid speeds', () => {
    expect(validateSpeed(0.25)).toBe(true);
    expect(validateSpeed(1)).toBe(true);
    expect(validateSpeed(2.5)).toBe(true);
    expect(validateSpeed(16)).toBe(true);
  });

  test('rejects speeds below minimum', () => {
    expect(validateSpeed(0.1)).toBe(false);
    expect(validateSpeed(0.24)).toBe(false);
    expect(validateSpeed(0)).toBe(false);
    expect(validateSpeed(-1)).toBe(false);
  });

  test('rejects speeds above maximum', () => {
    expect(validateSpeed(17)).toBe(false);
    expect(validateSpeed(16.01)).toBe(false);
    expect(validateSpeed(100)).toBe(false);
  });

  test('rejects non-numeric values', () => {
    expect(validateSpeed(NaN)).toBe(false);
    expect(validateSpeed(null)).toBe(false);
    expect(validateSpeed(undefined)).toBe(false);
    expect(validateSpeed('abc')).toBe(false);
  });

  test('handles string numbers', () => {
    expect(validateSpeed('2')).toBe(true);
    expect(validateSpeed('0.5')).toBe(true);
    expect(validateSpeed('0.25')).toBe(true);
    expect(validateSpeed('16')).toBe(true);
    expect(validateSpeed('17')).toBe(false);
    expect(validateSpeed('0.1')).toBe(false);
  });
});

describe('validateImportData', () => {
  // Uses imported validateImportData from utils

  test('accepts valid complete config', () => {
    const data = {
      defaultSpeed: 1.5,
      hideGlobal: false,
      panelPosition: { x: 10, y: 20 },
      siteConfigs: {
        'youtube.com': { defaultSpeed: 2, hidden: false },
        'vimeo.com': { defaultSpeed: 1.25, hidden: true }
      }
    };
    expect(validateImportData(data)).toBe(true);
  });

  test('accepts valid partial configs', () => {
    expect(validateImportData({ defaultSpeed: 1.5 })).toBe(true);
    expect(validateImportData({ hideGlobal: true })).toBe(true);
    expect(validateImportData({ panelPosition: { x: 0, y: 0 } })).toBe(true);
    expect(validateImportData({ siteConfigs: {} })).toBe(true);
    expect(validateImportData({ siteConfigs: { 'youtube.com': {} } })).toBe(true);
  });

  test('accepts empty object', () => {
    expect(validateImportData({})).toBe(true);
  });

  test('rejects null', () => {
    expect(validateImportData(null)).toBe(false);
  });

  test('rejects non-object types', () => {
    expect(validateImportData('string')).toBe(false);
    expect(validateImportData(123)).toBe(false);
    expect(validateImportData(true)).toBe(false);
    expect(validateImportData(undefined)).toBe(false);
  });

  test('rejects arrays with items via unknown keys', () => {
    // Note: empty array passes (typeof [] === 'object', Object.keys([]) === [])
    // Arrays with items fail because keys are "0", "1", etc. which are invalid
    expect(validateImportData([1, 2, 3])).toBe(false);
    expect(validateImportData([{ defaultSpeed: 1 }])).toBe(false);
  });

  test('rejects unknown keys', () => {
    expect(validateImportData({ unknownKey: 'value' })).toBe(false);
    expect(validateImportData({ defaultSpeed: 1, extraField: true })).toBe(false);
  });

  test('rejects invalid speed range in root', () => {
    expect(validateImportData({ defaultSpeed: 0.1 })).toBe(false);
    expect(validateImportData({ defaultSpeed: 17 })).toBe(false);
    expect(validateImportData({ defaultSpeed: -1 })).toBe(false);
    expect(validateImportData({ defaultSpeed: 'fast' })).toBe(false);
  });

  test('rejects invalid speed range in siteConfigs', () => {
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { defaultSpeed: 0.1 } }
    })).toBe(false);
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { defaultSpeed: 17 } }
    })).toBe(false);
  });

  test('rejects invalid hideGlobal type', () => {
    expect(validateImportData({ hideGlobal: 'true' })).toBe(false);
    expect(validateImportData({ hideGlobal: 1 })).toBe(false);
    expect(validateImportData({ hideGlobal: null })).toBe(false);
  });

  test('accepts valid disableGlobal', () => {
    expect(validateImportData({ disableGlobal: true })).toBe(true);
    expect(validateImportData({ disableGlobal: false })).toBe(true);
  });

  test('rejects invalid disableGlobal type', () => {
    expect(validateImportData({ disableGlobal: 'true' })).toBe(false);
    expect(validateImportData({ disableGlobal: 1 })).toBe(false);
    expect(validateImportData({ disableGlobal: null })).toBe(false);
  });

  test('rejects invalid panelPosition structure', () => {
    expect(validateImportData({ panelPosition: null })).toBe(false);
    expect(validateImportData({ panelPosition: 'top-left' })).toBe(false);
    expect(validateImportData({ panelPosition: { x: 10 } })).toBe(false);
    expect(validateImportData({ panelPosition: { y: 20 } })).toBe(false);
    expect(validateImportData({ panelPosition: { x: '10', y: 20 } })).toBe(false);
  });

  test('rejects invalid siteConfigs structure', () => {
    expect(validateImportData({ siteConfigs: 'invalid' })).toBe(false);
    expect(validateImportData({ siteConfigs: { 'youtube.com': null } })).toBe(false);
    expect(validateImportData({ siteConfigs: { 'youtube.com': 'config' } })).toBe(false);
  });

  test('rejects invalid hidden type in siteConfigs', () => {
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { hidden: 'yes' } }
    })).toBe(false);
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { hidden: 1 } }
    })).toBe(false);
  });

  test('accepts valid disabled field in siteConfigs', () => {
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { disabled: true } }
    })).toBe(true);
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { disabled: false } }
    })).toBe(true);
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { hidden: true, disabled: true } }
    })).toBe(true);
  });

  test('rejects invalid disabled type in siteConfigs', () => {
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { disabled: 'yes' } }
    })).toBe(false);
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { disabled: 1 } }
    })).toBe(false);
    expect(validateImportData({
      siteConfigs: { 'youtube.com': { disabled: null } }
    })).toBe(false);
  });
});

describe('roundSpeed (isolated)', () => {
  // Uses imported roundSpeed from utils

  test('rounds to 2 decimal places', () => {
    expect(roundSpeed(1.234)).toBe(1.23);
    expect(roundSpeed(1.999)).toBe(2);
    expect(roundSpeed(0.255)).toBe(0.26);
    expect(roundSpeed(2.345)).toBe(2.35);
  });

  test('preserves exact values', () => {
    expect(roundSpeed(1)).toBe(1);
    expect(roundSpeed(1.5)).toBe(1.5);
    expect(roundSpeed(2.25)).toBe(2.25);
    expect(roundSpeed(0.25)).toBe(0.25);
  });

  test('handles edge cases', () => {
    expect(roundSpeed(0.001)).toBe(0);
    expect(roundSpeed(0.005)).toBe(0.01);
    expect(roundSpeed(16.004)).toBe(16);
    expect(roundSpeed(16.005)).toBe(16.01);
  });
});
