import { ContractPackageType } from '@prisma/client';
import {
  listDocxPlaceholders,
  prepareWorkflowTemplateData,
  renderDocxTemplate,
  resolveFileMauPath,
} from '../utils/docx-template-renderer';

/**
 * DOCX templates are stored under FileMau/ThanhToan. Persisted step keys stay
 * unchanged so existing payment records continue to work with the new files.
 */
const PACKAGE_FOLDERS: Record<ContractPackageType, string> = {
  GOI_THAU_TU_VAN: 'ThanhToan/GoiThauTuVan',
  GOI_THAU_PHI_TU_VAN: 'ThanhToan/GoiThauPhiTuVan',
  GOI_THAU_TRIEN_KHAI: 'ThanhToan/GoiThauTrienKhai',
};

const TU_VAN_TEMPLATES: Record<string, string> = {
  ban_giao_san_pham: '1. Biên bản bàn giao.docx',
  nghiem_thu_san_pham: '2. Biên bản nghiệm thu khối lượng hoàn thành.docx',
  mau_08a: '3. Bảng xác định giá trị khối lượng công việc hoàn thành.docx',
  thanh_ly_hop_dong: '4. Biên bản nghiệm thu và thanh lý hợp đồng.docx',
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

export const TU_VAN_STEPS = [
  { stepKey: 'ban_giao_san_pham', stepOrder: 1, title: 'Biên bản bàn giao' },
  {
    stepKey: 'nghiem_thu_san_pham',
    stepOrder: 2,
    title: 'Biên bản nghiệm thu khối lượng hoàn thành',
  },
  {
    stepKey: 'mau_08a',
    stepOrder: 3,
    title: 'Bảng xác định giá trị khối lượng công việc hoàn thành',
  },
  {
    stepKey: 'thanh_ly_hop_dong',
    stepOrder: 4,
    title: 'Biên bản nghiệm thu và thanh lý hợp đồng',
  },
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
    case 'GOI_THAU_TU_VAN':
      return TU_VAN_STEPS;
    case 'GOI_THAU_PHI_TU_VAN':
      return PHI_TU_VAN_STEPS;
    case 'GOI_THAU_TRIEN_KHAI':
      return TRIEN_KHAI_STEPS;
  }
}

export type PaymentTemplateInfo = {
  templateName: string;
  templatePath: string;
};

export function getPaymentTemplateInfo(
  packageType: ContractPackageType,
  stepKey: string,
): PaymentTemplateInfo {
  const templateName = STEP_TEMPLATES[packageType]?.[stepKey];
  if (!templateName) {
    throw new Error(`Không có mẫu DOCX cho bước "${stepKey}" với loại gói thầu "${packageType}"`);
  }
  return {
    templateName,
    templatePath: resolveFileMauPath(PACKAGE_FOLDERS[packageType], templateName),
  };
}

export async function getPaymentTemplateFields(
  packageType: ContractPackageType,
  stepKey: string,
): Promise<{ templateName: string; fields: string[] }> {
  const { templateName, templatePath } = getPaymentTemplateInfo(packageType, stepKey);
  return {
    templateName,
    fields: await listDocxPlaceholders(templatePath),
  };
}

export async function generatePaymentDocx(
  packageType: ContractPackageType,
  stepKey: string,
  data: Record<string, any>,
): Promise<Buffer> {
  const { templatePath } = getPaymentTemplateInfo(packageType, stepKey);
  return renderDocxTemplate(
    templatePath,
    prepareWorkflowTemplateData(data || {}),
    { legalBasisStandaloneOnly: true },
  );
}
