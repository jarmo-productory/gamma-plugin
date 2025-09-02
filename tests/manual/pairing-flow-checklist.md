# Manual Checklist: Extension ↔ Web Pairing (Localhost:3000)

1) Kill and lock port 3000
- `lsof -ti:3000 | xargs kill -9`
- `PORT=3000 npm run dev`

2) Register device (from extension or curl)
- `POST http://localhost:3000/api/devices/register`
- Note `deviceId` and `code`

3) Open pairing link in browser
- `http://localhost:3000/?source=extension&code=<CODE>`
- If authenticated: redirected to `/dashboard?source=extension&code=<CODE>` and a pairing dialog appears
- If not authenticated: a banner appears on `/`; after login, the dialog opens

4) Link device
- Click "Link Device" in dialog (calls `POST /api/devices/link`)
- Expect 200 and success message

5) Exchange token (extension polling)
- `POST /api/devices/exchange` with `{ deviceId, code }` until linked
- Expect `{ token, expiresAt }`

6) Validate token usage
- Call a token-aware route (e.g., `/api/user/profile` with `Authorization: Bearer <token>`) and confirm user mapping

Notes
- Legacy `/sign-in?source=extension&code=<CODE>` now redirects and should also succeed.
- Restarting the dev server clears in-memory registration state; re-register if needed.
