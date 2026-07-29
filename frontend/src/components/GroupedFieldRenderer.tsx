'use client';

import { SmartFormField, FieldDef } from './SmartFormField';
import { LegalBasisField } from './LegalBasisField';
import { WorkflowFormSection } from './WorkflowDocumentUI';
import { normalizeLegalBasisValue } from '@/lib/workflow-template-api';

// Auto-detect group for a field based on its key name
const CDT_PATTERNS = [
  /ChuDauTu/i, /CDT/i, /CĐT/i,
  /DaiDienChuDauTu/i, /ChucVuDaiDienChuDauTu/i,
  /DiaChiChuDauTu/i, /SoDienThoaiChuDauTu/i, /DienThoaiChuDauTu/i,
  /SoTaiKhoanChuDauTu/i, /NganHangChuDauTu/i, /MaSoNganHangChuDauTu/i,
  /MaSoThueChuDauTu/i, /ThongTinTaiKhoanChuDauTu/i,
  /TenVietTatChuDauTu/i, /SoLuongBBNTCuaChuDauTu/i,
  /SoLuongHDCuaChuDauTu/i,
  /^TenChuDauTu$/i,
];

const NT_PATTERNS = [
  /NhaThau(?!.*ChuDauTu)/i, /^DaiDienNhaThau$/i, /ChucVuDaiDienNhaThau/i,
  /DiaChiNhaThau/i, /SoDienThoaiNhaThau/i, /DienThoaiNhaThau/i,
  /SoTaiKhoanNhaThau/i, /NganHangNhaThau/i, /MaSoNganHangNhaThau/i,
  /MaSoThueNhaThau/i, /ThongTinTaiKhoanNhaThau/i,
  /TenVietTatNhaThau/i, /DanhSachNhaThauPhu/i,
  /SoLuongBBNTCuaNhaThau/i, /SoLuongHDCuaNhaThau/i,
  /^NhaThauTrienKhai$/i, /^TenNhaThau$/i,
  /^SoTaiKhoanNT$/i, /^NganHangNT$/i, /^MaNganHangNT$/i,
  /^SoTaiKhoan$/i, /^DaiDienBGNhaThau$/i,
  /TenDaiDienBGNhaThau/i, /ChucVuDaiDienBGNhaThau/i,
];

function detectGroup(field: FieldDef): 'cdt' | 'nt' | 'chung' {
  if (field.group) return field.group;
  const key = field.key;
  // NT patterns checked first (more specific)
  if (NT_PATTERNS.some(p => p.test(key))) return 'nt';
  if (CDT_PATTERNS.some(p => p.test(key))) return 'cdt';
  return 'chung';
}

export function GroupedFieldRenderer({
  fields,
  formData,
  autoFillData,
  canEdit,
  onChange,
  onFormDataChange,
}: {
  fields: FieldDef[];
  formData: Record<string, any>;
  autoFillData?: Record<string, any>;
  canEdit: boolean;
  onChange: (key: string, val: any) => void;
  onFormDataChange?: (data: Record<string, any>) => void;
}) {
  const chungFields: FieldDef[] = [];
  const cdtFields: FieldDef[] = [];
  const ntFields: FieldDef[] = [];
  const legalFields: FieldDef[] = [];

  for (const field of fields) {
    if (field.key === 'CanCu') {
      legalFields.push(field);
      continue;
    }
    const g = detectGroup(field);
    if (g === 'cdt') cdtFields.push(field);
    else if (g === 'nt') ntFields.push(field);
    else chungFields.push(field);
  }

  const hasGroups = cdtFields.length > 0 || ntFields.length > 0;

  const renderFields = (flds: FieldDef[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {flds.map(field => (
        <SmartFormField
          key={field.key}
          field={field}
          value={String(formData[field.key] ?? '')}
          onChange={onChange}
          disabled={!canEdit}
          isAutoFilled={!!autoFillData?.[field.key]}
          formData={formData as Record<string, string>}
          onFormDataChange={onFormDataChange}
        />
      ))}
    </div>
  );

  let sectionIndex = 0;
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const sectionTitle = (title: string) =>
    `${roman[sectionIndex++]}. ${title}`;
  const chungTitle = sectionTitle(
    hasGroups ? 'Thông tin chung' : 'Thông tin văn bản',
  );
  const legalTitle =
    legalFields.length > 0 ? sectionTitle('Căn cứ pháp lý') : '';
  const cdtTitle =
    cdtFields.length > 0 ? sectionTitle('Thông tin Chủ đầu tư') : '';
  const ntTitle =
    ntFields.length > 0 ? sectionTitle('Thông tin Nhà thầu') : '';

  return (
    <div className="space-y-4">
      {chungFields.length > 0 && (
        <WorkflowFormSection title={chungTitle}>
          {renderFields(chungFields)}
        </WorkflowFormSection>
      )}
      {legalFields.length > 0 && (
        <WorkflowFormSection
          title={legalTitle}
          description="Mục này chỉ hiển thị khi file mẫu có biến {{CanCu}}."
        >
          <LegalBasisField
            label="Danh sách căn cứ"
            value={normalizeLegalBasisValue(formData.CanCu)}
            onChange={(value) => onChange('CanCu', value)}
            disabled={!canEdit}
          />
        </WorkflowFormSection>
      )}
      {cdtFields.length > 0 && (
        <WorkflowFormSection title={cdtTitle}>
          {renderFields(cdtFields)}
        </WorkflowFormSection>
      )}
      {ntFields.length > 0 && (
        <WorkflowFormSection title={ntTitle}>
          {renderFields(ntFields)}
        </WorkflowFormSection>
      )}
    </div>
  );
}
