# 📦 LogiFlow — Multi-Tenant Logistics SaaS Platform

[![Django](https://img.shields.io/badge/Django-4.x-green?logo=django)](https://djangoproject.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7.x-red?logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docker.com)
[![Celery](https://img.shields.io/badge/Celery-5.x-green)](https://docs.celeryq.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

LogiFlow is a production-grade multi-tenant logistics SaaS platform that enables companies to manage their entire supply chain — from inventory and warehousing through to production, distribution, and billing — in a single unified platform.

**Live Demo:** [logi-flow-three.vercel.app](https://logi-flow-three.vercel.app)  
**GitHub:** [github.com/wachira7/LogiFlow](https://github.com/wachira7/LogiFlow)

---

## ✨ Features

### 🏢 Multi-Tenancy
- Complete data isolation between tenant companies
- Role-based access control (Platform Admin, Company Admin, Manager, Staff)
- Custom branding per tenant
- Subscription-based tier system with feature gating

### 📦 Inventory Management
- Product catalog with categories and variants
- Stock level tracking with reorder points (`min_stock_level`, `max_stock_level`)
- Transaction history (`RECEIPT`, `SHIPMENT`, `RETURN`)
- Low stock alerts and automated reorder notifications

### 🏭 Warehousing
- Multi-warehouse support with zone management
- Stock transfer workflows with approval system
- Stock movement audit trail
- Capacity tracking and utilization reports

### ⚙️ Production
- Production orders with step-by-step tracking
- Bill of materials (BOM) management
- Materials consumption tracking
- Production dashboard with progress indicators

### 🚚 Distribution
- Route planning and delivery management
- Real-time route tracking with **Leaflet.js** and OpenStreetMap geocoding
- Delivery status with progress bars and delay detection
- Route stops with lat/lng coordinates via Nominatim geocoding

### 💳 Billing & Payments
- Automated trial expiration via Celery
- Recurring billing with email reminders
- **Stripe** — card payments
- **M-Pesa** — mobile money (Safaricom Daraja API)
- **NOWPayments** — cryptocurrency payments
- Invoice generation and payment history

### 🖥 Platform Admin
- Tenant management and subscription oversight
- System health monitoring
- Audit logs for all platform actions
- Financial analytics and revenue reports
- Notification management

### 📊 Analytics
- Per-tenant analytics: inventory, distribution, production, warehousing
- Revenue reports and subscription metrics
- Prometheus + Grafana monitoring stack

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, Leaflet.js |
| **Backend** | Django 4.x, Django REST Framework |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Task Queue** | Celery + Celery Beat |
| **Payments** | Stripe, M-Pesa Daraja API, NOWPayments |
| **Storage** | Cloudinary (profile pictures, company logos), AWS S3 |
| **Maps** | Leaflet.js, react-leaflet, Nominatim (OpenStreetMap) |
| **Monitoring** | Prometheus, Grafana |
| **Deployment** | Northflank (backend + Celery), Vercel (frontend) |
| **CI/CD** | GitHub Actions |
| **Containers** | Docker, Docker Compose |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Vercel)                      │
│           Next.js 16 + TypeScript                        │
│     State: Services + Hooks pattern (no Redux)           │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                  Backend (Northflank)                    │
│           Django REST Framework                          │
│      Auth Guard: middleware → layout → pages             │
└────────┬──────────────────┬────────────────────────────┘
         │                  │
┌────────▼───────┐  ┌───────▼──────────────────────────┐
│  PostgreSQL 15 │  │         Redis                    │
│  (all data)    │  │  Cache + Celery broker           │
└────────────────┘  └──────────────────────────────────┘
                           │
              ┌────────────▼───────────────┐
              │      Celery Workers        │
              │  - Trial expiration        │
              │  - Recurring billing       │
              │  - Email reminders         │
              │  - Analytics aggregation   │
              └────────────────────────────┘
```

### Auth Architecture
```
HTTP Request
    ↓
Middleware (cookie/token check)
    ↓
Layout.tsx (full user object + role check)
    ↓
Page (no guard needed — layout handles it)
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Yarn

### 1. Clone the repository

```bash
git clone https://github.com/wachira7/LogiFlow.git
cd LogiFlow

# Block commits of env files, databases and other ignored files
git config core.hooksPath .githooks
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
# Fill in development/test values only. Never commit real env files or production keys;
# the pre-commit hook and the Repo Guard CI check will reject them.
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
# Starts: PostgreSQL, Redis, Prometheus, Grafana
```

### 4. Set up the backend

```bash
cd backend
# Requires uv: https://docs.astral.sh/uv/ (installs Python 3.12.13 from .python-version)
uv sync

uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver
```

#### Dependencies with uv

`pyproject.toml` + `uv.lock` are the source of truth. To add or upgrade a package:

```bash
uv add <package>              # or: uv add --group dev <package>
uv lock --upgrade-package <package>
```

`requirements/*.txt` are exported from the lockfile for tools that still need them:

```bash
uv export --frozen --no-dev --no-hashes --no-emit-project -o requirements/base.txt
```

### 5. Start Celery workers

```bash
# In a separate terminal (from backend directory)
celery -A logistics_project worker -l info

# Celery Beat scheduler
celery -A logistics_project beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### 6. Set up the frontend

```bash
cd frontend
yarn install
yarn dev
```

The app will be available at `http://localhost:3000`  
Django Admin at `http://localhost:8000/admin`

---

## 📁 Project Structure

```
LogiFlow/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # User auth and profiles
│   │   ├── companies/       # Multi-tenant company management
│   │   ├── inventory/       # Products, stock, transactions
│   │   ├── warehousing/     # Warehouses, transfers, movements
│   │   ├── production/      # Orders, steps, materials
│   │   ├── distribution/    # Routes, stops, delivery tracking
│   │   ├── billing/         # Subscriptions, payments, invoices
│   │   ├── analytics/       # Reports and dashboards
│   │   └── platform_admin/  # Platform-level administration
│   ├── logistics_project/   # Django project settings
│   └── requirements/
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components per module
│   │   ├── services/        # API service layer
│   │   ├── hooks/           # Custom React hooks
│   │   └── types/           # TypeScript type definitions
├── infrastructure/
│   └── monitoring/          # Prometheus + Grafana config
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
└── docker-compose.yml
```

---

## 🏢 Multi-Tenant Model

Each company gets:
- Isolated data (all queries scoped by `company_id`)
- Dedicated subscription with tier-based feature access
- Role-based permissions (Admin, Manager, Staff)
- Custom company profile with logo and branding

```
Platform Admin
    └── Company A (Premium)
    │       ├── Admin User
    │       ├── Manager Users
    │       └── Staff Users
    └── Company B (Basic)
            ├── Admin User
            └── Staff Users
```

---

## 🔄 Subscription Tiers

| Feature | Free | Basic | Premium |
|---------|------|-------|---------|
| Users | 3 | 10 | Unlimited |
| Warehouses | 1 | 5 | Unlimited |
| Products | 100 | 1,000 | Unlimited |
| Distribution Routes | ❌ | ✅ | ✅ |
| Analytics | Basic | Standard | Advanced |
| API Access | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

---

## 🔐 Environment Variables

See `.env.example` for all required variables. Key ones:

```env
# Core
DEBUG=False
SECRET_KEY=...
DATABASE_URL=postgresql://...

# Redis / Celery
REDIS_URL=redis://...
CELERY_BROKER_URL=redis://...

# Payments
STRIPE_SECRET_KEY=...
MPESA_CONSUMER_KEY=...
NOWPAYMENTS_API_KEY=...

# Storage
CLOUDINARY_CLOUD_NAME=...
AWS_ACCESS_KEY_ID=...

# Monitoring
SENTRY_DSN=...
```

---

## 🔌 CI/CD Pipeline

GitHub Actions workflow on push to `main`:

```
Build & Push Docker images (backend + frontend) → GHCR
    ↓
Run Django migrations (Northflank job)
    ↓
Deploy backend service → Northflank
Deploy Celery worker → Northflank
    ↓
Frontend → Vercel (auto-deploy via GitHub integration)
    ↓
Health check → /api/health/
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Emmanuel Warutere Wachira**  
Full-Stack Developer & DevOps Engineer  
[Portfolio](https://wew-portfolio.vercel.app) · [GitHub](https://github.com/wachira7) · [LinkedIn](https://linkedin.com/in/emmanuelwaruts77)