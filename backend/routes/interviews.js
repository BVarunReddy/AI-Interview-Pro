const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware, roleMiddleware } = require("../middleware/auth");
const { sendEmail, templates } = require("../services/email");
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

router.post("/", roleMiddleware("admin", "hr"), async (req, res) => {
  try {
    const {
      candidate_id,
      interviewer,
      round_name,
      interview_date,
      interview_time,
      notes,
    } = req.body;
    if (
      !candidate_id ||
      !interviewer ||
      !round_name ||
      !interview_date ||
      !interview_time
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }
    const [candidate] = await db.query(
      "SELECT name, email, position FROM candidates WHERE id = ?",
      [candidate_id],
    );
    if (!candidate.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });

    const [result] = await db.query(
      `INSERT INTO interviews (candidate_id, candidate_name, interviewer, round_name, interview_date, interview_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        candidate_id,
        candidate[0].name,
        interviewer,
        round_name,
        interview_date,
        interview_time,
        notes || null,
      ],
    );

    await notify(
      "Interview Scheduled",
      `${round_name} interview scheduled for ${candidate[0].name} on ${interview_date}`,
      "info",
    );

    console.log("Candidate Data:", candidate[0]);
    // Send email to candidate
    if (candidate[0].email) {
      console.log("Candidate Email:", candidate[0].email);

      const emailResult = await sendEmail(
        candidate[0].email,
        templates.interviewScheduled(
          {
            name: candidate[0].name,
            position: candidate[0].position,
          },
          {
            round_name,
            interviewer,
            interview_date,
            interview_time,
            notes,
          },
        ),
      );

      console.log("Email Result:", emailResult);
    }

    res.status(201).json({
      success: true,
      message: "Interview scheduled successfully.",
      interviewId: result.insertId,
    });
    await logActivity({
      userId: req.user?.id,
      userName: req.user?.name || "HR",
      action: "Scheduled Interview",
      entity: "interview",
      entityId: result.insertId,
      details: `${round_name} interview for ${candidate[0].name} on ${interview_date}`,
    });
  } catch (err) {
    console.error("Schedule error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, round, status } = req.query;
    let where = "WHERE 1=1";
    const params = [];
    if (search) {
      where += " AND (i.candidate_name LIKE ? OR i.interviewer LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (round && round !== "All") {
      where += " AND i.round_name = ?";
      params.push(round);
    }
    if (status && status !== "All") {
      where += " AND i.status = ?";
      params.push(status);
    }
    const [interviews] = await db.query(
      `SELECT i.*, c.position, c.email AS candidate_email FROM interviews i
       LEFT JOIN candidates c ON i.candidate_id = c.id
       ${where} ORDER BY i.interview_date DESC, i.interview_time ASC`,
      params,
    );
    res.json({ success: true, interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.put("/:id/status", roleMiddleware("admin", "hr"), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["Scheduled", "Completed", "Cancelled"];
    if (!valid.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    const [rows] = await db.query(
      "SELECT candidate_name, round_name FROM interviews WHERE id = ?",
      [req.params.id],
    );
    await db.query(
      "UPDATE interviews SET status = ?, reschedule_reason = CASE WHEN ? = 'Scheduled' THEN NULL ELSE reschedule_reason END WHERE id = ?",
      [status, status, req.params.id],
    );
    if (rows.length)
      await notify(
        `Interview ${status}`,
        `${rows[0].round_name} interview for ${rows[0].candidate_name} marked as ${status}`,
        status === "Completed" ? "success" : "warning",
      );
    res.json({ success: true, message: "Interview status updated." });
    if (rows.length)
      await logActivity({
        userId: req.user?.id,
        userName: req.user?.name || "HR",
        action: "Interview Status Updated",
        entity: "interview",
        entityId: parseInt(req.params.id),
        details: `${rows[0].round_name} for ${rows[0].candidate_name} marked ${status}`,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.delete("/:id", roleMiddleware("admin", "hr"), async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM interviews WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "Not found." });
    await logActivity({
      userId: req.user?.id,
      userName: req.user?.name || "HR",
      action: "Deleted Interview",
      entity: "interview",
      entityId: parseInt(req.params.id),
      details: `Interview #${req.params.id} deleted`,
    });
    res.json({ success: true, message: "Interview deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
