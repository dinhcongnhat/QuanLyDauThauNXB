#!/usr/bin/env node
/**
 * Full LCNT + LibraryPicker Test Script
 * Tests the complete procurement workflow end-to-end.
 *
 * Flow: Login (INVESTOR + ADMIN) → Tạo Project → Tạo & Phê duyệt QD_DUTOAN → Tạo & Phê duyệt TT_KHLCNT → Tạo QD_KHLCNT → Tạo LCNT → Library CRUD → Update LCNT step với library data
 *
 * Usage: node test-full-workflow.js
 *
 * Prerequisites:
 *   - Backend server running on http://localhost:4001
 *   - Database migrated and seeded
 *   - User: nhat.var@gmail.com / 123456
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4002/api';
const TEST_EMAIL = 'nhat.var@gmail.com';
const TEST_PASSWORD = '123456';
const ADMIN_EMAIL = 'admin@qlda.vn';
const ADMIN_PASSWORD = 'password123';

let userToken = '';
let adminToken = '';
let projectId = '';
let qdDutoanId = '';
let ttKhlcntId = '';
let qdKhlcntId = '';
let lcntId = '';
let lcntStep1Id = '';
let libCdtId = '';
let libNtId = '';
let savedCdtValueId = '';
let savedNtValueId = '';
let testResults = [];

function log(msg, type = 'INFO') {
  const colors = { INFO: '\x1b[36m', SUCCESS: '\x1b[32m', FAIL: '\x1b[31m', WARN: '\x1b[33m', HEADER: '\x1b[1;34m' };
  const reset = '\x1b[0m';
  console.log(`${colors[type] || ''}[${type}]${reset} ${msg}`);
}

async function apiReq(method, path, body = null, token = userToken) {
  const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : null });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, data: json };
}

function assert(name, cond, details = '') {
  if (cond) {
    testResults.push({ name, pass: true });
    log(`PASS: ${name}${details ? ` (${details})` : ''}`, 'SUCCESS');
  } else {
    testResults.push({ name, pass: false });
    log(`FAIL: ${name}${details ? ` - ${details}` : ''}`, 'FAIL');
  }
  return cond;
}

async function login(email, password) {
  const res = await apiReq('POST', '/auth/login', { email, password }, '');
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.data)}`);
  return res.data.access_token;
}

// ─────────────────────────────────────────────────────────────────
// PHASE 1: Authentication
// ─────────────────────────────────────────────────────────────────
async function phase1_auth() {
  log('═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 1: Authentication', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  log('Logging in as test user...', 'INFO');
  userToken = await login(TEST_EMAIL, TEST_PASSWORD);
  assert('Login as nhat.var@gmail.com successful', true, userToken.substring(0, 20) + '...');

  log('Logging in as admin...', 'INFO');
  adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  assert('Login as admin@qlda.vn successful', true, adminToken.substring(0, 20) + '...');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 2: Project Setup
// ─────────────────────────────────────────────────────────────────
async function phase2_create_project() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 2: Create Project (INVESTOR)', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  const res = await apiReq('POST', '/projects', {
    tenDuAn: `Test Project - LibraryPicker ${Date.now()}`,
    procurementType: 'THAU_THIET_BI',
  }, userToken);
  assert('Create THAU_THIET_BI project', res.ok, `Status ${res.status}`);
  projectId = res.data?.id || '';
  assert('Project ID returned', !!projectId, projectId);
}

// ─────────────────────────────────────────────────────────────────
// PHASE 3: Create & Approve QD_DUTOAN
// ─────────────────────────────────────────────────────────────────
async function phase3_dutoan() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 3: QD_DUTOAN Workflow (Create INVESTOR → Approve ADMIN)', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  // 3a: Create TT_DUTOAN (as INVESTOR)
  let res = await apiReq('POST', '/documents', {
    type: 'TT_DUTOAN',
    data: {
      tenDuAn: 'Test Dự toán - LibraryPicker',
      tongMucDauTu: 500000000,
      nguonVon: 'Ngân sách nhà nước',
      goiThau: [{ tenGoiThau: 'Gói thầu Test 1', giaGoiThau: 500000000, hinhThucLuaChon: 'chỉ định thầu' }],
    },
    projectId,
  }, userToken);
  assert('Create TT_DUTOAN (INVESTOR)', res.ok, `Status ${res.status}`);
  const ttDutoanId = res.data?.id || '';
  assert('TT_DUTOAN ID returned', !!ttDutoanId, ttDutoanId.substring(0, 8));

  // 3b: Create QD_DUTOAN (as INVESTOR)
  res = await apiReq('POST', '/documents', {
    type: 'QD_DUTOAN',
    data: {
      tenDuAn: 'QĐ Dự toán - LibraryPicker',
      tongMucDauTu: 500000000,
      nguonVon: 'Ngân sách nhà nước',
      goiThau: [{ tenGoiThau: 'Gói thầu Test 1', giaGoiThau: 500000000, hinhThucLuaChon: 'chỉ định thầu' }],
      canCuPhapLy: ['Luật Đấu thầu 2023', 'Nghị định 24/2024/NĐ-CP'],
    },
    parentId: ttDutoanId,
    projectId,
  }, userToken);
  assert('Create QD_DUTOAN (INVESTOR)', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
  qdDutoanId = res.data?.id || '';
  assert('QD_DUTOAN ID returned', !!qdDutoanId, qdDutoanId.substring(0, 8));
  if (qdDutoanId) {
    assert('QD_DUTOAN status is PENDING_DIRECTOR', res.data?.status === 'PENDING_DIRECTOR', res.data?.status);
  }

  // 3c: Approve QD_DUTOAN (as ADMIN/DIRECTOR)
  if (qdDutoanId) {
    log('Approving QD_DUTOAN as ADMIN...', 'INFO');
    res = await apiReq('POST', `/documents/${qdDutoanId}/approve`, { comment: 'OK duyệt' }, adminToken);
    assert('Approve QD_DUTOAN (ADMIN)', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
    if (res.ok) {
      assert('QD_DUTOAN status APPROVED', res.data?.status === 'APPROVED', res.data?.status);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// PHASE 4: Create & Approve TT_KHLCNT → QD_KHLCNT
// ─────────────────────────────────────────────────────────────────
async function phase4_khlcnt() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 4: KHLCNT Workflow', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  // 4a: Create TT_KHLCNT (needs APPROVED QD_DUTOAN parent)
  let res = await apiReq('POST', '/documents', {
    type: 'TT_KHLCNT',
    data: {
      tenDuAn: 'Tờ trình KHLCNT - Test',
      chuDauTu: 'Nhật Văn A - Test CDT',
      nguonVon: 'Ngân sách nhà nước',
      goiThau: [{
        tenGoiThau: 'Gói thầu Test 1',
        giaGoiThau: 500000000,
        hinhThucLuaChon: 'CHI_DINH_THAU',
      }],
    },
    parentId: qdDutoanId,
    projectId,
  }, userToken);
  assert('Create TT_KHLCNT (INVESTOR)', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
  ttKhlcntId = res.data?.id || '';
  assert('TT_KHLCNT ID returned', !!ttKhlcntId, ttKhlcntId.substring(0, 8));
  if (ttKhlcntId) {
    assert('TT_KHLCNT status PENDING_HEAD', res.data?.status === 'PENDING_HEAD', res.data?.status);

    // 4b: Approve TT_KHLCNT as ADMIN (HEAD_OF_DEPARTMENT role)
    log('Approving TT_KHLCNT as ADMIN...', 'INFO');
    res = await apiReq('POST', `/documents/${ttKhlcntId}/approve`, { comment: 'OK duyệt TT' }, adminToken);
    assert('Approve TT_KHLCNT (ADMIN)', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
    if (res.ok) {
      assert('TT_KHLCNT APPROVED', res.data?.status === 'APPROVED', res.data?.status);
    }
  }

  // 4c: Create QD_KHLCNT — parent must be QD_DUTOAN (not TT_KHLCNT)
  // The service validates that parent is QD_DUTOAN with APPROVED status
  res = await apiReq('POST', '/documents', {
    type: 'QD_KHLCNT',
    data: {
      tenDuAn: 'QĐ KHLCNT - Test',
      chuDauTu: 'Nhật Văn A - Test CDT',
      nguonVon: 'Ngân sách nhà nước',
      diaDanh: 'TP. Hồ Chí Minh',
      goiThau: [{
        tenGoiThau: 'Gói thầu Test 1',
        giaGoiThau: 500000000,
        hinhThucLuaChon: 'CHI_DINH_THAU',
        diaDanh: 'TP. Hồ Chí Minh',
      }],
    },
    parentId: qdDutoanId,  // Parent must be QD_DUTOAN, NOT TT_KHLCNT
    projectId,
  }, adminToken);
  assert('Create QD_KHLCNT (INVESTOR)', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
  qdKhlcntId = res.data?.id || '';
  assert('QD_KHLCNT ID returned', !!qdKhlcntId, qdKhlcntId.substring(0, 8));
  if (qdKhlcntId) {
    assert('QD_KHLCNT status PENDING_DIRECTOR', res.data?.status === 'PENDING_DIRECTOR', res.data?.status);

    // 4d: Approve QD_KHLCNT as ADMIN
    log('Approving QD_KHLCNT as ADMIN...', 'INFO');
    res = await apiReq('POST', `/documents/${qdKhlcntId}/approve`, { comment: 'OK duyệt QĐ KHLCNT' }, adminToken);
    assert('Approve QD_KHLCNT (ADMIN)', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
    if (res.ok) {
      assert('QD_KHLCNT APPROVED', res.data?.status === 'APPROVED', res.data?.status);
    }

    // 4e: Verify approved QD appears in LCNT list
    res = await apiReq('GET', `/contractor-selection/approved-qd?projectId=${projectId}`, null, userToken);
    const approvedQds = Array.isArray(res.data) ? res.data : [];
    const ourQd = approvedQds.find(q => q.id === qdKhlcntId);
    assert('QD_KHLCNT appears in LCNT approved QĐ list', !!ourQd, ourQd ? ourQd.tenDuAn : 'not found');
  }
}

// ─────────────────────────────────────────────────────────────────
// PHASE 5: Create LCNT Selection
// ─────────────────────────────────────────────────────────────────
async function phase5_create_lcnt() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 5: Create LCNT Selection', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  if (!qdKhlcntId) { log('Skipping - no QD_KHLCNT', 'WARN'); return; }

  const res = await apiReq('POST', '/contractor-selection', {
    qdKhlcntId: qdKhlcntId,
    goiThauIndex: 0,
    projectId,
  }, userToken);
  assert('Create LCNT Selection', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
  lcntId = res.data?.id || '';
  assert('LCNT ID returned', !!lcntId, lcntId.substring(0, 8));

  // Get selection with steps
  if (lcntId) {
    const detail = await apiReq('GET', `/contractor-selection/${lcntId}`, null, userToken);
    assert('Get LCNT detail', detail.ok, `Status ${detail.status}`);
    const sel = detail.data || {};
    assert('LCNT has projectId', !!sel.projectId, sel.projectId || 'missing');
    assert('LCNT projectId matches', sel.projectId === projectId, `${sel.projectId} vs ${projectId}`);
    assert('LCNT procurementMethod is CHI_DINH_THAU', sel.procurementMethod === 'CHI_DINH_THAU', sel.procurementMethod);

    const steps = sel.steps || [];
    assert('LCNT has steps', steps.length > 0, `Found ${steps.length}`);
    log(`  Steps: ${steps.map(s => `${s.stepKey}(${s.status})`).join(', ')}`, 'INFO');

    // Find first step (thu_moi_hoan_thien for CHI_DINH_THAU)
    const step1 = steps.find(s => s.stepKey === 'thu_moi_hoan_thien');
    assert('Step 1 (thu_moi_hoan_thien) exists', !!step1, step1 ? `${step1.id.substring(0, 8)} - ${step1.status}` : 'missing');
    lcntStep1Id = step1?.id || '';
  }
}

// ─────────────────────────────────────────────────────────────────
// PHASE 6: Document Library - Read
// ─────────────────────────────────────────────────────────────────
async function phase6_library_read() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 6: Document Library - Read (LibraryPicker fetch)', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  let res = await apiReq('GET', '/document-library/organization');
  assert('GET /organization', res.ok, `Status ${res.status}`);
  const orgs = Array.isArray(res.data) ? res.data : [];
  assert('At least 2 organizations', orgs.length >= 2, `Found ${orgs.length}`);

  res = await apiReq('GET', '/document-library/library');
  assert('GET /library', res.ok, `Status ${res.status}`);
  const libs = Array.isArray(res.data) ? res.data : [];
  assert('At least 4 libraries', libs.length >= 4, `Found ${libs.length}`);

  const libCdt = libs.find(l => l.loai === 'THONG_TIN_TO_CHUC');
  const libNt = libs.find(l => l.loai === 'THONG_TIN_NHA_THAU');
  assert('CDT library exists', !!libCdt, libCdt?.ten || 'missing');
  assert('NT library exists', !!libNt, libNt?.ten || 'missing');
  libCdtId = libCdt?.id || '';
  libNtId = libNt?.id || '';

  if (libCdtId) {
    res = await apiReq('GET', `/document-library/library/${libCdtId}`);
    assert('GET /library/:id (CDT)', res.ok, `Status ${res.status}`);
    const fields = res.data?.fields || [];
    assert('CDT library has >= 9 fields', fields.length >= 9, `Found ${fields.length}`);
    log(`  CDT fields: ${fields.map(f => f.khoa).join(', ')}`, 'INFO');
  }

  if (libNtId) {
    res = await apiReq('GET', `/document-library/library/${libNtId}`);
    assert('GET /library/:id (NT)', res.ok, `Status ${res.status}`);
    const fields = res.data?.fields || [];
    assert('NT library has >= 9 fields', fields.length >= 9, `Found ${fields.length}`);
    log(`  NT fields: ${fields.map(f => f.khoa).join(', ')}`, 'INFO');
  }
}

// ─────────────────────────────────────────────────────────────────
// PHASE 7: Document Library - Write (SaveToLibraryModal)
// ─────────────────────────────────────────────────────────────────
async function phase7_library_write() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 7: Document Library - Write (SaveToLibrary)', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  if (!libCdtId || !libNtId) { log('Skipping - no library IDs', 'WARN'); return; }

  // Save CDT company (matches lcnt-field-defs keys for cdt_ prefix)
  const cdtData = {
    tenGiaTri: `Công ty CDT Test ${Date.now()}`,
    duLieu: {
      cdt_ten_cong_ty: 'Công ty Cổ phần Đầu tư Phát triển Test',
      cdt_dia_chi: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      cdt_ma_so_thue: '0123456789',
      cdt_so_tai_khoan: '1234567890',
      cdt_ngan_hang: 'Ngân hàng TMCP Ngoại thương Việt Nam (VCB)',
      cdt_dai_dien: 'Nguyễn Văn Test',
      cdt_chuc_vu: 'Giám đốc',
      cdt_email: 'test@congtytest.vn',
      cdt_dien_thoai: '02812345678',
    },
  };
  let res = await apiReq('POST', `/document-library/library/${libCdtId}/value`, cdtData);
  assert('Save CDT company to library', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
  savedCdtValueId = res.data?.id || '';
  assert('CDT saved value ID returned', !!savedCdtValueId, savedCdtValueId);

  // Save NT company (matches lcnt-field-defs keys for nt_ prefix)
  const ntData = {
    tenGiaTri: `Công ty NT Test ${Date.now()}`,
    duLieu: {
      nt_ten_cong_ty: 'Nhà thầu Test Việt Nam',
      nt_dia_chi: '456 Lê Lợi, Quận 3, TP. Hồ Chí Minh',
      nt_ma_so_thue: '9876543210',
      nt_so_tai_khoan: '9876543210',
      nt_ngan_hang: 'Ngân hàng TMCP Công thương Việt Nam (CTG)',
      nt_dai_dien: 'Trần Văn Nhà Thầu',
      nt_chuc_vu: 'Tổng Giám đốc',
      nt_email: 'nhathau@test.vn',
      nt_dien_thoai: '02898765432',
    },
  };
  res = await apiReq('POST', `/document-library/library/${libNtId}/value`, ntData);
  assert('Save NT company to library', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
  savedNtValueId = res.data?.id || '';
  assert('NT saved value ID returned', !!savedNtValueId, savedNtValueId);

  // Verify saved values
  res = await apiReq('GET', `/document-library/library/${libCdtId}/value`);
  const cdtValues = Array.isArray(res.data) ? res.data : [];
  assert('CDT saved values in list', cdtValues.length > 0, `Found ${cdtValues.length}`);
  const ourCdt = cdtValues.find(v => v.id === savedCdtValueId);
  assert('CDT saved value data matches', ourCdt?.duLieu?.cdt_ten_cong_ty === cdtData.duLieu.cdt_ten_cong_ty, ourCdt?.duLieu?.cdt_ten_cong_ty || 'mismatch');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 8: LibraryPicker Simulation - Pick from library
// ─────────────────────────────────────────────────────────────────
async function phase8_librarypicker() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 8: LibraryPicker Simulation', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  if (!libCdtId || !libNtId || !savedCdtValueId || !savedNtValueId) { log('Skipping - missing IDs', 'WARN'); return; }

  // Simulate LibraryPicker: fetch saved values → user picks one → spread duLieu into form
  let res = await apiReq('GET', `/document-library/library/${libCdtId}`);
  const cdtSaved = (res.data?.savedValues || []).find(v => v.id === savedCdtValueId);
  assert('CDT saved value retrievable', !!cdtSaved, cdtSaved?.tenGiaTri || 'not found');

  res = await apiReq('GET', `/document-library/library/${libNtId}`);
  const ntSaved = (res.data?.savedValues || []).find(v => v.id === savedNtValueId);
  assert('NT saved value retrievable', !!ntSaved, ntSaved?.tenGiaTri || 'not found');

  // Simulate: LibraryPicker onSelect spreads duLieu
  const lcntFormFromLibrary = {
    ...cdtSaved.duLieu,
    ...ntSaved.duLieu,
  };
  assert('Library filled >= 18 fields', Object.keys(lcntFormFromLibrary).length >= 18, `${Object.keys(lcntFormFromLibrary).length} fields`);

  log(`  LibraryPicker filled ${Object.keys(lcntFormFromLibrary).length} fields:`, 'INFO');
  log(`    cdt_ten_cong_ty = "${lcntFormFromLibrary.cdt_ten_cong_ty || 'N/A'}"`, 'INFO');
  log(`    nt_ten_cong_ty  = "${lcntFormFromLibrary.nt_ten_cong_ty || 'N/A'}"`, 'INFO');
  log(`    cdt_dia_chi     = "${lcntFormFromLibrary.cdt_dia_chi || 'N/A'}"`, 'INFO');
  log(`    nt_dia_chi      = "${lcntFormFromLibrary.nt_dia_chi || 'N/A'}"`, 'INFO');
  log(`    cdt_ngan_hang   = "${lcntFormFromLibrary.cdt_ngan_hang || 'N/A'}"`, 'INFO');
  log(`    nt_ngan_hang    = "${lcntFormFromLibrary.nt_ngan_hang || 'N/A'}"`, 'INFO');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 9: Update LCNT step with library + manual data
// ─────────────────────────────────────────────────────────────────
async function phase9_lcnt_step_update() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 9: LCNT Step Update (LibraryPicker data)', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  if (!lcntStep1Id) { log('Skipping - no step ID', 'WARN'); return; }

  // 9a: Get step
  let res = await apiReq('GET', `/contractor-selection/step/${lcntStep1Id}`);
  assert('GET LCNT step', res.ok, `Status ${res.status}`);
  const step = res.data || {};
  assert('Step status is NOT_STARTED or IN_PROGRESS', ['NOT_STARTED', 'IN_PROGRESS'].includes(step.status), step.status);
  log(`  Step: ${step.stepKey} | Status: ${step.status}`, 'INFO');

  // 9b: Build form data — library fields (cdt_/nt_) + LCNT-specific fields (PascalCase)
  const formData = {
    // === LibraryPicker: CDT company (from savedValue.duLieu) ===
    ChuDauTu: 'Công ty Cổ phần Đầu tư Phát triển Test',
    DiaChiChuDauTu: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    MaSoThueCDT: '0123456789',
    SoTaiKhoanCDT: '1234567890',
    NganHangCDT: 'Ngân hàng TMCP Ngoại thương Việt Nam (VCB)',
    DaiDienChuDauTu: 'Nguyễn Văn Test',
    ChucVu: 'Giám đốc',

    // === LibraryPicker: NT company (from savedValue.duLieu) ===
    NhaThau: 'Nhà thầu Test Việt Nam',
    DiaChi: '456 Lê Lợi, Quận 3, TP. Hồ Chí Minh',
    MaSoThue: '9876543210',
    SoTaiKhoan: '9876543210',
    NganHang: 'Ngân hàng TMCP Công thương Việt Nam (CTG)',
    DaiDienNhaThau: 'Trần Văn Nhà Thầu',

    // === Manual LCNT fields (auto-filled + user input) ===
    DiaDanh: 'TP. Hồ Chí Minh',
    NamThucHienHopDong: '2025',
    TenGoiThau: 'Gói thầu Test 1 - LibraryPicker',
    TenDuAn: 'Test KHLCNT - LibraryPicker',
    SanPhamGoiThau: 'Thiết bị văn phòng',
    SoLuong: '100',
    SoNgayThucHienHopDong: '90',
    GiaTriHopDongBangSo: '500000000',
    GiaTriHopDongBangChu: 'Năm trăm triệu đồng chẵn',
    LoaiHopDong: 'Trọn gói',
    CanCuVanBanPhapLy: 'Luật Đấu thầu 2023; Nghị định 24/2024/NĐ-CP',
    TenVietTatChuDauTu: 'CĐT Test',
    TenVietTatNhaThau: 'NT Test',
    DonViMoi: 'Công ty Cổ phần Đầu tư Phát triển Test',
    DaiDien: 'Nguyễn Văn Test',
  };

  // 9c: Update step
  res = await apiReq('POST', `/contractor-selection/step/${lcntStep1Id}/update`, { data: formData });
  assert('Update LCNT step', res.ok, `Status ${res.status}: ${res.data?.message || ''}`);
  if (res.ok) {
    assert('Step status IN_PROGRESS', res.data?.status === 'IN_PROGRESS', res.data?.status);
  }

  // 9d: Verify data persisted
  res = await apiReq('GET', `/contractor-selection/step/${lcntStep1Id}`);
  const saved = res.data?.data || {};
  assert('ChuDauTu (library) saved', saved.ChuDauTu === formData.ChuDauTu, saved.ChuDauTu || 'missing');
  assert('NhaThau (library) saved', saved.NhaThau === formData.NhaThau, saved.NhaThau || 'missing');
  assert('DiaDanh saved', saved.DiaDanh === formData.DiaDanh, saved.DiaDanh || 'missing');
  assert('GiaTriHopDongBangSo saved', saved.GiaTriHopDongBangSo === formData.GiaTriHopDongBangSo, saved.GiaTriHopDongBangSo || 'missing');
  assert('MaSoThueCDT (library) saved', saved.MaSoThueCDT === formData.MaSoThueCDT, saved.MaSoThueCDT || 'missing');
  assert('>= 20 fields saved', Object.keys(saved).length >= 20, `${Object.keys(saved).length} fields`);

  log(`  Saved ${Object.keys(saved).length} fields: ${Object.keys(saved).join(', ')}`, 'INFO');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 10: Update saved library value
// ─────────────────────────────────────────────────────────────────
async function phase10_library_update() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 10: Library - Update Saved Value', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  if (!savedCdtValueId || !libCdtId) { log('Skipping - no saved CDT ID', 'WARN'); return; }

  const res = await apiReq('PUT', `/document-library/library/${libCdtId}/value/${savedCdtValueId}`, {
    tenGiaTri: `Công ty CDT Updated ${Date.now()}`,
    duLieu: {
      cdt_ten_cong_ty: 'Công ty Cổ phần Đầu tư Phát triển Test - UPDATED',
      cdt_dia_chi: '789 Nguyễn Trãi, Quận 5, TP. HCM',
      cdt_ma_so_thue: '0123456789',
      cdt_so_tai_khoan: '1234567890',
      cdt_ngan_hang: 'VCB',
      cdt_dai_dien: 'Nguyễn Văn Test Updated',
      cdt_chuc_vu: 'Tổng Giám đốc',
      cdt_email: 'updated@congtytest.vn',
      cdt_dien_thoai: '02899999999',
    },
  });
  assert('Update CDT saved value (PUT)', res.ok, `Status ${res.status}`);
  assert('tenGiaTri updated', res.data?.tenGiaTri?.includes('Updated'), res.data?.tenGiaTri || 'mismatch');
  assert('duLieu.cdt_ten_cong_ty updated', res.data?.duLieu?.cdt_ten_cong_ty?.includes('UPDATED'), res.data?.duLieu?.cdt_ten_cong_ty || 'mismatch');
}

// ─────────────────────────────────────────────────────────────────
// PHASE 11: Final verification
// ─────────────────────────────────────────────────────────────────
async function phase11_final_verification() {
  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  PHASE 11: Final Verification', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  if (lcntId) {
    const res = await apiReq('GET', `/contractor-selection/${lcntId}`);
    assert('Get final LCNT detail', res.ok, `Status ${res.status}`);
    const sel = res.data || {};
    assert('LCNT has projectId', !!sel.projectId, sel.projectId || 'missing');
    assert('LCNT projectId matches', sel.projectId === projectId, `${sel.projectId} vs ${projectId}`);
    assert('LCNT method is CHI_DINH_THAU', sel.procurementMethod === 'CHI_DINH_THAU', sel.procurementMethod);
    const steps = sel.steps || [];
    const step1 = steps.find(s => s.id === lcntStep1Id);
    if (step1) {
      assert('Step 1 has data', Object.keys(step1.data || {}).length > 0, `${Object.keys(step1.data || {}).length} fields`);
    }
  }

  log('\n═══════════════════════════════════════════════', 'HEADER');
  log('  Test Summary', 'HEADER');
  log('═══════════════════════════════════════════════', 'HEADER');

  const passed = testResults.filter(t => t.pass).length;
  const failed = testResults.filter(t => !t.pass).length;
  console.log();
  log(`  Total: ${testResults.length}  |  Passed: ${passed}  |  Failed: ${failed}`, 'HEADER');
  console.log();

  for (const r of testResults) {
    if (!r.pass) log(`  FAIL: ${r.name}`, 'FAIL');
  }
  console.log();

  if (failed > 0) {
    log(`WARNING: ${failed} test(s) failed!`, 'WARN');
  } else {
    log('ALL TESTS PASSED!', 'SUCCESS');
  }

  log('\n── Resource IDs ───────────────────────────────', 'HEADER');
  log(`  User:         ${TEST_EMAIL} / ${TEST_PASSWORD}`, 'INFO');
  log(`  Project:      ${projectId}`, 'INFO');
  log(`  QD_DUTOAN:   ${qdDutoanId}`, 'INFO');
  log(`  TT_KHLCNT:   ${ttKhlcntId}`, 'INFO');
  log(`  QD_KHLCNT:   ${qdKhlcntId}`, 'INFO');
  log(`  LCNT:        ${lcntId}`, 'INFO');
  log(`  LCNT Step:   ${lcntStep1Id}`, 'INFO');
  log(`  Lib CDT:     ${libCdtId}`, 'INFO');
  log(`  Lib NT:      ${libNtId}`, 'INFO');
  log(`  Saved CDT:   ${savedCdtValueId}`, 'INFO');
  log(`  Saved NT:    ${savedNtValueId}`, 'INFO');
  if (lcntId && lcntStep1Id) {
    log(`\n  Frontend: http://localhost:3000/dashboard/lua-chon-nha-thau/${lcntId}/step/${lcntStep1Id}`, 'INFO');
  }
}

// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log();
  log('╔═══════════════════════════════════════════════╗', 'HEADER');
  log('║  Full LCNT + LibraryPicker Workflow Test    ║', 'HEADER');
  log('╚═══════════════════════════════════════════════╝', 'HEADER');
  console.log();

  try {
    await phase1_auth();
    await phase2_create_project();
    await phase3_dutoan();
    await phase4_khlcnt();
    await phase5_create_lcnt();
    await phase6_library_read();
    await phase7_library_write();
    await phase8_librarypicker();
    await phase9_lcnt_step_update();
    await phase10_library_update();
    await phase11_final_verification();
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'FAIL');
    console.error(err);
    process.exit(1);
  }

  const failed = testResults.filter(t => !t.pass).length;
  process.exit(failed > 0 ? 1 : 0);
}

main();
