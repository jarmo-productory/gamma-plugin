# Gamma Card HTML Structure Analysis

This document breaks down the HTML structure of a single "card" or slide as exported from Gamma.app. This analysis is based on the provided `gamma-dom-example.html` file.

## Key Identifiers

The most reliable way to uniquely identify and target a specific card is by its `data-card-id` attribute.

- **Card ID**: `data-card-id` on the `.card-wrapper` element.
  - *Example*: `data-card-id="qmpox6pls8j7jc2"`

## Core Card Structure

The card is composed of several nested `div` elements. Here is the high-level hierarchy:

```html
<div class="react-renderer node-card block block-card">
    <div as="div" data-node-view-wrapper="">
        <div data-card-id="..." class="card-wrapper card-expanded ...">
            <div class="card-body ..." data-card-body="...">
                <div class="card-body-background ..."></div>
                <div data-theme="dark" class="card-layout ...">
                    <!-- Toolbar and drag handle elements -->
                    <div dir="ltr" class="card-content ...">
                        <div data-node-view-content-inner="card">
                            <!-- Content Blocks (headings, images, paragraphs, etc.) go here -->
                        </div>
                    </div>
                </div>
            </div>
            <div data-theme="dark" contenteditable="false" class="card-divider ...">
                <!-- "Add card" button group -->
            </div>
        </div>
    </div>
</div>
```

- **`.card-wrapper`**: The top-level container for a single card. It holds the unique `data-card-id`.
- **`.card-body`**: Contains the card's visible content and background styling.
- **`.card-layout`**: Organizes the content within the card, including toolbar elements.
- **`.card-content`**: A direct wrapper for the actual content blocks that make up the slide.

## Content Block Types

Within the `.card-content` element, the slide's content is structured into different types of blocks. Each block is a `div` with the class `react-renderer` and a specific `node-*` class that defines its type.

### Heading

- **Class**: `.node-heading`
- **Content**: The heading text is located within a `div` with the class `heading`.
- **Example**:
  ```html
  <div class="react-renderer node-heading ...">
      <div ... class="heading ...">
          <div data-node-view-content-inner="heading">Suured keelemudelid (LLMid)</div>
      </div>
  </div>
  ```

### Image

- **Class**: `.node-image`
- **Content**: The image URL is in the `src` attribute of the `<img>` tag.
- **Example**:
  ```html
  <div class="react-renderer node-image ...">
      ...
      <img alt="" class="chakra-image css-zec7a" src="https://imgproxy.gamma.app/...">
      ...
  </div>
  ```

### Paragraph

- **Class**: `.node-paragraph`
- **Content**: The text content is inside nested `div` elements.
- **Example**:
  ```html
  <div class="react-renderer node-paragraph ...">
      ...
      <div data-node-view-content-inner="paragraph">
          Link: <span class="react-renderer node-link">...</span>
      </div>
      ...
  </div>
  ```

### Link

- **Class**: `.node-link` (typically found inside a `.node-paragraph`)
- **Content**: The link URL is in the `href` attribute of the `<a>` tag. The link text is within a nested `<span>`.
- **Example**:
  ```html
  <span class="react-renderer node-link">
      <a class="chakra-text link css-0" rel="noopener nofollow" href="https://artificialanalysis.ai/">
          ...
          <span data-node-view-content-inner="link">https://artificialanalysis.ai/</span>
          ...
      </a>
  </span>
  ```

## Summary

To parse a Gamma HTML file, the general approach would be:

1.  Find all `div` elements with the class `card-wrapper`.
2.  For each `card-wrapper`, extract its `data-card-id`.
3.  Within each card, locate the `.card-content` `div`.
4.  Iterate through the children of `.card-content` to find content blocks (`.node-heading`, `.node-image`, etc.).
5.  Extract the relevant data (text, image URLs, links) from each content block. 