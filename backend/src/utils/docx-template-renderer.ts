import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';

export type LegalBasisSelection = {
  legalDocumentId?: string | null;
  source?: 'LIBRARY' | 'MANUAL';
  citationSnapshot?: string;
};

export type ProcurementPackageData = Record<string, any>;

export interface ParagraphRepeatRule {
  /** Plain text fragment of the prototype paragraph, before placeholder replacement. */
  contains: string;
}

export interface RenderDocxOptions {
  repeatTableRows?: boolean;
  repeatParagraphs?: ParagraphRepeatRule[];
  /** Render only a paragraph whose complete text is `{{CanCu}}`. */
  legalBasisStandaloneOnly?: boolean;
}

const DATA_ALIASES: Record<string, string[]> = {
  CanCu: ['canCu', 'canCuPhapLy', 'CanCuVanBanPhapLy', 'TenCacVanBanPhapLyLienQuan'],
  TenDuAn: ['tenDuAn'],
  TenGoiThau: ['tenGoiThau'],
  TenCacGoiThau: ['tenCacGoiThau'],
  NgayBanHanh: ['ngayBanHanh', 'ngayLap', 'NgayTrinh', 'NgayKy'],
  SoVanBan: ['soVanBan', 'SoQuyetDinh', 'soQuyetDinh', 'SoToTrinh', 'soToTrinh'],
  NguonVon: ['nguonVon'],
  NamThucHien: ['namThucHien'],
  DiaDiemDauTu: ['diaDiemDauTu', 'diaDiem'],
  TongMucDauTu: ['tongMucDauTu'],
  TongMucDauTuBangChu: ['tongMucDauTuBangChu'],
  TongGiaDuToanGoiThau: ['tongGiaDuToanGoiThau', 'DuToanBangSo', 'giaTriDuToanDuyet'],
  TongGiaDuToanGoiThauBangChu: ['tongGiaDuToanGoiThauBangChu', 'DuToanBangChu'],
  TongGiaTriCacGoiThau: ['tongGiaTriCacGoiThau'],
  TongGiaTriCacGoiThauBangChu: ['tongGiaTriCacGoiThauBangChu'],
  CongViec: ['congViec', 'tomTatCongViec'],
  GiaDuToanGoiThau: ['giaDuToanGoiThau', 'giaGoiThau'],
  GhiChu: ['ghiChu'],
  HinhThucLuaChonNhaThau: ['hinhThucLuaChonNhaThau', 'hinhThucLuaChon'],
  PhuongThucLuaChonNhaThau: ['phuongThucLuaChonNhaThau', 'phuongThucLuaChon'],
  LoaiHopDong: ['loaiHopDong'],
  ThoiGianToChucLuaChonNhaThau: ['thoiGianToChucLuaChonNhaThau', 'thoiGianToChuc'],
  ThoiGianLuaChonNhaThau: ['thoiGianLuaChonNhaThau', 'thoiGianToChucLuaChonNhaThau', 'thoiGianToChuc'],
  ThoiGianBatDauLuaChonNhaThau: [
    'thoiGianBatDauLuaChonNhaThau',
    'thoiGianBatDauToChucLuaChonNhaThau',
    'thoiGianBatDau',
  ],
  ThoiGianBatDauToChucLuaChonNhaThau: [
    'thoiGianBatDauToChucLuaChonNhaThau',
    'thoiGianBatDauLuaChonNhaThau',
    'thoiGianBatDau',
  ],
  ThoiGianThucHienGoiThau: ['thoiGianThucHienGoiThau', 'thoiGianThucHien'],
  ThoiGianThucHienHopDong: ['thoiGianThucHienHopDong', 'thoiGianThucHienGoiThau', 'thoiGianThucHien'],
  TuyChonMuaThem: ['tuyChonMuaThem'],
  TenNhaThau: ['NhaThau', 'tenNhaThau', 'TenNhaThauTrungThau'],
  MSTNhaThau: ['MaSoThueNhaThau', 'maSoThueNhaThau', 'MaSoThue'],
  TaiKhoanNhaThau: ['SoTaiKhoanNhaThau', 'ThongTinTaiKhoanNhaThau'],
  GiaGoiThau: ['GiaGoiThauBangSo', 'GiaHDBangSo', 'giaGoiThau'],
  GiaGoiThauBangChu: ['GiaTriHopDongBangChu', 'GiaHDBangChu'],
  SoHopDong: ['MaSoHD', 'MaSoHopDong', 'soHopDong'],
  NgayBanHanhHopDong: ['NgayBanHanhHopdong', 'ThoiGianKyHD', 'ThoiGianKyHopDong'],
  DonViSanPhamGoiThau: ['DonViSanPham GoiThau'],
  HinhThucSanPhamGoiThau: ['HinhThucSanPham GoiThau'],
  FileKhaiToanDinhKem: ['khaiToanAttachment', '_khaiToanAttachment'],
};

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatScalar(value: any): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCDate()}/${value.getUTCMonth() + 1}/${value.getUTCFullYear()}`;
  }
  if (typeof value === 'string') {
    const isoDate = value.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T[\d:.+-]+Z?)?$/,
    );
    if (isoDate) {
      return `${Number(isoDate[3])}/${Number(isoDate[2])}/${isoDate[1]}`;
    }
  }
  if (typeof value === 'object') {
    return String(
      value.originalName
      ?? value.fileName
      ?? value.citationSnapshot
      ?? '',
    );
  }
  return String(value);
}

function formatVietnameseIssueDate(value: any): string {
  let year = 0;
  let month = 0;
  let day = 0;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    year = value.getUTCFullYear();
    month = value.getUTCMonth() + 1;
    day = value.getUTCDate();
  } else if (typeof value === 'string') {
    const normalized = value.trim();
    const isoDate = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T[\d:.+-]+Z?)?$/,
    );
    const numericDate = normalized.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    );
    if (isoDate) {
      year = Number(isoDate[1]);
      month = Number(isoDate[2]);
      day = Number(isoDate[3]);
    } else if (numericDate) {
      day = Number(numericDate[1]);
      month = Number(numericDate[2]);
      year = Number(numericDate[3]);
    }
  }

  if (!year || !month || !day) return formatScalar(value);
  return `Ngày ${String(day).padStart(2, '0')} tháng ${month} năm ${year}`;
}

function readAliasedValue(data: Record<string, any>, rawKey: string): any {
  const trimmed = rawKey.trim();
  const compact = trimmed.replace(/\s+/g, '');
  const normalized = compact.toLocaleLowerCase('vi');
  const aliasEntry = Object.entries(DATA_ALIASES).find(
    ([target]) => target.replace(/\s+/g, '').toLocaleLowerCase('vi') === normalized,
  );
  const candidates = [
    trimmed,
    compact,
    ...(aliasEntry ? [aliasEntry[0], ...aliasEntry[1]] : []),
    ...(DATA_ALIASES[compact] || []),
    ...(DATA_ALIASES[trimmed] || []),
  ];

  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
    const normalizedKey = key.replace(/\s+/g, '').toLocaleLowerCase('vi');
    const actualKey = Object.keys(data).find(
      (candidate) => candidate.replace(/\s+/g, '').toLocaleLowerCase('vi') === normalizedKey,
    );
    if (actualKey && data[actualKey] !== undefined && data[actualKey] !== null) {
      return data[actualKey];
    }
  }
  return undefined;
}

/**
 * Word commonly splits a placeholder over several runs. Consolidate every
 * `{{...}}` token into the first run while retaining that run's formatting.
 */
export function normalizeDocxRuns(xml: string): string {
  let current = xml.replace(/<w:proofErr[^>]*\/>/g, '');
  const segments: Array<{ text: string; textStart: number; textEnd: number }> = [];
  const wtRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let match: RegExpExecArray | null;

  while ((match = wtRe.exec(current)) !== null) {
    const openTagEnd = match[0].indexOf('>') + 1;
    segments.push({
      text: match[1],
      textStart: match.index + openTagEnd,
      textEnd: match.index + openTagEnd + match[1].length,
    });
  }

  let combined = '';
  const charMap: Array<{ segment: number; character: number }> = [];
  segments.forEach((segment, segmentIndex) => {
    for (let character = 0; character < segment.text.length; character += 1) {
      combined += segment.text[character];
      charMap.push({ segment: segmentIndex, character });
    }
  });

  const edits: Array<{ start: number; end: number; text: string }> = [];
  for (const placeholder of combined.matchAll(/\{\{[^}]*\}\}/g)) {
    const token = placeholder[0];
    const startOffset = placeholder.index!;
    const endOffset = startOffset + token.length - 1;
    const start = charMap[startOffset];
    const end = charMap[endOffset];
    if (!start || !end || start.segment === end.segment) continue;

    edits.push({
      start: segments[end.segment].textStart,
      end: segments[end.segment].textStart + end.character + 1,
      text: '',
    });
    for (let index = end.segment - 1; index > start.segment; index -= 1) {
      edits.push({
        start: segments[index].textStart,
        end: segments[index].textEnd,
        text: '',
      });
    }
    edits.push({
      start: segments[start.segment].textStart + start.character,
      end: segments[start.segment].textEnd,
      text: token,
    });
  }

  edits.sort((a, b) => b.start - a.start);
  edits.forEach((edit) => {
    current = current.slice(0, edit.start) + edit.text + current.slice(edit.end);
  });
  return current;
}

function replacePlaceholders(xml: string, data: Record<string, any>): string {
  return xml.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_token, inner: string) => {
    const value = readAliasedValue(data, inner);
    const normalizedKey = inner
      .replace(/\s+/g, '')
      .toLocaleLowerCase('vi');
    if (normalizedKey === 'ngaybanhanh' || normalizedKey === 'ngayky') {
      return escapeXmlText(formatVietnameseIssueDate(value));
    }
    if (Array.isArray(value)) {
      return escapeXmlText(value.map(formatScalar).filter(Boolean).join(', '));
    }
    return escapeXmlText(formatScalar(value));
  });
}

function paragraphText(xml: string): string {
  return decodeXmlText(
    Array.from(xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g))
      .map((item) => item[1])
      .join(''),
  );
}

function normalizeCitation(value: string): string {
  let citation = value.trim();
  if (!citation) return '';
  citation = citation.replace(/[;,.]\s*$/, '').trim();
  if (!/^căn\s+cứ(?:\s|$)/i.test(citation)) citation = `Căn cứ ${citation}`;
  return `${citation};`;
}

function normalizeIntroCitation(value: unknown): string {
  let citation = String(value ?? '').trim();
  if (!citation) return '';
  citation = citation.replace(/[;,.]\s*$/, '').trim();
  if (!/^căn\s+cứ(?:\s|$)/i.test(citation)) citation = `Căn cứ ${citation}`;
  return citation;
}

export function getLegalBasisCitations(data: Record<string, any>): string[] {
  const candidates = [
    data.canCu,
    data.CanCu,
    data.canCuPhapLy,
    data.CanCuVanBanPhapLy,
    data.TenCacVanBanPhapLyLienQuan,
  ];
  const raw = candidates.find((candidate) => {
    if (Array.isArray(candidate)) return candidate.length > 0;
    return candidate !== undefined
      && candidate !== null
      && String(candidate).trim() !== '';
  }) ?? [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.citationSnapshot ?? item?.citation ?? '';
    })
    .map(normalizeCitation)
    .filter(Boolean);
}

function expandLegalBasisParagraphs(
  xml: string,
  citations: string[],
  standaloneOnly = false,
  introCitation = '',
): string {
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (!paragraph.includes('{{CanCu}}')) return paragraph;
    if (standaloneOnly && paragraphText(paragraph).trim() !== '{{CanCu}}') {
      return introCitation
        ? replacePlaceholders(paragraph, { CanCu: introCitation })
        : '';
    }
    if (citations.length === 0) return '';
    return citations
      .map((citation) => replacePlaceholders(paragraph, { CanCu: citation }))
      .join('');
  });
}

function parseMoney(value: any): bigint {
  if (typeof value === 'bigint') return value;
  const digits = String(value ?? '').replace(/[^\d-]/g, '');
  if (!digits || digits === '-') return 0n;
  try {
    return BigInt(digits);
  } catch {
    return 0n;
  }
}

function formatMoney(value: bigint): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped}`;
}

const VIETNAMESE_DIGITS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];
const VIETNAMESE_GROUP_UNITS = [
  '',
  'nghìn',
  'triệu',
  'tỷ',
  'nghìn tỷ',
  'triệu tỷ',
  'tỷ tỷ',
];

function readVietnameseMoneyGroup(value: number, full = false): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const words: string[] = [];

  if (hundreds > 0) {
    words.push(VIETNAMESE_DIGITS[hundreds], 'trăm');
  } else if (full && (tens > 0 || ones > 0)) {
    words.push('không', 'trăm');
  }

  if (tens > 1) {
    words.push(VIETNAMESE_DIGITS[tens], 'mươi');
  } else if (tens === 1) {
    words.push('mười');
  } else if (ones > 0 && (hundreds > 0 || full)) {
    words.push('lẻ');
  }

  if (ones > 0) {
    if (ones === 1 && tens > 1) words.push('mốt');
    else if (ones === 4 && tens > 1) words.push('tư');
    else if (ones === 5 && tens > 0) words.push('lăm');
    else words.push(VIETNAMESE_DIGITS[ones]);
  }
  return words.join(' ');
}

function numberToVietnameseMoney(value: any): string {
  let amount = parseMoney(value);
  if (amount === 0n) return 'Không đồng';
  const negative = amount < 0n;
  if (negative) amount = -amount;

  const groups: number[] = [];
  while (amount > 0n) {
    groups.push(Number(amount % 1000n));
    amount /= 1000n;
  }

  const words: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (group === 0) continue;
    const groupWords = readVietnameseMoneyGroup(
      group,
      index < groups.length - 1,
    );
    const unit =
      VIETNAMESE_GROUP_UNITS[index] ||
      `${VIETNAMESE_GROUP_UNITS[index % 3]} ${'tỷ '.repeat(
        Math.floor(index / 3),
      )}`.trim();
    words.push(groupWords, unit);
  }

  const result = `${negative ? 'âm ' : ''}${words
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()} đồng`;
  return result.charAt(0).toLocaleUpperCase('vi') + result.slice(1);
}

function isMoneyKey(key: string): boolean {
  if (/BangChu/i.test(key)) return false;
  return /BangSo|GiaDuToan|GiaGoiThau|TongGia|TongMucDauTu|GiaTri|ChiPhi|SoTien|ThanhTien|TienThue|SoDeNghi|SoDuTamUng|DonGia/i.test(
    key,
  );
}

export function getProcurementPackages(data: Record<string, any>): ProcurementPackageData[] {
  const raw = [
    data.packages,
    data.goiThau,
    data.GoiThau,
    data.cacGoiThau,
    data.CacGoiThau,
  ].find((candidate) => Array.isArray(candidate) && candidate.length > 0);
  const source = Array.isArray(raw)
    ? raw
    : (data.TenGoiThau || data.tenGoiThau ? [data] : []);

  return source.map((item: Record<string, any>, index: number) => {
    const result: Record<string, any> = { ...item, STT: index + 1 };
    for (const [target, aliases] of Object.entries(DATA_ALIASES)) {
      if (result[target] !== undefined && result[target] !== null && result[target] !== '') continue;
      for (const alias of aliases) {
        if (item[alias] !== undefined && item[alias] !== null) {
          result[target] = item[alias];
          break;
        }
      }
    }
    if (!result.id) result.id = `package-${index + 1}`;
    return result;
  });
}

export function prepareWorkflowTemplateData(data: Record<string, any>): Record<string, any> {
  const prepared: Record<string, any> = { ...(data || {}) };
  for (const [target, aliases] of Object.entries(DATA_ALIASES)) {
    if (prepared[target] !== undefined && prepared[target] !== null && prepared[target] !== '') continue;
    for (const alias of aliases) {
      if (prepared[alias] !== undefined && prepared[alias] !== null) {
        prepared[target] = prepared[alias];
        break;
      }
    }
  }

  const packages = getProcurementPackages(prepared).map((item) => {
    const normalized = { ...item };
    for (const [key, value] of Object.entries(normalized)) {
      if (
        isMoneyKey(key) &&
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        normalized[key] = formatMoney(parseMoney(value));
      }
    }
    return normalized;
  });
  prepared.packages = packages;
  prepared.goiThau = packages;
  prepared.SoLuongGoiThau = packages.length;
  const packageNames = packages
    .map((item) => formatScalar(item.TenGoiThau))
    .map((item) => item.trim())
    .filter(Boolean);
  if (packageNames.length > 0) {
    prepared.TenCacGoiThau = packageNames.join(', ');
  } else if (prepared.TenCacGoiThau === undefined) {
    prepared.TenCacGoiThau = '';
  }

  if (packages.length > 0) {
    for (const [key, value] of Object.entries(packages[0])) {
      if (prepared[key] === undefined || prepared[key] === null || prepared[key] === '') {
        prepared[key] = value;
      }
    }
  }

  const total = packages.reduce(
    (sum, item) => sum + parseMoney(item.GiaDuToanGoiThau ?? item.GiaGoiThau),
    0n,
  );
  if (!prepared.TongGiaDuToanGoiThau) prepared.TongGiaDuToanGoiThau = formatMoney(total);
  if (!prepared.TongGiaTriCacGoiThau) prepared.TongGiaTriCacGoiThau = formatMoney(total);

  if (
    prepared.TongMucDauTu !== undefined &&
    prepared.TongMucDauTu !== null &&
    prepared.TongMucDauTu !== ''
  ) {
    prepared.TongMucDauTuBangChu = numberToVietnameseMoney(
      prepared.TongMucDauTu,
    );
  }
  prepared.TongGiaDuToanGoiThauBangChu =
    numberToVietnameseMoney(total);
  prepared.TongGiaTriCacGoiThauBangChu =
    numberToVietnameseMoney(total);

  for (const [key, value] of Object.entries(prepared)) {
    if (
      isMoneyKey(key) &&
      !Array.isArray(value) &&
      typeof value !== 'object' &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      prepared[key] = formatMoney(parseMoney(value));
    }
  }

  const attachment = prepared.khaiToanAttachment ?? prepared._khaiToanAttachment;
  if (
    attachment
    && typeof attachment === 'object'
    && !prepared.FileKhaiToanDinhKem
  ) {
    prepared.FileKhaiToanDinhKem = attachment.originalName ?? attachment.fileName ?? '';
  }
  return prepared;
}

function renumberPrototypeRow(row: string, index: number): string {
  row = row.replace(/<w:tblHeader\b[^>]*\/>/g, '');
  const firstCell = row.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/);
  if (!firstCell) return row;
  const updatedCell = firstCell[0]
    .replace(/(<w:t(?:\s[^>]*)?>)\s*1\s*(<\/w:t>)/, `$1${index}$2`);
  return row.slice(0, firstCell.index!)
    + updatedCell
    + row.slice(firstCell.index! + firstCell[0].length);
}

function expandPackageRows(xml: string, packages: ProcurementPackageData[], globalData: Record<string, any>): string {
  const rowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
  const rows = Array.from(xml.matchAll(rowRegex));
  const edits: Array<{ start: number; end: number; text: string }> = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const match = rows[rowIndex];
    const row = match[0];
    if (!row.includes('{{TenGoiThau}}')) continue;

    const expanded = packages
      .map((item, index) => replacePlaceholders(
        renumberPrototypeRow(row, index + 1),
        { ...globalData, ...item, STT: index + 1 },
      ))
      .join('');
    edits.push({
      start: match.index!,
      end: match.index! + row.length,
      text: expanded,
    });
  }

  edits.sort((a, b) => b.start - a.start);
  edits.forEach((edit) => {
    xml = xml.slice(0, edit.start) + edit.text + xml.slice(edit.end);
  });
  return xml;
}

function expandPackageParagraphs(
  xml: string,
  packages: ProcurementPackageData[],
  globalData: Record<string, any>,
  rules: ParagraphRepeatRule[],
): string {
  if (rules.length === 0) return xml;
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = paragraphText(paragraph);
    if (!rules.some((rule) => text.includes(rule.contains))) return paragraph;
    return packages
      .map((item, index) => replacePlaceholders(paragraph, {
        ...globalData,
        ...item,
        STT: index + 1,
      }))
      .join('');
  });
}

export function resolveFileMauPath(folder: string, filename: string): string {
  const candidates = [
    process.env.FILEMAU_PATH,
    path.resolve(__dirname, '../../../FileMau'),
    path.resolve(__dirname, '../../../../FileMau'),
  ].filter(Boolean) as string[];

  for (const base of candidates) {
    const candidate = path.join(base, folder, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Không tìm thấy file mẫu: ${path.join(candidates[0] || 'FileMau', folder, filename)}`);
}

export async function listDocxPlaceholders(templatePath: string): Promise<string[]> {
  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
  const placeholders = new Set<string>();
  for (const [name, file] of Object.entries(zip.files)) {
    if (!name.startsWith('word/') || !name.endsWith('.xml')) continue;
    const xml = normalizeDocxRuns(await file.async('text'));
    for (const match of xml.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      placeholders.add(match[1].trim().replace(/\s+/g, ''));
    }
  }
  return Array.from(placeholders).sort((a, b) => a.localeCompare(b, 'vi'));
}

export async function renderDocxTemplate(
  templatePath: string,
  rawData: Record<string, any>,
  options: RenderDocxOptions = {},
): Promise<Buffer> {
  const template = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(template);
  const data = prepareWorkflowTemplateData(rawData);
  const packages = getProcurementPackages(data);
  const citations = getLegalBasisCitations(data);
  const introCitation = normalizeIntroCitation(
    data.CanCuMoDau ?? data.canCuMoDau,
  );

  for (const [name, file] of Object.entries(zip.files)) {
    if (!name.startsWith('word/') || !name.endsWith('.xml')) continue;
    let xml = normalizeDocxRuns(await file.async('text'));

    if (name === 'word/document.xml') {
      if (options.repeatTableRows) {
        xml = expandPackageRows(xml, packages, data);
      }
      xml = expandPackageParagraphs(xml, packages, data, options.repeatParagraphs || []);
      xml = expandLegalBasisParagraphs(
        xml,
        citations,
        options.legalBasisStandaloneOnly,
        introCitation,
      );
      xml = xml.replace(/gồm\s+04\s+gói thầu/g, `gồm ${packages.length} gói thầu`);
    } else {
      xml = expandLegalBasisParagraphs(
        xml,
        citations,
        options.legalBasisStandaloneOnly,
        introCitation,
      );
    }

    xml = replacePlaceholders(xml, data);
    zip.file(name, xml);
  }

  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

function nextRelationshipId(relsXml: string): () => string {
  let max = 0;
  for (const match of relsXml.matchAll(/\bId="rId(\d+)"/g)) {
    max = Math.max(max, Number(match[1]));
  }
  return () => `rId${++max}`;
}

function appendRelationship(relsXml: string, relationshipXml: string): string {
  return relsXml.replace(/<\/Relationships>\s*$/, `${relationshipXml}</Relationships>`);
}

function getAttachmentBody(documentXml: string): string {
  const bodyMatch = documentXml.match(
    /<w:body\b[^>]*>([\s\S]*?)<\/w:body>/,
  );
  if (!bodyMatch) throw new Error('Không đọc được nội dung file khái toán');
  return bodyMatch[1].replace(
    /<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>\s*$/,
    '',
  );
}

function assertSupportedAttachmentBody(
  attachmentBody: string,
  relationshipsXml: string,
): void {
  const unsupportedElement = [
    /<w:(?:footnoteReference|endnoteReference|commentReference|altChunk|subDoc)\b/,
    /<(?:o:OLEObject|w:object)\b/,
  ].find((pattern) => pattern.test(attachmentBody));
  if (unsupportedElement) {
    throw new Error(
      'Phụ lục DOCX chứa chú thích, đối tượng nhúng hoặc nội dung liên kết chưa được hỗ trợ',
    );
  }

  for (const relationship of relationshipsXml.matchAll(
    /<Relationship\b[^>]*\/>/g,
  )) {
    const fragment = relationship[0];
    const id = fragment.match(/\bId="([^"]+)"/)?.[1];
    const type = fragment.match(/\bType="([^"]+)"/)?.[1] || '';
    const targetMode = fragment.match(/\bTargetMode="([^"]+)"/)?.[1];
    if (
      !id ||
      !new RegExp(
        `r:[\\w.-]+="${escapeRegex(id)}"`,
      ).test(attachmentBody)
    ) {
      continue;
    }

    const isImage = type.endsWith('/image');
    const isExternalHyperlink =
      Boolean(targetMode) && type.endsWith('/hyperlink');
    if (!isImage && !isExternalHyperlink) {
      throw new Error(
        'Phụ lục DOCX chứa biểu đồ, SmartArt hoặc đối tượng Word chưa được hỗ trợ; vui lòng chuyển chúng thành ảnh trước khi tải lên',
      );
    }
  }
}

export async function validateDocxAttachmentForMerge(
  attachmentBuffer: Buffer,
): Promise<void> {
  const zip = await JSZip.loadAsync(attachmentBuffer);
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('File khái toán không phải là DOCX hợp lệ');
  const documentXml = await documentFile.async('text');
  const body = getAttachmentBody(documentXml);
  const relationships =
    await zip.file('word/_rels/document.xml.rels')?.async('text') || '';
  assertSupportedAttachmentBody(body, relationships);
}

function mergeDocumentNamespaces(
  mainDocument: string,
  attachmentDocument: string,
): string {
  const mainTag = mainDocument.match(/<w:document\b[^>]*>/)?.[0];
  const attachmentTag =
    attachmentDocument.match(/<w:document\b[^>]*>/)?.[0];
  if (!mainTag || !attachmentTag) return mainDocument;

  let mergedTag = mainTag;
  for (const namespace of attachmentTag.matchAll(
    /\s(xmlns(?::[\w.-]+)?)="([^"]*)"/g,
  )) {
    const name = namespace[1];
    if (!new RegExp(`\\s${escapeRegex(name)}=`).test(mergedTag)) {
      mergedTag = mergedTag.replace(/>$/, `${namespace[0]}>`);
    }
  }

  const mainIgnorable =
    mergedTag.match(/\smc:Ignorable="([^"]*)"/)?.[1] || '';
  const attachmentIgnorable =
    attachmentTag.match(/\smc:Ignorable="([^"]*)"/)?.[1] || '';
  const ignorable = Array.from(
    new Set(
      `${mainIgnorable} ${attachmentIgnorable}`
        .trim()
        .split(/\s+/)
        .filter(Boolean),
    ),
  ).join(' ');
  if (ignorable) {
    if (/\smc:Ignorable="[^"]*"/.test(mergedTag)) {
      mergedTag = mergedTag.replace(
        /\smc:Ignorable="[^"]*"/,
        ` mc:Ignorable="${ignorable}"`,
      );
    } else {
      mergedTag = mergedTag.replace(
        />$/,
        ` mc:Ignorable="${ignorable}">`,
      );
    }
  }
  return mainDocument.replace(mainTag, mergedTag);
}

/**
 * Append a DOCX attachment as real OOXML body content. Images and hyperlinks
 * referenced by the attachment are copied and their relationship IDs remapped.
 * The attachment must be a valid DOCX file.
 */
export async function appendDocxAttachment(mainBuffer: Buffer, attachmentBuffer: Buffer): Promise<Buffer> {
  const mainZip = await JSZip.loadAsync(mainBuffer);
  const attachmentZip = await JSZip.loadAsync(attachmentBuffer);
  const mainDocumentFile = mainZip.file('word/document.xml');
  const attachmentDocumentFile = attachmentZip.file('word/document.xml');
  if (!mainDocumentFile || !attachmentDocumentFile) {
    throw new Error('File khái toán không phải là DOCX hợp lệ');
  }

  let mainDocument = await mainDocumentFile.async('text');
  let attachmentDocument = await attachmentDocumentFile.async('text');
  const relPath = 'word/_rels/document.xml.rels';
  let mainRels = await mainZip.file(relPath)?.async('text')
    ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const attachmentRels = await attachmentZip.file(relPath)?.async('text') ?? '';
  let attachmentBody = getAttachmentBody(attachmentDocument);
  assertSupportedAttachmentBody(attachmentBody, attachmentRels);
  mainDocument = mergeDocumentNamespaces(
    mainDocument,
    attachmentDocument,
  );
  const allocateRelationshipId = nextRelationshipId(mainRels);
  const copiedMediaExtensions = new Set<string>();

  // Import styles that are referenced by the appended body and do not already
  // exist in the destination package.
  const mainStylesFile = mainZip.file('word/styles.xml');
  const attachmentStylesFile = attachmentZip.file('word/styles.xml');
  if (mainStylesFile && attachmentStylesFile) {
    let mainStyles = await mainStylesFile.async('text');
    const attachmentStyles = await attachmentStylesFile.async('text');
    const usedStyleIds = new Set(
      Array.from(attachmentBody.matchAll(/<w:(?:pStyle|rStyle|tblStyle)\b[^>]*w:val="([^"]+)"/g))
        .map((match) => match[1]),
    );
    for (const styleId of usedStyleIds) {
      if (new RegExp(`<w:style\\b[^>]*w:styleId="${escapeRegex(styleId)}"`).test(mainStyles)) continue;
      const style = attachmentStyles.match(
        new RegExp(`<w:style\\b[^>]*w:styleId="${escapeRegex(styleId)}"[\\s\\S]*?<\\/w:style>`),
      );
      if (style) mainStyles = mainStyles.replace('</w:styles>', `${style[0]}</w:styles>`);
    }
    mainZip.file('word/styles.xml', mainStyles);
  }

  // Import only the numbering definitions actually used by the attachment and
  // remap their IDs to avoid collisions with the template.
  const mainNumberingFile = mainZip.file('word/numbering.xml');
  const attachmentNumberingFile = attachmentZip.file('word/numbering.xml');
  if (attachmentNumberingFile) {
    const attachmentNumbering = await attachmentNumberingFile.async('text');
    if (!mainNumberingFile) {
      mainZip.file('word/numbering.xml', attachmentNumbering);
      if (!mainRels.includes('/relationships/numbering')) {
        mainRels = appendRelationship(
          mainRels,
          `<Relationship Id="${allocateRelationshipId()}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`,
        );
      }
    } else {
      let mainNumbering = await mainNumberingFile.async('text');
      let nextAbstractId = Math.max(
        -1,
        ...Array.from(mainNumbering.matchAll(/<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"/g))
          .map((match) => Number(match[1])),
      ) + 1;
      let nextNumId = Math.max(
        0,
        ...Array.from(mainNumbering.matchAll(/<w:num\b[^>]*w:numId="(\d+)"/g))
          .map((match) => Number(match[1])),
      ) + 1;
      const usedNumIds = new Set(
        Array.from(attachmentBody.matchAll(/<w:numId\b[^>]*w:val="(\d+)"/g))
          .map((match) => match[1]),
      );

      for (const oldNumId of usedNumIds) {
        const num = attachmentNumbering.match(
          new RegExp(`<w:num\\b[^>]*w:numId="${oldNumId}"[\\s\\S]*?<\\/w:num>`),
        );
        if (!num) continue;
        const oldAbstractId = num[0].match(/<w:abstractNumId\b[^>]*w:val="(\d+)"/)?.[1];
        if (!oldAbstractId) continue;
        const abstract = attachmentNumbering.match(
          new RegExp(`<w:abstractNum\\b[^>]*w:abstractNumId="${oldAbstractId}"[\\s\\S]*?<\\/w:abstractNum>`),
        );
        if (!abstract) continue;

        const newAbstractId = String(nextAbstractId++);
        const newNumId = String(nextNumId++);
        const importedAbstract = abstract[0].replace(
          new RegExp(`w:abstractNumId="${oldAbstractId}"`),
          `w:abstractNumId="${newAbstractId}"`,
        );
        const importedNum = num[0]
          .replace(new RegExp(`w:numId="${oldNumId}"`), `w:numId="${newNumId}"`)
          .replace(
            new RegExp(`(<w:abstractNumId\\b[^>]*w:val=")${oldAbstractId}(")`),
            `$1${newAbstractId}$2`,
          );
        mainNumbering = mainNumbering
          .replace('</w:numbering>', `${importedAbstract}${importedNum}</w:numbering>`);
        attachmentBody = attachmentBody.replace(
          new RegExp(`(<w:numId\\b[^>]*w:val=")${oldNumId}(")`, 'g'),
          `$1${newNumId}$2`,
        );
      }
      mainZip.file('word/numbering.xml', mainNumbering);
    }
  }

  const relationships = Array.from(attachmentRels.matchAll(/<Relationship\b[^>]*\/>/g));
  let mediaSequence = 0;
  for (const relationship of relationships) {
    const fragment = relationship[0];
    const id = fragment.match(/\bId="([^"]+)"/)?.[1];
    const target = fragment.match(/\bTarget="([^"]+)"/)?.[1];
    const type = fragment.match(/\bType="([^"]+)"/)?.[1];
    const targetMode = fragment.match(/\bTargetMode="([^"]+)"/)?.[1];
    const isReferenced = id
      ? new RegExp(`r:[\\w.-]+="${escapeRegex(id)}"`).test(attachmentBody)
      : false;
    if (!id || !target || !type || !isReferenced) {
      continue;
    }

    const newId = allocateRelationshipId();
    let newTarget = target;
    if (!targetMode && target.startsWith('media/')) {
      const sourcePath = `word/${target}`;
      const sourceFile = attachmentZip.file(sourcePath);
      if (!sourceFile) continue;
      mediaSequence += 1;
      const extension = path.extname(target);
      newTarget = `media/khai-toan-${mediaSequence}${extension}`;
      while (mainZip.file(`word/${newTarget}`)) {
        mediaSequence += 1;
        newTarget = `media/khai-toan-${mediaSequence}${extension}`;
      }
      mainZip.file(`word/${newTarget}`, await sourceFile.async('nodebuffer'));
      copiedMediaExtensions.add(extension.replace(/^\./, '').toLowerCase());
    } else if (!targetMode) {
      // Body-level relationships other than media (footnotes, comments,
      // embedded objects...) need a deeper package merge. Keep text/table
      // content safe and skip unsupported relationship types.
      continue;
    }

    attachmentBody = attachmentBody.replace(
      new RegExp(
        `(r:[\\w.-]+=")${escapeRegex(id)}(")`,
        'g',
      ),
      `$1${newId}$2`,
    );
    const mode = targetMode ? ` TargetMode="${targetMode}"` : '';
    mainRels = appendRelationship(
      mainRels,
      `<Relationship Id="${newId}" Type="${type}" Target="${newTarget}"${mode}/>`
    );
  }

  // Copy media MIME declarations and the numbering override into the package's
  // content type registry when the destination did not already have them.
  const mainContentTypesFile = mainZip.file('[Content_Types].xml');
  const attachmentContentTypesFile = attachmentZip.file('[Content_Types].xml');
  if (mainContentTypesFile) {
    let mainContentTypes = await mainContentTypesFile.async('text');
    const attachmentContentTypes = attachmentContentTypesFile
      ? await attachmentContentTypesFile.async('text')
      : '';
    for (const extension of copiedMediaExtensions) {
      if (new RegExp(`<Default\\b[^>]*Extension="${escapeRegex(extension)}"`, 'i').test(mainContentTypes)) {
        continue;
      }
      const declaration = attachmentContentTypes.match(
        new RegExp(`<Default\\b[^>]*Extension="${escapeRegex(extension)}"[^>]*/>`, 'i'),
      );
      if (declaration) {
        mainContentTypes = mainContentTypes.replace('</Types>', `${declaration[0]}</Types>`);
      }
    }
    if (
      mainZip.file('word/numbering.xml')
      && !mainContentTypes.includes('PartName="/word/numbering.xml"')
    ) {
      mainContentTypes = mainContentTypes.replace(
        '</Types>',
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>',
      );
    }
    mainZip.file('[Content_Types].xml', mainContentTypes);
  }

  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  const attachmentSlot = Array.from(
    mainDocument.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g),
  ).find((paragraph) => paragraphText(paragraph[0]).includes('__KHAI_TOAN_SLOT__'));
  if (attachmentSlot) {
    mainDocument = mainDocument.slice(0, attachmentSlot.index!)
      + attachmentBody
      + mainDocument.slice(attachmentSlot.index! + attachmentSlot[0].length);
  } else {
    const mainSectPr = mainDocument.match(/<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>\s*<\/w:body>/);
    if (mainSectPr) {
      mainDocument = mainDocument.replace(
        mainSectPr[0],
        `${pageBreak}${attachmentBody}${mainSectPr[0]}`,
      );
    } else {
      mainDocument = mainDocument.replace('</w:body>', `${pageBreak}${attachmentBody}</w:body>`);
    }
  }

  mainZip.file('word/document.xml', mainDocument);
  mainZip.file(relPath, mainRels);
  return Buffer.from(await mainZip.generateAsync({ type: 'nodebuffer' }));
}
