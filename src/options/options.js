// YouTube Speed Control - Options Script
(function() {
  'use strict';

  // Import from shared utils
  const { SPEED_MIN, SPEED_MAX, clampSpeed, validateSpeed, validateImportData } = window.YTSpeedUtils;

  function createSvgIcon(...paths) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    paths.forEach(d => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    return svg;
  }

  const hideGlobalCheckbox = document.getElementById('hide-global');
  const disableGlobalCheckbox = document.getElementById('disable-global');
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
    disableGlobalCheckbox.checked = data.disableGlobal || false;
    globalSpeedInput.value = data.defaultSpeed || 1;

    renderSiteConfigs(data.siteConfigs || {});
  }

  // Render site configs list
  function renderSiteConfigs(configs) {
    const sites = Object.keys(configs);
    siteConfigsList.textContent = "";

    if (sites.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-message";
      p.textContent = "No site-specific settings yet";
      siteConfigsList.appendChild(p);
      return;
    }

    sites.forEach(site => {
      const config = configs[site];
      const item = document.createElement("div");
      item.className = "site-config-item";
      item.dataset.site = site;

      const nameDiv = document.createElement("div");
      nameDiv.className = "site-config-name";
      nameDiv.textContent = site;

      const infoDiv = document.createElement("div");
      infoDiv.className = "site-config-info";
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "site-config-details";
      const statusParts = [];
      statusParts.push("Speed: " + (config.defaultSpeed || 1) + "x");
      if (config.disabled) statusParts.push("Disabled");
      else if (config.hidden) statusParts.push("Hidden");
      detailsDiv.textContent = statusParts.join(" · ");
      infoDiv.appendChild(detailsDiv);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "site-config-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "site-config-edit";
      editBtn.title = "Edit";
      editBtn.appendChild(createSvgIcon("M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"));
      actionsDiv.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "site-config-delete";
      deleteBtn.title = "Delete";
      deleteBtn.appendChild(createSvgIcon("M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"));
      actionsDiv.appendChild(deleteBtn);

      const editorDiv = document.createElement("div");
      editorDiv.className = "site-config-editor";

      const speedRow = document.createElement("div");
      speedRow.className = "editor-row";
      const speedLabel = document.createElement("label");
      speedLabel.textContent = "Speed";

      const speedWrapper = document.createElement("div");
      speedWrapper.className = "yt-speed-number-input editor-number-input";

      const decrementBtn = document.createElement("button");
      decrementBtn.type = "button";
      decrementBtn.className = "yt-speed-number-btn";
      decrementBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>';

      const speedInput = document.createElement("input");
      speedInput.type = "number";
      speedInput.className = "editor-speed";
      speedInput.min = SPEED_MIN;
      speedInput.max = SPEED_MAX;
      speedInput.step = "0.25";
      speedInput.value = config.defaultSpeed || 1;

      const incrementBtn = document.createElement("button");
      incrementBtn.type = "button";
      incrementBtn.className = "yt-speed-number-btn";
      incrementBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg>';

      decrementBtn.addEventListener("click", () => {
        speedInput.value = clampSpeed(parseFloat(speedInput.value) - 0.25);
      });
      incrementBtn.addEventListener("click", () => {
        speedInput.value = clampSpeed(parseFloat(speedInput.value) + 0.25);
      });

      speedWrapper.appendChild(decrementBtn);
      speedWrapper.appendChild(speedInput);
      speedWrapper.appendChild(incrementBtn);

      speedRow.appendChild(speedLabel);
      speedRow.appendChild(speedWrapper);

      const hiddenRow = document.createElement("div");
      hiddenRow.className = "editor-row";
      const hiddenLabel = document.createElement("label");
      const hiddenCheckbox = document.createElement("input");
      hiddenCheckbox.type = "checkbox";
      hiddenCheckbox.className = "editor-hidden";
      hiddenCheckbox.checked = config.hidden || false;
      hiddenLabel.appendChild(hiddenCheckbox);
      hiddenLabel.appendChild(document.createTextNode(" Hide UI"));
      hiddenRow.appendChild(hiddenLabel);

      const disabledRow = document.createElement("div");
      disabledRow.className = "editor-row";
      const disabledLabel = document.createElement("label");
      const disabledCheckbox = document.createElement("input");
      disabledCheckbox.type = "checkbox";
      disabledCheckbox.className = "editor-disabled";
      disabledCheckbox.checked = config.disabled || false;
      disabledLabel.appendChild(disabledCheckbox);
      disabledLabel.appendChild(document.createTextNode(" Disable extension"));
      disabledRow.appendChild(disabledLabel);

      const editorActions = document.createElement("div");
      editorActions.className = "editor-actions";
      const saveBtn = document.createElement("button");
      saveBtn.className = "editor-save";
      saveBtn.textContent = "Save";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "editor-cancel";
      cancelBtn.textContent = "Cancel";
      editorActions.appendChild(saveBtn);
      editorActions.appendChild(cancelBtn);

      editorDiv.appendChild(speedRow);
      editorDiv.appendChild(hiddenRow);
      editorDiv.appendChild(disabledRow);
      editorDiv.appendChild(editorActions);

      item.appendChild(nameDiv);
      item.appendChild(infoDiv);
      item.appendChild(actionsDiv);
      item.appendChild(editorDiv);
      siteConfigsList.appendChild(item);
    });

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
        const disabled = item.querySelector('.editor-disabled').checked;

        // Validate and clamp speed
        const clampedSpeed = clampSpeed(speed);
        await updateSiteConfig(site, { defaultSpeed: clampedSpeed, hidden, disabled });
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

  disableGlobalCheckbox.addEventListener('change', async () => {
    await browser.storage.local.set({ disableGlobal: disableGlobalCheckbox.checked });
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

  // Increment/decrement buttons for global speed
  document.getElementById('global-speed-decrement').addEventListener('click', async () => {
    const current = parseFloat(globalSpeedInput.value) || 1;
    const newSpeed = clampSpeed(current - 0.25);
    globalSpeedInput.value = newSpeed;
    await browser.storage.local.set({ defaultSpeed: newSpeed });
  });

  document.getElementById('global-speed-increment').addEventListener('click', async () => {
    const current = parseFloat(globalSpeedInput.value) || 1;
    const newSpeed = clampSpeed(current + 0.25);
    globalSpeedInput.value = newSpeed;
    await browser.storage.local.set({ defaultSpeed: newSpeed });
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
