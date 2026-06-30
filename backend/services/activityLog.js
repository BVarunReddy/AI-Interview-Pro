// services/activityLog.js
// Shared helper — call logActivity() from any route after a successful action.
// Silent on failure: never throws, never blocks the main response.

const db = require("../db");

/**
 * @param {object} opts
 * @param {number|null} opts.userId   - ID from req.user (null for system/public actions)
 * @param {string}      opts.userName - Display name for the log entry
 * @param {string}      opts.action   - e.g. "Added Candidate", "Status Changed"
 * @param {string}      opts.entity   - e.g. "candidate", "interview", "feedback"
 * @param {number|null} opts.entityId - The affected row's id
 * @param {string}      opts.details  - Human-readable summary sentence
 */
async function logActivity({
  userId = null,
  userName = "System",
  action,
  entity,
  entityId = null,
  details,
}) {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, user_name, action, entity, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, userName, action, entity, entityId, details],
    );
  } catch (err) {
    // Never let logging crash a request
    console.error("Activity log error:", err.message);
  }
}

module.exports = { logActivity };
