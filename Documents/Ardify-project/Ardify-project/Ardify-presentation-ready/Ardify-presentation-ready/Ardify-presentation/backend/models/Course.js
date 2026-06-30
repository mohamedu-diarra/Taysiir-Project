const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  videoUrl: String,
  duration: Number, // in minutes
  resources: [
    {
      title: String,
      fileUrl: String,
      fileType: String, // pdf, docx, pptx, etc
    },
  ],
  order: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const courseSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, "Please provide course title"],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: [true, "Please provide course description"],
  },
  summary: {
    type: String,
    required: true,
  },

  // Instructor
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Course Content
  category: {
    type: String,
    enum: [
      "Web Development",
      "Mobile Development",
      "UI/UX Design",
      "Cybersecurity",
      "Data Science",
      "Other",
    ],
    required: true,
  },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Beginner",
  },
  lessons: [lessonSchema],
  learningOutcomes: [String],

  // Media
  thumbnail: {
    type: String,
    default: "https://via.placeholder.com/300x200",
  },
  coverImage: {
    type: String,
    default: "https://via.placeholder.com/1200x400",
  },

  // Pricing
  price: {
    type: Number,
    default: 0, // 0 means free
  },
  currency: {
    type: String,
    default: "USD",
  },
  discount: {
    type: Number,
    default: 0, // percentage
    max: 100,
  },

  // Statistics
  enrollmentCount: {
    type: Number,
    default: 0,
  },
  completionRate: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },

  // Status
  isPublished: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },

  // SEO
  tags: [String],
  keywords: [String],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  publishedAt: Date,

  // Additional Info
  language: {
    type: String,
    default: "English",
  },
  duration: Number, // total hours
  prerequisites: [String],
  certificateAvailable: {
    type: Boolean,
    default: true,
  },
});

// Pre-save hook to create slug
courseSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  next();
});

// Populate instructor by default
courseSchema.pre(/^find/, function (next) {
  if (this.options._recursed) {
    return next();
  }
  this.populate({
    path: "instructor",
    select: "firstName lastName profileImage specialization rating",
  });
  next();
});

module.exports = mongoose.model("Course", courseSchema);
