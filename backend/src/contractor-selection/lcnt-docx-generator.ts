import { ProcurementMethod } from '@prisma/client';
import {
  listDocxPlaceholders,
  prepareWorkflowTemplateData,
  renderDocxTemplate,
  resolveFileMauPath,
} from '../utils/docx-template-renderer';

/**
 * Template-based DOCX generator for contractor-selection steps.
 *
 * The step keys are intentionally kept stable because they are persisted in
 * ProcurementStep records. Only the physical template names changed.
 */
const METHOD_FOLDERS: Record<ProcurementMethod, string> = {
  CHI_DINH_THAU: 'ChiDinhThau',
  CHAO_HANG_CANH_TRANH: 'ChaoHangCanhTranh',
  DAU_THAU_RONG_RAI: 'DauThauRongRai',
};

const STEP_TEMPLATES: Record<ProcurementMethod, Record<string, string>> = {
  CHI_DINH_THAU: {
    thu_moi_hoan_thien: '1. Thư mời tham gia thương thảo hợp đồng.docx',
    bien_ban_hoan_thien: '2. Biên bản thương thảo hợp đồng.docx',
    to_trinh_kqlcnt: '3. Tờ trình phê duyệt kết quả lựa chọn nhà thầu.docx',
    quyet_dinh_kqlcnt: '4. Quyết định phê duyệt kết quả lựa chọn nhà thầu.docx',
    hop_dong: '5. Hợp đồng.docx',
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

export type ContractorSelectionTemplateInfo = {
  templateName: string;
  templatePath: string;
};

export function isAttachmentOnlyStep(stepKey: string): boolean {
  return ATTACHMENT_ONLY_STEPS.has(stepKey);
}

export function getContractorSelectionTemplateInfo(
  method: ProcurementMethod,
  stepKey: string,
): ContractorSelectionTemplateInfo {
  if (isAttachmentOnlyStep(stepKey)) {
    throw new Error(`Bước "${stepKey}" chỉ hỗ trợ đính kèm file, không có mẫu DOCX.`);
  }

  const templateName = STEP_TEMPLATES[method]?.[stepKey];
  if (!templateName) {
    throw new Error(`Không có mẫu DOCX cho bước "${stepKey}" với hình thức "${method}"`);
  }

  return {
    templateName,
    templatePath: resolveFileMauPath(METHOD_FOLDERS[method], templateName),
  };
}

export async function getContractorSelectionTemplateFields(
  method: ProcurementMethod,
  stepKey: string,
): Promise<{ templateName: string; fields: string[] }> {
  const { templateName, templatePath } = getContractorSelectionTemplateInfo(method, stepKey);
  return {
    templateName,
    fields: await listDocxPlaceholders(templatePath),
  };
}

export async function generateContractorSelectionDocx(
  method: ProcurementMethod,
  stepKey: string,
  data: Record<string, any>,
): Promise<Buffer> {
  const { templatePath } = getContractorSelectionTemplateInfo(method, stepKey);
  return renderDocxTemplate(
    templatePath,
    prepareWorkflowTemplateData(data || {}),
    { legalBasisStandaloneOnly: true },
  );
}
