// YouTube Speed Control - Popup Script
(function() {
  'use strict';

  // Browser API compatibility layer (Chrome uses 'chrome', Firefox uses 'browser')
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  const MIN_SPEED = 0.25;
  const MAX_SPEED = 16;
  const DEFAULT_SPEED = 1;

  let currentDefaultSpeed = DEFAULT_SPEED;

  // DOM Elements
  const currentSpeedDisplay = document.getElementById('current-speed');
  const speedInput = document.getElementById('speed-input');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const statusEl = document.getElementById('status');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Load saved settings
  function loadSettings() {
    browserAPI.storage.local.get(['defaultSpeed']).then((result) => {
      if (result.defaultSpeed) {
        currentDefaultSpeed = result.defaultSpeed;
        updateDisplay();
      }
    }).catch((err) => {
      console.error('Failed to load settings:', err);
    });
  }

  // Save settings
  function saveSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;

    browserAPI.storage.local.set({ defaultSpeed: speed }).then(() => {
      currentDefaultSpeed = speed;
      updateDisplay();
      showStatus('Default speed saved!', 'success');
    }).catch((err) => {
      console.error('Failed to save settings:', err);
      showStatus('Failed to save settings', 'error');
    });
  }

  // Update display
  function updateDisplay() {
    currentSpeedDisplay.textContent = `${currentDefaultSpeed}x`;
    speedInput.value = currentDefaultSpeed;

    // Update preset buttons
    presetBtns.forEach((btn) => {
      const speed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', speed === currentDefaultSpeed);
    });
  }

  // Show status message
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;

    setTimeout(() => {
      statusEl.className = 'status';
    }, 2000);
  }

  // Event Listeners
  saveBtn.addEventListener('click', () => {
    const speed = parseFloat(speedInput.value);
    if (!isNaN(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED) {
      saveSpeed(speed);
    } else {
      showStatus(`Speed must be between ${MIN_SPEED} and ${MAX_SPEED}`, 'error');
    }
  });

  speedInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  resetBtn.addEventListener('click', () => {
    saveSpeed(DEFAULT_SPEED);
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      saveSpeed(speed);
    });
  });

  // Initialize
  loadSettings();
})();
