const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

router.get("/stats", async (req, res) => {
  try {
    const [[candidateStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Selected') AS selected,
        SUM(status = 'Rejected') AS rejected,
        SUM(status = 'Pending') AS pending,
        SUM(status = 'Screening') AS screening,
        SUM(status = 'Interview') AS interview,
        SUM(status = 'Offer') AS offer,
        ROUND(AVG(ai_score), 1) AS avg_ai_score
      FROM candidates
    `);

    const [[interviewStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(round_name = 'Technical') AS technical,
        SUM(round_name = 'HR') AS hr,
        SUM(round_name = 'Managerial') AS managerial,
        SUM(round_name = 'Screening') AS screening,
        SUM(status = 'Scheduled') AS upcoming,
        SUM(DATE(interview_date) = CURDATE()) AS today
      FROM interviews
    `);

    const [[feedbackStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        ROUND(AVG((technical_score + communication_score + problem_solving_score) / 3.0), 1) AS avg_score,
        SUM(recommendation = 'Strong Hire') AS strong_hire,
        SUM(recommendation = 'Hire') AS hire
      FROM feedback
    `);

    const [trend] = await db.query(`
      SELECT
        YEAR(created_at) AS yr,
        MONTH(created_at) AS mo,
        DATE_FORMAT(MIN(created_at), '%b %Y') AS month,
        COUNT(*) AS count
      FROM candidates
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY yr ASC, mo ASC
    `);

    res.json({
      success: true,
      candidates: candidateStats,
      interviews: interviewStats,
      feedback: feedbackStats,
      trend,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const { limit = 50, entity, user_id } = req.query;
    let where = "WHERE 1=1";
    const params = [];
    if (entity && entity !== "all") { where += " AND entity = ?"; params.push(entity); }
    if (user_id) { where += " AND user_id = ?"; params.push(user_id); }
    params.push(Math.min(parseInt(limit) || 50, 200));

    const [logs] = await db.query(
      `SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT ?`,
      params,
    );
    const [users] = await db.query(
      "SELECT DISTINCT user_id, user_name FROM activity_logs WHERE user_id IS NOT NULL ORDER BY user_name ASC",
    );
    res.json({ success: true, logs, users });
  } catch (err) {
    console.error("Activity log error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GLOBAL SEARCH ─────────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
      return res.json({ success: true, results: { candidates: [], interviews: [], feedback: [] }, total: 0 });

    const term = `%${q.trim()}%`;

    const [candidates] = await db.query(
      `SELECT id, name, email, position, status
       FROM candidates WHERE name LIKE ? OR email LIKE ? OR position LIKE ? OR skills LIKE ?
       LIMIT 5`,
      [term, term, term, term],
    );

    const [interviews] = await db.query(
      `SELECT id, candidate_name, round_name, interview_date, status, candidate_id
       FROM interviews WHERE candidate_name LIKE ? OR round_name LIKE ? OR interviewer LIKE ?
       LIMIT 5`,
      [term, term, term],
    );

    const [feedback] = await db.query(
      `SELECT id, candidate_name, recommendation, overall_score, candidate_id
       FROM feedback WHERE candidate_name LIKE ? OR recommendation LIKE ? OR remarks LIKE ?
       LIMIT 3`,
      [term, term, term],
    );

    res.json({
      success: true,
      results: {
        candidates: candidates.map(c => ({ ...c, _type: "candidate" })),
        interviews: interviews.map(i => ({ ...i, _type: "interview" })),
        feedback:   feedback.map(f => ({ ...f, _type: "feedback" })),
      },
      total: candidates.length + interviews.length + feedback.length,
    });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ success: false, message: "Search failed." });
  }
});

module.exports = router;