const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { authMiddleware, roleMiddleware } = require("../middleware/auth");
const { sendEmail, templates } = require("../services/email");
const { logActivity } = require("../services/activityLog");

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

// Helper — create notification
async function notify(title, message, type = "info", user_id = null) {
  try {
    await db.query(
      "INSERT INTO notifications (title, message, type, user_id) VALUES (?, ?, ?, ?)",
      [title, message, type, user_id],
    );
  } catch (e) {
    /* silent fail */
  }
}

router.use(authMiddleware);

// ADD CANDIDATE
router.post(
  "/",
  roleMiddleware("admin", "hr"),
  upload.single("resume"),
  async (req, res) => {
    try {
      const { name, email, phone, position, experience, skills } = req.body;
      if (!name || !email || !position) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and position are required.",
        });
      }
      const [existing] = await db.query(
        "SELECT id FROM candidates WHERE email = ?",
        [email],
      );
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "A candidate with this email already exists.",
        });
      }
      const resumePath = req.file ? req.file.filename : null;
      const [result] = await db.query(
        `INSERT INTO candidates (name, email, phone, position, experience, skills, resume_path, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          email,
          phone || null,
          position,
          parseInt(experience) || 0,
          skills || null,
          resumePath,
          req.user.id,
        ],
      );
      await notify(
        "New Candidate Added",
        `${name} has been added as ${position}`,
        "success",
      );
      await logActivity({
        userId: req.user?.id,
        userName: req.user?.name || "HR",
        action: "Added Candidate",
        entity: "candidate",
        entityId: result.insertId,
        details: `Added ${name} for ${position}`,
      });
      res
        .status(201)
        .json({
          success: true,
          message: "Candidate added successfully.",
          candidateId: result.insertId,
        });
    } catch (err) {
      console.error("Add candidate error:", err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// GET ALL
router.get("/", async (req, res) => {
  try {
    const { status, search, page = 1, limit = 200 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "WHERE 1=1";
    const params = [];
    if (status && status !== "All") {
      where += " AND c.status = ?";
      params.push(status);
    }
    if (search) {
      where += " AND (c.name LIKE ? OR c.email LIKE ? OR c.position LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    const [candidates] = await db.query(
      `SELECT c.*, u.name AS created_by_name
       FROM candidates c LEFT JOIN users u ON c.created_by = u.id
       ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM candidates c ${where}`,
      params,
    );
    res.json({
      success: true,
      candidates,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get candidates error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── D13: CANDIDATE AUTO-RANKING ───────────────────────────
router.get("/ranking", async (req, res) => {
  try {
    const { position } = req.query;
    const where = position
      ? "WHERE c.status != 'Rejected' AND c.position = ?"
      : "WHERE c.status != 'Rejected'";
    const params = position ? [position] : [];

    const [candidates] = await db.query(
      `SELECT
         c.id, c.name, c.email, c.position, c.status, c.ai_score,
         ROUND(AVG(f.overall_score), 2) AS avg_feedback,
         COUNT(f.id) AS feedback_count
       FROM candidates c
       LEFT JOIN feedback f ON f.candidate_id = c.id
       ${where}
       GROUP BY c.id
       ORDER BY c.name ASC`,
      params,
    );

    const ranked = candidates.map((c) => {
      const aiNorm = c.ai_score != null ? parseFloat(c.ai_score) : null;
      const fbNorm =
        c.avg_feedback != null ? parseFloat(c.avg_feedback) * 10 : null;
      let composite = null;
      if (aiNorm !== null && fbNorm !== null)
        composite = aiNorm * 0.5 + fbNorm * 0.5;
      else if (aiNorm !== null) composite = aiNorm;
      else if (fbNorm !== null) composite = fbNorm;
      return {
        ...c,
        ai_score: aiNorm,
        avg_feedback: fbNorm,
        composite_score:
          composite !== null ? Math.round(composite * 10) / 10 : null,
      };
    });

    ranked.sort((a, b) => {
      if (a.composite_score === null && b.composite_score === null) return 0;
      if (a.composite_score === null) return 1;
      if (b.composite_score === null) return -1;
      return b.composite_score - a.composite_score;
    });

    let rank = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].composite_score !== ranked[i - 1].composite_score)
        rank = i + 1;
      ranked[i].rank = ranked[i].composite_score !== null ? rank : null;
    }

    const [positions] = await db.query(
      "SELECT DISTINCT position FROM candidates WHERE status != 'Rejected' ORDER BY position ASC",
    );

    res.json({
      success: true,
      candidates: ranked,
      positions: positions.map((p) => p.position),
      total: ranked.length,
      filtered_by: position || null,
    });
  } catch (err) {
    console.error("Ranking error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS created_by_name FROM candidates c
       LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?`,
      [req.params.id],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    const [interviews] = await db.query(
      "SELECT * FROM interviews WHERE candidate_id = ? ORDER BY interview_date DESC",
      [req.params.id],
    );
    const [feedback] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC",
      [req.params.id],
    );
    res.json({ success: true, candidate: rows[0], interviews, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// UPDATE STATUS
router.put("/:id/status", roleMiddleware("admin", "hr"), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = [
      "Pending",
      "Screening",
      "Interview",
      "Offer",
      "Selected",
      "Rejected",
    ];
    if (!valid.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    const [rows] = await db.query(
      "SELECT name, email, position FROM candidates WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    await db.query("UPDATE candidates SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    const typeMap = {
      Selected: "success",
      Rejected: "error",
      Offer: "success",
    };
    await notify(
      "Candidate Status Updated",
      `${rows[0].name} moved to ${status} stage`,
      typeMap[status] || "info",
    );

    // Email candidate on meaningful pipeline transitions (skip "Pending" —
    // that's the default state on application, nothing to announce).
    const templateMap = {
      Screening: "candidateScreening",
      Interview: "candidateInterviewStage",
      Offer: "candidateOffer",
      Selected: "candidateSelected",
      Rejected: "candidateRejected",
    };
    const templateKey = templateMap[status];
    if (templateKey && rows[0].email) {
      const emailResult = await sendEmail(
        rows[0].email,
        templates[templateKey]({
          name: rows[0].name,
          position: rows[0].position,
        }),
      );
      console.log(`Status email (${status}) to ${rows[0].email}:`, emailResult);
    }

    res.json({ success: true, message: "Status updated successfully." });
    await logActivity({
      userId: req.user?.id,
      userName: req.user?.name || "HR",
      action: "Status Changed",
      entity: "candidate",
      entityId: parseInt(req.params.id),
      details: `${rows[0].name} moved to ${status}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// UPDATE AI SCORE
router.put("/:id/ai-score", roleMiddleware("admin", "hr"), async (req, res) => {
  try {
    const { ai_score } = req.body;
    await db.query("UPDATE candidates SET ai_score = ? WHERE id = ?", [
      ai_score,
      req.params.id,
    ]);
    res.json({ success: true, message: "AI score updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// DELETE
router.delete("/:id", roleMiddleware("admin", "hr"), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT resume_path, name FROM candidates WHERE id = ?",
      [req.params.id],
    );
    if (rows.length > 0 && rows[0].resume_path) {
      const filePath = path.join(uploadDir, rows[0].resume_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const [result] = await db.query("DELETE FROM candidates WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    await logActivity({
      userId: req.user?.id,
      userName: req.user?.name || "HR",
      action: "Deleted Candidate",
      entity: "candidate",
      entityId: parseInt(req.params.id),
      details: `Deleted ${rows[0]?.name || "candidate"}`,
    });
    res.json({ success: true, message: "Candidate deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
