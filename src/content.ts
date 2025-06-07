// content.ts - Gamma slide extraction logic

// Add this at the top for TypeScript to recognize the Chrome extension API
declare var chrome: any;

interface ContentItem {
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
  const cardWrappers = document.querySelectorAll<HTMLDivElement>('div.card-wrapper[data-card-id]');

  cardWrappers.forEach((card, idx) => {
    try {
      const id = card.getAttribute('data-card-id') || `slide-${idx}`;
      // Extract title from .node-heading
      const heading = card.querySelector('.node-heading .heading [data-node-view-content-inner="heading"]');
      const title = heading ? heading.textContent?.trim() || '' : '';
      // Extract content from paragraphs, images, links, and lists
      const content: ContentItem[] = [];
      card.querySelectorAll('.node-paragraph, .node-image, .node-link, .node-list').forEach(node => {
        if (node.classList.contains('node-paragraph')) {
          content.push({ text: node.textContent?.trim() || '', subItems: [] });
        } else if (node.classList.contains('node-image')) {
          const img = node.querySelector('img');
          if (img && img.src) content.push({ text: `[Image: ${img.src}]`, subItems: [] });
        } else if (node.classList.contains('node-link')) {
          const link = node.querySelector('a');
          if (link && link.href) content.push({ text: `[Link: ${link.href}]`, subItems: [] });
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
                    content.push({ text: mainPoint, subItems: subPoints });
                }
            });
        }
      });
      // Hierarchy/level detection (placeholder: 0)
      slides.push({
        id,
        title,
        content,
        order: idx,
        level: 0
      });
    } catch (e) {
      // Error handling for DOM changes
      console.warn('Failed to extract slide', idx, e);
    }
  });
  return slides;
}

function observeAndExtractSlides() {
  let lastCount = 0;
  const observer = new MutationObserver(() => {
    const cards = document.querySelectorAll<HTMLDivElement>('div.card-wrapper[data-card-id]');
    if (cards.length && cards.length !== lastCount) {
      lastCount = cards.length;
      const slides = extractSlides();
      console.log('Extracted Gamma slides:', slides);
      try {
        chrome.runtime.sendMessage({ type: 'GAMMA_SLIDES', slides });
      } catch (e) {
        console.warn('Could not send slide data. Extension context may be invalidated.', e);
        observer.disconnect(); // Stop observing to prevent further errors
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (window.location.hostname.endsWith('gamma.app')) {
  observeAndExtractSlides();
} 