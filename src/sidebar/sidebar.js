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
let lastSlides = [];
let currentTimetable = null;
let port = null;

const updateUIWithNewSlides = async (slides) => {
  console.log('[SIDEBAR] updateUIWithNewSlides called with', slides?.length || 0, 'slides');
  const footerContainer = document.getElementById('sidebar-footer');
  lastSlides = slides || [];
  if (slides.length === 0) {
    // Handle case where there are no slides
    document.getElementById('sidebar-main').innerHTML = '<p>No slides detected in this Gamma presentation.</p>';
    if (footerContainer) {
        footerContainer.innerHTML = renderDebugInfo(slides, 'Received: slide-data (empty)');
    }
    return;
  }

  const timetableKey = await getTimetableKey();
  const storedTimetable = await loadData(timetableKey);

  const newTimetable = generateTimetable(slides, {
    startTime: storedTimetable?.startTime || '09:00',
    existingItems: storedTimetable?.items || []
  });

  renderTimetable(newTimetable);
  saveData(timetableKey, newTimetable); // Save the reconciled timetable immediately

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

  // Add a small delay before requesting slides to ensure the background script is ready
  setTimeout(() => {
    console.log('[SIDEBAR] Sending get-slides request...');
    if (port) {
      port.postMessage({ type: 'get-slides' });
      if (footerContainer) {
        footerContainer.innerHTML = renderDebugInfo([], 'Sent: get-slides');
      }
    }
  }, 100);

  port.onMessage.addListener((msg) => {
    console.log('[SIDEBAR] Received message from background:', msg);
    if (msg.type === 'slide-data') {
      console.log('[SIDEBAR] Received slide-data from background:', msg.slides?.length || 0, 'slides');
      updateUIWithNewSlides(msg.slides);
    } else if (msg.type === 'error') {
      console.error('[SIDEBAR] Error from background:', msg.message);
      document.getElementById('sidebar-main').innerHTML = `<p style="color: red;">${msg.message}</p>`;
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

async function getCurrentTabUrl() {
  try {
    return await new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (tabs[0] && tabs[0].url) {
          resolve(tabs[0].url);
        } else {
          console.warn('Could not get current tab URL. Falling back to default.');
          resolve('default-timetable');
        }
      });
    });
  } catch (error) {
    console.error('Error getting current tab URL:', error);
    return 'default-timetable'; // Fallback in case of error
  }
}

async function getTimetableKey() {
  const url = await getCurrentTabUrl();
  return `timetable-${url}`;
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

function renderDebugInfo(slides = [], lastAction = 'none') {
  const slideCount = slides.length;
  let firstSlide = slides[0] ? JSON.stringify(slides[0], null, 2) : 'N/A';
  return `
    <div class="debug-info">
      <strong>Debug Info</strong><br>
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
  
  const header = document.createElement('h3');
  header.innerHTML = `Timetable (Total: ${timetable.totalDuration} mins)`;
  
  const toolbar = document.createElement('div');
  toolbar.className = 'sticky-toolbar';

  const generateBtn = document.createElement('button');
  generateBtn.className = 'btn';
  generateBtn.textContent = 'Regenerate Timetable';
  generateBtn.onclick = () => {
    const startTime = prompt("Enter start time (e.g., 09:00):", "09:00");
    if(startTime) {
      const newTimetable = generateTimetable(lastSlides, { startTime });
      renderTimetable(newTimetable);
      getTimetableKey().then(key => saveData(key, newTimetable));
    }
  };
  toolbar.appendChild(generateBtn);

  const exportOptionsContainer = document.createElement('div');
  exportOptionsContainer.className = 'export-options';
  exportOptionsContainer.innerHTML = `
    <button id="export-csv-btn" class="export-btn">CSV</button>
    <button id="export-xlsx-btn" class="export-btn">Excel</button>
    <button id="copy-clipboard-btn" class="export-btn">Copy</button>
  `;
  toolbar.appendChild(exportOptionsContainer);

  mainContainer.innerHTML = ''; // Clear previous content
  mainContainer.appendChild(header);
  mainContainer.appendChild(toolbar);

  const exportCSVBtn = exportOptionsContainer.querySelector('#export-csv-btn');
  exportCSVBtn.onclick = () => {
    if (!currentTimetable) return;
    const csv = generateCSV(currentTimetable);
    const filename = `gamma-timetable-${new Date().toISOString().slice(0,10)}.csv`;
    downloadFile(filename, csv);
  };

  const exportXLSXBtn = exportOptionsContainer.querySelector('#export-xlsx-btn');
  exportXLSXBtn.onclick = () => {
    if (!currentTimetable) return;
    const blob = generateXLSX(currentTimetable);
    const filename = `gamma-timetable-${new Date().toISOString().slice(0,10)}.xlsx`;
    const url = URL.createObjectURL(blob);
    downloadFile(filename, url, true);
  };

  const copyClipboardBtn = exportOptionsContainer.querySelector('#copy-clipboard-btn');
  copyClipboardBtn.onclick = () => {
    if (!currentTimetable) return;
    const csv = generateCSV(currentTimetable);
    copyToClipboard(csv).then(() => {
        copyClipboardBtn.textContent = 'Copied!';
        setTimeout(() => { copyClipboardBtn.textContent = 'Copy'; }, 2000);
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
          <span style="font-size: 12px; color: #6b7280;">${item.startTime} - ${item.endTime}</span>
        </div>
      </div>
      <div class="duration-slider-container">
          <input type="range" min="0.5" max="30" value="${item.duration}" step="0.5" class="duration-slider" data-id="${item.id}">
          <span class="duration-value">${item.duration} min</span>
      </div>
      <div class="slide-item__content">
        ${contentHtml}
      </div>
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
        const key = await getTimetableKey();
        saveData(key, currentTimetable);
        console.log('Timetable saved.');
    }
}, 500);

function handleSliderInput(event) {
  const newDuration = parseFloat(event.target.value).toFixed(1);
  const valueDisplay = event.target.nextElementSibling;
  if (valueDisplay) {
    valueDisplay.textContent = `${newDuration} min`;
  }
}

function handleDurationChange(event) {
  const itemId = event.target.getAttribute('data-id');
  const newDuration = parseFloat(event.target.value);
  
  if (currentTimetable) {
    const item = currentTimetable.items.find(i => i.id === itemId);
    if (item) {
      item.duration = newDuration;
      const newTimetable = generateTimetable(currentTimetable.items, {
        startTime: currentTimetable.startTime
      });
      renderTimetable(newTimetable);
      debouncedSave();
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SIDEBAR] DOMContentLoaded fired');
  const versionDisplay = document.getElementById('version-display');

  if(versionDisplay) {
    versionDisplay.textContent = `v${EXT_VERSION}`;
  }

  // Establish the connection to the background script
  connectToBackground();
}); 