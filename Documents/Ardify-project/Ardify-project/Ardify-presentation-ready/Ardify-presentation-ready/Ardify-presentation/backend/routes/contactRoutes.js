const express = require("express");
const router = express.Router();

// Simple Contact model inline
const mongoose = require("mongoose");
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, default: "General Inquiry" },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["new", "read", "replied"], default: "new" },
});
const Contact = mongoose.models.Contact || mongoose.model("Contact", contactSchema);

// @POST /api/contact
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Name, email, and message are required." });
    }
    const contact = await Contact.create({ name, email, subject, message });
    res.status(201).json({
      success: true,
      data: { id: contact._id, message: "Your message has been received! We'll get back to you within 24 hours." },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/contact (admin only - no strict auth for demo)
router.get("/", async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: { messages, total: messages.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
