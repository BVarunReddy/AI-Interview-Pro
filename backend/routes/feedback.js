const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware, roleMiddleware } = require("../middleware/auth");
const { logActivity } = require("../services/activityLog");

router.use(authMiddleware);

async function notify(title, message, type = "info") {
  try {
    await db.query(
      "INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)",
      [title, message, type],
    );
  } catch (e) {}
}

// SUBMIT FEEDBACK
router.post(
  "/",
  roleMiddleware("admin", "hr", "interviewer"),
  async (req, res) => {
    try {
      const {
        candidate_id,
        interview_id,
        technical_score,
        communication_score,
        problem_solving_score,
        recommendation,
        remarks,
      } = req.body;
      if (
        !candidate_id ||
        !technical_score ||
        !communication_score ||
        !problem_solving_score
      ) {
        return res.status(400).json({
          success: false,
          message: "Candidate and all scores are required.",
        });
      }
      const scores = [
        technical_score,
        communication_score,
        problem_solving_score,
      ];
      if (scores.some((s) => s < 1 || s > 10)) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Scores must be between 1 and 10.",
          });
      }
      const [candidate] = await db.query(
        "SELECT name FROM candidates WHERE id = ?",
        [candidate_id],
      );
      if (candidate.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Candidate not found." });

      const overall = (
        (parseInt(technical_score) +
          parseInt(communication_score) +
          parseInt(problem_solving_score)) /
        3
      ).toFixed(2);

      const [result] = await db.query(
        `INSERT INTO feedback
       (candidate_id, candidate_name, interview_id, technical_score, communication_score,
        problem_solving_score, overall_score, recommendation, remarks, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidate_id,
          candidate[0].name,
          interview_id || null,
          technical_score,
          communication_score,
          problem_solving_score,
          overall,
          recommendation || "Maybe",
          remarks || null,
          req.user.id,
        ],
      );

      const recoType = {
        "Strong Hire": "success",
        Hire: "success",
        Maybe: "warning",
        "No Hire": "error",
      };
      await notify(
        "Feedback Submitted",
        `Feedback for ${candidate[0].name} — ${recommendation || "Maybe"} (Score: ${overall}/10)`,
        recoType[recommendation] || "info",
      );

      res.status(201).json({
        success: true,
        message: "Feedback submitted successfully.",
        feedbackId: result.insertId,
      });
      await logActivity({
        userId: req.user?.id,
        userName: req.user?.name || "HR",
        action: "Submitted Feedback",
        entity: "feedback",
        entityId: result.insertId,
        details: `Feedback for ${candidate[0].name} — ${recommendation || "Maybe"} (${overall}/10)`,
      });
    } catch (err) {
      console.error("Submit feedback error:", err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// GET ALL
router.get("/", async (req, res) => {
  try {
    const [feedbacks] = await db.query(
      `SELECT f.*, u.name AS submitted_by_name
       FROM feedback f LEFT JOIN users u ON f.submitted_by = u.id
       ORDER BY f.created_at DESC`,
    );
    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
