// Shared utility functions for YouTube Speed Control
// Works in both Node.js (tests) and browser (extension)

(function(exports) {
  'use strict';

  // Constants
  const SPEED_MIN = 0.25;
  const SPEED_MAX = 16;
  const DEFAULT_SPEED = 1;
  const VALID_CONFIG_KEYS = ['defaultSpeed', 'hideGlobal', 'panelPosition', 'siteConfigs'];

  function clampSpeed(speed) {
    return Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
  }

  function roundSpeed(speed) {
    return Math.round(speed * 100) / 100;
  }

  function validateSpeed(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= SPEED_MIN && num <= SPEED_MAX;
  }

  function normalizeHostname(hostname) {
    return hostname.replace(/^(www\.|m\.|mobile\.)/, '');
  }

  function validateImportData(data) {
    if (typeof data !== 'object' || data === null) return false;
    const validKeys = new Set(VALID_CONFIG_KEYS);
    for (const key of Object.keys(data)) {
      if (!validKeys.has(key)) return false;
    }
    if (data.defaultSpeed !== undefined && !validateSpeed(data.defaultSpeed)) return false;
    if (data.hideGlobal !== undefined && typeof data.hideGlobal !== 'boolean') return false;
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
      }
    }
    return true;
  }

  // Export
  exports.SPEED_MIN = SPEED_MIN;
  exports.SPEED_MAX = SPEED_MAX;
  exports.DEFAULT_SPEED = DEFAULT_SPEED;
  exports.VALID_CONFIG_KEYS = VALID_CONFIG_KEYS;
  exports.clampSpeed = clampSpeed;
  exports.roundSpeed = roundSpeed;
  exports.validateSpeed = validateSpeed;
  exports.normalizeHostname = normalizeHostname;
  exports.validateImportData = validateImportData;

})( /* istanbul ignore next */ typeof module !== 'undefined' && module.exports ? module.exports : (window.YTSpeedUtils = {}));
