/**
 * Unit tests for extension logic (no browser required)
 * Tests pure JavaScript functions extracted from content.js
 */

describe('Speed Clamping Logic', () => {
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 16;

  function clampSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;
    return speed;
  }

  test('clamps below minimum', () => {
    expect(clampSpeed(0.1)).toBe(0.25);
    expect(clampSpeed(-1)).toBe(0.25);
    expect(clampSpeed(0)).toBe(0.25);
  });

  test('clamps above maximum', () => {
    expect(clampSpeed(17)).toBe(16);
    expect(clampSpeed(100)).toBe(16);
    expect(clampSpeed(20)).toBe(16);
  });

  test('rounds to 2 decimal places', () => {
    expect(clampSpeed(1.234)).toBe(1.23);
    expect(clampSpeed(1.999)).toBe(2);
    expect(clampSpeed(2.555)).toBe(2.56);
  });

  test('allows valid speeds unchanged', () => {
    expect(clampSpeed(1)).toBe(1);
    expect(clampSpeed(1.5)).toBe(1.5);
    expect(clampSpeed(2)).toBe(2);
    expect(clampSpeed(0.25)).toBe(0.25);
    expect(clampSpeed(16)).toBe(16);
  });
});

describe('Hostname Normalization', () => {
  function normalizeHostname(hostname) {
    return hostname.replace(/^www\./, '');
  }

  test('removes www prefix', () => {
    expect(normalizeHostname('www.youtube.com')).toBe('youtube.com');
    expect(normalizeHostname('www.vimeo.com')).toBe('vimeo.com');
  });

  test('leaves non-www hostnames unchanged', () => {
    expect(normalizeHostname('youtube.com')).toBe('youtube.com');
    expect(normalizeHostname('m.youtube.com')).toBe('m.youtube.com');
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
