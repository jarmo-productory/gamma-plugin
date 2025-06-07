// background.js - Chrome Extension Service Worker
// Handles extension lifecycle events and message relay

let latestSlides = [];

chrome.runtime.onInstalled.addListener(() => {
  // Placeholder: Initialization logic here
  console.log('Gamma Timetable Extension installed.');
});

// Listen for slide data from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GAMMA_SLIDES' && Array.isArray(msg.slides)) {
    latestSlides = msg.slides;
    // Optionally, broadcast to all side panel views
    chrome.runtime.sendMessage({ type: 'GAMMA_SLIDES', slides: latestSlides });
  }
});

// Listen for requests from the sidebar
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'REQUEST_GAMMA_SLIDES') {
    sendResponse({ slides: latestSlides });
  }
}); 