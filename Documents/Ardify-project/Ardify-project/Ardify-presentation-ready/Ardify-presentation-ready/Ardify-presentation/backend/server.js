const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Static uploads directory
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ─── Database ──────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ardify";
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    seedInitialData();
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/certificates", require("./routes/certificateRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/demo", require("./routes/demoRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/assignments", require("./routes/assignmentRoutes"));

// ─── Health Check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ Ardify API running",
    timestamp: new Date(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── ✅ FIXED: Serve Frontend Static Files ─────────────────────
// Get the project root directory (where both backend and frontend live)
const projectRoot = path.resolve(__dirname, "..");
const frontendPath = path.join(projectRoot, "frontend");

// Fallback: if frontend isn't in the parent, check current directory
let finalFrontendPath = frontendPath;
if (!fs.existsSync(finalFrontendPath)) {
  finalFrontendPath = path.join(__dirname, "frontend");
}

console.log(`🔍 Looking for frontend at: ${finalFrontendPath}`);

if (fs.existsSync(finalFrontendPath)) {
  console.log(`📁 Serving frontend from: ${finalFrontendPath}`);
  
  // Serve static files (CSS, JS, Images, etc.)
  app.use(express.static(finalFrontendPath));
  
  // For SPA - handle all non-API routes
  app.get("*", (req, res, next) => {
    // Skip API routes - let the API handlers process them
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      return next();
    }
    
    // Check if the requested file exists
    const filePath = path.join(finalFrontendPath, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    
    // Otherwise, serve index.html for client-side routing
    const indexPath = path.join(finalFrontendPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
} else {
  console.warn(`⚠️ Frontend directory not found at: ${finalFrontendPath}`);
  console.warn("Only API routes are available.");
}

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ─── Seed data for demo ────────────────────────────────────────
async function seedInitialData() {
  try {
    const User = require("./models/User");
    const Course = require("./models/Course");

    // Seed admin if not exists
    const adminExists = await User.findOne({ email: "admin@ardify.so" });
    if (!adminExists) {
      await User.create({
        firstName: "Admin",
        lastName: "Ardify",
        email: "admin@ardify.so",
        password: "admin123",
        role: "admin",
      });
      console.log("✅ Demo admin seeded: admin@ardify.so / admin123");
    }

    // Seed demo instructor
    const instrExists = await User.findOne({ email: "instructor@ardify.so" });
    if (!instrExists) {
      await User.create({
        firstName: "Ahmed",
        lastName: "Hassan",
        email: "instructor@ardify.so",
        password: "demo123",
        role: "instructor",
        bio: "Senior Web Developer with 8 years of experience",
        specialization: "Full-Stack Web Development",
      });
      console.log("✅ Demo instructor seeded: instructor@ardify.so / demo123");
    }

    // Seed demo courses
    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      const instructor = await User.findOne({ email: "instructor@ardify.so" });
      const courses = [
        {
          title: "Full-Stack Web Development",
          description: "Master HTML, CSS, JavaScript, Node.js and MongoDB to build complete web applications from scratch.",
          summary: "Learn full-stack development with modern tools and frameworks.",
          category: "Web Development",
          level: "Beginner",
          price: 99,
          instructor: instructor._id,
          thumbnail: "Images/ch-1.png",
          isPublished: true,
          enrollmentCount: 247,
          rating: 4.8,
          lessons: [
            { title: "Introduction to HTML5", duration: 45, order: 1 },
            { title: "CSS Fundamentals & Flexbox", duration: 60, order: 2 },
            { title: "JavaScript ES6+", duration: 90, order: 3 },
            { title: "Node.js & Express", duration: 75, order: 4 },
            { title: "MongoDB & Mongoose", duration: 80, order: 5 },
          ],
        },
        {
          title: "UI/UX Design Mastery",
          description: "Learn Figma, design thinking, user research, and create stunning digital interfaces.",
          summary: "From wireframes to prototypes — master modern UI/UX design.",
          category: "UI/UX Design",
          level: "Beginner",
          price: 79,
          instructor: instructor._id,
          thumbnail: "Images/uiux.png",
          isPublished: true,
          enrollmentCount: 183,
          rating: 4.7,
          lessons: [
            { title: "Design Thinking Process", duration: 50, order: 1 },
            { title: "Figma Fundamentals", duration: 70, order: 2 },
            { title: "User Research Methods", duration: 55, order: 3 },
            { title: "Prototyping & Testing", duration: 65, order: 4 },
          ],
        },
        {
          title: "Ethical Hacking & Cybersecurity",
          description: "Learn penetration testing, network security, and ethical hacking techniques.",
          summary: "Protect systems by learning how attackers think.",
          category: "Cybersecurity",
          level: "Intermediate",
          price: 129,
          instructor: instructor._id,
          thumbnail: "Images/ch-1.png",
          isPublished: true,
          enrollmentCount: 156,
          rating: 4.9,
          lessons: [
            { title: "Intro to Cybersecurity", duration: 45, order: 1 },
            { title: "Network Fundamentals", duration: 60, order: 2 },
            { title: "Ethical Hacking Basics", duration: 90, order: 3 },
            { title: "Penetration Testing", duration: 80, order: 4 },
          ],
        },
        {
          title: "Digital Marketing",
          description: "Master SEO, social media marketing, email campaigns, and Google Ads.",
          summary: "Drive traffic and grow your brand with data-driven marketing.",
          category: "Other",
          level: "Beginner",
          price: 69,
          instructor: instructor._id,
          thumbnail: "Images/digital.png",
          isPublished: true,
          enrollmentCount: 321,
          rating: 4.6,
          lessons: [
            { title: "Digital Marketing Overview", duration: 40, order: 1 },
            { title: "SEO Fundamentals", duration: 65, order: 2 },
            { title: "Social Media Strategy", duration: 55, order: 3 },
            { title: "Google Ads Mastery", duration: 70, order: 4 },
          ],
        },
        {
          title: "Data Analysis with Excel",
          description: "Master Excel for data analysis, pivot tables, charts, and business intelligence.",
          summary: "Transform raw data into business insights with Excel.",
          category: "Other",
          level: "Beginner",
          price: 59,
          instructor: instructor._id,
          thumbnail: "Images/excel.png",
          isPublished: true,
          enrollmentCount: 198,
          rating: 4.5,
          lessons: [
            { title: "Excel Basics", duration: 45, order: 1 },
            { title: "Formulas & Functions", duration: 60, order: 2 },
            { title: "Pivot Tables", duration: 55, order: 3 },
            { title: "Data Visualization", duration: 50, order: 4 },
          ],
        },
        {
          title: "Computer Networking",
          description: "Learn TCP/IP, network protocols, routing, switching, and network configuration.",
          summary: "Build and manage modern computer networks.",
          category: "Cybersecurity",
          level: "Intermediate",
          price: 89,
          instructor: instructor._id,
          thumbnail: "Images/Networking.png",
          isPublished: true,
          enrollmentCount: 134,
          rating: 4.7,
          lessons: [
            { title: "Network Models", duration: 50, order: 1 },
            { title: "TCP/IP Stack", duration: 65, order: 2 },
            { title: "Routing & Switching", duration: 80, order: 3 },
            { title: "Network Security", duration: 70, order: 4 },
          ],
        },
      ];
      await Course.insertMany(courses);
      console.log("✅ Demo courses seeded");
    }
  } catch (e) {
    console.error("Seed error (non-fatal):", e.message);
  }
}

// ─── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Ardify backend running at http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  if (fs.existsSync(finalFrontendPath)) {
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
  }
});

module.exports = app;