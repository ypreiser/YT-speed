/**
 * Unit tests for YouTube Speed Control extension
 */

describe('Speed Control Core Logic', () => {
  // Speed bounds constants (must match content.js)
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 16;
  const DEFAULT_SPEED = 1;

  // Helper function that mirrors the setSpeed logic
  function clampSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;
    return speed;
  }

  describe('Speed Clamping', () => {
    test('should clamp speed to minimum when below MIN_SPEED', () => {
      expect(clampSpeed(0.1)).toBe(MIN_SPEED);
      expect(clampSpeed(0)).toBe(MIN_SPEED);
      expect(clampSpeed(-1)).toBe(MIN_SPEED);
    });

    test('should clamp speed to maximum when above MAX_SPEED', () => {
      expect(clampSpeed(20)).toBe(MAX_SPEED);
      expect(clampSpeed(100)).toBe(MAX_SPEED);
      expect(clampSpeed(16.5)).toBe(MAX_SPEED);
    });

    test('should allow valid speeds within range', () => {
      expect(clampSpeed(1)).toBe(1);
      expect(clampSpeed(2)).toBe(2);
      expect(clampSpeed(1.5)).toBe(1.5);
      expect(clampSpeed(0.25)).toBe(0.25);
      expect(clampSpeed(16)).toBe(16);
    });

    test('should round to 2 decimal places', () => {
      expect(clampSpeed(1.234)).toBe(1.23);
      expect(clampSpeed(1.999)).toBe(2);
      expect(clampSpeed(2.555)).toBe(2.56);
    });
  });

  describe('Speed Presets', () => {
    const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 4];

    test('all presets should be within valid range', () => {
      SPEED_PRESETS.forEach(preset => {
        expect(preset).toBeGreaterThanOrEqual(MIN_SPEED);
        expect(preset).toBeLessThanOrEqual(MAX_SPEED);
      });
    });

    test('presets should include default speed', () => {
      expect(SPEED_PRESETS).toContain(DEFAULT_SPEED);
    });

    test('presets should be sorted in ascending order', () => {
      for (let i = 1; i < SPEED_PRESETS.length; i++) {
        expect(SPEED_PRESETS[i]).toBeGreaterThan(SPEED_PRESETS[i - 1]);
      }
    });
  });
});

describe('Video Playback Rate', () => {
  let video;

  beforeEach(() => {
    video = document.createElement('video');
    document.body.appendChild(video);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should set playback rate on video element', () => {
    video.playbackRate = 2;
    expect(video.playbackRate).toBe(2);
  });

  test('should handle multiple videos', () => {
    const video2 = document.createElement('video');
    document.body.appendChild(video2);

    const videos = document.querySelectorAll('video');
    videos.forEach(v => v.playbackRate = 1.5);

    expect(video.playbackRate).toBe(1.5);
    expect(video2.playbackRate).toBe(1.5);
  });
});

describe('Browser API Compatibility', () => {
  test('browser API mock should be available', () => {
    expect(global.browser).toBeDefined();
    expect(global.browser.storage).toBeDefined();
    expect(global.browser.storage.local).toBeDefined();
  });

  test('chrome API mock should be available', () => {
    expect(global.chrome).toBeDefined();
    expect(global.chrome.storage).toBeDefined();
    expect(global.chrome.storage.local).toBeDefined();
  });

  test('storage.local.get should return promise', async () => {
    const result = await browser.storage.local.get(['defaultSpeed']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('storage.local.set should store values', async () => {
    await browser.storage.local.set({ defaultSpeed: 2 });
    const result = await browser.storage.local.get(['defaultSpeed']);
    expect(result.defaultSpeed).toBe(2);
  });
});

describe('UI Element Creation', () => {
  // Helper function that mirrors the el() function from content.js
  function el(tag, attrs, children) {
    const element = document.createElement(tag);
    if (attrs) {
      for (const [key, val] of Object.entries(attrs)) {
        if (key === 'className') element.className = val;
        else if (key === 'textContent') element.textContent = val;
        else element.setAttribute(key, val);
      }
    }
    if (children) {
      for (const child of Array.isArray(children) ? children : [children]) {
        if (typeof child === 'string') element.appendChild(document.createTextNode(child));
        else if (child) element.appendChild(child);
      }
    }
    return element;
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('el() should create element with tag', () => {
    const div = el('div');
    expect(div.tagName).toBe('DIV');
  });

  test('el() should set className', () => {
    const div = el('div', { className: 'test-class' });
    expect(div.className).toBe('test-class');
  });

  test('el() should set textContent', () => {
    const span = el('span', { textContent: 'Hello' });
    expect(span.textContent).toBe('Hello');
  });

  test('el() should set attributes', () => {
    const input = el('input', { type: 'number', min: '0', max: '16' });
    expect(input.getAttribute('type')).toBe('number');
    expect(input.getAttribute('min')).toBe('0');
    expect(input.getAttribute('max')).toBe('16');
  });

  test('el() should append children', () => {
    const parent = el('div', {}, [
      el('span', { textContent: 'Child 1' }),
      el('span', { textContent: 'Child 2' })
    ]);
    expect(parent.children.length).toBe(2);
    expect(parent.children[0].textContent).toBe('Child 1');
    expect(parent.children[1].textContent).toBe('Child 2');
  });

  test('el() should handle string children', () => {
    const div = el('div', {}, 'Text content');
    expect(div.textContent).toBe('Text content');
  });
});
