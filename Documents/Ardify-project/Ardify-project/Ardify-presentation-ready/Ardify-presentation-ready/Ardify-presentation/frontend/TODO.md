# TODO — Ardify Dashboard Features

## Student Dashboard (target: functional)
- [ ] Unify styling hooks/containers for **Assignments**, **Team Projects**, **Individual Projects**, **AI Assistant** on `student-dashboard.html`.
- [ ] Create demo data model in `localStorage` for:
  - assignments (status: due/pending/submitted/graded)
  - projects (team vs individual, progress)
  - AI assistant chat history
- [ ] Implement `JS/dashboard-assignments.js` to render and manage assignments UI (search/filter, view details modal/panel).
- [ ] Implement `JS/dashboard-projects.js` to render team + individual project lists and progress bars.
- [ ] Implement `JS/dashboard-ai.js` to make the AI widget interactive (local mock responses + chat history persistence).
- [x] Update `student-dashboard.html` to include the new scripts and connect DOM ids.


## Navigation & Consistency
- [ ] Ensure sidebar navigation active state works on `student-dashboard.html` (and optionally reuse `dashboard.js`).
- [ ] Ensure all dashboard pages use Space Grotesk + existing color variables (no conflicting per-page CSS variables).

## Testing
- [x] Load `student-dashboard.html` and confirm all 4 sections render.

- [ ] Verify sending a message in AI widget persists in localStorage.
- [ ] Verify search/filter in assignments works.
- [ ] Verify project progress values render correctly.

