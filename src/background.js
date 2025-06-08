// background.js - Service Worker
// Acts as a central message broker for the extension.

console.log('[BACKGROUND] Script loaded');

// Use objects to store ports for each tab, making the extension multi-tab aware.
const contentScriptPorts = {};
const sidebarPorts = {};

// Keep track of the most recent Gamma tab
let lastGammaTabId = null;

// Keep track of pending sidebar requests
const pendingSidebarRequests = new Set();

chrome.runtime.onConnect.addListener((port) => {
  console.log('[BACKGROUND] New connection:', port.name, 'from:', port.sender);
  console.log('[BACKGROUND] Port sender details:', {
    tab: port.sender?.tab,
    tabId: port.sender?.tab?.id,
    url: port.sender?.url,
    frameId: port.sender?.frameId
  });
  
  if (port.sender?.tab?.id) {
    // Always use string keys for consistency
    const tabId = String(port.sender.tab.id);

    if (port.name === 'content-script') {
      contentScriptPorts[tabId] = port;
      lastGammaTabId = tabId; // Remember this as the last Gamma tab (as string)
      console.log(`[BACKGROUND] Content script connected for tab ${tabId}.`);
      console.log('[BACKGROUND] Current content script ports:', Object.keys(contentScriptPorts));

      // Check if there's a sidebar waiting for this content script
      if (sidebarPorts[tabId] && pendingSidebarRequests.has(tabId)) {
        console.log(`[BACKGROUND] Found waiting sidebar for tab ${tabId}, requesting slides...`);
        port.postMessage({ type: 'get-slides' });
        pendingSidebarRequests.delete(tabId);
      }

      port.onDisconnect.addListener(() => {
        delete contentScriptPorts[tabId];
        console.log(`[BACKGROUND] Content script for tab ${tabId} disconnected.`);
      });

      // Listen for messages from this specific content script
      port.onMessage.addListener((msg) => {
        console.log(`[BACKGROUND] Message from content script (tab ${tabId}):`, msg);
        const sidebarPort = sidebarPorts[tabId];
        if (sidebarPort && msg.type === 'slide-data') {
          console.log(`[BACKGROUND] Forwarding slide-data to sidebar for tab ${tabId}. Slides:`, msg.slides?.length || 0);
          sidebarPort.postMessage(msg);
        } else if (!sidebarPort) {
          console.log(`[BACKGROUND] No sidebar port found for tab ${tabId}`);
        }
      });
    }
  } else if (port.name === 'sidebar') {
    console.log('[BACKGROUND] Sidebar connection initiated');
    console.log('[BACKGROUND] Available content script ports:', Object.keys(contentScriptPorts));
    console.log('[BACKGROUND] Last Gamma tab ID:', lastGammaTabId);
    
    // Find the most appropriate tab to connect to
    let targetTabId = null;
    
    if (lastGammaTabId && contentScriptPorts[lastGammaTabId]) {
      targetTabId = lastGammaTabId;
      console.log('[BACKGROUND] Using last Gamma tab ID:', targetTabId);
    } else {
      const availableTabs = Object.keys(contentScriptPorts);
      if (availableTabs.length > 0) {
        targetTabId = availableTabs[0]; // Already a string
        console.log('[BACKGROUND] Using first available tab:', targetTabId);
      }
    }
    
    if (targetTabId) {
      console.log(`[BACKGROUND] Connecting sidebar to tab ${targetTabId}`);
      sidebarPorts[targetTabId] = port;
      
      port.onDisconnect.addListener(() => {
        delete sidebarPorts[targetTabId];
        pendingSidebarRequests.delete(targetTabId);
        console.log(`[BACKGROUND] Sidebar for tab ${targetTabId} disconnected.`);
      });

      port.onMessage.addListener((msg) => {
        console.log(`[BACKGROUND] Message from sidebar for tab ${targetTabId}:`, msg);
        if (msg.type === 'get-slides') {
          const contentPort = contentScriptPorts[targetTabId];
          if (contentPort) {
            console.log(`[BACKGROUND] Forwarding get-slides request to content script for tab ${targetTabId}.`);
            contentPort.postMessage(msg);
          } else {
            console.log(`[BACKGROUND] Content script not yet connected for tab ${targetTabId}, marking as pending...`);
            pendingSidebarRequests.add(targetTabId);
          }
        }
      });
    } else {
      // No tabs available yet, but we'll connect to the first one that comes
      console.log('[BACKGROUND] No content scripts connected yet, waiting...');
      console.log('[BACKGROUND] contentScriptPorts object:', contentScriptPorts);
      
      // Store this sidebar temporarily without a tab ID
      const tempId = 'pending_' + Date.now();
      sidebarPorts[tempId] = port;
      
      port.onDisconnect.addListener(() => {
        delete sidebarPorts[tempId];
        console.log('[BACKGROUND] Pending sidebar disconnected.');
      });

      port.onMessage.addListener((msg) => {
        if (msg.type === 'get-slides') {
          console.log('[BACKGROUND] Sidebar requesting slides but no content scripts available yet');
          // Check again if any content scripts have connected
          const availableTabs = Object.keys(contentScriptPorts);
          if (availableTabs.length > 0) {
            const tabId = availableTabs[0];
            // Move this sidebar to the proper tab
            delete sidebarPorts[tempId];
            sidebarPorts[tabId] = port;
            
            console.log(`[BACKGROUND] Found content script for tab ${tabId}, forwarding request`);
            contentScriptPorts[tabId].postMessage(msg);
          } else {
            port.postMessage({ type: 'error', message: 'No Gamma tabs found. Please refresh the Gamma presentation page.' });
          }
        }
      });
    }
  }
}); 