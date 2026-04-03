// Service worker for Manifest V3 extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('VigilX Security Companion installed.');
});

// We can communicate with content scripts or listen to web requests here if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'THREAT_DETECTED') {
    // Optionally change the extension badge to alert the user
    chrome.action.setBadgeText({ text: '!', tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  }
  return true;
});
