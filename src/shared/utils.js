// Shared utility functions for YouTube Speed Control
// Works in both Node.js (tests) and browser (extension)

(function(exports) {
  'use strict';

  // Speed Constants
  const SPEED_MIN = 0.25;
  const SPEED_MAX = 16;
  const DEFAULT_SPEED = 1;
  const SPEED_STEP = 0.05;
  const VALID_CONFIG_KEYS = ['defaultSpeed', 'hideGlobal', 'disableGlobal', 'panelPosition', 'siteConfigs'];

  // UI Constants
  const UI_TOGGLE_SIZE = 40;
  const UI_MARGIN = 8;
  const MIN_VIDEO_SIZE = 50;

  // Timing Constants
  const DEBOUNCE_SPEED_MS = 50;
  const DEBOUNCE_OBSERVER_MS = 100;
  const FEEDBACK_DURATION_MS = 800;
  const INIT_RETRY_MS = 100;
  const SETUP_RETRY_DELAYS = [1000, 3000];

  // Speed Enforcement (YouTube workaround)
  const ENFORCE_BACKOFF_DELAYS = [10, 25, 50, 100, 200];
  const ENFORCE_MAX_ATTEMPTS = 5;

  /**
   * Clamp speed to valid range [SPEED_MIN, SPEED_MAX]
   * @param {number} speed
   * @returns {number}
   */
  function clampSpeed(speed) {
    return Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
  }

  /**
   * Round speed to 2 decimal places
   * @param {number} speed
   * @returns {number}
   */
  function roundSpeed(speed) {
    return Math.round(speed * 100) / 100;
  }

  /**
   * Check if value is valid speed in range
   * @param {*} value
   * @returns {boolean}
   */
  function validateSpeed(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= SPEED_MIN && num <= SPEED_MAX;
  }

  /**
   * Strip www/m/mobile prefix from hostname
   * @param {string} hostname
   * @returns {string}
   */
  function normalizeHostname(hostname) {
    return hostname.replace(/^(www\.|m\.|mobile\.)/, '');
  }

  /**
   * Validate import data structure and values
   * @param {*} data
   * @returns {boolean}
   */
  function validateImportData(data) {
    if (typeof data !== 'object' || data === null) return false;
    const validKeys = new Set(VALID_CONFIG_KEYS);
    for (const key of Object.keys(data)) {
      if (!validKeys.has(key)) return false;
    }
    if (data.defaultSpeed !== undefined && !validateSpeed(data.defaultSpeed)) return false;
    if (data.hideGlobal !== undefined && typeof data.hideGlobal !== 'boolean') return false;
    if (data.disableGlobal !== undefined && typeof data.disableGlobal !== 'boolean') return false;
    if (data.panelPosition !== undefined) {
      if (typeof data.panelPosition !== 'object' || data.panelPosition === null) return false;
      if (typeof data.panelPosition.x !== 'number' || typeof data.panelPosition.y !== 'number') return false;
    }
    if (data.siteConfigs) {
      if (typeof data.siteConfigs !== 'object') return false;
      for (const [site, cfg] of Object.entries(data.siteConfigs)) {
        if (typeof cfg !== 'object' || cfg === null) return false;
        if (cfg.defaultSpeed !== undefined && !validateSpeed(cfg.defaultSpeed)) return false;
        if (cfg.hidden !== undefined && typeof cfg.hidden !== 'boolean') return false;
        if (cfg.disabled !== undefined && typeof cfg.disabled !== 'boolean') return false;
      }
    }
    return true;
  }

  // Export
  exports.SPEED_MIN = SPEED_MIN;
  exports.SPEED_MAX = SPEED_MAX;
  exports.DEFAULT_SPEED = DEFAULT_SPEED;
  exports.SPEED_STEP = SPEED_STEP;
  exports.VALID_CONFIG_KEYS = VALID_CONFIG_KEYS;
  exports.UI_TOGGLE_SIZE = UI_TOGGLE_SIZE;
  exports.UI_MARGIN = UI_MARGIN;
  exports.MIN_VIDEO_SIZE = MIN_VIDEO_SIZE;
  exports.DEBOUNCE_SPEED_MS = DEBOUNCE_SPEED_MS;
  exports.DEBOUNCE_OBSERVER_MS = DEBOUNCE_OBSERVER_MS;
  exports.FEEDBACK_DURATION_MS = FEEDBACK_DURATION_MS;
  exports.INIT_RETRY_MS = INIT_RETRY_MS;
  exports.SETUP_RETRY_DELAYS = SETUP_RETRY_DELAYS;
  exports.ENFORCE_BACKOFF_DELAYS = ENFORCE_BACKOFF_DELAYS;
  exports.ENFORCE_MAX_ATTEMPTS = ENFORCE_MAX_ATTEMPTS;
  exports.clampSpeed = clampSpeed;
  exports.roundSpeed = roundSpeed;
  exports.validateSpeed = validateSpeed;
  exports.normalizeHostname = normalizeHostname;
  exports.validateImportData = validateImportData;

})( /* istanbul ignore next */ typeof module !== 'undefined' && module.exports ? module.exports : (window.YTSpeedUtils = {}));
