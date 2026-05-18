#!/usr/bin/env node
/**
 * Document Library - Seed Verification Script
 * Verifies that the seed data was created correctly
 *
 * Usage: node verify-seed.js
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@qlda.vn', password: 'password123' }),
  });
  const data = await res.json();
  return data.access_token;
}

async function apiRequest(method, path, body = null, token) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  return res.json();
}

function assert(name, condition, details = '') {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    return 1;
  } else {
    console.log(`  [FAIL] ${name}${details ? ` - ${details}` : ''}`);
    return 0;
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Document Library - Seed Verification');
  console.log('═══════════════════════════════════════════════');
  console.log();

  let passCount = 0;
  let totalCount = 0;

  try {
    const token = await login();
    console.log('[INFO] Logged in as admin\n');

    // ── Step 1: Check Organizations ───────────────────────────
    console.log('── Organizations ─────────────────────────────────');

    const orgs = await apiRequest('GET', '/document-library/organization', null, token);
    totalCount++;
    passCount += assert('2 organizations exist', orgs.length >= 2, `Found ${orgs.length}`);

    const orgA = orgs.find(o => o.ten.includes('Chủ đầu tư'));
    const orgB = orgs.find(o => o.ten.includes('Nhà thầu'));

    totalCount++;
    passCount += assert('Organization A (CDT) exists', !!orgA, orgA?.ten || 'not found');
    totalCount++;
    passCount += assert('Organization B (NT) exists', !!orgB, orgB?.ten || 'not found');

    // ── Step 2: Check Libraries ─────────────────────────────
    console.log('\n── Libraries ─────────────────────────────────────');

    const libs = await apiRequest('GET', '/document-library/library', null, token);

    totalCount++;
    passCount += assert('4 libraries exist (2 CDT org + 2 NT org)', libs.length >= 4, `Found ${libs.length}`);

    const libCdt = libs.find(l => l.loai === 'THONG_TIN_TO_CHUC');
    const libNt = libs.find(l => l.loai === 'THONG_TIN_NHA_THAU');
    const libKyCdt = libs.find(l => l.loai === 'KY_TUONG' && l.ten.includes('CDT'));
    const libKyNt = libs.find(l => l.loai === 'KY_TUONG' && l.ten.includes('NT'));

    totalCount++;
    passCount += assert('"Thông tin Chủ đầu tư" library exists', !!libCdt);
    totalCount++;
    passCount += assert('"Thông tin Nhà thầu" library exists', !!libNt);
    totalCount++;
    passCount += assert('"Thông tin người ký CDT" library exists', !!libKyCdt);
    totalCount++;
    passCount += assert('"Thông tin người ký NT" library exists', !!libKyNt);

    // ── Step 3: Check Fields ──────────────────────────────
    console.log('\n── Library Fields ────────────────────────────────');

    if (libCdt) {
      const cdtLibDetail = await apiRequest('GET', `/document-library/library/${libCdt.id}`, null, token);
      const cdtFields = cdtLibDetail.fields || [];
      const expectedCdtFields = ['cdt_ten_cong_ty', 'cdt_dia_chi', 'cdt_ma_so_thue', 'cdt_so_tai_khoan', 'cdt_ngan_hang', 'cdt_dai_dien', 'cdt_chuc_vu', 'cdt_email', 'cdt_dien_thoai'];

      totalCount++;
      passCount += assert(`CDT library has ${expectedCdtFields.length} fields`, cdtFields.length >= expectedCdtFields.length, `Found ${cdtFields.length}`);

      for (const key of expectedCdtFields) {
        const field = cdtFields.find(f => f.khoa === key);
        totalCount++;
        passCount += assert(`  Field "${key}" exists`, !!field, field ? `(${field.tenTruong})` : 'missing');
      }
    }

    if (libNt) {
      const ntLibDetail = await apiRequest('GET', `/document-library/library/${libNt.id}`, null, token);
      const ntFields = ntLibDetail.fields || [];
      const expectedNtFields = ['nt_ten_cong_ty', 'nt_dia_chi', 'nt_ma_so_thue', 'nt_so_tai_khoan', 'nt_ngan_hang', 'nt_dai_dien', 'nt_chuc_vu', 'nt_email', 'nt_dien_thoai'];

      totalCount++;
      passCount += assert(`NT library has ${expectedNtFields.length} fields`, ntFields.length >= expectedNtFields.length, `Found ${ntFields.length}`);

      for (const key of expectedNtFields) {
        const field = ntFields.find(f => f.khoa === key);
        totalCount++;
        passCount += assert(`  Field "${key}" exists`, !!field, field ? `(${field.tenTruong})` : 'missing');
      }
    }

    if (libKyCdt) {
      const kyCdtDetail = await apiRequest('GET', `/document-library/library/${libKyCdt.id}`, null, token);
      const kyFields = kyCdtDetail.fields || [];
      totalCount++;
      passCount += assert('KY_CDT library has 2 fields', kyFields.length >= 2, `Found ${kyFields.length}`);
    }

    if (libKyNt) {
      const kyNtDetail = await apiRequest('GET', `/document-library/library/${libKyNt.id}`, null, token);
      const kyFields = kyNtDetail.fields || [];
      totalCount++;
      passCount += assert('KY_NT library has 2 fields', kyFields.length >= 2, `Found ${kyFields.length}`);
    }

    // ── Summary ─────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════');
    console.log(`  Result: ${passCount}/${totalCount} checks passed`);
    console.log('═══════════════════════════════════════════════');

    if (passCount === totalCount) {
      console.log('  [OK] All seed data verified!');
      process.exit(0);
    } else {
      console.log(`  [WARN] ${totalCount - passCount} checks failed.`);
      process.exit(1);
    }

  } catch (err) {
    console.error('[ERROR]', err.message);
    console.error('Make sure the backend server is running on', BASE_URL);
    process.exit(1);
  }
}

run();
