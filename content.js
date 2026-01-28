// YouTube Speed Control - Content Script
(function () {
  "use strict";

  // Configuration - no 1x in presets (use reset btn)
  const SPEED_PRESETS = [
    0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 4,
  ];
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 16;
  const DEFAULT_SPEED = 1;

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
  let didDrag = false;
  let uiCreated = false;
  let hiddenInThisTab = false;
  let container = null;

  // ============ Site Config ============

  async function getSiteConfig() {
    const { siteConfigs = {} } = await browser.storage.local.get('siteConfigs');
    return siteConfigs[hostname] || null;
  }

  async function setSiteConfig(key, value) {
    const { siteConfigs = {} } = await browser.storage.local.get('siteConfigs');
    siteConfigs[hostname] = siteConfigs[hostname] || {};
    siteConfigs[hostname][key] = value;
    await browser.storage.local.set({ siteConfigs });
  }

  async function getEffectiveSettings() {
    const siteConfig = await getSiteConfig();
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
      if (rect.width > 50 && rect.height > 50) {
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
      container.style.display = (videoExists && !hidden) ? '' : 'none';
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

  // ============ Storage ============

  async function loadSettings() {
    try {
      const settings = await getEffectiveSettings();
      defaultSpeed = settings.defaultSpeed;
      currentSpeed = defaultSpeed;
      applySpeedToAllVideos();
      updateSpeedDisplay();
    } catch (err) {
      console.log("YT Speed: Could not load settings", err);
    }
  }

  async function saveDefaultSpeed(speed) {
    defaultSpeed = speed;
    await setSiteConfig('defaultSpeed', speed);
    // Broadcast to other tabs via background
    browser.runtime.sendMessage({ action: 'broadcastDefaultSpeed', speed, hostname }).catch(() => {});
  }

  // ============ Speed Control ============

  function setSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;
    currentSpeed = speed;
    applySpeedToAllVideos();
    updateSpeedDisplay();
  }

  function applySpeedToAllVideos() {
    document.querySelectorAll("video").forEach((video) => {
      if (video.playbackRate !== currentSpeed) {
        video.playbackRate = currentSpeed;
      }
    });
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

  function createUI() {
    const existingUI = document.getElementById("yt-speed-control");
    if (existingUI) existingUI.remove();

    container = document.createElement("div");
    container.id = "yt-speed-control";
    container.innerHTML = `
      <button id="yt-speed-toggle">${currentSpeed}x</button>
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
          <div class="yt-speed-current" id="yt-speed-display">${currentSpeed}x</div>
          <div class="yt-speed-label">CURRENT SPEED</div>
        </div>
        <div class="yt-speed-slider">
          <input type="range" id="yt-speed-range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="0.05" value="${currentSpeed}">
        </div>
        <div class="yt-speed-presets">
          ${SPEED_PRESETS.map(
            (speed) => `
            <button class="yt-speed-preset ${speed === currentSpeed ? "active" : ""}" data-speed="${speed}">${speed}x</button>
          `,
          ).join("")}
        </div>
        <div class="yt-speed-custom">
          <label>CUSTOM SPEED (${MIN_SPEED}x – ${MAX_SPEED}x)</label>
          <input type="number" id="yt-speed-custom" min="${MIN_SPEED}" max="${MAX_SPEED}" step="0.05" value="${currentSpeed}">
        </div>
        <div class="yt-speed-actions">
          <div class="yt-speed-save-row">
            <button class="yt-speed-action" id="yt-speed-save-site">Save for Site</button>
            <button class="yt-speed-action" id="yt-speed-save-global">Save for All</button>
          </div>
          <button class="yt-speed-action yt-speed-reset" id="yt-speed-reset">Reset to 1x</button>
        </div>
        <div class="yt-speed-info">Current Default Speed: ${defaultSpeed}x (this site)</div>
      </div>
    `;

    document.body.appendChild(container);
    attachUIEventListeners(container);
    loadPosition(container);
    attachDragListeners(container);
  }

  function attachUIEventListeners(cnt) {
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
      browser.runtime.sendMessage({ action: 'openOptions' });
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
      if (!isNaN(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED) {
        setSpeed(speed);
      }
    });

    // Custom speed (Enter key to save for site)
    customInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveSiteBtn.click();
      }
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
      }, 800);
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
      }, 800);
    });

    // Reset button
    resetBtn.addEventListener("click", () => {
      setSpeed(DEFAULT_SPEED);
      saveDefaultSpeed(DEFAULT_SPEED);
      updateSpeedDisplay();
    });

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (uiVisible && !cnt.contains(e.target)) {
        uiVisible = false;
        panel.classList.remove("visible");
      }
    });
  }

  // ============ Drag & Position ============

  function attachDragListeners(container) {
    const toggle = document.getElementById("yt-speed-toggle");

    toggle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      didDrag = false;
      dragOffset.x = e.clientX - container.offsetLeft;
      dragOffset.y = e.clientY - container.offsetTop;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      didDrag = true;
      let x = e.clientX - dragOffset.x;
      let y = e.clientY - dragOffset.y;
      // Bounds check
      x = Math.max(0, Math.min(x, window.innerWidth - container.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - container.offsetHeight));
      container.style.left = x + "px";
      container.style.top = y + "px";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        if (didDrag) savePosition(container);
      }
    });

    window.addEventListener("resize", () => {
      // Snap back if off-screen
      const rect = container.getBoundingClientRect();
      if (rect.right > window.innerWidth || rect.bottom > window.innerHeight || rect.left < 0 || rect.top < 0) {
        const safeX = Math.max(0, Math.min(rect.left, window.innerWidth - container.offsetWidth));
        const safeY = Math.max(0, Math.min(rect.top, window.innerHeight - container.offsetHeight));
        container.style.left = safeX + "px";
        container.style.top = safeY + "px";
        savePosition(container);
      }
    });
  }

  function savePosition(cnt) {
    const rect = cnt.getBoundingClientRect();
    setSiteConfig('panelPosition', { x: rect.left, y: rect.top })
      .catch((err) => console.log("YT Speed: Could not save position", err));
  }

  async function loadPosition(cnt) {
    try {
      const settings = await getEffectiveSettings();
      const { x, y } = settings.panelPosition;
      // Bounds check on load
      const safeX = Math.max(0, Math.min(x, window.innerWidth - 50));
      const safeY = Math.max(0, Math.min(y, window.innerHeight - 50));
      cnt.style.left = safeX + "px";
      cnt.style.top = safeY + "px";
    } catch (err) {
      console.log("YT Speed: Could not load position", err);
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

    // Create button with inline onclick
    const btn = document.createElement("button");
    btn.className = "yt-speed-player-btn ytp-button";
    btn.title = "Playback Speed";
    btn.setAttribute("onclick", "event.stopPropagation(); window.__ytSpeedToggle(); return false;");
    btn.innerHTML = `<span class="yt-speed-player-text">${currentSpeed}x</span>`;

    // Insert at the beginning of right controls
    rightControls.insertBefore(btn, rightControls.firstChild);
  }

  // ============ Video Observer ============

  function observeVideos() {
    const observer = new MutationObserver((mutations) => {
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
        applySpeedToAllVideos();
        maybeShowUI(); // Show UI when video detected
      }
      if (hasPlayerControls && isYouTube) createPlayerControl();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Handle video play events
    document.addEventListener(
      "play",
      (e) => {
        if (e.target.tagName === "VIDEO") {
          e.target.playbackRate = currentSpeed;
        }
      },
      true,
    );

    // Override YouTube's speed reset attempts
    document.addEventListener(
      "ratechange",
      (e) => {
        if (
          e.target.tagName === "VIDEO" &&
          e.target.playbackRate !== currentSpeed
        ) {
          setTimeout(() => (e.target.playbackRate = currentSpeed), 10);
        }
      },
      true,
    );
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
    } else if (message.action === 'getVisibility') {
      (async () => {
        const siteConfig = await getSiteConfig();
        const global = await browser.storage.local.get(['hideGlobal']);
        sendResponse({
          hasVideo: hasVideo(),
          hiddenTab: hiddenInThisTab,
          hiddenSite: siteConfig?.hidden || false,
          hiddenGlobal: global.hideGlobal || false,
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
      setTimeout(init, 100);
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
    setTimeout(setup, 1000);
    setTimeout(setup, 3000);

    console.log("YouTube Speed Control loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
