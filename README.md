# Resume_Analyzer
# CareerCore — AI-Powered Internship Application Intelligence

CareerCore is a full-stack web app that helps students and job seekers maximize their internship application success rate. Upload your resume, paste a job description, and get instant AI-driven feedback — from match scoring to resume rewrites to technical interview practice.

---

## Features

- **Resume Analyzer** — Upload a PDF resume and a job description to get a weighted match score (0–100) broken down by required skills, preferred skills, and quantified impact. Receive 3 AI-rewritten bullet points powered by Groq (`llama-3.3-70b-versatile`).
- **Dashboard** — Visualize your match history, skill coverage gaps, skill demand by market, mentor recommendations, and intern-to-hire conversion rates by company.
- **Interview Practice** — Generate 3–15 technical interview questions by language and difficulty (Easy → God Level). Submit answers and get AI grading with correctness flags, feedback, and model answers.
- **Job Insights** — Browse curated internship listings with match scores, salary estimates, and market demand. Expand any role to see required skills and apply priority.
- **Application Strategy** — Charts showing how match score buckets correlate with callback and interview rates.
- **Text-to-Speech** — ElevenLabs TTS reads analysis results and interview feedback aloud.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion, Recharts |
| **Backend** | FastAPI, SQLAlchemy 2.0 (async), SQLite + aiosqlite |
| **AI** | Groq API (`llama-3.3-70b-versatile`) with rule-based fallback |
| **Auth** | JWT (python-jose) + bcrypt |
| **PDF Parsing** | PyMuPDF |
| **NLP/Scoring** | scikit-learn, numpy |
| **TTS** | ElevenLabs API |

---

## Project Structure

```
Resume_Analyzer/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── config.py
│       ├── database.py
│       ├── models/              # SQLAlchemy ORM (user, analysis, practice)
│       ├── routers/             # Auth, resume, jobs, dashboard, interview
│       ├── schemas/             # Pydantic request/response models
│       └── services/            # PDF parser, skill extractor, match scorer, AI suggester
└── frontend/
    ├── app/                     # Next.js App Router pages
    ├── components/              # Shell, cards, charts, shadcn UI primitives
    └── lib/                     # API client, ElevenLabs helpers, mock data
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com/) (free tier works)
- An [ElevenLabs API key](https://elevenlabs.io/) (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/careercore.git
cd careercore
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and fill in your keys:

```env
SECRET_KEY=your-secret-key
GROQ_API_KEY=your-groq-api-key
DATABASE_URL=sqlite+aiosqlite:///./internship_intelligence.db
ALLOWED_ORIGINS=http://localhost:3000
```

Start the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at `http://localhost:8000/docs`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

Start the frontend:

```bash
npm run dev
```

App available at `http://localhost:3000`.

### 4. Run both together

From the `frontend/` directory:

```bash
npm run dev:all
```

This starts both the FastAPI backend (port 8000) and Next.js frontend (port 3000) concurrently.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing secret | `dev-secret-key-change-in-production` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT TTL in minutes | `60` |
| `GROQ_API_KEY` | Groq LLM API key | *(falls back to rule-based)* |
| `DATABASE_URL` | SQLite connection string | `sqlite+aiosqlite:///./internship_intelligence.db` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | ElevenLabs TTS API key |

---

## Match Score Algorithm

The resume-to-JD match score is a weighted composite:

| Factor | Weight | Description |
|---|---|---|
| Required skill coverage | 55% | % of required JD skills found in resume |
| Preferred skill coverage | 25% | % of preferred JD skills found in resume |
| Quantified impact | 20% | % of resume bullets containing numbers/metrics |

---

## License

MIT
