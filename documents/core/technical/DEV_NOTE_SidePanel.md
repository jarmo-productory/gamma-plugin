# Developer Note: Chrome Side Panel (side_panel API)

## Key Points for Gamma Timetable Extension

### 1. Use the `side_panel` API (Not `sidebar_action`)

- Manifest V3 must use the `"side_panel"` key, not `"sidebar_action"`.
- Example:
  ```json
  "side_panel": {
    "default_path": "sidebar/sidebar.html"
  }
  ```

### 2. Permissions

- Add `"sidePanel"` to the `permissions` array in `manifest.json`.

### 3. Opening the Side Panel

- Use `chrome.sidePanel.open({ windowId })` in response to a user gesture (e.g., popup button).
- Requires Chrome 114+.
- Always check for API availability before calling.

### 4. Content Security Policy (CSP)

- **No inline scripts** in popup or side panel HTML.
- All JS must be in separate files and referenced with `<script src="..."></script>`.

### 5. Vite Build & Static Assets

- Use `vite-plugin-static-copy` to copy static files (e.g., `popup.js`) to the correct output directory (`dist/popup`).
- Ensure all referenced files exist in the built output.

### 6. Testing

- After changes, always reload the extension in Chrome and test the popup and side panel.
- If the side panel does not open, check Chrome version and permissions.

---

**Summary:**

- Use the new `side_panel` API for persistent extension UI.
- Follow Chrome's CSP rules.
- Ensure all static assets are copied to `dist`.
- Test in Chrome 114+.
