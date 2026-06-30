const express = require("express");
const { body, validationResult } = require("express-validator");
const Review = require("../models/Review");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// @POST /api/reviews/create
// Create a review for a course (must be enrolled)
router.post(
  "/create",
  verifyToken,
  authorize("student"),
  [
    body("courseId").notEmpty().withMessage("Course ID is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title").notEmpty().withMessage("Review title is required"),
    body("content")
      .isLength({ min: 10 })
      .withMessage("Review content must be at least 10 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        courseId,
        rating,
        title,
        content,
        contentQuality,
        instructorQuality,
        paceAndStructure,
        valueForMoney,
      } = req.body;

      // Must be enrolled to review
      const enrollment = await Enrollment.findOne({
        student: req.userId,
        course: courseId,
        status: { $in: ["active", "completed"] },
      });

      if (!enrollment) {
        return res
          .status(403)
          .json({ error: "You must be enrolled in this course to review it" });
      }

      // One review per student per course
      const existingReview = await Review.findOne({
        student: req.userId,
        course: courseId,
      });

      if (existingReview) {
        return res
          .status(400)
          .json({ error: "You have already reviewed this course" });
      }

      const review = new Review({
        student: req.userId,
        course: courseId,
        rating,
        title,
        content,
        contentQuality,
        instructorQuality,
        paceAndStructure,
        valueForMoney,
        isVerified: enrollment.isCompleted,
      });

      await review.save();

      // Update course average rating
      const allReviews = await Review.find({ course: courseId, isApproved: true });
      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await Course.findByIdAndUpdate(courseId, {
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: allReviews.length,
      });

      await review.populate("student", "firstName lastName profileImage");

      res.status(201).json({
        message: "Review submitted successfully",
        review,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @GET /api/reviews/course/:courseId
// Get all reviews for a course
router.get("/course/:courseId", verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "recent" } = req.query;
    const skip = (page - 1) * limit;

    let sortOption = { createdAt: -1 };
    if (sort === "highest") sortOption = { rating: -1 };
    if (sort === "lowest") sortOption = { rating: 1 };
    if (sort === "helpful") sortOption = { helpfulCount: -1 };

    const reviews = await Review.find({
      course: req.params.courseId,
      isApproved: true,
    })
      .populate("student", "firstName lastName profileImage")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments({
      course: req.params.courseId,
      isApproved: true,
    });

    // Rating distribution
    const distribution = await Review.aggregate([
      { $match: { course: new (require("mongoose").Types.ObjectId)(req.params.courseId), isApproved: true } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    res.json({
      reviews,
      total,
      distribution,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @GET /api/reviews/:reviewId
// Get single review
router.get("/:reviewId", verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId)
      .populate("student", "firstName lastName profileImage")
      .populate("course", "title thumbnail");

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @PUT /api/reviews/:reviewId
// Update own review
router.put(
  "/:reviewId",
  verifyToken,
  authorize("student"),
  [
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const review = await Review.findById(req.params.reviewId);

      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      if (review.student.toString() !== req.userId) {
        return res.status(403).json({ error: "Not authorized to edit this review" });
      }

      const { rating, title, content, contentQuality, instructorQuality, paceAndStructure, valueForMoney } = req.body;

      if (rating !== undefined) review.rating = rating;
      if (title) review.title = title;
      if (content) review.content = content;
      if (contentQuality !== undefined) review.contentQuality = contentQuality;
      if (instructorQuality !== undefined) review.instructorQuality = instructorQuality;
      if (paceAndStructure !== undefined) review.paceAndStructure = paceAndStructure;
      if (valueForMoney !== undefined) review.valueForMoney = valueForMoney;
      review.updatedAt = Date.now();

      await review.save();

      // Recalculate course average rating
      const allReviews = await Review.find({ course: review.course, isApproved: true });
      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await Course.findByIdAndUpdate(review.course, {
        averageRating: Math.round(avgRating * 10) / 10,
      });

      res.json({ message: "Review updated", review });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @DELETE /api/reviews/:reviewId
// Delete own review
router.delete("/:reviewId", verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.student.toString() !== req.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this review" });
    }

    const courseId = review.course;
    await Review.findByIdAndDelete(req.params.reviewId);

    // Recalculate course average rating
    const allReviews = await Review.find({ course: courseId, isApproved: true });
    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    await Course.findByIdAndUpdate(courseId, {
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length,
    });

    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @POST /api/reviews/:reviewId/helpful
// Mark a review as helpful / unhelpful
router.post("/:reviewId/helpful", verifyToken, async (req, res) => {
  try {
    const { isHelpful } = req.body;
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const userId = req.userId;

    if (isHelpful) {
      if (review.helpfulBy.includes(userId)) {
        return res.status(400).json({ error: "Already marked as helpful" });
      }
      review.helpfulBy.push(userId);
      review.helpfulCount += 1;
      // Remove from unhelpful if it was there
      review.unhelpfulBy = review.unhelpfulBy.filter((id) => id.toString() !== userId);
    } else {
      if (review.unhelpfulBy.includes(userId)) {
        return res.status(400).json({ error: "Already marked as unhelpful" });
      }
      review.unhelpfulBy.push(userId);
      review.unhelpfulCount += 1;
      review.helpfulBy = review.helpfulBy.filter((id) => id.toString() !== userId);
    }

    await review.save();

    res.json({
      message: "Feedback recorded",
      helpfulCount: review.helpfulCount,
      unhelpfulCount: review.unhelpfulCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @POST /api/reviews/:reviewId/respond
// Instructor responds to a review
router.post(
  "/:reviewId/respond",
  verifyToken,
  authorize("instructor", "admin"),
  async (req, res) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Response content is required" });
      }

      const review = await Review.findById(req.params.reviewId).populate(
        "course",
        "instructor"
      );

      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      // Only the course instructor or admin can respond
      if (
        review.course.instructor.toString() !== req.userId &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ error: "Only the course instructor can respond to reviews" });
      }

      review.instructorResponse = {
        content,
        respondedAt: Date.now(),
      };

      await review.save();

      res.json({
        message: "Response added",
        instructorResponse: review.instructorResponse,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
