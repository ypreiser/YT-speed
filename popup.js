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
  const saveSiteBtn = document.getElementById('save-site-btn');
  const saveGlobalBtn = document.getElementById('save-global-btn');
  const resetBtn = document.getElementById('reset-btn');
  const closeBtn = document.getElementById('close-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const defaultInfo = document.getElementById('default-info');
  const presetBtns = document.querySelectorAll('.yt-speed-preset');

  // Send message to content script
  function sendSpeedToTab(speed) {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(tabs[0].id, { action: 'setSpeed', speed }).catch(() => {});
      }
    });
  }

  // Load settings - first try content script, fallback to storage
  function loadSettings() {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(tabs[0].id, { action: 'getSpeed' }).then((response) => {
          if (response) {
            currentSpeed = response.currentSpeed;
            defaultSpeed = response.defaultSpeed;
            updateDisplay();
          }
        }).catch(() => {
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

  // Save for this site (sends to content script)
  function saveSiteSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;

    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(tabs[0].id, { action: 'saveDefaultSpeed', speed }).catch(() => {});
      }
    });

    defaultSpeed = speed;
    updateDisplay();
    saveSiteBtn.textContent = 'Saved!';
    saveSiteBtn.classList.add('saved');
    setTimeout(() => {
      saveSiteBtn.classList.remove('saved');
      saveSiteBtn.textContent = 'Save for Site';
    }, 800);
  }

  // Save for all sites (global default)
  function saveGlobalSpeed(speed) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    speed = Math.round(speed * 100) / 100;

    browser.storage.local.set({ defaultSpeed: speed });

    defaultSpeed = speed;
    updateDisplay();
    saveGlobalBtn.textContent = 'Saved!';
    saveGlobalBtn.classList.add('saved');
    setTimeout(() => {
      saveGlobalBtn.classList.remove('saved');
      saveGlobalBtn.textContent = 'Save for All';
    }, 800);
  }

  // Set current speed
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
    defaultInfo.textContent = `Default: ${defaultSpeed}x (this site)`;

    presetBtns.forEach((btn) => {
      const speed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', speed === currentSpeed);
    });
  }

  // Event Listeners
  closeBtn.addEventListener('click', () => window.close());

  settingsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

  speedSlider.addEventListener('input', () => {
    setSpeed(parseFloat(speedSlider.value));
  });

  speedInput.addEventListener('input', () => {
    const speed = parseFloat(speedInput.value);
    if (!isNaN(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED) {
      setSpeed(speed);
    }
  });

  speedInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveSiteBtn.click();
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSpeed(parseFloat(btn.dataset.speed));
    });
  });

  saveSiteBtn.addEventListener('click', () => saveSiteSpeed(currentSpeed));
  saveGlobalBtn.addEventListener('click', () => saveGlobalSpeed(currentSpeed));

  resetBtn.addEventListener('click', () => {
    setSpeed(DEFAULT_SPEED);
    saveSiteSpeed(DEFAULT_SPEED);
  });

  // Initialize
  loadSettings();
})();
