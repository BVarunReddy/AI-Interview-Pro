const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { sendEmail, templates } = require("../services/email");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// ─── Middleware: require a CANDIDATE token (not an HR/staff token) ──
function candidateAuthMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "candidate") {
      return res
        .status(403)
        .json({
          success: false,
          message: "This endpoint is for candidate accounts only.",
        });
    }
    req.candidate = decoded;
    next();
  } catch (err) {
    return res
      .status(403)
      .json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
  }
}

// ─── CREATE PORTAL ACCOUNT ──────────────────────────────────
// Candidate must have an existing application (by email) before
// they can create a login. Prevents strangers from registering
// accounts unrelated to any application.
router.post("/account/create", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters.",
        });
    }

    const [candidates] = await db.query(
      "SELECT id, name FROM candidates WHERE email = ? ORDER BY created_at DESC LIMIT 1",
      [email],
    );
    if (candidates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No application found with this email. Please apply first.",
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM candidate_accounts WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "An account already exists for this email. Try logging in instead.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await db.query(
      "INSERT INTO candidate_accounts (candidate_id, email, password) VALUES (?, ?, ?)",
      [candidates[0].id, email, hashedPassword],
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Candidate account create error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    const [rows] = await db.query(
      "SELECT * FROM candidate_accounts WHERE email = ?",
      [email],
    );
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const account = rows[0];
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        id: account.id,
        candidateId: account.candidate_id,
        email: account.email,
        role: "candidate",
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({ success: true, token, email: account.email });
  } catch (err) {
    console.error("Candidate login error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─── DASHBOARD: own status + interviews ────────────────────
router.get("/dashboard", candidateAuthMiddleware, async (req, res) => {
  try {
    const [candidateRows] = await db.query(
      "SELECT id, name, email, position, status, created_at FROM candidates WHERE id = ?",
      [req.candidate.candidateId],
    );
    if (candidateRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found." });
    }

    const [interviews] = await db.query(
      `SELECT id, round_name, interviewer, interview_date, interview_time, notes, status, reschedule_reason
       FROM interviews WHERE candidate_id = ? ORDER BY interview_date ASC, interview_time ASC`,
      [req.candidate.candidateId],
    );

    res.json({ success: true, candidate: candidateRows[0], interviews });
  } catch (err) {
    console.error("Candidate dashboard error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── CONFIRM INTERVIEW ──────────────────────────────────────
router.put(
  "/interviews/:id/confirm",
  candidateAuthMiddleware,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT * FROM interviews WHERE id = ? AND candidate_id = ?",
        [req.params.id, req.candidate.candidateId],
      );
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Interview not found." });
      }
      await db.query(
        "UPDATE interviews SET status = 'Confirmed', reschedule_reason = NULL WHERE id = ?",
        [req.params.id],
      );
      res.json({ success: true, message: "Interview confirmed." });
    } catch (err) {
      console.error("Confirm interview error:", err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// ─── REQUEST RESCHEDULE ──────────────────────────────────────
router.put(
  "/interviews/:id/reschedule",
  candidateAuthMiddleware,
  async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a reason or preferred time for rescheduling.",
        });
      }

      const [rows] = await db.query(
        `SELECT i.*, c.name AS candidate_name, c.email AS candidate_email
       FROM interviews i JOIN candidates c ON i.candidate_id = c.id
       WHERE i.id = ? AND i.candidate_id = ?`,
        [req.params.id, req.candidate.candidateId],
      );
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Interview not found." });
      }

      await db.query(
        "UPDATE interviews SET status = 'Reschedule Requested', reschedule_reason = ? WHERE id = ?",
        [reason.trim(), req.params.id],
      );

      // Notify HR so it shows up on the dashboard notification bell
      await db.query(
        "INSERT INTO notifications (title, message, type, user_id) VALUES (?, ?, ?, ?)",
        [
          "Reschedule Requested",
          `${rows[0].candidate_name} requested to reschedule their ${rows[0].round_name} interview`,
          "warning",
          null,
        ],
      );

      res.json({
        success: true,
        message: "Reschedule request sent. HR will follow up by email.",
      });
    } catch (err) {
      console.error("Reschedule request error:", err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

module.exports = router;
