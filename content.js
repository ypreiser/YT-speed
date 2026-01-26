// YouTube Speed Control - Content Script
(function () {
  "use strict";

  // Configuration
  const SPEED_PRESETS = [
    0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 4,
  ];
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 16;
  const DEFAULT_SPEED = 1;

  // State
  let currentSpeed = DEFAULT_SPEED;
  let defaultSpeed = DEFAULT_SPEED;
  let uiVisible = false;
  let playerControlInjected = false;

  // ============ Storage ============

  function loadSettings() {
    browser.storage.local
      .get(["defaultSpeed"])
      .then((result) => {
        if (result.defaultSpeed) {
          defaultSpeed = result.defaultSpeed;
          currentSpeed = defaultSpeed;
          applySpeedToAllVideos();
          updateSpeedDisplay();
        }
      })
      .catch((err) => console.log("YT Speed: Could not load settings", err));
  }

  function saveDefaultSpeed(speed) {
    browser.storage.local
      .set({ defaultSpeed: speed })
      .catch((err) => console.log("YT Speed: Could not save settings", err));
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
      saveBtn: document.getElementById("yt-speed-save-default"),
      infoText: document.querySelector(".yt-speed-info"),
      playerText: document.querySelector(".yt-speed-player-text"),
    };

    if (elements.toggle) elements.toggle.textContent = `${currentSpeed}x`;
    if (elements.display) elements.display.textContent = `${currentSpeed}x`;
    if (elements.customInput) elements.customInput.value = currentSpeed;
    if (elements.rangeInput) elements.rangeInput.value = currentSpeed;
    if (elements.saveBtn)
      elements.saveBtn.textContent = `Save ${currentSpeed}x as Default`;
    if (elements.infoText)
      elements.infoText.textContent = `Default: ${defaultSpeed}x`;
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

    const container = document.createElement("div");
    container.id = "yt-speed-control";
    container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');

        #yt-speed-control {
          --yt-bg-primary: rgba(24, 24, 27, 0.95);
          --yt-bg-secondary: rgba(39, 39, 42, 0.9);
          --yt-bg-hover: rgba(63, 63, 70, 0.8);
          --yt-border: rgba(63, 63, 70, 0.6);
          --yt-text-primary: #fafafa;
          --yt-text-secondary: #a1a1aa;
          --yt-text-muted: #71717a;
          --yt-accent: #ff0000;
          --yt-accent-glow: rgba(255, 0, 0, 0.4);
          --yt-success: #22c55e;

          position: fixed;
          top: 8px;
          left: 170px;
          z-index: 999999;
          font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
          user-select: none;
          -webkit-font-smoothing: antialiased;
        }

        #yt-speed-toggle {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--yt-bg-primary);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: var(--yt-text-primary);
          border: 1px solid var(--yt-border);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.01em;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          position: relative;
          overflow: hidden;
        }

        #yt-speed-toggle:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          border-color: var(--yt-accent);
        }

        #yt-speed-toggle:active {
          transform: scale(0.96);
        }

        #yt-speed-panel {
          display: none;
          position: absolute;
          top: 50px;
          left: 0;
          background: var(--yt-bg-primary);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 20px;
          padding: 20px;
          border: 1px solid var(--yt-border);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          min-width: 300px;
          transform-origin: top left;
        }

        #yt-speed-panel.visible {
          display: block;
          animation: yt-speed-panel-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes yt-speed-panel-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .yt-speed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--yt-border);
        }

        .yt-speed-header span {
          font-size: 13px;
          font-weight: 600;
          color: var(--yt-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .yt-speed-close {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--yt-bg-secondary);
          border: 1px solid var(--yt-border);
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          color: var(--yt-text-secondary);
          transition: all 0.15s ease;
        }

        .yt-speed-close:hover {
          background: var(--yt-bg-hover);
          color: var(--yt-text-primary);
        }

        .yt-speed-display-container {
          text-align: center;
          margin-bottom: 20px;
        }

        .yt-speed-current {
          font-size: 56px;
          font-weight: 700;
          color: var(--yt-text-primary);
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 4px;
          background: linear-gradient(180deg, #fff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .yt-speed-label {
          font-size: 11px;
          color: var(--yt-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .yt-speed-slider {
          margin-bottom: 20px;
          padding: 0 4px;
        }

        .yt-speed-slider input[type="range"] {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--yt-bg-secondary);
          outline: none;
          -webkit-appearance: none;
          cursor: pointer;
        }

        .yt-speed-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--yt-text-primary);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: all 0.15s ease;
        }

        .yt-speed-slider input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5), 0 0 0 4px var(--yt-accent-glow);
        }

        .yt-speed-slider input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--yt-text-primary);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .yt-speed-presets {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-bottom: 16px;
        }

        .yt-speed-preset {
          padding: 10px 4px;
          border: 1px solid var(--yt-border);
          border-radius: 10px;
          background: var(--yt-bg-secondary);
          font-size: 12px;
          font-weight: 500;
          color: var(--yt-text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .yt-speed-preset:hover {
          background: var(--yt-bg-hover);
          color: var(--yt-text-primary);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .yt-speed-preset:active {
          transform: scale(0.96);
        }

        .yt-speed-preset.active {
          background: var(--yt-accent);
          color: white;
          border-color: var(--yt-accent);
          box-shadow: 0 0 16px var(--yt-accent-glow);
        }

        .yt-speed-custom {
          margin-bottom: 16px;
        }

        .yt-speed-custom label {
          display: block;
          font-size: 11px;
          color: var(--yt-text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .yt-speed-custom input[type="number"] {
          width: 90%;
          padding: 12px 14px;
          border: 1px solid var(--yt-border);
          border-radius: 10px;
          background: var(--yt-bg-secondary);
          color: var(--yt-text-primary);
          font-size: 14px;
          font-family: inherit;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .yt-speed-custom input[type="number"]:focus {
          border-color: var(--yt-accent);
          outline: none;
          box-shadow: 0 0 0 3px var(--yt-accent-glow);
        }

        .yt-speed-custom input[type="number"]::-webkit-inner-spin-button,
        .yt-speed-custom input[type="number"]::-webkit-outer-spin-button {
          opacity: 0.5;
        }

        .yt-speed-default {
          padding-top: 16px;
          border-top: 1px solid var(--yt-border);
        }

        .yt-speed-default button {
          width: 100%;
          padding: 14px;
          background: var(--yt-bg-secondary);
          color: var(--yt-text-primary);
          border: 1px solid var(--yt-border);
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .yt-speed-default button:hover {
          background: var(--yt-bg-hover);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .yt-speed-default button:active {
          transform: scale(0.99);
        }

        .yt-speed-default button.saved {
          background: var(--yt-success);
          border-color: var(--yt-success);
          color: white;
        }

        .yt-speed-info {
          font-size: 11px;
          color: var(--yt-text-muted);
          text-align: center;
          margin-top: 12px;
        }
      </style>
      <button id="yt-speed-toggle">${currentSpeed}x</button>
      <div id="yt-speed-panel">
        <div class="yt-speed-header">
          <span>Playback Speed</span>
          <button class="yt-speed-close">×</button>
        </div>
        <div class="yt-speed-display-container">
          <div class="yt-speed-current" id="yt-speed-display">${currentSpeed}x</div>
          <div class="yt-speed-label">Current Speed</div>
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
          <label>Custom Speed (${MIN_SPEED}x – ${MAX_SPEED}x) – Press Enter</label>
          <input type="number" id="yt-speed-custom" min="${MIN_SPEED}" max="${MAX_SPEED}" step="0.1" value="${currentSpeed}">
        </div>
        <div class="yt-speed-default">
          <button id="yt-speed-save-default">Save ${currentSpeed}x as Default</button>
        </div>
        <div class="yt-speed-info">Default: ${defaultSpeed}x</div>
      </div>
    `;

    document.body.appendChild(container);
    attachUIEventListeners(container);
  }

  function attachUIEventListeners(container) {
    const toggle = document.getElementById("yt-speed-toggle");
    const panel = document.getElementById("yt-speed-panel");
    const closeBtn = document.querySelector(".yt-speed-close");
    const customInput = document.getElementById("yt-speed-custom");
    const saveDefault = document.getElementById("yt-speed-save-default");
    const rangeInput = document.getElementById("yt-speed-range");

    // Toggle panel
    toggle.addEventListener("click", () => {
      uiVisible = !uiVisible;
      panel.classList.toggle("visible", uiVisible);
    });

    // Close panel
    closeBtn.addEventListener("click", () => {
      uiVisible = false;
      panel.classList.remove("visible");
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

    // Custom speed (Enter key)
    customInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const speed = parseFloat(customInput.value);
        if (!isNaN(speed)) setSpeed(speed);
      }
    });

    // Save as default
    saveDefault.addEventListener("click", () => {
      defaultSpeed = currentSpeed;
      saveDefaultSpeed(defaultSpeed);
      updateSpeedDisplay();
      saveDefault.textContent = "Saved!";
      saveDefault.classList.add("saved");
      setTimeout(() => {
        uiVisible = false;
        panel.classList.remove("visible");
        saveDefault.textContent = `Save ${currentSpeed}x as Default`;
        saveDefault.classList.remove("saved");
      }, 800);
    });

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (uiVisible && !container.contains(e.target)) {
        uiVisible = false;
        panel.classList.remove("visible");
      }
    });
  }

  // ============ Player Control Button ============

  function togglePanel() {
    const panel = document.getElementById("yt-speed-panel");
    if (panel) {
      uiVisible = !uiVisible;
      panel.classList.toggle("visible", uiVisible);
    }
  }

  function createPlayerControl() {
    if (document.querySelector(".yt-speed-player-btn")) return;

    const rightControls = document.querySelector(".ytp-right-controls");
    if (!rightControls) return;

    // Inject styles once
    if (!document.getElementById("yt-speed-player-styles")) {
      const style = document.createElement("style");
      style.id = "yt-speed-player-styles";
      style.textContent = `
        .yt-speed-player-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          min-width: 40px !important;
          height: 100% !important;
          padding: 0 8px !important;
          margin: 0 !important;
          color: white !important;
          background: transparent !important;
          border: none !important;
          opacity: 0.9;
          cursor: pointer !important;
          user-select: none;
          position: relative;
          z-index: 100;
        }
        .yt-speed-player-btn:hover { opacity: 1; }
        .yt-speed-player-text {
          font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
        }
      `;
      document.head.appendChild(style);
    }

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

      if (hasNewVideo) applySpeedToAllVideos();
      if (hasPlayerControls) createPlayerControl();
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

  // ============ Initialization ============

  function init() {
    if (!document.body) {
      setTimeout(init, 100);
      return;
    }

    loadSettings();
    createUI();
    observeVideos();

    // Initial setup with retries
    const setup = () => {
      applySpeedToAllVideos();
      createPlayerControl();
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
