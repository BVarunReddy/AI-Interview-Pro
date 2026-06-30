const nodemailer = require("nodemailer");

// ── Create transporter ────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── Email templates ───────────────────────────────────────
const templates = {
  // Interview scheduled
  interviewScheduled: (candidate, interview) => ({
    subject: `Interview Scheduled — ${interview.round_name} Round | InterviewPro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
        <div style="background:#4f46e5;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">InterviewPro</h1>
          <p style="color:rgba(255,255,255,.8);margin:6px 0 0">Interview Management System</p>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">Interview Scheduled 📅</h2>
          <p style="color:#475569;font-size:15px">Dear <strong>${candidate.name}</strong>,</p>
          <p style="color:#475569;font-size:15px">Your interview has been scheduled. Please find the details below:</p>
          <div style="background:#eef2ff;border-radius:10px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Round</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${interview.round_name}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Interviewer</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${interview.interviewer}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Date</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${interview.interview_date}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Time</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${interview.interview_time}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Position</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${candidate.position}</td></tr>
            </table>
          </div>
          ${interview.notes ? `<p style="color:#475569;font-size:14px"><strong>Notes:</strong> ${interview.notes}</p>` : ""}
          <p style="color:#475569;font-size:15px">Please be prepared and arrive/join on time. Best of luck!</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
            <p>InterviewPro AI-Enhanced Interview Management System</p>
          </div>
        </div>
      </div>`,
  }),

  // Moved to Screening
  candidateScreening: (candidate) => ({
    subject: `Application Update — ${candidate.position} | InterviewPro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
        <div style="background:#4f46e5;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">InterviewPro</h1>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">Your Application is Being Reviewed 🔍</h2>
          <p style="color:#475569;font-size:15px">Dear <strong>${candidate.name}</strong>,</p>
          <p style="color:#475569;font-size:15px">Good news — your application for <strong>${candidate.position}</strong> has moved into our screening stage. Our team is currently reviewing your profile.</p>
          <p style="color:#475569;font-size:15px">We'll be in touch with next steps shortly.</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
            <p>InterviewPro AI-Enhanced Interview Management System</p>
          </div>
        </div>
      </div>`,
  }),

  // Moved to Interview stage (pipeline progress, not a specific scheduled slot)
  candidateInterviewStage: (candidate) => ({
    subject: `You've Reached the Interview Stage — ${candidate.position} | InterviewPro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
        <div style="background:#4f46e5;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">InterviewPro</h1>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">You've Reached the Interview Stage 🎯</h2>
          <p style="color:#475569;font-size:15px">Dear <strong>${candidate.name}</strong>,</p>
          <p style="color:#475569;font-size:15px">Congratulations — your application for <strong>${candidate.position}</strong> has progressed to the interview stage.</p>
          <p style="color:#475569;font-size:15px">You'll receive a separate email with your interview schedule and details once it's confirmed.</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
            <p>InterviewPro AI-Enhanced Interview Management System</p>
          </div>
        </div>
      </div>`,
  }),

  // Moved to Offer
  candidateOffer: (candidate) => ({
    subject: `Exciting News About Your Application — ${candidate.position} | InterviewPro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
        <div style="background:#10b981;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">🎉 Great News!</h1>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">We're Preparing an Offer</h2>
          <p style="color:#475569;font-size:15px">Dear <strong>${candidate.name}</strong>,</p>
          <p style="color:#475569;font-size:15px">We're delighted to let you know that we're moving forward with an offer for the <strong>${candidate.position}</strong> position.</p>
          <p style="color:#475569;font-size:15px">Our HR team will reach out shortly with full offer details.</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
            <p>InterviewPro AI-Enhanced Interview Management System</p>
          </div>
        </div>
      </div>`,
  }),

  // Selected
  candidateSelected: (candidate) => ({
    subject: `Congratulations! You have been Selected — InterviewPro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
        <div style="background:#10b981;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">🎉 Congratulations!</h1>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">You've been Selected!</h2>
          <p style="color:#475569;font-size:15px">Dear <strong>${candidate.name}</strong>,</p>
          <p style="color:#475569;font-size:15px">We are delighted to inform you that after careful evaluation of your interview performance, you have been <strong style="color:#10b981">selected</strong> for the position of <strong>${candidate.position}</strong>.</p>
          <p style="color:#475569;font-size:15px">Our HR team will reach out to you shortly with further details regarding your offer letter and joining formalities.</p>
          <p style="color:#475569;font-size:15px">Welcome to the team! 🚀</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
            <p>InterviewPro AI-Enhanced Interview Management System</p>
          </div>
        </div>
      </div>`,
  }),

  // Rejected
  candidateRejected: (candidate) => ({
    subject: `Application Status Update — InterviewPro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
        <div style="background:#4f46e5;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">InterviewPro</h1>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin:0 0 16px">Application Status Update</h2>
          <p style="color:#475569;font-size:15px">Dear <strong>${candidate.name}</strong>,</p>
          <p style="color:#475569;font-size:15px">Thank you for your interest in the <strong>${candidate.position}</strong> position and for taking the time to interview with us.</p>
          <p style="color:#475569;font-size:15px">After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. This was a difficult decision as we had many strong candidates.</p>
          <p style="color:#475569;font-size:15px">We encourage you to apply for future openings that match your skills and experience. We wish you all the best in your career journey.</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
            <p>InterviewPro AI-Enhanced Interview Management System</p>
          </div>
        </div>
      </div>`,
  }),

  // Feedback submitted — notify HR
  feedbackSubmitted: (candidate, feedback, hrEmail) => ({
    subject: `Feedback Submitted — ${candidate.name} | InterviewPro`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
        <div style="background:#4f46e5;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">New Feedback Submitted</h1>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <p style="color:#475569;font-size:15px">Feedback has been submitted for candidate <strong>${candidate.name}</strong>.</p>
          <div style="background:#eef2ff;border-radius:10px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Candidate</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${candidate.name}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Position</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${candidate.position}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Technical</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${feedback.technical_score}/10</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Communication</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${feedback.communication_score}/10</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Problem Solving</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${feedback.problem_solving_score}/10</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Recommendation</td><td style="padding:8px 0;font-weight:600;color:#10b981">${feedback.recommendation}</td></tr>
            </table>
          </div>
          <p style="color:#475569;font-size:14px"><strong>Remarks:</strong> ${feedback.remarks || "No remarks provided"}</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:13px">
            <p>InterviewPro AI-Enhanced Interview Management System</p>
          </div>
        </div>
      </div>`,
  }),
};

// ── Send email function ───────────────────────────────────
async function sendEmail(to, template) {
  try {
    console.log("📧 Sending email to:", to);

    const transporter = createTransporter();

    const verify = await transporter.verify();
    console.log("✅ Gmail connection verified");

    const info = await transporter.sendMail({
      from: `"InterviewPro" <${process.env.EMAIL_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
    });

    console.log("✅ Email sent!");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);

    return true;
  } catch (err) {
    console.error("❌ EMAIL ERROR:");
    console.error(err);
    return false;
  }
}

module.exports = { sendEmail, templates };
