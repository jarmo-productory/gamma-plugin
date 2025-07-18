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

- **Web Dashboard:** `http://localhost:3000`
- **Extension:** `chrome-extension://<EXTENSION_ID>`
- **Supabase:** `https://<dev-project>.supabase.co`
- **Clerk:** `https://dashboard.clerk.dev` (dev environment)
- **Example `.env` values:**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://<dev-project>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  NEXT_PUBLIC_EXTENSION_ID=chrome-extension://<EXTENSION_ID>
  ```

### Production

- **Web Dashboard:** `https://productory-powerups.netlify.app`
- **Supabase:** `https://<prod-project>.supabase.co`
- **Clerk:** `https://dashboard.clerk.com` (prod environment)
- **Example `.env.production` values:**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://<prod-project>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
  CLERK_SECRET_KEY=sk_live_...
  NEXT_PUBLIC_APP_URL=https://productory-powerups.netlify.app
  NEXT_PUBLIC_EXTENSION_ID=chrome-extension://<EXTENSION_ID>
  ```

---

## Service Providers

### Netlify
- **Site:** `https://productory-powerups.netlify.app`
- **Build command:** `npm run build:web`
- **Publish directory:** `dist-web`
- **Environment variables:** Set via Netlify UI for each environment

### Supabase
- **Project URL:** `https://<project>.supabase.co`
- **API Key variable:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key variable:** `SUPABASE_SERVICE_ROLE_KEY` (never expose in frontend)

### Clerk
- **Dashboard:** `https://dashboard.clerk.com`
- **Publishable Key:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Secret Key:** `CLERK_SECRET_KEY` (backend only)

---

## Environment Variable Reference

| Variable Name                    | Description                | Used In      | Example Value         |
|----------------------------------|----------------------------|--------------|----------------------|
| NEXT_PUBLIC_SUPABASE_URL         | Supabase project URL       | All          | https://...supabase.co|
| NEXT_PUBLIC_SUPABASE_ANON_KEY    | Supabase anon key          | All          | eyJ...               |
| SUPABASE_SERVICE_ROLE_KEY        | Supabase service key       | Backend      | eyJ...               |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY| Clerk public key           | All          | pk_test_...          |
| CLERK_SECRET_KEY                 | Clerk secret key           | Backend      | sk_test_...          |
| NEXT_PUBLIC_APP_URL              | App base URL               | All          | http://localhost:3000|
| NEXT_PUBLIC_EXTENSION_ID         | Chrome extension ID        | All          | chrome-extension://...|

---

## Setup Instructions

1. **Update environment variables**
   - For local development, copy `.env.example` to `.env` and fill in the values.
   - For production, set variables in Netlify’s UI under Site Settings > Environment Variables.
2. **Adding new environments**
   - Duplicate the relevant section above and update URLs/keys as needed.
3. **Rotating secrets**
   - Update the value in the provider dashboard (Supabase, Clerk, etc.)
   - Update the value in all relevant `.env` files and Netlify settings.
4. **Adding new providers**
   - Add a new section under Service Providers and update the variable reference table.

---

> **Note:** Never commit actual secret values to the repository. Only variable names and example values should appear in this document. 