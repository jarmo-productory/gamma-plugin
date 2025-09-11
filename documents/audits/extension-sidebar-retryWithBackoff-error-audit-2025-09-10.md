Title: Chrome Extension Sidebar — retryWithBackoff Error Audit (2025-09-10)

Summary
- The sidebar throws from retryWithBackoff during cloud sync operations (save/load/list). This indicates repeated network failures or non-retriable auth/HTTP errors when calling the web app APIs from the extension.
- Root causes most commonly observed here:
  1) Host permissions mismatch (manifest vs target host),
  2) API base URL pointing to the wrong environment,
  3) Web app not running on required port 3000,
  4) Device not authenticated (no/invalid device token),
  5) CORS blocked requests when host permissions are missing.

Error Signature
- Reported location: index-dA5VhvlS.js:1 (retryWithBackoff)
- The compiled bundle shows:
  - StorageManager.retryWithBackoff(fn, label, isRetriable)
  - Used by: syncToCloud, syncFromCloud, syncPresentationsList
  - isRetriableNetworkError:
    - NOT retriable: 401, 403, most 4xx (except 429)
    - Retriable: TypeError (network), 5xx, 429, or no status
- When retries exhaust, retryWithBackoff throws, surfacing as this error.

Where It Happens in Code
- packages/extension/sidebar/sidebar.js calls defaultStorageManager (StorageManager) methods:
  - syncFromCloud(presentationUrl, { apiBaseUrl, deviceAuth })
  - syncToCloud(presentationUrl, timetable, { apiBaseUrl, deviceAuth, title })
  - syncPresentationsList({ apiBaseUrl, deviceAuth })
- DeviceAuth.authorizedFetch builds requests to `${apiBaseUrl}/api/...` with Authorization: Bearer <deviceToken>.
- Config source: shared-config (configManager.getConfig()). Dev default: http://localhost:3000; Prod default: https://productory-powerups.netlify.app

Root Cause Analysis
1) Host permissions do not allow the target origin
   - Dev manifest (manifest.json) has:
     - host_permissions: ["https://gamma.app/*", "http://localhost/*"]
   - Prod manifest (manifest.production.json) has:
     - host_permissions: ["https://gamma.app/*", "https://productory-powerups.netlify.app/*"]
   - If you install a prod build but point apiBaseUrl to http://localhost:3000, fetches will fail with a TypeError (no permission/CORS), which retryWithBackoff treats as retriable → backoff → throw.

2) API base URL mismatch
   - Sidebar displays API Base URL in its UI (see sidebar.js code around the diagnostics panel).
   - If extension expects netlify but API base is localhost (or vice versa), requests go to the wrong place and fail.
   - Also ensure the PORT 3000 mandate is respected; the extension hardcodes localhost:3000 in many places.

3) Web is not running on port 3000
   - The extension defaults to http://localhost:3000 during development.
   - If the Next.js app chose a different port or isn’t running, fetch throws TypeError → retried → throw.

4) Device not authenticated
   - sync methods call deviceAuth.getValidTokenOrRefresh().
   - If unauthenticated, syncToCloud/syncFromCloud explicitly throw 401 (non-retriable ⇒ immediate failure) with message "Not authenticated".
   - If you see retries instead, it likely wasn’t a 401 from that location (see #1/#3 TypeError path).

5) CORS
   - With correct host_permissions, MV3 may bypass CORS. Without host permissions, extension fetches behave like regular web requests and are subject to CORS.
   - Netlify should be covered in prod host permissions; localhost requires the dev manifest.

Reproduction Checklist
- In Chrome:
  - Verify which extension build is installed (dev vs prod). Check manifest in chrome://extensions (host permissions list).
  - Open the sidebar diagnostics (it prints API Base URL).
  - Open the sidebar’s DevTools → Network tab:
    - Watch calls to /api/user/profile, /api/presentations/save, /api/presentations/get, /api/presentations/list.
    - If TypeError and no status: suspect host permissions/port/down server.
    - If 401: unauthenticated (complete pairing/login in sidebar).
    - If 404/500: inspect server logs; 404 is non-retriable by design.

Validation Steps
1) Local dev
   - Kill port 3000: `lsof -ti:3000 | xargs kill -9`
   - Run web on port 3000: `PORT=3000 npm run dev` (packages/web)
   - Load the DEV extension (manifest.json with http://localhost/* host permission).
   - In the sidebar, confirm API Base URL is http://localhost:3000.
   - Complete device pairing/sign-in from the sidebar; confirm token stored.
   - Trigger a save from the sidebar and verify 200 responses.

2) Production-like
   - Load the PROD extension (manifest.production.json) which permits productory-powerups.netlify.app.
   - Ensure Netlify deployment is live and API routes respond.
   - Ensure extension config shows the Netlify base.
   - Pair device and test save/list flows.

Recommended Fixes
- Ensure manifest-host alignment:
  - For local testing, use the dev manifest (host_permissions includes http://localhost/*).
  - For prod testing, use the prod manifest and ensure apiBaseUrl points to Netlify.
- Respect PORT 3000 Mandate:
  - Always run Next.js dev at port 3000. Don’t accept 3001/3002 fallbacks.
- Authentication first:
  - Complete device pairing in sidebar before expecting cloud sync.
  - If profile fetch (/api/user/profile) fails, clear token from the sidebar and re-pair.
- Improve error visibility (optional, but helpful):
  - Wrap retryWithBackoff callers to surface the first error (status/text) in the sidebar UI when retries start.
  - Log both the operation label and apiBaseUrl in the error toast.

Evidence Pointers (in repo)
- Manifest permissions:
  - packages/extension/manifest.json → http://localhost/*
  - packages/extension/manifest.production.json → https://productory-powerups.netlify.app/*
- Config defaults:
  - packages/extension/shared-config/index.ts → apiBaseUrl dev/prod defaults
- Sidebar sync calls:
  - packages/extension/sidebar/sidebar.js → syncFromCloud/syncToCloud usage and diagnostics display
- StorageManager + retryWithBackoff:
  - Built into the distributed bundle (dist), shown in provided snippet

Conclusion
- The retryWithBackoff error is symptomatic of environment/permissions mismatch or a down/wrong API server. Align manifest host permissions with the actual apiBaseUrl you are hitting, ensure the web app runs on port 3000 for local, and pair device auth before syncing. With those corrected, retries stop and requests succeed on first attempt.

