# Sidebar not working — fix plan

## What I found
- `student-dashboard.html` sidebar links are mostly real `<a>` tags.
- `JS/dashboard.js` only toggles `.active` class on clicks.
- Other dashboard scripts exist: `JS/dashboard-assignments.js`, `JS/dashboard-projects.js`, `JS/dashboard-ai.js`.

## Likely issue
- One of those scripts likely throws a runtime error on `student-dashboard.html`, preventing navigation/UX.
- Another possibility is that sidebar items use `href="#"` and your JS intercepts all `<a>` clicks (in `dashboard.js`) and/or calls navigation incorrectly.

## Next steps
1. Patch `JS/dashboard.js` so it **never** interferes with navigation for real links:
   - Only toggle `.active` for sidebar links (or only for links that are inside the sidebar).
   - Do not add handlers to all anchors on the page.
   - Avoid interfering with `href="#"` unless explicitly handled.
2. After patch, re-test:
   - Click `My Courses` and `Messages`.
   - Click `Assignments`/`Overview`.
3. If still failing, capture the first console error and patch the specific file.

