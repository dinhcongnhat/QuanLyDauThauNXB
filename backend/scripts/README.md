# Document Library - Test Scripts

## Quick Start

### 1. Prerequisites

```bash
# Backend server must be running
cd backend
npm run start:dev
# or
npm run start

# Frontend server must be running
cd frontend
npm run dev
```

### 2. Run Backend API Tests

**Option A: Node.js script (recommended)**
```bash
cd backend
node scripts/test-document-library.js
```

**Option B: Bash/curl script**
```bash
cd backend
bash scripts/test-document-library.sh
```

**Option C: With custom API URL**
```bash
API_BASE_URL=http://your-server:4000/api node scripts/test-document-library.js
```

### 3. Verify Seed Data

```bash
cd backend
node scripts/verify-seed.js
```

### 4. Frontend Manual Testing

See `frontend/docs/TEST_CHECKLIST.md` for a complete manual test checklist.

---

## Test Coverage

### Backend API Tests
- [x] Organization CRUD (create, read, update, delete)
- [x] Library CRUD (create, read, update, delete)
- [x] Library CRUD filtered by organizationId
- [x] LibraryField CRUD (create, read, update, delete)
- [x] SavedValue CRUD (create, read, update, delete)
- [x] Duplicate key rejection (400 error)
- [x] Authentication requirement (401 without token)
- [x] Seeded data verification

### Frontend Manual Tests
See `frontend/docs/TEST_CHECKLIST.md` for:
- [ ] Admin panel navigation
- [ ] Organization management
- [ ] Library management
- [ ] Field management
- [ ] Saved value management
- [ ] LCNT workflow integration
- [ ] Library picker (auto-fill)
- [ ] Save to library modal
- [ ] Empty states
- [ ] Error handling
- [ ] Responsive layout

---

## Troubleshooting

### "Login failed"
- Check that the backend is running on the correct port
- Verify credentials: `admin@qlda.vn` / `password123`
- Check database connection

### "Connection refused"
```bash
# Check backend is running
curl http://localhost:4000/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@qlda.vn","password":"password123"}'
```

### Database not migrated
```bash
cd backend
npx prisma migrate dev
npx ts-node prisma/seed.ts
```

### Token expired
The test scripts auto-login each time, so no action needed.

---

## Expected Output

```
═══════════════════════════════════════════════
  Document Library API - Test Suite
═══════════════════════════════════════════════

[INFO] Logging in as admin...
[PASS] Login successful, token received
...
═══════════════════════════════════════════════
  Test Summary
═══════════════════════════════════════════════
  Total: XX  |  Passed: XX  |  Failed: X
═══════════════════════════════════════════════
All tests passed!
```
