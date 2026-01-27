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
      .catch(() => {});
  }

  function saveDefaultSpeed(speed) {
    browser.storage.local.set({ defaultSpeed: speed }).catch(() => {});
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

  function el(tag, attrs, children) {
    const element = document.createElement(tag);
    if (attrs) {
      for (const [key, val] of Object.entries(attrs)) {
        if (key === "className") element.className = val;
        else if (key === "textContent") element.textContent = val;
        else element.setAttribute(key, val);
      }
    }
    if (children) {
      for (const child of Array.isArray(children) ? children : [children]) {
        if (typeof child === "string") element.appendChild(document.createTextNode(child));
        else if (child) element.appendChild(child);
      }
    }
    return element;
  }

  function createUI() {
    const existingUI = document.getElementById("yt-speed-control");
    if (existingUI) existingUI.remove();

    const presetButtons = SPEED_PRESETS.map((speed) =>
      el("button", {
        className: `yt-speed-preset ${speed === currentSpeed ? "active" : ""}`,
        "data-speed": speed,
        textContent: `${speed}x`,
      })
    );

    const container = el("div", { id: "yt-speed-control" }, [
      el("button", { id: "yt-speed-toggle", textContent: `${currentSpeed}x` }),
      el("div", { id: "yt-speed-panel" }, [
        el("div", { className: "yt-speed-header" }, [
          el("span", { textContent: "Playback Speed" }),
          el("button", { className: "yt-speed-close", textContent: "×" }),
        ]),
        el("div", { className: "yt-speed-display-container" }, [
          el("div", { className: "yt-speed-current", id: "yt-speed-display", textContent: `${currentSpeed}x` }),
          el("div", { className: "yt-speed-label", textContent: "Current Speed" }),
        ]),
        el("div", { className: "yt-speed-slider" }, [
          el("input", { type: "range", id: "yt-speed-range", min: MIN_SPEED, max: MAX_SPEED, step: "0.05", value: currentSpeed }),
        ]),
        el("div", { className: "yt-speed-presets" }, presetButtons),
        el("div", { className: "yt-speed-custom" }, [
          el("label", { textContent: `Custom Speed (${MIN_SPEED}x – ${MAX_SPEED}x) – Press Enter` }),
          el("input", { type: "number", id: "yt-speed-custom", min: MIN_SPEED, max: MAX_SPEED, step: "0.05", value: currentSpeed }),
        ]),
        el("div", { className: "yt-speed-default" }, [
          el("button", { id: "yt-speed-save-default", textContent: `Save ${currentSpeed}x as Default` }),
        ]),
        el("div", { className: "yt-speed-info", textContent: `Current Default Speed: ${defaultSpeed}x` }),
      ]),
    ]);

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
    btn.setAttribute(
      "onclick",
      "event.stopPropagation(); window.__ytSpeedToggle(); return false;",
    );
    const span = document.createElement("span");
    span.className = "yt-speed-player-text";
    span.textContent = `${currentSpeed}x`;
    btn.appendChild(span);

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
