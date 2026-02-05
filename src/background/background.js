// YouTube Speed Control - Background Script

// Relay broadcasts from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'broadcastDefaultSpeed' && typeof message.speed === 'number') {
    browser.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id !== sender.tab?.id) {
          // Silent catch: tabs without content script will always fail
          browser.tabs.sendMessage(tab.id, {
            action: 'setDefaultSpeed',
            speed: message.speed,
            hostname: message.hostname
          }).catch(() => {});
        }
      });
    });
  } else if (message.action === 'openOptions') {
    browser.runtime.openOptionsPage();
  }
});
