/**
 * Test helpers for YouTube Speed Control extension
 * Uses web-ext to launch Firefox with extension, Selenium for automation
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

// Get geckodriver path - download if needed (must use execSync to avoid Jest dynamic import issues)
let geckodriverPath;
try {
  geckodriverPath = execSync(
    'node -e "require(\'geckodriver\').download().then(p => process.stdout.write(p))"',
    { encoding: 'utf8', timeout: 60000 }
  ).trim();
} catch (e) {
  console.warn('Failed to get geckodriver path:', e.message);
}

// Extension source path
const EXTENSION_DIR = path.resolve(__dirname, '..');

// Find .xpi file or use directory based on TEST_MODE env var
function getExtensionPath() {
  const mode = process.env.TEST_MODE;

  if (mode === 'source') {
    return EXTENSION_DIR;
  }

  const files = fs.readdirSync(EXTENSION_DIR);
  const xpi = files.find(f => f.endsWith('.xpi'));

  if (mode === 'xpi') {
    if (!xpi) throw new Error('No .xpi file found. Run build first.');
    return path.join(EXTENSION_DIR, xpi);
  }

  // Default: prefer xpi, fallback to source
  return xpi ? path.join(EXTENSION_DIR, xpi) : EXTENSION_DIR;
}

const EXTENSION_PATH = getExtensionPath();
console.log('TEST_MODE:', process.env.TEST_MODE);
console.log('EXTENSION_PATH:', EXTENSION_PATH);

// Test URLs
const TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // First YouTube video ever
  vimeo: 'https://vimeo.com/347119375', // Public test video
  twitch: 'https://www.twitch.tv/videos/2231706716', // Public VOD
  noVideo: 'https://example.com',
};

// Element selectors
const SELECTORS = {
  container: '#yt-speed-control',
  toggleBtn: '#yt-speed-toggle',
  panel: '#yt-speed-panel',
  speedDisplay: '#yt-speed-display',
  rangeSlider: '#yt-speed-range',
  customInput: '#yt-speed-custom',
  saveSiteBtn: '#yt-speed-save-site',
  saveGlobalBtn: '#yt-speed-save-global',
  resetBtn: '#yt-speed-reset',
  closeBtn: '.yt-speed-close',
  presetBtns: '.yt-speed-preset',
  settingsBtn: '.yt-speed-settings',
  hideToggle: '.yt-speed-hide-toggle',
  hideMenu: '.yt-speed-hide-menu',
};

// Helper class for browser automation
class ExtensionHelper {
  constructor() {
    this.driver = null;
    this.webExtProcess = null;
  }

  /**
   * Launch Firefox with extension loaded via web-ext
   */
  async launch() {
    // Create Firefox options
    const options = new firefox.Options();

    // Set Firefox binary path if not in PATH
    const firefoxPaths = [
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
      '/usr/bin/firefox',
      '/Applications/Firefox.app/Contents/MacOS/firefox',
    ];
    for (const fp of firefoxPaths) {
      if (fs.existsSync(fp)) {
        options.setBinary(fp);
        break;
      }
    }

    // For CI, run headless
    if (process.env.CI || process.env.HEADLESS) {
      options.addArguments('-headless');
    }

    // Build driver with explicit geckodriver path
    const service = new firefox.ServiceBuilder(geckodriverPath);
    this.driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .setFirefoxService(service)
      .build();

    // Load extension as temporary add-on
    await this.loadExtension();

    // Set reasonable timeouts
    await this.driver.manage().setTimeouts({
      implicit: 5000,
      pageLoad: 30000,
      script: 10000,
    });

    return this.driver;
  }

  /**
   * Load extension into Firefox as temporary add-on
   */
  async loadExtension() {
    try {
      // Install extension as temporary add-on
      // This works with unsigned extensions in Firefox
      console.log('Installing addon from:', EXTENSION_PATH);
      await this.driver.installAddon(EXTENSION_PATH, true);
      console.log('Addon installed successfully');
    } catch (e) {
      // Extension load failed - tests will fail to find UI elements
      console.error('Extension load failed:', e.message);
      this.extensionLoadError = e.message;
    }
  }

  /**
   * Navigate to URL and wait for page load
   */
  async navigate(url) {
    await this.driver.get(url);
    await this.driver.wait(until.urlContains(new URL(url).hostname), 10000);
    // Wait extra for dynamic content
    await this.sleep(2000);
  }

  /**
   * Wait for extension UI to appear
   */
  async waitForExtensionUI(timeout = 15000) {
    try {
      await this.driver.wait(
        until.elementLocated(By.css(SELECTORS.container)),
        timeout
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if extension UI is visible
   */
  async isUIVisible() {
    try {
      const container = await this.driver.findElement(By.css(SELECTORS.container));
      return await container.isDisplayed();
    } catch (e) {
      return false;
    }
  }

  /**
   * Open the speed panel
   */
  async openPanel() {
    // Use JS click to avoid scroll/visibility issues
    await this.driver.executeScript(`document.querySelector('${SELECTORS.toggleBtn}').click()`);
    await this.sleep(300);
  }

  /**
   * Close the speed panel
   */
  async closePanel() {
    // Use JS click to avoid scroll/visibility issues
    await this.driver.executeScript(`document.querySelector('${SELECTORS.closeBtn}').click()`);
    await this.sleep(300);
  }

  /**
   * Get video playback rate
   */
  async getPlaybackRate() {
    const rate = await this.driver.executeScript(() => {
      const video = document.querySelector('video');
      return video ? video.playbackRate : null;
    });
    return rate;
  }

  /**
   * Get displayed speed from toggle button
   */
  async getDisplayedSpeed() {
    const toggle = await this.driver.findElement(By.css(SELECTORS.toggleBtn));
    const text = await toggle.getText();
    return parseFloat(text.replace('x', ''));
  }

  /**
   * Set speed via slider
   */
  async setSpeedViaSlider(speed) {
    await this.openPanel();
    const slider = await this.driver.findElement(By.css(SELECTORS.rangeSlider));

    // Scroll into view
    await this.driver.executeScript('arguments[0].scrollIntoView({block: "center"})', slider);
    await this.sleep(100);

    // Use JavaScript to set the value directly and trigger input event
    await this.driver.executeScript(`
      arguments[0].value = ${speed};
      arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
    `, slider);

    await this.sleep(200);
  }

  /**
   * Set speed via custom input
   */
  async setSpeedViaInput(speed) {
    await this.openPanel();
    const input = await this.driver.findElement(By.css(SELECTORS.customInput));

    // Scroll into view
    await this.driver.executeScript('arguments[0].scrollIntoView({block: "center"})', input);
    await this.sleep(100);

    // Use JavaScript to set value and trigger input event
    await this.driver.executeScript(`
      arguments[0].value = ${speed};
      arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
    `, input);

    await this.sleep(200);
  }

  /**
   * Click a preset button
   */
  async clickPreset(speed) {
    await this.openPanel();
    // Use JS click to avoid scroll issues
    await this.driver.executeScript(`
      document.querySelector('${SELECTORS.presetBtns}[data-speed="${speed}"]').click();
    `);
    await this.sleep(200);
  }

  /**
   * Click Save for Site button
   */
  async clickSaveForSite() {
    // Use JS click to avoid scroll/visibility issues
    await this.driver.executeScript(`document.querySelector('${SELECTORS.saveSiteBtn}').click()`);
    await this.sleep(1000); // Wait for save animation
  }

  /**
   * Click Save for All button
   */
  async clickSaveForAll() {
    // Use JS click to avoid scroll/visibility issues
    await this.driver.executeScript(`document.querySelector('${SELECTORS.saveGlobalBtn}').click()`);
    await this.sleep(1000);
  }

  /**
   * Click Reset to 1x button
   */
  async clickReset() {
    // Use JS click to avoid scroll/visibility issues
    await this.driver.executeScript(`document.querySelector('${SELECTORS.resetBtn}').click()`);
    await this.sleep(200);
  }

  /**
   * Drag the panel to new position
   */
  async dragPanel(deltaX, deltaY) {
    const toggle = await this.driver.findElement(By.css(SELECTORS.toggleBtn));

    const actions = this.driver.actions({ async: true });
    await actions
      .move({ origin: toggle })
      .press()
      .move({ origin: toggle, x: deltaX, y: deltaY })
      .release()
      .perform();

    await this.sleep(300);
  }

  /**
   * Get panel position
   */
  async getPanelPosition() {
    const container = await this.driver.findElement(By.css(SELECTORS.container));
    const rect = await container.getRect();
    return { x: rect.x, y: rect.y };
  }

  /**
   * Open options page
   */
  async openOptionsPage() {
    // Get extension ID and construct options URL
    // For web-ext, the ID is typically in manifest
    const optionsUrl = `moz-extension://*/options.html`;

    // Alternative: Click settings button if panel is open
    try {
      await this.openPanel();
      // Use JS click to avoid scroll/visibility issues
      await this.driver.executeScript(`document.querySelector('${SELECTORS.settingsBtn}').click()`);
      await this.sleep(1000);

      // Switch to new tab
      const handles = await this.driver.getAllWindowHandles();
      if (handles.length > 1) {
        await this.driver.switchTo().window(handles[handles.length - 1]);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get storage data via browser console
   */
  async getStorageData() {
    // This requires extension context access
    // For testing, we verify behavior rather than direct storage access
    return null;
  }

  /**
   * Sleep for ms
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set viewport size (for mobile testing)
   */
  async setViewport(width, height) {
    await this.driver.manage().window().setRect({ width, height });
    await this.sleep(300);
  }

  /**
   * Get viewport size
   */
  async getViewport() {
    const { width, height } = await this.driver.manage().window().getRect();
    return { width, height };
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(name) {
    const screenshot = await this.driver.takeScreenshot();
    const dir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(path.join(dir, `${name}.png`), screenshot, 'base64');
  }

  /**
   * Close browser
   */
  async close() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
    if (this.webExtProcess) {
      this.webExtProcess.kill();
      this.webExtProcess = null;
    }
  }
}

/**
 * Alternative: Launch browser via web-ext run command
 * Returns Firefox profile path for Selenium to connect
 */
async function launchWithWebExt() {
  return new Promise((resolve, reject) => {
    const webExt = spawn('npx', [
      'web-ext', 'run',
      '--source-dir', EXTENSION_PATH,
      '--no-reload',
      '--verbose'
    ], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    webExt.stderr.on('data', (data) => {
      stderr += data.toString();
      // Look for Firefox launch message
      if (data.toString().includes('Firefox launched')) {
        resolve(webExt);
      }
    });

    webExt.on('error', reject);

    // Timeout after 30s
    setTimeout(() => {
      if (!webExt.killed) {
        reject(new Error('web-ext launch timeout'));
      }
    }, 30000);
  });
}

module.exports = {
  ExtensionHelper,
  launchWithWebExt,
  TEST_URLS,
  SELECTORS,
  EXTENSION_PATH,
};
