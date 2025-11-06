# SPRINT 31: Timeline Sync - Critical Stability Fix

**Status:** 📋 Planning
**Sprint Window:** Immediate (Estimated 2-4 hours)
**Owner:** Gemini AI
**Related Audit:** `documents/audits/timeline-sync-audit-2025-09-11.md` (Revised Minimal Scope)

## Mission

To urgently address the critical data loss risk identified in the Timeline Synchronization Strategy Audit by implementing the recommended 2-line minimal fix for timestamp management. This sprint prioritizes immediate system stability over feature enhancements.

## Goals

- **Eliminate Data Loss:** Correct the flawed timestamp comparison logic that currently leads to data loss when syncing between the extension and the cloud.
- **Restore Sync Reliability:** Ensure that the sync mechanism correctly identifies the most recent version of a timetable.
- **Implement Minimal Fix:** Apply the targeted, low-effort changes recommended by the audit to stabilize the system with minimal development time.

## Success Criteria

- ✅ The `lastModified` field is correctly added to timetable objects modified locally in the extension.
- ✅ The `lastModified` field is correctly mapped from the server's `updatedAt` field when data is fetched from the cloud.
- ✅ The primary data loss scenario identified in the audit (caused by comparing `undefined` timestamps) is verifiably eliminated.
- ✅ All "Critical Tests Only" outlined in the revised audit pass successfully.

## Scope

### In Scope
- **Critical Fix Implementation:** Applying the 2-line code change as specified in the audit.
  - Modifying `packages/extension/sidebar/sidebar.js` to add a client-side `lastModified` timestamp on local edits.
  - Modifying `packages/shared/storage/index.ts` to map the server's `updatedAt` to `lastModified` on fetched data.
- **Critical Path Testing:** Executing the minimal testing strategy to validate the fix.

### Out of Scope (As per Revised Audit)
- Conflict resolution UI or user notifications.
- Version-based optimistic locking.
- Real-time change notifications (polling, WebSockets).
- Operation queuing or comprehensive logging.

## Work Items

### 1) Implement Timestamp Generation on Local Edits
- **File:** `packages/extension/sidebar/sidebar.js`
- **Task:** In the `recalculateTimetable` function, add `lastModified: new Date().toISOString()` to the returned timetable object.

### 2) Implement Timestamp Mapping from API Response
- **File:** `packages/shared/storage/index.ts`
- **Task:** In the API response handling logic, map the `updatedAt` field from the server response to the `lastModified` field on the `timetableData` object.

### 3) Validation and Testing
- **Task:** Execute the "Minimal Testing Strategy" from the audit.
  - **Test 1 (Timestamp Logic):** Verify the `lastModified` field exists and the timestamp comparison works correctly during the sync decision.
  - **Test 2 (Basic Conflict):** Manually test that opening the same presentation in the extension and web app, then modifying the extension version, does not result in silent data loss upon reload.
  - **Test 3 (Load/Save Cycle):** Ensure the extension can save and reload its own changes without data corruption.

## Technical Implementation

### `packages/extension/sidebar/sidebar.js`
```javascript
// In recalculateTimetable function
function recalculateTimetable(timetable) {
  // ... existing calculation logic
  return {
    ...timetable,
    items: newItems,
    totalDuration: totalDuration,
    lastModified: new Date().toISOString() // Add this line
  };
}
```

### `packages/shared/storage/index.ts`
```typescript
// In API response handling logic (e.g., syncFromCloud)
function transformApiResponse(apiData) {
  // ... existing transformation logic
  if (apiData?.timetableData) {
    apiData.timetableData.lastModified = apiData.updatedAt; // Add this line
  }
  return apiData;
}
```

## Conclusion

This sprint is a targeted surgical strike to fix a high-risk bug. By adhering to the minimal scope of the revised audit, we can restore data integrity to the synchronization feature quickly and efficiently, paving the way for safer, more deliberate enhancements in future sprints if they are deemed necessary.
