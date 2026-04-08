# QLDA - Hệ thống Quản lý Đấu thầu (Procurement Workflow System)

A full-stack procurement workflow system with multi-level approval, RBAC, and real-time WebSocket notifications.

## Architecture

```
qlda/
├── backend/          # NestJS + Prisma + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── auth/           # JWT authentication + RBAC guards
│       ├── users/          # User management (ADMIN)
│       ├── budget/         # Budget request workflow
│       ├── plan/           # Contractor plan workflow
│       ├── approvals/      # Approval history & stats
│       ├── notifications/  # WebSocket gateway
│       └── prisma/         # Database service
├── frontend/         # Next.js 14 App Router + TailwindCSS
│   └── src/
│       ├── app/
│       │   ├── login/
│       │   └── dashboard/
│       │       ├── budget/
│       │       ├── plans/
│       │       ├── approvals/
│       │       └── admin/
│       ├── components/
│       └── lib/
└── README.md
```

## Prerequisites

- Node.js 18+
- PostgreSQL running on localhost:5432
- npm

## Setup & Run

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE qlda_procurement;
```

Or update `backend/.env` with your database URL.

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Backend runs on **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@qlda.vn | password123 |
| Investor (Chủ đầu tư) | investor@qlda.vn | password123 |
| Head of Department (Trưởng phòng) | head@qlda.vn | password123 |
| Director (Giám đốc) | director@qlda.vn | password123 |

## Workflow

### Phase 1: Budget Approval (Phê duyệt dự toán)
1. **Investor** creates budget → `DRAFT`
2. **Investor** submits → `SUBMITTED`
3. **Director** reviews:
   - Approve → `APPROVED` → Phase 2
   - Reject → `REJECTED` → back to Investor

### Phase 2: Contractor Plan (KH LCNT)
1. **Investor** creates plan (linked to approved budget) → `DRAFT`
2. **Investor** submits → `SUBMITTED`  
3. **Head of Department** reviews → `REVIEWING`
4. **Director** final approval:
   - Approve → `APPROVED` (FINAL)
   - Reject → `REJECTED` → back to Investor

## API Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/profile | Get profile | Auth |
| GET | /api/users | List users | ADMIN |
| POST | /api/users | Create user | ADMIN |
| PATCH | /api/users/:id/role | Update role | ADMIN |
| GET | /api/budget | List budgets | Auth |
| POST | /api/budget | Create budget | INVESTOR |
| POST | /api/budget/:id/submit | Submit budget | INVESTOR |
| POST | /api/budget/:id/approve | Approve budget | DIRECTOR |
| POST | /api/budget/:id/reject | Reject budget | DIRECTOR |
| GET | /api/plan | List plans | Auth |
| POST | /api/plan | Create plan | INVESTOR |
| POST | /api/plan/:id/submit | Submit plan | INVESTOR |
| POST | /api/plan/:id/review | Review plan | HEAD_OF_DEPARTMENT |
| POST | /api/plan/:id/approve | Approve plan | DIRECTOR |
| POST | /api/plan/:id/reject | Reject plan | HEAD_OF_DEPARTMENT/DIRECTOR |
| GET | /api/approvals | Approval history | Auth |
| GET | /api/approvals/stats | Dashboard stats | Auth |

## WebSocket Events

Connect to `ws://localhost:4000/notifications`

| Event | Description |
|-------|-------------|
| budget:updated | Budget status changed |
| plan:updated | Plan status changed |

## Tech Stack

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL, Socket.io
- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Zustand, Socket.io Client
