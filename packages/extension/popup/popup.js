// Import authentication and configuration infrastructure
// These provide the foundation for future cloud sync capabilities
import { authManager } from '@shared/auth';
import { configManager } from '@shared/config';

// Infrastructure state
let authInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let configInitialized = false;

document.addEventListener('DOMContentLoaded', async function () {
  // DOMContentLoaded fired

  // Initialize authentication and configuration infrastructure
  await initializePopupInfrastructure();

  // Set up sidebar opening functionality
  setupSidebarButton();

  // Set up infrastructure event listeners
  setupPopupEventListeners();
});

/**
 * Initialize authentication and configuration for popup
 * Sets up infrastructure but keeps all cloud features disabled
 */
async function initializePopupInfrastructure() {
  try {
    // Initializing infrastructure

    // Initialize configuration manager
    await configManager.initialize();
    configInitialized = true;

    // Initialize authentication manager
    await authManager.initialize();
    authInitialized = true;

    // Update popup UI with current state
    await updatePopupAuthStatus();

    // Infrastructure ready - working in offline mode
  } catch (error) {
    // Failed to initialize infrastructure
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
    btn.onclick = async function () {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          await chrome.sidePanel.open({ windowId: tab.windowId });
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
      // Login clicked
      await authManager.login(); // No-op in offline mode
    });
  }

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      // Dashboard clicked
      // Open web dashboard in new tab
    });
  }

  // Sync button (hidden in Sprint 0)
  const syncNowBtn = document.getElementById('popup-sync-now-btn');
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', async () => {
      // Sync now clicked
      // Trigger manual sync
    });
  }

  // Settings button (hidden in Sprint 0)
  const settingsBtn = document.getElementById('popup-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // Settings clicked
      // Open settings in sidebar or new tab
    });
  }

  // Infrastructure event listeners ready
}

/**
 * Update authentication status display in popup
 * Always shows offline status
 */
async function updatePopupAuthStatus() {
  try {
    if (!authInitialized) return;

    const authStatus = authManager.getUIAuthStatus();

    // Update auth status elements (hidden by default)
    const authIcon = document.getElementById('popup-auth-icon');
    const authText = document.getElementById('popup-auth-text');

    if (authIcon && authText) {
      authIcon.textContent = authStatus.status === 'offline' ? '🔒' : '✅';
      authText.textContent = authStatus.message;
    }

    // Update sync status (hidden by default)
    const syncIndicator = document.getElementById('popup-sync-indicator');
    if (syncIndicator) {
      syncIndicator.className = `sync-indicator ${authStatus.status}`;
    }
  } catch (error) {
    // Could not update auth status
  }
}
