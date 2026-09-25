import {
  listDocxPlaceholders,
  renderDocxTemplate,
  resolveFileMauPath,
} from '../utils/docx-template-renderer';

/**
 * Template registry for the Dự toán stage. Keep the filenames exact: the
 * user's DOCX files intentionally contain numeric prefixes and, for the
 * decision, a space before `.docx`.
 */
const TEMPLATES = {
  COVER_DUTOAN: '0.Mau phiếu trình ký phê duyệt dự toán.docx',
  TT_DUTOAN: '1. Tờ trình phê duyệt Dự toán - Chuẩn bị đầu tư.docx',
  QD_DUTOAN: '2. Quyết định phê duyệt Dự toán .docx',
} as const;

export async function generateDuToanCoverDocx(
  data: Record<string, any>,
): Promise<Buffer> {
  return renderDocxTemplate(
    resolveFileMauPath('DuToan', TEMPLATES.COVER_DUTOAN),
    data,
  );
}

export async function generateDuToanDocx(
  docType: Exclude<keyof typeof TEMPLATES, 'COVER_DUTOAN'>,
  data: Record<string, any>,
): Promise<Buffer> {
  const templatePath = resolveFileMauPath('DuToan', TEMPLATES[docType]);
  const attachment = data?.khaiToanAttachment ?? data?._khaiToanAttachment;
  const renderData = attachment?.objectPath
    ? { ...data, FileKhaiToanDinhKem: '__KHAI_TOAN_SLOT__' }
    : data;
  return renderDocxTemplate(templatePath, renderData, {
    repeatTableRows: docType === 'TT_DUTOAN',
    legalBasisStandaloneOnly: docType === 'TT_DUTOAN',
    repeatParagraphs: docType === 'TT_DUTOAN'
      ? [{ contains: '- Chi phí {{TenGoiThau}}' }]
      : [],
  });
}

export async function getDuToanTemplateFields(
  docType: Exclude<keyof typeof TEMPLATES, 'COVER_DUTOAN'>,
): Promise<string[]> {
  return listDocxPlaceholders(
    resolveFileMauPath('DuToan', TEMPLATES[docType]),
  );
}
