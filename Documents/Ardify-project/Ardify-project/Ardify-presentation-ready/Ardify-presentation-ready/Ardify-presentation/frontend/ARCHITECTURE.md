# Ardify — Refactored Architecture

## 1. Analysis: What Was Wrong

### Duplicated Code (Before)
| Problem | Files Affected | Lines Duplicated |
|---|---|---|
| Identical checkout logic | `checkout.js`, `checkout-cyber.js`, `checkout-uiux.js` | ~200 lines × 3 |
| Identical curriculum toggle | `course-detail.js`, `course-detail-cyber.js`, `course-detail-uiux.js` | ~40 lines × 3 |
| Identical nav HTML | All 13 pages | ~12 lines × 13 |
| Session guard inline JS | `dash.html` | 30 lines inline |
| No shared localStorage API | Every file did raw `localStorage.getItem` | Scattered |
| Broken font paths | `main.css` used `/Space_Grotesk/` (absolute) | Wrong on file:// |
| No nav auth awareness | Nav always showed Login/Signup even when logged in | — |
| No course→cart→checkout link | Pages were disconnected islands | — |

---

## 2. New Architecture

```
Ardify/
├── css/
│   ├── global.css          ← NEW: Design system, CSS vars, Space Grotesk
│   ├── main.css            (unchanged)
│   └── [page].css          (unchanged)
│
├── JS/
│   ├── storage.js          ← NEW: All localStorage access (single source of truth)
│   ├── app.js              ← NEW: App state, course catalog, nav wiring, auth helpers
│   ├── auth.js             ← REFACTORED: Uses storage.js + app.js
│   ├── checkout.js         ← REFACTORED: One file handles all 3 course checkouts
│   ├── ui.js               ← NEW: Replaces course-detail*.js + main.js FAQ
│   ├── dashboard.js        ← NEW: Live dashboard data wiring
│   ├── checkout-cyber.js   (stub — backward compat)
│   ├── checkout-uiux.js    (stub — backward compat)
│   ├── course-detail-cyber.js (stub)
│   └── course-detail-uiux.js  (stub)
│
└── [pages].html            (updated script tags + meta course-id tags)
```

---

## 3. Dependency Map

```
storage.js          (no deps — pure localStorage wrapper)
    ↓
app.js              (depends on: storage.js)
    ↓                ↓               ↓               ↓
auth.js         checkout.js       ui.js        dashboard.js
(login/signup)  (all checkouts)  (FAQ+toggle)  (dash page only)
```

**Load order on every page:**
```html
<script src="./JS/storage.js"></script>   <!-- 1st -->
<script src="./JS/app.js"></script>        <!-- 2nd -->
<script src="./JS/[page-specific].js"></script>  <!-- 3rd -->
```

---

## 4. Course Flow (Connected)

```
courses.html
  → user clicks "View Course" on a card
  → card href goes to course-detail-[id].html

course-detail-[id].html
  → meta tag: <meta name="ardify-course-id" content="[id]">
  → user clicks "Enroll Now"
  → ui.js reads meta, calls ArdifyStorage.setCart(course)
  → navigates to checkout page

checkout-[id].html
  → meta tag: <meta name="ardify-course-id" content="[id]">
  → checkout.js reads course from meta/cart
  → sets correct pricing from COURSES catalog
  → user pays → ArdifyApp.completePurchase(id, plan)
  → enrollment saved to localStorage
  → redirect to dash.html

dash.html
  → dashboard.js reads enrollments for current user
  → populates stat cards, progress tracker, courses grid
  → updates automatically every login
```

---

## 5. LocalStorage Schema

```js
// Session
ardify_session_v1 = {
  email: "user@email.com",
  fullName: "Ahmed Hassan",
  role: "student",
  loggedInAt: 1234567890
}

// Users registry
ardify_users_v1 = [
  { fullName, email, passwordHash, role, createdAt }
]

// Enrollments (keyed by email)
ardify_enrollments_v1 = {
  "user@email.com": [
    {
      id: "fullstack",
      title: "Full-Stack Web Development Bootcamp",
      plan: "1y",
      enrolledAt: 1234567890,
      progress: 35,
      completedLessons: [1,2,3,...],
      totalLessons: 42
    }
  ]
}

// Cart (temporary, cleared after checkout)
ardify_cart_v1 = { id, title, checkoutPage, ... }

// Notifications (keyed by email)
ardify_notifications_v1 = {
  "user@email.com": [
    { id, icon, text, time, read }
  ]
}
```

---

## 6. CSS Variables (global.css)

```css
:root {
  --primary:        #FF6000;
  --primary-hover:  #e65700;
  --primary-light:  rgba(255, 96, 0, 0.12);

  /* Legacy aliases (keep existing code working) */
  --Orange:         #FF6000;
  --Green:          #00a63e;
  --LightGreen:     #05df72;
  --Silver:         #99a1af;
  --Black:          #000000;
  --darkblue:       #0d1320;

  /* Surfaces */
  --bg:     #f8fafc;
  --card:   #ffffff;
  --text:   #0f172a;
  --muted:  #64748b;
}
```

---

## 7. How to Add a New Course

1. Add entry to `COURSES` array in `JS/app.js`
2. Create `course-detail-[id].html` with `<meta name="ardify-course-id" content="[id]">`
3. Create `checkout-[id].html` with `<meta name="ardify-course-id" content="[id]">`
4. Both pages load `storage.js → app.js → ui.js / checkout.js`
5. Dashboard picks it up automatically from enrollments

---

## 8. Files NOT Changed

These pages work fine and were left untouched structurally:
- `about.html` — static, just gets global.css + app.js for nav
- `contact.html` — static, same
- `index.html` — gets nav auth awareness via app.js
- All `css/*.css` files — untouched
- All `Images/` files — untouched
- `Space_Grotesk/` fonts — untouched
