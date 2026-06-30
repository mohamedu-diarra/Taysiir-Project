# 🎓 Ardify E-Learning Platform — Presentation Version

Somalia's leading e-learning platform. Built for university graduation project defense.

---

## ⚡ Quick Start (5 minutes)

### Step 1 — MongoDB Atlas (Free)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free account
2. Create a **free M0 cluster**
3. Click **Connect** → **Drivers** → Copy your connection string
4. It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`

### Step 2 — Backend Setup
```bash
cd backend
cp .env.example .env
# Open .env and paste your MongoDB URI
npm install
npm start
```

You'll see:
```
✅ MongoDB connected
✅ Demo admin seeded: admin@ardify.so / admin123
✅ Demo instructor seeded: instructor@ardify.so / demo123
✅ Demo courses seeded
🚀 Ardify backend running at http://localhost:5000
```

### Step 3 — Frontend
Open `frontend/index.html` in your browser — that's it!

---

## 🔐 Demo Accounts (auto-created)

| Role       | Email                   | Password   |
|------------|-------------------------|------------|
| Admin      | admin@ardify.so         | admin123   |
| Instructor | instructor@ardify.so    | demo123    |
| Student    | Sign up on signup.html  | Your choice |

---

## ✅ What Works (Real Features)

| Feature | Status |
|---------|--------|
| Signup / Login with MongoDB | ✅ Fully working |
| JWT Authentication | ✅ Access + refresh tokens |
| Course listing & search | ✅ Real DB queries |
| Course enrollment | ✅ Saves to DB + success toast |
| Dashboard stats (dynamic) | ✅ Pulls from DB |
| Contact form → saves to DB | ✅ Working |
| File upload from computer | ✅ Multer, saved to /uploads |
| Certificate PDF download | ✅ PDFKit generates real PDF |
| Admin dashboard stats | ✅ Real counts from DB |
| Role-based redirects | ✅ Student/Instructor/Admin |

## 🎭 Demo Popups (Professional Fallbacks)

| Feature | Behavior |
|---------|----------|
| Stripe payment | Shows transaction ID + success modal |
| PayPal payment | Shows order ID + confirmation modal |
| Mobile money (EVC, ZAAD, Sahal) | Simulates processing → success |
| AI Tutor | Demo response from backend |
| Real-time chat | Explains production feature |
| Advanced analytics | Shows demo stats grid |

---

## 📁 Project Structure

```
Ardify-presentation/
├── backend/
│   ├── server.js          # Main server + MongoDB + seeding
│   ├── routes/
│   │   ├── authRoutes.js      # Signup, login, JWT
│   │   ├── courseRoutes.js    # Search, list, detail
│   │   ├── enrollmentRoutes.js # Enroll + stats
│   │   ├── contactRoutes.js   # Contact form → DB
│   │   ├── certificateRoutes.js # PDF generation
│   │   ├── uploadRoutes.js    # File upload (Multer)
│   │   ├── demoRoutes.js      # Stripe/PayPal/AI demo
│   │   └── adminRoutes.js     # Admin stats/users
│   ├── models/            # Mongoose schemas
│   └── .env.example       # Copy to .env
└── frontend/
    ├── JS/
    │   ├── api.js             # HTTP client + token refresh
    │   ├── auth.js            # Login/signup forms + guards
    │   ├── ardify-core.js     # 🆕 ALL new features wired here
    │   └── dashboard.js       # Dashboard chrome
    └── *.html                 # All pages
```

---

## 🛠 Troubleshooting

**"Cannot connect to server"**
→ Make sure `npm start` is running in the backend folder

**"MongoDB connection error"**
→ Check your `.env` MONGODB_URI — must be Atlas format with username:password

**Uploads not saving**
→ The `/backend/uploads/` folder is auto-created on startup

**Certificate not downloading**
→ You must be enrolled in a course first
