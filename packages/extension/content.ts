// content.ts - Gamma slide extraction logic

// The types are now handled by the @types/chrome package, so this is not needed.
// declare var chrome: any;

// Content script loaded

// Debounce function
function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: number | undefined;
  return function (...args: Parameters<F>) {
    // Note: Arrow function avoids 'this' aliasing issue
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

interface ContentItem {
  type: 'paragraph' | 'image' | 'link' | 'list_item';
  text: string;
  subItems: string[];
}

interface SlideData {
  id: string;
  title: string;
  content: ContentItem[];
  order: number;
  level: number;
  presentationUrl: string;
}

function extractSlides(): SlideData[] {
  // extractSlides() called
  const slides: SlideData[] = [];
  const seenIds = new Set<string>();

  // Try multiple selectors to find slides
  const cardWrappers = document.querySelectorAll<HTMLDivElement>('div.card-wrapper[data-card-id]');
  // Found card wrappers with data-card-id

  // Alternative selectors if the first one doesn't work
  if (cardWrappers.length === 0) {
    // No card-wrapper elements found, trying alternative selectors

    // Try looking for any element with data-card-id
    const anyCards = document.querySelectorAll('[data-card-id]');
    // Elements with data-card-id found

    // Try looking for slide-like structures
    const slideElements = document.querySelectorAll(
      '.card, .slide, [class*="card"], [class*="slide"]'
    );
    // Slide-like elements found

    // Log some sample elements to understand the structure
    if (anyCards.length > 0) {
      // Sample card element debugging info available
    }

    // Look at the DOM structure
    // Looking for gamma-specific selectors

    // Try to find gamma-specific elements
    const gammaElements = document.querySelectorAll(
      '[class*="gamma"], [id*="gamma"], [data-*="gamma"]'
    );
    // Gamma-related elements found
  }

  // Document body available
  // All divs with data-card-id counted
  // All elements with class card-wrapper counted

  // Log the first few elements to see what's actually in the DOM
  if (cardWrappers.length === 0) {
    // No slides found, checking DOM
    // Body innerHTML (first 1000 chars) available
    // All iframes found

    // Check if we're in an iframe
    if (window !== window.top) {
      // We are inside an iframe
    } else {
      // We are in the main window
    }
  }

  cardWrappers.forEach((card, idx) => {
    try {
      const id = card.getAttribute('data-card-id');
      if (!id || seenIds.has(id)) {
        return; // Skip if no ID or if it's a duplicate
      }
      seenIds.add(id);

      const level = parseInt(card.getAttribute('data-card-depth') || '0', 10);
      const heading = card.querySelector(
        '.node-heading .heading [data-node-view-content-inner="heading"]'
      );
      const title = heading ? heading.textContent?.trim() || '' : '';

      const content: ContentItem[] = [];
      card
        .querySelectorAll('.node-paragraph, .node-image, .node-link, .node-list')
        .forEach(node => {
          if (node.classList.contains('node-paragraph')) {
            content.push({ type: 'paragraph', text: node.textContent?.trim() || '', subItems: [] });
          } else if (node.classList.contains('node-image')) {
            const img = node.querySelector('img');
            if (img && img.src) content.push({ type: 'image', text: img.src, subItems: [] });
          } else if (node.classList.contains('node-link')) {
            const link = node.querySelector('a');
            if (link && link.href) content.push({ type: 'link', text: link.href, subItems: [] });
          } else if (node.classList.contains('node-list')) {
            const listItems = node.querySelectorAll(
              'div[data-node-view-content-inner="list-item"]'
            );
            listItems.forEach(li => {
              const mainPoint = li.childNodes[0]?.textContent?.trim() || '';
              const subPoints: string[] = [];
              const nestedList = li.querySelector('div[data-node-view-content-inner="list"]');
              if (nestedList) {
                nestedList
                  .querySelectorAll('div[data-node-view-content-inner="list-item"]')
                  .forEach(subLi => {
                    subPoints.push(subLi.textContent?.trim() || '');
                  });
              }
              if (mainPoint) {
                content.push({ type: 'list_item', text: mainPoint, subItems: subPoints });
              }
            });
          }
        });

      slides.push({ id, title, content, order: idx, level, presentationUrl: window.location.href });
    } catch (e) {
      console.error(`Error processing slide ${idx}:`, e);
    }
  });
  return slides;
}

function observeAndExtractSlides(sendSlidesFn: () => void) {
  // Setting up MutationObserver

  const processChanges = debounce(() => {
    // DOM change detected, re-sending slides
    sendSlidesFn();
  }, 250); // Debounce for 250ms to batch rapid changes

  const observer = new MutationObserver(_mutations => {
    // For simplicity and robustness, we'll just trigger on any change
    // without trying to be too clever about what changed.
    processChanges();
  });

  // Observe the entire body for any changes to structure, attributes, or text.
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
}

if (window.location.hostname.endsWith('gamma.app')) {
  // On gamma.app, initializing

  let port: chrome.runtime.Port | null = null;
  let reconnectTimeout: number | undefined;
  let lastKnownSlides: SlideData[] = []; // Cache last extracted slides for heartbeat responses

  const connectToBackground = () => {
    try {
      port = chrome.runtime.connect({ name: 'content-script' });
      // Port created

      // Add error handling for port
      port.onDisconnect.addListener(() => {
        console.error('[CONTENT] Disconnected from background:', chrome.runtime.lastError);
        port = null;

        // Attempt to reconnect after a delay
        if (!reconnectTimeout) {
          reconnectTimeout = window.setTimeout(() => {
            // Attempting to reconnect
            reconnectTimeout = undefined;
            connectToBackground();
          }, 2000);
        }
      });

      // This function now sends slide data through the background script
      const sendSlidesToBackground = (forceUpdate = false) => {
        if (!port) {
          console.error('[CONTENT] No port available, cannot send slides');
          return;
        }

        const slides = extractSlides();
        
        // Update cache with latest slides
        const hasChanges = JSON.stringify(lastKnownSlides) !== JSON.stringify(slides);
        lastKnownSlides = slides;
        
        // Sending slides to background
        try {
          port.postMessage({ 
            type: 'slide-data', 
            slides: slides,
            hasChanges: hasChanges || forceUpdate // Signal if this is a real change or just heartbeat
          });
        } catch (error) {
          console.error('[CONTENT] Error sending slides:', error);
        }
      };

      // Listen for requests forwarded from the background script
      port.onMessage.addListener(msg => {
        // Received message from background
        if (msg.type === 'get-slides') {
          // Content script received get-slides request from background
          // Always respond to keep the health monitor happy, even if no changes
          sendSlidesToBackground();
        }
      });

      // Message listeners set up, connection established

      // Send initial slide data after a short delay
      setTimeout(() => {
        // Sending initial slide data
        sendSlidesToBackground(true); // Force update flag for initial load
      }, 1000);

      // Start observing for DOM changes and pass the sender function
      observeAndExtractSlides(sendSlidesToBackground);
    } catch (error) {
      console.error('[CONTENT] Failed to connect to background:', error);
    }
  };

  // Initial connection
  connectToBackground();

  // Defer the observer until the DOM is ready.
  if (document.readyState === 'loading') {
    // Document still loading, waiting for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
      // DOMContentLoaded fired
      // The connection logic now handles the observer setup
      // observeAndExtractSlides();
    });
  } else {
    // Document already loaded
    // The connection logic now handles the observer setup
    // observeAndExtractSlides();
  }

  // Let's also do an initial extraction after a delay to see what's there
  setTimeout(() => {
    // Delayed extraction after 2 seconds
    extractSlides();
  }, 2000);
}
