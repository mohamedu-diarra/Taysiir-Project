const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// @GET /api/users/:userId
// Get public profile of a user
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "-password -paymentMethods -wallet"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If viewing own profile, return full data
    if (req.userId === req.params.userId) {
      return res.json({ user });
    }

    // Otherwise return public profile only
    res.json({ user: user.getPublicProfile() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @PUT /api/users/profile/update
// Update own profile
router.put(
  "/profile/update",
  verifyToken,
  [
    body("firstName").optional().notEmpty().withMessage("First name cannot be empty"),
    body("lastName").optional().notEmpty().withMessage("Last name cannot be empty"),
    body("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
    body("bio").optional().isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const allowedFields = [
        "firstName",
        "lastName",
        "phone",
        "bio",
        "specialization",
        "preferences",
      ];

      const updateData = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      updateData.updatedAt = Date.now();

      const user = await User.findByIdAndUpdate(req.userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-password -paymentMethods");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: "Profile updated successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @POST /api/users/profile/upload-image
// Update profile image URL (Cloudinary URL expected from frontend)
router.post("/profile/upload-image", verifyToken, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: imageUrl, updatedAt: Date.now() },
      { new: true }
    ).select("-password -paymentMethods");

    res.json({
      message: "Profile image updated successfully",
      profileImage: user.profileImage,
      user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @GET /api/users/student/dashboard
// Get student dashboard data
router.get(
  "/student/dashboard",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const user = await User.findById(req.userId).select("-password -paymentMethods");

      // Get enrollments with course info
      const enrollments = await Enrollment.find({ student: req.userId })
        .populate("course", "title thumbnail category instructor level")
        .sort({ lastAccessedAt: -1 });

      // Stats
      const totalEnrolled = enrollments.length;
      const completed = enrollments.filter((e) => e.isCompleted).length;
      const inProgress = enrollments.filter(
        (e) => !e.isCompleted && e.status === "active"
      ).length;

      // Average progress across all active courses
      const activeEnrollments = enrollments.filter((e) => e.status === "active");
      const avgProgress =
        activeEnrollments.length > 0
          ? Math.round(
              activeEnrollments.reduce(
                (sum, e) => sum + e.progress.progressPercentage,
                0
              ) / activeEnrollments.length
            )
          : 0;

      // Recently accessed
      const recentCourses = enrollments.slice(0, 5);

      // Payment history summary
      const payments = await Payment.find({ user: req.userId, status: "completed" })
        .select("amount course createdAt")
        .populate("course", "title")
        .sort({ createdAt: -1 })
        .limit(5);

      const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);

      res.json({
        user,
        stats: {
          totalEnrolled,
          completed,
          inProgress,
          avgProgress,
          totalSpent: totalSpent.toFixed(2),
        },
        recentCourses,
        recentPayments: payments,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @GET /api/users/instructor/dashboard
// Get instructor dashboard data
router.get(
  "/instructor/dashboard",
  verifyToken,
  authorize("instructor", "admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.userId).select("-password -paymentMethods");

      // Get instructor's courses
      const courses = await Course.find({ instructor: req.userId }).sort({
        createdAt: -1,
      });

      const totalCourses = courses.length;
      const publishedCourses = courses.filter((c) => c.isPublished).length;
      const draftCourses = courses.filter((c) => !c.isPublished).length;

      // Total students across all courses
      const totalStudents = courses.reduce((sum, c) => sum + c.enrollmentCount, 0);

      // Total revenue (sum of completed payments for instructor's courses)
      const courseIds = courses.map((c) => c._id);
      const revenueResult = await Payment.aggregate([
        { $match: { course: { $in: courseIds }, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]);

      const totalRevenue = revenueResult[0]?.total || 0;
      const totalSales = revenueResult[0]?.count || 0;

      // Average rating across all published courses
      const avgRating =
        publishedCourses > 0
          ? (
              courses
                .filter((c) => c.isPublished)
                .reduce((sum, c) => sum + c.averageRating, 0) / publishedCourses
            ).toFixed(1)
          : 0;

      // Recent enrollments in instructor's courses
      const recentEnrollments = await Enrollment.find({
        course: { $in: courseIds },
      })
        .populate("student", "firstName lastName profileImage")
        .populate("course", "title")
        .sort({ enrolledAt: -1 })
        .limit(10);

      // Monthly revenue breakdown (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyRevenue = await Payment.aggregate([
        {
          $match: {
            course: { $in: courseIds },
            status: "completed",
            completedAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$completedAt" } },
            revenue: { $sum: "$amount" },
            sales: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        user,
        stats: {
          totalCourses,
          publishedCourses,
          draftCourses,
          totalStudents,
          totalRevenue: totalRevenue.toFixed(2),
          totalSales,
          avgRating,
        },
        courses,
        recentEnrollments,
        monthlyRevenue,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @PUT /api/users/change-password
// Change own password
router.put(
  "/change-password",
  verifyToken,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.userId).select("+password");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Prevent reusing the same password
      const isSame = await user.comparePassword(newPassword);
      if (isSame) {
        return res
          .status(400)
          .json({ error: "New password must be different from current password" });
      }

      user.password = newPassword;
      user.updatedAt = Date.now();
      await user.save(); // triggers bcrypt pre-save hook

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @GET /api/users/instructor/:instructorId/courses
// Get all published courses by a specific instructor (public)
router.get("/instructor/:instructorId/courses", verifyToken, async (req, res) => {
  try {
    const instructor = await User.findById(req.params.instructorId).select(
      "firstName lastName profileImage bio specialization rating studentCount"
    );

    if (!instructor || instructor.role === "student") {
      return res.status(404).json({ error: "Instructor not found" });
    }

    const courses = await Course.find({
      instructor: req.params.instructorId,
      isPublished: true,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      instructor,
      courses,
      totalCourses: courses.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
