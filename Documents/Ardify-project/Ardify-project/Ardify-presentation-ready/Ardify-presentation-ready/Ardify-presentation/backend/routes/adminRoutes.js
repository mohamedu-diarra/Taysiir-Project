const express = require("express");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { verifyToken, authorize } = require("../middleware/auth");
const mongoose = require("mongoose");

const router = express.Router();
const adminOnly = [verifyToken, authorize("admin")];

// @GET /api/admin/dashboard
router.get("/dashboard", ...adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalStudents, totalInstructors, totalCourses, totalEnrollments] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "instructor" }),
        Course.countDocuments(),
        Enrollment.countDocuments(),
      ]);

    // Contact messages count
    let contactCount = 0;
    try {
      const Contact = mongoose.model("Contact");
      contactCount = await Contact.countDocuments({ status: "new" });
    } catch (e) {}

    const recentUsers = await User.find()
      .sort({ createdAt: -1 }).limit(5).select("firstName lastName email role createdAt");
    const recentCourses = await Course.find()
      .sort({ createdAt: -1 }).limit(5).select("title category enrollmentCount rating");

    res.json({
      success: true,
      data: {
        stats: { totalUsers, totalStudents, totalInstructors, totalCourses, totalEnrollments, newMessages: contactCount },
        recentUsers,
        recentCourses,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/admin/users
router.get("/users", ...adminOnly, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    let filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (page - 1) * limit;
    const users = await User.find(filter).skip(skip).limit(Number(limit)).select("-password").sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);
    res.json({ success: true, data: { users, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/admin/users/:userId/toggle
router.put("/users/:userId/toggle", ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: { isActive: user.isActive, message: `User ${user.isActive ? "activated" : "deactivated"}` } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/admin/courses
router.get("/courses", ...adminOnly, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructor", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { courses, total: courses.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/admin/messages
router.get("/messages", ...adminOnly, async (req, res) => {
  try {
    const Contact = mongoose.model("Contact");
    const messages = await Contact.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: { messages, total: messages.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
