# ⚡ CloudFront CDN & Redis Fast Database Architecture Guide
## Paperboat Education ERP Platform & ExamForge Assessment Engine

> **Enterprise Edge & In-Memory Database Acceleration Specification**  
> *Paperboat Education Systems Inc. © 2026. All rights reserved.*

---

## 📑 Table of Contents
1. [Architectural Overview & Data Flow](#1-architectural-overview--data-flow)
2. [Multi-Tier Caching Strategy](#2-multi-tier-caching-strategy)
   - [Tier 1: CloudFront Global Edge CDN](#tier-1-cloudfront-global-edge-cdn)
   - [Tier 2: Redis In-Memory Database Cache](#tier-2-redis-in-memory-database-cache)
   - [Tier 3: PostgreSQL Persistent Storage](#tier-3-postgresql-persistent-storage)
3. [AWS CloudFront Distribution Configuration](#3-aws-cloudfront-distribution-configuration)
4. [Docker Container Orchestration](#4-docker-container-orchestration)
5. [Database State & Super Admin Security](#5-database-state--super-admin-security)

---

## 1. Architectural Overview & Data Flow

To ensure sub-50ms response times for institutional operations and seamless scalability during high-concurrency exams:

```
[ GLOBAL CLIENT BROWSERS (Students / Faculty / Admins) ]
                      │
                      ▼
 🌐 AWS CLOUDFRONT (Global Edge CDN - 400+ PoPs)
   ├── Static Next.js Bundles (/_next/static/*) ──► Cached at Edge (TTL: 1 Year)
   ├── Media & Public Assets (/images/*, fonts) ──► Cached at Edge (TTL: 30 Days)
   └── Dynamic API & ERP Traffic (/api/*)      ──► Forwarded to Origin with Zero Caching
                      │
                      ▼
 🐳 DOCKER PRODUCTION CLUSTER (ECS / EKS / EC2 / Compose)
   ├── 📦 Frontend (Next.js 14 Standalone Container :3000)
   └── 📦 Backend (Express API Container :5001)
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
 ⚡ REDIS 7 IN-MEMORY CACHE    🐘 POSTGRESQL 16 DATABASE
 (Cache-Aside Queries & OTP)   (Persistent Multi-Tenant Store)
```

---

## 2. Multi-Tier Caching Strategy

### Tier 1: CloudFront Global Edge CDN
CloudFront handles SSL termination, DDoS protection (AWS Shield), and caches static assets closest to users globally:

| Route Path | Cache Behavior | Cache-Control Header |
| :--- | :--- | :--- |
| `/_next/static/*` | **Cache Everything (1 Year)** | `public, max-age=31536000, immutable` |
| `/images/*`, `/fonts/*` | **Cache at Edge (30 Days)** | `public, max-age=2592000` |
| `/api/*` | **Pass-Through (No Cache)** | `no-cache, no-store, must-revalidate` |
| `/` (Landing Page) | **Edge SWR Cache (5 Min)** | `public, max-age=60, s-maxage=300, stale-while-revalidate=600` |

---

### Tier 2: Redis In-Memory Database Cache
Redis acts as the **high-speed L1 in-memory database cache** sitting directly between the Express Backend and PostgreSQL.

1. **Sub-Millisecond Query Retrieval**:
   - `academic:structure:{orgId}`: Cached for 120 seconds. Returns institutional hierarchy instantly without 6 database joins.
   - Automatically invalidated via `CacheService.delPattern('academic:*')` whenever a new department, program, year, or class is created.
2. **Cryptographic 2FA OTP Storage**:
   - High-speed transient storage for 6-digit Super Admin and Student verification codes with automatic TTL expiry.
3. **BullMQ Worker Queues**:
   - Asynchronous job execution for batch test evaluation, bulk email notifications, and automated report card PDF generation.

---

### Tier 3: PostgreSQL Persistent Storage
- Multi-tenant relational store housing ACID-compliant academic data, faculty rosters, attendance sheets, and verified exam marksheets.

---

## 3. AWS CloudFront Distribution Configuration

Below is the standard AWS CloudFront distribution template:

```json
{
  "CallerReference": "paperboat-erp-cloudfront-2026",
  "Aliases": {
    "Quantity": 1,
    "Items": ["erp.yourinstitution.edu"]
  },
  "Origins": {
    "Quantity": 2,
    "Items": [
      {
        "Id": "FrontendOrigin",
        "DomainName": "frontend-alb.yourinstitution.edu",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      },
      {
        "Id": "BackendApiOrigin",
        "DomainName": "backend-alb.yourinstitution.edu",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      }
    ]
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "BackendApiOrigin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 7,
          "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        },
        "ForwardedValues": {
          "QueryString": true,
          "Cookies": { "Forward": "all" },
          "Headers": {
            "Quantity": 3,
            "Items": ["Authorization", "Host", "Accept"]
          }
        },
        "MinTTL": 0,
        "DefaultTTL": 0,
        "MaxTTL": 0
      },
      {
        "PathPattern": "/_next/static/*",
        "TargetOriginId": "FrontendOrigin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 86400,
        "DefaultTTL": 2592000,
        "MaxTTL": 31536000
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "FrontendOrigin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": { "Forward": "all" }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": false,
    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
```

---

## 4. Docker Container Orchestration

### Starting the Full Containerized Stack
Run the following command in the project root:

```bash
# 1. Copy Docker environment variables
cp .env.docker.example .env

# 2. Build and launch all 4 services in the background
docker compose up -d --build

# 3. Check service health status
docker compose ps
```

### Container Port Mapping
- **Frontend Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:5001`
- **Redis In-Memory Engine**: `localhost:6379`
- **PostgreSQL Database**: `localhost:5432`

### Container Management Commands

```bash
# View live container logs
docker compose logs -f backend
docker compose logs -f frontend

# Run database migrations inside backend container
docker compose exec backend npx prisma migrate deploy

# Run seed script inside backend container
docker compose exec backend npm run db:seed

# Stop and shut down containers
docker compose down
```

---

## 5. Database State & Super Admin Security

The database has been purged of all dummy accounts and initialized in a clean, production-ready state with only the verified Super Administrator:

- **Super Admin Email**: `examforge.superadmin@gmail.com`
- **Default Password**: `Password@123`
- **Authentication**: Zero-Trust 2FA OTP dispatched via Resend API.
- **Institutional Onboarding**: New colleges register cleanly at `/college` to generate isolated tenant codes (e.g. `INSTITUTE-2026`).

---
*Paperboat Education ERP Platform & ExamForge Engine — Enterprise Grade Architecture.*
