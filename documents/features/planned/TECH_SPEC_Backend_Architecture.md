# Technical Specification: Unified Frontend Architecture

## 1. Overview

This document provides the revised technical specifications for the Gamma Timetable project, reflecting a unified and streamlined architecture. The core of this new strategy is a **single Next.js application** that serves as the foundation for both the **Chrome Extension** and the **Web Dashboard**.

This approach maximizes code reuse, simplifies the development workflow, and ensures a consistent user experience across both platforms.

-   **Application Framework**: **Next.js**
-   **Deployment Target (Web)**: **Netlify** (via static export)
-   **Deployment Target (Extension)**: **Chrome Web Store** (via static export)
-   **Authentication**: **Clerk**
-   **Database & Storage**: **Supabase**

## 2. Architectural Diagram

The new architecture consists of a single Next.js application that is built and exported into two distinct client packages. Both clients communicate directly with the same external services for authentication and data.

```mermaid
graph TD
    subgraph Development
        A[Unified Next.js App<br/>(Single Codebase)]
    end

    subgraph Build Process
        B{Next.js Static Export<br/>(`next export`)}
    end

    subgraph "Deployment Targets"
        C[**Chrome Extension Package**<br/>(Static HTML, JS, CSS)]
        D[**Web Application on Netlify**<br/>(Static HTML, JS, CSS)]
    end

    subgraph "Backend Services (External)"
        E[Clerk<br/>(Authentication)]
        F[Supabase<br/>(Database & Storage)]
    end

    A -- "Develop" --> B
    B -- "Generates" --> C
    B -- "Generates" --> D

    C -- "API Calls" --> E
    C -- "API Calls" --> F
    D -- "API Calls" --> E
    D -- "API Calls" --> F

    style A fill:#cde,stroke:#333,stroke-width:2px
    style C fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#f9f,stroke:#333,stroke-width:2px
```

## 3. Core Components

### 3.1. The Unified Next.js Application
This is the single source of truth. It contains all pages, components, styles, and logic.
-   **Pages:** The `pages` directory will contain routes for both the extension and the web app (e.g., `/popup`, `/dashboard`, `/account`, `/sign-in`).
-   **Static Export:** The project will be configured with `output: 'export'` and `trailingSlash: true` in `next.config.js` to generate a fully static build.
-   **Environment-Aware Logic:** Components can use the window's URL (`window.location.protocol`) to detect if they are running in a `chrome-extension://` context versus an `https://` context, allowing for UI/UX differences where needed (e.g., hiding certain navigation elements in the extension popup).

### 3.2. Build & Deployment
A custom script in `package.json` will orchestrate the build process:
1.  Run `next build` and `next export` to generate the static `out` directory.
2.  Perform post-processing on the `out` folder to make it Chrome-compatible (e.g., renaming `_next` to `next`).
3.  The final `out` directory will be deployed to **Netlify** for the web app.
4.  A copy of the `out` directory, along with the `manifest.json`, will be packaged for the **Chrome Web Store**.

### 3.3. External Services
Our application remains "backend-less" in the traditional sense.
-   **Clerk:** Will be integrated using its React hooks (`@clerk/nextjs`) and will manage user sessions across both the extension and the web app seamlessly.
-   **Supabase:** The Supabase JS client library (`@supabase/supabase-js`) will be used directly from the frontend to interact with the PostgreSQL database and storage. All data operations and security will be handled by Supabase's Row Level Security (RLS). 