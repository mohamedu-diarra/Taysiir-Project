const express = require("express");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const User = require("../models/User");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// @POST /api/enrollments/enroll
router.post("/enroll", verifyToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const existing = await Enrollment.findOne({ student: req.userId, course: courseId });
    if (existing) {
      return res.status(400).json({ success: false, message: "You are already enrolled in this course" });
    }

    const priceToPay = course.discount ? course.price * (1 - course.discount / 100) : course.price;

    const enrollment = await Enrollment.create({
      student: req.userId,
      course: courseId,
      pricePaid: priceToPay,
      paymentMethod: "demo",
      status: "active",
    });

    course.enrollmentCount = (course.enrollmentCount || 0) + 1;
    await course.save();

    await User.findByIdAndUpdate(req.userId, { $addToSet: { enrolledCourses: courseId } });
    await enrollment.populate("course", "title thumbnail category");

    res.status(201).json({
      success: true,
      data: {
        enrollment,
        message: `🎉 Successfully enrolled in "${course.title}"! You can now access all course materials.`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/enrollments/my-courses
router.get("/my-courses", verifyToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.userId })
      .populate("course", "title thumbnail category instructor enrollmentCount rating lessons")
      .sort({ enrolledAt: -1 });

    res.json({ success: true, data: { enrollments, total: enrollments.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/enrollments/stats
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.userId })
      .populate("course", "title lessons");

    const total = enrollments.length;
    const completed = enrollments.filter(e => e.status === "completed").length;
    const inProgress = enrollments.filter(e => e.status === "active").length;
    const avgProgress = total > 0
      ? Math.round(enrollments.reduce((s, e) => s + (e.progress?.progressPercentage || 0), 0) / total)
      : 0;

    res.json({
      success: true,
      data: {
        totalEnrolled: total,
        completed,
        inProgress,
        averageProgress: avgProgress,
        certificatesEarned: enrollments.filter(e => e.certificateIssued).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/enrollments/:enrollmentId/progress
router.put("/:enrollmentId/progress", verifyToken, async (req, res) => {
  try {
    const { progressPercentage } = req.body;
    const enrollment = await Enrollment.findById(req.params.enrollmentId);
    if (!enrollment) return res.status(404).json({ success: false, message: "Enrollment not found" });
    if (enrollment.student.toString() !== req.userId)
      return res.status(403).json({ success: false, message: "Not authorized" });

    enrollment.progress.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    if (enrollment.progress.progressPercentage === 100) {
      enrollment.status = "completed";
      enrollment.isCompleted = true;
      enrollment.completedAt = new Date();
    }
    enrollment.lastAccessedAt = new Date();
    await enrollment.save();

    res.json({ success: true, data: { progress: enrollment.progress, status: enrollment.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/enrollments/:enrollmentId
router.get("/:enrollmentId", verifyToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate("course", "title thumbnail category lessons instructor");
    if (!enrollment) return res.status(404).json({ success: false, message: "Enrollment not found" });
    if (enrollment.student.toString() !== req.userId)
      return res.status(403).json({ success: false, message: "Not authorized" });
    res.json({ success: true, data: { enrollment } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
