const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase()))
      cb(null, true);
    else cb(new Error("Only PDF, DOC, and DOCX files are allowed."));
  },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper — create notification (visible to HR dashboard)
async function notify(title, message, type = "info") {
  try {
    await db.query(
      "INSERT INTO notifications (title, message, type, user_id) VALUES (?, ?, ?, ?)",
      [title, message, type, null],
    );
  } catch (e) {
    /* silent fail */
  }
}

// ── PUBLIC: Candidate self-application ──────────────────────
// No auth — open to anyone with the link. Writes into the same
// `candidates` table used by HR-added candidates, with status
// always forced to "Pending" regardless of what's submitted.
router.post("/apply", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, position, experience, skills } = req.body;

    if (!name || !email || !position) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and position are required.",
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please enter a valid email address.",
        });
    }

    const [existing] = await db.query(
      "SELECT id FROM candidates WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "An application with this email already exists. We already have your details on file.",
      });
    }

    const resumePath = req.file ? req.file.filename : null;
    const [result] = await db.query(
      `INSERT INTO candidates (name, email, phone, position, experience, skills, resume_path, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)`,
      [
        name,
        email,
        phone || null,
        position,
        parseInt(experience) || 0,
        skills || null,
        resumePath,
      ],
    );

    await notify(
      "New Application Received",
      `${name} applied for ${position} via the application portal`,
      "info",
    );

    res.status(201).json({
      success: true,
      message: "Application submitted successfully. We'll be in touch soon!",
      candidateId: result.insertId,
    });
  } catch (err) {
    console.error("Public apply error:", err.message);
    if (err.message && err.message.includes("Only PDF")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ── PUBLIC: List of open positions for the form dropdown ────
// Derived from distinct positions already in the system, so the
// form doesn't need a separate "job postings" table yet.
router.get("/positions", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DISTINCT position FROM candidates ORDER BY position ASC",
    );
    res.json({ success: true, positions: rows.map((r) => r.position) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
