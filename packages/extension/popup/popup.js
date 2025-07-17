// Sprint 0: Import authentication and configuration infrastructure  
// These provide the foundation for future cloud sync capabilities
import { authManager } from '@shared/auth';
import { configManager } from '@shared/config';

// Sprint 0: Infrastructure state
let authInitialized = false;
let configInitialized = false;

document.addEventListener('DOMContentLoaded', async function() {
  console.log('[POPUP] DOMContentLoaded fired');
  
  // Sprint 0: Initialize authentication and configuration infrastructure
  await initializePopupInfrastructure();
  
  // Set up sidebar opening functionality
  setupSidebarButton();
  
  // Set up infrastructure event listeners
  setupPopupEventListeners();
});

/**
 * Initialize authentication and configuration for popup
 * Sprint 0: Sets up infrastructure but keeps all cloud features disabled
 */
async function initializePopupInfrastructure() {
  try {
    console.log('[POPUP] Initializing Sprint 0 infrastructure...');
    
    // Initialize configuration manager
    await configManager.initialize();
    configInitialized = true;
    
    // Initialize authentication manager  
    await authManager.initialize();
    authInitialized = true;
    
    // Update popup UI with current state
    await updatePopupAuthStatus();
    
    console.log('[POPUP] Sprint 0 infrastructure ready - working in offline mode');
    
  } catch (error) {
    console.error('[POPUP] Failed to initialize infrastructure:', error);
    // Popup should continue working even if infrastructure fails
  }
}

/**
 * Set up the main sidebar button functionality
 */
function setupSidebarButton() {
  const btn = document.getElementById('open-sidebar-btn');
  const status = document.getElementById('sidebar-status');
  
  if (btn) {
    btn.onclick = async function() {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        try {
          let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
          await chrome.sidePanel.open({windowId: tab.windowId});
        } catch (e) {
          if (status) status.textContent = 'Failed to open side panel: ' + e;
        }
      } else {
        if (status) status.textContent = 'Side Panel API not available in this version of Chrome.';
      }
    };
  }
}

/**
 * Set up event listeners for popup infrastructure UI elements
 * Sprint 0: Elements are hidden, but listeners are ready for Sprint 1
 */
function setupPopupEventListeners() {
  // Auth buttons (hidden in Sprint 0)
  const loginBtn = document.getElementById('popup-login-btn');
  const dashboardBtn = document.getElementById('popup-dashboard-btn');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      console.log('[POPUP] Login clicked - Sprint 0 stub');
      await authManager.login(); // No-op in Sprint 0
    });
  }
  
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      console.log('[POPUP] Dashboard clicked - Sprint 0 stub');
      // In Sprint 1: Open web dashboard in new tab
    });
  }
  
  // Sync button (hidden in Sprint 0)
  const syncNowBtn = document.getElementById('popup-sync-now-btn');
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', async () => {
      console.log('[POPUP] Sync now clicked - Sprint 0 stub');
      // In Sprint 2: Trigger manual sync
    });
  }
  
  // Settings button (hidden in Sprint 0)
  const settingsBtn = document.getElementById('popup-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('[POPUP] Settings clicked - Sprint 0 stub');
      // In Sprint 1: Open settings in sidebar or new tab
    });
  }
  
  console.log('[POPUP] Infrastructure event listeners ready');
}

/**
 * Update authentication status display in popup
 * Sprint 0: Always shows offline status
 */
async function updatePopupAuthStatus() {
  try {
    if (!authInitialized) return;
    
    const authStatus = authManager.getUIAuthStatus();
    
    // Update auth status elements (hidden in Sprint 0)
    const authIcon = document.getElementById('popup-auth-icon');
    const authText = document.getElementById('popup-auth-text');
    
    if (authIcon && authText) {
      authIcon.textContent = authStatus.status === 'offline' ? '🔒' : '✅';
      authText.textContent = authStatus.message;
    }
    
    // Update sync status (hidden in Sprint 0)
    const syncIndicator = document.getElementById('popup-sync-indicator');
    if (syncIndicator) {
      syncIndicator.className = `sync-indicator ${authStatus.status}`;
    }
    
  } catch (error) {
    console.warn('[POPUP] Could not update auth status:', error);
  }
} 