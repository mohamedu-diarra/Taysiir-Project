// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Course = require("../models/Course");
const User = require("../models/User");

// ─── HELPER: Validate ObjectId ──────────────────────────────
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "ardify_secret_key");
    const user = await User.findById(decoded.userId || decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ─── GET INSTRUCTOR'S COURSES ────────────────────────────────
router.get("/instructor", authMiddleware, async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .populate("instructor", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    console.error("Error fetching instructor courses:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── CREATE A COURSE ──────────────────────────────────────────
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      category,
      level,
      description,
      summary,
      price,
      thumbnail,
      lessons,
      isPublished,
      status,
      language,
      duration,
    } = req.body;

    // Validate required fields
    if (!title || !category || !level) {
      return res.status(400).json({
        error: "Title, category, and level are required",
      });
    }

    // Create course
    const course = new Course({
      title,
      category,
      level,
      description: description || summary || "",
      summary: summary || description || "",
      price: price || 0,
      thumbnail: thumbnail || "Images/default-course.png",
      instructor: req.user._id,
      lessons: lessons || [],
      isPublished: isPublished || status === "live",
      status: status || "draft",
      language: language || "English",
      duration: duration || 0,
      enrollmentCount: 0,
      rating: 0,
    });

    await course.save();

    res.status(201).json({
      message: "Course created successfully",
      course: course,
      success: true,
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET ALL COURSES (PUBLIC) ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { category, level, search } = req.query;

    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(filter)
      .populate("instructor", "firstName lastName email bio specialization")
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET A SINGLE COURSE ──────────────────────────────────────
// ✅ FIXED: Added ObjectId validation
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        error: "Invalid course ID format",
        message: "The course ID provided is not valid"
      });
    }
    
    const course = await Course.findById(id)
      .populate("instructor", "firstName lastName email bio specialization");

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── UPDATE A COURSE ──────────────────────────────────────────
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }
    
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check if user is the instructor
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You are not the instructor of this course" });
    }

    const {
      title,
      category,
      level,
      description,
      summary,
      price,
      thumbnail,
      lessons,
      isPublished,
      status,
      language,
      duration,
    } = req.body;

    if (title) course.title = title;
    if (category) course.category = category;
    if (level) course.level = level;
    if (description) course.description = description;
    if (summary) course.summary = summary;
    if (price !== undefined) course.price = price;
    if (thumbnail) course.thumbnail = thumbnail;
    if (lessons) course.lessons = lessons;
    if (isPublished !== undefined) course.isPublished = isPublished;
    if (status) course.status = status;
    if (language) course.language = language;
    if (duration) course.duration = duration;

    await course.save();

    res.json({
      message: "Course updated successfully",
      course: course,
      success: true,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE A COURSE ──────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }
    
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You are not the instructor of this course" });
    }

    await course.deleteOne();

    res.json({
      message: "Course deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── ENROLL IN A COURSE ───────────────────────────────────────
router.post("/:id/enroll", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }
    
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    course.enrollmentCount += 1;
    await course.save();

    res.json({
      message: "Successfully enrolled in course",
      course: course,
      success: true,
    });
  } catch (error) {
    console.error("Error enrolling in course:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;