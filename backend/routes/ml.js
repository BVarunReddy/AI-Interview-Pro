const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

function predictInJS(features) {
  const [exp, tech, comm, prob, interviews, edu, prevComp, skills] = features;
  const total =
    Math.min(exp / 7, 1) * 25 +
    (tech / 10) * 30 +
    (comm / 10) * 15 +
    (prob / 10) * 20 +
    Math.min(skills / 10, 1) * 10;
  const probability = Math.min(Math.round(total), 99);
  if (probability >= 70)
    return { label: "Highly Likely to Select", probability, category: "high" };
  if (probability >= 40)
    return {
      label: "Moderately Likely to Select",
      probability,
      category: "medium",
    };
  return { label: "Low Selection Probability", probability, category: "low" };
}

router.post("/predict", async (req, res) => {
  try {
    const { candidate_id } = req.body;
    if (!candidate_id)
      return res
        .status(400)
        .json({ success: false, message: "candidate_id required." });
    const [rows] = await db.query("SELECT * FROM candidates WHERE id = ?", [
      candidate_id,
    ]);
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    const c = rows[0];
    const [feedbacks] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1",
      [candidate_id],
    );
    const fb = feedbacks[0] || {};
    const features = [
      parseInt(c.experience) || 0,
      parseInt(fb.technical_score) || 5,
      parseInt(fb.communication_score) || 5,
      parseInt(fb.problem_solving_score) || 5,
      feedbacks.length > 0 ? 2 : 1,
      3,
      Math.min(Math.floor((parseInt(c.experience) || 0) / 2), 4),
      (c.skills || "").split(",").filter(Boolean).length || 3,
    ];
    const prediction = predictInJS(features);
    await db.query(
      "UPDATE candidates SET ml_prediction=?, ml_probability=? WHERE id=?",
      [prediction.label, prediction.probability, candidate_id],
    );
    res.json({ success: true, candidate_name: c.name, ...prediction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/predictions", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, position, experience, ai_score, ml_prediction, ml_probability, status FROM candidates WHERE ml_prediction IS NOT NULL ORDER BY ml_probability DESC",
    );
    res.json({ success: true, predictions: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
