const jwt = require("jsonwebtoken");

/**
 * Middleware: Verify JWT token from Authorization header
 * Attaches decoded user payload to req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret",
    );
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
}

/**
 * Middleware: Restrict to specific roles
 * Usage: roleMiddleware('admin') or roleMiddleware('admin','hr')
 */
function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
}

module.exports = { authMiddleware, roleMiddleware };
