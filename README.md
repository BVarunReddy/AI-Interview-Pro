# InterviewPro — AI-Enhanced Interview Management System

> A full-stack recruitment management system with Machine Learning candidate prediction and AI-powered evaluation reports.

---

## Project Overview

InterviewPro is a modern Applicant Tracking System (ATS) that helps organizations schedule and manage interviews, track candidate status, collect structured feedback, and use Machine Learning to predict candidate selection probability.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| ML Module | Python, scikit-learn (Random Forest) |
| AI Module | Rule-based Generative Evaluation Engine |

## System Modules

### 1. Interview Management (Full Stack)
- Candidate Registration & Login
- Recruiter/Admin Login with JWT Auth
- Interview Scheduling & Round Management
- Candidate Status Tracking (Pipeline)
- Interview Feedback Submission
- Recruitment Reports & Analytics Dashboard

### 2. Machine Learning Module
- **Algorithm:** Random Forest Classifier
- **Task:** Candidate Selection Prediction
- **Output:** Highly Likely / Moderately Likely / Low Selection Probability
- **Features:** Experience, Technical Score, Communication, Problem Solving, Skills Count

### 3. Generative AI Module
- **Task:** Interview Feedback & Evaluation Report Generator
- **Output:** Structured evaluation report with strengths, gaps, and recommendation
- **Integrated into:** Feedback page — generate report button

---

## Project Structure

```
AI-Interview-System/
├── Frontend/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── addCandidate.html
│   ├── viewCandidates.html
│   ├── scheduleInterview.html
│   ├── viewInterviews.html
│   ├── feedback.html
│   ├── analytics.html
│   ├── aiScore.html
│   ├── mlPredict.html
│   ├── css/app.css
│   └── js/
│       ├── api.js
│       ├── toast.js
│       ├── dashboard.js
│       ├── candidate.js
│       ├── viewCandidates.js
│       ├── interview.js
│       ├── viewInterviews.js
│       ├── feedback.js
│       ├── analytics.js
│       ├── aiScore.js
│       ├── profile.js
│       └── mlPredict.js
├── Backend/
│   ├── server.js
│   ├── db.js
│   ├── schema.sql
│   ├── .env
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js
│       ├── candidates.js
│       ├── interviews.js
│       ├── feedback.js
│       ├── dashboard.js
│       ├── ai.js
│       └── ml.js
└── ML/
    ├── recruitment_dataset.csv
    ├── train_model.ipynb
    ├── predict.py
    ├── random_forest_model.pkl  ← generated after training
    └── model_accuracy_report.txt ← generated after training
```

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- Python 3.8+ with pip

### Step 1 — Database Setup
```sql
-- Run in MySQL Workbench
source backend/schema.sql
source backend/ml_columns.sql
```

### Step 2 — Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL password
npm install
npm run dev
```

### Step 3 — ML Module Setup
```bash
pip install scikit-learn pandas numpy matplotlib seaborn joblib
# Open ML/train_model.ipynb in Jupyter Notebook
# Run all cells — this trains and saves the model
```

### Step 4 — Run the App
Open `frontend/login.html` in browser


## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/candidates | Get all candidates |
| POST | /api/candidates | Add candidate |
| GET | /api/dashboard/stats | Dashboard stats |
| POST | /api/interviews | Schedule interview |
| POST | /api/feedback | Submit feedback |
| POST | /api/ai/score-resume | AI resume score |
| POST | /api/ai/generate-report | Generate evaluation report |
| POST | /api/ml/predict | ML selection prediction |
| GET | /api/ml/predictions | Get all predictions |

---

## ML Model Details

- **Algorithm:** Random Forest Classifier (100 trees)
- **Training Data:** 100 recruitment records
- **Features Used:** years_experience, technical_score, communication_score, problem_solving_score, num_interviews, education_level, previous_companies, skills_count
- **Output Classes:** Highly Likely (≥70%) / Moderately Likely (40-69%) / Low (<40%)

---


