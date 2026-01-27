// YouTube Speed Control - Popup Script
(function() {
  'use strict';

  const MIN_SPEED = 0.25;
  const MAX_SPEED = 16;
  const DEFAULT_SPEED = 1;

  let currentSpeed = DEFAULT_SPEED;
  let defaultSpeed = DEFAULT_SPEED;

  // DOM Elements
  const currentSpeedDisplay = document.getElementById('current-speed');
  const speedSlider = document.getElementById('speed-slider');
  const speedInput = document.getElementById('speed-input');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const closeBtn = document.getElementById('close-btn');
  const defaultInfo = document.getElementById('default-info');
  const presetBtns = document.querySelectorAll('.yt-speed-preset');

  // Send message to content script
  function sendSpeedToTab(speed) {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(tabs[0].id, { action: 'setSpeed', speed }).catch(() => {
          // Tab might not have content script (not YouTube)
        });
      }
    });
  }

  // Load settings - first try content script, fallback to storage
  function loadSettings() {
    // Try to get current speed from active tab's content script
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(tabs[0].id, { action: 'getSpeed' }).then((response) => {
          if (response) {
            currentSpeed = response.currentSpeed;
            defaultSpeed = response.defaultSpeed;
            updateDisplay();
          }
        }).catch(() => {
          // Not on YouTube, load from storage
          loadFromStorage();
        });
      } else {
        loadFromStorage();
      }
    }).catch(() => {
      loadFromStorage();
    });
  }

  // Fallback to storage
  function loadFromStorage() {
    browser.storage.local.get(['defaultSpeed']).then((result) => {
      if (result.defaultSpeed) {
        defaultSpeed = result.defaultSpeed;
        currentSpeed = defaultSpeed;
      }
      updateDisplay();
    }).catch((err) => {
      console.error('Failed to load settings:', err);
      updateDisplay();
    });
  }

  // Save default speed
  function saveDefault(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;

    browser.storage.local.set({ defaultSpeed: speed }).then(() => {
      defaultSpeed = speed;
      updateDisplay();
      // Notify all tabs
      browser.tabs.query({}).then((tabs) => {
        tabs.forEach((tab) => {
          browser.tabs.sendMessage(tab.id, { action: 'setDefaultSpeed', speed }).catch(() => {});
        });
      });
      // Show saved feedback
      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('saved');
      setTimeout(() => {
        saveBtn.classList.remove('saved');
        updateDisplay();
      }, 800);
    }).catch((err) => {
      console.error('Failed to save settings:', err);
    });
  }

  // Set current speed (updates display and sends to content script)
  function setSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;
    currentSpeed = speed;
    updateDisplay();
    sendSpeedToTab(speed);
  }

  // Update all display elements
  function updateDisplay() {
    currentSpeedDisplay.textContent = `${currentSpeed}x`;
    speedSlider.value = currentSpeed;
    speedInput.value = currentSpeed;
    saveBtn.textContent = `Save ${currentSpeed}x as Default`;
    defaultInfo.textContent = `Current Default Speed: ${defaultSpeed}x`;

    // Update preset buttons
    presetBtns.forEach((btn) => {
      const speed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', speed === currentSpeed);
    });
  }

  // Event Listeners

  // Close button - closes popup
  closeBtn.addEventListener('click', () => {
    window.close();
  });

  // Slider - sync all controls
  speedSlider.addEventListener('input', () => {
    setSpeed(parseFloat(speedSlider.value));
  });

  // Number input - sync all controls
  speedInput.addEventListener('input', () => {
    const speed = parseFloat(speedInput.value);
    if (!isNaN(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED) {
      setSpeed(speed);
    }
  });

  speedInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  // Preset buttons - set speed (not save)
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSpeed(parseFloat(btn.dataset.speed));
    });
  });

  // Save button
  saveBtn.addEventListener('click', () => {
    saveDefault(currentSpeed);
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    setSpeed(DEFAULT_SPEED);
    saveDefault(DEFAULT_SPEED);
  });

  // Initialize
  loadSettings();
})();
