# Ardify Backend API

Production-ready Node.js/Express/MongoDB backend for the Ardify online learning platform.

## Stack

- **Runtime:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Payments:** Stripe + PayPal webhooks
- **Real-time:** Socket.io (WebSockets)
- **Uploads:** Cloudinary (image URLs)
- **Email:** Nodemailer

---

## Project Structure

```
ardify-backend/
├── server.js               # Entry point, Express + Socket.io setup
├── package.json
├── .env.example            # Copy to .env and fill in values
├── models/
│   ├── User.js             # Student / Instructor / Admin
│   ├── Course.js           # Courses with embedded lessons
│   ├── Enrollment.js       # Student progress tracking
│   ├── Payment.js          # Transaction history
│   ├── Message.js          # Messages + Conversations
│   ├── Assignment.js       # Assignments + Submissions
│   └── Review.js           # Course ratings & reviews
├── routes/
│   ├── authRoutes.js       # Signup, login, token refresh
│   ├── userRoutes.js       # Profiles, dashboards, password
│   ├── courseRoutes.js     # Course CRUD + lessons
│   ├── enrollmentRoutes.js # Enrollment & progress
│   ├── paymentRoutes.js    # Stripe & PayPal
│   ├── messageRoutes.js    # Conversations & messaging
│   ├── assignmentRoutes.js # Assignments & grading
│   ├── reviewRoutes.js     # Course reviews & ratings
│   └── adminRoutes.js      # Admin dashboard & reports
└── middleware/
    └── auth.js             # JWT verification + role guards
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, Stripe key, etc.
```

### 3. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/signup` | Register new user | No |
| POST | `/login` | Login + get JWT | No |
| GET | `/me` | Get current user | Yes |
| POST | `/refresh-token` | Refresh JWT | Yes |
| POST | `/logout` | Logout | Yes |

### Users — `/api/users`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/:userId` | Get user profile | Any |
| PUT | `/profile/update` | Update own profile | Any |
| POST | `/profile/upload-image` | Update profile image | Any |
| GET | `/student/dashboard` | Student dashboard stats | Student |
| GET | `/instructor/dashboard` | Instructor dashboard stats | Instructor |
| PUT | `/change-password` | Change password | Any |
| GET | `/instructor/:id/courses` | Get instructor's courses | Any |

### Courses — `/api/courses`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/create` | Create course | Instructor |
| GET | `/` | List published courses | Any |
| GET | `/:courseId` | Get course details | Any |
| PUT | `/:courseId/update` | Update course | Instructor |
| POST | `/:courseId/lesson` | Add lesson | Instructor |
| DELETE | `/:courseId` | Delete course | Instructor |
| POST | `/:courseId/publish` | Publish course | Instructor |

### Enrollments — `/api/enrollments`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/enroll` | Enroll in course | Student |
| GET | `/my-courses` | Get enrolled courses | Student |
| GET | `/:enrollmentId` | Get enrollment details | Any |
| PUT | `/:enrollmentId/update-progress` | Mark lesson complete | Any |
| PUT | `/:enrollmentId/unenroll` | Drop course | Any |

### Payments — `/api/payments`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/create-payment-intent` | Create Stripe intent | Student |
| POST | `/confirm-payment` | Confirm Stripe payment | Student |
| GET | `/history` | Payment history | Student |
| POST | `/paypal-webhook` | PayPal webhook | Public |
| POST | `/refund` | Request refund | Any |

### Messages — `/api/messages`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/conversation/create` | Create conversation | Any |
| GET | `/conversations` | List conversations | Any |
| GET | `/conversation/:id` | Get conversation | Any |
| GET | `/conversation/:id/messages` | Get messages | Any |
| POST | `/send` | Send message | Any |
| PUT | `/:messageId/edit` | Edit message | Any |
| DELETE | `/:messageId` | Delete message | Any |

### Assignments — `/api/assignments`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/create` | Create assignment | Instructor |
| GET | `/course/:courseId` | Get course assignments | Any |
| GET | `/:assignmentId` | Get assignment | Any |
| POST | `/:assignmentId/submit` | Submit assignment | Student |
| PUT | `/:assignmentId/grade/:submissionId` | Grade submission | Instructor |
| PUT | `/:assignmentId/update` | Update assignment | Instructor |
| DELETE | `/:assignmentId` | Delete assignment | Instructor |

### Reviews — `/api/reviews`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/create` | Write a review | Student |
| GET | `/course/:courseId` | Get course reviews | Any |
| GET | `/:reviewId` | Get single review | Any |
| PUT | `/:reviewId` | Edit own review | Student |
| DELETE | `/:reviewId` | Delete review | Student/Admin |
| POST | `/:reviewId/helpful` | Mark helpful/unhelpful | Any |
| POST | `/:reviewId/respond` | Instructor response | Instructor |

### Admin — `/api/admin`
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/dashboard` | Dashboard stats | Admin |
| GET | `/users` | List all users | Admin |
| GET | `/users/:userId` | User details | Admin |
| PUT | `/users/:userId/deactivate` | Deactivate user | Admin |
| PUT | `/users/:userId/activate` | Activate user | Admin |
| PUT | `/users/:userId/change-role` | Change user role | Admin |
| GET | `/courses` | List all courses | Admin |
| PUT | `/courses/:courseId/approve` | Approve course | Admin |
| DELETE | `/courses/:courseId` | Delete course | Admin |
| GET | `/payments` | List all payments | Admin |
| GET | `/reports/revenue` | Revenue report | Admin |
| GET | `/reports/users` | User report | Admin |

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `user-online` | `userId` | Register as online |
| `join-chat` | `conversationId` | Join conversation room |
| `leave-chat` | `conversationId` | Leave conversation room |
| `send-message` | `{ conversationId, senderId, message }` | Send real-time message |
| `typing` | `{ conversationId, userId, isTyping }` | Typing indicator |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `receive-message` | `{ senderId, message, conversationId, timestamp }` | New message |
| `user-typing` | `{ userId, isTyping }` | Typing status |
| `online-users` | `[userId, ...]` | List of online user IDs |

---

## Auth Header

All protected routes require:
```
Authorization: Bearer <your_jwt_token>
```

---

## Frontend Integration

```javascript
const API = "http://localhost:5000/api";

// Login
const res = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const { token, user } = await res.json();

// Authenticated request
const courses = await fetch(`${API}/courses`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Troubleshooting

**MongoDB won't connect?**
- Start MongoDB locally: `mongod`
- Or use MongoDB Atlas and paste the connection string in `.env`

**JWT errors?**
- Make sure `JWT_SECRET` is set in `.env`
- Include `Bearer ` prefix in the Authorization header
- Tokens expire after 7 days — use `/api/auth/refresh-token`

**CORS errors?**
- Set `CLIENT_URL` in `.env` to your frontend URL exactly

**Stripe errors?**
- Make sure `STRIPE_SECRET_KEY` is set
- Use test keys (`sk_test_...`) during development
