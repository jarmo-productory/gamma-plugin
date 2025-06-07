# Chrome Extension Development & Deployment Tutorial

## Best Development Flow for Chrome Extensions

### 1. Project Structure & Source Control
- Organize your code (e.g., `src/`, `manifest.json`, `assets/`, etc.).
- Use Git for version control and GitHub for remote backup/collaboration.

### 2. Development Workflow
- Edit your code and assets as needed.
- Use a build tool (like Vite, Webpack, or plain TypeScript compiler) if your extension uses TypeScript, JSX, or needs bundling.
- Output the build to a `dist/` or `build/` directory.

### 3. Local Deployment & Immediate Testing

#### A. Build/Prepare the Extension
- If using a build tool: run `npm run build` (or equivalent) to generate the latest output.
- If not, ensure all files are up to date in your source directory.

#### B. Load the Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select your extension's output directory (e.g., `dist/`, `build/`, or your project root if unbundled).
5. The extension will appear in your extension list and be immediately usable.

#### C. Test and Iterate
- Make code changes.
- Rebuild if necessary (`npm run build`).
- In `chrome://extensions/`, click the **Reload** button (⟳) on your extension.
- Refresh the target tab or open your extension's popup/sidebar to see changes.

### 4. Debugging
- Use Chrome DevTools:
  - Right-click your extension's popup/sidebar and select "Inspect".
  - For content scripts, inspect the target page and look for your script in the Sources panel.
- Check the "Errors" and "Warnings" in `chrome://extensions/` for manifest or runtime issues.

### 5. Automated Testing
- Use Jest, Mocha, or similar for unit tests.
- Use Puppeteer or Playwright for end-to-end testing of extension behavior.

### 6. Production Build & Publishing
- When ready, run a production build.
- Zip the output directory.
- Submit to the Chrome Web Store via the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Quick Reference: Local Deployment Steps

1. **Build or update your extension files.**
2. **Go to `chrome://extensions/` in Chrome.**
3. **Enable Developer mode.**
4. **Click "Load unpacked" and select your build/output directory.**
5. **After changes, click "Reload" on your extension in the extensions page.** 