const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock the service method logic
async function getAutoFillData(selectionId, nextStepKey, procurementMethod) {
  const AUTO_FILL_MAPPINGS = {
    CHAO_HANG_CANH_TRANH: [
      {
        fromStep: 'to_trinh_hsmt',
        toStep: 'quyet_dinh_hsmt',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
          'DaiDienChuDauTu', 'TenCacVanBanPhapLyLienQuan', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'LoaiHopDong', 'ThoiGianThucHienGoiThau'],
      },
      {
        fromStep: 'quyet_dinh_hsmt',
        toStep: 'to_trinh_kqlcnt',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
          'GiaGoiThauBangSo', 'NguonVon', 'DaiDienChuDauTu', 'ChucVuDaiDienChuDauTu',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
          'LoaiHopDong', 'ThoiGianThucHienGoiThau',
          'HinhThucPhuongThucLuaChonNhaThau', 'TuyChonMuaThem',
          'ThoiGianToChucLuaChonNhaThau', 'ThoiGianBatDauToChucLuaChonNhaThau'],
      },
      {
        fromStep: 'to_trinh_kqlcnt',
        toStep: 'quyet_dinh_lcnt',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenNhaThauTrungThau', 'MaSoThueNhaThau',
          'GiaDuThau', 'GiaTrungThau', 'LoaiHopDong', 'TenKeHoachLuaChonNhaThau',
          'DaiDienChuDauTu', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
          'ThoiGianThucHienGoiThau', 'ThoiGianThucHienHD',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
          'HinhThucLuaChonNhaThau', 'NguonVon'],
      },
      {
        fromStep: 'quyet_dinh_lcnt',
        toStep: 'hop_dong',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'TenKeHoachLuaChonNhaThau',
          'GiaHDBangSo', 'GiaHDBangChu', 'LoaiHopDong', 'DaiDienChuDauTu',
          'ChucVuDaiDienChuDauTu', 'MaSoThueNhaThau', 'ThoiGianThucHienHD',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'GiaTrungThau',
          'TenNhaThauTrungThau', 'GiaGoiThauBangSo'],
      },
    ],
    DAU_THAU_RONG_RAI: [
      {
        fromStep: 'to_trinh_hsmt',
        toStep: 'quyet_dinh_hsmt',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
          'DaiDienChuDauTu', 'TenCacVanBanPhapLyLienQuan', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'LoaiHopDong', 'ThoiGianThucHienGoiThau'],
      },
      {
        fromStep: 'quyet_dinh_hsmt',
        toStep: 'to_trinh_kqlcnt',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
          'GiaGoiThauBangSo', 'NguonVon', 'DaiDienChuDauTu', 'ChucVuDaiDienChuDauTu',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
          'LoaiHopDong', 'ThoiGianThucHienGoiThau',
          'HinhThucPhuongThucLuaChonNhaThau', 'TuyChonMuaThem',
          'ThoiGianToChucLuaChonNhaThau', 'ThoiGianBatDauToChucLuaChonNhaThau'],
      },
      {
        fromStep: 'to_trinh_kqlcnt',
        toStep: 'quyet_dinh_lcnt',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenNhaThauTrungThau', 'MaSoThueNhaThau',
          'GiaDuThau', 'GiaTrungThau', 'LoaiHopDong', 'TenKeHoachLuaChonNhaThau',
          'DaiDienChuDauTu', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
          'ThoiGianThucHienGoiThau', 'ThoiGianThucHienHD',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
          'HinhThucLuaChonNhaThau', 'NguonVon'],
      },
      {
        fromStep: 'quyet_dinh_lcnt',
        toStep: 'hop_dong',
        fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'TenKeHoachLuaChonNhaThau',
          'GiaHDBangSo', 'GiaHDBangChu', 'LoaiHopDong', 'DaiDienChuDauTu',
          'ChucVuDaiDienChuDauTu', 'MaSoThueNhaThau', 'ThoiGianThucHienHD',
          'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'GiaTrungThau',
          'TenNhaThauTrungThau', 'GiaGoiThauBangSo'],
      },
    ],
  };

  const mappings = AUTO_FILL_MAPPINGS[procurementMethod] || [];
  const autoFill = {};

  const selection = await prisma.contractorSelection.findUnique({
    where: { id: selectionId },
    include: { qdKhlcnt: { select: { data: true } } },
  });

  if (selection) {
    const goiThauData = selection.data || {};
    const qdData = selection.qdKhlcnt?.data || {};

    const khlcntMapping = {
      DiaDanh: qdData.diaDanh || goiThauData.diaDanh || '',
      TenDuAn: qdData.tenDuAn || '',
      TenGoiThau: goiThauData.tenGoiThau || selection.tenGoiThau || '',
      ChuDauTu: qdData.chuDauTu || goiThauData.tenChuDauTu || '',
      TenChuDauTu: qdData.chuDauTu || goiThauData.tenChuDauTu || '',
      NguonVon: goiThauData.nguonVon || qdData.nguonVon || '',
      LoaiHopDong: goiThauData.loaiHopDong || '',
      ThoiGianThucHienGoiThau: goiThauData.thoiGianThucHien || '',
      ThoiGianToChucLuaChonNhaThau: goiThauData.thoiGianToChuc || '',
      ThoiGianBatDauToChucLuaChonNhaThau: goiThauData.thoiGianBatDau || '',
      HinhThucPhuongThucLuaChonNhaThau: goiThauData.hinhThucLuaChon || '',
      HinhThucLuaChonNhaThau: goiThauData.hinhThucLuaChon || '',
      TuyChonMuaThem: goiThauData.tuyChonMuaThem || '',
      GiaGoiThauBangSo: goiThauData.giaGoiThau ? String(goiThauData.giaGoiThau) : '',
      DonViTrinh: qdData.donViTrinh || '',
      TenKeHoachLuaChonNhaThau: qdData.tenDuAn ? `KH LCNT - ${qdData.tenDuAn}` : '',
      TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau: qdData.soQuyetDinh ? `QĐ số ${qdData.soQuyetDinh}` : '',
      CanCuVanBanPhapLy: (qdData.canCuPhapLy || []).join('; '),
      TenCacVanBanPhapLyLienQuan: (qdData.canCuPhapLy || []).join('; '),
    };

    for (const [key, value] of Object.entries(khlcntMapping)) {
      if (value) autoFill[key] = value;
    }
  }

  for (const mapping of mappings) {
    if (mapping.toStep === nextStepKey) {
      const prevStep = mapping.fromStep;
      const step = await prisma.procurementStep.findFirst({
        where: { contractorSelectionId: selectionId, stepKey: prevStep },
      });
      if (step && step.data) {
        const data = step.data;
        for (const field of mapping.fields) {
          if (data[field]) {
            autoFill[field] = data[field];
          }
        }
      }
    }
  }

  return autoFill;
}

async function run() {
  const selectionId = 'd4ed171c-adb8-40f9-a642-3b1acc5bac5a';
  const result = await getAutoFillData(selectionId, 'to_trinh_hsmt', 'DAU_THAU_RONG_RAI');
  console.log('--- Resolved AutoFill ---');
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
