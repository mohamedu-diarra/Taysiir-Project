const express = require("express");
const { Assignment } = require("../models/Assignment");
const Enrollment = require("../models/Enrollment");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// @POST /api/assignments/create
// Create assignment
router.post(
  "/create",
  verifyToken,
  authorize("instructor", "admin"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        courseId,
        dueDate,
        maxGrade,
        assignmentType,
      } = req.body;

      const assignment = new Assignment({
        title,
        description,
        course: courseId,
        instructor: req.userId,
        dueDate,
        maxGrade: maxGrade || 100,
        assignmentType: assignmentType || "submission",
      });

      await assignment.save();

      res.status(201).json({
        message: "Assignment created",
        assignment,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// @GET /api/assignments/course/:courseId
// Get assignments for a course
router.get("/course/:courseId", verifyToken, async (req, res) => {
  try {
    const assignments = await Assignment.find({ course: req.params.courseId })
      .populate("instructor", "firstName lastName")
      .sort({ dueDate: 1 });

    res.json({
      assignments,
      total: assignments.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @GET /api/assignments/:assignmentId
// Get assignment details
router.get("/:assignmentId", verifyToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId)
      .populate("instructor", "firstName lastName profileImage")
      .populate("submissions.student", "firstName lastName profileImage");

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @POST /api/assignments/:assignmentId/submit
// Submit assignment
router.post(
  "/:assignmentId/submit",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { submittedFiles, submissionText } = req.body;

      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Check if already submitted
      const existingSubmission = assignment.submissions.find(
        (s) => s.student.toString() === req.userId,
      );

      if (existingSubmission && existingSubmission.status === "submitted") {
        return res
          .status(400)
          .json({
            error: "Already submitted. You can update your submission.",
          });
      }

      // Check enrollment
      const enrollment = await Enrollment.findOne({
        student: req.userId,
        course: assignment.course,
      });

      if (!enrollment) {
        return res.status(403).json({ error: "Not enrolled in this course" });
      }

      // Create submission
      const submission = {
        student: req.userId,
        submittedFiles: submittedFiles || [],
        submissionText: submissionText || "",
        status: "submitted",
        submittedAt: Date.now(),
        maxGrade: assignment.maxGrade,
      };

      // Check if late
      if (new Date() > new Date(assignment.dueDate)) {
        submission.status = "late";
      }

      if (existingSubmission) {
        // Update existing
        Object.assign(existingSubmission, submission);
      } else {
        // Add new submission
        assignment.submissions.push(submission);
        assignment.submittedCount += 1;
      }

      assignment.totalSubmissions = assignment.submissions.length;
      await assignment.save();

      res.json({
        message: "Assignment submitted",
        submission,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// @PUT /api/assignments/:assignmentId/grade/:submissionId
// Grade submission
router.put(
  "/:assignmentId/grade/:submissionId",
  verifyToken,
  authorize("instructor", "admin"),
  async (req, res) => {
    try {
      const { grade, feedback, rubricScores } = req.body;

      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Check authorization
      if (
        assignment.instructor.toString() !== req.userId &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const submission = assignment.submissions.id(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      submission.grade = grade;
      submission.feedback = feedback || "";
      submission.rubricScores = rubricScores || [];
      submission.status = "graded";
      submission.gradedAt = Date.now();

      // Calculate average score
      const gradedCount = assignment.submissions.filter(
        (s) => s.status === "graded",
      ).length;
      const totalScore = assignment.submissions.reduce(
        (sum, s) => sum + (s.grade || 0),
        0,
      );
      assignment.averageScore = totalScore / gradedCount;

      await assignment.save();

      res.json({
        message: "Submission graded",
        submission,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// @PUT /api/assignments/:assignmentId/update
// Update assignment
router.put(
  "/:assignmentId/update",
  verifyToken,
  authorize("instructor", "admin"),
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Check authorization
      if (
        assignment.instructor.toString() !== req.userId &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "Not authorized" });
      }

      Object.assign(assignment, req.body, { updatedAt: Date.now() });
      await assignment.save();

      res.json({
        message: "Assignment updated",
        assignment,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// @DELETE /api/assignments/:assignmentId
// Delete assignment
router.delete(
  "/:assignmentId",
  verifyToken,
  authorize("instructor", "admin"),
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Check authorization
      if (
        assignment.instructor.toString() !== req.userId &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await Assignment.findByIdAndDelete(req.params.assignmentId);

      res.json({ message: "Assignment deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
