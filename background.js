// Relay broadcasts from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'broadcastDefaultSpeed' && typeof message.speed === 'number') {
    browser.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id !== sender.tab?.id) {
          browser.tabs.sendMessage(tab.id, { action: 'setDefaultSpeed', speed: message.speed }).catch(() => {});
        }
      });
    });
  }
});
