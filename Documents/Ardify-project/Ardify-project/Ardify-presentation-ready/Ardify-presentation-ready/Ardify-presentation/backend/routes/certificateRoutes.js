const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const { verifyToken } = require("../middleware/auth");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const Course = require("../models/Course");

// @GET /api/certificates/generate/:enrollmentId
// Generate and stream a certificate PDF
router.get("/generate/:enrollmentId", verifyToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate("student", "firstName lastName email")
      .populate("course", "title category instructor");

    // Allow generation if enrollment exists (for demo, don't require 100% completion)
    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    if (enrollment.student._id.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const student = enrollment.student;
    const course = enrollment.course;
    const fullName = `${student.firstName} ${student.lastName}`;
    const issueDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
    const certId = `ARD-${Date.now().toString(36).toUpperCase()}`;

    // Create PDF
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Ardify-Certificate-${certId}.pdf"`);
    doc.pipe(res);

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill("#0a0f1a");

    // Outer border
    doc.rect(20, 20, W - 40, H - 40).lineWidth(3).strokeColor("#ff6000").stroke();
    doc.rect(28, 28, W - 56, H - 56).lineWidth(1).strokeColor("#ff6000").opacity(0.4).stroke();

    // Header area
    doc.opacity(1);
    doc.rect(0, 0, W, 110).fill("#0d1320");

    // ARDIFY logo text
    doc.font("Helvetica-Bold").fontSize(36).fillColor("#ff6000").text("ARDIFY", 60, 32);
    doc.font("Helvetica").fontSize(11).fillColor("#aaaaaa").text("Somalia's E-Learning Platform", 60, 74);

    // Certificate title
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#ff6000")
      .text("CERTIFICATE OF COMPLETION", 0, 42, { align: "center" });

    // Divider line
    doc.moveTo(60, 118).lineTo(W - 60, 118).lineWidth(1).strokeColor("#ff6000").opacity(0.5).stroke();

    // Main content
    doc.opacity(1);
    doc.font("Helvetica").fontSize(14).fillColor("#cccccc")
      .text("This is to certify that", 0, 145, { align: "center" });

    // Student name
    doc.font("Helvetica-Bold").fontSize(40).fillColor("#ffffff")
      .text(fullName, 0, 168, { align: "center" });

    // Underline
    const nameWidth = doc.widthOfString(fullName, { fontSize: 40 });
    const nameX = (W - nameWidth) / 2;
    doc.moveTo(nameX, 215).lineTo(nameX + nameWidth, 215)
      .lineWidth(2).strokeColor("#ff6000").opacity(0.8).stroke();

    doc.opacity(1);
    doc.font("Helvetica").fontSize(14).fillColor("#cccccc")
      .text("has successfully completed the course", 0, 228, { align: "center" });

    // Course name
    doc.font("Helvetica-Bold").fontSize(24).fillColor("#ff6000")
      .text(`"${course.title}"`, 0, 253, { align: "center" });

    // Category & level badge
    doc.font("Helvetica").fontSize(12).fillColor("#aaaaaa")
      .text(`Category: ${course.category || "Technology"}`, 0, 290, { align: "center" });

    // Bottom info row
    const bottomY = H - 110;
    doc.moveTo(60, bottomY - 15).lineTo(W - 60, bottomY - 15)
      .lineWidth(1).strokeColor("#ff6000").opacity(0.3).stroke();
    doc.opacity(1);

    // Date
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("Issue Date", 80, bottomY);
    doc.font("Helvetica").fontSize(11).fillColor("#aaaaaa").text(issueDate, 80, bottomY + 16);

    // Certificate ID
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
      .text("Certificate ID", W / 2 - 60, bottomY);
    doc.font("Helvetica").fontSize(11).fillColor("#aaaaaa")
      .text(certId, W / 2 - 60, bottomY + 16);

    // Signature area
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
      .text("Authorized By", W - 200, bottomY);
    doc.font("Helvetica").fontSize(11).fillColor("#aaaaaa")
      .text("Ardify Education Team", W - 200, bottomY + 16);

    // Watermark
    doc.font("Helvetica-Bold").fontSize(70).fillColor("#ff6000").opacity(0.05)
      .rotate(-30, { origin: [W / 2, H / 2] })
      .text("ARDIFY", W / 2 - 120, H / 2 - 30);

    doc.end();

    // Mark certificate as issued
    enrollment.certificateIssued = true;
    enrollment.certificateUrl = `/api/certificates/generate/${enrollment._id}`;
    await enrollment.save();

  } catch (err) {
    console.error("Certificate error:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

// @GET /api/certificates/my-certificates
router.get("/my-certificates", verifyToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.userId,
      status: { $in: ["active", "completed"] },
    }).populate("course", "title category");

    const certs = enrollments.map(e => ({
      enrollmentId: e._id,
      courseTitle: e.course?.title,
      category: e.course?.category,
      progress: e.progress?.progressPercentage || 0,
      issued: e.certificateIssued,
      enrolledAt: e.enrolledAt,
    }));

    res.json({ success: true, data: { certificates: certs } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
