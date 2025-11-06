# Local Development Setup Guide

This document provides a comprehensive guide to setting up and running this project locally. Following these steps will ensure you have a consistent and working development environment.

---

## 1. Prerequisites

Before you begin, ensure you have the following software installed on your machine:

- **Node.js**: Version 18.x or higher.
- **npm**: (Comes with Node.js).
- **Git**: For version control.
- **Docker Desktop**: Required to run Supabase locally. Must be running before you start the Supabase services.
- **Supabase CLI**: Install via Homebrew (macOS) or other methods.
  ```bash
  brew install supabase/tap/supabase
  ```

---

## 2. Initial Project Setup

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/jarmo-productory/gamma-plugin.git
    cd gamma-plugin
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

---

## 3. Environment Variable Configuration

API keys and environment-specific settings are managed in a `.env.local` file, which is ignored by Git for security.

1.  **Create the Environment File:**
    Copy the template file to create your local configuration.

    ```bash
    cp .env.example .env.local
    ```

2.  **Fill in the Values:**
    Open `.env.local` and populate it with the correct values.
    - **`NEXT_PUBLIC_SUPABASE_URL`**: Get this after running `supabase start`.
    - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Get this after running `supabase start`.
    - **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**: Get this from your Clerk Dashboard.
    - **`CLERK_SECRET_KEY`**: Get this from your Clerk Dashboard.
    - **`NEXT_PUBLIC_APP_URL`**: Should be `http://localhost:8888` (the Netlify dev server port).

---

## 4. Running the Development Environment

The project's local environment is composed of three key services that must be run concurrently:

1.  **Supabase (Backend Database):** Provides the PostgreSQL database, authentication, and storage.
2.  **Netlify Dev (Backend Functions):** Runs the serverless functions that handle API logic (e.g., device pairing, data sync).
3.  **Vite (Frontend Server):** Serves the web dashboard and provides hot-reloading for development.

Follow these steps to launch the full stack:

1.  **Start Supabase Services:**
    First, ensure Docker Desktop is running. Then, start the local Supabase instance. This command also resets the local database to ensure a clean state.

    ```bash
    supabase start && supabase db reset
    ```

    After it starts, Supabase will output the `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Add these to your `.env.local` file.

2.  **Start the Backend and Frontend Servers:**
    In a separate terminal, run the `dev:web` script. This single command builds the web application and then starts both the Netlify Dev server (for backend functions) and the Vite server (for the frontend).

    ```bash
    npm run dev:web
    ```

    - The **Netlify server** will run on **`http://localhost:8888`**. This is the main URL you should use for the application, as it proxies requests to both the frontend and the backend functions.
    - The **Vite server** will typically run on `http://localhost:5173`. You do not need to access this URL directly.

---

## 5. Loading the Extension in Chrome

To test the full functionality, you need to load the extension into your browser:

1.  **Build the Extension:**
    ```bash
    npm run build:extension
    ```
    This command compiles the extension code into the `dist` directory.

2.  **Load in Chrome:**
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable "Developer mode" (top right).
    - Click "Load unpacked".
    - Select the `dist` folder from the root of this project.

The extension is now installed and will be automatically updated whenever you run the build command again.

---


## 6. Troubleshooting

### Supabase Port Conflict

- **Error**: `Bind for 0.0.0.0:54322 failed: port is already allocated`
- **Cause**: Another project (Docker container) is already using the default Supabase database port.
- **Solution**: Stop the other running Supabase instance. You can find its project ID in the error message.
  ```bash
  # Example from our setup
  supabase stop --project-id next-supabase-saas-kit-turbo-lite
  ```

### General Issues

- If you encounter issues, try stopping all services (`supabase stop` and Ctrl+C in the Vite terminal), running `npm install` again, and restarting.
