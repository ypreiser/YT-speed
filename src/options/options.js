// YouTube Speed Control - Options Script
(function() {
  'use strict';

  const SPEED_MIN = 0.25;
  const SPEED_MAX = 16;
  const VALID_CONFIG_KEYS = ['defaultSpeed', 'hideGlobal', 'panelPosition', 'siteConfigs'];

  function clampSpeed(speed) {
    return Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
  }

  function validateSpeed(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= SPEED_MIN && num <= SPEED_MAX;
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

  const hideGlobalCheckbox = document.getElementById('hide-global');
  const globalSpeedInput = document.getElementById('global-speed');
  const siteConfigsList = document.getElementById('site-configs-list');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const resetBtn = document.getElementById('reset-btn');

  // Load all settings
  async function loadSettings() {
    const data = await browser.storage.local.get(null);

    hideGlobalCheckbox.checked = data.hideGlobal || false;
    globalSpeedInput.value = data.defaultSpeed || 1;

    renderSiteConfigs(data.siteConfigs || {});
  }

  // Render site configs list
  function renderSiteConfigs(configs) {
    const sites = Object.keys(configs);

    if (sites.length === 0) {
      siteConfigsList.innerHTML = '<p class="empty-message">No site-specific settings yet</p>';
      return;
    }

    siteConfigsList.innerHTML = sites.map(site => {
      const config = configs[site];
      return `
        <div class="site-config-item" data-site="${site}">
          <div class="site-config-name">${site}</div>
          <div class="site-config-info">
            <div class="site-config-details">
              Speed: ${config.defaultSpeed || 1}x ·
              ${config.hidden ? 'Hidden' : 'Visible'}
            </div>
          </div>
          <div class="site-config-actions">
            <button class="site-config-edit" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="site-config-delete" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
          <div class="site-config-editor">
            <div class="editor-row">
              <label>Speed</label>
              <input type="number" class="editor-speed" min="${SPEED_MIN}" max="${SPEED_MAX}" step="0.25" value="${config.defaultSpeed || 1}">
            </div>
            <div class="editor-row">
              <label>
                <input type="checkbox" class="editor-hidden" ${config.hidden ? 'checked' : ''}>
                Hidden
              </label>
            </div>
            <div class="editor-actions">
              <button class="editor-save">Save</button>
              <button class="editor-cancel">Cancel</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add event handlers
    siteConfigsList.querySelectorAll('.site-config-item').forEach(item => {
      const site = item.dataset.site;

      // Edit button
      item.querySelector('.site-config-edit').addEventListener('click', () => {
        item.classList.add('editing');
      });

      // Delete button
      item.querySelector('.site-config-delete').addEventListener('click', () => {
        deleteSiteConfig(site);
      });

      // Save button
      item.querySelector('.editor-save').addEventListener('click', async () => {
        const speedInput = item.querySelector('.editor-speed');
        const speed = parseFloat(speedInput.value);
        const hidden = item.querySelector('.editor-hidden').checked;

        // Validate and clamp speed
        const clampedSpeed = clampSpeed(speed);
        await updateSiteConfig(site, { defaultSpeed: clampedSpeed, hidden });
      });

      // Cancel button
      item.querySelector('.editor-cancel').addEventListener('click', () => {
        item.classList.remove('editing');
      });
    });
  }

  // Update a site config
  async function updateSiteConfig(site, updates) {
    const { siteConfigs = {} } = await browser.storage.local.get('siteConfigs');
    siteConfigs[site] = { ...siteConfigs[site], ...updates };
    await browser.storage.local.set({ siteConfigs });
    loadSettings();
  }

  // Delete a site config
  async function deleteSiteConfig(site) {
    if (!confirm(`Delete settings for ${site}?`)) return;
    const { siteConfigs = {} } = await browser.storage.local.get('siteConfigs');
    delete siteConfigs[site];
    await browser.storage.local.set({ siteConfigs });
    loadSettings();
  }

  // Save global settings
  hideGlobalCheckbox.addEventListener('change', async () => {
    await browser.storage.local.set({ hideGlobal: hideGlobalCheckbox.checked });
  });

  globalSpeedInput.addEventListener('change', async () => {
    const speed = parseFloat(globalSpeedInput.value);
    if (validateSpeed(speed)) {
      // Clamp to valid range
      const clampedSpeed = clampSpeed(speed);
      globalSpeedInput.value = clampedSpeed;
      await browser.storage.local.set({ defaultSpeed: clampedSpeed });
    } else {
      // Reset to current stored value
      const data = await browser.storage.local.get('defaultSpeed');
      globalSpeedInput.value = data.defaultSpeed || 1;
    }
  });

  // Export settings
  exportBtn.addEventListener('click', async () => {
    const data = await browser.storage.local.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yt-speed-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import settings
  importBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate import data
      if (!validateImportData(data)) {
        alert('Import failed: Invalid settings format or values out of range');
        importFile.value = '';
        return;
      }

      await browser.storage.local.set(data);
      loadSettings();
      alert('Settings imported!');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    importFile.value = '';
  });

  // Reset all settings
  resetBtn.addEventListener('click', async () => {
    if (confirm('Reset all settings? This cannot be undone.')) {
      await browser.storage.local.clear();
      loadSettings();
    }
  });

  loadSettings();
})();
