#!/usr/bin/env node
/**
 * Document Library API Test Script
 * Tests all endpoints of the Document Library module
 *
 * Usage: node test-document-library.js
 *
 * Prerequisites:
 *   - Backend server running on http://localhost:4000
 *   - Database migrated and seeded
 *   - Default admin: admin@qlda.vn / password123
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

let token = '';
let testResults = [];
let orgId = '';
let libIdCdt = '';
let libIdNt = '';
let fieldId = '';

function log(message, type = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    FAIL: '\x1b[31m',
    WARN: '\x1b[33m',
    HEADER: '\x1b[1;34m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type] || ''}[${type}]${reset} ${message}`);
}

async function login() {
  log('Logging in as admin...', 'INFO');
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@qlda.vn', password: 'password123' }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed: ${err}`);
  }

  const data = await res.json();
  token = data.access_token;
  log(`Login successful. Token: ${token.substring(0, 30)}...`, 'SUCCESS');
  return token;
}

async function apiRequest(method, path, body = null, isAdmin = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  return { status: res.status, ok: res.ok, data: json };
}

function assert(name, condition, details = '') {
  if (condition) {
    testResults.push({ name, pass: true });
    log(`PASS: ${name}${details ? ` (${details})` : ''}`, 'SUCCESS');
  } else {
    testResults.push({ name, pass: false });
    log(`FAIL: ${name}${details ? ` - ${details}` : ''}`, 'FAIL');
  }
}

async function runTests() {
  log('═══════════════════════════════════════════════', 'HEADER');
  log('  Document Library API - Test Suite', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');
  console.log();

  // ── Step 1: Login ──────────────────────────────────────────
  try {
    await login();
  } catch (err) {
    log(`Login failed: ${err.message}`, 'FAIL');
    process.exit(1);
  }

  // ── Step 2: Organization Tests ───────────────────────────────
  log('── Organization Tests ──────────────────────────────────', 'HEADER');

  // GET /organization (should have 2 seeded orgs)
  let res = await apiRequest('GET', '/document-library/organization');
  assert('GET /document-library/organization returns 200', res.status === 200, `Got ${res.status}`);
  assert('Seeded organizations exist (>= 2)', res.data?.length >= 2, `Found ${res.data?.length}`);

  const seededOrgA = res.data?.find(o => o.ten.includes('Chủ đầu tư'));
  const seededOrgB = res.data?.find(o => o.ten.includes('Nhà thầu'));
  orgId = seededOrgA?.id || res.data?.[0]?.id || '';

  assert('Organization A (CDT) exists', !!seededOrgA, seededOrgA?.ten || 'not found');
  assert('Organization B (NT) exists', !!seededOrgB, seededOrgB?.ten || 'not found');

  // GET /organization/:id
  if (orgId) {
    res = await apiRequest('GET', `/document-library/organization/${orgId}`);
    assert('GET /document-library/organization/:id returns 200', res.status === 200, `Got ${res.status}`);
  }

  // POST /organization (create new)
  res = await apiRequest('POST', '/document-library/organization', {
    ten: 'Test Organization',
    moTa: 'Organization created by test script',
  });
  assert('POST /document-library/organization creates organization', res.status === 201, `Got ${res.status}`);
  const testOrgId = res.data?.id || '';

  // PUT /document-library/organization/:id
  if (testOrgId) {
    res = await apiRequest('PUT', `/document-library/organization/${testOrgId}`, {
      ten: 'Test Organization (Updated)',
      moTa: 'Updated by test script',
    });
    assert('PUT /document-library/organization/:id updates organization', res.status === 200, `Got ${res.status}`);
  }

  // ── Step 3: Library Tests ─────────────────────────────────
  log('── Library Tests ────────────────────────────────────────', 'HEADER');

  // GET /document-library/library
  res = await apiRequest('GET', '/document-library/library');
  assert('GET /document-library/library returns 200', res.status === 200, `Got ${res.status}`);
  assert('Libraries exist (>= 4)', res.data?.length >= 4, `Found ${res.data?.length}`);

  // GET by organizationId
  if (orgId) {
    res = await apiRequest('GET', `/document-library/library?organizationId=${orgId}`);
    assert('GET /document-library/library?organizationId= returns 200', res.status === 200, `Got ${res.status}`);
  }

  // POST /document-library/library
  if (testOrgId) {
    res = await apiRequest('POST', '/document-library/library', {
      ten: 'Test Library',
      loai: 'CUSTOM',
      organizationId: testOrgId,
    });
    assert('POST /document-library/library creates library', res.status === 201, `Got ${res.status}`);
  }

  // GET /document-library/library/:id (CDT library)
  const cdtLib = res.data?.loai === 'THONG_TIN_TO_CHUC'
    ? res.data
    : (await apiRequest('GET', '/document-library/library')).data?.find(l => l.loai === 'THONG_TIN_TO_CHUC');

  const cdtLibData = (await apiRequest('GET', '/document-library/library')).data?.find(l => l.loai === 'THONG_TIN_TO_CHUC');
  if (cdtLibData?.id) {
    res = await apiRequest('GET', `/document-library/library/${cdtLibData.id}`);
    assert('GET /document-library/library/:id returns 200', res.status === 200, `Got ${res.status}`);
    libIdCdt = cdtLibData.id;

    // Check seeded fields exist
    const fields = res.data?.fields || [];
    assert('CDT library has >= 9 seeded fields', fields.length >= 9, `Found ${fields.length} fields`);

    // Check savedValues
    const savedValues = res.data?.savedValues || [];
    assert('SavedValues array exists', Array.isArray(savedValues), typeof savedValues);

    // Get a field ID for field CRUD tests
    if (fields.length > 0) fieldId = fields[0].id;
  }

  // ── Step 4: Field Tests ────────────────────────────────────
  log('── Field Tests ──────────────────────────────────────────', 'HEADER');

  if (cdtLibData?.id) {
    // GET /document-library/library/:id/fields
    res = await apiRequest('GET', `/document-library/library/${cdtLibData.id}/fields`);
    assert('GET /document-library/library/:id/fields returns 200', res.status === 200, `Got ${res.status}`);
    assert('Fields array returned', Array.isArray(res.data), typeof res.data);

    // POST /document-library/library/:id/field
    res = await apiRequest('POST', `/document-library/library/${cdtLibData.id}/field`, {
      tenTruong: 'Test Field',
      khoa: `test_field_${Date.now()}`,
      kieuDuLieu: 'TEXT',
      giaTriMacDinh: 'default value',
      batBuoc: false,
      thuTu: 100,
      nhom: 'Test Group',
    });
    assert('POST /document-library/library/:id/field creates field', res.status === 201, `Got ${res.status}`);
    const newFieldId = res.data?.id || '';

    // PUT /document-library/library/:id/field/:fieldId
    if (newFieldId) {
      res = await apiRequest('PUT', `/document-library/library/${cdtLibData.id}/field/${newFieldId}`, {
        tenTruong: 'Test Field (Updated)',
        giaTriMacDinh: 'updated value',
      });
      assert('PUT /document-library/library/:id/field/:fieldId updates field', res.status === 200, `Got ${res.status}`);
    }

    // DELETE /document-library/library/:id/field/:fieldId
    if (newFieldId) {
      res = await apiRequest('DELETE', `/document-library/library/${cdtLibData.id}/field/${newFieldId}`);
      assert('DELETE /document-library/library/:id/field/:fieldId deletes field', res.status === 200, `Got ${res.status}`);
    }

    // Test duplicate key rejection - get fields from the fields endpoint
    const fieldsRes = await apiRequest('GET', `/document-library/library/${cdtLibData.id}/fields`);
    const fields = fieldsRes.data || fieldsRes;
    if (Array.isArray(fields) && fields.length > 0) {
      const existingField = fields[0];
      res = await apiRequest('POST', `/document-library/library/${cdtLibData.id}/field`, {
        tenTruong: 'Duplicate Key Test',
        khoa: existingField.khoa,
        kieuDuLieu: 'TEXT',
      });
      assert('POST with duplicate khoa returns 400', res.status === 400, `Got ${res.status}`);
    }
  }

  // ── Step 5: Saved Value Tests ─────────────────────────────
  log('── Saved Value Tests ─────────────────────────────────────', 'HEADER');

  if (cdtLibData?.id) {
    // POST /document-library/library/:id/value (create saved value)
    const testData = {
      tenGiaTri: `Test Company ${Date.now()}`,
      duLieu: {
        cdt_ten_cong_ty: 'Công ty Test ABC',
        cdt_dia_chi: '123 Đường Test, TP Test',
        cdt_ma_so_thue: '0123456789',
        cdt_so_tai_khoan: '1234567890',
        cdt_ngan_hang: 'Ngân hàng Test',
        cdt_dai_dien: 'Nguyễn Văn Test',
        cdt_chuc_vu: 'Giám đốc',
        cdt_email: 'test@example.com',
        cdt_dien_thoai: '0912345678',
      },
    };

    res = await apiRequest('POST', `/document-library/library/${cdtLibData.id}/value`, testData);
    assert('POST /document-library/library/:id/value creates saved value', res.status === 201, `Got ${res.status}`);
    const savedValueId = res.data?.id || '';

    // GET /document-library/library/:id/value
    res = await apiRequest('GET', `/document-library/library/${cdtLibData.id}/value`);
    assert('GET /document-library/library/:id/value returns values', res.status === 200, `Got ${res.status}`);
    assert('Saved values array returned', Array.isArray(res.data), typeof res.data);

    // PUT /document-library/library/:id/value/:valueId
    if (savedValueId) {
      res = await apiRequest('PUT', `/document-library/library/${cdtLibData.id}/value/${savedValueId}`, {
        tenGiaTri: 'Test Company (Updated)',
        duLieu: { ...testData.duLieu, cdt_ten_cong_ty: 'Công ty Updated' },
      });
      assert('PUT /document-library/library/:id/value/:valueId updates value', res.status === 200, `Got ${res.status}`);
    }

    // DELETE /document-library/library/:id/value/:valueId
    if (savedValueId) {
      res = await apiRequest('DELETE', `/document-library/library/${cdtLibData.id}/value/${savedValueId}`);
      assert('DELETE /document-library/library/:id/value/:valueId deletes value', res.status === 200, `Got ${res.status}`);
    }
  }

  // ── Step 6: Permission Tests ───────────────────────────────
  log('── Permission Tests ─────────────────────────────────────', 'HEADER');

  // Test unauthenticated access
  const savedToken = token;
  token = '';
  res = await apiRequest('GET', '/document-library/organization');
  assert('Unauthenticated GET returns 401', res.status === 401, `Got ${res.status}`);
  token = savedToken;

  // ── Step 7: Delete Test Organization ───────────────────────
  log('── Cleanup ──────────────────────────────────────────────', 'HEADER');

  if (testOrgId) {
    res = await apiRequest('DELETE', `/document-library/organization/${testOrgId}`);
    assert('DELETE /document-library/organization/:id deletes organization', res.status === 200, `Got ${res.status}`);
  }

  // ── Summary ───────────────────────────────────────────────
  log('═══════════════════════════════════════════════', 'HEADER');
  log('  Test Summary', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  const passed = testResults.filter(t => t.pass).length;
  const failed = testResults.filter(t => !t.pass).length;

  for (const result of testResults) {
    if (!result.pass) {
      log(`  FAIL: ${result.name}`, 'FAIL');
    }
  }

  console.log();
  log(`  Total: ${testResults.length}  |  Passed: ${passed}  |  Failed: ${failed}`, 'HEADER');
  console.log();

  if (failed > 0) {
    log(`WARNING: ${failed} test(s) failed. Check the output above.`, 'WARN');
  } else {
    log('All tests passed!', 'SUCCESS');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  log(`Fatal error: ${err.message}`, 'FAIL');
  console.error(err);
  process.exit(1);
});
