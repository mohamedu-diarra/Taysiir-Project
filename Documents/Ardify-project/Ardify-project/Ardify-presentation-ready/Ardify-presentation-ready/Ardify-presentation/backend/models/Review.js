const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  // Review Info
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

  // Rating
  rating: {
    type: Number,
    required: [true, "Please provide a rating"],
    min: 1,
    max: 5,
  },

  // Review Content
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },

  // Detailed Rating
  contentQuality: {
    type: Number,
    min: 1,
    max: 5,
  },
  instructorQuality: {
    type: Number,
    min: 1,
    max: 5,
  },
  paceAndStructure: {
    type: Number,
    min: 1,
    max: 5,
  },
  valueForMoney: {
    type: Number,
    min: 1,
    max: 5,
  },

  // Helpful Count
  helpfulCount: {
    type: Number,
    default: 0,
  },
  unhelpfulCount: {
    type: Number,
    default: 0,
  },
  helpfulBy: [mongoose.Schema.Types.ObjectId],
  unhelpfulBy: [mongoose.Schema.Types.ObjectId],

  // Instructor Response
  instructorResponse: {
    content: String,
    respondedAt: Date,
  },

  // Status
  isVerified: {
    type: Boolean,
    default: false, // Verified as actual course completer
  },
  isApproved: {
    type: Boolean,
    default: true,
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
reviewSchema.index({ course: 1, rating: 1 });
reviewSchema.index({ student: 1 });
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
