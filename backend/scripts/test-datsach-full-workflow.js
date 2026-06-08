#!/usr/bin/env node
/**
 * Full DatSach Workflow Test
 * Tests: login → create project → create GDN → create PCDI → create QĐ → download all DOCX
 */
const API_BASE = 'http://localhost/api';

async function api(path, options = {}, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method || 'GET'} ${path} failed ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

async function apiBlob(path, options = {}, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${res.status}`);
  return res.arrayBuffer();
}

function extractDocxText(arrayBuffer) {
  try {
const AdmZip = require('/home/pcloud/qlda/backend/node_modules/adm-zip');
    const zip = new AdmZip(Buffer.from(arrayBuffer));
    const entry = zip.getEntry('word/document.xml');
    if (!entry) return null;
    const xml = entry.getData().toString('utf8');
    // Extract text between <w:t> tags
    const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    return matches.map(m => m.replace(/<w:t[^>]*>/, '').replace('</w:t>', '')).join(' ');
  } catch (e) {
    return null;
  }
}

function checkPlaceholders(text, replacements, templateName) {
  const results = { filled: [], blank: [] };
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`;
    if (text.includes(placeholder) || text.includes(`{{ ${key} }}`)) {
      results.blank.push(key);
    } else {
      results.filled.push(key);
    }
  }
  return results;
}

async function main() {
  console.log('='.repeat(70));
  console.log('FULL DAT-SACH WORKFLOW TEST');
  console.log('='.repeat(70));

  // 1. Login as admin
  console.log('\n[1/8] Login as admin...');
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@qlda.vn', password: 'admin123' }),
  });
  const token = loginRes.access_token;
  console.log(`  OK - Token: ${token.substring(0, 20)}...`);

  // 2. Get admin user info
  console.log('\n[2/8] Get user info...');
  const me = await api('/auth/profile', {}, token);
  console.log(`  OK - User: ${me.username} (${me.role})`);
  const userId = me.userId || me.id;

  // 3. Create DatSach project
  console.log('\n[3/8] Create DatSach project...');
  const projectRes = await api('/dat-sach/projects', {
    method: 'POST',
    body: JSON.stringify({ tenDuAn: 'TEST_DATSACH_WORKFLOW_2026', namKeHoach: 2026 }),
  }, token);
  const projectId = projectRes.id;
  console.log(`  OK - Project ID: ${projectId}`);

  // 4. Create GDN
  console.log('\n[4/8] Create GDN entry...');
  const now = new Date();
  const gdnData = {
    ngay: String(now.getDate()),
    thang: String(now.getMonth() + 1),
    nam: String(now.getFullYear()),
    tenSach: 'Lịch Sử Đảng Cộng Sản Việt Nam',
    tacGia: 'PGS.TS. Nguyễn Văn A',
    bbt: 'Hội đồng Biên tập NXB Chính trị Quốc gia',
    namXB: '2025',
    soTrang: '864',
    khoSach: '16x24cm',
    giaBia: '120.000 VNĐ',
    soLuongTon: 0,
    slDeNghiIn: 5000,
    thoiGianCanSach: '30 ngày',
    deNghiNoiIn: 'Nhà in NXB Chính trị Quốc gia Sự thật',
    ghiChu: 'Sách giáo khoa chính trị - phục vụ giảng dạy',
    vuKHTKBT: 'Vụ KH-TKBT',
    banBienTap: 'Ban Biên tập',
  };
  const gdnRes = await api('/dat-sach/gdn', {
    method: 'POST',
    body: JSON.stringify({ projectId, data: gdnData }),
  }, token);
  const gdnId = gdnRes.id;
  console.log(`  OK - GDN ID: ${gdnId}`);

  // 5. Assign user and fill SL
  console.log('\n[5/8] Assign user and fill quantity...');
  const usersRes = await api('/users', {}, token);
  if (usersRes.users && usersRes.users.length > 0) {
    const targetUser = usersRes.users[0];
    const userIdToAssign = targetUser.id || targetUser.userId;
    console.log(`  Assigning user: ${targetUser.username || targetUser.email}`);

    await api(`/dat-sach/gdn/${gdnId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userIds: [userIdToAssign] }),
    }, token);

    await api(`/dat-sach/gdn/${gdnId}/fill-sl`, {
      method: 'PATCH',
      body: JSON.stringify({ soLuong: 5000 }),
    }, token);
    console.log('  OK - User assigned and quantity filled (5000)');
  } else {
    console.log('  SKIP - No users found to assign');
  }

  // 6. Approve GDN
  console.log('\n[6/8] Approve GDN...');
  await api(`/dat-sach/gdn/${gdnId}/approve`, { method: 'POST' }, token);
  console.log('  OK - GDN approved');

  // 7. Create PCDI
  console.log('\n[7/8] Create PCDI entry...');
  const pcdiData = {
    ngay: String(now.getDate()),
    thang: String(now.getMonth() + 1),
    nam: String(now.getFullYear()),
    bbt: 'Hội đồng Biên tập NXB CTQG ST',
    phuongThuc: 'In offset',
    tenSach: 'Lịch Sử Đảng Cộng Sản Việt Nam',
    tacGia: 'PGS.TS. Nguyễn Văn A',
    soTrang: '864',
    khoSach: '16x24cm',
    soLuongIn: 5000,
    giaTriHopDong: '750.000.000 VNĐ',
    coSoIn: 'Nhà in NXB Chính trị Quốc gia Sự thật',
    thongSoKyThuat: 'Khổ 16x24cm, 864 trang, bìa 4 màu, ruột 2 màu',
  };
  const pcdiRes = await api(`/dat-sach/pcdi`, {
    method: 'POST',
    body: JSON.stringify({ projectId, data: pcdiData }),
  }, token);
  const pcdiId = pcdiRes.id;
  console.log(`  OK - PCDI ID: ${pcdiId}`);

  // 8. Create QĐ (save QĐ data on project)
  console.log('\n[8/8] Create QĐ entry...');
  const qdData = {
    ngay: String(now.getDate()),
    thang: String(now.getMonth() + 1),
    nam: String(now.getFullYear()),
    tacGia: 'PGS.TS. Nguyễn Văn A',
    ngonNgu: 'Tiếng Việt',
    khuonKho: '16x24cm',
    soTrangCuaXuatBanPhamIn: '864',
    soLuongIn: 5000,
    doiTacLienKet: 'Nhà xuất bản Chính trị Quốc gia Sự thật',
    tenBienTapVien: 'TS. Trần Thị B',
    coSoIn: 'Nhà in NXB Chính trị Quốc gia Sự thật',
    isbn: '978-604-57-1234-5',
  };
  const qdRes = await api(`/dat-sach/project/${projectId}/qd`, {
    method: 'PATCH',
    body: JSON.stringify({ qdData }),
  }, token);
  console.log(`  OK - QĐ saved on project ${projectId}`);

  // Approve QĐ
  console.log('\n[8b/8] Approve QĐ...');
  await api(`/dat-sach/project/${projectId}/approve-qd`, { method: 'POST' }, token);
  console.log('  OK - QĐ approved');

  // --- DOWNLOAD AND CHECK DOCX ---
  console.log('\n' + '='.repeat(70));
  console.log('DOCX GENERATION TEST');
  console.log('='.repeat(70));

  // Download GDN
  console.log('\n--- GDN DOCX (giay_de_nghi_in.docx) ---');
  const gdnBlob = await apiBlob(`/dat-sach/gdn/${gdnId}/download`, {}, token);
  const gdnText = extractDocxText(gdnBlob);
  if (gdnText) {
    console.log(`  Text length: ${gdnText.length} chars`);
    console.log(`  Sample: "${gdnText.substring(0, 200)}..."`);
    const gdnExpected = {
      tenSach: 'Lịch Sử Đảng Cộng Sản Việt Nam',
      tacGia: 'PGS.TS. Nguyễn Văn A',
      bbt: 'Hội đồng Biên tập',
      namXB: '2025',
      soTrang: '864',
      khoSach: '16x24cm',
      giaBia: '120.000',
      slDeNghiIn: '5000',
      thoiGianCanSach: '30 ngày',
      deNghiNoiIn: 'Nhà in NXB Chính trị',
    };
    for (const [key, val] of Object.entries(gdnExpected)) {
      const filled = gdnText.includes(val);
      console.log(`  ${filled ? 'OK' : 'FAIL'} [${key}] "${val}" -> ${filled ? 'FOUND' : 'NOT FOUND'}`);
    }
  } else {
    console.log('  ERROR: Could not extract text from DOCX');
  }

  // Download PCDI
  console.log('\n--- PCDI DOCX (phieu_chi_dinh_co_so_in.docx) ---');
  const pcdiBlob = await apiBlob(`/dat-sach/pcdi/${pcdiId}/download`, {}, token);
  const pcdiText = extractDocxText(pcdiBlob);
  if (pcdiText) {
    console.log(`  Text length: ${pcdiText.length} chars`);
    console.log(`  Sample: "${pcdiText.substring(0, 200)}..."`);
    const pcdiExpected = {
      tenSach: 'Lịch Sử Đảng',
      tacGia: 'PGS.TS. Nguyễn Văn A',
      bbt: 'Hội đồng Biên tập',
      phuongThuc: 'In offset',
      coSoIn: 'Nhà in NXB Chính trị',
      soLuongIn: '5000',
    };
    for (const [key, val] of Object.entries(pcdiExpected)) {
      const filled = pcdiText.includes(val);
      console.log(`  ${filled ? 'OK' : 'FAIL'} [${key}] "${val}" -> ${filled ? 'FOUND' : 'NOT FOUND'}`);
    }
  } else {
    console.log('  ERROR: Could not extract text from DOCX');
  }

  // Download QĐ
  console.log('\n--- QĐ DOCX (quyet_dinh.docx) ---');
  const qdBlob = await apiBlob(`/dat-sach/project/${projectId}/download-qd`, {}, token);
  const qdText = extractDocxText(qdBlob);
  if (qdText) {
    console.log(`  Text length: ${qdText.length} chars`);
    console.log(`  Sample: "${qdText.substring(0, 200)}..."`);
    const qdExpected = {
      tacGia: 'PGS.TS. Nguyễn Văn A',
      ngonNgu: 'Tiếng Việt',
      khuonKho: '16x24cm',
      soLuongIn: '5000',
      isbn: '978-604-57-1234-5',
      coSoIn: 'Nhà in NXB Chính trị',
    };
    for (const [key, val] of Object.entries(qdExpected)) {
      const filled = qdText.includes(val);
      console.log(`  ${filled ? 'OK' : 'FAIL'} [${key}] "${val}" -> ${filled ? 'FOUND' : 'NOT FOUND'}`);
    }
  } else {
    console.log('  ERROR: Could not extract text from DOCX');
  }

  // Check for blank placeholders in all docs
  console.log('\n--- Check for unfilled placeholders ---');
  for (const [name, text] of [['GDN', gdnText], ['PCDI', pcdiText], ['QĐ', qdText]]) {
    if (!text) continue;
    const blankPlaceholders = text.match(/\{\{[^}]+\}\}/g) || [];
    if (blankPlaceholders.length > 0) {
      console.log(`  ${name}: ${blankPlaceholders.length} blank placeholders found:`);
      blankPlaceholders.slice(0, 10).forEach(p => console.log(`    - ${p}`));
    } else {
      console.log(`  ${name}: No blank placeholders found!`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
