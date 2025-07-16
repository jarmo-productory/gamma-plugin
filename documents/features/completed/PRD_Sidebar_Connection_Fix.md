# PRD: Gamma Sidebar Connection Reliability

## 1. Introduction

This document outlines the requirements for fixing a critical race condition in the Gamma Timetable Extension. The bug prevents the sidebar from displaying detected slides if it is opened after the initial page load, leading to a confusing and broken user experience. The goal is to re-architect the communication layer between the content script and the sidebar to be robust, reliable, and independent of timing.

## 2. Problem Statement

When a user opens the Gamma Timetable Extension sidebar after the Gamma presentation page has already loaded, the sidebar displays "No slides detected," even though the content script has successfully identified the slides. The debug information confirms this discrepancy, showing a slide count but a "Connected: No" status. This is caused by a race condition where the content script attempts to "push" data to the sidebar only once upon its own initialization. If the sidebar isn't open at that exact moment, it misses the message, and no mechanism exists for it to retrieve the data later.

## 3. Core Requirements

### FR1: Implement a "Pull"-Based Communication Model
- The communication logic must be inverted. The sidebar (the "client") must be responsible for initiating communication and requesting data from the content script (the "server").
- This eliminates the race condition by ensuring the sidebar only requests data when it is ready to receive and render it.

### FR2: Establish a Persistent Connection Port
- Use `chrome.runtime.connect` to establish a long-lived, named communication port between the sidebar and the content script.
- The content script must listen for and accept incoming connections on this port.
- The port should remain open as long as the sidebar is open, allowing for continuous, two-way communication.

### FR3: Define a Clear Message-Passing Protocol
- When the sidebar opens, it must:
    1. Immediately attempt to connect to the content script's port.
    2. Upon a successful connection, send a `{ type: 'get-slides' }` message.
- The content script must:
    1. Listen for the `get-slides` message.
    2. Upon receipt, gather the latest slide data from the DOM.
    3. Send the data back through the port with a `{ type: 'slide-data', payload: [...] }` message.

### FR4: Update UI Based on Connection State
- The sidebar UI must dynamically reflect the state of the connection.
- When the connection is established and slide data is received, the slide list must be rendered.
- If the connection fails or is disconnected, the UI should show an appropriate message (e.g., "Could not connect to the presentation. Please refresh the page.").

### FR5: Enhance Debug Information
- The "Debug Info" section in the sidebar must be improved to provide clearer status information:
    - **Connection Status:** Should display more granular states like `Connecting...`, `Connected`, `Disconnected`, `Error`.
    - **Last Message Log:** Add a simple log to show the last message sent from and received by the sidebar to aid in future troubleshooting (e.g., `Sent: get-slides`, `Received: slide-data`).

## 4. Non-Functional Requirements

- **NFR1 (Reliability):** The new connection logic must be resilient and automatically handle cases where the sidebar is closed and reopened multiple times.
- **NFR2 (Performance):** The communication and DOM-scanning logic in the content script should remain efficient and not impact the performance of the Gamma application. 