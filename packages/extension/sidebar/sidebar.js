// sidebar.js - Receives slide data and displays it in the sidebar

console.log('[SIDEBAR] Script loaded');

// The version is injected by the build process, with a fallback for development
const EXT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'DEV';

import {
  generateTimetable,
  // generateCSV, // Currently unused
  downloadFile,
  generateXLSX,
  // copyToClipboard, // Currently unused
} from '../lib/timetable.js';
import { saveData, loadData, debounce } from '../lib/storage.js';

// Import authentication and configuration infrastructure
import { authManager } from '@shared/auth';
import { deviceAuth } from '@shared/auth/device';
import { configManager } from '@shared/config';
import { defaultStorageManager, saveDataWithSync } from '@shared/storage';

let connected = false;
let lastSlides = [];
let currentTimetable = null;
let port = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let currentTabId = null;
let currentPresentationUrl = null; // Track the current presentation

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let authInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let configInitialized = false;

/**
 * Reconciles fresh slide data with the existing timetable, preserving user-set durations.
 * @param {Array} newSlides - The fresh slide data from the content script.
 */
function reconcileAndUpdate(newSlides) {
  if (!currentTimetable) {
    console.log('[SIDEBAR] No current timetable, generating a new one.');
    const newTimetable = generateTimetable(newSlides);
    renderTimetable(newTimetable);
    debouncedSave();
    return;
  }

  console.log('[SIDEBAR] Reconciling new slide data with existing timetable.');
  const newItems = [];
  const existingItemsMap = new Map(currentTimetable.items.map(item => [item.id, item]));

  for (const slide of newSlides) {
    const existingItem = existingItemsMap.get(slide.id);
    if (existingItem) {
      newItems.push({
        ...existingItem,
        title: slide.title,
        content: slide.content,
      });
    } else {
      newItems.push({
        ...slide,
        duration: 5,
      });
    }
  }

  currentTimetable.items = newItems;
  const recalculatedTimetable = recalculateTimetable(currentTimetable);
  renderTimetable(recalculatedTimetable);
  debouncedSave();
}

const updateUIWithNewSlides = async (slides, tabId) => {
  console.log(
    `[SIDEBAR] updateUIWithNewSlides called for tab ${tabId} with`,
    slides?.length || 0,
    'slides'
  );
  currentTabId = tabId;
  lastSlides = slides || [];

  if (slides.length === 0) {
    document.getElementById('sidebar-main').innerHTML =
      '<p>No slides detected in this Gamma presentation.</p>';
    updateDebugInfo(slides, 'Received: slide-data (empty)');
    return;
  }

  const presentationUrl = slides[0]?.presentationUrl;
  if (!presentationUrl) return;

  if (presentationUrl !== currentPresentationUrl) {
    console.log(
      `[SIDEBAR] Switched to new presentation: ${presentationUrl}. Loading from storage...`
    );
    currentPresentationUrl = presentationUrl;

    const timetableKey = `timetable-${presentationUrl}`;
    let storedTimetable = await loadData(timetableKey);

    // Try to sync from cloud if user is authenticated
    const config = configManager.getConfig();
    if (config.features.cloudSync && config.environment.apiBaseUrl) {
      try {
        const syncResult = await defaultStorageManager.syncFromCloud(presentationUrl, {
          apiBaseUrl: config.environment.apiBaseUrl,
          deviceAuth,
        });
        
        if (syncResult.success && syncResult.data) {
          console.log('[SIDEBAR] Found cloud version, merging with local...');
          const cloudTimetable = syncResult.data;
          
          // Use cloud version if it's newer than local or if no local version exists
          const shouldUseCloud = !storedTimetable || 
            (cloudTimetable.lastModified && storedTimetable.lastModified &&
             new Date(cloudTimetable.lastModified) > new Date(storedTimetable.lastModified));
             
          if (shouldUseCloud) {
            storedTimetable = cloudTimetable;
            // Also save to local storage for offline access
            await saveData(timetableKey, cloudTimetable);
            console.log('[SIDEBAR] Using cloud version (newer than local).');
          } else {
            console.log('[SIDEBAR] Using local version (newer than cloud).');
          }
        } else if (!syncResult.success && syncResult.error !== 'Presentation not found in cloud') {
          console.warn('[SIDEBAR] Cloud sync failed:', syncResult.error);
        }
      } catch (error) {
        console.warn('[SIDEBAR] Cloud sync error (non-critical):', error);
      }
    }

    if (storedTimetable) {
      console.log('[SIDEBAR] Found stored timetable.');
      currentTimetable = storedTimetable;
    } else {
      console.log('[SIDEBAR] No stored timetable, generating a new one...');
      currentTimetable = generateTimetable(slides);
    }
  }

  reconcileAndUpdate(slides);
  updateDebugInfo(slides, 'Rendered: slide-data');
};

function connectToBackground() {
  console.log('[SIDEBAR] Connecting to background script...');
  port = chrome.runtime.connect({ name: 'sidebar' });
  console.log('[SIDEBAR] Connected to background');

  if (!port) {
    console.error('[SIDEBAR] Failed to create port connection');
    return;
  }

  connected = true;
  updateDebugInfo(lastSlides, 'Connected to background');

  port.onMessage.addListener(msg => {
    console.log('[SIDEBAR] Received message from background:', msg);
    if (msg.type === 'slide-data') {
      updateUIWithNewSlides(msg.slides, msg.tabId);
    } else if (msg.type === 'gamma-tab-activated') {
      currentTabId = msg.tabId;
      document.getElementById('sidebar-main').innerHTML = '<p>Loading timetable...</p>';
      port.postMessage({ type: 'get-slides' });
    } else if (msg.type === 'show-message') {
      document.getElementById('sidebar-main').innerHTML = `<p>${msg.message}</p>`;
      const titleElement = document.getElementById('timetable-title');
      if (titleElement) titleElement.textContent = 'Gamma Timetable';
      const durationBadge = document.getElementById('duration-badge');
      if (durationBadge) durationBadge.textContent = '0h 0m';
    } else if (msg.type === 'error') {
      console.error('[SIDEBAR] Error from background:', msg.message);
      document.getElementById('sidebar-main').innerHTML =
        `<p style="color: red;">${msg.message}</p>`;
    }
  });

  port.onDisconnect.addListener(() => {
    port = null;
    connected = false;
    console.log('[SIDEBAR] Disconnected from background script.');
    updateDebugInfo(lastSlides, 'Disconnected');
  });
}

function generateContentHtml(content) {
  let contentHtml = '';
  content.forEach(contentItem => {
    switch (contentItem.type) {
      case 'paragraph':
        contentHtml += `<p>${contentItem.text}</p>`;
        break;
      case 'image':
        contentHtml += `<img src="${contentItem.text}" class="thumbnail-img">`;
        break;
      case 'link':
        contentHtml += `<a href="${contentItem.text}" target="_blank" class="content-link">${contentItem.text}</a>`;
        break;
      case 'list_item':
        contentHtml += `<p>${contentItem.text}</p>`;
        if (contentItem.subItems && contentItem.subItems.length > 0) {
          contentHtml += `<ul class="sub-items-list">`;
          contentItem.subItems.forEach(subItem => {
            contentHtml += `<li class="sub-item">${subItem}</li>`;
          });
          contentHtml += `</ul>`;
        }
        break;
    }
  });
  return contentHtml;
}

function createTimeInput(timetable, onTimeChange) {
  const container = document.createElement('div');
  container.className = 'time-input-container';

  const [initialHours, initialMinutes] = timetable.startTime.split(':');

  const hoursInput = document.createElement('input');
  hoursInput.type = 'text';
  hoursInput.className = 'time-input-segment';
  hoursInput.value = initialHours;
  hoursInput.maxLength = 2;
  hoursInput.placeholder = '00';

  const separator = document.createElement('span');
  separator.className = 'time-input-separator';
  separator.textContent = ':';

  const minutesInput = document.createElement('input');
  minutesInput.type = 'text';
  minutesInput.className = 'time-input-segment';
  minutesInput.value = initialMinutes;
  minutesInput.maxLength = 2;
  minutesInput.placeholder = '00';

  const handleTimeChange = () => {
    const hours = hoursInput.value.padStart(2, '0');
    const minutes = minutesInput.value.padStart(2, '0');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      onTimeChange(`${hours}:${minutes}`);
    }
  };

  const debouncedHandleTimeChange = debounce(handleTimeChange, 400);

  hoursInput.addEventListener('input', () => {
    if (hoursInput.value.length >= 2) {
      hoursInput.value = hoursInput.value.slice(0, 2);
      minutesInput.focus();
    }
    debouncedHandleTimeChange();
  });

  minutesInput.addEventListener('input', () => {
    if (minutesInput.value.length >= 2) {
      minutesInput.value = minutesInput.value.slice(0, 2);
    }
    debouncedHandleTimeChange();
  });

  container.appendChild(hoursInput);
  container.appendChild(separator);
  container.appendChild(minutesInput);

  return container;
}

function getDebugInfoHTML(slides = [], lastAction = 'none', options = {}) {
  const { authFeatureEnabled = false, isAuthenticated = false, userEmail = '' } = options;
  const { debugMode = false } = options;
  const slideCount = slides.length;
  const firstSlide = slides[0] ? JSON.stringify(slides[0], null, 2) : 'N/A';
  const authFeatureFlag = authFeatureEnabled;
  const authControls =
    authFeatureFlag && debugMode
      ? isAuthenticated
        ? `<div style="margin-top:6px;"><span>Logged in as <strong>${userEmail || 'user'}</strong></span> <button id="debug-logout-btn" class="export-btn" style="margin-left:8px;">Logout</button></div>`
        : `<div style="margin-top:6px;"><button id="debug-login-btn" class="export-btn">Login</button></div>`
      : '';

  return `
        <strong>Debug Info (v${EXT_VERSION})</strong><br>
        Auth Feature: <strong style="color: ${authFeatureFlag ? 'green' : 'red'}">${authFeatureFlag ? 'ENABLED' : 'DISABLED'}</strong><br>
        Slides Detected: <strong>${slideCount}</strong><br>
        Connection Status: <span style="color:${connected ? 'green' : 'red'};font-weight:bold;">${connected ? 'Connected' : 'Disconnected'}</span><br>
        Last Action: <span style="font-family: monospace;">${lastAction}</span><br>
        ${authControls}
        <details><summary>First Slide Preview</summary><pre>${firstSlide}</pre></details>
    `;
}

async function updateDebugInfo(slides = [], lastAction = 'none') {
  const debugInfoContainer = document.getElementById('debug-info');
  if (!debugInfoContainer) return;

  const authFeatureEnabled = configManager.isFeatureEnabled('authentication');
  const debugMode = configManager.isFeatureEnabled('debugMode');
  let isAuthed = false;
  let email = '';
  if (authFeatureEnabled) {
    try {
      isAuthed = await authManager.isAuthenticated();
      const user = await authManager.getCurrentUser();
      email = user?.email || '';
    } catch {
      // noop
    }
  }

  debugInfoContainer.innerHTML = getDebugInfoHTML(slides, lastAction, {
    authFeatureEnabled,
    isAuthenticated: isAuthed,
    userEmail: email,
    debugMode,
  });

  // Wire login/logout buttons in debug box
  const loginBtn = document.getElementById('debug-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      console.log('[SIDEBAR] Debug login button clicked');
      await authManager.login();
    });
  }
  const logoutBtn = document.getElementById('debug-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log('[SIDEBAR] Debug logout button clicked');
      await authManager.logout();
    });
  }
}

function renderTimetable(timetable) {
  currentTimetable = timetable;
  const mainContainer = document.getElementById('sidebar-main');
  if (!mainContainer) return;

  const titleElement = document.getElementById('timetable-title');
  if (titleElement) {
    titleElement.textContent = timetable.items[0]?.title || 'Course Timetable';
  }

  const durationBadge = document.getElementById('duration-badge');
  if (durationBadge) {
    const hours = Math.floor(timetable.totalDuration / 60);
    const minutes = timetable.totalDuration % 60;
    durationBadge.textContent = `${hours}h ${minutes}m`;
  }

  const toolbar = document.getElementById('functions-toolbar');
  if (!toolbar) return;
  toolbar.innerHTML = '';

  const timeDisplaySection = document.createElement('div');
  timeDisplaySection.className = 'time-display-section';

  timeDisplaySection.prepend(
    createTimeInput(timetable, newStartTime => {
      currentTimetable.startTime = newStartTime;
      const newTimetable = recalculateTimetable(currentTimetable);
      renderTimetable(newTimetable);
      debouncedSave();
    })
  );

  toolbar.appendChild(timeDisplaySection);

  const exportOptionsContainer = document.createElement('div');
  exportOptionsContainer.className = 'export-options';
  exportOptionsContainer.innerHTML = `
    <button id="export-xlsx-btn" class="export-btn"><img src="/assets/xlsx.svg" alt="Excel">Excel</button>
    <button id="auth-login-toolbar-btn" class="export-btn"><span>🔐</span><span id="auth-toolbar-text">Login</span></button>
  `;
  toolbar.appendChild(exportOptionsContainer);

  mainContainer.innerHTML = '';

  exportOptionsContainer.querySelector('#export-xlsx-btn').onclick = () => {
    if (!currentTimetable) return;
    const blob = generateXLSX(currentTimetable);
    const filename = `gamma-timetable-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = URL.createObjectURL(blob);
    downloadFile(filename, url, true);
  };

  const loginToolbarBtn = exportOptionsContainer.querySelector('#auth-login-toolbar-btn');
  const loginToolbarText = exportOptionsContainer.querySelector('#auth-toolbar-text');
  if (loginToolbarBtn && loginToolbarText) {
    const wireAuthAction = async () => {
      const authed = await authManager.isAuthenticated();
      if (authed) {
        loginToolbarText.textContent = 'Logout';
        loginToolbarBtn.onclick = async () => {
          console.log('[SIDEBAR] Toolbar logout button clicked');
          await authManager.logout();
          await wireAuthAction();
        };
      } else {
        loginToolbarText.textContent = 'Login';
        loginToolbarBtn.onclick = async () => {
          console.log('[SIDEBAR] Toolbar login button clicked (web-first pairing)');
          try {
            const cfg = configManager.getConfig();
            const apiUrl = cfg.environment.apiBaseUrl || 'http://localhost:3000';
            const webUrl = cfg.environment.webBaseUrl || 'http://localhost:3000';
            // Always register a fresh code to avoid stale codes if the dev server restarted
            const info = await deviceAuth.registerDevice(apiUrl);
            const url = deviceAuth.buildSignInUrl(webUrl, info.code);
            if (chrome?.tabs?.create) {
              chrome.tabs.create({ url });
            } else if (window?.open) {
              window.open(url, '_blank');
            }
            // Start polling for linkage
            const token = await deviceAuth.pollExchangeUntilLinked(
              apiUrl,
              info.deviceId,
              info.code
            );
            if (token) {
              console.log('[SIDEBAR] Device linked; token stored.');
              // Reflect authed state in UI immediately
              await wireAuthAction();
            } else {
              console.warn('[SIDEBAR] Device linking timed out.');
            }
          } catch (err) {
            console.error('[SIDEBAR] Web-first login failed:', err);
          }
        };
      }
    };
    wireAuthAction();
  }


  timetable.items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'slide-item';
    const contentHtml = generateContentHtml(item.content);

    itemDiv.innerHTML = `
      <div class="slide-item-header">
        <h3 class="slide-item__title">${item.title}</h3>
        <div class="slide-item-time">
          ${item.startTime} - ${item.endTime}
        </div>
      </div>
      <div class="duration-slider-container">
        <input type="range" min="0" max="60" value="${item.duration}" class="duration-slider" data-slide-id="${item.id}">
        <span class="duration-display">${parseInt(item.duration, 10)} min</span>
      </div>
      <div class="slide-item-content">${contentHtml}</div>
    `;
    mainContainer.appendChild(itemDiv);
  });

  mainContainer.querySelectorAll('.duration-slider').forEach(slider => {
    slider.addEventListener('input', handleSliderInput);
    slider.addEventListener('change', handleDurationChange);
  });
}

const debouncedSave = debounce(async () => {
  if (currentTimetable && currentPresentationUrl) {
    const key = `timetable-${currentPresentationUrl}`;
    
    try {
      // Get configuration for sync
      const config = configManager.getConfig();
      const apiBaseUrl = config.environment.apiBaseUrl;
      
      // Use enhanced save with cloud sync if authentication is available
      if (config.features.cloudSync && apiBaseUrl) {
        await saveDataWithSync(key, currentTimetable, {
          deviceAuth,
          apiBaseUrl,
          title: currentTimetable.title || lastSlides[0]?.title || 'Untitled Presentation',
          enableAutoSync: true,
        });
        console.log('[SIDEBAR] Timetable saved with cloud sync.');
      } else {
        // Fallback to local-only save
        await saveData(key, currentTimetable);
        console.log('[SIDEBAR] Timetable saved (local only).');
      }
    } catch (error) {
      console.error('[SIDEBAR] Save failed:', error);
      // Try fallback to basic saveData
      try {
        await saveData(key, currentTimetable);
        console.log('[SIDEBAR] Timetable saved (fallback to local).');
      } catch (fallbackError) {
        console.error('[SIDEBAR] Fallback save also failed:', fallbackError);
      }
    }
  }
}, 500);

function handleSliderInput(event) {
  const newDuration = parseInt(event.target.value, 10);
  const valueDisplay = event.target.nextElementSibling;
  if (valueDisplay) {
    valueDisplay.textContent = `${newDuration} min`;
  }
}

function handleDurationChange(event) {
  const itemId = event.target.getAttribute('data-slide-id');
  const newDuration = parseInt(event.target.value, 10);

  const item = currentTimetable.items.find(i => i.id === itemId);
  if (item) {
    item.duration = newDuration;
    const newTimetable = recalculateTimetable(currentTimetable);
    renderTimetable(newTimetable);
    debouncedSave();
  }

  const displaySpan = event.target.nextElementSibling;
  if (displaySpan) {
    displaySpan.textContent = `${newDuration} min`;
  }
}

function recalculateTimetable(timetable) {
  const currentTime = new Date(`1970-01-01T${timetable.startTime}:00`);
  let totalDuration = 0;

  const newItems = timetable.items.map(item => {
    const itemStartTime = new Date(currentTime);
    const itemDuration = item.duration;

    currentTime.setMinutes(currentTime.getMinutes() + itemDuration);
    const itemEndTime = new Date(currentTime);

    totalDuration += itemDuration;

    return {
      ...item,
      startTime: itemStartTime.toTimeString().slice(0, 5),
      endTime: itemEndTime.toTimeString().slice(0, 5),
    };
  });

  return {
    ...timetable,
    items: newItems,
    totalDuration: totalDuration,
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SIDEBAR] DOMContentLoaded fired');
  await initializeInfrastructure();
  connectToBackground();
});

async function initializeInfrastructure() {
  try {
    console.log('[SIDEBAR] Initializing infrastructure...');

    await configManager.initialize();
    configInitialized = true;
    console.log('[SIDEBAR] ConfigManager initialized');

    await authManager.initialize();
    authInitialized = true;
    console.log('[SIDEBAR] AuthManager initialized');
    // Surface build-time Clerk key presence for debugging
    // Note: value is inlined at build time
    // Compile-time flag from Vite define
  console.log(
      '[SIDEBAR] Clerk key present at build:',
      typeof __HAS_CLERK_KEY__ !== 'undefined' ? __HAS_CLERK_KEY__ : 'unknown'
    );

    await renderSidebar();

    setupEventListeners();

    updateDebugInfo([], 'Infrastructure ready');

    console.log('[SIDEBAR] Infrastructure ready');
  } catch (error) {
    console.error('[SIDEBAR] Failed to initialize infrastructure:', error);
    console.log('[SIDEBAR] Continuing in fallback mode...');
  }
}

async function renderSidebar() {
  await renderAuthSection();
  await updateSyncControlsVisibility();
  // Other render functions can go here
}

async function renderAuthSection() {
  const authStatusBar = document.getElementById('auth-status-bar');
  if (!authStatusBar) return;

  const config = await configManager.getConfig();
  if (!config.features.authentication) {
    authStatusBar.style.display = 'none';
    return;
  }

  // Hide the top auth bar for now; toolbar button is the single source of truth for login
  authStatusBar.style.display = 'none';
}

function setupEventListeners() {
  authManager.addEventListener(async event => {
    console.log('[SIDEBAR] Auth state changed:', event.type);
    await renderAuthSection();
    await updateSyncControlsVisibility();
    updateDebugInfo(lastSlides, `Auth event: ${event.type}`);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setupAuthButtons() {
  const loginBtn = document.getElementById('auth-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      console.log('[SIDEBAR] Login button clicked');
      await authManager.login();
    });
  }

  const logoutBtn = document.getElementById('auth-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log('[SIDEBAR] Logout button clicked');
      await authManager.logout();
    });
  }
}

/**
 * Updates the visibility and state of sync controls based on authentication
 */
async function updateSyncControlsVisibility() {
  const cloudSyncSection = document.getElementById('cloud-sync-section');
  if (!cloudSyncSection) return;

  const config = configManager.getConfig();
  const isCloudSyncEnabled = config.features.cloudSync && config.environment.apiBaseUrl;
  
  if (!isCloudSyncEnabled) {
    cloudSyncSection.style.display = 'none';
    return;
  }

  try {
    const isAuthenticated = await authManager.isAuthenticated();
    
    if (isAuthenticated) {
      cloudSyncSection.style.display = 'block';
      
      // Enable sync buttons
      const saveBtn = document.getElementById('save-to-cloud-btn');
      const loadBtn = document.getElementById('load-from-cloud-btn');
      const autoSyncBtn = document.getElementById('auto-sync-toggle');
      
      if (saveBtn) saveBtn.disabled = false;
      if (loadBtn) loadBtn.disabled = false;
      if (autoSyncBtn) autoSyncBtn.disabled = false;
      
      // Set up event listeners if not already done
      setupSyncEventListeners();
      
      // Update sync status display
      await updateSyncStatusDisplay();
    } else {
      cloudSyncSection.style.display = 'none';
    }
  } catch (error) {
    console.warn('[SIDEBAR] Failed to check auth state for sync controls:', error);
    cloudSyncSection.style.display = 'none';
  }
}

/**
 * Sets up event listeners for sync buttons
 */
function setupSyncEventListeners() {
  const saveBtn = document.getElementById('save-to-cloud-btn');
  const loadBtn = document.getElementById('load-from-cloud-btn');
  const autoSyncBtn = document.getElementById('auto-sync-toggle');

  // Avoid duplicate listeners
  if (saveBtn && !saveBtn.dataset.listenerAttached) {
    saveBtn.addEventListener('click', handleSaveToCloud);
    saveBtn.dataset.listenerAttached = 'true';
  }

  if (loadBtn && !loadBtn.dataset.listenerAttached) {
    loadBtn.addEventListener('click', handleLoadFromCloud);
    loadBtn.dataset.listenerAttached = 'true';
  }

  if (autoSyncBtn && !autoSyncBtn.dataset.listenerAttached) {
    autoSyncBtn.addEventListener('click', handleAutoSyncToggle);
    autoSyncBtn.dataset.listenerAttached = 'true';
  }
}

/**
 * Handles manual save to cloud operation
 */
async function handleSaveToCloud() {
  if (!currentTimetable || !currentPresentationUrl) {
    showSyncMessage('No presentation data to save', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-to-cloud-btn');
  const originalText = saveBtn?.querySelector('.sync-btn-text')?.textContent;
  
  try {
    // Show saving state
    showSyncMessage('Saving to cloud...', 'info');
    updateSyncIndicator('syncing');
    if (saveBtn) {
      saveBtn.disabled = true;
      const textSpan = saveBtn.querySelector('.sync-btn-text');
      if (textSpan) textSpan.textContent = 'Saving...';
    }

    const config = configManager.getConfig();
    const apiBaseUrl = config.environment.apiBaseUrl;
    
    const syncResult = await defaultStorageManager.syncToCloud(
      currentPresentationUrl,
      currentTimetable,
      {
        apiBaseUrl,
        deviceAuth,
        title: currentTimetable.title || lastSlides[0]?.title || 'Untitled Presentation',
      }
    );

    if (syncResult.success) {
      showSyncMessage('Successfully saved to cloud!', 'success');
      updateSyncIndicator('synced');
      updateLastSyncTime();
      console.log('[SIDEBAR] Manual save to cloud successful');
    } else {
      throw new Error(syncResult.error || 'Failed to save to cloud');
    }
  } catch (error) {
    console.error('[SIDEBAR] Manual save to cloud failed:', error);
    showSyncMessage(`Save failed: ${error.message}`, 'error');
    updateSyncIndicator('error');
  } finally {
    // Restore button state
    if (saveBtn) {
      saveBtn.disabled = false;
      const textSpan = saveBtn.querySelector('.sync-btn-text');
      if (textSpan && originalText) textSpan.textContent = originalText;
    }
  }
}

/**
 * Handles manual load from cloud operation
 */
async function handleLoadFromCloud() {
  if (!currentPresentationUrl) {
    showSyncMessage('No presentation to load', 'error');
    return;
  }

  const loadBtn = document.getElementById('load-from-cloud-btn');
  const originalText = loadBtn?.querySelector('.sync-btn-text')?.textContent;
  
  try {
    // Show loading state
    showSyncMessage('Loading from cloud...', 'info');
    updateSyncIndicator('syncing');
    if (loadBtn) {
      loadBtn.disabled = true;
      const textSpan = loadBtn.querySelector('.sync-btn-text');
      if (textSpan) textSpan.textContent = 'Loading...';
    }

    const config = configManager.getConfig();
    const apiBaseUrl = config.environment.apiBaseUrl;
    
    const syncResult = await defaultStorageManager.syncFromCloud(
      currentPresentationUrl,
      {
        apiBaseUrl,
        deviceAuth,
      }
    );

    if (syncResult.success && syncResult.data) {
      const cloudTimetable = syncResult.data;
      
      // Check for conflicts (local is newer than cloud)
      const hasLocalConflict = currentTimetable && 
        currentTimetable.lastModified && 
        cloudTimetable.lastModified &&
        new Date(currentTimetable.lastModified) > new Date(cloudTimetable.lastModified);
      
      if (hasLocalConflict) {
        const shouldUseCloud = await showConflictResolutionDialog(currentTimetable, cloudTimetable);
        if (!shouldUseCloud) {
          showSyncMessage('Load cancelled - keeping local version', 'info');
          updateSyncIndicator('synced');
          return;
        }
      }
      
      // Apply cloud version
      currentTimetable = cloudTimetable;
      
      // Also save to local storage for offline access
      const timetableKey = `timetable-${currentPresentationUrl}`;
      await saveData(timetableKey, cloudTimetable);
      
      // Re-render the timetable with new data
      renderTimetable(cloudTimetable);
      
      showSyncMessage('Successfully loaded from cloud!', 'success');
      updateSyncIndicator('synced');
      updateLastSyncTime();
      console.log('[SIDEBAR] Manual load from cloud successful');
    } else if (syncResult.error === 'Presentation not found in cloud') {
      showSyncMessage('No cloud version found for this presentation', 'info');
      updateSyncIndicator('synced');
    } else {
      throw new Error(syncResult.error || 'Failed to load from cloud');
    }
  } catch (error) {
    console.error('[SIDEBAR] Manual load from cloud failed:', error);
    showSyncMessage(`Load failed: ${error.message}`, 'error');
    updateSyncIndicator('error');
  } finally {
    // Restore button state
    if (loadBtn) {
      loadBtn.disabled = false;
      const textSpan = loadBtn.querySelector('.sync-btn-text');
      if (textSpan && originalText) textSpan.textContent = originalText;
    }
  }
}

/**
 * Handles auto-sync toggle
 */
async function handleAutoSyncToggle() {
  const autoSyncBtn = document.getElementById('auto-sync-toggle');
  const textSpan = autoSyncBtn?.querySelector('.sync-btn-text');
  
  // For Sprint 2, we'll just toggle the UI state since auto-sync is already implemented
  // in the debouncedSave function via saveDataWithSync
  const isActive = autoSyncBtn?.classList.contains('active');
  
  if (isActive) {
    autoSyncBtn.classList.remove('active');
    if (textSpan) textSpan.textContent = 'Auto Sync: Off';
    showSyncMessage('Auto-sync disabled', 'info');
  } else {
    autoSyncBtn.classList.add('active');
    if (textSpan) textSpan.textContent = 'Auto Sync: On';
    showSyncMessage('Auto-sync enabled', 'success');
  }
  
  // Auto-sync is enabled by default in debouncedSave, so this is mostly UI feedback
  console.log('[SIDEBAR] Auto-sync toggled:', !isActive);
}

/**
 * Shows a sync status message to the user
 */
function showSyncMessage(message, type = 'info') {
  let messageElement = document.getElementById('sync-status-message');
  
  if (!messageElement) {
    // Create message element if it doesn't exist
    messageElement = document.createElement('div');
    messageElement.id = 'sync-status-message';
    messageElement.className = 'sync-status-message';
    
    const syncSection = document.getElementById('cloud-sync-section');
    if (syncSection) {
      syncSection.appendChild(messageElement);
    }
  }
  
  // Update message
  messageElement.textContent = message;
  messageElement.className = `sync-status-message ${type}`;
  messageElement.style.display = 'block';
  
  // Auto-hide after 3 seconds for success/info messages
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      if (messageElement) {
        messageElement.style.display = 'none';
      }
    }, 3000);
  }
}

/**
 * Updates the sync indicator status
 */
function updateSyncIndicator(status) {
  const indicator = document.getElementById('sync-indicator');
  if (!indicator) return;
  
  // Remove all status classes
  indicator.className = 'sync-indicator';
  
  // Add new status class
  indicator.classList.add(status);
  
  // Update indicator symbol based on status
  switch (status) {
    case 'synced':
      indicator.textContent = '●';
      break;
    case 'syncing':
      indicator.textContent = '⟳';
      break;
    case 'error':
      indicator.textContent = '⚠';
      break;
    case 'offline':
      indicator.textContent = '○';
      break;
    default:
      indicator.textContent = '●';
  }
}

/**
 * Updates the last sync time display
 */
function updateLastSyncTime() {
  const lastSyncElement = document.getElementById('last-sync-time');
  if (lastSyncElement) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastSyncElement.textContent = `Last sync: ${timeString}`;
  }
}

/**
 * Updates the sync status display
 */
async function updateSyncStatusDisplay() {
  try {
    const isAuthenticated = await authManager.isAuthenticated();
    
    if (isAuthenticated) {
      updateSyncIndicator('synced');
    } else {
      updateSyncIndicator('offline');
    }
  } catch (error) {
    updateSyncIndicator('error');
  }
}

/**
 * Shows conflict resolution dialog when local and cloud versions differ
 */
async function showConflictResolutionDialog(localTimetable, cloudTimetable) {
  return new Promise((resolve) => {
    const localTime = new Date(localTimetable.lastModified || 0).toLocaleString();
    const cloudTime = new Date(cloudTimetable.lastModified || 0).toLocaleString();
    
    const message = `Conflict detected:\n\n` +
      `Local version: ${localTime}\n` +
      `Cloud version: ${cloudTime}\n\n` +
      `Which version would you like to keep?`;
    
    // Simple confirm dialog for Sprint 2 - can be enhanced later
    const useCloud = confirm(
      `${message}\n\n` +
      `Click OK to use cloud version\n` +
      `Click Cancel to keep local version`
    );
    
    resolve(useCloud);
  });
}
