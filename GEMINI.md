# Gemini Code Assistant Context

This document provides context for the Gemini Code Assistant to understand the project structure, technologies, and development conventions.

## Project Overview

This project is a Chrome extension called "Gamma Timetable Extension". Its primary purpose is to extract slide content from presentations on `gamma.app` and generate customizable timetables from them. The extension allows users to adjust the duration for each slide and export the final timetable to various formats (CSV, Excel, PDF).

The project is structured as a monorepo with three main packages:

- `packages/extension`: The core Chrome extension, including the background script, content script, popup, and sidebar panel.
- `packages/web`: A web-based component, likely for a future dashboard or settings page.
- `packages/shared`: A shared library containing code used by both the `extension` and `web` packages.

## Technologies Used

- **Build Tool**: [Vite](https://vitejs.dev/) is used for building and development. The build process is configured in `vite.config.js` to handle the different packages (`extension`, `web`, `shared`).
- **Language**: [TypeScript](https://www.typescriptlang.org/) is used for type safety.
- **Frameworks/Libraries**:
  - [jsPDF](https://github.com/parallax/jsPDF) for generating PDF files.
  - [SheetJS/xlsx](https://sheetjs.com/) for creating Excel files.
  - [@clerk/clerk-js](https://clerk.com/) for user authentication (as a dependency).

## Building and Running the Project

The following commands are defined in `package.json`:

- **Install dependencies**:
  ```bash
  npm install
  ```
- **Run in development mode**:

  ```bash
  npm run dev
  ```

  This will start a development server with hot-reloading. The extension can be loaded into Chrome as an "unpacked extension" from the `dist` directory.

- **Build for production**:
  - Build the extension only:
    ```bash
    npm run build:extension
    ```
  - Build the web component only:
    ```bash
    npm run build:web
    ```
  - Build the shared library only:
    ```bash
    npm run build:shared
    ```
  - Build all packages:
    ```bash
    npm run build:all
    ```

- **Package for release**:
  ```bash
  npm run package
  ```
  This command builds the extension and then creates a `gamma-plugin-release.zip` file for distribution.

## Development Conventions

- **Monorepo Structure**: The project uses a monorepo-like structure with code organized into `packages/extension`, `packages/web`, and `packages/shared`.
- **Build Targets**: The `vite.config.js` uses the `BUILD_TARGET` environment variable to differentiate between build configurations for the different packages.
- **Path Aliases**: For cleaner imports, the following path aliases are configured in `vite.config.js`:
  - `@shared`: resolves to `packages/shared`
  - `@extension`: resolves to `packages/extension`
  - `@web`: resolves to `packages/web`
- **Versioning**: The version number in `package.json` is synced with the extension's `manifest.json` using the `npm run sync-version` command, which executes the script at `packages/extension/scripts/sync-version.js`.

## Project State Management (`PROJECT_STATE.md`)

To maintain a persistent, evolving understanding of the project's status, we use a file named `PROJECT_STATE.md`. This file serves as the single source of truth for the project's strategic and tactical state.

### Structure

The file is organized into three levels:

1.  **High-Level Mission:** The project's overarching purpose.
2.  **Mid-Level Objectives (OKRs):** Quarterly or major goals and their key results.
3.  **Tactical-Level Sprints:** The current sprint's goal and a list of tasks.

### Agent Interaction Workflow

#### Core Rules

**Rule #0: Before executing any code modification (e.g., using `write_file` or `replace`), the agent must first explain its implementation plan and ask for user confirmation.**

This is the process for how the Gemini agent interacts with the project state:

1.  **Initial Review:** At the start of a session, the agent reads `GEMINI.md` (this file) and `PROJECT_STATE.md` to get the full context.
2.  **Task Execution:** The user assigns a task related to the current sprint.
3.  **Propose Update:** Upon successful completion of the task, the agent **must** propose an update to `PROJECT_STATE.md`. This proposal should detail the changes to be made (e.g., updating a task's status, adding a changelog entry).
4.  **User Confirmation:** The user must confirm the proposed changes with a "Yes" or similar affirmative.
5.  **Execute Update:** After confirmation, the agent will read the latest version of `PROJECT_STATE.md`, apply the changes, and write the updated content back to the file.
