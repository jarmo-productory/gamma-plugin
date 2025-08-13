# Deployment Tutorial: Gamma Timetable Extension & Cloud Services

This project has two main components that need to be deployed separately:
1.  **The Web Dashboard and Backend Functions**: Hosted on Netlify.
2.  **The Chrome Extension**: Published to the Chrome Web Store.

---

## 1. Deploying the Web Dashboard & Backend

The web dashboard and the Netlify Functions are deployed together. We use a continuous deployment model where pushes to the `main` branch automatically trigger a production deploy on Netlify.

### Production Deployment (via Git Push)

1.  **Merge to Main**: Ensure all new features and fixes are tested and merged into the `main` branch.
2.  **Automatic Deployment**: Netlify automatically detects the push, builds the web application, and deploys the functions.
    -   **Build Command**: `npm run build:web`
    -   **Publish Directory**: `dist-web`
    -   **Functions Directory**: `netlify/functions`
3.  **Monitor the Deploy**: You can watch the build and deployment progress in the [Netlify dashboard](https://app.netlify.com/).

### Manual Deployment

For hotfixes or specific rollouts, you can trigger a manual deploy:

1.  **Install Netlify CLI**:
    ```bash
    npm install -g netlify-cli
    ```
2.  **Login**:
    ```bash
    netlify login
    ```
3.  **Deploy to Production**:
    ```bash
    netlify deploy --prod
    ```
    This command will build the project locally and deploy the result to production.

### Environment Variables

All secrets (API keys for Supabase, Clerk, JWT secret) must be configured in the Netlify UI under **Site settings > Build & deploy > Environment**.

---

## 2. Deploying the Chrome Extension

The Chrome Extension is manually packaged and uploaded to the Chrome Web Store.

### Step 1: Prepare for Packaging

1.  **Sync Version Number**: Ensure the version in `package.json` is correct, then sync it with the manifest file.
    ```bash
    npm run sync-version
    ```
2.  **Update Production URLs**: Before building, ensure the `apiBaseUrl` and `webBaseUrl` in `packages/shared/config/index.ts` are pointing to the production Netlify URLs, not `localhost`.
3.  **Build the Extension**: Create a production-ready build of the extension.
    ```bash
    npm run build:extension
    ```
    This command cleans the `dist` directory and creates a fresh build with all necessary files.

### Step 2: Package the Extension

1.  **Create a ZIP file**: The Chrome Web Store requires a `.zip` file for uploads.
    ```bash
    npm run package
    ```
    This command runs the build and then creates a `gamma-plugin-release.zip` file in the parent directory.

### Step 3: Upload to the Chrome Web Store

1.  **Go to the Developer Dashboard**: Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2.  **Select the Item**: Find the "Gamma Timetable Extension" in your list of items.
3.  **Upload the New Package**: Go to the "Package" tab and upload the `gamma-plugin-release.zip` file.
4.  **Update Store Listing**: Update the description, screenshots, and any other required information if there are new features.
5.  **Submit for Review**: Submit the new version for review by Google. The review process can take anywhere from a few hours to several days.
