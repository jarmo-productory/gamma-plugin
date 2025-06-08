// background.js - Service Worker
// Acts as a central message broker for the extension.

console.log('[BACKGROUND] Script loaded');

// Use objects to store ports for each tab.
const contentScriptPorts = {};
let sidebarPort = null; // There's only one sidebar.

// Keep track of the last known active tab ID
let activeTabId = null;

chrome.runtime.onConnect.addListener((port) => {
  console.log('[BACKGROUND] New connection:', port.name, 'from:', port.sender);

  if (port.name === 'content-script') {
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      contentScriptPorts[tabId] = port;
      console.log(`[BACKGROUND] Content script connected for tab ${tabId}.`);

      port.onDisconnect.addListener(() => {
        delete contentScriptPorts[tabId];
        console.log(`[BACKGROUND] Content script for tab ${tabId} disconnected.`);
      });

      // Forward messages from content script to the single sidebar
      port.onMessage.addListener((msg) => {
        if (sidebarPort) {
          // Only forward messages from the active tab to prevent flickering
          if (tabId === activeTabId) {
            console.log(`[BACKGROUND] Forwarding message from active content script (tab ${tabId}) to sidebar:`, msg);
            sidebarPort.postMessage({ ...msg, tabId });
          } else {
            console.log(`[BACKGROUND] Ignoring message from inactive tab ${tabId}.`);
          }
        }
      });
    }
  } else if (port.name === 'sidebar') {
    sidebarPort = port;
    console.log('[BACKGROUND] Sidebar connected.');

    sidebarPort.onDisconnect.addListener(() => {
      sidebarPort = null;
      console.log('[BACKGROUND] Sidebar disconnected.');
    });

    // When the sidebar requests slides, forward it to the active content script
    sidebarPort.onMessage.addListener((msg) => {
      console.log('[BACKGROUND] Message from sidebar:', msg);
      if (msg.type === 'get-slides' && activeTabId) {
        const contentPort = contentScriptPorts[activeTabId];
        if (contentPort) {
          console.log(`[BACKGROUND] Forwarding get-slides to content script for active tab ${activeTabId}.`);
          contentPort.postMessage(msg);
        } else {
          console.log(`[BACKGROUND] No content script for active tab ${activeTabId}.`);
          sidebarPort.postMessage({ type: 'error', message: 'No content script connected for the active Gamma tab. Please refresh the page.' });
        }
      }
    });

    // When the sidebar first connects, trigger an update based on the current active tab.
    if (activeTabId) {
      triggerTabUpdate(activeTabId);
    }
  }
});

function triggerTabUpdate(tabId) {
  if (!sidebarPort) {
    console.log('[BACKGROUND] No sidebar to update.');
    return;
  }
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(`[BACKGROUND] Error getting tab info: ${chrome.runtime.lastError.message}`);
      sidebarPort.postMessage({ type: 'show-message', message: 'Error accessing tab.' });
      return;
    }

    if (tab && tab.url && tab.url.startsWith('https://gamma.app/')) {
      console.log(`[BACKGROUND] Active tab is a Gamma tab: ${tabId}`);
      sidebarPort.postMessage({ type: 'gamma-tab-activated', tabId: tabId });
    } else {
      console.log(`[BACKGROUND] Active tab is not a Gamma tab: ${tabId}`);
      sidebarPort.postMessage({ type: 'show-message', message: 'This extension only works with presentations on Gamma.app.' });
    }
  });
}

// Listen for when the user switches to a different tab
chrome.tabs.onActivated.addListener(activeInfo => {
  console.log(`[BACKGROUND] Tab activated: ${activeInfo.tabId}`);
  activeTabId = activeInfo.tabId;
  triggerTabUpdate(activeTabId);
});

// Also check the active tab when the extension is first installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      activeTabId = tabs[0].id;
      console.log(`[BACKGROUND] Extension installed/updated. Initial active tab: ${activeTabId}`);
    }
  });
});

// Set up a periodic heartbeat to request updates from the active tab
setInterval(() => {
  if (activeTabId && sidebarPort) {
    console.log(`[BACKGROUND] Heartbeat: Requesting slide update from active tab ${activeTabId}`);
    const contentPort = contentScriptPorts[activeTabId];
    if (contentPort) {
      contentPort.postMessage({ type: 'get-slides' });
    }
  }
}, 5000); // every 5 seconds 