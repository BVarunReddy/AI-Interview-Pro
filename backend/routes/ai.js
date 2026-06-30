const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middleware/auth");
const db = require("../db");

router.use(authMiddleware);
const aiGuard = roleMiddleware("admin", "hr");

// ─── GROQ API ──────────────────────────────────────────────
async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured.");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an expert HR evaluator. Generate professional interview evaluation reports in plain text only. Do NOT use markdown formatting like ** or ##. Use plain section headers followed by colons. Do not include placeholder text like [Insert Date] or [Insert Name].",
          },
          { role: "user", content: prompt },
        ],
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ─── AI RESUME SCORING ─────────────────────────────────────
function scoreResume(candidate, jobDescription) {
  const jd = jobDescription.toLowerCase();
  const candidateSkills = (candidate.skills || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  const candidatePosition = (candidate.position || "").toLowerCase();
  const candidateExp = parseInt(candidate.experience) || 0;

  const techKeywords = [
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "express",
    "mysql",
    "mongodb",
    "html",
    "css",
    "angular",
    "vue",
    "typescript",
    "php",
    "sql",
    "git",
    "docker",
    "aws",
    "rest",
    "api",
    "redux",
    "bootstrap",
    "tailwind",
    "figma",
    "linux",
    "c++",
    "c#",
    "kotlin",
    "swift",
    "flutter",
    "django",
    "spring",
    "laravel",
    "postgresql",
    "firebase",
    "graphql",
    "sass",
    "webpack",
    "jest",
    "kubernetes",
    "jenkins",
    "agile",
    "scrum",
    "machine learning",
    "deep learning",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "tableau",
    "selenium",
    "postman",
    "jira",
  ];

  const jdSkills = techKeywords.filter((k) => jd.includes(k));
  let matchedSkills = [],
    missingSkills = [];
  jdSkills.forEach((skill) => {
    const has =
      candidateSkills.some((cs) => cs.includes(skill) || skill.includes(cs)) ||
      (candidate.skills || "").toLowerCase().includes(skill);
    if (has) matchedSkills.push(skill);
    else missingSkills.push(skill);
  });

  const skillScore =
    jdSkills.length > 0
      ? Math.round((matchedSkills.length / jdSkills.length) * 50)
      : 25;
  const expMatches = jd.match(/(\d+)\+?\s*years?/g) || [];
  let requiredExp = 0;
  if (expMatches.length > 0)
    requiredExp = Math.min(...expMatches.map((m) => parseInt(m)));
  let expScore =
    requiredExp === 0
      ? 20
      : candidateExp >= requiredExp
        ? 25
        : candidateExp >= requiredExp - 1
          ? 18
          : candidateExp >= requiredExp - 2
            ? 12
            : 5;
  const titleKeywords = candidatePosition.split(/\s+/);
  const titleMatches = titleKeywords.filter(
    (w) => w.length > 3 && jd.includes(w),
  );
  const titleScore =
    titleMatches.length > 0
      ? Math.min(15, titleMatches.length * 6)
      : jd.includes("developer") && candidatePosition.includes("developer")
        ? 8
        : 4;
  const softKeywords = [
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "analytical",
    "collaborative",
    "creative",
    "adaptable",
  ];
  const softMatches = softKeywords.filter(
    (k) => jd.includes(k) && (candidate.skills || "").toLowerCase().includes(k),
  );
  const softScore = Math.min(10, softMatches.length * 3 + 3);
  const totalScore = Math.min(
    100,
    skillScore + expScore + titleScore + softScore,
  );

  const strengths = [];
  if (matchedSkills.length > 0)
    strengths.push(
      `Proficient in ${matchedSkills
        .slice(0, 3)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(", ")}`,
    );
  if (candidateExp >= requiredExp && requiredExp > 0)
    strengths.push(
      `${candidateExp} years meets the ${requiredExp}+ year requirement`,
    );
  else if (candidateExp > 0)
    strengths.push(
      `${candidateExp} year${candidateExp !== 1 ? "s" : ""} of relevant experience`,
    );
  if (titleMatches.length > 0)
    strengths.push("Role title aligns with job requirements");
  if (strengths.length === 0)
    strengths.push("Has foundational background in the domain");

  const gaps = [];
  if (missingSkills.length > 0)
    gaps.push(
      `Missing: ${missingSkills
        .slice(0, 3)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(", ")}`,
    );
  if (requiredExp > 0 && candidateExp < requiredExp)
    gaps.push(
      `Needs ${requiredExp - candidateExp} more year${requiredExp - candidateExp !== 1 ? "s" : ""} of experience`,
    );
  if (gaps.length === 0 && totalScore < 80)
    gaps.push("Profile needs more detail to fully evaluate");

  let recommendation, summary;
  if (totalScore >= 80) {
    recommendation = "Strong Hire";
    summary = `${candidate.name} is an excellent match. Recommended for immediate hire.`;
  } else if (totalScore >= 65) {
    recommendation = "Hire";
    summary = `${candidate.name} meets most requirements. A technical interview is recommended.`;
  } else if (totalScore >= 45) {
    recommendation = "Maybe";
    summary = `${candidate.name} partially matches. Consider if gaps can be bridged with training.`;
  } else {
    recommendation = "No Hire";
    summary = `${candidate.name} does not currently meet core requirements.`;
  }

  const breakdown = [
    { label: "Skills Match", score: skillScore, max: 50, color: "#4f46e5" },
    { label: "Experience", score: expScore, max: 25, color: "#10b981" },
    { label: "Role Alignment", score: titleScore, max: 15, color: "#f59e0b" },
    {
      label: "Profile Completeness",
      score: softScore,
      max: 10,
      color: "#06b6d4",
    },
  ];

  return {
    score: totalScore,
    strengths,
    gaps,
    summary,
    recommendation,
    breakdown,
  };
}

// ─── POST /api/ai/score-resume ─────────────────────────────
router.post("/score-resume", aiGuard, async (req, res) => {
  try {
    const { candidate_id, job_description } = req.body;
    if (!candidate_id || !job_description)
      return res.status(400).json({
        success: false,
        message: "candidate_id and job_description required.",
      });
    if (job_description.trim().length < 30)
      return res
        .status(400)
        .json({ success: false, message: "Job description too short." });
    const [rows] = await db.query(
      "SELECT id, name, position, experience, skills FROM candidates WHERE id = ?",
      [candidate_id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    const result = scoreResume(rows[0], job_description);
    await db.query("UPDATE candidates SET ai_score = ? WHERE id = ?", [
      result.score,
      candidate_id,
    ]);
    res.json({ success: true, candidate_name: rows[0].name, ...result });
  } catch (err) {
    console.error("AI score error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Scoring failed: " + err.message });
  }
});

// ─── POST /api/ai/generate-report ──────────────────────────
router.post("/generate-report", aiGuard, async (req, res) => {
  try {
    const { candidate_id } = req.body;
    if (!candidate_id)
      return res
        .status(400)
        .json({ success: false, message: "candidate_id required." });

    const [cRows] = await db.query("SELECT * FROM candidates WHERE id = ?", [
      candidate_id,
    ]);
    if (!cRows.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    const c = cRows[0];

    const [feedbacks] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1",
      [candidate_id],
    );
    if (!feedbacks.length)
      return res.status(400).json({
        success: false,
        message: "No feedback found. Submit feedback first.",
      });
    const fb = feedbacks[0];

    const overall = (
      (fb.technical_score + fb.communication_score + fb.problem_solving_score) /
      3
    ).toFixed(1);
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const prompt = `Generate a professional interview evaluation report in plain text (no markdown, no ** symbols, no # symbols).

CANDIDATE: ${c.name}
POSITION: ${c.position}
EXPERIENCE: ${c.experience || 0} years
SKILLS: ${c.skills || "Not specified"}
INTERVIEW DATE: ${today}

SCORES (out of 10):
- Technical Skills: ${fb.technical_score}/10
- Communication: ${fb.communication_score}/10
- Problem Solving: ${fb.problem_solving_score}/10
- Overall: ${overall}/10

RECOMMENDATION: ${fb.recommendation}
REMARKS: ${fb.remarks || "No remarks provided"}

Write the report with these sections using plain text headers (no markdown):
EXECUTIVE SUMMARY
TECHNICAL ASSESSMENT
COMMUNICATION AND SOFT SKILLS
PROBLEM SOLVING ASSESSMENT
STRENGTHS
AREAS FOR IMPROVEMENT
FINAL RECOMMENDATION

Important rules:
- No ** or * or # formatting
- No placeholder text like [Insert Date] or [Insert Name]
- Use the actual date: ${today}
- Use the actual candidate name: ${c.name}
- Keep it professional and specific to the scores given`;

    let report;
    try {
      const llmResponse = await callGroq(prompt);
      // Clean any remaining markdown
      const cleaned = llmResponse
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/##/g, "")
        .replace(/#/g, "")
        .replace(/\[Insert.*?\]/g, "")
        .trim();

      report = `INTERVIEW EVALUATION REPORT — AI Generated (Powered by Groq LLM)
==========================================
Candidate     : ${c.name}
Position      : ${c.position}
Date          : ${today}
Overall Score : ${overall}/10
Recommendation: ${fb.recommendation}
==========================================

${cleaned}

---
Report generated by InterviewPro AI Evaluation System (Groq Llama 3.1)`;
    } catch (llmErr) {
      console.error("Groq LLM failed, using fallback:", llmErr.message);
      const techLevel =
        fb.technical_score >= 8
          ? "exceptional"
          : fb.technical_score >= 6
            ? "strong"
            : "moderate";
      const commLevel =
        fb.communication_score >= 8
          ? "excellent"
          : fb.communication_score >= 6
            ? "good"
            : "adequate";
      const probLevel =
        fb.problem_solving_score >= 8
          ? "outstanding"
          : fb.problem_solving_score >= 6
            ? "solid"
            : "satisfactory";
      report = `INTERVIEW EVALUATION REPORT
===============================
Candidate   : ${c.name}
Position    : ${c.position}
Date        : ${today}
Overall     : ${overall}/10

SCORES
------
Technical Skills : ${fb.technical_score}/10 (${techLevel})
Communication    : ${fb.communication_score}/10 (${commLevel})
Problem Solving  : ${fb.problem_solving_score}/10 (${probLevel})

RECOMMENDATION : ${fb.recommendation}
REMARKS        : ${fb.remarks || "No remarks"}

---
Report generated by InterviewPro AI Evaluation System`;
    }

    res.json({
      success: true,
      report,
      candidate_name: c.name,
      overall_score: overall,
      recommendation: fb.recommendation,
    });
  } catch (err) {
    console.error("Report error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Report failed: " + err.message });
  }
});

// ─── D11: JD GENERATOR ─────────────────────────────────────
router.post("/generate-jd", aiGuard, async (req, res) => {
  try {
    const { position, department, experience, skills, tone } = req.body;
    if (!position)
      return res
        .status(400)
        .json({ success: false, message: "Position is required." });

    const prompt = `Write a professional Job Description for the following role:

Position: ${position}
Department: ${department || "Not specified"}
Experience Required: ${experience || "Not specified"} years
Key Skills: ${skills || "Not specified"}
Tone: ${tone || "Professional"}

Structure the JD with these plain text sections (no markdown, no asterisks):

JOB TITLE:
DEPARTMENT:
ABOUT THE ROLE:
KEY RESPONSIBILITIES: (5-7 bullet points using dashes)
REQUIRED QUALIFICATIONS: (4-6 points using dashes)
PREFERRED QUALIFICATIONS: (3-4 points using dashes)
WHAT WE OFFER: (3-4 points using dashes)

Keep it concise, compelling, and bias-free. Do not use ** or ## formatting.`;

    const jd = await callGroq(prompt);
    res.json({ success: true, jd });
  } catch (err) {
    console.error("JD generation error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "JD generation failed: " + err.message });
  }
});

// ─── D12: INTERVIEW QUESTIONS GENERATOR ────────────────────
router.post("/generate-questions", aiGuard, async (req, res) => {
  try {
    const { position, experience, skills, round, count } = req.body;
    if (!position)
      return res
        .status(400)
        .json({ success: false, message: "Position is required." });

    const prompt = `Generate ${count || 10} interview questions for the following role:

Position: ${position}
Experience Level: ${experience || "Mid-level"}
Key Skills: ${skills || "General"}
Interview Round: ${round || "Technical"}

Rules:
- No markdown formatting, no asterisks, no ## headers
- Number each question (1. 2. 3. etc.)
- Mix question types: conceptual, situational, technical, and behavioural
- Tailor difficulty to the experience level
- After each question, add a one-line hint for the interviewer in brackets like [Look for: ...]
- Keep questions clear and unambiguous`;

    const questions = await callGroq(prompt);
    res.json({ success: true, questions });
  } catch (err) {
    console.error("Questions generation error:", err.message);
    res.status(500).json({
      success: false,
      message: "Question generation failed: " + err.message,
    });
  }
});

module.exports = router;
