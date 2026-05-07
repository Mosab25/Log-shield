# LogShield — Smart Log Analysis for Real-Time Risk Detection

LogShield is a defensive SOC Tier 1 web platform that collects, normalizes, and analyzes security logs to detect suspicious activities, calculate explainable risk scores, generate alerts, and support incident triage through a professional dashboard.

## Threat detection pipeline

LogShield distinguishes **detected threat activity** (alerts produced from your own normalized logs and correlation rules) from **threat intelligence lookups** (e.g. CVE metadata in Threat Intel search, which describes known vulnerabilities but does not scan your assets).

**Data path:** `Raw Log → Normalize → Detection (DB rules + engine logic) → Alert → (optional) Risk score → Triage / Incident / Response actions`

- **Explainability:** Each new alert stores a `detection_explanation` string (rule summary, thresholds, MITRE context) shown in the alert UI and API.
- **Noise reduction:** Set `DETECTION_TRUSTED_IPS` (comma-separated) and/or `DETECTION_IGNORE_USERNAMES` (comma-separated, case-insensitive) to skip detection for known scanners or service accounts.
- **Thresholds:** Window and count thresholds are configurable via `DETECTION_*` environment variables (see `backend/.env.example`).
- **Correlation:** The rule *Failed Logins Correlated With Sensitive Path Access* combines failed authentication and `/admin` path activity from the same IP within `DETECTION_CORRELATION_WINDOW_MINUTES`.
- **Response:** Analysts/admins can **mark an alert as contained**, **block the alert’s source IP** (same enforcement as IP Blocks), and follow the existing lifecycle (`open` → `investigating` → `resolved` / `false_positive`). `investigating` may also transition to `false_positive`.
- **Notifications:** For `high` and `critical` severities, optionally set `ALERT_WEBHOOK_URL` (JSON POST) and/or `ALERT_NOTIFICATION_EMAIL` with Resend configured (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).

After upgrading the database, add any newly seeded rules to an existing environment:

```bash
cd backend
alembic upgrade head
python -c "from app.db.session import SessionLocal; from app.services.detection_rules import DetectionRulesService; db=SessionLocal(); DetectionRulesService.seed_default_rules(db=db); db.close()"
```

### Manual demo (≈5–10 steps)

1. Start PostgreSQL, backend (`uvicorn`), and frontend (`npm run dev`).
2. Sign in as **analyst** or **admin** (`analyst@logshield.demo` / `Analyst@12345` after `python -m app.seed_demo`).
3. **Ingest** a raw log: `POST /api/logs/ingest` with a web log line that triggers parsing (e.g. SQL-like pattern in message) or use **Logs** UI if wired to the same API.
4. **Normalize:** `POST /api/logs/normalize/{raw_log_id}`.
5. **Run detection:** `POST /api/detection/run/{normalized_log_id}`.
6. Open the **Alerts** UI: confirm severity, read **Why this alert was generated** (explanation text).
7. **Triage:** move status to `investigating`, add a note, optionally **Create Incident** from the alert.
8. **Response:** use **Mark contained** and/or **Block source IP** on the alert detail page (analyst/admin).
9. (Optional) Configure `ALERT_WEBHOOK_URL` and create a **critical** alert to verify the webhook fires.

## Features

- JWT authentication and refresh tokens
- Role-based access control: admin, analyst, viewer
- Raw log ingestion and bulk ingestion
- Log normalization into a unified schema
- Detection rules with MITRE ATT&CK mapping
- Risk scoring from 0 to 100
- Alert management workflow
- Analyst notes and status history
- Audit logs
- SOC dashboard with charts
- Reports module with CSV/PDF export
- Demo seed data
- Docker Compose deployment

## Tech Stack

- Frontend: React + Vite + TypeScript + Tailwind CSS + Recharts
- Backend: FastAPI + SQLAlchemy + Alembic
- Database: PostgreSQL
- Auth: JWT access token + refresh token
- Deployment: Docker Compose, optional Nginx

## Demo Accounts

The demo seed creates admin, analyst, and viewer accounts for local testing.
Do not publish seeded passwords in public frontend UI or production deployment notes.

## Local Backend Setup

Create PostgreSQL database first:

```sql
CREATE DATABASE logshield_db;
CREATE USER logshield_user WITH PASSWORD 'logshield_password';
GRANT ALL PRIVILEGES ON DATABASE logshield_db TO logshield_user;
```

Run backend:

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Then:

```bash
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m app.seed_demo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend docs:

```text
http://localhost:8000/docs
```

## Local Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:5173
```

## Docker Setup

From the root folder:

```bash
docker compose build
docker compose up -d db backend frontend
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed_demo
```

Open:

```text
http://localhost:5173
```

## Optional Nginx Proxy

```bash
docker compose --profile proxy up -d nginx
```

Open:

```text
http://localhost:8080
```

## Render Deployment Notes

Frontend static site:

```env
VITE_API_BASE_URL=https://log-shield-hjpg.onrender.com/api
```

Backend web service:

```env
CORS_ORIGINS=https://logshield-frontend.onrender.com
```

The frontend includes `frontend/public/_redirects` so Render serves
`index.html` for React routes such as `/dashboard`, `/reports`, `/audit`,
and `/rules` after a browser refresh.

Use `/api/health` for deployment checks when `/docs` is disabled or unavailable.

## API Endpoints

### Authentication

- POST `/api/auth/login`
- POST `/api/auth/refresh`
- POST `/api/auth/logout`
- GET `/api/auth/me`

### Logs

- POST `/api/logs/ingest`
- POST `/api/logs/bulk-ingest`
- GET `/api/logs/raw`
- GET `/api/logs/raw/{id}`
- POST `/api/logs/normalize/{raw_log_id}`
- POST `/api/logs/normalize/batch`
- GET `/api/logs/normalized`

### Detection

- GET `/api/detection/rules`
- POST `/api/detection/rules`
- PATCH `/api/detection/rules/{id}`
- POST `/api/detection/run/{normalized_log_id}`
- POST `/api/detection/run-batch`

### Alerts

- GET `/api/alerts`
- GET `/api/alerts/{id}`
- PATCH `/api/alerts/{id}/status`
- PATCH `/api/alerts/{id}/assign`
- POST `/api/alerts/{id}/notes`
- GET `/api/alerts/{id}/history`
- GET `/api/alerts/stats/summary`

### Risk

- POST `/api/risk/calculate/alert/{alert_id}`
- POST `/api/risk/recalculate-all`
- GET `/api/risk/alert/{alert_id}`
- GET `/api/risk/high-risk-ips`
- GET `/api/risk/distribution`

### Dashboard

- GET `/api/dashboard/summary`
- GET `/api/dashboard/alerts-timeline`
- GET `/api/dashboard/risk-distribution`
- GET `/api/dashboard/top-attacked-users`
- GET `/api/dashboard/recent-events`

### Reports

- GET `/api/reports/daily`
- GET `/api/reports/weekly`
- GET `/api/reports/top-risky-ips`
- GET `/api/reports/most-targeted-users`
- GET `/api/reports/alerts-by-severity`
- GET `/api/reports/open-vs-resolved`
- GET `/api/reports/mttr`
- GET `/api/reports/export/csv`
- GET `/api/reports/export/pdf`

## Demo Scenarios

The seed script creates safe defensive demo data:

1. Normal login
2. Failed login attempts
3. Brute force detection
4. Suspicious admin login
5. Multiple 404 scanning
6. SQL injection-like pattern detected from log text only
7. Privilege change event
8. Analyst resolves alert
9. Alert marked as false positive
10. Daily report export

## Security Notes

- Change all default secrets before production.
- Do not commit `.env`.
- Use HTTPS in production.
- Restrict CORS origins.
- Do not expose PostgreSQL publicly in production.
- Do not run demo seed on production data.
- Use strong admin passwords.
- Monitor audit logs.

## Troubleshooting

### Backend cannot connect to database

Check `DATABASE_URL` in `backend/.env`.

### Frontend cannot reach API

Check `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Docker database reset

Development only:

```bash
docker compose down -v
docker compose up -d db backend frontend
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed_demo
```

### PDF export fails

Make sure `reportlab` is installed:

```bash
pip install -r backend/requirements.txt
```

## License

Academic / Graduation Project.
