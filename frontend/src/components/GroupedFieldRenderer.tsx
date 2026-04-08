'use client';

import { SmartFormField, FieldDef } from './SmartFormField';

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
  formData: Record<string, string>;
  autoFillData?: Record<string, any>;
  canEdit: boolean;
  onChange: (key: string, val: string) => void;
  onFormDataChange?: (data: Record<string, string>) => void;
}) {
  const chungFields: FieldDef[] = [];
  const cdtFields: FieldDef[] = [];
  const ntFields: FieldDef[] = [];

  for (const field of fields) {
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
          value={formData[field.key] || ''}
          onChange={onChange}
          disabled={!canEdit}
          isAutoFilled={!!autoFillData?.[field.key]}
          formData={formData}
          onFormDataChange={onFormDataChange}
        />
      ))}
    </div>
  );

  if (!hasGroups) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin bước</h2>
        {renderFields(fields)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chungFields.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Thông tin chung</h2>
          {renderFields(chungFields)}
        </div>
      )}
      {cdtFields.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-blue-500">
          <h2 className="text-lg font-semibold text-blue-700 mb-4">🏛 Thông tin Chủ đầu tư</h2>
          {renderFields(cdtFields)}
        </div>
      )}
      {ntFields.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-amber-500">
          <h2 className="text-lg font-semibold text-amber-700 mb-4">🏢 Thông tin Nhà thầu</h2>
          {renderFields(ntFields)}
        </div>
      )}
    </div>
  );
}
