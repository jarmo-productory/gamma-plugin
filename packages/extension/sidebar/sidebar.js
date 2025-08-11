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
    const storedTimetable = await loadData(timetableKey);

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
    <button id="test-api-btn" class="export-btn">Test API</button>
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
  const testApiBtn = exportOptionsContainer.querySelector('#test-api-btn');
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

  if (testApiBtn) {
    testApiBtn.onclick = async () => {
      try {
        const cfg = configManager.getConfig();
        const apiUrl = cfg.environment.apiBaseUrl || 'http://localhost:3000';
        const res = await deviceAuth.authorizedFetch(apiUrl, '/api/protected/ping', {
          method: 'GET',
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        console.log('[SIDEBAR] Protected ping OK:', data);
        updateDebugInfo(lastSlides, 'Protected ping OK');
      } catch (err) {
        console.error('[SIDEBAR] Protected ping failed:', err);
        updateDebugInfo(lastSlides, 'Protected ping failed');
      }
    };
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
  if (currentTimetable) {
    const key = `timetable-${currentPresentationUrl}`;
    saveData(key, currentTimetable);
    console.log('Timetable saved.');
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
