# PRD: Refactor to Background Script Mediator

## 1. Introduction

This document outlines the requirements to fundamentally refactor the extension's architecture to solve a persistent and complex connection issue. Previous attempts to establish a direct connection between the sidebar and the content script have failed due to a combination of iframe complexities and script-loading race conditions. The new architecture will use the background script as a reliable central mediator, a standard and robust pattern for complex Chrome extensions.

## 2. Problem Statement

The extension consistently fails to establish a reliable communication channel between the sidebar and the content script that reads the presentation slides. The root cause is that the Gamma application renders its presentation inside an iframe. The sidebar, living in its own context, cannot easily or reliably target the specific iframe where the content script is running. This results in "Receiving end does not exist" errors, as messages sent from the sidebar are directed to the main page frame, not the iframe where the listener resides.

## 3. Core Architectural Requirements

### FR1: Implement Background Script as Central Hub
-   The background script (`background.js`) must be refactored to act as a central message broker and state manager.
-   It will maintain a registry of active content script ports, mapping them to their corresponding tab IDs.

### FR2: Refactor Content Script to Connect to Background
-   The content script (`content.ts`) must, upon loading, establish a long-lived connection (`chrome.runtime.connect`) to the background script.
-   It will announce its readiness and `tabId` to the background script.
-   It will no longer listen for direct connections from the sidebar. Instead, it will listen for messages forwarded from the background script (e.g., `get-slides`).

### FR3: Refactor Sidebar to Connect to Background
-   The sidebar script (`sidebar.js`) must, upon loading, establish a long-lived connection (`chrome.runtime.connect`) to the background script.
-   It will no longer attempt to connect directly to the content script.
-   To get slides, it will send a message to the background script, which will then proxy the request to the correct content script.

### FR4: Define a Clear Three-Way Communication Protocol
-   **Content Script -> Background:**
    -   On load: `port.postMessage({ type: 'content-script-ready' })`
-   **Sidebar -> Background:**
    -   On load: `port.postMessage({ type: 'get-slides' })`
-   **Background -> Content Script:**
    -   Forwards the `get-slides` request.
-   **Content Script -> Background:**
    -   Responds with `{ type: 'slide-data', slides: [...] }`
-   **Background -> Sidebar:**
    -   Forwards the `slide-data` response.

## 4. Non-Functional Requirements

-   **NFR1 (Reliability):** The architecture must be resilient to page reloads, extension updates, and the opening/closing of the sidebar.
-   **NFR2 (Clarity):** The code in all three scripts (`background`, `content`, `sidebar`) must be clear, well-commented, and strictly follow this new mediated pattern. 