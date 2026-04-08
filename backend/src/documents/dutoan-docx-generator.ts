import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';

/**
 * Template-based DOCX generator for Dự toán documents.
 * Reads templates from FileMau/DuToan/, replaces {{...}} placeholders, returns buffer.
 */

const TEMPLATES: Record<string, string> = {
  TT_DUTOAN: 'Tờ trình phê duyệt dự toán.docx',
  QD_DUTOAN: 'Quyết định phê duyệt dự toán.docx',
};

const PLACEHOLDER_ALIASES: Record<string, string> = {
  'VietTat PhongBanThuocDonViTrinh': 'VietTatPhongBanThuocDonViTrinh',
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

function replacePlaceholders(xml: string, data: Record<string, any>): string {
  return xml.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, inner) => {
    const trimmed = (inner as string).trim();
    const dataKey = PLACEHOLDER_ALIASES[trimmed] ?? trimmed;
    const value = data?.[dataKey] ?? data?.[trimmed];
    if (value !== undefined && value !== null) {
      return escapeXmlText(String(value));
    }
    return '';
  });
}

export async function generateDuToanDocx(
  docType: 'TT_DUTOAN' | 'QD_DUTOAN',
  data: Record<string, any>,
): Promise<Buffer> {
  const templateName = TEMPLATES[docType];
  if (!templateName) {
    throw new Error(`Loại tài liệu không hỗ trợ: "${docType}"`);
  }

  const candidates = [
    process.env.FILEMAU_PATH,
    path.resolve(__dirname, '../../../FileMau'),
    path.resolve(__dirname, '../../../../FileMau'),
  ].filter(Boolean) as string[];

  let templatePath = '';
  for (const base of candidates) {
    const p = path.join(base, 'DuToan', templateName);
    if (fs.existsSync(p)) { templatePath = p; break; }
  }
  if (!templatePath) {
    throw new Error(`Không tìm thấy file mẫu: ${path.join(candidates[0], 'DuToan', templateName)}`);
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  // Process all word/*.xml parts (document, headers, footers)
  for (const [name, file] of Object.entries(zip.files)) {
    if (name.startsWith('word/') && name.endsWith('.xml')) {
      let xml = await file.async('text');
      xml = normalizeRuns(xml);
      xml = replacePlaceholders(xml, data);
      zip.file(name, xml);
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return Buffer.from(buffer);
}
