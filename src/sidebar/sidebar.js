// sidebar.js - Receives slide data and displays it in the sidebar

// Placeholder: Replace with actual version from manifest.json during build
const EXT_VERSION = '0.1.0';

import {
  generateTimetable,
  generateCSV,
  downloadFile,
  generateXLSX,
  generatePDF,
  copyToClipboard,
} from '../lib/timetable.js';
import { saveData, loadData, debounce } from '../lib/storage.js';

let connected = false;
let lastSlides = [];
let currentTimetable = null;

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

function renderDebugInfo(slides = []) {
  const slideCount = slides.length;
  let firstSlide = slides[0] ? JSON.stringify(slides[0], null, 2) : 'N/A';
  return `
    <div class="debug-info">
      <strong>Debug Info</strong><br>
      Slides Detected: <strong>${slideCount}</strong><br>
      Connected: <span style="color:${connected ? 'green' : 'red'};font-weight:bold;">${connected ? 'Yes' : 'No'}</span><br>
      <details><summary>First Slide Preview</summary><pre>${firstSlide}</pre></details>
    </div>
  `;
}

function renderSlides(slides) {
  const mainContainer = document.getElementById('sidebar-main');
  if (!mainContainer) return;
  mainContainer.innerHTML = ''; // Clear previous content

  slides.forEach(slide => {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'slide-item';
    const contentHtml = generateContentHtml(slide.content);

    slideDiv.innerHTML = `
      <h3 class="slide-item__title">${slide.title}</h3>
      <div class="slide-item__content">
        ${contentHtml}
      </div>
    `;
    mainContainer.appendChild(slideDiv);
  });

  // Add "Generate Timetable" button
  const generateBtn = document.createElement('button');
  generateBtn.className = 'btn';
  generateBtn.textContent = 'Generate Timetable';
  generateBtn.onclick = () => {
    const startTime = prompt("Enter start time (e.g., 09:00):", "09:00");
    if(startTime) {
      const timetable = generateTimetable(slides, { startTime });
      renderTimetable(timetable);
      getTimetableKey().then(key => saveData(key, timetable));
    }
  };
  mainContainer.appendChild(generateBtn);
}

function renderTimetable(timetable) {
  currentTimetable = timetable;
  const mainContainer = document.getElementById('sidebar-main');
  if (!mainContainer) return;
  
  const header = document.createElement('h3');
  header.innerHTML = `Timetable (Total: ${timetable.totalDuration} mins)`;
  
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

  const exportOptionsContainer = document.createElement('div');
  exportOptionsContainer.className = 'export-options';
  exportOptionsContainer.innerHTML = `
    <button id="export-csv-btn" class="export-btn">CSV</button>
    <button id="export-xlsx-btn" class="export-btn">Excel</button>
    <button id="export-pdf-btn" class="export-btn">PDF</button>
    <button id="copy-clipboard-btn" class="export-btn">Copy</button>
  `;

  mainContainer.innerHTML = ''; // Clear previous content
  mainContainer.appendChild(header);
  mainContainer.appendChild(generateBtn);
  mainContainer.appendChild(exportOptionsContainer);

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

  const exportPDFBtn = exportOptionsContainer.querySelector('#export-pdf-btn');
  exportPDFBtn.onclick = () => {
    if (!currentTimetable) return;
    generatePDF(currentTimetable);
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
          <input type="range" min="0" max="15" value="${item.duration}" class="duration-slider" data-id="${item.id}">
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
    slider.addEventListener('input', handleDurationChange);
  });
}

const debouncedSave = debounce(async () => {
    if (currentTimetable) {
        const key = await getTimetableKey();
        saveData(key, currentTimetable);
        console.log('Timetable saved.');
    }
}, 500);

function handleDurationChange(event) {
  const itemId = event.target.getAttribute('data-id');
  const newDuration = parseInt(event.target.value, 10);
  
  // Update the value display next to the slider
  const valueDisplay = event.target.nextElementSibling;
  if(valueDisplay) {
    valueDisplay.textContent = `${newDuration} min`;
  }

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
  const versionDisplay = document.getElementById('version-display');
  const footerContainer = document.getElementById('sidebar-footer');

  if(versionDisplay) {
    versionDisplay.textContent = `v${EXT_VERSION}`;
  }

  const updateUI = (slides = []) => {
    lastSlides = slides || [];
    renderSlides(lastSlides);
    if(footerContainer) {
      footerContainer.innerHTML = renderDebugInfo(slides);
    }
  }

  // Initial load from storage or slides
  try {
    const timetableKey = await getTimetableKey();
    const savedTimetable = await loadData(timetableKey);
    if (savedTimetable) {
      renderTimetable(savedTimetable);
    } else {
        chrome.runtime.sendMessage({ type: 'REQUEST_GAMMA_SLIDES' }, (response) => {
          connected = true;
          updateUI(response?.slides);
        });
    }
  } catch (error) {
    console.error('Failed to load initial data:', error);
    // Fallback to requesting slides if storage fails
    chrome.runtime.sendMessage({ type: 'REQUEST_GAMMA_SLIDES' }, (response) => {
      connected = true;
      updateUI(response?.slides);
    });
  }

  // Listen for live updates
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GAMMA_SLIDES') {
      console.log('Received live slide update:', msg.slides);
      connected = true;
      lastSlides = msg.slides || [];
      // If a timetable is already displayed, regenerate it to incorporate changes.
      // Otherwise, the initial render logic will handle it.
      if (currentTimetable) {
        const newTimetable = generateTimetable(lastSlides, {
          startTime: currentTimetable.startTime,
        });
        renderTimetable(newTimetable);
        debouncedSave();
      } else {
        // If we are in the initial view, just re-render the slides list.
        updateUI(lastSlides);
      }
    }
  });
}); 