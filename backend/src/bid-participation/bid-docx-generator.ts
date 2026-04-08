import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';

const TEMPLATES: Record<string, string> = {
  TO_TRINH_XIN_Y_KIEN: 'Tờ trình xin ý kiến.docx',
  QD_PHE_DUYET_HSDT: 'Quyết định Phê duyệt HSDT.docx',
  HOP_DONG_THUC_HIEN: 'Hợp đồng thực hiện.docx',
};

const PLACEHOLDER_ALIASES: Record<string, string> = {};

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

export async function generateBidDocx(
  templateKey: string,
  data: Record<string, any>,
): Promise<Buffer> {
  const templateName = TEMPLATES[templateKey];
  if (!templateName) {
    throw new Error(`Template không hỗ trợ: "${templateKey}"`);
  }

  const candidates = [
    process.env.FILEMAU_PATH,
    path.resolve(__dirname, '../../../FileMau'),
    path.resolve(__dirname, '../../../../FileMau'),
  ].filter(Boolean) as string[];

  let templatePath = '';
  for (const base of candidates) {
    const p = path.join(base, 'NhaThau-ThamDuThau', templateName);
    if (fs.existsSync(p)) { templatePath = p; break; }
  }
  if (!templatePath) {
    throw new Error(`Không tìm thấy file mẫu: NhaThau-ThamDuThau/${templateName}`);
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

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
