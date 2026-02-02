#!/usr/bin/env node

/**
 * Manifest validation script for YouTube Speed Control extension
 * Validates both Firefox (MV2) and Chrome (MV3) manifests
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const REQUIRED_FILES = ['content.js', 'content.css', 'popup.html', 'popup.js', 'popup.css'];

let hasErrors = false;

function error(message) {
  console.error(`❌ ERROR: ${message}`);
  hasErrors = true;
}

function success(message) {
  console.log(`✅ ${message}`);
}

function warn(message) {
  console.log(`⚠️  WARNING: ${message}`);
}

function validateManifest(filename, expectedVersion) {
  const filepath = path.join(ROOT_DIR, filename);

  console.log(`\n📋 Validating ${filename}...`);

  // Check file exists
  if (!fs.existsSync(filepath)) {
    error(`${filename} not found`);
    return;
  }

  // Parse JSON
  let manifest;
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    manifest = JSON.parse(content);
    success('Valid JSON syntax');
  } catch (e) {
    error(`Invalid JSON: ${e.message}`);
    return;
  }

  // Check manifest version
  if (manifest.manifest_version !== expectedVersion) {
    error(`Expected manifest_version ${expectedVersion}, got ${manifest.manifest_version}`);
  } else {
    success(`Manifest version: ${manifest.manifest_version}`);
  }

  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'permissions'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      error(`Missing required field: ${field}`);
    }
  }

  // Check permissions
  if (!manifest.permissions.includes('storage')) {
    error('Missing "storage" permission');
  } else {
    success('Has storage permission');
  }

  // Check content scripts
  if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
    error('Missing content_scripts');
  } else {
    const cs = manifest.content_scripts[0];

    // Check matches patterns
    if (!cs.matches || cs.matches.length === 0) {
      error('Content script missing matches patterns');
    } else if (!cs.matches.some(m => m.includes('youtube.com'))) {
      error('Content script should match youtube.com');
    } else {
      success('Content script matches YouTube');
    }

    // Check referenced files exist
    const files = [...(cs.js || []), ...(cs.css || [])];
    for (const file of files) {
      if (!fs.existsSync(path.join(ROOT_DIR, file))) {
        error(`Referenced file not found: ${file}`);
      }
    }
  }

  // Check icons
  if (manifest.icons) {
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      if (!fs.existsSync(path.join(ROOT_DIR, iconPath))) {
        error(`Icon not found: ${iconPath}`);
      }
    }
    success('Icons exist');
  }

  // Check browser action / action
  const actionKey = expectedVersion === 2 ? 'browser_action' : 'action';
  if (!manifest[actionKey]) {
    warn(`Missing ${actionKey} (popup won't work)`);
  } else {
    const action = manifest[actionKey];
    if (action.default_popup && !fs.existsSync(path.join(ROOT_DIR, action.default_popup))) {
      error(`Popup file not found: ${action.default_popup}`);
    } else {
      success('Popup configuration valid');
    }
  }

  // MV2-specific checks
  if (expectedVersion === 2) {
    if (manifest.browser_specific_settings?.gecko?.id) {
      success('Has Firefox extension ID');
    } else {
      warn('Missing Firefox extension ID (required for AMO submission)');
    }
  }

  // MV3-specific checks
  if (expectedVersion === 3) {
    if (manifest.host_permissions) {
      success('Has host_permissions for MV3');
    }
  }

  success(`${filename} validation complete`);
}

function validateSharedFiles() {
  console.log('\n📁 Validating shared files...');

  for (const file of REQUIRED_FILES) {
    const filepath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filepath)) {
      success(`${file} exists`);
    } else {
      error(`Missing required file: ${file}`);
    }
  }
}

function checkVersionConsistency() {
  console.log('\n🔢 Checking version consistency...');

  const manifests = ['manifest.json', 'manifest-firefox.json', 'manifest-chrome.json'];
  const versions = {};

  for (const filename of manifests) {
    const filepath = path.join(ROOT_DIR, filename);
    if (fs.existsSync(filepath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        versions[filename] = manifest.version;
      } catch (e) {
        // Skip invalid files
      }
    }
  }

  const uniqueVersions = [...new Set(Object.values(versions))];
  if (uniqueVersions.length > 1) {
    warn(`Version mismatch across manifests: ${JSON.stringify(versions)}`);
  } else if (uniqueVersions.length === 1) {
    success(`All manifests have consistent version: ${uniqueVersions[0]}`);
  }
}

// Run validation
console.log('🔍 YouTube Speed Control - Manifest Validation\n');
console.log('='.repeat(50));

validateSharedFiles();
validateManifest('manifest-firefox.json', 2);
validateManifest('manifest-chrome.json', 3);
validateManifest('manifest.json', 2); // Default is Firefox MV2
checkVersionConsistency();

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('\n❌ Validation failed with errors\n');
  process.exit(1);
} else {
  console.log('\n✅ All validations passed!\n');
  process.exit(0);
}
