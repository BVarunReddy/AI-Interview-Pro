// export.js — Export candidates to Excel and PDF

function exportToExcel(data, filename) {
  if (!data || !data.length) {
    Toast.warning("No data to export.");
    return;
  }
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Position",
    "Experience",
    "Skills",
    "Status",
    "AI Score",
    "Added On",
  ];
  const rows = data.map((c) => [
    c.name,
    c.email,
    c.phone || "—",
    c.position,
    `${c.experience || 0} years`,
    c.skills || "—",
    c.status,
    c.ai_score || "—",
    formatDate(c.created_at),
  ]);
  let csv = headers.join(",") + "\n";
  rows.forEach((row) => {
    csv +=
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") +
      "\n";
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "candidates.csv";
  a.click();
  URL.revokeObjectURL(url);
  Toast.success("Exported to CSV successfully!");
}

function exportFeedbackToExcel(data, filename) {
  if (!data || !data.length) {
    Toast.warning("No feedback to export.");
    return;
  }
  const headers = [
    "Candidate",
    "Technical",
    "Communication",
    "Problem Solving",
    "Overall",
    "Recommendation",
    "Remarks",
    "Date",
  ];
  const rows = data.map((f) => [
    f.candidate_name,
    f.technical_score,
    f.communication_score,
    f.problem_solving_score,
    parseFloat(f.overall_score || 0).toFixed(1),
    f.recommendation,
    f.remarks || "—",
    formatDate(f.created_at),
  ]);
  let csv = headers.join(",") + "\n";
  rows.forEach((row) => {
    csv +=
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") +
      "\n";
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "feedback.csv";
  a.click();
  URL.revokeObjectURL(url);
  Toast.success("Feedback exported!");
}

function exportToPDF(title, headers, rows, filename) {
  const printWin = window.open("", "_blank");
  const tableRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  printWin.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
      h1{color:#4f46e5;font-size:20px;margin-bottom:8px}
      p{color:#64748b;margin-bottom:20px;font-size:11px}
      table{width:100%;border-collapse:collapse}
      th{background:#4f46e5;color:white;padding:8px 12px;text-align:left;font-size:11px}
      td{padding:7px 12px;border-bottom:1px solid #e2e8f0;font-size:11px}
      tr:nth-child(even){background:#f8fafc}
    </style></head><body>
    <h1>${title}</h1>
    <p>Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} · InterviewPro ATS</p>
    <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${tableRows}</tbody></table></body></html>`);
  printWin.document.close();
  setTimeout(() => {
    printWin.print();
  }, 500);
  Toast.success("PDF ready to print/save!");
}
