// Import authentication manager for Sprint 0 infrastructure
import { authManager } from '../../../packages/shared/auth/index.js';
import { config } from '../../../packages/shared/config/index.js';

document.addEventListener('DOMContentLoaded', function() {
  initializePopup();
});

async function initializePopup() {
  // Initialize sidebar functionality
  setupSidebarButton();
  
  // Initialize authentication UI (hidden in Sprint 0)
  await setupAuthenticationUI();
}

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

async function setupAuthenticationUI() {
  // Check if authentication features should be shown
  const shouldShow = authManager.shouldShowAuthUI();
  
  // Get UI elements
  const authSection = document.getElementById('auth-section');
  const authStatus = document.getElementById('auth-status');
  const authStatusText = document.getElementById('auth-status-text');
  const authButtons = document.getElementById('auth-buttons');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (!authSection || !authStatus || !authStatusText || !authButtons || !loginBtn || !logoutBtn) {
    console.log('[Popup] Auth UI elements not found');
    return;
  }
  
  // Sprint 0: Keep authentication UI hidden
  if (shouldShow) {
    authSection.style.display = 'block';
    authStatus.style.display = 'block';
    authButtons.style.display = 'flex';
  } else {
    // Hidden in Sprint 0
    authSection.style.display = 'none';
    console.log('[Popup] Authentication UI hidden (Sprint 0)');
  }
  
  // Set up authentication state listener
  const unsubscribe = authManager.onAuthStateChange((authState) => {
    updateAuthUI(authState);
  });
  
  // Set up button event listeners
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    unsubscribe();
  });
}

function updateAuthUI(authState) {
  const authStatus = document.getElementById('auth-status');
  const authStatusText = document.getElementById('auth-status-text');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (!authStatus || !authStatusText || !loginBtn || !logoutBtn) {
    return;
  }
  
  // Update status display
  authStatus.className = `auth-status ${authState.isAuthenticated ? 'authenticated' : 'unauthenticated'}`;
  
  if (authState.isLoading) {
    authStatusText.textContent = 'Loading...';
    loginBtn.disabled = true;
    logoutBtn.disabled = true;
  } else if (authState.isAuthenticated && authState.user) {
    authStatusText.textContent = `Signed in as ${authState.user.email}`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    loginBtn.disabled = false;
    logoutBtn.disabled = false;
  } else {
    // Sprint 0: Always in guest mode
    authStatusText.textContent = 'Guest Mode - Not signed in';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    loginBtn.disabled = false;
    logoutBtn.disabled = false;
  }
  
  if (authState.lastError) {
    console.error('[Popup] Auth error:', authState.lastError);
  }
}

async function handleLogin() {
  try {
    // Sprint 0: Show message that authentication will be available in Sprint 1
    const status = document.getElementById('sidebar-status');
    if (status) {
      status.style.color = 'blue';
      status.textContent = 'Authentication will be available in Sprint 1';
    }
    
    console.log('[Popup] Login attempted - will be implemented in Sprint 1');
    
    // Future Sprint 1 implementation:
    // - Open authentication modal/popup
    // - Integrate with Clerk authentication
    // - Handle login flow
    
  } catch (error) {
    console.error('[Popup] Login failed:', error);
    const status = document.getElementById('sidebar-status');
    if (status) {
      status.style.color = 'red';
      status.textContent = 'Login failed: ' + error.message;
    }
  }
}

async function handleLogout() {
  try {
    await authManager.logout();
    console.log('[Popup] User logged out');
    
    const status = document.getElementById('sidebar-status');
    if (status) {
      status.style.color = 'green';
      status.textContent = 'Logged out successfully';
    }
    
  } catch (error) {
    console.error('[Popup] Logout failed:', error);
    const status = document.getElementById('sidebar-status');
    if (status) {
      status.style.color = 'red';
      status.textContent = 'Logout failed: ' + error.message;
    }
  }
} 