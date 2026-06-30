const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT Token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "No token provided, authorization denied" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user;
    req.userId = decoded.id;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Check specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  authorize("admin")(req, res, next);
};

// Check if user is instructor or admin
const isInstructor = (req, res, next) => {
  authorize("instructor", "admin")(req, res, next);
};

// Check if user is student
const isStudent = (req, res, next) => {
  authorize("student")(req, res, next);
};

module.exports = {
  verifyToken,
  authorize,
  isAdmin,
  isInstructor,
  isStudent,
};
