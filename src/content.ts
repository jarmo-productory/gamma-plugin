// content.ts - Gamma slide extraction logic

// The types are now handled by the @types/chrome package, so this is not needed.
// declare var chrome: any;

console.log('[CONTENT] Script loaded on:', window.location.href);

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
  console.log('[CONTENT] extractSlides() called');
  const slides: SlideData[] = [];
  const seenIds = new Set<string>();

  // Try multiple selectors to find slides
  const cardWrappers = document.querySelectorAll<HTMLDivElement>('div.card-wrapper[data-card-id]');
  console.log('[CONTENT] Found card wrappers with data-card-id:', cardWrappers.length);

  // Alternative selectors if the first one doesn't work
  if (cardWrappers.length === 0) {
    console.log('[CONTENT] No card-wrapper elements found, trying alternative selectors...');

    // Try looking for any element with data-card-id
    const anyCards = document.querySelectorAll('[data-card-id]');
    console.log('[CONTENT] Elements with data-card-id:', anyCards.length);

    // Try looking for slide-like structures
    const slideElements = document.querySelectorAll(
      '.card, .slide, [class*="card"], [class*="slide"]'
    );
    console.log('[CONTENT] Slide-like elements:', slideElements.length);

    // Log some sample elements to understand the structure
    if (anyCards.length > 0) {
      console.log('[CONTENT] Sample card element:', anyCards[0]);
      console.log('[CONTENT] Sample card classes:', anyCards[0].className);
      console.log('[CONTENT] Sample card parent:', anyCards[0].parentElement);
    }

    // Look at the DOM structure
    console.log('[CONTENT] Document body classes:', document.body.className);
    console.log('[CONTENT] Looking for gamma-specific selectors...');

    // Try to find gamma-specific elements
    const gammaElements = document.querySelectorAll(
      '[class*="gamma"], [id*="gamma"], [data-*="gamma"]'
    );
    console.log('[CONTENT] Gamma-related elements:', gammaElements.length);
  }

  console.log('[CONTENT] Document body:', document.body);
  console.log(
    '[CONTENT] All divs with data-card-id:',
    document.querySelectorAll('[data-card-id]').length
  );
  console.log(
    '[CONTENT] All elements with class card-wrapper:',
    document.querySelectorAll('.card-wrapper').length
  );

  // Log the first few elements to see what's actually in the DOM
  if (cardWrappers.length === 0) {
    console.log('[CONTENT] No slides found. Let me check what IS in the DOM:');
    console.log(
      '[CONTENT] Body innerHTML (first 1000 chars):',
      document.body.innerHTML.substring(0, 1000)
    );
    console.log('[CONTENT] All iframes:', document.querySelectorAll('iframe'));

    // Check if we're in an iframe
    if (window !== window.top) {
      console.log('[CONTENT] We are inside an iframe');
      console.log('[CONTENT] Frame URL:', window.location.href);
      console.log('[CONTENT] Parent URL:', document.referrer);
    } else {
      console.log('[CONTENT] We are in the main window');
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
  console.log('[CONTENT] Setting up MutationObserver');

  const processChanges = debounce(() => {
    console.log('[CONTENT] DOM change detected, re-sending slides.');
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
  console.log('[CONTENT] On gamma.app, initializing...');

  let port: chrome.runtime.Port | null = null;
  let reconnectTimeout: number | undefined;

  const connectToBackground = () => {
    try {
      port = chrome.runtime.connect({ name: 'content-script' });
      console.log('[CONTENT] Port created:', port);

      // Add error handling for port
      port.onDisconnect.addListener(() => {
        console.error('[CONTENT] Disconnected from background:', chrome.runtime.lastError);
        port = null;

        // Attempt to reconnect after a delay
        if (!reconnectTimeout) {
          reconnectTimeout = window.setTimeout(() => {
            console.log('[CONTENT] Attempting to reconnect...');
            reconnectTimeout = undefined;
            connectToBackground();
          }, 2000);
        }
      });

      // This function now sends slide data through the background script
      const sendSlidesToBackground = () => {
        if (!port) {
          console.error('[CONTENT] No port available, cannot send slides');
          return;
        }

        const slides = extractSlides();
        console.log('[CONTENT] Sending slides to background:', slides.length, 'slides');
        try {
          port.postMessage({ type: 'slide-data', slides: slides });
        } catch (error) {
          console.error('[CONTENT] Error sending slides:', error);
        }
      };

      // Listen for requests forwarded from the background script
      port.onMessage.addListener(msg => {
        console.log('[CONTENT] Received message from background:', msg);
        if (msg.type === 'get-slides') {
          console.log('[CONTENT] Content script received get-slides request from background.');
          sendSlidesToBackground();
        }
      });

      console.log('[CONTENT] Message listeners set up, connection established');

      // Send initial slide data after a short delay
      setTimeout(() => {
        console.log('[CONTENT] Sending initial slide data...');
        sendSlidesToBackground();
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
    console.log('[CONTENT] Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[CONTENT] DOMContentLoaded fired');
      // The connection logic now handles the observer setup
      // observeAndExtractSlides();
    });
  } else {
    console.log('[CONTENT] Document already loaded');
    // The connection logic now handles the observer setup
    // observeAndExtractSlides();
  }

  // Let's also do an initial extraction after a delay to see what's there
  setTimeout(() => {
    console.log('[CONTENT] Delayed extraction after 2 seconds:');
    extractSlides();
  }, 2000);
}
