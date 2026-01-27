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
    defaultSpeed = speed;
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
      elements.infoText.textContent = `Current Default Speed: ${defaultSpeed}x`;
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
      <button id="yt-speed-toggle">${currentSpeed}x</button>
      <div id="yt-speed-panel">
        <div class="yt-speed-header">
          <span>PLAYBACK SPEED</span>
          <button class="yt-speed-close">×</button>
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
          <button class="yt-speed-action" id="yt-speed-save-default">Save ${currentSpeed}x as Default</button>
          <button class="yt-speed-action yt-speed-reset" id="yt-speed-reset">Reset to 1x</button>
        </div>
        <div class="yt-speed-info">Current Default Speed: ${defaultSpeed}x</div>
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
    const resetBtn = document.getElementById("yt-speed-reset");
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

    // Custom speed - sync on input
    customInput.addEventListener("input", () => {
      const speed = parseFloat(customInput.value);
      if (!isNaN(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED) {
        setSpeed(speed);
      }
    });

    // Custom speed (Enter key to save as default)
    customInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveDefault.click();
      }
    });

    // Save as default
    saveDefault.addEventListener("click", () => {
      saveDefaultSpeed(currentSpeed);
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

    // Reset button
    resetBtn.addEventListener("click", () => {
      setSpeed(DEFAULT_SPEED);
      saveDefaultSpeed(DEFAULT_SPEED);
      updateSpeedDisplay();
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

      if (hasNewVideo) applySpeedToAllVideos();
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
    } else if (message.action === 'getSpeed') {
      sendResponse({ currentSpeed, defaultSpeed });
    }
  });

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
