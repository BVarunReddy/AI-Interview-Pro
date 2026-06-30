const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { logActivity } = require("../services/activityLog");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const VALID_ROLES = ["admin", "hr", "interviewer", "viewer"];

// ─── REGISTER ──────────────────────────────────────────────
// Always creates an "hr" account — only admins can elevate roles
// via PUT /api/auth/users/:id/role after account creation.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email, and password are required.",
        });
    if (password.length < 6)
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters.",
        });

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0)
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, 'hr', ?)",
      [name, email, hashedPassword, department || null],
    );

    res
      .status(201)
      .json({
        success: true,
        message: "Account created successfully.",
        userId: result.insertId,
      });
  } catch (err) {
    console.error("Register error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─── LOGIN ─────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    // Fetch user
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const user = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
      },
    });
    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "Logged In",
      entity: "user",
      entityId: user.id,
      details: `${user.name} (${user.role}) logged in`,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─── GET PROFILE (protected) ───────────────────────────────
router.get(
  "/profile",
  require("../middleware/auth").authMiddleware,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT id, name, email, role, phone, department, created_at FROM users WHERE id = ?",
        [req.user.id],
      );
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }
      res.json({ success: true, user: rows[0] });
    } catch (err) {
      console.error("Profile error:", err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// ─── UPDATE PROFILE (protected) ────────────────────────────
router.put(
  "/profile",
  require("../middleware/auth").authMiddleware,
  async (req, res) => {
    try {
      const { name, phone, department } = req.body;
      await db.query(
        "UPDATE users SET name = ?, phone = ?, department = ? WHERE id = ?",
        [name, phone || null, department || null, req.user.id],
      );
      res.json({ success: true, message: "Profile updated successfully." });
    } catch (err) {
      console.error("Update profile error:", err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// ─── USER MANAGEMENT (admin only) ──────────────────────────
const { authMiddleware, roleMiddleware } = require("../middleware/auth");

// List all users
router.get(
  "/users",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const [users] = await db.query(
        "SELECT id, name, email, role, department, phone, created_at FROM users ORDER BY created_at DESC",
      );
      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// Update a user's role (admin cannot demote themselves)
router.put(
  "/users/:id/role",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { role } = req.body;
      if (!VALID_ROLES.includes(role))
        return res
          .status(400)
          .json({
            success: false,
            message: `Role must be one of: ${VALID_ROLES.join(", ")}`,
          });
      if (parseInt(req.params.id) === req.user.id)
        return res
          .status(400)
          .json({
            success: false,
            message: "You cannot change your own role.",
          });

      const [rows] = await db.query("SELECT id, name FROM users WHERE id = ?", [
        req.params.id,
      ]);
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: "User not found." });

      await db.query("UPDATE users SET role = ? WHERE id = ?", [
        role,
        req.params.id,
      ]);
      await logActivity({
        userId: req.user.id,
        userName: req.user.name,
        action: "Role Changed",
        entity: "user",
        entityId: parseInt(req.params.id),
        details: `${rows[0].name} role changed to ${role}`,
      });
      res.json({ success: true, message: `Role updated to ${role}.` });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// Delete a user (admin cannot delete themselves)
router.delete(
  "/users/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      if (parseInt(req.params.id) === req.user.id)
        return res
          .status(400)
          .json({
            success: false,
            message: "You cannot delete your own account.",
          });

      const [rows] = await db.query("SELECT id, name FROM users WHERE id = ?", [
        req.params.id,
      ]);
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: "User not found." });

      await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
      await logActivity({
        userId: req.user.id,
        userName: req.user.name,
        action: "Deleted User",
        entity: "user",
        entityId: parseInt(req.params.id),
        details: `Deleted user ${rows[0].name}`,
      });
      res.json({ success: true, message: "User deleted." });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

module.exports = router;
