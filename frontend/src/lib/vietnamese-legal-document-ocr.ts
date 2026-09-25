import type { LegalDocumentInput } from './legal-document-api';

export type LegalDocumentOcrFields = Partial<LegalDocumentInput>;

export interface LegalDocumentOcrResult {
  fields: LegalDocumentOcrFields;
  normalizedText: string;
  warnings: string[];
  matchedFields: Array<keyof LegalDocumentInput>;
}

const DOCUMENT_TYPES = [
  'Nghị quyết',
  'Nghị định',
  'Quyết định',
  'Thông tư liên tịch',
  'Thông tư',
  'Chỉ thị',
  'Pháp lệnh',
  'Công văn',
  'Thông báo',
  'Quy chế',
  'Kế hoạch',
  'Luật',
] as const;

const ISSUERS: Array<[string, string]> = [
  ['THU TUONG CHINH PHU', 'Thủ tướng Chính phủ'],
  ['UY BAN THUONG VU QUOC HOI', 'Ủy ban Thường vụ Quốc hội'],
  ['CHINH PHU', 'Chính phủ'],
  ['QUOC HOI', 'Quốc hội'],
  ['KIEM TOAN NHA NUOC', 'Kiểm toán Nhà nước'],
  ['NGAN HANG NHA NUOC VIET NAM', 'Ngân hàng Nhà nước Việt Nam'],
  ['BO TAI CHINH', 'Bộ Tài chính'],
  ['BO KE HOACH VA DAU TU', 'Bộ Kế hoạch và Đầu tư'],
  ['BO XAY DUNG', 'Bộ Xây dựng'],
  ['BO TU PHAP', 'Bộ Tư pháp'],
  ['BO GIAO DUC VA DAO TAO', 'Bộ Giáo dục và Đào tạo'],
  ['BO Y TE', 'Bộ Y tế'],
  ['BO CONG THUONG', 'Bộ Công Thương'],
  ['BO NOI VU', 'Bộ Nội vụ'],
  ['BO TAI NGUYEN VA MOI TRUONG', 'Bộ Tài nguyên và Môi trường'],
];

const FIELD_LABELS = new Set([
  'co quan ban hanh',
  'so hieu',
  'ngay ban hanh',
  'hinh thuc van ban',
  'trich yeu noi dung',
  'linh vuc',
]);

const STOP_TITLE_PREFIXES = [
  'dieu 1',
  'chuong i',
  'noi nhan',
  'tm.',
  'kt.',
  'pp.',
  'thu truong',
  'bo truong',
  'chu tich',
];

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCase(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
  return normalized
    ? normalized.charAt(0).toLocaleUpperCase('vi') + normalized.slice(1)
    : '';
}

function cleanOcrLine(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[|_]+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCommonVietnameseOcrErrors(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\bquy định chỉ tiết\b/gi, 'Quy định chi tiết')
    .replace(/\bluật đầu thầu\b/gi, 'Luật Đấu thầu')
    .replace(/\bsửa đối\b/gi, 'Sửa đổi')
    .replace(/\bb[ồổ] sung\b/gi, 'bổ sung')
    .replace(/\bđầu thầu\b/gi, 'đấu thầu')
    .replace(/\bnghiệp vu\b/gi, 'nghiệp vụ')
    .replace(/\bchuyên m[oô]n\b/gi, 'chuyên môn')
    .replace(/\bchứng chi\b/gi, 'chứng chỉ');
}

function isFieldLabel(value: string): boolean {
  return FIELD_LABELS.has(fold(value).toLocaleLowerCase('en'));
}

function isHeaderNoise(value: string): boolean {
  const normalized = fold(value);
  return (
    !normalized ||
    isFieldLabel(value) ||
    normalized.includes('CONG HOA XA HOI CHU NGHIA VIET NAM') ||
    normalized.includes('DOC LAP - TU DO - HANH PHUC') ||
    normalized.includes('DOC LAP – TU DO – HANH PHUC')
  );
}

function normalizeDocumentNumber(value: string): string {
  const compact = value
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/[–—]/g, '-')
    .toUpperCase();
  const parts = compact.split('/');

  const normalizeDigits = (part: string) =>
    part.replace(/[OQ]/g, '0').replace(/[IL]/g, '1');
  if (parts.length < 3) {
    return [normalizeDigits(parts[0]), ...parts.slice(1)].join('/');
  }
  const suffix = parts
    .slice(2)
    .join('/')
    .replace(/^ND-CP$/, 'NĐ-CP')
    .replace(/^QD-TTG$/, 'QĐ-TTG')
    .replace(/^QD-UBND$/, 'QĐ-UBND');

  return `${normalizeDigits(parts[0])}/${normalizeDigits(parts[1])}/${suffix}`;
}

function extractDocumentNumber(text: string): string {
  const patterns = [
    /(?:S[oốôóòỏõọơớờởỡợ]|5[oố])\s*[:：.]?\s*([0-9OQIL]{1,6}\s*\/\s*(?:[0-9OQIL]{4}\s*\/\s*)?[A-Za-zÀ-ỹĐđ0-9\-–—]{2,})/i,
    /\b([0-9OQIL]{1,6}\s*\/\s*(?:[0-9OQIL]{4}\s*\/\s*)[A-Za-zÀ-ỹĐđ0-9\-–—]{2,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeDocumentNumber(match[1]);
  }
  return '';
}

function toIsoDate(dayValue: string, monthValue: string, yearValue: string) {
  const day = Number(dayValue.replace(/[OQ]/gi, '0').replace(/[IL]/gi, '1'));
  const month = Number(
    monthValue.replace(/[OQ]/gi, '0').replace(/[IL]/gi, '1'),
  );
  const year = Number(
    yearValue.replace(/[OQ]/gi, '0').replace(/[IL]/gi, '1'),
  );
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    year < 1900 ||
    year > 2200 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractIssueDate(text: string): string {
  const normalized = fold(text);
  const longDate = normalized.match(
    /NGAY\s*([0-9OQIL]{1,2})\s*THANG\s*([0-9OQIL]{1,2})\s*NAM\s*([0-9OQIL]{4})/i,
  );
  if (longDate) return toIsoDate(longDate[1], longDate[2], longDate[3]);

  const numericDate = normalized.match(
    /\b([0-9OQIL]{1,2})\s*[./-]\s*([0-9OQIL]{1,2})\s*[./-]\s*([0-9OQIL]{4})\b/,
  );
  return numericDate
    ? toIsoDate(numericDate[1], numericDate[2], numericDate[3])
    : '';
}

function extractDocumentType(lines: string[], text: string): string {
  for (const type of DOCUMENT_TYPES) {
    const expected = fold(type);
    if (
      lines.some((line) => {
        const normalized = fold(line);
        return (
          normalized === expected ||
          (normalized.includes(expected) && normalized.length <= expected.length + 24)
        );
      })
    ) {
      return type;
    }
  }

  const flat = fold(text);
  return (
    DOCUMENT_TYPES.find((type) =>
      new RegExp(`(^|\\s)${fold(type)}(?=\\s|$)`).test(flat),
    ) || ''
  );
}

function extractIssuer(lines: string[], text: string): string {
  const topText = fold(lines.slice(0, 10).join(' '));
  for (const [expected, canonical] of ISSUERS) {
    if (topText.includes(expected)) return canonical;
  }

  const genericMinistry = lines.slice(0, 8).find((line) => {
    const normalized = fold(line);
    return (
      /^BO [A-Z ]{3,60}$/.test(normalized) &&
      !normalized.includes('CONG HOA') &&
      !normalized.includes('BAN HANH')
    );
  });
  if (genericMinistry) return sentenceCase(genericMinistry);

  const beforeNumber = lines.slice(
    0,
    Math.max(
      1,
      lines.findIndex((line) => /[0-9]{1,4}\s*\//.test(line)),
    ),
  );
  const candidate = beforeNumber.find((line) => {
    const normalized = fold(line);
    return (
      normalized.length >= 3 &&
      normalized.length <= 80 &&
      !isHeaderNoise(line) &&
      !normalized.startsWith('SO:') &&
      !normalized.includes('NGAY ')
    );
  });

  return candidate ? sentenceCase(candidate) : '';
}

function isTitleNoise(
  line: string,
  documentType: string,
  documentNumber: string,
  issuer: string,
): boolean {
  const normalized = fold(line);
  return (
    isHeaderNoise(line) ||
    normalized === fold(documentType) ||
    normalized === fold(issuer) ||
    normalized.includes('NGAY BAN HANH') ||
    normalized.includes('HINH THUC VAN BAN') ||
    normalized.includes('TRICH YEU NOI DUNG') ||
    /^SO\s*:/.test(normalized) ||
    (!!documentNumber && normalized.includes(fold(documentNumber))) ||
    /NGAY\s+[0-9OQIL]{1,2}\s+THANG\s+[0-9OQIL]{1,2}\s+NAM\s+[0-9OQIL]{4}/.test(
      normalized,
    )
  );
}

function extractSummary(
  lines: string[],
  documentType: string,
  documentNumber: string,
  issuer: string,
): string {
  const typeFolded = fold(documentType);
  let typeIndex = lines.findIndex((line) => fold(line) === typeFolded);
  if (typeIndex < 0) {
    typeIndex = lines.findIndex(
      (line) =>
        typeFolded &&
        fold(line).includes(typeFolded) &&
        fold(line).length <= typeFolded.length + 80,
    );
  }

  const startIndex = typeIndex >= 0 ? typeIndex : 0;
  const collected: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    let line = lines[index];
    const normalized = fold(line);

    if (
      index > startIndex &&
      STOP_TITLE_PREFIXES.some((prefix) =>
        normalized.toLocaleLowerCase('en').startsWith(prefix),
      )
    ) {
      break;
    }
    if (isTitleNoise(line, documentType, documentNumber, issuer)) continue;

    if (index === startIndex && typeFolded && normalized.includes(typeFolded)) {
      line = line
        .replace(new RegExp(documentType, 'i'), '')
        .replace(/^[:\-–—.\s]+/, '')
        .trim();
      if (!line) continue;
    }

    if (line.length >= 4) collected.push(line);
  }

  return normalizeCommonVietnameseOcrErrors(
    collected
      .join(' ')
      .replace(/([A-Za-zÀ-ỹĐđ])-\s+([A-Za-zÀ-ỹĐđ])/g, '$1$2')
      .replace(/\s+/g, ' ')
      .replace(/^[,.;:\-–—\s]+|[,;:\-–—\s]+$/g, '')
      .trim(),
  );
}

function inferField(summary: string): string {
  const normalized = fold(summary);
  const rules: Array<[RegExp, string]> = [
    [/\b(DAU THAU|LUA CHON NHA THAU|LUA CHON NHA DAU TU)\b/, 'Đấu thầu'],
    [/\bDAT DAI\b/, 'Đất đai'],
    [/\bXAY DUNG\b/, 'Xây dựng'],
    [/\bDAU TU CONG\b/, 'Đầu tư công'],
    [/\b(NGAN SACH|TAI CHINH|KE TOAN)\b/, 'Tài chính - Ngân sách'],
    [/\bGIAO DUC\b/, 'Giáo dục'],
    [/\bY TE\b/, 'Y tế'],
    [/\b(XUAT BAN|IN SACH)\b/, 'Xuất bản'],
    [/\bMOI TRUONG\b/, 'Tài nguyên - Môi trường'],
  ];
  return rules.find(([pattern]) => pattern.test(normalized))?.[1] || '';
}

function suggestName(
  documentType: string,
  documentNumber: string,
  summary: string,
): string {
  if (!documentType && !documentNumber) return '';
  const prefix = [documentType, documentNumber ? `số ${documentNumber}` : '']
    .filter(Boolean)
    .join(' ');
  if (!summary) return prefix;
  const shortSummary =
    summary.length > 140 ? `${summary.slice(0, 137).trim()}...` : summary;
  return `${prefix} - ${shortSummary}`;
}

export function parseVietnameseLegalDocumentOcr(
  rawText: string,
): LegalDocumentOcrResult {
  const normalizedText = rawText
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const lines = normalizedText
    .split('\n')
    .map(cleanOcrLine)
    .filter(Boolean);

  const soHieu = extractDocumentNumber(normalizedText);
  const ngayBanHanh = extractIssueDate(normalizedText);
  const hinhThucVanBan = extractDocumentType(lines, normalizedText);
  const coQuanBanHanh = extractIssuer(lines, normalizedText);
  const trichYeuNoiDung = extractSummary(
    lines,
    hinhThucVanBan,
    soHieu,
    coQuanBanHanh,
  );
  const linhVuc = inferField(trichYeuNoiDung);
  const tenCanCu = suggestName(hinhThucVanBan, soHieu, trichYeuNoiDung);

  const candidates: LegalDocumentInput = {
    tenCanCu,
    soHieu,
    coQuanBanHanh,
    hinhThucVanBan,
    linhVuc,
    trichYeuNoiDung,
    ngayBanHanh,
  };
  const fields = Object.fromEntries(
    Object.entries(candidates).filter(([, value]) => value),
  ) as LegalDocumentOcrFields;
  const matchedFields = Object.keys(fields) as Array<keyof LegalDocumentInput>;
  const warnings: string[] = [];

  if (!soHieu) warnings.push('Chưa nhận diện được số hiệu văn bản.');
  if (!ngayBanHanh) warnings.push('Chưa nhận diện được ngày ban hành.');
  if (!coQuanBanHanh) warnings.push('Chưa nhận diện được cơ quan ban hành.');
  if (!hinhThucVanBan) warnings.push('Chưa nhận diện được hình thức văn bản.');
  if (!trichYeuNoiDung) warnings.push('Chưa nhận diện được trích yếu nội dung.');
  if (!linhVuc) {
    warnings.push('Chưa suy luận được lĩnh vực; Admin cần chọn hoặc nhập lại.');
  }

  return { fields, normalizedText, warnings, matchedFields };
}

export function mergeVietnameseLegalDocumentOcrResults(
  primary: LegalDocumentOcrResult,
  supplemental: LegalDocumentOcrResult,
): LegalDocumentOcrResult {
  const fields: LegalDocumentOcrFields = {
    ...supplemental.fields,
    ...primary.fields,
  };

  // The sparse pass focuses on the document header and is especially useful
  // when handwritten digits are mixed into an otherwise printed document.
  if (supplemental.fields.soHieu) {
    fields.soHieu = supplemental.fields.soHieu;
  }
  if (supplemental.fields.ngayBanHanh) {
    fields.ngayBanHanh = supplemental.fields.ngayBanHanh;
  }
  fields.tenCanCu = suggestName(
    fields.hinhThucVanBan || '',
    fields.soHieu || '',
    fields.trichYeuNoiDung || '',
  );

  const matchedFields = Object.entries(fields)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key as keyof LegalDocumentInput);
  const warnings: string[] = [];
  if (!fields.soHieu) warnings.push('Chưa nhận diện được số hiệu văn bản.');
  if (!fields.ngayBanHanh) warnings.push('Chưa nhận diện được ngày ban hành.');
  if (!fields.coQuanBanHanh) {
    warnings.push('Chưa nhận diện được cơ quan ban hành.');
  }
  if (!fields.hinhThucVanBan) {
    warnings.push('Chưa nhận diện được hình thức văn bản.');
  }
  if (!fields.trichYeuNoiDung) {
    warnings.push('Chưa nhận diện được trích yếu nội dung.');
  }
  if (!fields.linhVuc) {
    warnings.push('Chưa suy luận được lĩnh vực; Admin cần chọn hoặc nhập lại.');
  }

  return {
    fields,
    matchedFields,
    warnings,
    normalizedText: [
      primary.normalizedText,
      supplemental.normalizedText
        ? `--- OCR bổ sung vùng đầu trang ---\n${supplemental.normalizedText}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
