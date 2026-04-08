import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import { ContractPackageType } from '@prisma/client';

/**
 * DOCX generator for payment steps.
 * Reads templates from FileMau/GoiThau*, replaces placeholders, returns buffer.
 */

const PACKAGE_FOLDERS: Record<ContractPackageType, string> = {
  GOI_THAU_TU_VAN: 'GoiThauTuVan',
  GOI_THAU_PHI_TU_VAN: 'GoiThauPhiTuVan',
  GOI_THAU_TRIEN_KHAI: 'GoiThauTrienKhai',
};

const TU_VAN_TEMPLATES: Record<string, string> = {
  ban_giao_san_pham: 'Biên bản bàn giao sản phẩm tư vấn.docx',
  nghiem_thu_san_pham: 'Biên bản nghiệm thu sản phẩm tư vấn.docx',
  mau_08a: 'Mẫu 08A.docx',
  thanh_ly_hop_dong: 'Biên bản thanh lý hợp đồng.docx',
};

const PHI_TU_VAN_TEMPLATES: Record<string, string> = {
  ban_giao_dich_vu: 'Biên bản bàn giao dịch vụ.docx',
  nghiem_thu_dich_vu: 'Biên bản nghiệm thu dịch vụ.docx',
  van_hanh_thu: 'Biên bản vận hành thử.docx',
  mau_08a: 'Mẫu 08A.docx',
  thanh_ly_hop_dong: 'Biên bản thanh lý hợp đồng.docx',
};

const TRIEN_KHAI_TEMPLATES: Record<string, string> = {
  bang_tien_do_cung_cap: 'Bảng tiến độ cung cấp.docx',
  kiem_tra_dieu_kien: 'Biên bản kiểm tra điều kiện triển khai.docx',
  kiem_tra_nang_luc: 'Biên bản kiểm tra năng lực triển khai.docx',
  kiem_tra_vat_tu: 'Biên bản kiểm tra Vật tư.docx',
  nghiem_thu_cai_dat: 'Biên bản nghiệm thu cài đặt.docx',
  nghiem_thu_dao_tao: 'Biên bản nghiệm thu đào tạo.docx',
  van_hanh_thu: 'Biên bản vận hành thử.docx',
  nghiem_thu_tong_the: 'Biên bản nghiệm thu tổng thể.docx',
  nhat_ky_cong_tac: 'NhatKy-CongTacTrienKhai.docx',
  nhat_ky_giam_sat: 'Nhật ký giám sát triển khai.docx',
  mau_08a: 'Mẫu 08A.docx',
  thanh_ly_hop_dong: 'Biên bản thanh lý hợp đồng.docx',
};

const STEP_TEMPLATES: Record<ContractPackageType, Record<string, string>> = {
  GOI_THAU_TU_VAN: TU_VAN_TEMPLATES,
  GOI_THAU_PHI_TU_VAN: PHI_TU_VAN_TEMPLATES,
  GOI_THAU_TRIEN_KHAI: TRIEN_KHAI_TEMPLATES,
};

// Steps for each contract package type (matching the flow chart)
export const TU_VAN_STEPS = [
  { stepKey: 'ban_giao_san_pham', stepOrder: 1, title: 'Biên bản bàn giao sản phẩm tư vấn' },
  { stepKey: 'nghiem_thu_san_pham', stepOrder: 2, title: 'Biên bản nghiệm thu sản phẩm tư vấn' },
  { stepKey: 'mau_08a', stepOrder: 3, title: 'Mẫu 08A' },
  { stepKey: 'thanh_ly_hop_dong', stepOrder: 4, title: 'Biên bản thanh lý hợp đồng' },
];

export const PHI_TU_VAN_STEPS = [
  { stepKey: 'ban_giao_dich_vu', stepOrder: 1, title: 'Biên bản bàn giao dịch vụ' },
  { stepKey: 'nghiem_thu_dich_vu', stepOrder: 2, title: 'Biên bản nghiệm thu dịch vụ' },
  { stepKey: 'van_hanh_thu', stepOrder: 3, title: 'Biên bản vận hành thử' },
  { stepKey: 'mau_08a', stepOrder: 4, title: 'Mẫu 08A' },
  { stepKey: 'thanh_ly_hop_dong', stepOrder: 5, title: 'Biên bản thanh lý hợp đồng' },
];

export const TRIEN_KHAI_STEPS = [
  { stepKey: 'bang_tien_do_cung_cap', stepOrder: 1, title: 'Bảng tiến độ cung cấp' },
  { stepKey: 'kiem_tra_dieu_kien', stepOrder: 2, title: 'Biên bản kiểm tra điều kiện triển khai' },
  { stepKey: 'kiem_tra_nang_luc', stepOrder: 3, title: 'Biên bản kiểm tra năng lực triển khai' },
  { stepKey: 'kiem_tra_vat_tu', stepOrder: 4, title: 'Biên bản kiểm tra Vật tư' },
  { stepKey: 'nghiem_thu_cai_dat', stepOrder: 5, title: 'Biên bản nghiệm thu cài đặt' },
  { stepKey: 'nghiem_thu_dao_tao', stepOrder: 6, title: 'Biên bản nghiệm thu đào tạo (nếu có)' },
  { stepKey: 'van_hanh_thu', stepOrder: 7, title: 'Biên bản vận hành thử' },
  { stepKey: 'nghiem_thu_tong_the', stepOrder: 8, title: 'Biên bản nghiệm thu tổng thể' },
  { stepKey: 'nhat_ky_cong_tac', stepOrder: 9, title: 'Nhật ký công tác triển khai' },
  { stepKey: 'nhat_ky_giam_sat', stepOrder: 10, title: 'Nhật ký giám sát triển khai' },
  { stepKey: 'mau_08a', stepOrder: 11, title: 'Mẫu 08A' },
  { stepKey: 'thanh_ly_hop_dong', stepOrder: 12, title: 'Biên bản thanh lý hợp đồng' },
];

export function getPaymentSteps(packageType: ContractPackageType) {
  switch (packageType) {
    case 'GOI_THAU_TU_VAN': return TU_VAN_STEPS;
    case 'GOI_THAU_PHI_TU_VAN': return PHI_TU_VAN_STEPS;
    case 'GOI_THAU_TRIEN_KHAI': return TRIEN_KHAI_STEPS;
  }
}

// Alias map for template placeholders that differ from data key names
const PLACEHOLDER_ALIASES: Record<string, string> = {
  'Diadanh': 'DiaDanh',
  'diadanh': 'DiaDanh',
  'Y KienKhac': 'YKienKhac',
};

function normalizeRuns(xml: string): string {
  let current = xml;
  current = current.replace(/<w:proofErr[^>]*\/>/g, '');

  const segments: Array<{ text: string; textStart: number; textEnd: number }> = [];
  const wtRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = wtRe.exec(current)) !== null) {
    const openTagEnd = m[0].indexOf('>') + 1;
    segments.push({
      text: m[1],
      textStart: m.index + openTagEnd,
      textEnd: m.index + openTagEnd + m[1].length,
    });
  }

  let combined = '';
  const charMap: Array<{ segIdx: number; charIdx: number }> = [];
  for (let si = 0; si < segments.length; si++) {
    for (let ci = 0; ci < segments[si].text.length; ci++) {
      charMap.push({ segIdx: si, charIdx: ci });
      combined += segments[si].text[ci];
    }
  }

  const phRe = /\{\{[^}]*\}\}/g;
  let pm: RegExpExecArray | null;
  const edits: Array<{ start: number; end: number; newText: string }> = [];

  while ((pm = phRe.exec(combined)) !== null) {
    const startMap = charMap[pm.index];
    const endMap = charMap[pm.index + pm[0].length - 1];
    if (startMap.segIdx === endMap.segIdx) continue;

    const startSeg = segments[startMap.segIdx];
    const endSeg = segments[endMap.segIdx];

    edits.push({ start: endSeg.textStart, end: endSeg.textStart + endMap.charIdx + 1, newText: '' });
    for (let si = endMap.segIdx - 1; si > startMap.segIdx; si--) {
      edits.push({ start: segments[si].textStart, end: segments[si].textEnd, newText: '' });
    }
    edits.push({ start: startSeg.textStart + startMap.charIdx, end: startSeg.textEnd, newText: pm[0] });
  }

  edits.sort((a, b) => b.start - a.start);
  for (const edit of edits) {
    current = current.substring(0, edit.start) + edit.newText + current.substring(edit.end);
  }
  return current;
}

function escapeXmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replaceDatePatterns(xml: string, day: string, month: string, year: string): string {
  let current = xml;
  const segments: Array<{ text: string; textStart: number; textEnd: number }> = [];
  const wtRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = wtRe.exec(current)) !== null) {
    const openTagEnd = m[0].indexOf('>') + 1;
    segments.push({ text: m[1], textStart: m.index + openTagEnd, textEnd: m.index + openTagEnd + m[1].length });
  }

  let combined = '';
  const charMap: Array<{ segIdx: number; charIdx: number }> = [];
  for (let si = 0; si < segments.length; si++) {
    for (let ci = 0; ci < segments[si].text.length; ci++) {
      charMap.push({ segIdx: si, charIdx: ci });
      combined += segments[si].text[ci];
    }
  }

  const dateRe = /ngày\s+tháng\s+năm/gi;
  let pm: RegExpExecArray | null;
  const edits: Array<{ start: number; end: number; newText: string }> = [];

  while ((pm = dateRe.exec(combined)) !== null) {
    const replacement = `ngày ${day} tháng ${month} năm ${year}`;
    const startMap = charMap[pm.index];
    const endMap = charMap[pm.index + pm[0].length - 1];
    if (startMap.segIdx === endMap.segIdx) {
      const seg = segments[startMap.segIdx];
      edits.push({ start: seg.textStart + startMap.charIdx, end: seg.textStart + endMap.charIdx + 1, newText: replacement });
    } else {
      edits.push({ start: segments[endMap.segIdx].textStart, end: segments[endMap.segIdx].textStart + endMap.charIdx + 1, newText: '' });
      for (let si = endMap.segIdx - 1; si > startMap.segIdx; si--) {
        edits.push({ start: segments[si].textStart, end: segments[si].textEnd, newText: '' });
      }
      edits.push({ start: segments[startMap.segIdx].textStart + startMap.charIdx, end: segments[startMap.segIdx].textEnd, newText: replacement });
    }
  }

  edits.sort((a, b) => b.start - a.start);
  for (const edit of edits) {
    current = current.substring(0, edit.start) + edit.newText + current.substring(edit.end);
  }
  return current;
}

function replacePlaceholders(xml: string, data: Record<string, any>): string {
  return xml.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, inner) => {
    const trimmed = (inner as string).trim();
    const dataKey = PLACEHOLDER_ALIASES[trimmed] ?? trimmed;
    // Try aliased key first, then original key (handles cases where data was saved with the original placeholder name)
    const value = data?.[dataKey] ?? data?.[trimmed];
    if (value !== undefined && value !== null) {
      return escapeXmlText(String(value));
    }
    return '';
  });
}

export async function generatePaymentDocx(
  packageType: ContractPackageType,
  stepKey: string,
  data: any,
): Promise<Buffer> {
  const folder = PACKAGE_FOLDERS[packageType];
  const templateName = STEP_TEMPLATES[packageType]?.[stepKey];
  if (!templateName) {
    throw new Error(`Không có mẫu DOCX cho bước "${stepKey}" với loại gói thầu "${packageType}"`);
  }

  const candidates = [
    process.env.FILEMAU_PATH,
    path.resolve(__dirname, '../../../FileMau'),
    path.resolve(__dirname, '../../../../FileMau'),
  ].filter(Boolean) as string[];
  let templatePath = '';
  for (const base of candidates) {
    const p = path.join(base, folder, templateName);
    if (fs.existsSync(p)) { templatePath = p; break; }
  }
  if (!templatePath) {
    throw new Error(`Không tìm thấy file mẫu: ${path.join(candidates[0], folder, templateName)}`);
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);
  const docXml = await zip.file('word/document.xml')!.async('text');

  let xml = normalizeRuns(docXml);

  const now = new Date();
  const safeData = { ...(data || {}) };
  if (!safeData.Ngay) safeData.Ngay = String(now.getDate());
  if (!safeData.thang) safeData.thang = String(now.getMonth() + 1);
  if (!safeData.nam) safeData.nam = String(now.getFullYear());
  if (!safeData.Thang) safeData.Thang = safeData.thang;
  if (!safeData.Nam) safeData.Nam = safeData.nam;

  xml = replacePlaceholders(xml, safeData);
  xml = replaceDatePatterns(xml, safeData.Ngay, safeData.thang, safeData.nam);

  zip.file('word/document.xml', xml);

  const headerFooterFiles = [
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
  ];
  for (const hfFile of headerFooterFiles) {
    const hf = zip.file(hfFile);
    if (!hf) continue;
    let hfXml = await hf.async('text');
    hfXml = normalizeRuns(hfXml);
    hfXml = replacePlaceholders(hfXml, safeData);
    hfXml = replaceDatePatterns(hfXml, safeData.Ngay, safeData.thang, safeData.nam);
    zip.file(hfFile, hfXml);
  }

  const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return Buffer.from(outputBuffer);
}
