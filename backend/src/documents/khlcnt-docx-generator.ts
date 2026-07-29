import {
  listDocxPlaceholders,
  renderDocxTemplate,
  resolveFileMauPath,
} from '../utils/docx-template-renderer';

const TEMPLATES = {
  COVER_KHLCNT: '1. Mẫu phiếu trình ký phê duyệt KHGDCBDT.docx',
  TT_KHLCNT: '2. Tờ trình phê duyệt KHLCNT.docx',
  QD_KHLCNT: '3. Quyết định phê duyệt KHLCNT.docx',
} as const;

export async function generateKhlcntCoverDocx(
  data: Record<string, any>,
): Promise<Buffer> {
  return renderDocxTemplate(
    resolveFileMauPath('KHLCNT', TEMPLATES.COVER_KHLCNT),
    data,
  );
}

export async function generateKhlcntDocx(
  docType: Exclude<keyof typeof TEMPLATES, 'COVER_KHLCNT'>,
  data: Record<string, any>,
): Promise<Buffer> {
  const templatePath = resolveFileMauPath('KHLCNT', TEMPLATES[docType]);
  return renderDocxTemplate(templatePath, data, {
    repeatTableRows: true,
    repeatParagraphs: docType === 'TT_KHLCNT'
      ? [
        { contains: '- Gói thầu {{TenGoiThau}}' },
        { contains: '- Chi phí {{TenGoiThau}}' },
      ]
      : [],
  });
}

export async function getKhlcntTemplateFields(
  docType: Exclude<keyof typeof TEMPLATES, 'COVER_KHLCNT'>,
): Promise<string[]> {
  return listDocxPlaceholders(
    resolveFileMauPath('KHLCNT', TEMPLATES[docType]),
  );
}
