# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "Gamma Timetable Extension" that extracts slide content from Gamma presentations and generates customizable timetables. The extension uses a content script to parse slides, a background service worker for message routing, and a sidebar panel for user interaction.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with file watching
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

## Architecture

### Core Components

1. **Background Script** (`src/background.js`): Service worker that acts as a message broker between content scripts and the sidebar. Manages tab state and connection routing.

2. **Content Script** (`src/content.ts`): Injected into gamma.app pages to extract slide data using DOM selectors. Sends slide data to background script via Chrome runtime messaging.

3. **Sidebar** (`src/sidebar/sidebar.js`): Main UI component that displays timetables, handles user interactions, and manages export functionality.

4. **Popup** (`src/popup/popup.js`): Simple popup that opens the sidebar panel.

### Data Flow

1. Content script extracts slides from gamma.app DOM
2. Background script routes messages between content script and sidebar
3. Sidebar receives slide data and generates/updates timetables
4. User interactions (duration changes, exports) are handled in sidebar
5. Timetable data is persisted using Chrome storage API

### Key Libraries

- **SheetJS (XLSX)**: For Excel export functionality (`src/lib/xlsx.full.min.js`)
- **jsPDF**: For PDF generation (via npm dependency)
- **Vite**: Build tool with TypeScript support

### Storage

- Uses Chrome storage API for persisting timetable data per presentation URL
- Storage utilities in `src/lib/storage.js`
- Timetables are keyed by presentation URL to maintain separate states

### Build System

- **Vite** configured for Chrome extension development
- TypeScript compilation for content script
- Static asset copying for manifest, icons, and libraries
- Version synchronization script in `src/scripts/sync-version.js`

## Development Notes

### Slide Extraction

The content script uses specific DOM selectors to extract slide content:
- Main selector: `div.card-wrapper[data-card-id]`
- Extracts title, content (paragraphs, images, links, lists), and metadata
- Handles nested list structures with sub-items

### Message Passing

Uses Chrome runtime messaging with named ports:
- `content-script` port for content script connections
- `sidebar` port for sidebar connections
- Background script manages active tab state to prevent message conflicts

### Timetable Generation

- Default 5-minute duration per slide
- User-adjustable durations via sliders (0-60 minutes)
- Automatic time calculation based on start time and durations
- Reconciliation system preserves user settings when slide content changes

### Export Formats

- **CSV**: Simple comma-separated format
- **Excel**: Uses SheetJS library with formatted headers
- **Clipboard**: Copies CSV format to clipboard
- **PDF**: Generated using jsPDF library

### Testing

No specific test framework is configured. Manual testing should focus on:
- Slide extraction from various gamma.app presentations
- Timetable generation and persistence
- Export functionality across different formats
- Tab switching and state management