# AIMOPS — AI for Marketing & Operations Predicting System

> An AI-powered sales forecasting and campaign planning platform built for small-to-medium Palestinian businesses — the ones that have never had access to enterprise analytics tools.

---

## What It Does

AIMOPS lets business owners upload their POS sales data and immediately get:

- **Sales forecasts** per product using a trained XGBoost model
- **Campaign planning** with predicted revenue impact before launching a promotion
- **Post-campaign analysis** comparing actual vs. forecasted performance
- **AI business consultation** via a Claude-powered chatbot that understands your specific business context
- **Automated reports** across sales, forecasts, campaigns, and user activity
- **Event detection** — AIMOPS automatically detects unusual sales spikes in uploaded data and flags them as draft events for the user to confirm (e.g. Ramadan, a local promotion)

Tested on real POS data: 801 rows, 52 products, 23 training days → **79.4% average forecast accuracy**.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI (async) |
| ML Model | XGBoost |
| AI Consultation | Anthropic Claude API (claude-sonnet) |
| Database | MySQL via AWS RDS |
| ORM | SQLAlchemy |
| Migrations | Alembic (manual — no autogenerate) |
| Auth | JWT + RBAC (3 roles, 23 permissions) |
| Background Tasks | APScheduler |
| Data Processing | Pandas, NumPy, Scikit-learn |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React |
| Language | TypeScript |
| Styling | CSS Modules |
| i18n | Arabic + English (full bilingual support) |
| HTTP | Axios |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   React Frontend                │
│         (TypeScript, bilingual AR/EN)           │
└────────────────────┬────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────┐
│                FastAPI Backend                  │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   Auth  │  │Forecasting│  │  AI Consult   │  │
│  │JWT+RBAC │  │ XGBoost  │  │ Claude API    │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │Campaign │  │ Reports  │  │   Scheduler   │  │
│  │Planning │  │ 7 endpoints│ │  APScheduler  │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              MySQL — AWS RDS                    │
│              24-table schema                    │
└─────────────────────────────────────────────────┘
```

---

## Key Features

### Intelligent Data Ingestion
- Upload `.xlsx` or `.csv` POS files
- Automatic column mapping with confidence scoring (supports Arabic headers)
- Checksum-based duplicate detection
- Multi-step import flow: upload → auto-map → confirm columns → confirm products → import

### XGBoost Forecasting Engine
- Trained per product on uploaded historical sales data
- Forecasts start from today, not from the end of training data
- Confidence scoring based on available training rows
- On-demand AI-generated forecast explanations (cached, regenerated on retrain)

### Campaign Planning
- Define a campaign with date range, discount type, and target products
- AIMOPS predicts revenue impact using historical promotion multipliers
- `targets_given` mode for campaigns with specific revenue goals
- Post-campaign analysis with baseline comparison

### AI Business Consultation
- Persistent conversation thread per user (10-message history cap)
- Business context gathered fresh per call via bulk queries (N+1 resolved)
- Streaming responses via Server-Sent Events (SSE)
- Summary feature for saving key consultation insights

### Reports Module
- 7 endpoints covering sales, forecasts, campaigns, products, and users
- Permission-gated (`reports.view`)
- Post-campaign notification scheduler with separated concerns (`scheduler.py` + `campaign_scheduler.py`)

### Auth & Permissions
- JWT-based authentication with refresh tokens
- 3 roles: Admin, Manager, Business Owner
- 23 granular permissions
- Login attempt limiting

---

## Database

24-table MySQL schema hosted on AWS RDS. Key tables include:

`users` · `roles` · `permissions` · `products` · `sales_records` · `ingestion_batches` · `forecasts` · `forecast_results` · `campaigns` · `campaign_products` · `events` · `event_impact_results` · `consultation_threads` · `consultation_messages` · `notifications` · `reports` · `business_profile`

All migrations are written manually — Alembic autogenerate is disabled for full control over schema changes.

---

## Project Structure

```
AIMOPS/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── schemas/      # Pydantic models
│   │   ├── services/     # Business logic
│   │   ├── models/       # SQLAlchemy ORM models
│   │   └── core/         # Auth, security, config
│   ├── alembic/          # Manual migrations
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── features/     # Feature-based structure
│   │   ├── api/          # API client functions
│   │   ├── components/   # Shared components
│   │   └── locales/      # AR + EN translations
│   └── .env.example
```

---

## Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL (local or remote)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your values
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env      # Fill in your values
npm run dev
```

### Environment Variables

**Backend `.env`:**
```
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=aimops
SECRET_KEY=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Frontend `.env`:**
```
VITE_API_BASE_URL=http://localhost:8000
```

---

## Team

| Name | Role |
|---|---|
| Farah Alasbah | Backend Developer — FastAPI, XGBoost, Claude API integration, database design, Alembic migrations |
| Shahd Abu Nawa | Frontend Developer — React, TypeScript, bilingual UI |

Supervised by **Rawan Gedeon** — Bethlehem University, Department of Software Engineering.
