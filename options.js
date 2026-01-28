// YouTube Speed Control - Options Script
(function() {
  'use strict';

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
          <div class="site-config-info">
            <div class="site-config-name">${site}</div>
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
          <div class="site-config-editor" style="display: none;">
            <div class="editor-row">
              <label>Speed</label>
              <input type="number" class="editor-speed" min="0.25" max="16" step="0.25" value="${config.defaultSpeed || 1}">
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
      const editor = item.querySelector('.site-config-editor');
      const info = item.querySelector('.site-config-info');
      const actions = item.querySelector('.site-config-actions');

      // Edit button
      item.querySelector('.site-config-edit').addEventListener('click', () => {
        editor.style.display = 'block';
        info.style.display = 'none';
        actions.style.display = 'none';
      });

      // Delete button
      item.querySelector('.site-config-delete').addEventListener('click', () => {
        deleteSiteConfig(site);
      });

      // Save button
      item.querySelector('.editor-save').addEventListener('click', async () => {
        const speed = parseFloat(item.querySelector('.editor-speed').value);
        const hidden = item.querySelector('.editor-hidden').checked;
        await updateSiteConfig(site, { defaultSpeed: speed, hidden });
      });

      // Cancel button
      item.querySelector('.editor-cancel').addEventListener('click', () => {
        editor.style.display = 'none';
        info.style.display = 'block';
        actions.style.display = 'flex';
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
    if (!isNaN(speed) && speed >= 0.25 && speed <= 16) {
      await browser.storage.local.set({ defaultSpeed: speed });
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
