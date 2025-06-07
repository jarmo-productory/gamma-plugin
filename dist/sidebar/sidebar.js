// sidebar.js - Receives slide data and displays it in the sidebar

// Placeholder: Replace with actual version from manifest.json during build
const EXT_VERSION = '0.1.0';

import { generateTimetable, generateCSV, downloadFile } from '../lib/timetable.js';

let connected = false;
let lastSlides = [];

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

function renderSlides(slides = []) {
  const mainContainer = document.getElementById('sidebar-main');
  
  if (!mainContainer) return;
  mainContainer.innerHTML = ''; // Clear previous content

  // Add "Generate Timetable" button
  const generateBtn = document.createElement('button');
  generateBtn.id = 'generate-btn';
  generateBtn.textContent = 'Generate Timetable';
  generateBtn.onclick = () => {
    const timetable = generateTimetable(lastSlides);
    renderTimetable(timetable);
  };
  mainContainer.appendChild(generateBtn);

  const slideList = document.createElement('div');
  slideList.id = 'slide-list';
  mainContainer.appendChild(slideList);

  if (!slides.length) {
    slideList.innerHTML = '<p>No slides found on the current page.</p>';
  } else {
    slides.forEach(slide => {
      const slideDiv = document.createElement('div');
      slideDiv.className = 'slide-item';
      const title = document.createElement('h3');
      title.className = 'slide-item__title';
      title.textContent = slide.title || '(Untitled Slide)';
      const contentList = document.createElement('ul');
      contentList.className = 'slide-item__content';
      slide.content.forEach(c => {
        const li = document.createElement('li');
        li.textContent = c;
        contentList.appendChild(li);
      });
      slideDiv.appendChild(title);
      slideDiv.appendChild(contentList);
      slideList.appendChild(slideDiv);
    });
  }
}

function renderTimetable(timetable) {
  const mainContainer = document.getElementById('sidebar-main');
  if (!mainContainer) return;
  
  const header = document.createElement('h3');
  header.innerHTML = `Timetable (Total: ${timetable.totalDuration} mins)`;
  
  const exportBtn = document.createElement('button');
  exportBtn.id = 'export-btn';
  exportBtn.textContent = 'Export to CSV';
  exportBtn.onclick = () => {
    const csv = generateCSV(timetable);
    const filename = `gamma-timetable-${new Date().toISOString().slice(0,10)}.csv`;
    downloadFile(filename, csv);
  };

  mainContainer.innerHTML = ''; // Clear previous content
  mainContainer.appendChild(header);
  mainContainer.appendChild(exportBtn);

  timetable.items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'slide-item';
    itemDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h3 class="slide-item__title">${item.title}</h3>
        <span style="font-size: 12px; color: #6b7280;">${item.startTime} - ${item.endTime} (${item.duration}m)</span>
      </div>
    `;
    mainContainer.appendChild(itemDiv);
  });
}

document.addEventListener('DOMContentLoaded', () => {
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

  // Initial load
  chrome.runtime.sendMessage({ type: 'REQUEST_GAMMA_SLIDES' }, (response) => {
    connected = true;
    updateUI(response?.slides);
  });

  // Listen for live updates
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GAMMA_SLIDES' && Array.isArray(msg.slides)) {
      connected = true;
      updateUI(msg.slides);
    }
  });
}); 