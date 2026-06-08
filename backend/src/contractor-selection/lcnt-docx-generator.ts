import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import { ProcurementMethod } from '@prisma/client';

/**
 * Template-based DOCX generator for contractor selection steps.
 * Reads DOCX templates from FileMau/, replaces placeholders with actual data,
 * and returns the modified buffer.
 */

// Correct casing for template folders
const METHOD_FOLDERS: Record<ProcurementMethod, string> = {
  CHI_DINH_THAU: 'ChiDinhThau',
  CHAO_HANG_CANH_TRANH: 'ChaoHangCanhTranh',
  DAU_THAU_RONG_RAI: 'DauThauRongRai',
};

// Correct template file names
const STEP_TEMPLATES: Record<string, Record<string, string>> = {
  CHI_DINH_THAU: {
    thu_moi_hoan_thien: 'Thư mời hoàn thiện hợp đồng.docx',
    bien_ban_hoan_thien: 'Biên bản hoàn thiện hợp đồng.docx',
    to_trinh_kqlcnt: 'Tờ trình phê duyệt KQLCNT.docx',
    quyet_dinh_kqlcnt: 'Quyết định phê duyệt KQLCNT.docx',
    hop_dong: 'Hợp đồng.docx',
  },
  CHAO_HANG_CANH_TRANH: {
    to_trinh_hsmt: 'Tờ trình phê duyệt HSMT.docx',
    quyet_dinh_hsmt: 'Quyết định phê duyệt hồ sơ mời thầu.docx',
    to_trinh_kqlcnt: 'Tờ trình phê duyệt KQLCNT.docx',
    quyet_dinh_lcnt: 'Quyết định lựa chọn nhà thầu.docx',
    hop_dong: 'Hợp đồng.docx',
  },
  DAU_THAU_RONG_RAI: {
    to_trinh_hsmt: 'Tờ trình phê duyệt HSMT.docx',
    quyet_dinh_hsmt: 'Quyết định phê duyệt hồ sơ mời thầu.docx',
    to_trinh_kqlcnt: 'Tờ trình phê duyệt KQLCNT.docx',
    quyet_dinh_lcnt: 'Quyết định lựa chọn nhà thầu.docx',
    hop_dong: 'Hợp đồng.docx',
  },
};

const ATTACHMENT_ONLY_STEPS = new Set([
  'cong_van_tham_gia',
  'thong_tin_to_chuyen_gia',
  'san_pham_hsmt',
  'bao_cao_tham_dinh_hsmt',
  'dang_tai_hsmt',
  'bao_cao_danh_gia_hsdt',
  'bien_ban_doi_chieu',
  'bao_cao_tham_dinh_kqlcnt',
  'dang_tai_lcnt',
]);

// Alias map: only entries where template placeholder inner text differs from the data key.
// For placeholders where inner text equals data key, no entry is needed.
const PLACEHOLDER_ALIASES: Record<string, string> = {
  // Case/diacritic variants of DiaDanh
  'diadanh': 'DiaDanh',
  'Diadanh': 'DiaDanh',
  'ĐiaDanh': 'DiaDanh',

  // Space-containing template names → normalized data keys
  'NhaThauTrung Thau': 'TenNhaThauTrungThau',
  'TenNhaThauTrung Thau': 'TenNhaThauTrungThau',
  'NhaThauKhongTrung Thau': 'NhaThauKhongTrungThau',
  'TenNhaThauKhongTrung Thau': 'NhaThauKhongTrungThau',
  'XepHangCua NhaThauDoiChieu': 'XepHangCuaNhaThauDoiChieu',
  'ThoiGianRa BBDCTL': 'ThoiGianRaBBDCTL',

  // Vietnamese special chars
  'ThoiGianKyHĐ': 'ThoiGianKyHD',

  // Slash/special chars in names
  'Phan/LoNhaThauThamDu': 'PhanLoNhaThauThamDu',
  'PhanLoaiNhaThauThamDu': 'PhanLoNhaThauThamDu',
  'TenChuDauTu/DonViTuVanDauThau': 'ChuDauTu/DonViTuVanDauThau',

  // Renamed template fields → existing data keys (backward compat)
  'TomTatNoiDungHSMT': 'TomTatNoiDungHSMT',
  'TenNhaThauDuocDoiChieu': 'NhaThauDuocDoiChieu',

  // Lowercase variant
  'donViMoi': 'DonViMoi',

  // Fixed broken braces (missing opening {{)
  'LoaiHopDong': 'LoaiHopDong',
  'NoiDungBaoHiem': 'NoiDungBaoHiem',
  'MaSoHĐ': 'MaSoHD',
  'ThoiDiemDongThau': 'ThoiDiemDongThau',
  'ThoiGianDoiChieuTaiLieu': 'ThoiGianDoiChieuTaiLieu',

  // Lowercase first letter
  'tendonvicuatochuyengia': 'Tendonvicuatochuyengia',

  // Space inside braces (remove all spaces)
  'C oSoIn': 'CoSoIn',
  'NgonNgu': 'NgonNgu',
  'khuonKho': 'khuonKho',
  'S oLuongIn': 'SoLuongIn',
  'T acGia': 'TacGia',
  'DoiTacLienKetXuatBan': 'DoiTacLienKetXuatBan',
  'T enBienTapVien': 'TenBienTapVien',
  'MaSoCachTieuChuanQuocTeISBN': 'MaSoCachTieuChuanQuocTe',

  // Expert committee
  'Tendonvicuatochuyengia': 'Tendonvicuatochuyengia',
};

/**
 * Normalize DOCX XML by merging placeholder fragments ({{...}}) that are
 * split across multiple <w:t> runs into contiguous text within a single run.
 * Works by extracting all text content, finding {{...}} patterns in the
 * combined text, then consolidating the XML so placeholders are intact.
 */
function normalizeRuns(xml: string): string {
  let current = xml;

  // Step 1: Remove ALL <w:proofErr> tags (they split runs, blocking merge)
  current = current.replace(/<w:proofErr[^>]*\/>/g, '');

  // Step 2: Extract all <w:t> segments with their XML positions
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

  // Step 3: Build combined text with char→segment mapping
  let combined = '';
  const charMap: Array<{ segIdx: number; charIdx: number }> = [];
  for (let si = 0; si < segments.length; si++) {
    for (let ci = 0; ci < segments[si].text.length; ci++) {
      charMap.push({ segIdx: si, charIdx: ci });
      combined += segments[si].text[ci];
    }
  }

  // Step 4: Find {{...}} patterns in the combined text
  const phRe = /\{\{[^}]*\}\}/g;
  let pm: RegExpExecArray | null;
  const edits: Array<{ start: number; end: number; newText: string }> = [];

  while ((pm = phRe.exec(combined)) !== null) {
    const startMap = charMap[pm.index];
    const endMap = charMap[pm.index + pm[0].length - 1];

    // Only need to merge if the placeholder spans multiple segments
    if (startMap.segIdx === endMap.segIdx) continue;

    const startSeg = segments[startMap.segIdx];
    const endSeg = segments[endMap.segIdx];

    // Clear consumed chars from the last segment (keep text after placeholder)
    edits.push({
      start: endSeg.textStart,
      end: endSeg.textStart + endMap.charIdx + 1,
      newText: '',
    });

    // Clear all text from intermediate segments
    for (let si = endMap.segIdx - 1; si > startMap.segIdx; si--) {
      edits.push({
        start: segments[si].textStart,
        end: segments[si].textEnd,
        newText: '',
      });
    }

    // Put the full placeholder in the first segment (replace from startCharIdx to end)
    edits.push({
      start: startSeg.textStart + startMap.charIdx,
      end: startSeg.textEnd,
      newText: pm[0],
    });
  }

  // Step 5: Apply edits from right to left so positions stay valid
  edits.sort((a, b) => b.start - a.start);
  for (const edit of edits) {
    current = current.substring(0, edit.start) + edit.newText + current.substring(edit.end);
  }

  return current;
}

/**
 * Escape value for safe XML text insertion.
 */
function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape a placeholder string for regex matching.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace "ngày    tháng    năm" date patterns in XML with actual date values.
 * Handles patterns both within a single <w:t> and split across multiple runs.
 */
function replaceDatePatterns(xml: string, day: string, month: string, year: string): string {
  let current = xml;

  // Extract all <w:t> segments
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

  // Build combined text with char→segment mapping
  let combined = '';
  const charMap: Array<{ segIdx: number; charIdx: number }> = [];
  for (let si = 0; si < segments.length; si++) {
    for (let ci = 0; ci < segments[si].text.length; ci++) {
      charMap.push({ segIdx: si, charIdx: ci });
      combined += segments[si].text[ci];
    }
  }

  // Find blank date patterns: "ngày" + whitespace-only + "tháng" + whitespace-only + "năm"
  const dateRe = /ngày\s+tháng\s+năm/gi;
  let pm: RegExpExecArray | null;
  const edits: Array<{ start: number; end: number; newText: string }> = [];

  while ((pm = dateRe.exec(combined)) !== null) {
    const replacement = `ngày ${day} tháng ${month} năm ${year}`;
    const startMap = charMap[pm.index];
    const endMap = charMap[pm.index + pm[0].length - 1];

    if (startMap.segIdx === endMap.segIdx) {
      // Same segment — simple in-place replacement
      const seg = segments[startMap.segIdx];
      edits.push({
        start: seg.textStart + startMap.charIdx,
        end: seg.textStart + endMap.charIdx + 1,
        newText: replacement,
      });
    } else {
      // Spans multiple segments — consolidate
      edits.push({
        start: segments[endMap.segIdx].textStart,
        end: segments[endMap.segIdx].textStart + endMap.charIdx + 1,
        newText: '',
      });
      for (let si = endMap.segIdx - 1; si > startMap.segIdx; si--) {
        edits.push({
          start: segments[si].textStart,
          end: segments[si].textEnd,
          newText: '',
        });
      }
      edits.push({
        start: segments[startMap.segIdx].textStart + startMap.charIdx,
        end: segments[startMap.segIdx].textEnd,
        newText: replacement,
      });
    }
  }

  // Apply edits from right to left
  edits.sort((a, b) => b.start - a.start);
  for (const edit of edits) {
    current = current.substring(0, edit.start) + edit.newText + current.substring(edit.end);
  }

  return current;
}

/**
 * Replace all {{...}} placeholders in XML with values from data.
 * Handles whitespace inside braces: {{ Key }} → trimmed to "Key".
 * Uses PLACEHOLDER_ALIASES for non-identity mappings.
 */
function replacePlaceholders(xml: string, data: Record<string, any>): string {
  return xml.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, inner) => {
    const trimmed = (inner as string).trim();
    const noSpaces = trimmed.replace(/\s/g, ''); // strip all spaces from placeholder inner text
    // Try: alias of no-spaces version → alias of original → no-spaces version → original
    const dataKey = PLACEHOLDER_ALIASES[noSpaces] ?? PLACEHOLDER_ALIASES[trimmed] ?? noSpaces;
    const value = data?.[dataKey] ?? data?.[trimmed] ?? data?.[noSpaces];
    if (value !== undefined && value !== null) {
      return escapeXmlText(String(value));
    }
    return '';
  });
}

export function isAttachmentOnlyStep(stepKey: string): boolean {
  return ATTACHMENT_ONLY_STEPS.has(stepKey);
}

export async function generateContractorSelectionDocx(
  method: ProcurementMethod,
  stepKey: string,
  data: any,
): Promise<Buffer> {
  if (ATTACHMENT_ONLY_STEPS.has(stepKey)) {
    throw new Error(`Bước "${stepKey}" chỉ hỗ trợ đính kèm file, không có mẫu DOCX.`);
  }

  const folder = METHOD_FOLDERS[method];
  const templateName = STEP_TEMPLATES[method]?.[stepKey];
  if (!templateName) {
    throw new Error(`Không có mẫu DOCX cho bước "${stepKey}" với hình thức "${method}"`);
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

  // Auto-fill date fields if not provided
  const now = new Date();
  const safeData = { ...(data || {}) };
  if (!safeData.Ngay) safeData.Ngay = String(now.getDate());
  if (!safeData.thang) safeData.thang = String(now.getMonth() + 1);
  if (!safeData.nam) safeData.nam = String(now.getFullYear());
  if (!safeData.Thang) safeData.Thang = safeData.thang;
  if (!safeData.Nam) safeData.Nam = safeData.nam;

  // Fix broken merged placeholder in CHCT/DTRR QĐ LCNT template (before main replacement)
  const htlcValue = safeData.HinhThucLuaChonNhaThau || '';
  const loaiHDValue = safeData.LoaiHopDong || '';
  xml = xml.replace(
    /\{\{HinhThucLuaChonNhaThau\s*-\s*Loại hợp đồng:\s*\{\{LoaiHopDong\}\}/g,
    `${escapeXmlText(htlcValue)} - Loại hợp đồng: ${escapeXmlText(loaiHDValue)}`,
  );

  // Replace all {{...}} placeholders
  xml = replacePlaceholders(xml, safeData);

  // Replace date patterns "ngày    tháng    năm" with actual date values
  xml = replaceDatePatterns(xml, safeData.Ngay, safeData.thang, safeData.nam);

  zip.file('word/document.xml', xml);

  // Also process headers and footers
  const headerFooterFiles = ['word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'];
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
