# Sprint 4: Advanced Features - Version History

*   **Goal:** Implement a presentation versioning system by leveraging Supabase's backend capabilities, with a user-facing interface on the web dashboard to view and restore history.
*   **Deliverables:**
    1.  **Database Versioning Strategy:**
        *   Design and implement a versioning strategy within Supabase. This could involve:
            *   A) A separate `presentation_versions` table that stores historical JSON snapshots.
            *   B) Using a PostgreSQL trigger or database function that automatically saves a copy of a presentation to the history table whenever it's updated.
    2.  **Web Dashboard (History UI):**
        *   Create a new page or modal in the web dashboard (e.g., `/dashboard/presentations/[id]/history`).
        *   This UI will display a timeline of the saved versions for a specific presentation, showing timestamps and user information.
    3.  **Restore Functionality:**
        *   Implement the UI and the corresponding Supabase call to allow a user to select a historical version and restore it as the current active version of the presentation. 