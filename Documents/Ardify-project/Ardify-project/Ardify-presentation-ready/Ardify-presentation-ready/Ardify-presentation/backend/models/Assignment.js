const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Submission Content
  submittedFiles: [
    {
      fileName: String,
      fileUrl: String,
      uploadedAt: Date,
    },
  ],
  submissionText: String,

  // Status
  status: {
    type: String,
    enum: ["draft", "submitted", "graded", "late"],
    default: "draft",
  },

  // Grading
  grade: Number,
  maxGrade: {
    type: Number,
    required: true,
  },
  feedback: String,
  rubricScores: [
    {
      criterion: String,
      score: Number,
      maxScore: Number,
    },
  ],

  // Timestamps
  submittedAt: Date,
  gradedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const assignmentSchema = new mongoose.Schema({
  // Assignment Info
  title: {
    type: String,
    required: [true, "Please provide assignment title"],
  },
  description: {
    type: String,
    required: true,
  },

  // Course & Instructor
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Assignment Type
  assignmentType: {
    type: String,
    enum: ["homework", "project", "quiz", "submission", "discussion"],
    default: "submission",
  },

  // Grading
  maxGrade: {
    type: Number,
    required: true,
    default: 100,
  },
  rubric: [
    {
      criterion: String,
      description: String,
      maxScore: Number,
    },
  ],

  // Submissions
  submissions: [submissionSchema],

  // Deadlines
  dueDate: {
    type: Date,
    required: true,
  },
  allowLateSubmission: {
    type: Boolean,
    default: true,
  },
  latePenaltyPercentage: {
    type: Number,
    default: 10,
  },

  // Settings
  attachmentsRequired: {
    type: Boolean,
    default: true,
  },
  allowFileUpload: {
    type: Boolean,
    default: true,
  },
  allowTextSubmission: {
    type: Boolean,
    default: true,
  },

  // Statistics
  totalSubmissions: {
    type: Number,
    default: 0,
  },
  submittedCount: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    default: 0,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for performance
assignmentSchema.index({ course: 1, dueDate: 1 });
assignmentSchema.index({ instructor: 1 });

module.exports = {
  Assignment: mongoose.model("Assignment", assignmentSchema),
  Submission: mongoose.model("Submission", submissionSchema),
};
