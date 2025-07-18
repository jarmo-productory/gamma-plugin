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
    - **`NEXT_PUBLIC_APP_URL`**: Should be `http://localhost:5173` (or your Vite dev server port).

---

## 4. Running the Development Environment

The project requires two main services to be running concurrently: the Supabase backend and the Vite frontend server.

1.  **Start Supabase Services:**
    First, ensure Docker Desktop is running. Then, start the local Supabase instance.
    ```bash
    supabase start
    ```
    This will spin up the database, authentication, and storage services. It will also provide you with the local API URL and anon key for your `.env.local` file.

2.  **Start the Frontend Application:**
    In a separate terminal, run the Vite development server.
    ```bash
    npm run dev
    ```
    This will start the web dashboard, typically available at `http://localhost:5173`.

---

## 5. Local SSL/HTTPS (TODO)

For securely testing authentication flows that involve cross-domain communication (like OAuth callbacks), running the local development server over HTTPS is required. This section will be updated with instructions for setting up a local SSL certificate.

- [ ] Generate a local SSL certificate (e.g., using `mkcert`).
- [ ] Configure `vite.config.js` to use the SSL certificate for the dev server.

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