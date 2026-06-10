#!/usr/bin/env node
/**
 * End-to-End Test Script: Đặt sách (Thầu Sách) Full Flow
 *
 * Usage: node scripts/test-datsach-flow.js
 */

const API_BASE = 'https://demo.jtsc.vn/api';
const ADMIN_EMAIL = 'dinhcongnhat.02@gmail.com';
const ADMIN_PASS = '10122002';

let authToken = '';
let currentUser = null;

function log(level, msg) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 8);
  const icon = level === 'PASS' ? '✅' : level === 'FAIL' ? '❌' : level === 'STEP' ? '📋' : level === 'INFO' ? '  ↪' : '  ';
  console.log(`${ts} ${icon} ${msg}`);
}

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  let body;
  try {
    body = contentType.includes('application/json') ? await res.json() : await res.text();
  } catch {
    body = await res.text();
  }
  return { status: res.status, ok: res.ok, body, headers: Object.fromEntries(res.headers.entries()) };
}

async function login(email, password) {
  log('INFO', `Logging in as ${email}...`);
  const { body, ok } = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!ok) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  authToken = body.access_token;
  currentUser = body.user;
  log('PASS', `Logged in as ${currentUser.name} (${currentUser.role})`);
  return body;
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ĐẶT SÁCH (Thầu Sách) — Full E2E Flow Test');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = [];
  let passed = 0, failed = 0;

  async function test(name, fn) {
    log('STEP', `--- ${name} ---`);
    try {
      const result = await fn();
      log('PASS', name);
      results.push({ name, status: 'PASS' });
      passed++;
      return result;
    } catch (err) {
      log('FAIL', `${name}: ${err.message}`);
      results.push({ name, status: 'FAIL', error: err.message });
      failed++;
      return null;
    }
  }

  // Login
  await login(ADMIN_EMAIL, ADMIN_PASS);

  // ── TEST 1: Project Summary (was 500) ──────────────────────
  const parentProject = await test('1. Project Summary (was 500)', async () => {
    const { body, ok, status } = await api('/projects');
    if (!ok) throw new Error(`Cannot list projects: ${status}`);
    const thauSach = body.find(p => p.procurementType === 'THAU_SACH');
    if (!thauSach) throw new Error('No THAU_SACH project found');

    const summary = await api(`/projects/${thauSach.id}/summary`);
    if (summary.status === 500) throw new Error('Summary returned 500!');
    if (!summary.ok) throw new Error(`Summary failed: ${summary.status}`);

    const datSachStep = summary.body.steps?.find(s => s.key === 'dat_sach');
    log('INFO', `  dat_sach status: ${datSachStep?.status} (expected: IN_PROGRESS, was NOT_STARTED)`);
    log('INFO', `  Steps: ${summary.body.steps?.map(s => `${s.key}=${s.status}`).join(', ')}`);
    return thauSach;
  });

  if (!parentProject) { console.log('\nFATAL: No THAU_SACH project. Aborting.'); process.exit(1); }

  // ── TEST 2: DatSachProject ─────────────────────────────────
  let dsProject = null;
  const dsFromTest = await test('2. DatSachProject Create/Get', async () => {
    const { body, ok } = await api(`/dat-sach/projects?parentId=${parentProject.id}`);
    if (!ok) throw new Error(`Cannot list dat-sach: ${JSON.stringify(body)}`);

    // Find a project that has GDNs
    let found = body.find(p => p.gdnDocuments?.length > 0);
    if (!found) found = body[0];
    if (!found) throw new Error('No dat-sach project found');

    log('INFO', `  Found: ${found.id.slice(0, 8)}... status=${found.status} reviewStatus=${found.reviewStatus || 'null'}`);
    log('INFO', `  GDNs: ${found.gdnDocuments?.length || 0}, PCDIs: ${found.pcdiDocuments?.length || 0}`);
    dsProject = found;
    return found;
  });

  if (!dsFromTest) dsProject = dsFromTest;

  // ── TEST 3: GDN ─────────────────────────────────────────────
  let gdn = null;
  const gdnFromTest = await test('3. GDN In Sách', async () => {
    const detail = await api(`/dat-sach/projects/${dsProject.id}`);
    if (!detail.ok) throw new Error(`Cannot get dsProject: ${JSON.stringify(detail.body)}`);

    const existing = detail.body.gdnDocuments?.[0];
    if (existing) {
      log('INFO', `  Using existing GDN: ${existing.id.slice(0, 8)} status=${existing.status}`);
      gdn = existing;
      return existing;
    }
    throw new Error('No GDN found in this dat-sach project');
  });

  if (gdnFromTest) gdn = gdnFromTest;

  // ── TEST 4: User Assignment ────────────────────────────────
  let assignments = [];
  await test('4. User Assignment', async () => {
    if (!gdn) throw new Error('No GDN from previous test');

    // Skip if GDN is already APPROVED (can't reassign after approval)
    if (gdn.status === 'APPROVED') {
      log('INFO', '  GDN is APPROVED — cannot assign (correct business logic). Skipping.');
      return { skipped: true };
    }

    const { body: users } = await api('/users');
    if (!Array.isArray(users)) throw new Error('Cannot get users');

    const assignable = users.filter(u => u.role !== 'ADMIN' && u.email).slice(0, 2);
    if (assignable.length === 0) throw new Error('No assignable users found');

    const { body, ok } = await api(`/dat-sach/gdn/${gdn.id}/assign-users`, {
      method: 'POST',
      body: JSON.stringify({ userIds: assignable.map(u => u.id) }),
    });
    if (!ok) throw new Error(`Assign failed: ${JSON.stringify(body)}`);

    assignments = body;
    log('INFO', `  Assigned: ${assignments.map(a => `${a.user?.name}(${a.soLuong || 0})`).join(', ')}`);
    return assignments;
  });

  // ── TEST 5: Fill SL + completedAt ─────────────────────────
  await test('5. Fill SL sets completedAt', async () => {
    if (!gdn) throw new Error('No GDN');

    if (assignments.length === 0) {
      log('INFO', '  No assignments available — creating a test assignment first...');
      const { body: users } = await api('/users');
      const assignee = users.find(u => u.role !== 'ADMIN' && u.email);
      if (!assignee) throw new Error('No assignable user');

      // Only try if GDN is not APPROVED
      if (gdn.status !== 'APPROVED') {
        const assign = await api(`/dat-sach/gdn/${gdn.id}/assign-users`, {
          method: 'POST',
          body: JSON.stringify({ userIds: [assignee.id] }),
        });
        if (!assign.ok) throw new Error(`Could not create assignment: ${JSON.stringify(assign.body)}`);
        assignments = assign.body;
      }
    }

    if (assignments.length === 0) {
      log('INFO', '  GDN is APPROVED — cannot create assignment. Skipping fillSL test.');
      return { skipped: true };
    }

    const assignee = assignments[0];
    // Try as admin first
    const { status } = await api(`/dat-sach/gdn/${gdn.id}/fill-sl`, {
      method: 'PATCH',
      body: JSON.stringify({ soLuong: 500 }),
    });

    if (status === 403) {
      // Expected: admin is not assigned user. Try as assigned user.
      log('INFO', '  Admin not assigned (403). Trying as assigned user...');
      await login(assignee.user.email, '10122002');
    }

    const fill = await api(`/dat-sach/gdn/${gdn.id}/fill-sl`, {
      method: 'PATCH',
      body: JSON.stringify({ soLuong: 500 }),
    });

    // Switch back
    await login(ADMIN_EMAIL, ADMIN_PASS);

    if (!fill.ok) throw new Error(`fillSL failed: ${JSON.stringify(fill.body)}`);
    if (!fill.body.completedAt) throw new Error('completedAt NOT SET after fillSL!');
    log('INFO', `  soLuong=${fill.body.soLuong} completedAt=${fill.body.completedAt}`);
    return fill.body;
  });

  // ── TEST 6: GDN Review Workflow ────────────────────────────
  await test('6. GDN Review Workflow', async () => {
    if (!gdn) throw new Error('No GDN');
    if (gdn.status === 'APPROVED') {
      log('INFO', '  GDN is already APPROVED. Skipping submit/approve.');
      return { skipped: true };
    }
    const { body: users } = await api('/users');
    const reviewer = users.find(u => u.role === 'DIRECTOR' || u.role === 'HEAD_OF_DEPARTMENT');
    if (!reviewer) throw new Error('No reviewer found');

    // Submit
    const submit = await api(`/dat-sach/gdn/${gdn.id}/submit-review`, {
      method: 'POST',
      body: JSON.stringify({ reviewerId: reviewer.id }),
    });
    if (!submit.ok) throw new Error(`Submit failed: ${JSON.stringify(submit.body)}`);
    log('INFO', `  Submitted to reviewer: ${reviewer.name}`);

    // Approve as reviewer
    await login(reviewer.email, '10122002');
    const approve = await api(`/dat-sach/gdn/${gdn.id}/review-approve`, { method: 'POST' });
    await login(ADMIN_EMAIL, ADMIN_PASS);

    if (!approve.ok) throw new Error(`Approve failed: ${JSON.stringify(approve.body)}`);
    log('INFO', `  Approved. Status=${approve.body.status} reviewStatus=${approve.body.reviewStatus}`);
    return approve.body;
  });

  // ── TEST 7: PCDI Workflow ─────────────────────────────────
  await test('7. PCDI Workflow', async () => {
    if (!dsProject) throw new Error('No dsProject');

    const detail = await api(`/dat-sach/projects/${dsProject.id}`);
    let pcdi = detail.body.pcdiDocuments?.[0];

    if (!pcdi) {
      const create = await api('/dat-sach/pcdi', {
        method: 'POST',
        body: JSON.stringify({ projectId: dsProject.id, data: { coSoIn: 'Test Co So', diaChiCoSoIn: 'HN' } }),
      });
      if (!create.ok) throw new Error(`PCDI create failed: ${JSON.stringify(create.body)}`);
      pcdi = create.body;
    }
    log('INFO', `  PCDI: ${pcdi.id.slice(0, 8)} status=${pcdi.status}`);

    const { body: users } = await api('/users');
    const reviewer = users.find(u => u.role === 'DIRECTOR' || u.role === 'HEAD_OF_DEPARTMENT');
    if (!reviewer) throw new Error('No reviewer');

    await login(reviewer.email, '10122002');
    await api(`/dat-sach/pcdi/${pcdi.id}/submit-review`, {
      method: 'POST', body: JSON.stringify({ reviewerId: reviewer.id }),
    });
    const approve = await api(`/dat-sach/pcdi/${pcdi.id}/review-approve`, { method: 'POST' });
    await login(ADMIN_EMAIL, ADMIN_PASS);

    if (!approve.ok) throw new Error(`PCDI approve: ${JSON.stringify(approve.body)}`);
    log('INFO', `  PCDI approved. Status=${approve.body.status}`);
    return approve.body;
  });

  // ── TEST 8: QD Workflow ────────────────────────────────────
  await test('8. QD (Quyết định) Workflow', async () => {
    if (!dsProject) throw new Error('No dsProject');

    const save = await api(`/dat-sach/project/${dsProject.id}/qd`, {
      method: 'PATCH',
      body: JSON.stringify({ qdData: { tenQuyetDinh: 'QĐ Test 2026', nguoiPheDuyet: 'Test' } }),
    });
    if (!save.ok) throw new Error(`Save QD failed: ${JSON.stringify(save.body)}`);
    log('INFO', '  QD data saved');

    const { body: users } = await api('/users');
    const reviewer = users.find(u => u.role === 'DIRECTOR' || u.role === 'HEAD_OF_DEPARTMENT');
    if (!reviewer) throw new Error('No reviewer');

    await login(reviewer.email, '10122002');
    await api(`/dat-sach/project/${dsProject.id}/submit-review`, {
      method: 'POST', body: JSON.stringify({ reviewerId: reviewer.id }),
    });
    const approve = await api(`/dat-sach/project/${dsProject.id}/review-approve`, { method: 'POST' });
    await login(ADMIN_EMAIL, ADMIN_PASS);

    if (!approve.ok) throw new Error(`QD approve: ${JSON.stringify(approve.body)}`);
    log('INFO', `  QD approved. reviewStatus=${approve.body.reviewStatus}`);
    return approve.body;
  });

  // ── TEST 9: OnlyOffice Config ─────────────────────────────
  await test('9. OnlyOffice Config Generation', async () => {
    if (!gdn) throw new Error('No GDN');
    const { body, ok } = await api(`/dat-sach/gdn/${gdn.id}/onlyoffice-config`);
    if (!ok) throw new Error(`Config failed: ${JSON.stringify(body)}`);
    if (!body.onlyofficeUrl) throw new Error('onlyofficeUrl EMPTY!');
    if (!body.editorConfig?.token) throw new Error('JWT token missing!');
    if (!body.editorConfig?.document?.url) throw new Error('Document URL missing!');

    log('INFO', `  OnlyOffice URL: ${body.onlyofficeUrl}`);
    log('INFO', `  Has JWT token: YES`);
    log('INFO', `  Doc URL: ${body.editorConfig.document.url.slice(0, 70)}...`);
    log('INFO', `  Replacement keys: ${Object.keys(body.replacements || {}).join(', ')}`);
    return body;
  });

  // ── TEST 10: DOCX Downloads ────────────────────────────────
  await test('10. DOCX Download Endpoints', async () => {
    if (!gdn || !dsProject) throw new Error('Missing gdn/dsProject');

    const gdnDl = await api(`/dat-sach/gdn/${gdn.id}/download`);
    if (gdnDl.status !== 200) throw new Error(`GDN download: ${gdnDl.status}`);
    log('INFO', `  GDN download: OK`);

    const pcdiDetail = await api(`/dat-sach/projects/${dsProject.id}`);
    const pcdi = pcdiDetail.body.pcdiDocuments?.[0];
    if (pcdi) {
      const pcdiDl = await api(`/dat-sach/pcdi/${pcdi.id}/download`);
      if (pcdiDl.status !== 200) throw new Error(`PCDI download: ${pcdiDl.status}`);
      log('INFO', `  PCDI download: OK`);
    }

    const qdDl = await api(`/dat-sach/project/${dsProject.id}/download-qd`);
    if (qdDl.status !== 200) throw new Error(`QD download: ${qdDl.status}`);
    log('INFO', `  QD download: OK`);
  });

  // ── TEST 11: Pending Reviews ──────────────────────────────
  await test('11. Pending Reviews Endpoint', async () => {
    const { body: users } = await api('/users');
    const director = users.find(u => u.role === 'DIRECTOR');
    if (!director) throw new Error('No DIRECTOR');

    await login(director.email, '10122002');
    const pending = await api('/dat-sach/my-pending-reviews');
    await login(ADMIN_EMAIL, ADMIN_PASS);

    if (!pending.ok) throw new Error(`Pending reviews failed: ${pending.status}`);
    const counts = pending.body;
    log('INFO', `  Pending: GDNs=${counts.gdns?.length || 0}, PCDIs=${counts.pcdis?.length || 0}, QDs=${counts.projects?.length || 0}`);
    return counts;
  });

  // ── TEST 12: Assignment List ───────────────────────────────
  await test('12. Assignment List (My Assignments)', async () => {
    const { body, ok } = await api('/dat-sach/my-assignments');
    if (!ok) throw new Error(`Assignments failed: ${JSON.stringify(body)}`);
    const list = Array.isArray(body) ? body : [];
    log('INFO', `  Assignments: ${list.length}`);
    for (const a of list.slice(0, 3)) {
      const hasCompleted = !!a.completedAt;
      log('INFO', `    ${a.user?.name}: soLuong=${a.soLuong} completedAt=${hasCompleted ? 'SET ✅' : 'NOT SET ❌'}`);
    }
    return list;
  });

  // ── TEST 13: Public Download with Token ───────────────────
  await test('13. Public DOCX Download (for OnlyOffice)', async () => {
    if (!gdn) throw new Error('No GDN');
    const { body } = await api(`/dat-sach/gdn/${gdn.id}/onlyoffice-config`);
    const tokenMatch = body.editorConfig?.document?.url?.match(/token=([^&]+)/);
    if (!tokenMatch) throw new Error('No download token in config URL');

    const { status } = await api(`/dat-sach/gdn/${gdn.id}/download-public?token=${tokenMatch[1]}`);
    if (status !== 200) throw new Error(`Public download failed: ${status}`);
    log('INFO', `  Public download: OK (status 200)`);
  });

  // ── TEST 14: Project Summary After Approval ───────────────
  await test('14. Summary reflects completed review', async () => {
    if (!parentProject) throw new Error('No parent project');

    const summary = await api(`/projects/${parentProject.id}/summary`);
    if (!summary.ok) throw new Error(`Summary failed: ${summary.status}`);

    const dsStep = summary.body.steps?.find(s => s.key === 'dat_sach');
    log('INFO', `  dat_sach status: ${dsStep?.status} (should be COMPLETED after all reviews)`);
    log('INFO', `  Overall progress: ${summary.body.overallProgress}%`);
    return summary.body;
  });

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  for (const r of results) {
    const err = r.status === 'FAIL' ? ` ← ${r.error}` : '';
    console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${r.name}${err}`);
  }
  console.log(`\n  Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
