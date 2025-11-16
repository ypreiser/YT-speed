// YouTube Speed Control - Content Script
(function() {
  'use strict';

  // Configuration
  const SPEED_PRESETS = [0.5, 1, 1.25, 1.5, 2, 3, 5, 10, 16];
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 16;
  const DEFAULT_SPEED = 1;

  // State
  let currentSpeed = DEFAULT_SPEED;
  let defaultSpeed = DEFAULT_SPEED;
  let uiVisible = false;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  // Load saved settings
  function loadSettings() {
    browser.storage.local.get(['defaultSpeed']).then((result) => {
      if (result.defaultSpeed) {
        defaultSpeed = result.defaultSpeed;
        currentSpeed = defaultSpeed;
        applySpeedToAllVideos();
        updateSpeedDisplay();
      }
    }).catch((err) => {
      console.log('YT Speed: Could not load settings', err);
    });
  }

  // Save settings
  function saveDefaultSpeed(speed) {
    browser.storage.local.set({ defaultSpeed: speed }).catch((err) => {
      console.log('YT Speed: Could not save settings', err);
    });
  }

  // Apply speed to all video elements
  function applySpeedToAllVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      if (video.playbackRate !== currentSpeed) {
        video.playbackRate = currentSpeed;
      }
    });
  }

  // Create the floating UI
  function createUI() {
    // Remove existing UI if present
    const existingUI = document.getElementById('yt-speed-control');
    if (existingUI) {
      existingUI.remove();
    }

    // Main container
    const container = document.createElement('div');
    container.id = 'yt-speed-control';
    container.innerHTML = `
      <style>
        #yt-speed-control {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          user-select: none;
          -webkit-user-select: none;
        }

        #yt-speed-toggle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #ff0000;
          color: white;
          border: none;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background 0.2s;
          touch-action: none;
        }

        #yt-speed-toggle:hover {
          transform: scale(1.1);
          background: #cc0000;
        }

        #yt-speed-toggle:active {
          transform: scale(0.95);
        }

        #yt-speed-panel {
          display: none;
          position: absolute;
          top: 65px;
          right: 0;
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          min-width: 280px;
          max-width: 320px;
        }

        #yt-speed-panel.visible {
          display: block;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .yt-speed-header {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .yt-speed-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 4px 8px;
          line-height: 1;
        }

        .yt-speed-current {
          font-size: 32px;
          font-weight: bold;
          color: #ff0000;
          text-align: center;
          margin: 16px 0;
        }

        .yt-speed-presets {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .yt-speed-preset {
          padding: 12px 8px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 44px;
        }

        .yt-speed-preset:hover {
          border-color: #ff0000;
          background: #fff5f5;
        }

        .yt-speed-preset:active {
          transform: scale(0.95);
        }

        .yt-speed-preset.active {
          background: #ff0000;
          color: white;
          border-color: #ff0000;
        }

        .yt-speed-custom {
          margin-bottom: 16px;
        }

        .yt-speed-custom label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .yt-speed-custom-input {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .yt-speed-custom input[type="number"] {
          flex: 1;
          padding: 10px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          min-height: 44px;
        }

        .yt-speed-custom input[type="number"]:focus {
          border-color: #ff0000;
          outline: none;
        }

        .yt-speed-apply {
          padding: 10px 16px;
          background: #ff0000;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
        }

        .yt-speed-apply:hover {
          background: #cc0000;
        }

        .yt-speed-default {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }

        .yt-speed-default button {
          width: 100%;
          padding: 12px;
          background: #333;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
        }

        .yt-speed-default button:hover {
          background: #555;
        }

        .yt-speed-info {
          font-size: 12px;
          color: #888;
          text-align: center;
          margin-top: 8px;
        }

        .yt-speed-slider {
          margin: 16px 0;
        }

        .yt-speed-slider input[type="range"] {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: #ddd;
          outline: none;
          -webkit-appearance: none;
        }

        .yt-speed-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ff0000;
          cursor: pointer;
        }

        .yt-speed-slider input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ff0000;
          cursor: pointer;
          border: none;
        }
      </style>

      <button id="yt-speed-toggle">${currentSpeed}x</button>

      <div id="yt-speed-panel">
        <div class="yt-speed-header">
          <span>Speed Control</span>
          <button class="yt-speed-close">&times;</button>
        </div>

        <div class="yt-speed-current" id="yt-speed-display">${currentSpeed}x</div>

        <div class="yt-speed-slider">
          <input type="range" id="yt-speed-range" min="0.25" max="16" step="0.25" value="${currentSpeed}">
        </div>

        <div class="yt-speed-presets" id="yt-speed-presets">
          ${SPEED_PRESETS.map(speed => `
            <button class="yt-speed-preset ${speed === currentSpeed ? 'active' : ''}" data-speed="${speed}">
              ${speed}x
            </button>
          `).join('')}
        </div>

        <div class="yt-speed-custom">
          <label>Custom Speed (${MIN_SPEED} - ${MAX_SPEED})</label>
          <div class="yt-speed-custom-input">
            <input type="number" id="yt-speed-custom" min="${MIN_SPEED}" max="${MAX_SPEED}" step="0.25" value="${currentSpeed}">
            <button class="yt-speed-apply" id="yt-speed-apply-custom">Set</button>
          </div>
        </div>

        <div class="yt-speed-default">
          <button id="yt-speed-save-default">Save ${currentSpeed}x as Default</button>
        </div>

        <div class="yt-speed-info">
          Default: ${defaultSpeed}x
        </div>
      </div>
    `;

    document.body.appendChild(container);
    attachEventListeners();
  }

  // Update the speed display
  function updateSpeedDisplay() {
    const toggle = document.getElementById('yt-speed-toggle');
    const display = document.getElementById('yt-speed-display');
    const customInput = document.getElementById('yt-speed-custom');
    const rangeInput = document.getElementById('yt-speed-range');
    const saveBtn = document.getElementById('yt-speed-save-default');
    const infoText = document.querySelector('.yt-speed-info');

    if (toggle) toggle.textContent = `${currentSpeed}x`;
    if (display) display.textContent = `${currentSpeed}x`;
    if (customInput) customInput.value = currentSpeed;
    if (rangeInput) rangeInput.value = currentSpeed;
    if (saveBtn) saveBtn.textContent = `Save ${currentSpeed}x as Default`;
    if (infoText) infoText.textContent = `Default: ${defaultSpeed}x`;

    // Update preset buttons
    const presets = document.querySelectorAll('.yt-speed-preset');
    presets.forEach((btn) => {
      const speed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', speed === currentSpeed);
    });
  }

  // Set playback speed
  function setSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100; // Round to 2 decimal places
    currentSpeed = speed;
    applySpeedToAllVideos();
    updateSpeedDisplay();
  }

  // Attach event listeners
  function attachEventListeners() {
    const toggle = document.getElementById('yt-speed-toggle');
    const panel = document.getElementById('yt-speed-panel');
    const closeBtn = document.querySelector('.yt-speed-close');
    const presets = document.querySelectorAll('.yt-speed-preset');
    const customInput = document.getElementById('yt-speed-custom');
    const applyCustom = document.getElementById('yt-speed-apply-custom');
    const saveDefault = document.getElementById('yt-speed-save-default');
    const rangeInput = document.getElementById('yt-speed-range');
    const container = document.getElementById('yt-speed-control');

    // Toggle panel
    toggle.addEventListener('click', (e) => {
      if (!isDragging) {
        uiVisible = !uiVisible;
        panel.classList.toggle('visible', uiVisible);
      }
    });

    // Close panel
    closeBtn.addEventListener('click', () => {
      uiVisible = false;
      panel.classList.remove('visible');
    });

    // Preset buttons
    presets.forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        setSpeed(speed);
      });
    });

    // Range slider
    rangeInput.addEventListener('input', (e) => {
      setSpeed(parseFloat(e.target.value));
    });

    // Custom speed
    applyCustom.addEventListener('click', () => {
      const speed = parseFloat(customInput.value);
      if (!isNaN(speed)) {
        setSpeed(speed);
      }
    });

    customInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const speed = parseFloat(customInput.value);
        if (!isNaN(speed)) {
          setSpeed(speed);
        }
      }
    });

    // Save as default
    saveDefault.addEventListener('click', () => {
      defaultSpeed = currentSpeed;
      saveDefaultSpeed(defaultSpeed);
      updateSpeedDisplay();

      // Visual feedback
      saveDefault.textContent = 'Saved!';
      setTimeout(() => {
        saveDefault.textContent = `Save ${currentSpeed}x as Default`;
      }, 1500);
    });

    // Draggable toggle button
    let startX, startY, startLeft, startTop;

    toggle.addEventListener('mousedown', startDrag);
    toggle.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
      if (e.type === 'touchstart') {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }

      const rect = container.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      isDragging = false;

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', drag, { passive: false });
      document.addEventListener('touchend', stopDrag);
    }

    function drag(e) {
      e.preventDefault();
      let clientX, clientY;

      if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      // Only start dragging if moved more than 5px
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isDragging = true;
      }

      if (isDragging) {
        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;

        container.style.right = 'auto';
        container.style.left = `${newLeft}px`;
        container.style.top = `${newTop}px`;
      }
    }

    function stopDrag() {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('touchend', stopDrag);

      // Reset isDragging after a short delay to allow click event
      setTimeout(() => {
        isDragging = false;
      }, 100);
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (uiVisible && !container.contains(e.target)) {
        uiVisible = false;
        panel.classList.remove('visible');
      }
    });
  }

  // Watch for new video elements
  function observeVideos() {
    const observer = new MutationObserver((mutations) => {
      let hasNewVideo = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
            hasNewVideo = true;
          }
        });
      });

      if (hasNewVideo) {
        applySpeedToAllVideos();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also watch for video playback changes
    document.addEventListener('play', (e) => {
      if (e.target.tagName === 'VIDEO') {
        e.target.playbackRate = currentSpeed;
      }
    }, true);

    // Handle YouTube's speed reset attempts
    document.addEventListener('ratechange', (e) => {
      if (e.target.tagName === 'VIDEO' && e.target.playbackRate !== currentSpeed) {
        // Small delay to let YouTube's change complete, then override
        setTimeout(() => {
          e.target.playbackRate = currentSpeed;
        }, 10);
      }
    }, true);
  }

  // Initialize
  function init() {
    // Wait for body to be available
    if (!document.body) {
      setTimeout(init, 100);
      return;
    }

    loadSettings();
    createUI();
    observeVideos();

    // Apply speed to existing videos
    setTimeout(applySpeedToAllVideos, 500);
    setTimeout(applySpeedToAllVideos, 1500);
    setTimeout(applySpeedToAllVideos, 3000);

    console.log('YouTube Speed Control loaded');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
