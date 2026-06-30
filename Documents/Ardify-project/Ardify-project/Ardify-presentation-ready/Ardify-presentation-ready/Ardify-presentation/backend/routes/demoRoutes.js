const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

// Demo endpoints that simulate external services (Stripe, PayPal, AI tutor, Chat)
// These return realistic demo responses for presentation purposes

// @POST /api/demo/payment/stripe
router.post("/payment/stripe", verifyToken, (req, res) => {
  const { amount, courseTitle } = req.body;
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        transactionId: "pi_demo_" + Date.now(),
        amount,
        currency: "USD",
        status: "succeeded",
        courseTitle,
        message: `Payment of $${amount} processed successfully via Stripe.`,
        receipt: `https://demo.stripe.com/receipts/ardify_${Date.now()}`,
        isDemo: true,
      },
    });
  }, 1200); // Simulate payment processing delay
});

// @POST /api/demo/payment/paypal
router.post("/payment/paypal", verifyToken, (req, res) => {
  const { amount, courseTitle } = req.body;
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        orderId: "PAYPAL-DEMO-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        amount,
        currency: "USD",
        status: "COMPLETED",
        courseTitle,
        message: `PayPal payment of $${amount} completed.`,
        isDemo: true,
      },
    });
  }, 1000);
});

// @POST /api/demo/ai-tutor
router.post("/ai-tutor", verifyToken, (req, res) => {
  const { question, courseContext } = req.body;
  const responses = [
    `Great question! In ${courseContext || "this course"}, this concept is fundamental. Let me explain it step by step...`,
    `That's a common question from students. The key thing to understand here is the relationship between the components you're working with.`,
    `I can see you're making good progress! To answer your question directly: start with the basics and build up complexity gradually.`,
    `Excellent thinking! This is actually covered in the next module, but I can give you a preview here.`,
    `Let me break this down for you. There are three main aspects to consider when approaching this problem.`,
  ];
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        response: `${randomResponse} [AI Tutor Demo Mode — powered by Ardify Intelligence]`,
        confidence: 0.94,
        relatedTopics: ["Module 2", "Practice Exercise 3", "Community Forum"],
        isDemo: true,
      },
    });
  }, 800);
});

// @POST /api/demo/analytics
router.post("/analytics", verifyToken, (req, res) => {
  res.json({
    success: true,
    data: {
      weeklyProgress: [65, 72, 68, 80, 75, 88, 92],
      topCategories: ["Web Dev", "UI/UX", "Cybersecurity"],
      avgSessionTime: "42 minutes",
      streak: 7,
      isDemo: true,
    },
  });
});

module.exports = router;
