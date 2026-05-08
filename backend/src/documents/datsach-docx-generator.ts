import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  TabStopPosition, TabStopType, convertMillimetersToTwip,
  Table, TableRow, TableCell, WidthType, VerticalAlign,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

const FONT = 'Times New Roman';
const FONT_SIZE = 26;
const FONT_SIZE_SM = 22;
const PAGE_MARGINS = {
  top: convertMillimetersToTwip(20),
  bottom: convertMillimetersToTwip(20),
  left: convertMillimetersToTwip(25),
  right: convertMillimetersToTwip(15),
};

function formatDate(date: Date | string): { day: string; month: string; year: string } {
  const d = new Date(date);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    year: String(d.getFullYear()),
  };
}

function bold(text: string, size = FONT_SIZE): TextRun {
  return new TextRun({ text, font: FONT, size, bold: true });
}
function normal(text: string, size = FONT_SIZE): TextRun {
  return new TextRun({ text, font: FONT, size });
}
function italic(text: string, size = FONT_SIZE): TextRun {
  return new TextRun({ text, font: FONT, size, italics: true });
}

function cell(text: string, opts: { bold?: boolean; center?: boolean; width?: number; span?: number } = {}): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [opts.bold ? bold(text, FONT_SIZE_SM) : normal(text, FONT_SIZE_SM)],
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    })],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.span,
    verticalAlign: VerticalAlign.CENTER,
  });
}

function spacer(lines = 1): Paragraph {
  return new Paragraph({ children: [normal('')], spacing: { after: lines * 100 } });
}

// =========================================================================
// generateGDNInSachDocx — Giấy đề nghị in/tái bản sách
// =========================================================================
export async function generateGDNInSachDocx(data: any): Promise<Buffer> {
  const today = formatDate(new Date());
  const assignments = data.assignments || [];
  const totalSL = assignments.reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);

  const children: (Paragraph | Table)[] = [];

  // Header: NXB + Trung tâm phát hành
  children.push(new Paragraph({
    children: [bold('NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT')],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [normal('ĐẢNG CỘNG SẢN VIỆT NAM')],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [normal('TRUNG TÂM PHÁT HÀNH')],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));
  children.push(new Paragraph({
    children: [normal('-------')],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Date
  children.push(new Paragraph({
    children: [
      normal(`Hà Nội, ngày ${today.day} tháng ${today.month} năm ${today.year}`, FONT_SIZE_SM),
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { after: 200 },
  }));

  // Title
  children.push(new Paragraph({
    children: [bold('GIẤY ĐỀ NGHỊ IN NỘI/TÁI BẢN SÁCH', 28)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));

  // Table headers
  const headers = ['TT', 'Tên sách', 'Tác giả', 'BBT', 'Năm XB', 'Số trang', 'Khổ sách', 'Giá bìa', 'SL tồn', 'SL đề nghị in', 'Thời gian cần sách', 'Đề nghị nơi in', 'Ghi chú'];
  const colWidths = [400, 1500, 1200, 600, 600, 600, 700, 700, 600, 900, 900, 900, 800];

  const headerCells = headers.map((h, i) => cell(h, { bold: true, center: true, width: colWidths[i] }));
  const tableRows: TableRow[] = [
    new TableRow({ children: headerCells, tableHeader: true }),
  ];

  // Data row
  const dataRow = [
    cell('1', { center: true, width: colWidths[0] }),
    cell(data.tenSach || data.TenSach || '', { width: colWidths[1] }),
    cell(data.tacGia || data.TacGia || '', { width: colWidths[2] }),
    cell(data.bbt || data.BBT || '', { width: colWidths[3] }),
    cell(data.namXB || data.NamXB || '', { center: true, width: colWidths[4] }),
    cell(data.soTrang || data.SoTrang || '', { center: true, width: colWidths[5] }),
    cell(data.khoSach || data.KhoSach || '', { width: colWidths[6] }),
    cell(data.giaBia || data.GiaBia || '', { center: true, width: colWidths[7] }),
    cell(data.soLuongTon || data.SoLuongTon || '', { center: true, width: colWidths[8] }),
    cell(String(totalSL || data.slDeNghiIn || data.SLDeNghiIn || ''), { center: true, width: colWidths[9] }),
    cell(data.thoiGianCanSach || data.ThoiGianCanSach || '', { width: colWidths[10] }),
    cell(data.deNghiNoiIn || data.DeNghiNoiIn || '', { width: colWidths[11] }),
    cell(data.ghiChu || data.GhiChu || '', { width: colWidths[12] }),
  ];
  tableRows.push(new TableRow({ children: dataRow }));

  const table = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  children.push(table);

  children.push(spacer(2));

  // Signature section
  const sigY = new Paragraph({
    children: [
      bold('VỤ KH-TKBT ', FONT_SIZE_SM),
      italic('(Ký, ghi rõ họ tên)', FONT_SIZE_SM),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
  const sigBBT = new Paragraph({
    children: [
      bold('BAN BIÊN TẬP ', FONT_SIZE_SM),
      italic('(Ký, ghi rõ họ tên)', FONT_SIZE_SM),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
  const sigPGD = new Paragraph({
    children: [
      bold('PGĐ PHỤ TRÁCH IN VÀ PHÁT HÀNH', FONT_SIZE_SM),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
  const sigCT = new Paragraph({
    children: [
      bold('TRUNG TÂM PHÁT HÀNH', FONT_SIZE_SM),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
  const sigGiamDoc = new Paragraph({
    children: [
      bold('GIÁM ĐỐC - TỔNG BIÊN TẬP', FONT_SIZE_SM),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  });
  const sigNote = new Paragraph({
    children: [italic('(Duyệt)', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
  });

  children.push(sigY);
  children.push(spacer(1));
  children.push(sigBBT);
  children.push(spacer(1));
  children.push(sigPGD);
  children.push(spacer(1));
  children.push(sigCT);
  children.push(spacer(1));
  children.push(sigGiamDoc);
  children.push(spacer(0));
  children.push(sigNote);

  const doc = new Document({
    sections: [{
      properties: { page: { margin: PAGE_MARGINS } },
      children,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// =========================================================================
// generatePCDICoSoInDocx — Phiếu chỉ định cơ sở in
// =========================================================================
export async function generatePCDICoSoInDocx(data: any): Promise<Buffer> {
  const today = formatDate(new Date());

  const children: (Paragraph | Table)[] = [];

  // Header
  children.push(new Paragraph({
    children: [bold('NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [bold('VỤ KẾ HOẠCH - TÀI CHÍNH', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [
      bold(`Số 01 - PCĐI/VKHTC`, FONT_SIZE_SM),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  // Title
  children.push(new Paragraph({
    children: [bold('PHIẾU CHỈ ĐỊNH CƠ SỞ IN', 28)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Date & Kính gửi
  children.push(new Paragraph({
    children: [
      normal(`Hà Nội, ngày ${today.day} tháng ${today.month} năm ${today.year}`, FONT_SIZE_SM),
    ],
    alignment: AlignmentType.LEFT,
    spacing: { after: 200 },
  }));
  children.push(new Paragraph({
    children: [bold('Kính gửi: ', FONT_SIZE), normal('Lãnh đạo Nhà xuất bản', FONT_SIZE)],
    spacing: { after: 100 },
  }));
  children.push(new Paragraph({
    children: [
      normal('Căn cứ chủ trương xuất bản và bảng tính giá sách đã được Giám đốc - Tổng Biên tập phê duyệt. Để kịp thời có sách phục vụ nhiệm vụ chính trị, Vụ Kế hoạch – Tài chính đề nghị Lãnh đạo Nhà xuất bản quyết định cơ sở in các cuốn sách sau đây:', FONT_SIZE_SM),
    ],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
    spacing: { after: 200 },
  }));

  // Table
  const headers = ['TT', 'BBT', 'Phương thức', 'Tên sách', 'Tác giả', 'Số trang', 'Khổ sách', 'Số lượng in', 'Giá trị HĐ in (đ)', 'Cơ sở in', 'Thông số KT', 'Ghi chú'];
  const colWidths = [400, 700, 900, 1400, 1200, 600, 700, 800, 900, 900, 900, 800];

  const headerCells = headers.map((h, i) => cell(h, { bold: true, center: true, width: colWidths[i] }));
  const tableRows: TableRow[] = [
    new TableRow({ children: headerCells, tableHeader: true }),
    new TableRow({
      children: [
        cell('1', { center: true, width: colWidths[0] }),
        cell(data.bbt || data.BBT || '', { width: colWidths[1] }),
        cell(data.phuongThuc || data.PhuongThuc || '', { width: colWidths[2] }),
        cell(data.tenSach || data.TenSach || '', { width: colWidths[3] }),
        cell(data.tacGia || data.TacGia || '', { width: colWidths[4] }),
        cell(data.soTrang || data.SoTrang || '', { center: true, width: colWidths[5] }),
        cell(data.khoSach || data.KhoSach || '', { width: colWidths[6] }),
        cell(String(data.soLuongIn || data.SoLuongIn || ''), { center: true, width: colWidths[7] }),
        cell(data.giaTriHopDong || data.GiaTriHopDong || '', { center: true, width: colWidths[8] }),
        cell(data.coSoIn || data.CoSoIn || '', { width: colWidths[9] }),
        cell(data.thongSoKyThuat || data.ThongSoKyThuat || '', { width: colWidths[10] }),
        cell(data.ghiChu || data.GhiChu || '', { width: colWidths[11] }),
      ],
    }),
  ];

  const table = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  children.push(table);

  children.push(spacer(1));
  children.push(new Paragraph({
    children: [bold('K/T ', FONT_SIZE_SM), normal('VỤ TRƯỞNG', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));
  children.push(new Paragraph({
    children: [normal('Phạm Thị Hồng', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));
  children.push(spacer(1));
  children.push(new Paragraph({
    children: [bold('PHÓ GIÁM ĐỐC', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));
  children.push(new Paragraph({
    children: [normal('Nguyễn Thái Bình', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));
  children.push(spacer(1));
  children.push(new Paragraph({
    children: [bold('GIÁM ĐỐC - TỔNG BIÊN TẬP', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [italic('Vũ Trọng Lâm', FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
  }));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: PAGE_MARGINS } },
      children,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// =========================================================================
// generateQuyetDinhDatSachDocx — Quyết định đặt sách
// =========================================================================
export async function generateQuyetDinhDatSachDocx(gdnData: any, pcdiData: any): Promise<Buffer> {
  const today = formatDate(new Date());

  const children: Paragraph[] = [];

  // Header
  children.push(new Paragraph({
    children: [bold('BAN CHẤP HÀNH TRUNG ƯƠNG ĐẢNG CỘNG SẢN VIỆT NAM')],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [bold('NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT')],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [normal(`Hà Nội, ngày ${today.day} tháng ${today.month} năm ${today.year}`, FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // So QĐ
  children.push(new Paragraph({
    children: [normal(`* Số - QĐ/NXBCTQGST`, FONT_SIZE_SM)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Title
  children.push(new Paragraph({
    children: [bold('QUYẾT ĐỊNH', 28)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [bold('Xuất bản/tái bản xuất bản phẩm', FONT_SIZE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));
  children.push(new Paragraph({
    children: [bold('GIÁM ĐỐC – TỔNG BIÊN TẬP', FONT_SIZE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [bold('NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT', FONT_SIZE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Căn cứ
  const canCuItems = [
    'Luật Xuất bản ngày 20 tháng 11 năm 2012;',
    'Nghị định số 195/2013/NĐ-CP ngày 21 tháng 11 năm 2013 của Chính phủ;',
    'Thông tư số 01/2020/TT-BTTTT ngày 07/02/2020 (được sửa đổi, bổ sung bởi Thông tư số 23/2023/TT-BTTTT ngày 31/12/2023);',
    'Giấy xác nhận đăng ký xuất bản số 57 ngày 05/01/2026 của Cục Xuất bản, In và Phát hành;',
  ];
  for (const cc of canCuItems) {
    children.push(new Paragraph({
      children: [normal(`- Căn cứ ${cc}`, FONT_SIZE_SM)],
      indent: { firstLine: convertMillimetersToTwip(12.7) },
      spacing: { after: 80 },
    }));
  }

  children.push(new Paragraph({
    children: [normal('- Xét đề nghị của Vụ Kế hoạch – Tài chính,', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
    spacing: { after: 200 },
  }));

  children.push(new Paragraph({
    children: [bold('QUYẾT ĐỊNH', FONT_SIZE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Điều 1
  children.push(new Paragraph({
    children: [bold('Điều 1. ', FONT_SIZE), normal('. Xuất bản xuất bản phẩm có tên: ', FONT_SIZE), bold(`${gdnData.tenSach || gdnData.TenSach || '...............'}`, FONT_SIZE)],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
    spacing: { after: 100 },
  }));

  const pcdi = pcdiData || {};

  children.push(new Paragraph({
    children: [normal('- Tác giả, dịch giả: ', FONT_SIZE_SM), bold(pcdi.tacGia || pcdi.TacGia || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Ngôn ngữ xuất bản: ', FONT_SIZE_SM), bold(pcdi.ngonNgu || pcdi.NgonNgu || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Khuôn khổ: ', FONT_SIZE_SM), bold(pcdi.khuonKho || pcdi.KhuonKho || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Số trang của xuất bản phẩm in: ', FONT_SIZE_SM), bold(pcdi.soTrang || pcdi.SoTrang || gdnData.soTrang || gdnData.SoTrang || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Số lượng in: ', FONT_SIZE_SM), bold(pcdi.soLuongIn || pcdi.SoLuongIn || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Đối tác liên kết xuất bản: ', FONT_SIZE_SM), bold(pcdi.doiTacLienKet || pcdi.DoiTacLienKet || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Tên biên tập viên: ', FONT_SIZE_SM), bold(pcdi.tenBienTapVien || pcdi.TenBienTapVien || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Mã số sách tiêu chuẩn quốc tế - ISBN: ', FONT_SIZE_SM), bold(pcdi.isbn || pcdi.ISBN || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(20) },
    spacing: { after: 200 },
  }));

  // Điều 2
  children.push(new Paragraph({
    children: [bold('Điều 2. ', FONT_SIZE), normal('. Số xác nhận đăng ký xuất bản ghi trên xuất bản phẩm: ', FONT_SIZE_SM), bold('8-2026/CXBIPH/16-436/CTQG', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
    spacing: { after: 200 },
  }));

  // Điều 3
  children.push(new Paragraph({
    children: [bold('Điều 3. ', FONT_SIZE), normal('. Xuất bản phẩm in tại: ', FONT_SIZE_SM), bold(pcdi.coSoIn || pcdi.CoSoIn || '...............', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
    spacing: { after: 200 },
  }));

  // Điều 4
  children.push(new Paragraph({
    children: [bold('Điều 4. ', FONT_SIZE), normal('. Quyết định này được lập thành 02 (hai) bản, 01 (một) bản lưu tại nhà xuất bản, 01 (một) bản lưu tại cơ sở in (hoặc đơn vị thực hiện đăng tải xuất bản phẩm điện tử). Quyết định này có giá trị thực hiện 01 (một) lần đến ngày 31 tháng 12 năm 2026; trường hợp bị tẩy xóa, sửa chữa, photocopy không có giá trị thực hiện./.', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
    spacing: { after: 200 },
  }));

  // Signature
  children.push(spacer(1));
  children.push(new Paragraph({
    children: [bold('GIÁM ĐỐC – TỔNG BIÊN TẬP', FONT_SIZE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));
  children.push(new Paragraph({
    children: [italic('Vũ Trọng Lâm', FONT_SIZE)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  // Nơi nhận
  children.push(new Paragraph({
    children: [bold('Nơi nhận: ', FONT_SIZE_SM), normal('- Như Điều 4,', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [normal('- Lưu VT, Vụ KH-TC.', FONT_SIZE_SM)],
    indent: { firstLine: convertMillimetersToTwip(12.7) },
  }));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: PAGE_MARGINS } },
      children,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
