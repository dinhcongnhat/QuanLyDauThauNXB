import * as path from 'path';

const AdmZip = require('adm-zip');

function cleanXmlPlaceholders(xml: string): string {
  let result = xml;
  result = result.replace(/\{[^{}]*?\{/g, (match) => {
    const stripped = match.replace(/<[^>]*>/g, '').replace(/\s/g, '');
    return stripped === '{{' ? '{{' : match;
  });
  result = result.replace(/\}[^{}]*?\}/g, (match) => {
    const stripped = match.replace(/<[^>]*>/g, '').replace(/\s/g, '');
    return stripped === '}}' ? '}}' : match;
  });

  let output = '';
  let currentIndex = 0;
  while (true) {
    const startIndex = result.indexOf('{{', currentIndex);
    if (startIndex === -1) {
      output += result.substring(currentIndex);
      break;
    }
    output += result.substring(currentIndex, startIndex);
    const endIndex = result.indexOf('}}', startIndex);
    if (endIndex === -1) {
      output += result.substring(startIndex);
      break;
    }
    output += result
      .substring(startIndex, endIndex + 2)
      .replace(/<[^>]*>/g, '')
      .replace(/\s/g, '');
    currentIndex = endIndex + 2;
  }
  return output;
}

function replacePlaceholdersInXml(
  content: string,
  replacements: Record<string, string>,
): string {
  let result = cleanXmlPlaceholders(content);
  for (const [key, value] of Object.entries(replacements)) {
    const cleanKey = key.replace(/\s/g, '');
    const escaped = cleanKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = new RegExp(`\\{\\{${escaped}\\}\\}`, 'gi');
    const xmlValue = String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    result = result.replace(placeholder, xmlValue);
  }
  return result;
}

function generateFromTemplate(
  templateName: string,
  replacements: Record<string, string>,
): Buffer {
  const templatePath = path.resolve(
    process.env.FILEMAU_PATH || '/app/FileMau',
    'DatSach',
    templateName,
  );
  const zip = new AdmZip(templatePath);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) {
    throw new Error(`word/document.xml not found in template: ${templatePath}`);
  }
  zip.updateFile(
    'word/document.xml',
    Buffer.from(
      replacePlaceholdersInXml(entry.getData().toString('utf8'), replacements),
      'utf8',
    ),
  );
  return zip.toBuffer();
}

function dateDefaults() {
  const today = new Date();
  return {
    ngay: String(today.getDate()).padStart(2, '0'),
    thang: String(today.getMonth() + 1).padStart(2, '0'),
    nam: String(today.getFullYear()),
  };
}

export function generateGdnInDocx(
  data: Record<string, any>,
  assignments: Array<{ soLuong?: number | null }> = [],
): Buffer {
  const defaults = dateDefaults();
  const totalQuantity = assignments.reduce(
    (sum, assignment) => sum + Number(assignment.soLuong || 0),
    0,
  );
  return generateFromTemplate('giay_de_nghi_in.docx', {
    Ngay: data.ngay || data.Ngay || defaults.ngay,
    Thang: data.thang || data.Thang || defaults.thang,
    Nam: data.nam || data.Nam || defaults.nam,
    CoQuan:
      data.coQuan ||
      data.CoQuan ||
      'Nhà xuất bản Chính trị Quốc gia Sự thật',
    CanCu: data.canCu || data.CanCu || 'Quy chế làm việc của NXB',
    VeViec: data.veViec || data.VeViec || 'Đề nghị in/tái bản sách',
    TenSach: data.tenSach || data.TenSach || '',
    TacGia: data.tacGia || data.TacGia || '',
    BBT: data.bbt || data.BBT || '',
    NamXB: data.namXB || data.NamXB || '',
    SoTrang: data.soTrang || data.SoTrang || '',
    KhoSach: data.khoSach || data.KhoSach || '',
    GiaBia: data.giaBia || data.GiaBia || '',
    SoLuongTon: String(data.soLuongTon ?? ''),
    SLDeNghiIn: totalQuantity
      ? String(totalQuantity)
      : data.slDeNghiIn || data.SLDeNghiIn || '',
    ThoiGianCanSach: data.thoiGianCanSach || data.ThoiGianCanSach || '',
    DeNghiNoiIn: data.deNghiNoiIn || data.DeNghiNoiIn || '',
    GhiChu: data.ghiChu || data.GhiChu || '',
    VuKHTKBT: data.vuKHTKBT || data.VuKHTKBT || '',
    BanBienTap: data.banBienTap || data.BanBienTap || '',
  });
}

export function generatePcdiDocx(data: Record<string, any>): Buffer {
  const defaults = dateDefaults();
  return generateFromTemplate('phieu_chi_dinh_co_so_in.docx', {
    SoPhieu: data.soPhieu || data.SoPhieu || '01',
    Ngay: data.ngay || data.Ngay || defaults.ngay,
    Thang: data.thang || data.Thang || defaults.thang,
    Nam: data.nam || data.Nam || defaults.nam,
    CoQuan:
      data.coQuan ||
      data.CoQuan ||
      'Nhà xuất bản Chính trị Quốc gia Sự thật',
    BBT: data.bbt || data.BBT || '',
    PhuongThuc: data.phuongThuc || data.PhuongThuc || '',
    TenSach: data.tenSach || data.TenSach || '',
    TacGia: data.tacGia || data.TacGia || '',
    SoTrang: data.soTrang || data.SoTrang || '',
    KhoSach: data.khoSach || data.KhoSach || '',
    SoLuongIn: String(data.soLuongIn ?? ''),
    GiaTriHopDong: data.giaTriHopDong || data.GiaTriHopDong || '',
    CoSoIn: data.coSoIn || data.CoSoIn || '',
    ThongSoKyThuat: data.thongSoKyThuat || data.ThongSoKyThuat || '',
    KyTen: data.kyTen || data.KyTen || '',
    ThuTruongDonVi: data.thuTruongDonVi || data.ThuTruongDonVi || '',
  });
}

export function generateDatSachDecisionDocx(
  data: Record<string, any>,
): Buffer {
  const defaults = dateDefaults();
  return generateFromTemplate('quyet_dinh.docx', {
    Ngay: data.ngay || data.Ngay || data.ngayBanHanh || defaults.ngay,
    Thang: data.thang || data.Thang || data.thangBanHanh || defaults.thang,
    Nam: data.nam || data.Nam || data.namBanHanh || defaults.nam,
    So: data.soQuyetDinh || data.SoQuyetDinh || '',
    SoQuyetDinh: data.soQuyetDinh || data.SoQuyetDinh || '',
    VeViec: data.veViec || data.VeViec || 'V/v in/tái bản sách',
    TacGia: data.tacGia || data.TacGia || '',
    NgonNgu: data.ngonNgu || data.NgonNgu || '',
    khuonKho: data.khuonKho || data.KhuonKho || '',
    SoTrangCuaXuatBanPhamIn:
      data.soTrangCuaXuatBanPhamIn ||
      data.SoTrangCuaXuatBanPhamIn ||
      data.soTrang ||
      data.SoTrang ||
      '',
    SoLuongIn: String(data.soLuongIn ?? ''),
    DoiTacLienKetXuatBan:
      data.doiTacLienKet || data.doiTacLienKetXuatBan || '',
    TenBienTapVien: data.tenBienTapVien || data.TenBienTapVien || '',
    CoSoIn: data.coSoIn || data.CoSoIn || '',
    'MaSoCachTieuChuanQuocTe - ISBN':
      data.isbn || data.ISBN || data.maSoISBN || '',
    MaSoCachTieuChuanQuocTeISBN:
      data.isbn || data.ISBN || data.maSoISBN || '',
    TongGiamDoc: data.tongGiamDoc || data.TongGiamDoc || '',
  });
}
