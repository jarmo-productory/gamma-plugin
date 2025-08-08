// sidebar.js - Receives slide data and displays it in the sidebar

console.log('[SIDEBAR] Script loaded');

// The version is injected by the build process, with a fallback for development
const EXT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'DEV';

import {
  generateTimetable,
  generateCSV,
  downloadFile,
  generateXLSX,
  copyToClipboard,
} from '../lib/timetable.js';
import { saveData, loadData, debounce } from '../lib/storage.js';

let connected = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let lastSlides = [];
let currentTimetable = null;
let port = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let currentTabId = null;
let currentPresentationUrl = null; // Track the current presentation

/**
 * Reconciles fresh slide data with the existing timetable, preserving user-set durations.
 * @param {Array} newSlides - The fresh slide data from the content script.
 */
function reconcileAndUpdate(newSlides) {
  if (!currentTimetable) {
    // If there's no timetable yet, generate a fresh one.
    console.log('[SIDEBAR] No current timetable, generating a new one.');
    const newTimetable = generateTimetable(newSlides);
    renderTimetable(newTimetable);
    debouncedSave();
    return;
  }

  console.log('[SIDEBAR] Reconciling new slide data with existing timetable.');
  const newItems = [];
  const existingItemsMap = new Map(currentTimetable.items.map(item => [item.id, item]));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const newSlidesMap = new Map(newSlides.map(slide => [slide.id, slide]));

  // 1. Go through new slides to update existing items and add new ones
  for (const slide of newSlides) {
    const existingItem = existingItemsMap.get(slide.id);
    if (existingItem) {
      // This slide already exists. Update its content but keep the duration.
      newItems.push({
        ...existingItem, // This keeps the user's duration
        title: slide.title,
        content: slide.content,
        // order and level might be useful to update too if they change
      });
    } else {
      // This is a new slide. Add it with a default duration.
      newItems.push({
        ...slide,
        duration: 5, // Default duration for new slides
      });
    }
  }

  // 2. Update the timetable with the reconciled list of items.
  currentTimetable.items = newItems;

  // 3. Recalculate all times and render the updated timetable.
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

  const footerContainer = document.getElementById('sidebar-footer');
  if (slides.length === 0) {
    document.getElementById('sidebar-main').innerHTML =
      '<p>No slides detected in this Gamma presentation.</p>';
    if (footerContainer)
      footerContainer.innerHTML = renderDebugInfo(slides, 'Received: slide-data (empty)');
    return;
  }

  const presentationUrl = slides[0]?.presentationUrl;
  if (!presentationUrl) return; // Cannot proceed without a unique URL

  // Check if we have switched to a new presentation
  if (presentationUrl !== currentPresentationUrl) {
    console.log(
      `[SIDEBAR] Switched to new presentation: ${presentationUrl}. Loading from storage...`
    );
    currentPresentationUrl = presentationUrl; // Update the current presentation tracker

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

  // With the correct timetable loaded (or created), reconcile the latest slide content.
  // This function will use the `currentTimetable` which is now the single source of truth.
  reconcileAndUpdate(slides);

  if (footerContainer) {
    footerContainer.innerHTML = renderDebugInfo(slides, 'Rendered: slide-data');
  }
};

function connectToBackground() {
  console.log('[SIDEBAR] Connecting to background script...');
  port = chrome.runtime.connect({ name: 'sidebar' });
  console.log('[SIDEBAR] Connected to background');

  // Add error handling for the port
  if (!port) {
    console.error('[SIDEBAR] Failed to create port connection');
    return;
  }

  // Set connected status
  connected = true;
  const footerContainer = document.getElementById('sidebar-footer');
  if (footerContainer) {
    footerContainer.innerHTML = renderDebugInfo([], 'Connected to background');
  }

  // DO NOT request slides immediately. Wait for the background script
  // to tell us which tab is active.

  port.onMessage.addListener(msg => {
    console.log('[SIDEBAR] Received message from background:', msg);
    if (msg.type === 'slide-data') {
      console.log(
        '[SIDEBAR] Received slide-data for tab',
        msg.tabId,
        'with',
        msg.slides?.length || 0,
        'slides'
      );
      // This is the entry point for updates from the content script
      updateUIWithNewSlides(msg.slides, msg.tabId);
    } else if (msg.type === 'gamma-tab-activated') {
      console.log(`[SIDEBAR] Gamma tab ${msg.tabId} activated. Requesting new slides.`);
      currentTabId = msg.tabId;
      // Clear current content and show loading state
      document.getElementById('sidebar-main').innerHTML = '<p>Loading timetable...</p>';
      port.postMessage({ type: 'get-slides' });
    } else if (msg.type === 'show-message') {
      console.log(`[SIDEBAR] Displaying message: ${msg.message}`);
      document.getElementById('sidebar-main').innerHTML = `<p>${msg.message}</p>`;
      // also clear the header
      const titleElement = document.getElementById('timetable-title');
      if (titleElement) {
        titleElement.textContent = 'Gamma Timetable';
      }
      const durationBadge = document.getElementById('duration-badge');
      if (durationBadge) {
        durationBadge.textContent = '0h 0m';
      }
    } else if (msg.type === 'error') {
      console.error('[SIDEBAR] Error from background:', msg.message);
      document.getElementById('sidebar-main').innerHTML =
        `<p style="color: red;">${msg.message}</p>`;
      const footerContainer = document.getElementById('sidebar-footer');
      if (footerContainer) {
        footerContainer.innerHTML = renderDebugInfo([], 'Error: ' + msg.message);
      }
    }
  });

  port.onDisconnect.addListener(() => {
    port = null;
    connected = false;
    console.log('[SIDEBAR] Disconnected from background script.');
    // Optionally show a disconnected state in the UI
    const footerContainer = document.getElementById('sidebar-footer');
    if (footerContainer) {
      footerContainer.innerHTML = renderDebugInfo([], 'Disconnected');
    }
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

function renderDebugInfo(slides = [], lastAction = 'none') {
  const slideCount = slides.length;
  const firstSlide = slides[0] ? JSON.stringify(slides[0], null, 2) : 'N/A';
  return `
    <div class="debug-info">
      <strong>Debug Info (v${EXT_VERSION})</strong><br>
      Slides Detected: <strong>${slideCount}</strong><br>
      Connection Status: <span style="color:${connected ? 'green' : 'red'};font-weight:bold;">${connected ? 'Connected' : 'Disconnected'}</span><br>
      Last Action: <span style="font-family: monospace;">${lastAction}</span><br>
      <details><summary>First Slide Preview</summary><pre>${firstSlide}</pre></details>
    </div>
  `;
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
  toolbar.innerHTML = ''; // Clear previous content

  const timeDisplaySection = document.createElement('div');
  timeDisplaySection.className = 'time-display-section';

  // Prepend the time input to the time display section
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
    <button id="export-csv-btn" class="export-btn"><img src="/assets/csv.svg" alt="CSV">CSV</button>
    <button id="export-xlsx-btn" class="export-btn"><img src="/assets/xlsx.svg" alt="Excel">Excel</button>
    <button id="copy-clipboard-btn" class="export-btn copy-btn-icon-only"><img src="/assets/copy.svg" alt="Copy"></button>
  `;
  toolbar.appendChild(exportOptionsContainer);

  mainContainer.innerHTML = ''; // Clear previous content

  const exportCSVBtn = exportOptionsContainer.querySelector('#export-csv-btn');
  exportCSVBtn.onclick = () => {
    if (!currentTimetable) return;
    const csv = generateCSV(currentTimetable);
    const filename = `gamma-timetable-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(filename, csv);
  };

  const exportXLSXBtn = exportOptionsContainer.querySelector('#export-xlsx-btn');
  exportXLSXBtn.onclick = () => {
    if (!currentTimetable) return;
    const blob = generateXLSX(currentTimetable);
    const filename = `gamma-timetable-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = URL.createObjectURL(blob);
    downloadFile(filename, url, true);
  };

  const copyClipboardBtn = exportOptionsContainer.querySelector('#copy-clipboard-btn');
  copyClipboardBtn.onclick = () => {
    if (!currentTimetable) return;
    const csv = generateCSV(currentTimetable);
    copyToClipboard(csv).then(() => {
      copyClipboardBtn.classList.add('copied');
      setTimeout(() => {
        copyClipboardBtn.classList.remove('copied');
      }, 2000);
    });
  };

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

  const durationSliders = mainContainer.querySelectorAll('.duration-slider');
  durationSliders.forEach(slider => {
    slider.addEventListener('input', handleSliderInput);
    slider.addEventListener('change', handleDurationChange);
  });
}

const debouncedSave = debounce(async () => {
  if (currentTimetable) {
    // The presentation URL is now stored on the timetable object itself
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

  // Update the displayed duration value
  const displaySpan = event.target.nextElementSibling;
  if (displaySpan) {
    displaySpan.textContent = `${newDuration} min`;
  }
}

/**
 * Recalculates all start and end times in a timetable based on the items' durations.
 * This should be called after a duration or start time changes.
 * @param {object} timetable The timetable object to recalculate.
 * @returns {object} The recalculated timetable object.
 */
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
      ...item, // Preserve id, title, content, etc.
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

  // Establish the connection to the background script
  connectToBackground();
});
