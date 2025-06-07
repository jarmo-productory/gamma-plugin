// sidebar.js - Receives slide data and displays it in the sidebar

// Placeholder: Replace with actual version from manifest.json during build
const EXT_VERSION = '0.1.0';

let connected = false;

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

  if (!slides.length) {
    mainContainer.innerHTML = '<p>No slides found on the current page.</p>';
  } else {
    mainContainer.innerHTML = ''; // Clear previous content
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
      mainContainer.appendChild(slideDiv);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const versionDisplay = document.getElementById('version-display');
  const footerContainer = document.getElementById('sidebar-footer');

  if(versionDisplay) {
    versionDisplay.textContent = `v${EXT_VERSION}`;
  }

  const updateUI = (slides = []) => {
    renderSlides(slides);
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