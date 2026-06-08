#!/usr/bin/env node
/**
 * Generate clean DatSach DOCX templates using the docx library.
 * All placeholders are in a SINGLE TextRun (no split across runs).
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, convertInchesToTwip,
  PageOrientation, SectionType, Header, Footer, PageNumber,
  NumberFormat, LevelFormat, UnderlineType, TabStopPosition, TabStopType,
  ShadingType, VerticalAlign,
} = require('/home/pcloud/qlda/backend/node_modules/docx');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/home/pcloud/qlda/FileMau/DatSach';

// Helper: placeholder run (plain text, no formatting)
function placeholder(key) {
  return new TextRun(`{{${key}}}`);
}

// Helper: normal text run
function text(value, opts = {}) {
  return new TextRun({ text: value, ...opts });
}

// Helper: paragraph with runs
function para(...runs) {
  return new Paragraph({
    children: runs,
    spacing: { after: 200 },
  });
}

// Helper: bold paragraph
function boldPara(...runs) {
  return new Paragraph({
    children: runs.map(r =>
      typeof r === 'string'
        ? new TextRun({ text: r, bold: true })
        : r
    ),
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: 400 } });
}

function divider() {
  return new Paragraph({
    children: [new TextRun('')],
    border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 400 },
  });
}

// ============================================================
// TEMPLATE 1: Giấy đề nghị in (GDN)
// ============================================================
function createGDNTemplate() {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 26 }, // 13pt
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [text('NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT', { bold: true, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [text('ĐẢNG CỘNG SẢN VIỆT NAM', { bold: true, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                text('Trang ', { size: 20 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
                text(' / ', { size: 20 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 20 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: [
        // Header area
        para(text('')),
        para(text('TRUNG TÂM PHÁT HÀNH')),
        divider(),
        para(text('')),
        para(text('Cộng hòa xã hội chủ nghĩa Việt Nam', { bold: true })),
        para(text('Độc lập - Tự do - Hạnh phúc', { bold: true })),
        para(text('')),
        para(text('Hà Nội, ngày {{Ngay}} tháng {{Thang}} năm {{Nam}}', { italics: true })),
        para(text('')),

        // Title
        boldPara(text('GIẤY ĐỀ NGHỊ IN NỘI/TÁI BẢN SÁCH')),
        para(text('')),

        // Recipient
        para(text('Kính gửi: '), text('{{CoQuan}}', { bold: true })),
        para(text('')),

        // Body
        para(text('Căn cứ: '), text('{{CanCu}}')),
        para(text('Về việc: '), text('{{VeViec}}')),
        para(text('')),

        // Info table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Tên sách:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('TenSach'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Tác giả:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('TacGia'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('BBT (Ban Biên tập):'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('BBT'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Năm xuất bản:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('NamXB'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Số trang:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('SoTrang'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Khổ sách:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('KhoSach'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Giá bìa:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('GiaBia'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Số lượng tồn:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('SoLuongTon'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Số lượng đề nghị in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('SLDeNghiIn'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Thời gian cần sách:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('ThoiGianCanSach'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Đề nghị nơi in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('DeNghiNoiIn'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Ghi chú:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('GhiChu'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),

        spacer(),
        para(text('')),
        para(text('Đề nghị Trung tâm Phát hành xem xét và triển khai in ấn theo đề nghị trên.')),
        spacer(),
        para(text('')),

        // Signature block
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    para(text('')),
                    para(text('')),
                    para(text('Vụ KH-TKBT', { bold: true })),
                    para(text('(Ký và ghi rõ họ tên)', { italics: true })),
                    para(text('')),
                    para(text('')),
                    para(text('')),
                    para(placeholder('VuKHTKBT')),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }),
                new TableCell({
                  children: [
                    para(text('')),
                    para(text('')),
                    para(text('Ban Biên tập', { bold: true })),
                    para(text('(Ký và ghi rõ họ tên)', { italics: true })),
                    para(text('')),
                    para(text('')),
                    para(text('')),
                    para(placeholder('BanBienTap')),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  });
}

// ============================================================
// TEMPLATE 2: Phiếu chỉ định cơ sở in (PCDI)
// ============================================================
function createPCDITemplate() {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 26 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [text('NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT', { bold: true, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [text('VỤ KẾ HOẠCH - TÀI CHÍNH', { bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: [
        para(text('')),
        boldPara(text('Số {{SoPhieu}} - PCĐI/VKHTC')),
        para(text('')),
        para(text('PHIẾU CHỈ ĐỊNH CƠ SỞ IN', { bold: true, size: 28 })),
        para(text('')),
        para(text('Hà Nội, ngày {{Ngay}} tháng {{Thang}} năm {{Nam}}', { italics: true })),
        para(text('')),
        para(text('Kính gửi: '), text('{{CoQuan}}', { bold: true })),
        para(text('')),

        // Info table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('BBT (Ban Biên tập):'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('BBT'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Phương thức in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('PhuongThuc'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Tên sách:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('TenSach'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Tác giả:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('TacGia'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Số trang:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('SoTrang'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Khổ sách:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('KhoSach'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Số lượng in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('SoLuongIn'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Giá trị hợp đồng:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('GiaTriHopDong'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Cơ sở in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('CoSoIn'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Thông số kỹ thuật:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('ThongSoKyThuat'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),

        spacer(),
        para(text('Đề nghị cơ sở in triển khai theo các thông số trên.')),
        spacer(),
        para(text('')),

        // Signature
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    para(text('')),
                    para(text('Vụ trưởng Vụ KH-TC', { bold: true })),
                    para(text('(Ký, đóng dấu)', { italics: true })),
                    para(text('')),
                    para(text('')),
                    para(placeholder('KyTen')),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    para(text('')),
                    para(text('Thủ trưởng đơn vị', { bold: true })),
                    para(text('(Ký, đóng dấu)', { italics: true })),
                    para(text('')),
                    para(text('')),
                    para(placeholder('ThuTruongDonVi')),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  });
}

// ============================================================
// TEMPLATE 3: Quyết định (QD)
// ============================================================
function createQDTemplate() {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 26 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [text('BAN CHẤP HÀNH TRUNG ƯƠNG', { bold: true, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [text('ĐẢNG CỘNG SẢN VIỆT NAM', { bold: true, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: [
        para(text('')),
        para(text('NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT', { bold: true })),
        para(text('')),
        para(text('Hà Nội, ngày {{Ngay}} tháng {{Thang}} năm {{Nam}}', { italics: true })),
        para(text('')),
        boldPara(text('*')),

        para(text('Số {{SoQuyetDinh}} - QĐ/NXBCTQGST', { bold: true })),
        para(text('')),

        boldPara(text('QUYẾT ĐỊNH')),
        para(text('Về việc: '), text('{{VeViec}}', { bold: true })),
        para(text('')),

        // Info table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Tác giả:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('TacGia'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Ngôn ngữ:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('NgonNgu'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Khổ khố:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('khuonKho'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Số trang của XB phẩm in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('SoTrangCuaXuatBanPhamIn'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Số lượng in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('SoLuongIn'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Đối tác liên kết XB:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('DoiTacLienKetXuatBan'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Tên biên tập viên:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('TenBienTapVien'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('Cơ sở in:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('CoSoIn'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para(text('ISBN:'))],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
                }),
                new TableCell({
                  children: [para(placeholder('MaSoCachTieuChuanQuocTeISBN'))],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),

        spacer(),
        para(text('Quyết định này có hiệu lực kể từ ngày ký.')),
        spacer(),

        // Signature
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    para(text('Nơi nhận:', { bold: true })),
                    para(text('- Như trên;')),
                    para(text('- Lưu VT.')),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    para(text('Tổng Giám đốc', { bold: true })),
                    para(text('(Ký, đóng dấu)', { italics: true })),
                    para(text('')),
                    para(text('')),
                    para(text('')),
                    para(placeholder('TongGiamDoc')),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  });
}

// ============================================================
// MAIN: Generate all templates
// ============================================================
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Generating DatSach templates...');

  // GDN
  const gdnDoc = createGDNTemplate();
  const gdnBuffer = await Packer.toBuffer(gdnDoc);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'giay_de_nghi_in.docx'), gdnBuffer);
  console.log('  OK: giay_de_nghi_in.docx');

  // PCDI
  const pcdiDoc = createPCDITemplate();
  const pcdiBuffer = await Packer.toBuffer(pcdiDoc);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'phieu_chi_dinh_co_so_in.docx'), pcdiBuffer);
  console.log('  OK: phieu_chi_dinh_co_so_in.docx');

  // QĐ
  const qdDoc = createQDTemplate();
  const qdBuffer = await Packer.toBuffer(qdDoc);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'quyet_dinh.docx'), qdBuffer);
  console.log('  OK: quyet_dinh.docx');

  console.log('\nAll templates generated successfully!');
  console.log('Output:', OUTPUT_DIR);

  // Verify placeholders
  const AdmZip = require('/home/pcloud/qlda/backend/node_modules/adm-zip');
  for (const file of ['giay_de_nghi_in.docx', 'phieu_chi_dinh_co_so_in.docx', 'quyet_dinh.docx']) {
    const zip = new AdmZip(path.join(OUTPUT_DIR, file));
    const xml = zip.getEntry('word/document.xml').getData().toString('utf8');
    const matches = [...xml.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]);
    console.log(`\n${file}: ${matches.length} placeholders`);
    matches.forEach(m => console.log(`  - {{${m}}}`));
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
