const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware, roleMiddleware } = require("../middleware/auth");
const { sendEmail } = require("../services/email");
const { logActivity } = require("../services/activityLog");

router.use(authMiddleware);

// ─── SAVE + OPTIONALLY EMAIL OFFER LETTER ──────────────────
router.post("/", roleMiddleware("admin", "hr"), async (req, res) => {
  try {
    const {
      candidate_id,
      position,
      department,
      salary,
      joining_date,
      company_name,
      hr_name,
      send_email: shouldEmail,
    } = req.body;

    if (
      !candidate_id ||
      !position ||
      !salary ||
      !joining_date ||
      !company_name ||
      !hr_name
    )
      return res
        .status(400)
        .json({
          success: false,
          message: "All required fields must be filled.",
        });

    const [candidates] = await db.query(
      "SELECT id, name, email FROM candidates WHERE id = ?",
      [candidate_id],
    );
    if (!candidates.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });

    const candidate = candidates[0];

    // Prevent duplicate active offers for the same candidate
    const [existing] = await db.query(
      "SELECT id FROM offer_letters WHERE candidate_id = ? AND status = 'Sent'",
      [candidate_id],
    );
    if (existing.length > 0)
      return res.status(409).json({
        success: false,
        message: `An offer letter has already been sent to ${candidate.name}.`,
      });

    const [result] = await db.query(
      `INSERT INTO offer_letters
        (candidate_id, candidate_name, position, department, salary, joining_date, company_name, hr_name, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Generated', ?)`,
      [
        candidate_id,
        candidate.name,
        position,
        department || null,
        salary,
        joining_date,
        company_name,
        hr_name,
        req.user.id,
      ],
    );

    let emailed = false;
    if (shouldEmail && candidate.email) {
      const joiningFormatted = new Date(joining_date).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        },
      );

      const emailResult = await sendEmail(candidate.email, {
        subject: `Offer Letter — ${position} at ${company_name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;background:#f8fafc;padding:20px">
            <div style="background:#4f46e5;padding:28px;border-radius:12px 12px 0 0;text-align:center">
              <h1 style="color:white;margin:0;font-size:22px">${company_name}</h1>
              <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px">HR Department</p>
            </div>
            <div style="background:white;padding:36px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
              <h2 style="text-align:center;letter-spacing:2px;font-size:16px;color:#0f172a;margin-bottom:28px">OFFER LETTER</h2>
              <p style="color:#475569">Date: <strong>${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong></p>
              <p style="color:#475569">Dear <strong>${candidate.name}</strong>,</p>
              <p style="color:#475569">We are delighted to offer you the position of <strong>${position}</strong>${department ? ` in the <strong>${department}</strong> department` : ""} at <strong>${company_name}</strong>.</p>
              <p style="color:#475569">After careful evaluation, we believe you will be a great addition to our team. Please find the offer details below:</p>

              <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
                <tr style="background:#f8fafc">
                  <td style="padding:12px;border:1px solid #e2e8f0;font-weight:600;width:40%">Position</td>
                  <td style="padding:12px;border:1px solid #e2e8f0">${position}</td>
                </tr>
                ${department ? `<tr><td style="padding:12px;border:1px solid #e2e8f0;font-weight:600">Department</td><td style="padding:12px;border:1px solid #e2e8f0">${department}</td></tr>` : ""}
                <tr style="background:#f8fafc">
                  <td style="padding:12px;border:1px solid #e2e8f0;font-weight:600">Annual CTC</td>
                  <td style="padding:12px;border:1px solid #e2e8f0">₹${salary}</td>
                </tr>
                <tr>
                  <td style="padding:12px;border:1px solid #e2e8f0;font-weight:600">Date of Joining</td>
                  <td style="padding:12px;border:1px solid #e2e8f0">${joiningFormatted}</td>
                </tr>
                <tr style="background:#f8fafc">
                  <td style="padding:12px;border:1px solid #e2e8f0;font-weight:600">Employment Type</td>
                  <td style="padding:12px;border:1px solid #e2e8f0">Full-Time, Permanent</td>
                </tr>
              </table>

              <p style="color:#475569">Please confirm your acceptance by replying to this email before your joining date. We look forward to welcoming you aboard!</p>
              <p style="color:#475569">Congratulations once again!</p>

              <div style="margin-top:36px;padding-top:20px;border-top:1px solid #e2e8f0">
                <strong style="color:#0f172a">${hr_name}</strong><br/>
                <span style="color:#64748b;font-size:13px">HR Manager, ${company_name}</span>
              </div>
            </div>
          </div>`,
      });

      if (emailResult) {
        await db.query(
          "UPDATE offer_letters SET status = 'Sent', emailed_at = NOW() WHERE id = ?",
          [result.insertId],
        );
        emailed = true;
      }
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      action: "Offer Letter Generated",
      entity: "candidate",
      entityId: parseInt(candidate_id),
      details: `Offer letter ${emailed ? "sent to" : "generated for"} ${candidate.name} — ${position}`,
    });

    // Also update candidate status to "Offer" if not already Selected
    await db.query(
      "UPDATE candidates SET status = 'Offer' WHERE id = ? AND status NOT IN ('Selected', 'Offer')",
      [candidate_id],
    );

    res.status(201).json({
      success: true,
      message: emailed
        ? `Offer letter sent to ${candidate.email}`
        : "Offer letter saved. You can print it from here.",
      offerId: result.insertId,
      emailed,
    });
  } catch (err) {
    console.error("Offer letter error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── GET OFFER HISTORY FOR A CANDIDATE ─────────────────────
router.get("/candidate/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ol.*, u.name AS created_by_name
       FROM offer_letters ol
       LEFT JOIN users u ON u.id = ol.created_by
       WHERE ol.candidate_id = ?
       ORDER BY ol.created_at DESC`,
      [req.params.id],
    );
    res.json({ success: true, offers: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── GET ALL OFFERS (for history/reporting) ────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ol.*, u.name AS created_by_name
       FROM offer_letters ol
       LEFT JOIN users u ON u.id = ol.created_by
       ORDER BY ol.created_at DESC
       LIMIT 100`,
    );
    res.json({ success: true, offers: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
