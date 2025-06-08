# PRD: Gamma Time Editor - Persistence and UX Improvements

## 1. Introduction

This document outlines the requirements for enhancing the Gamma Time Editor Chrome extension. The primary goals are to improve the user experience by introducing data persistence for presentation timings, streamlining the user interface, and refining interactive components. This will make the tool more intuitive, efficient, and reliable for users managing their Gamma presentations.

## 2. User Stories

- **US1 (Persistence):** As a user, I want my defined timeslots for a Gamma presentation to be saved, so that when I reopen the same presentation and its sidebar, my previous work is automatically restored.
- **US2 (Real-time Updates):** As a user, I want the extension to automatically detect and display new slides when I add them to the Gamma presentation, so I don't have to manually refresh or restart the extension.
- **US3 (UI Efficiency):** As a user, I want the main tools to be easily accessible in a sticky toolbar at the top of the extension, so I can perform common actions quickly.
- **US4 (Streamlined Workflow):** As a user, I want the extension to open directly to the main timetable view, so I can start working immediately without going through an unnecessary intermediate step.
- **US5 (Smooth Interactions):** As a user, I want the duration slider to move smoothly and fluidly, so I can set precise times without the slider jumping in fixed increments.

## 3. Functional Requirements

### FR1: Data Persistence
-   The extension must save slide times and durations to local storage (`chrome.storage.local` is recommended).
-   Data must be uniquely associated with the specific Gamma presentation (e.g., using the presentation URL or another unique identifier).
-   Upon opening the extension, it must automatically check for and load any saved data for the current presentation.

### FR2: Real-time DOM Updates
-   The extension must actively monitor the Gamma presentation's Document Object Model (DOM) for changes, specifically the addition or removal of slides.
-   When a new slide is added by the user in Gamma, it must be instantly rendered in the extension's timetable view with a default time allocation.
-   When a slide is removed, it must also be removed from the extension's view.

### FR3: UI/UX Enhancements
-   **Sticky Toolbar:** Implement a sticky toolbar at the top of the extension UI that remains visible as the user scrolls. This toolbar should contain the primary action buttons.
-   **Direct-to-Timetable View:** The initial view that just lists recognized slides and requires a button click to proceed ("Create Timetable") must be removed. The extension should launch directly into the main, interactive timetable editor.
-   **Smooth Slider:** The time allocation slider's movement must be refactored to be smooth and continuous, allowing for granular control. The "minute jumps" behavior should be eliminated.
-   **Card Redesign:** Each card representing a slide in the extension UI must be updated to the following specification:
    -   A header containing the slide **Title** and the assigned **Timeslot** (e.g., "02:30 - 04:15"). These two elements should be on the same line, with the title on the left and the timeslot on the right (`display: flex`, `justify-content: space-between`).
    -   The redesigned smooth slider directly below the header.
    -   A `div` for the slide summary/content preview, with a maximum height of `128px` and `overflow: hidden` to truncate longer content.

### FR4: Feature Removal
-   The "PDF Export" feature, including its button and underlying logic, must be completely removed from the codebase.

## 4. Non-Functional Requirements

-   **NFR1 (Performance):** The DOM monitoring for slide changes must be implemented efficiently to avoid any noticeable performance degradation of the Gamma application itself.
-   **NFR2 (Reliability):** The data persistence mechanism should be robust and reliably handle storage and retrieval across different browser sessions.
