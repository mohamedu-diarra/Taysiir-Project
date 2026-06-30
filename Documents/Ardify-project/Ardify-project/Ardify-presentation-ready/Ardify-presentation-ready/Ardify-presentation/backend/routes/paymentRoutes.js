const express = require("express");
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy",
);
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const User = require("../models/User");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// @POST /api/payments/create-payment-intent
// Create Stripe payment intent
router.post(
  "/create-payment-intent",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { courseId, paymentMethodId } = req.body;

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Check if already enrolled
      const existingEnrollment = await Enrollment.findOne({
        student: req.userId,
        course: courseId,
      });

      if (existingEnrollment) {
        return res
          .status(400)
          .json({ error: "Already enrolled in this course" });
      }

      // Calculate amount
      let amount = course.price;
      if (course.discount) {
        amount = course.price * (1 - course.discount / 100);
      }

      // Free course
      if (amount === 0) {
        const enrollment = new Enrollment({
          student: req.userId,
          course: courseId,
          pricePaid: 0,
          paymentMethod: "free",
          status: "active",
        });
        await enrollment.save();

        return res.status(201).json({
          message: "Enrolled in free course",
          enrollment,
        });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        description: `Enrollment in course: ${course.title}`,
        metadata: {
          courseId: courseId,
          userId: req.userId.toString(),
        },
      });

      // Create payment record
      const payment = new Payment({
        user: req.userId,
        course: courseId,
        amount,
        paymentMethod: "card",
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
        ipAddress: req.ip,
      });

      await payment.save();

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },
);

// @POST /api/payments/confirm-payment
// Confirm Stripe payment
router.post(
  "/confirm-payment",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { paymentIntentId, courseId } = req.body;

      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment was not successful" });
      }

      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        {
          status: "completed",
          completedAt: Date.now(),
          stripeChargeId: paymentIntent.charges.data[0]?.id,
        },
        { new: true },
      );

      // Create enrollment
      const course = await Course.findById(courseId);
      const enrollment = new Enrollment({
        student: req.userId,
        course: courseId,
        pricePaid: paymentIntent.amount / 100,
        paymentMethod: "card",
        transactionId: paymentIntent.charges.data[0]?.id,
        status: "active",
      });

      await enrollment.save();

      // Update course enrollment count
      course.enrollmentCount += 1;
      await course.save();

      // Update user's enrolled courses
      await User.findByIdAndUpdate(req.userId, {
        $addToSet: { enrolledCourses: courseId },
      });

      res.json({
        message: "Payment confirmed and enrolled successfully",
        enrollment,
        payment,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },
);

// @GET /api/payments/history
// Get payment history
router.get("/history", verifyToken, authorize("student"), async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId })
      .populate("course", "title thumbnail")
      .sort({ createdAt: -1 });

    res.json({
      payments,
      total: payments.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @POST /api/payments/paypal-webhook
// PayPal webhook handler
router.post("/paypal-webhook", async (req, res) => {
  try {
    const { id, status, resource } = req.body;

    if (status === "COMPLETED") {
      const payment = await Payment.findOneAndUpdate(
        { paypalTransactionId: resource.id },
        { status: "completed", completedAt: Date.now() },
        { new: true },
      );

      if (payment) {
        // Create enrollment
        const enrollment = new Enrollment({
          student: payment.user,
          course: payment.course,
          pricePaid: payment.amount,
          paymentMethod: "paypal",
          transactionId: resource.id,
          status: "active",
        });
        await enrollment.save();

        // Update user and course
        await User.findByIdAndUpdate(payment.user, {
          $addToSet: { enrolledCourses: payment.course },
        });

        const course = await Course.findById(payment.course);
        course.enrollmentCount += 1;
        await course.save();
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// @POST /api/payments/refund
// Request refund
router.post("/refund", verifyToken, async (req, res) => {
  try {
    const { paymentId, reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.user.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (payment.status !== "completed") {
      return res
        .status(400)
        .json({ error: "Can only refund completed payments" });
    }

    // Refund via Stripe
    if (payment.stripeChargeId) {
      const refund = await stripe.refunds.create({
        charge: payment.stripeChargeId,
        reason: reason || "requested_by_customer",
      });

      payment.status = "refunded";
      payment.refundId = refund.id;
      payment.refundReason = reason;
      payment.refundedAt = Date.now();
      payment.refundAmount = payment.amount;
      await payment.save();

      // Remove enrollment
      await Enrollment.findOneAndUpdate(
        { student: req.userId, course: payment.course },
        { status: "dropped" },
      );

      return res.json({
        message: "Refund processed successfully",
        refund,
      });
    }

    res.status(400).json({ error: "Unable to process refund" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
