// YouTube Speed Control - Content Script
(function () {
  "use strict";

  // Import from shared utils
  const {
    SPEED_MIN, SPEED_MAX, DEFAULT_SPEED, SPEED_STEP,
    UI_TOGGLE_SIZE, UI_MARGIN, MIN_VIDEO_SIZE,
    DEBOUNCE_SPEED_MS, DEBOUNCE_OBSERVER_MS, FEEDBACK_DURATION_MS,
    INIT_RETRY_MS, SETUP_RETRY_DELAYS,
    ENFORCE_BACKOFF_DELAYS, ENFORCE_MAX_ATTEMPTS,
    clampSpeed, roundSpeed, normalizeHostname
  } = window.YTSpeedUtils;

  // Local constants
  const SPEED_PRESETS = [
    0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 4,
  ];
  const DRAG_THRESHOLD = 5; // px before drag activates

  /**
   * Get per-site config from storage
   * @param {string} host - hostname to lookup
   * @returns {Promise<Object|null>}
   */
  async function getSiteConfig(host) {
    const { siteConfigs = {} } = await browser.storage.local.get('siteConfigs');
    const normalized = normalizeHostname(host);
    // Try normalized first, fall back to exact match
    return siteConfigs[normalized] || siteConfigs[host] || null;
  }

  async function saveSiteConfig(host, config) {
    const { siteConfigs = {} } = await browser.storage.local.get('siteConfigs');
    const normalized = normalizeHostname(host);
    siteConfigs[normalized] = { ...siteConfigs[normalized], ...config };
    await browser.storage.local.set({ siteConfigs });
  }

  // Site detection
  const isYouTube = location.hostname.includes('youtube.com');
  const hostname = location.hostname.replace(/^www\./, '');

  // State
  let currentSpeed = DEFAULT_SPEED;
  let defaultSpeed = DEFAULT_SPEED;
  let uiVisible = false;
  let playerControlInjected = false;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let dragStartPos = { x: 0, y: 0 };
  let didDrag = false;
  let uiCreated = false;
  let hiddenInThisTab = false;
  let siteDisabled = false; // true when extension is disabled for this site
  let container = null;
  let observer = null;
  let cachedDragDims = null; // cached dimensions during drag
  let applySpeedTimer = null; // debounce timer
  let observerDebounceTimer = null; // MutationObserver debounce
  let playHandler = null; // stored for cleanup
  let ratechangeHandler = null; // stored for cleanup

  // ============ Site Config ============

  async function setSiteConfig(key, value) {
    const config = await getSiteConfig(hostname) || {};
    config[key] = value;
    await saveSiteConfig(hostname, config);
  }

  /**
   * Merge site config with global defaults
   * @returns {Promise<{defaultSpeed: number, hidden: boolean, panelPosition: {x: number, y: number}}>}
   */
  async function getEffectiveSettings() {
    const siteConfig = await getSiteConfig(hostname);
    const global = await browser.storage.local.get(['defaultSpeed', 'hideGlobal', 'panelPosition']);

    return {
      defaultSpeed: siteConfig?.defaultSpeed ?? global.defaultSpeed ?? 1.0,
      hidden: global.hideGlobal || siteConfig?.hidden || false,
      panelPosition: siteConfig?.panelPosition ?? global.panelPosition ?? { x: 8, y: 80 }
    };
  }

  // ============ Visibility ============

  async function shouldHide() {
    if (hiddenInThisTab) return true;
    const { hidden } = await getEffectiveSettings();
    return hidden;
  }

  function hasVideo() {
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      // Check if video is visible and has dimensions
      const rect = video.getBoundingClientRect();
      if (rect.width > MIN_VIDEO_SIZE && rect.height > MIN_VIDEO_SIZE) {
        return true;
      }
    }
    return false;
  }

  async function maybeShowUI() {
    const videoExists = hasVideo();
    const hidden = await shouldHide();

    if (videoExists && !uiCreated && !hidden) {
      createUI();
      uiCreated = true;
    } else if (container) {
      container.classList.toggle('yt-speed-hidden', !videoExists || hidden);
    }
  }

  async function hideButton(scope) {
    if (scope === 'tab') {
      hiddenInThisTab = true;
    } else if (scope === 'site') {
      await setSiteConfig('hidden', true);
    } else if (scope === 'global') {
      await browser.storage.local.set({ hideGlobal: true });
    }
    maybeShowUI();
  }

  async function showButton(scope) {
    if (scope === 'tab') {
      hiddenInThisTab = false;
    } else if (scope === 'site') {
      await setSiteConfig('hidden', false);
    } else if (scope === 'global') {
      await browser.storage.local.set({ hideGlobal: false });
    }
    maybeShowUI();
  }

  async function disableSite() {
    siteDisabled = true;
    await setSiteConfig('disabled', true);
    resetAllVideosToNative();
    updateDisabledState();
  }

  async function enableSite() {
    siteDisabled = false;
    await setSiteConfig('disabled', false);
    applySpeedToAllVideos();
    updateDisabledState();
  }

  function updateDisabledState() {
    if (container) {
      container.classList.toggle('yt-speed-disabled', siteDisabled);
    }
    const disableBtn = document.getElementById('yt-speed-disable-btn');
    if (disableBtn) {
      disableBtn.textContent = siteDisabled ? 'Enable' : 'Disable';
      disableBtn.title = siteDisabled ? 'Enable speed control' : 'Disable speed control (use native)';
    }
    const playerBtn = document.querySelector('.yt-speed-player-btn');
    if (playerBtn) {
      playerBtn.classList.toggle('yt-speed-player-disabled', siteDisabled);
    }
  }

  // Reset all videos to native 1x speed (for when disabled)
  function resetAllVideosToNative() {
    document.querySelectorAll("video").forEach((video) => {
      video.playbackRate = 1.0;
    });
  }

  // ============ Storage ============

  async function loadSettings() {
    try {
      const settings = await getEffectiveSettings();
      const siteConfig = await getSiteConfig(hostname);
      const global = await browser.storage.local.get(['disableGlobal']);
      siteDisabled = global.disableGlobal || siteConfig?.disabled || false;
      defaultSpeed = settings.defaultSpeed;
      currentSpeed = defaultSpeed;
      applySpeedToAllVideos();
      updateSpeedDisplay();
    } catch (err) {
      console.warn("YT Speed [" + hostname + "]: loadSettings failed", err);
    }
  }

  async function saveDefaultSpeed(speed) {
    defaultSpeed = speed;
    await setSiteConfig('defaultSpeed', speed);
    // Broadcast to other tabs via background
    browser.runtime.sendMessage({ action: 'broadcastDefaultSpeed', speed, hostname })
      .catch((err) => console.warn("YT Speed [" + hostname + "]: broadcast failed", err));
  }

  // ============ Speed Control ============

  /**
   * Set playback speed for all videos on page
   * @param {number} speed - target speed (will be clamped and rounded)
   */
  function setSpeed(speed) {
    speed = roundSpeed(clampSpeed(speed));
    currentSpeed = speed;
    applySpeedToAllVideos();
    updateSpeedDisplay();
  }

  function applySpeedToAllVideos() {
    if (siteDisabled) return;
    document.querySelectorAll("video").forEach((video) => {
      if (video.playbackRate !== currentSpeed) {
        video.playbackRate = currentSpeed;
      }
    });
  }

  // Debounced version to prevent multiple calls during page load
  function applySpeedToAllVideosDebounced() {
    if (applySpeedTimer) clearTimeout(applySpeedTimer);
    applySpeedTimer = setTimeout(applySpeedToAllVideos, DEBOUNCE_SPEED_MS);
  }

  // ============ UI Updates ============

  function updateSpeedDisplay() {
    const elements = {
      toggle: document.getElementById("yt-speed-toggle"),
      display: document.getElementById("yt-speed-display"),
      customInput: document.getElementById("yt-speed-custom"),
      rangeInput: document.getElementById("yt-speed-range"),
      infoText: document.querySelector(".yt-speed-info"),
      playerText: document.querySelector(".yt-speed-player-text"),
    };

    if (elements.toggle) elements.toggle.textContent = `${currentSpeed}x`;
    if (elements.display) elements.display.textContent = `${currentSpeed}x`;
    if (elements.customInput) elements.customInput.value = currentSpeed;
    if (elements.rangeInput) elements.rangeInput.value = currentSpeed;
    if (elements.infoText)
      elements.infoText.textContent = `Default: ${defaultSpeed}x (this site)`;
    if (elements.playerText)
      elements.playerText.textContent = `${currentSpeed}x`;

    // Update preset buttons
    document.querySelectorAll(".yt-speed-preset").forEach((btn) => {
      btn.classList.toggle(
        "active",
        parseFloat(btn.dataset.speed) === currentSpeed,
      );
    });
  }

  // ============ Floating UI ============

  function buildUITemplate() {
    return `
      <button id="yt-speed-toggle"></button>
      <div id="yt-speed-panel">
        <div class="yt-speed-header">
          <span>PLAYBACK SPEED</span>
          <div class="yt-speed-header-actions">
            <div class="yt-speed-hide-dropdown">
              <button class="yt-speed-hide-toggle" title="Hide button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
              <div class="yt-speed-hide-menu">
                <button data-scope="tab">This Tab</button>
                <button data-scope="site">This Site</button>
                <button data-scope="global">All Sites</button>
              </div>
            </div>
            <button class="yt-speed-settings" title="Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
              </svg>
            </button>
            <button class="yt-speed-close">×</button>
          </div>
        </div>
        <div class="yt-speed-display-container">
          <div class="yt-speed-current" id="yt-speed-display"></div>
          <div class="yt-speed-label">CURRENT SPEED</div>
        </div>
        <div class="yt-speed-slider">
          <input type="range" id="yt-speed-range" step="0.05">
        </div>
        <button class="yt-speed-action yt-speed-reset" id="yt-speed-reset">Reset to 1x</button>
        <div class="yt-speed-presets"></div>
        <div class="yt-speed-custom">
          <label></label>
          <div class="yt-speed-number-input">
            <button type="button" class="yt-speed-number-btn" id="yt-speed-decrement">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"/>
              </svg>
            </button>
            <input type="number" id="yt-speed-custom" step="0.05">
            <button type="button" class="yt-speed-number-btn" id="yt-speed-increment">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5v14"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="yt-speed-actions">
          <div class="yt-speed-save-row">
            <button class="yt-speed-action" id="yt-speed-save-site">Save for Site</button>
            <button class="yt-speed-action" id="yt-speed-save-global">Save for All</button>
          </div>
          <button class="yt-speed-action yt-speed-disable" id="yt-speed-disable-btn">Disable</button>
        </div>
        <div class="yt-speed-info"></div>
      </div>
    `;
  }

  function createUI() {
    const existingUI = document.getElementById("yt-speed-control");
    if (existingUI) existingUI.remove();

    container = document.createElement("div");
    container.id = "yt-speed-control";
    // Use DOMParser to avoid innerHTML security warning
    const parser = new DOMParser();
    const doc = parser.parseFromString(buildUITemplate(), 'text/html');
    const fragment = document.createDocumentFragment();
    while (doc.body.firstChild) {
      fragment.appendChild(doc.body.firstChild);
    }
    container.appendChild(fragment);

    // Set dynamic values via DOM (safer than template interpolation)
    container.querySelector("#yt-speed-toggle").textContent = currentSpeed + "x";
    container.querySelector("#yt-speed-display").textContent = currentSpeed + "x";
    const rangeEl = container.querySelector("#yt-speed-range");
    rangeEl.min = SPEED_MIN;
    rangeEl.max = SPEED_MAX;
    rangeEl.value = currentSpeed;
    const customEl = container.querySelector("#yt-speed-custom");
    customEl.min = SPEED_MIN;
    customEl.max = SPEED_MAX;
    customEl.value = currentSpeed;
    container.querySelector(".yt-speed-custom label").textContent =
      "CUSTOM SPEED (" + SPEED_MIN + "x – " + SPEED_MAX + "x)";
    container.querySelector(".yt-speed-info").textContent =
      "Current Default Speed: " + defaultSpeed + "x (this site)";

    // Build preset buttons
    const presetsContainer = container.querySelector(".yt-speed-presets");
    presetsContainer.textContent = "";
    SPEED_PRESETS.forEach((speed) => {
      const btn = document.createElement("button");
      btn.className = "yt-speed-preset" + (speed === currentSpeed ? " active" : "");
      btn.dataset.speed = speed;
      btn.textContent = speed + "x";
      presetsContainer.appendChild(btn);
    });

    document.body.appendChild(container);
    attachUIEventListeners(container);
    loadPosition(container);
    attachDragListeners(container);
    updateDisabledState();
  }

  function attachUIEventListeners(el) {
    const toggle = document.getElementById("yt-speed-toggle");
    const panel = document.getElementById("yt-speed-panel");
    const closeBtn = document.querySelector(".yt-speed-close");
    const customInput = document.getElementById("yt-speed-custom");
    const saveSiteBtn = document.getElementById("yt-speed-save-site");
    const saveGlobalBtn = document.getElementById("yt-speed-save-global");
    const resetBtn = document.getElementById("yt-speed-reset");
    const rangeInput = document.getElementById("yt-speed-range");
    const hideToggle = document.querySelector(".yt-speed-hide-toggle");
    const hideMenu = document.querySelector(".yt-speed-hide-menu");

    // Toggle panel (skip if just dragged)
    toggle.addEventListener("click", () => {
      if (didDrag) {
        didDrag = false;
        return;
      }
      uiVisible = !uiVisible;
      panel.classList.toggle("visible", uiVisible);
      if (uiVisible) {
        // Keep panel on screen after render
        requestAnimationFrame(() => {
          const elRect = el.getBoundingClientRect();
          const panelRect = panel.getBoundingClientRect();
          const totalWidth = panelRect.width;
          const totalHeight = panelRect.bottom - elRect.top;
          let x = Math.min(elRect.left, window.innerWidth - totalWidth - UI_MARGIN);
          let y = Math.min(elRect.top, window.innerHeight - totalHeight - UI_MARGIN);
          x = Math.max(UI_MARGIN, x);
          y = Math.max(UI_MARGIN, y);
          el.style.left = x + "px";
          el.style.top = y + "px";
        });
      }
    });

    // Close panel
    closeBtn.addEventListener("click", () => {
      uiVisible = false;
      panel.classList.remove("visible");
    });

    // Hide dropdown toggle
    hideToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      hideMenu.classList.toggle("visible");
    });

    // Hide menu buttons
    hideMenu.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-scope]");
      if (btn) {
        hideButton(btn.dataset.scope);
        hideMenu.classList.remove("visible");
      }
    });

    // Close hide menu when clicking elsewhere
    document.addEventListener("click", () => {
      hideMenu.classList.remove("visible");
    });

    // Settings button - send message to background to open options
    const settingsBtn = document.querySelector(".yt-speed-settings");
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      browser.runtime.sendMessage({ action: 'openOptions' })
        .catch((err) => console.warn("YT Speed: openOptions failed", err));
    });

    // Preset buttons (event delegation)
    document
      .querySelector(".yt-speed-presets")
      .addEventListener("click", (e) => {
        const btn = e.target.closest(".yt-speed-preset");
        if (btn) setSpeed(parseFloat(btn.dataset.speed));
      });

    // Range slider
    rangeInput.addEventListener("input", (e) =>
      setSpeed(parseFloat(e.target.value)),
    );

    // Custom speed - sync on input
    customInput.addEventListener("input", () => {
      const speed = parseFloat(customInput.value);
      if (!isNaN(speed) && speed >= SPEED_MIN && speed <= SPEED_MAX) {
        setSpeed(speed);
      }
    });

    // Custom speed (Enter key to save for site)
    customInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveSiteBtn.click();
      }
    });

    // Increment/decrement buttons
    document.getElementById("yt-speed-decrement").addEventListener("click", () => {
      setSpeed(Math.max(SPEED_MIN, currentSpeed - SPEED_STEP));
    });
    document.getElementById("yt-speed-increment").addEventListener("click", () => {
      setSpeed(Math.min(SPEED_MAX, currentSpeed + SPEED_STEP));
    });

    // Save for this site
    saveSiteBtn.addEventListener("click", () => {
      saveDefaultSpeed(currentSpeed);
      updateSpeedDisplay();
      saveSiteBtn.textContent = "Saved!";
      saveSiteBtn.classList.add("saved");
      setTimeout(() => {
        uiVisible = false;
        panel.classList.remove("visible");
        saveSiteBtn.textContent = "Save for Site";
        saveSiteBtn.classList.remove("saved");
      }, FEEDBACK_DURATION_MS);
    });

    // Save for all sites (global default)
    saveGlobalBtn.addEventListener("click", async () => {
      await browser.storage.local.set({ defaultSpeed: currentSpeed });
      defaultSpeed = currentSpeed;
      updateSpeedDisplay();
      saveGlobalBtn.textContent = "Saved!";
      saveGlobalBtn.classList.add("saved");
      setTimeout(() => {
        uiVisible = false;
        panel.classList.remove("visible");
        saveGlobalBtn.textContent = "Save for All";
        saveGlobalBtn.classList.remove("saved");
      }, FEEDBACK_DURATION_MS);
    });

    // Reset button
    resetBtn.addEventListener("click", () => {
      setSpeed(DEFAULT_SPEED);
      saveDefaultSpeed(DEFAULT_SPEED);
      updateSpeedDisplay();
    });

    // Disable button
    const disableBtn = document.getElementById("yt-speed-disable-btn");
    disableBtn.addEventListener("click", () => {
      if (siteDisabled) {
        enableSite();
      } else {
        disableSite();
      }
    });

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (uiVisible && !el.contains(e.target)) {
        uiVisible = false;
        panel.classList.remove("visible");
      }
    });
  }

  // ============ Drag & Position ============

  function attachDragListeners(container) {
    const toggle = document.getElementById("yt-speed-toggle");

    // Mouse events
    toggle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      didDrag = false;
      dragStartPos = { x: e.clientX, y: e.clientY };
      dragOffset.x = e.clientX - container.offsetLeft;
      dragOffset.y = e.clientY - container.offsetTop;
      // Cache dimensions on mousedown
      const panel = document.getElementById("yt-speed-panel");
      const panelVisible = panel && panel.classList.contains("visible");
      cachedDragDims = {
        w: panelVisible ? panel.offsetWidth : UI_TOGGLE_SIZE,
        h: panelVisible ? UI_TOGGLE_SIZE + 10 + panel.offsetHeight : UI_TOGGLE_SIZE
      };
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      // Set didDrag only after threshold exceeded (for tap detection)
      if (!didDrag) {
        const dx = Math.abs(e.clientX - dragStartPos.x);
        const dy = Math.abs(e.clientY - dragStartPos.y);
        if (dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD) {
          didDrag = true;
        }
      }
      const { w, h } = cachedDragDims || { w: UI_TOGGLE_SIZE, h: UI_TOGGLE_SIZE };
      let x = e.clientX - dragOffset.x;
      let y = e.clientY - dragOffset.y;
      x = Math.max(0, Math.min(x, window.innerWidth - w));
      y = Math.max(0, Math.min(y, window.innerHeight - h));
      container.style.left = x + "px";
      container.style.top = y + "px";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        cachedDragDims = null;
        if (didDrag) savePosition(container);
      }
    });

    // Touch events
    toggle.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      isDragging = true;
      didDrag = false;
      dragStartPos = { x: touch.clientX, y: touch.clientY };
      dragOffset.x = touch.clientX - container.offsetLeft;
      dragOffset.y = touch.clientY - container.offsetTop;
      // Cache dimensions on touchstart
      const panel = document.getElementById("yt-speed-panel");
      const panelVisible = panel && panel.classList.contains("visible");
      cachedDragDims = {
        w: panelVisible ? panel.offsetWidth : UI_TOGGLE_SIZE,
        h: panelVisible ? UI_TOGGLE_SIZE + 10 + panel.offsetHeight : UI_TOGGLE_SIZE
      };
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      // Set didDrag only after threshold exceeded (for tap detection)
      if (!didDrag) {
        const dx = Math.abs(touch.clientX - dragStartPos.x);
        const dy = Math.abs(touch.clientY - dragStartPos.y);
        if (dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD) {
          didDrag = true;
        }
      }
      const { w, h } = cachedDragDims || { w: UI_TOGGLE_SIZE, h: UI_TOGGLE_SIZE };
      let x = touch.clientX - dragOffset.x;
      let y = touch.clientY - dragOffset.y;
      x = Math.max(0, Math.min(x, window.innerWidth - w));
      y = Math.max(0, Math.min(y, window.innerHeight - h));
      container.style.left = x + "px";
      container.style.top = y + "px";
    }, { passive: true });

    document.addEventListener("touchend", () => {
      if (isDragging) {
        isDragging = false;
        cachedDragDims = null;
        if (didDrag) savePosition(container);
      }
    });

    window.addEventListener("resize", () => snapToScreen(container));
  }

  function snapToScreen(el, save = true) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = el.offsetWidth || UI_TOGGLE_SIZE;
    const height = el.offsetHeight || UI_TOGGLE_SIZE;
    const safeX = Math.max(0, Math.min(rect.left, window.innerWidth - width));
    const safeY = Math.max(0, Math.min(rect.top, window.innerHeight - height));
    if (safeX !== rect.left || safeY !== rect.top) {
      el.style.left = safeX + "px";
      el.style.top = safeY + "px";
      if (save) savePosition(el);
    }
  }

  function savePosition(el) {
    const rect = el.getBoundingClientRect();
    setSiteConfig('panelPosition', { x: rect.left, y: rect.top })
      .catch((err) => console.warn("YT Speed [" + hostname + "]: savePosition failed", err));
  }

  async function loadPosition(el) {
    try {
      const settings = await getEffectiveSettings();
      const { x, y } = settings.panelPosition;
      // Bounds check on load
      const safeX = Math.max(0, Math.min(x, window.innerWidth - MIN_VIDEO_SIZE));
      const safeY = Math.max(0, Math.min(y, window.innerHeight - MIN_VIDEO_SIZE));
      el.style.left = safeX + "px";
      el.style.top = safeY + "px";
    } catch (err) {
      console.warn("YT Speed [" + hostname + "]: loadPosition failed", err);
    }
  }

  // ============ Player Control Button ============

  function createPlayerControl() {
    if (document.querySelector(".yt-speed-player-btn")) return;

    const rightControls = document.querySelector(".ytp-right-controls");
    if (!rightControls) return;

    // Inject toggle function into page context (only once)
    if (!playerControlInjected) {
      const script = document.createElement("script");
      script.textContent = `
        window.__ytSpeedToggle = function() {
          var panel = document.getElementById('yt-speed-panel');
          if (panel) {
            var isVisible = panel.classList.contains('visible');
            panel.classList.toggle('visible', !isVisible);
            document.dispatchEvent(new CustomEvent('yt-speed-panel-toggled', { detail: !isVisible }));
          }
        };
      `;
      document.documentElement.appendChild(script);
      script.remove();

      // Sync uiVisible state from page context
      document.addEventListener("yt-speed-panel-toggled", (e) => {
        uiVisible = e.detail;
      });

      playerControlInjected = true;
    }

    // Create button with click handler
    const btn = document.createElement("button");
    btn.className = "yt-speed-player-btn ytp-button";
    btn.title = "Playback Speed";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Call the injected page-context function
      const script = document.createElement("script");
      script.textContent = "window.__ytSpeedToggle && window.__ytSpeedToggle();";
      document.documentElement.appendChild(script);
      script.remove();
    });
    const span = document.createElement("span");
    span.className = "yt-speed-player-text";
    span.textContent = currentSpeed + "x";
    btn.appendChild(span);

    // Insert at the beginning of right controls
    rightControls.insertBefore(btn, rightControls.firstChild);

    // Apply disabled state if needed
    if (siteDisabled) {
      btn.classList.add('yt-speed-player-disabled');
    }
  }

  // ============ Video Observer ============

  /**
   * Enforce speed with exponential backoff for YouTube's aggressive ratechange
   * @param {HTMLVideoElement} video
   * @param {number} attempt - current retry count
   */
  function enforceSpeed(video, attempt = 0) {
    if (attempt >= ENFORCE_MAX_ATTEMPTS) return;
    if (video.playbackRate !== currentSpeed) {
      video.playbackRate = currentSpeed;
      setTimeout(() => enforceSpeed(video, attempt + 1), ENFORCE_BACKOFF_DELAYS[attempt]);
    }
  }

  function observeVideos() {
    observer = new MutationObserver((mutations) => {
      // Debounce observer callback
      if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
      observerDebounceTimer = setTimeout(() => {
        let hasNewVideo = false;
        let hasPlayerControls = false;

        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeName === "VIDEO" || node.querySelector?.("video")) {
              hasNewVideo = true;
            }
            if (node.querySelector?.(".ytp-settings-button")) {
              hasPlayerControls = true;
            }
          }
        }

        if (hasNewVideo) {
          applySpeedToAllVideosDebounced();
          maybeShowUI();
        }
        if (hasPlayerControls && isYouTube) createPlayerControl();
      }, DEBOUNCE_OBSERVER_MS);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Handle video play events - store reference for cleanup
    playHandler = (e) => {
      if (siteDisabled) return;
      if (e.target.tagName === "VIDEO") {
        e.target.playbackRate = currentSpeed;
      }
    };
    document.addEventListener("play", playHandler, true);

    // Override YouTube's speed reset attempts with exponential backoff
    ratechangeHandler = (e) => {
      if (siteDisabled) return;
      if (
        e.target.tagName === "VIDEO" &&
        e.target.playbackRate !== currentSpeed
      ) {
        enforceSpeed(e.target, 0);
      }
    };
    document.addEventListener("ratechange", ratechangeHandler, true);
  }

  // ============ Cleanup ============

  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (playHandler) {
      document.removeEventListener("play", playHandler, true);
      playHandler = null;
    }
    if (ratechangeHandler) {
      document.removeEventListener("ratechange", ratechangeHandler, true);
      ratechangeHandler = null;
    }
    if (applySpeedTimer) {
      clearTimeout(applySpeedTimer);
      applySpeedTimer = null;
    }
    if (observerDebounceTimer) {
      clearTimeout(observerDebounceTimer);
      observerDebounceTimer = null;
    }
  }

  // ============ Message Listener ============

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'setSpeed' && typeof message.speed === 'number') {
      setSpeed(message.speed);
    } else if (message.action === 'setDefaultSpeed' && typeof message.speed === 'number') {
      // Only apply if same site or no hostname specified (global)
      if (!message.hostname || message.hostname === hostname) {
        defaultSpeed = message.speed;
        updateSpeedDisplay();
      }
    } else if (message.action === 'getSpeed') {
      sendResponse({ currentSpeed, defaultSpeed });
    } else if (message.action === 'saveDefaultSpeed' && typeof message.speed === 'number') {
      saveDefaultSpeed(message.speed);
      sendResponse({ success: true });
    } else if (message.action === 'hideButton') {
      hideButton(message.scope);
    } else if (message.action === 'showButton') {
      showButton(message.scope);
    } else if (message.action === 'disableSite') {
      disableSite();
    } else if (message.action === 'enableSite') {
      enableSite();
    } else if (message.action === 'getVisibility') {
      (async () => {
        const siteConfig = await getSiteConfig(hostname);
        const global = await browser.storage.local.get(['hideGlobal', 'disableGlobal']);
        sendResponse({
          hasVideo: hasVideo(),
          hiddenTab: hiddenInThisTab,
          hiddenSite: siteConfig?.hidden || false,
          hiddenGlobal: global.hideGlobal || false,
          disabledSite: siteConfig?.disabled || false,
          disabledGlobal: global.disableGlobal || false,
          hostname
        });
      })();
      return true; // async response
    } else if (message.action === 'getSiteConfig') {
      (async () => {
        const settings = await getEffectiveSettings();
        sendResponse({
          speed: settings.defaultSpeed,
          hidden: settings.hidden,
          position: settings.panelPosition,
          hostname
        });
      })();
      return true; // async response
    }
  });

  // ============ Initialization ============

  async function init() {
    if (!document.body) {
      setTimeout(init, INIT_RETRY_MS);
      return;
    }

    await loadSettings();
    await maybeShowUI(); // Only creates UI if video exists and not hidden
    observeVideos();

    // Initial setup with retries
    const setup = () => {
      applySpeedToAllVideos();
      maybeShowUI(); // Re-check for videos
      if (isYouTube) createPlayerControl();
    };

    setup();
    SETUP_RETRY_DELAYS.forEach(delay => setTimeout(setup, delay));

    // Cleanup on unload
    window.addEventListener('unload', cleanup);

    console.log("YouTube Speed Control loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
