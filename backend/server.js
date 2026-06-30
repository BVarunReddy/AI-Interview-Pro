require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ────────────────────────────────────────────
app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── API ROUTES ────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/public", require("./routes/public"));
app.use("/api/portal", require("./routes/candidatePortal"));
app.use("/api/candidates", require("./routes/candidates"));
app.use("/api/interviews", require("./routes/interviews"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/offers", require("./routes/offerLetter"));
app.use("/api/notifications", require("./routes/notifications"));

// ─── HEALTH CHECK ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "2.0.0", timestamp: new Date() });
});

// ─── FAVICON (silence browser 404 noise) ───────────────────
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ─── 404 HANDLER ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
  });
});

// ─── START SERVER ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 InterviewPro Server v2.0`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});
