// content.ts - Gamma slide extraction logic

// Add this at the top for TypeScript to recognize the Chrome extension API
declare var chrome: any;

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
  let timeout: number | undefined;
  return function(this: any, ...args: Parameters<F>) {
    const context = this;
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(context, args), wait);
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
}

function extractSlides(): SlideData[] {
  const slides: SlideData[] = [];
  const seenIds = new Set<string>();
  const cardWrappers = document.querySelectorAll<HTMLDivElement>('div.card-wrapper[data-card-id]');

  cardWrappers.forEach((card, idx) => {
    try {
      const id = card.getAttribute('data-card-id');
      if (!id || seenIds.has(id)) {
        return; // Skip if no ID or if it's a duplicate
      }
      seenIds.add(id);

      const level = parseInt(card.getAttribute('data-card-depth') || '0', 10);
      const heading = card.querySelector('.node-heading .heading [data-node-view-content-inner="heading"]');
      const title = heading ? heading.textContent?.trim() || '' : '';
      
      const content: ContentItem[] = [];
      card.querySelectorAll('.node-paragraph, .node-image, .node-link, .node-list').forEach(node => {
        if (node.classList.contains('node-paragraph')) {
          content.push({ type: 'paragraph', text: node.textContent?.trim() || '', subItems: [] });
        } else if (node.classList.contains('node-image')) {
          const img = node.querySelector('img');
          if (img && img.src) content.push({ type: 'image', text: img.src, subItems: [] });
        } else if (node.classList.contains('node-link')) {
          const link = node.querySelector('a');
          if (link && link.href) content.push({ type: 'link', text: link.href, subItems: [] });
        } else if (node.classList.contains('node-list')) {
            const listItems = node.querySelectorAll('div[data-node-view-content-inner="list-item"]');
            listItems.forEach(li => {
                const mainPoint = li.childNodes[0]?.textContent?.trim() || '';
                const subPoints: string[] = [];
                const nestedList = li.querySelector('div[data-node-view-content-inner="list"]');
                if (nestedList) {
                    nestedList.querySelectorAll('div[data-node-view-content-inner="list-item"]').forEach(subLi => {
                        subPoints.push(subLi.textContent?.trim() || '');
                    });
                }
                if(mainPoint) {
                    content.push({ type: 'list_item', text: mainPoint, subItems: subPoints });
                }
            });
        }
      });

      slides.push({ id, title, content, order: idx, level });
    } catch (e) {
      console.error(`Error processing slide ${idx}:`, e);
    }
  });
  return slides;
}

function observeAndExtractSlides() {
  const processChanges = debounce(() => {
    const slides = extractSlides();
    console.log('Re-extracting slides due to DOM change:', slides);
    try {
      chrome.runtime.sendMessage({ type: 'GAMMA_SLIDES', slides });
    } catch (e) {
      console.warn('Could not send slide data. Extension context may be invalidated.', e);
      observer.disconnect();
    }
  }, 500); // Debounce for 500ms

  const observer = new MutationObserver((mutations) => {
    let changed = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const isCard = (node: Node): boolean =>
          node instanceof HTMLElement && node.matches('div.card-wrapper[data-card-id]');

        for (const node of Array.from(mutation.addedNodes)) {
          if (isCard(node) || (node instanceof HTMLElement && node.querySelector('div.card-wrapper[data-card-id]'))) {
            console.log('Relevant card added:', node);
            changed = true;
            break;
          }
        }
        if (changed) break;

        for (const node of Array.from(mutation.removedNodes)) {
          if (isCard(node)) {
            console.log('Relevant card removed:', node);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }

    if (changed) {
      processChanges();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (window.location.hostname.endsWith('gamma.app')) {
  observeAndExtractSlides();
} 