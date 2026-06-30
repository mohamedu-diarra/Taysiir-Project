const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  // User & Course Info
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },

  // Payment Details
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "USD",
  },

  // Discount/Promo
  originalAmount: Number,
  discountApplied: {
    type: Number,
    default: 0,
  },
  promoCode: String,

  // Payment Method
  paymentMethod: {
    type: String,
    enum: ["card", "paypal", "wallet", "bank_transfer"],
    required: true,
  },

  // Stripe/PayPal Info
  stripePaymentIntentId: String,
  stripeChargeId: String,
  paypalTransactionId: String,

  // Status
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "refunded"],
    default: "pending",
  },

  // Refund Info
  refundId: String,
  refundReason: String,
  refundedAt: Date,
  refundAmount: Number,

  // Invoice
  invoiceNumber: {
    type: String,
    unique: true,
  },
  invoiceUrl: String,

  // Error Handling
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0,
  },

  // Metadata
  ipAddress: String,
  userAgent: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,

  // Notes
  notes: String,
});

// Index for fast lookups
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ paypalTransactionId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
