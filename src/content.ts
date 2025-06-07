// content.ts - Gamma slide extraction logic

interface SlideData {
  id: string;
  title: string;
  content: string[];
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
      // Extract content from paragraphs, images, links
      const content: string[] = [];
      card.querySelectorAll('.node-paragraph, .node-image, .node-link').forEach(node => {
        if (node.classList.contains('node-paragraph')) {
          content.push(node.textContent?.trim() || '');
        } else if (node.classList.contains('node-image')) {
          const img = node.querySelector('img');
          if (img && img.src) content.push(`[Image: ${img.src}]`);
        } else if (node.classList.contains('node-link')) {
          const link = node.querySelector('a');
          if (link && link.href) content.push(`[Link: ${link.href}]`);
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

// For development: log extracted slides
if (window.location.hostname.endsWith('gamma.app')) {
  const slides = extractSlides();
  console.log('Extracted Gamma slides:', slides);
} 