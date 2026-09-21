# ⛵ Paperboat Education ERP Platform
### Next-Gen Institutional Academic Governance & ExamForge Assessment Engine

> **Paperboat Education Systems Inc. © 2026. All rights reserved.**  
> *Child Engine: ExamForge Secure Examination & Coding Assessment Engine.*

---

## 🌟 Platform Overview

**Paperboat** is a unified, multi-tenant Education ERP and Academic Governance Platform designed for colleges, universities, polytechnics, and higher-education institutions. It provides dedicated, isolated portals for College Administrators, Class Teachers, Subject Teachers, Students, and Super Administrators.

### Core Architectural Principle: *"Assignment Determines Access"*
- **College Admin / Principal**: Comprehensive institutional setup, department hierarchy, degree programs, academic years, class divisions, and Class Teacher designation.
- **Class Teacher Hub**: Division-level governance, curriculum subject creation, theory/practical/viva faculty allocation, daily roll-call attendance, and semester marksheets.
- **Subject Teacher Hub**: Course-specific assessment creation, CSV question bank ingestion, 50-mark practical rubrics (Exp + Record + Imp + Viva), and oral viva scoring.
- **Student Learning Portal**: Daily timetable, personal task manager, active test runner, real-time calendar event notifications, and official report cards.
- **Super Admin Platform**: Multi-tenant institutional governance, subscription oversight, and Cryptographic 2FA OTP security via Resend.

---

## 📁 Monorepo Structure

```
├── apps/
│   ├── backend/             # Express.js REST API + Prisma ORM + Redis Cache & Queues (Port 5001)
│   └── frontend/            # Next.js 14 Standalone + Tailwind CSS + Monaco Editor (Port 3000)
├── docker-compose.yml       # Production Compose (PostgreSQL 16, Redis 7, Backend, Frontend)
├── .env.docker.example      # Environment variables template
├── PAPERBOAT_ERP_COMPLETE_PROCESS_GUIDE.md  # Master process, routes & workflow guide
└── CLOUDFRONT_REDIS_DATABASE_ARCHITECTURE.md # AWS CloudFront CDN & Redis caching blueprint
```

---

## 🚀 Quick Start (Docker Deployment)

Launch the complete containerized stack in seconds:

```bash
# 1. Prepare environment configuration
cp .env.docker.example .env

# 2. Build and launch all 4 containers (PostgreSQL, Redis, Backend, Frontend)
docker compose up -d --build

# 3. Check service health
docker compose ps
```

### Local Development (Without Docker)

```bash
# 1. Backend (Terminal 1)
cd apps/backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# 2. Frontend (Terminal 2)
cd apps/frontend
npm install
npm run dev
```

---

## 🔐 Pre-Seeded Super Admin Credentials

- **Email**: `examforge.superadmin@gmail.com`
- **Password**: `Password@123`
- **Authentication**: Zero-Trust 2FA OTP dispatched via Resend API
- **Super Admin Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **College Registration**: [http://localhost:3000/college](http://localhost:3000/college)

---

## 📘 Comprehensive Documentation

- [Complete ERP Process & Roadmap Manual](./PAPERBOAT_ERP_COMPLETE_PROCESS_GUIDE.md)
- [AWS CloudFront CDN & Redis Database Architecture](./CLOUDFRONT_REDIS_DATABASE_ARCHITECTURE.md)

---
*Paperboat Education ERP Platform & ExamForge Engine — Built for Excellence in Higher Education.*
