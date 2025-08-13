# Environment & Deployment Configuration

This document centralizes all environment URLs, settings, and required variables for development and production. Staging/preview environments are not currently used. All deployments go directly from development to production. This section will be updated when a staging environment is introduced.

---

## Table of Contents

1. [Overview](#overview)
2. [Environments](#environments)
   - [Development](#development)
   - [Production](#production)
3. [Service Providers](#service-providers)
   - [Netlify](#netlify)
   - [Supabase](#supabase)
   - [Clerk](#clerk)
4. [Environment Variable Reference](#environment-variable-reference)
5. [Setup Instructions](#setup-instructions)

---

## Overview

This document is the single source of truth for all environment-specific settings, URLs, and secrets (variable names only, never actual secrets). It is intended for developers, DevOps, and anyone deploying or maintaining the project.

---

## Environments

### Development

- **Web Dashboard & App URL:** `http://localhost:8888` (via Netlify Dev)
- **Extension:** `chrome-extension://<DEVELOPMENT_EXTENSION_ID>`
- **Supabase:** Local instance run via Docker. URL is provided by the `supabase start` command (e.g., `http://localhost:54321`).
- **Clerk:** Development instance from `dashboard.clerk.dev`.
- **Example `.env.local` values:**
  ```env
  # Provided by `supabase start`
  NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

  # From your Clerk development instance
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...

  # Corresponds to the Netlify Dev server
  NEXT_PUBLIC_APP_URL=http://localhost:8888
  ```

### Production

- **Web Dashboard:** `https://productory-powerups.netlify.app`
- **Supabase Project:** `productory-powerups` (ID: `dknqqcnnbcqujeffbmmb`)
- **Supabase URL:** `https://dknqqcnnbcqujeffbmmb.supabase.co`
- **Clerk:** Production instance from `dashboard.clerk.com`.
- **Environment Variables:** These must be set in the Netlify UI for the production environment.

> **🚨 SECURITY**: Never commit `.env.local` or files containing secrets to the repository.

---

## Service Providers

### Netlify

- **Production Site:** `https://productory-powerups.netlify.app`
- **Build command:** `npm run build:web`
- **Publish directory:** `dist-web`
- **Environment variables:** Set via Netlify UI. For local development, Netlify Dev sources them from `.env.local`.

### Supabase

- **Project URL (Production):** `https://dknqqcnnbcqujeffbmmb.supabase.co`
- **API Key variable:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key variable:** `SUPABASE_SERVICE_ROLE_KEY` (backend only, never expose in frontend)

### Clerk

- **Dashboard:** `https://dashboard.clerk.com`
- **Publishable Key:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Secret Key:** `CLERK_SECRET_KEY` (backend only)

---

## Environment Variable Reference

| Variable Name                     | Description                               | Used In | Example Value (Local)          |
| --------------------------------- | ----------------------------------------- | ------- | ------------------------------ |
| NEXT_PUBLIC_SUPABASE_URL          | Supabase project URL                      | All     | http://localhost:54321         |
| NEXT_PUBLIC_SUPABASE_ANON_KEY     | Supabase anon key                         | All     | eyJ...                         |
| SUPABASE_SERVICE_ROLE_KEY         | Supabase service key for admin tasks      | Backend | eyJ...                         |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk public-facing key for the frontend  | All     | pk_test_...                    |
| CLERK_SECRET_KEY                  | Clerk secret key for backend verification | Backend | sk_test_...                    |
| NEXT_PUBLIC_APP_URL               | Base URL of the web application           | All     | http://localhost:8888          |
| JWT_SECRET                        | Secret for signing device tokens          | Backend | (A long, random string)        |


---

## Setup Instructions

1.  **Create Local Environment File:**
    - For local development, copy `.env.example` to `.env.local`. This file is ignored by Git.
    - Fill in the values using the guidance above. You will get secrets from your Clerk dashboard and the `supabase start` command.

2.  **Configure Production Environment:**
    - For production, set the equivalent environment variables in Netlify’s UI under Site Settings > Build & deploy > Environment.

3.  **Adding New Variables:**
    - Add the new variable to `.env.example` with a placeholder value.
    - Add it to your local `.env.local` file.
    - Add it to the Netlify UI for production.
    - Update the "Environment Variable Reference" table in this document.

---

> **Note:** Never commit actual secret values to the repository. Only variable names and example values should appear in this document.
