const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },

  // Progress tracking
  progress: {
    completedLessons: [
      {
        lessonId: mongoose.Schema.Types.ObjectId,
        completedAt: Date,
      },
    ],
    currentLessonIndex: {
      type: Number,
      default: 0,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },

  // Performance
  quiz: {
    scores: [
      {
        quizId: mongoose.Schema.Types.ObjectId,
        score: Number,
        maxScore: Number,
        completedAt: Date,
      },
    ],
    averageScore: {
      type: Number,
      default: 0,
    },
  },

  assignments: {
    submitted: [
      {
        assignmentId: mongoose.Schema.Types.ObjectId,
        submittedAt: Date,
        fileUrl: String,
        grade: Number,
        feedback: String,
      },
    ],
  },

  // Status
  status: {
    type: String,
    enum: ["active", "completed", "dropped"],
    default: "active",
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: Date,

  // Certificate
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  certificateUrl: String,

  // Pricing & Payment
  pricePaid: {
    type: Number,
    required: true,
  },
  paymentMethod: String, // card, paypal, wallet
  transactionId: String,

  // Timestamps
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: Date,

  // Notes
  notes: String,
});

// Index for fast lookups
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
