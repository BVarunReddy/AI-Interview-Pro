const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

// ─── GET ALL NOTIFICATIONS ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id],
    );
    const [[{ unread }]] = await db.query(
      `SELECT COUNT(*) AS unread FROM notifications
       WHERE is_read = 0 AND (user_id = ? OR user_id IS NULL)`,
      [req.user.id],
    );
    res.json({ success: true, notifications: rows, unread });
  } catch (err) {
    console.error("Get notifications error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MARK ALL AS READ ──────────────────────────────────────
router.put("/read-all", async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = 1
       WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
      [req.user.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MARK ONE AS READ ─────────────────────────────────────
router.put("/:id/read", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE ALL ────────────────────────────────────────────
router.delete("/clear", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM notifications WHERE user_id = ? OR user_id IS NULL",
      [req.user.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CREATE NOTIFICATION (internal helper) ─────────────────
router.post("/", async (req, res) => {
  try {
    const { title, message, type, user_id } = req.body;
    await db.query(
      `INSERT INTO notifications (title, message, type, user_id) VALUES (?, ?, ?, ?)`,
      [title, message, type || "info", user_id || null],
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
