// background.js - Service Worker
// Acts as a central message broker for the extension with robustness improvements.

console.log('[BACKGROUND] Script loaded');

// Use objects to store ports for each tab.
const contentScriptPorts = {};
let sidebarPort = null; // There's only one sidebar.

// Keep track of the last known active tab ID
let activeTabId = null;

// Connection health tracking
const connectionHealth = {
  contentScripts: new Map(), // tabId -> { lastPing: timestamp, retryCount: number }
  sidebarLastPing: null,
  healthCheckInterval: null,
};

// Injection retry configuration
const INJECTION_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
};

/**
 * Robust content script injection with exponential backoff retry
 */
async function injectContentScriptWithRetry(tabId, attempt = 1) {
  console.log(`[BACKGROUND] Attempting content script injection for tab ${tabId}, attempt ${attempt}`);
  
  try {
    // Check if tab still exists and is valid for injection
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || !tab.url.startsWith('https://gamma.app/')) {
      console.log(`[BACKGROUND] Tab ${tabId} is not valid for injection`);
      return { success: false, reason: 'invalid_tab' };
    }

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    console.log(`[BACKGROUND] Content script injected successfully for tab ${tabId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`[BACKGROUND] Injection attempt ${attempt} failed for tab ${tabId}:`, error);
    
    if (attempt >= INJECTION_CONFIG.maxRetries) {
      console.error(`[BACKGROUND] Max injection retries (${INJECTION_CONFIG.maxRetries}) reached for tab ${tabId}`);
      return { success: false, reason: 'max_retries_reached', error };
    }
    
    // Calculate delay with exponential backoff
    const delayMs = Math.min(
      INJECTION_CONFIG.baseDelayMs * Math.pow(2, attempt - 1),
      INJECTION_CONFIG.maxDelayMs
    );
    
    console.log(`[BACKGROUND] Retrying injection for tab ${tabId} in ${delayMs}ms`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return injectContentScriptWithRetry(tabId, attempt + 1);
  }
}

/**
 * Connection health monitoring system
 */
function startHealthMonitoring() {
  if (connectionHealth.healthCheckInterval) {
    clearInterval(connectionHealth.healthCheckInterval);
  }
  
  connectionHealth.healthCheckInterval = setInterval(() => {
    const now = Date.now();
    const HEALTH_TIMEOUT = 15000; // 15 seconds
    
    // Check content script connections
    for (const [tabId, healthData] of connectionHealth.contentScripts.entries()) {
      if (now - healthData.lastPing > HEALTH_TIMEOUT) {
        console.warn(`[BACKGROUND] Content script for tab ${tabId} appears unhealthy, attempting recovery`);
        recoverContentScriptConnection(tabId);
      }
    }
    
    // Check sidebar connection
    if (sidebarPort && connectionHealth.sidebarLastPing && 
        now - connectionHealth.sidebarLastPing > HEALTH_TIMEOUT) {
      console.warn('[BACKGROUND] Sidebar connection appears unhealthy');
      notifySidebarOfConnectionIssue();
    }
    
  }, 10000); // Check every 10 seconds
}

/**
 * Attempt to recover a failed content script connection
 */
async function recoverContentScriptConnection(tabId) {
  console.log(`[BACKGROUND] Attempting to recover connection for tab ${tabId}`);
  
  // Remove the old connection tracking
  connectionHealth.contentScripts.delete(tabId);
  delete contentScriptPorts[tabId];
  
  // Try to re-inject the content script
  const result = await injectContentScriptWithRetry(tabId);
  
  if (!result.success && sidebarPort) {
    sidebarPort.postMessage({
      type: 'connection-error',
      message: `Unable to connect to the Gamma presentation. ${result.reason === 'max_retries_reached' ? 'Please refresh the page.' : 'Please try refreshing the page.'}`,
      tabId: tabId,
      canRetry: result.reason !== 'invalid_tab'
    });
  }
}

/**
 * Update connection health when receiving messages
 */
function updateConnectionHealth(source, tabId = null) {
  const now = Date.now();
  
  if (source === 'content-script' && tabId) {
    if (!connectionHealth.contentScripts.has(tabId)) {
      connectionHealth.contentScripts.set(tabId, { lastPing: now, retryCount: 0 });
    } else {
      connectionHealth.contentScripts.get(tabId).lastPing = now;
    }
  } else if (source === 'sidebar') {
    connectionHealth.sidebarLastPing = now;
  }
}

/**
 * Notify sidebar of connection issues
 */
function notifySidebarOfConnectionIssue() {
  if (sidebarPort) {
    sidebarPort.postMessage({
      type: 'connection-warning',
      message: 'Connection health check failed. Extension may need refresh.'
    });
  }
}

chrome.runtime.onConnect.addListener(port => {
  console.log('[BACKGROUND] New connection:', port.name, 'from:', port.sender);

  if (port.name === 'content-script') {
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      contentScriptPorts[tabId] = port;
      console.log(`[BACKGROUND] Content script connected for tab ${tabId}.`);
      
      // Update health tracking
      updateConnectionHealth('content-script', tabId);

      port.onDisconnect.addListener(() => {
        delete contentScriptPorts[tabId];
        connectionHealth.contentScripts.delete(tabId);
        console.log(`[BACKGROUND] Content script for tab ${tabId} disconnected.`);
      });

      // Forward messages from content script to the single sidebar
      port.onMessage.addListener(msg => {
        // Update health tracking on each message
        updateConnectionHealth('content-script', tabId);
        
        if (sidebarPort) {
          // Only forward messages from the active tab to prevent flickering
          if (tabId === activeTabId) {
            console.log(
              `[BACKGROUND] Forwarding message from active content script (tab ${tabId}) to sidebar:`,
              msg
            );
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
    
    // Update health tracking and start monitoring
    updateConnectionHealth('sidebar');
    startHealthMonitoring();

    sidebarPort.onDisconnect.addListener(() => {
      sidebarPort = null;
      connectionHealth.sidebarLastPing = null;
      console.log('[BACKGROUND] Sidebar disconnected.');
      
      // Stop health monitoring when sidebar disconnects
      if (connectionHealth.healthCheckInterval) {
        clearInterval(connectionHealth.healthCheckInterval);
        connectionHealth.healthCheckInterval = null;
      }
    });

    // When the sidebar requests slides, forward it to the active content script
    sidebarPort.onMessage.addListener(msg => {
      console.log('[BACKGROUND] Message from sidebar:', msg);
      updateConnectionHealth('sidebar');
      
      if (msg.type === 'get-slides' && activeTabId) {
        const contentPort = contentScriptPorts[activeTabId];
        if (contentPort) {
          console.log(
            `[BACKGROUND] Forwarding get-slides to content script for active tab ${activeTabId}.`
          );
          contentPort.postMessage(msg);
        } else {
          console.log(`[BACKGROUND] No content script for active tab ${activeTabId}, attempting injection.`);
          handleMissingContentScript(activeTabId);
        }
      } else if (msg.type === 'retry-connection' && msg.tabId) {
        console.log(`[BACKGROUND] Manual retry requested for tab ${msg.tabId}`);
        handleMissingContentScript(msg.tabId);
      }
    });

    // When the sidebar first connects, trigger an update based on the current active tab.
    if (activeTabId) {
      triggerTabUpdate(activeTabId);
    }
  }
});

/**
 * Handle missing content script by attempting injection
 */
async function handleMissingContentScript(tabId) {
  if (sidebarPort) {
    sidebarPort.postMessage({
      type: 'connection-status',
      status: 'connecting',
      message: 'Connecting to presentation...'
    });
  }
  
  const result = await injectContentScriptWithRetry(tabId);
  
  if (result.success) {
    console.log(`[BACKGROUND] Content script injection successful for tab ${tabId}`);
    // Give the content script a moment to initialize, then request slides
    setTimeout(() => {
      const contentPort = contentScriptPorts[tabId];
      if (contentPort) {
        contentPort.postMessage({ type: 'get-slides' });
      }
    }, 1000);
  } else {
    console.error(`[BACKGROUND] Content script injection failed for tab ${tabId}:`, result);
    if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'connection-error',
        message: result.reason === 'max_retries_reached' 
          ? 'Unable to connect to Gamma presentation. Please refresh the page.'
          : result.reason === 'invalid_tab'
          ? 'This extension only works on gamma.app presentations.'
          : 'Connection failed. Please try refreshing the page.',
        canRetry: result.reason !== 'invalid_tab',
        tabId: tabId
      });
    }
  }
}

function triggerTabUpdate(tabId) {
  if (!sidebarPort) {
    console.log('[BACKGROUND] No sidebar to update.');
    return;
  }

  chrome.tabs.get(tabId, async (tab) => {
    if (chrome.runtime.lastError) {
      console.error(`[BACKGROUND] Error getting tab info: ${chrome.runtime.lastError.message}`);
      sidebarPort.postMessage({ 
        type: 'connection-error', 
        message: 'Error accessing tab. Please try refreshing.',
        canRetry: true,
        tabId: tabId
      });
      return;
    }

    if (tab && tab.url && tab.url.startsWith('https://gamma.app/')) {
      console.log(`[BACKGROUND] Active tab is a Gamma tab: ${tabId}`);
      
      // Check if content script is already connected
      const contentPort = contentScriptPorts[tabId];
      if (contentPort) {
        sidebarPort.postMessage({ type: 'gamma-tab-activated', tabId: tabId });
      } else {
        console.log(`[BACKGROUND] No content script found for Gamma tab ${tabId}, attempting injection`);
        await handleMissingContentScript(tabId);
      }
    } else {
      console.log(`[BACKGROUND] Active tab is not a Gamma tab: ${tabId}`);
      sidebarPort.postMessage({
        type: 'wrong-domain',
        tabUrl: tab?.url || '',
        tabId: tabId
      });
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
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
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
