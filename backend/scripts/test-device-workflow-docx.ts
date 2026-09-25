import * as assert from 'assert';
import * as JSZip from 'jszip';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import {
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';
import {
  generateDuToanCoverDocx,
  generateDuToanDocx,
} from '../src/documents/dutoan-docx-generator';
import {
  generateKhlcntCoverDocx,
  generateKhlcntDocx,
} from '../src/documents/khlcnt-docx-generator';
import { generateContractorSelectionDocx } from '../src/contractor-selection/lcnt-docx-generator';
import { generatePaymentDocx } from '../src/payment/payment-docx-generator';
import { LegalDocumentsService } from '../src/legal-documents/legal-documents.service';
import {
  appendDocxAttachment,
  getLegalBasisCitations,
  getProcurementPackages,
  prepareWorkflowTemplateData,
} from '../src/utils/docx-template-renderer';

const OUTPUT_DIR = path.resolve(__dirname, '../../testflow');
const generatedFiles: Array<{
  fileName: string;
  label: string;
  size: number;
  unresolvedPlaceholders: string[];
}> = [];

const packages = [
  {
    id: 'package-1',
    TenGoiThau:
      'Gói thầu tư vấn lập hồ sơ mời thầu và đánh giá hồ sơ dự thầu',
    GiaDuToanGoiThau: '120000000',
    GhiChu: 'Gói thầu tư vấn được kiểm thử xuyên suốt đến thanh toán',
    CongViec: 'Lập hồ sơ mời thầu và đánh giá hồ sơ dự thầu',
    NguonVon: 'Nguồn thu hoạt động sự nghiệp',
  },
  {
    id: 'package-2',
    TenGoiThau:
      'Gói thầu tư vấn thẩm định hồ sơ mời thầu và kết quả lựa chọn nhà thầu',
    GiaDuToanGoiThau: '45000000',
    GhiChu: 'Tư vấn thẩm định độc lập',
    CongViec: 'Thẩm định hồ sơ và kết quả lựa chọn nhà thầu',
    NguonVon: 'Nguồn thu hoạt động sự nghiệp',
  },
  {
    id: 'package-3',
    TenGoiThau: 'Gói thầu mua sắm thiết bị công nghệ thông tin',
    GiaDuToanGoiThau: '2350000000',
    GhiChu: 'Mua sắm thiết bị theo cấu hình được phê duyệt',
    CongViec: 'Cung cấp, lắp đặt và bàn giao thiết bị',
    NguonVon: 'Nguồn thu hoạt động sự nghiệp',
  },
];

const legalDocuments = [
  {
    id: 'legal-22-2023-qh15',
    tenCanCu: 'Luật Đấu thầu số 22/2023/QH15',
    soHieu: '22/2023/QH15',
    coQuanBanHanh: 'Quốc hội khóa XV, Kỳ họp thứ 5',
    hinhThucVanBan: 'Luật',
    linhVuc: 'Đấu thầu',
    trichYeuNoiDung: 'Đấu thầu',
    ngayBanHanh: '2023-06-23',
    citation:
      'Căn cứ Luật số 22/2023/QH15 ngày 23 tháng 6 năm 2023 của Quốc hội khóa XV, Kỳ họp thứ 5 đấu thầu;',
  },
  {
    id: 'legal-57-2024-qh15',
    tenCanCu: 'Luật số 57/2024/QH15 sửa đổi các luật liên quan đến đấu thầu',
    soHieu: '57/2024/QH15',
    coQuanBanHanh: 'Quốc hội',
    hinhThucVanBan: 'Luật',
    linhVuc: 'Đấu thầu',
    trichYeuNoiDung:
      'sửa đổi, bổ sung một số điều của Luật Quy hoạch, Luật Đầu tư, Luật Đầu tư theo phương thức đối tác công tư và Luật Đấu thầu',
    ngayBanHanh: '2024-11-29',
    citation:
      'Căn cứ Luật số 57/2024/QH15 ngày 29 tháng 11 năm 2024 của Quốc hội sửa đổi, bổ sung một số điều của Luật Quy hoạch, Luật Đầu tư, Luật Đầu tư theo phương thức đối tác công tư và Luật Đấu thầu;',
  },
  {
    id: 'legal-90-2025-qh15',
    tenCanCu: 'Luật số 90/2025/QH15 sửa đổi Luật Đấu thầu và các luật liên quan',
    soHieu: '90/2025/QH15',
    coQuanBanHanh: 'Quốc hội',
    hinhThucVanBan: 'Luật',
    linhVuc: 'Đấu thầu',
    trichYeuNoiDung:
      'sửa đổi, bổ sung một số điều của Luật Đấu thầu, Luật Đầu tư theo phương thức đối tác công tư, Luật Hải quan, Luật thuế giá trị gia tăng, Luật thuế xuất khẩu, thuế nhập khẩu, Luật Đầu tư, Luật Đầu tư công, Luật Quản lý, sử dụng tài sản công',
    ngayBanHanh: '2025-06-25',
    citation:
      'Căn cứ Luật số 90/2025/QH15 ngày 25 tháng 6 năm 2025 của Quốc hội sửa đổi, bổ sung một số điều của Luật Đấu thầu, Luật Đầu tư theo phương thức đối tác công tư, Luật Hải quan, Luật thuế giá trị gia tăng, Luật thuế xuất khẩu, thuế nhập khẩu, Luật Đầu tư, Luật Đầu tư công, Luật Quản lý, sử dụng tài sản công;',
  },
  {
    id: 'legal-214-2025-nd-cp',
    tenCanCu: 'Nghị định số 214/2025/NĐ-CP về lựa chọn nhà thầu',
    soHieu: '214/2025/NĐ-CP',
    coQuanBanHanh: 'Chính phủ',
    hinhThucVanBan: 'Nghị định',
    linhVuc: 'Đấu thầu',
    trichYeuNoiDung:
      'quy định chi tiết một số điều và biện pháp thi hành Luật Đấu thầu về lựa chọn nhà thầu',
    ngayBanHanh: '2025-08-04',
    citation:
      'Căn cứ Nghị định số 214/2025/NĐ-CP ngày 04 tháng 8 năm 2025 của Chính phủ quy định chi tiết một số điều và biện pháp thi hành Luật Đấu thầu về lựa chọn nhà thầu;',
  },
];

const data = {
  TenDuAn: 'Dự án đầu tư trang thiết bị công nghệ thông tin năm 2026',
  NgayBanHanh: '2026-07-29',
  NgayKy: '2026-07-30',
  NguoiSoanVanBan: 'Nguyễn Văn Soạn',
  ThuTruongDonVi: 'Trần Văn Trưởng',
  CanCuMoDau: 'Kế hoạch công tác và nhiệm vụ được giao năm 2026',
  ThuyetMinh: 'Thuyết minh nhu cầu xây dựng dự toán mua sắm thiết bị.',
  MucTieuQuyMo: 'Đầu tư đồng bộ hạ tầng công nghệ thông tin.',
  NguonVon: 'Nguồn thu hoạt động sự nghiệp',
  NamThucHien: '2026',
  TongMucDauTu: '100100000000',
  packages,
  canCu: legalDocuments.map((document) => ({
    legalDocumentId: document.id,
    source: 'LIBRARY',
    citationSnapshot: document.citation,
  })),
};

const joinedPackageNames = packages
  .map((item) => item.TenGoiThau)
  .join(', ');
const formattedTotalBudget = '2.515.000.000';
const selectedPackage = packages[0];

async function documentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file('word/document.xml');
  assert.ok(file, 'DOCX phải có word/document.xml');
  return file!.async('text');
}

async function allRenderedXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xmlFiles = Object.values(zip.files).filter(
    (file) =>
      !file.dir &&
      /^word\/(?:document|header\d+|footer\d+)\.xml$/.test(file.name),
  );
  return (
    await Promise.all(xmlFiles.map((file) => file.async('text')))
  ).join('\n');
}

async function writeDocx(
  fileName: string,
  label: string,
  buffer: Buffer,
): Promise<void> {
  const xml = await allRenderedXml(buffer);
  const unresolvedPlaceholders = Array.from(
    new Set(xml.match(/\{\{[^}]+\}\}/g) || []),
  );
  assert.deepStrictEqual(
    unresolvedPlaceholders,
    [],
    `${label}: còn placeholder trong document/header/footer`,
  );
  await writeFile(path.join(OUTPUT_DIR, fileName), buffer);
  generatedFiles.push({
    fileName,
    label,
    size: buffer.length,
    unresolvedPlaceholders,
  });
}

function plainText(xml: string): string {
  return Array.from(xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g))
    .map((match) => match[1])
    .join('');
}

function count(value: string, fragment: string): number {
  return value.split(fragment).length - 1;
}

function assertRendered(xml: string, label: string) {
  assert.ok(!/\{\{[^}]+\}\}/.test(xml), `${label}: còn placeholder chưa thay`);
  const text = plainText(xml);
  assert.ok(
    text.includes(joinedPackageNames),
    `${label}: TenCacGoiThau không được nối bằng ", "`,
  );
  assert.ok(
    text.includes(formattedTotalBudget),
    `${label}: tổng giá ba gói không đúng`,
  );
  for (const document of legalDocuments) {
    assert.strictEqual(
      countParagraphsEqual(xml, document.citation),
      1,
      `${label}: câu căn cứ ${document.soHieu} phải xuất đúng một paragraph`,
    );
  }
}

function assertNoPlaceholders(xml: string, label: string) {
  assert.ok(!/\{\{[^}]+\}\}/.test(xml), `${label}: còn placeholder chưa thay`);
}

function countParagraphsEqual(xml: string, expected: string): number {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  return Array.from(xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g))
    .map((paragraph) => normalize(plainText(paragraph[0])))
    .filter((paragraph) => paragraph === normalize(expected))
    .length;
}

async function createAttachment(): Promise<Buffer> {
  const onePixelPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nR0AAAAASUVORK5CYII=',
    'base64',
  );
  const attachment = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'PHỤ LỤC KHÁI TOÁN KIỂM THỬ', bold: true })],
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('Hạng mục')] }),
                new TableCell({ children: [new Paragraph('Giá trị')] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('Thiết bị kiểm thử')] }),
                new TableCell({ children: [new Paragraph(formattedTotalBudget)] }),
              ],
            }),
          ],
        }),
        new Paragraph({
          children: [
            new ImageRun({
              data: onePixelPng,
              transformation: { width: 1, height: 1 },
              type: 'png',
            }),
          ],
        }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(attachment));
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const exampleCitation = LegalDocumentsService.formatCitation({
    id: 'legal-document-22-2023-qh15',
    tenCanCu: 'Luật Đấu thầu số 22/2023/QH15',
    soHieu: '22/2023/QH15',
    coQuanBanHanh: 'Quốc hội khóa XV, Kỳ họp thứ 5',
    hinhThucVanBan: 'Luật',
    linhVuc: 'Đấu thầu',
    trichYeuNoiDung: 'Đấu thầu',
    ngayBanHanh: new Date('2023-06-23T00:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  assert.strictEqual(
    exampleCitation,
    'Căn cứ Luật số 22/2023/QH15 ngày 23 tháng 6 năm 2023 của Quốc hội khóa XV, Kỳ họp thứ 5 đấu thầu;',
    'Công thức câu viện dẫn 22/2023/QH15 không đúng',
  );
  assert.strictEqual(
    getLegalBasisCitations({
      canCu: [],
      CanCu: ['Luật dữ liệu cũ số 01/TEST'],
    }).length,
    1,
    'Mảng canCu rỗng không được che căn cứ legacy',
  );
  assert.strictEqual(
    getProcurementPackages({
      packages: [],
      TenGoiThau: 'Gói thầu legacy',
    }).length,
    1,
    'Mảng packages rỗng không được che gói thầu legacy',
  );
  assert.strictEqual(
    prepareWorkflowTemplateData({
      packages: [],
      TenCacGoiThau: 'Gói A, Gói B',
    }).TenCacGoiThau,
    'Gói A, Gói B',
    'Không được xóa TenCacGoiThau của hồ sơ cũ',
  );

  const duToanCover = await generateDuToanCoverDocx(data);
  const duToanCoverXml = await documentXml(duToanCover);
  assertNoPlaceholders(duToanCoverXml, 'Phiếu trình ký Dự toán');
  assert.ok(
    plainText(duToanCoverXml).includes(joinedPackageNames),
    'Phiếu trình ký Dự toán không nhận TenCacGoiThau',
  );
  assert.ok(
    plainText(duToanCoverXml).includes(data.NguoiSoanVanBan)
      && plainText(duToanCoverXml).includes(data.ThuTruongDonVi),
    'Phiếu trình ký Dự toán không nhận người soạn hoặc thủ trưởng đơn vị',
  );
  assert.ok(
    plainText(duToanCoverXml).includes('Ngày 30 tháng 7 năm 2026') &&
      !plainText(duToanCoverXml).includes('2026-07-30'),
    'Phiếu trình ký Dự toán không nhận hoặc định dạng sai NgayKy',
  );
  await writeDocx(
    '01_Phieu_trinh_ky_Du_toan.docx',
    'Phiếu trình ký Dự toán',
    duToanCover,
  );

  const duToan = await generateDuToanDocx('TT_DUTOAN', data);
  const duToanXml = await documentXml(duToan);
  assertRendered(duToanXml, 'Tờ trình Dự toán');
  assert.ok(
    plainText(duToanXml).includes('Ngày 29 tháng 7 năm 2026') &&
      !plainText(duToanXml).includes('2026-07-29'),
    'NgayBanHanh phải được đổi sang "Ngày dd tháng M năm yyyy" trong Word',
  );
  assert.ok(
    plainText(duToanXml).includes(
      'Căn cứ Kế hoạch công tác và nhiệm vụ được giao năm 2026',
    ),
    'Tờ trình Dự toán không nhận căn cứ mở đầu',
  );
  for (const document of legalDocuments) {
    assert.strictEqual(
      countParagraphsEqual(duToanXml, document.citation),
      1,
      `Căn cứ ${document.soHieu} của Dự toán phải là một Word paragraph`,
    );
  }
  const duToanText = plainText(duToanXml);
  assert.strictEqual(
    count(duToanText, '- Chi phí Gói thầu'),
    3,
    'Tờ trình Dự toán phải có ba dòng chi phí',
  );
  for (const item of packages) {
    const rowHasPackage = Array.from(
      duToanXml.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g),
    ).some((row) => plainText(row[0]).includes(item.TenGoiThau));
    assert.ok(rowHasPackage, `Thiếu hàng bảng cho ${item.TenGoiThau}`);
  }
  await writeDocx(
    '02_To_trinh_phe_duyet_Du_toan.docx',
    'Tờ trình Dự toán',
    duToan,
  );
  const proposalWithAttachment = await generateDuToanDocx('TT_DUTOAN', {
    ...data,
    khaiToanAttachment: {
      objectPath: 'fixture/khai-toan.docx',
      originalName: 'khai-toan.docx',
    },
  });
  assert.ok(
    plainText(await documentXml(proposalWithAttachment)).includes(
      '__KHAI_TOAN_SLOT__',
    ),
    'Tờ trình Dự toán không giữ vị trí ghép phụ lục khái toán',
  );
  const mergedProposal = await appendDocxAttachment(
    proposalWithAttachment,
    await createAttachment(),
  );
  assert.ok(
    plainText(await documentXml(mergedProposal)).includes(
      'PHỤ LỤC KHÁI TOÁN KIỂM THỬ',
    ),
    'Nội dung file khái toán chưa được nối vào Tờ trình',
  );
  await writeDocx(
    '02b_To_trinh_phe_duyet_Du_toan_kem_Phu_luc.docx',
    'Tờ trình Dự toán kèm phụ lục khái toán',
    mergedProposal,
  );

  const khlcnt = await generateKhlcntDocx('TT_KHLCNT', data);
  const khlcntXml = await documentXml(khlcnt);
  await writeDocx(
    '05_To_trinh_phe_duyet_KHLCNT.docx',
    'Tờ trình KHLCNT',
    khlcnt,
  );
  assertRendered(khlcntXml, 'Tờ trình KHLCNT');
  const khlcntText = plainText(khlcntXml);
  assert.ok(khlcntText.includes('gồm 3 gói thầu'), 'KHLCNT còn hardcode 04 gói thầu');
  assert.ok(
    khlcntText.includes('100.100.000.000') &&
      khlcntText.includes('Một trăm tỷ một trăm triệu đồng'),
    'KHLCNT phải tự định dạng Tổng mức đầu tư và sinh số tiền bằng chữ',
  );
  assert.strictEqual(
    count(khlcntText, '- Chi phí Gói thầu'),
    3,
    'Tờ trình KHLCNT phải có ba dòng chi phí',
  );
  const khlcntCover = await generateKhlcntCoverDocx({
    ...data,
    NguoiSoanVanBan: 'Nguyễn Văn Soạn',
    ThuTruongDonVi: 'Nguyễn Văn Duyệt',
  });
  const khlcntCoverXml = await documentXml(khlcntCover);
  assertNoPlaceholders(khlcntCoverXml, 'Phiếu trình ký KHLCNT');
  assert.ok(
    plainText(khlcntCoverXml).includes('Nguyễn Văn Soạn'),
    'Phiếu trình ký KHLCNT không nhận người soạn',
  );
  assert.ok(
    plainText(khlcntCoverXml).includes('Ngày 30 tháng 7 năm 2026') &&
      !plainText(khlcntCoverXml).includes('2026-07-30'),
    'Phiếu trình ký KHLCNT không nhận hoặc định dạng sai NgayKy',
  );
  await writeDocx(
    '04_Phieu_trinh_ky_KHLCNT.docx',
    'Phiếu trình ký KHLCNT',
    khlcntCover,
  );
  const khlcntDecision = await generateKhlcntDocx('QD_KHLCNT', {
    ...data,
    SoVanBan: '02/QĐ-KHLCNT',
  });
  assertRendered(await documentXml(khlcntDecision), 'Quyết định KHLCNT');
  await writeDocx(
    '06_Quyet_dinh_phe_duyet_KHLCNT.docx',
    'Quyết định KHLCNT',
    khlcntDecision,
  );

  const decision = await generateDuToanDocx('QD_DUTOAN', {
    ...data,
    SoVanBan: '01/QĐ',
    khaiToanAttachment: {
      objectPath: 'fixture/khai-toan.docx',
      originalName: 'khai-toan.docx',
    },
  });
  const decisionXml = await documentXml(decision);
  assertNoPlaceholders(decisionXml, 'Quyết định Dự toán');
  assert.ok(
    plainText(decisionXml).includes('__KHAI_TOAN_SLOT__'),
    'Quyết định Dự toán không giữ vị trí ghép phụ lục khái toán',
  );
  assert.ok(
    !plainText(decisionXml).includes('khai-toan.docx'),
    'Tên file không được ghi đè vị trí ghép nội dung phụ lục',
  );
  const merged = await appendDocxAttachment(decision, await createAttachment());
  const mergedZip = await JSZip.loadAsync(merged);
  const mergedXml = await documentXml(merged);
  const mergedText = plainText(mergedXml);
  assert.ok(
    mergedText.includes('PHỤ LỤC KHÁI TOÁN KIỂM THỬ'),
    'Nội dung file khái toán chưa được nối vào QĐ',
  );
  assert.ok(!mergedText.includes('__KHAI_TOAN_SLOT__'), 'Còn marker file khái toán');
  assert.ok(
    Object.keys(mergedZip.files).some((name) => name.startsWith('word/media/khai-toan-')),
    'Ảnh trong phụ lục khái toán chưa được copy',
  );
  await writeDocx(
    '03_Quyet_dinh_phe_duyet_Du_toan_kem_Phu_luc.docx',
    'Quyết định Dự toán kèm phụ lục khái toán',
    merged,
  );
  const attachment = await createAttachment();
  await writeDocx(
    '00_Phu_luc_khai_toan_dinh_kem.docx',
    'Phụ lục khái toán đầu vào',
    attachment,
  );

  const contractData = {
    ...data,
    TenGoiThau: selectedPackage.TenGoiThau,
    TenNhaThau: 'Công ty TNHH Tư vấn Đấu thầu Minh Anh',
    MSTNhaThau: '0101234567',
    DiaChiNhaThau: 'Số 25 phố Tràng Tiền, phường Hoàn Kiếm, Hà Nội',
    DaiDienNhaThau: 'Nguyễn Minh Anh',
    ChucVuNhaThau: 'Giám đốc',
    SoDienThoaiNhaThau: '0901234567',
    TaiKhoanNhaThau: '102900012345',
    GiaGoiThau: '120.000.000',
    GiaGoiThauBangChu: 'Một trăm hai mươi triệu đồng',
    SoHopDong: '12/2026/HĐTV-NXB',
    SanPhamGoiThau: 'Hồ sơ mời thầu và báo cáo đánh giá hồ sơ dự thầu',
    SoLuongSanPhamGoiThau: '01',
  };
  const contractorSteps = [
    ['thu_moi_hoan_thien', '07_Thu_moi_hoan_thien_hop_dong.docx'],
    ['bien_ban_hoan_thien', '08_Bien_ban_hoan_thien_hop_dong.docx'],
    ['to_trinh_kqlcnt', '09_To_trinh_ket_qua_LCNT.docx'],
    ['quyet_dinh_kqlcnt', '10_Quyet_dinh_ket_qua_LCNT.docx'],
    ['hop_dong', '11_Hop_dong_tu_van.docx'],
  ];
  for (const [stepKey, fileName] of contractorSteps) {
    const output = await generateContractorSelectionDocx(
      'CHI_DINH_THAU',
      stepKey,
      contractData,
    );
    const xml = await documentXml(output);
    assert.ok(!/\{\{[^}]+\}\}/.test(xml), `Chỉ định thầu ${stepKey}: còn placeholder`);
    for (const document of legalDocuments) {
      assert.strictEqual(
        countParagraphsEqual(xml, document.citation),
        1,
        `Chỉ định thầu ${stepKey}: căn cứ ${document.soHieu} phải xuất một lần`,
      );
    }
    await writeDocx(
      fileName,
      `Chỉ định thầu - ${stepKey}`,
      output,
    );
  }

  const paymentSteps = [
    ['ban_giao_san_pham', '12_Bien_ban_ban_giao_san_pham.docx'],
    ['nghiem_thu_san_pham', '13_Bien_ban_nghiem_thu_san_pham.docx'],
    ['mau_08a', '14_Bang_xac_dinh_gia_tri_khoi_luong_Mau_08a.docx'],
    ['thanh_ly_hop_dong', '15_Bien_ban_thanh_ly_hop_dong.docx'],
  ];
  for (const [stepKey, fileName] of paymentSteps) {
    const output = await generatePaymentDocx(
      'GOI_THAU_TU_VAN',
      stepKey,
      {
        ...contractData,
        NgayBanHanhHopdong: '29/7/2026',
        DonViSanPhamGoiThau: 'Bộ',
        HinhThucSanPhamGoiThau: 'Bản điện tử',
      },
    );
    const xml = await documentXml(output);
    assert.ok(!/\{\{[^}]+\}\}/.test(xml), `Thanh toán ${stepKey}: còn placeholder`);
    assert.ok(
      plainText(xml).includes(contractData.SoHopDong),
      `Thanh toán ${stepKey}: không nhận SoHopDong từ Hợp đồng`,
    );
    assert.ok(
      plainText(xml).includes(selectedPackage.TenGoiThau),
      `Thanh toán ${stepKey}: không nhận tên gói thầu từ luồng trước`,
    );
    for (const document of legalDocuments) {
      assert.strictEqual(
        countParagraphsEqual(xml, document.citation),
        0,
        `Thanh toán ${stepKey}: mẫu không có {{CanCu}} nên không được tự chèn căn cứ`,
      );
    }
    await writeDocx(fileName, `Thanh toán - ${stepKey}`, output);
  }

  await writeFile(
    path.join(OUTPUT_DIR, 'Du_lieu_luong_mau.json'),
    JSON.stringify(
      {
        project: data.TenDuAn,
        packages,
        selectedPackageId: selectedPackage.id,
        contract: contractData,
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(
    path.join(OUTPUT_DIR, 'Can_cu_phap_ly_mau.json'),
    JSON.stringify(legalDocuments, null, 2),
    'utf8',
  );

  const report = [
    '# Báo cáo kiểm thử luồng hồ sơ',
    '',
    `- Ngày sinh bộ kiểm thử: ${new Date().toISOString()}`,
    `- Dự án: ${data.TenDuAn}`,
    `- Gói thầu được nối xuyên suốt: ${selectedPackage.TenGoiThau}`,
    `- Số hợp đồng dùng để nối thanh toán: ${contractData.SoHopDong}`,
    `- Số căn cứ pháp lý: ${legalDocuments.length}`,
    `- Số DOCX đã xuất: ${generatedFiles.length}`,
    '',
    '## Kết quả placeholder',
    '',
    '- Không còn placeholder dạng `{{...}}` trong `document.xml`, header hoặc footer của tất cả file đã xuất.',
    '- Bốn căn cứ tạo thành bốn Word paragraph độc lập trong các mẫu có `{{CanCu}}`.',
    '- Bốn mẫu Thanh toán/Gói thầu tư vấn không có `{{CanCu}}`, vì vậy không hiển thị hoặc tự chèn căn cứ.',
    '- Ba gói thầu được nối bằng dấu phẩy tại `{{TenCacGoiThau}}`, tạo đủ ba hàng bảng và ba dòng chi phí.',
    '- Tên gói thầu tư vấn và số hợp đồng được nối từ Chỉ định thầu xuống bốn hồ sơ Thanh toán.',
    '- Phụ lục khái toán đã được ghép vào Quyết định phê duyệt Dự toán; marker ghép và tên file tạm không còn trong kết quả.',
    '',
    '## Danh sách căn cứ',
    '',
    ...legalDocuments.map((document, index) => `${index + 1}. ${document.citation}`),
    '',
    '## Danh sách file',
    '',
    '| STT | File | Hồ sơ | Dung lượng | Placeholder còn sót |',
    '|---:|---|---|---:|---:|',
    ...generatedFiles.map(
      (file, index) =>
        `| ${index + 1} | ${file.fileName} | ${file.label} | ${file.size.toLocaleString('vi-VN')} byte | ${file.unresolvedPlaceholders.length} |`,
    ),
    '',
  ].join('\n');
  await writeFile(
    path.join(OUTPUT_DIR, 'Kiem_tra_placeholder.md'),
    report,
    'utf8',
  );

  console.log(
    `PASS: ${generatedFiles.length} DOCX đã xuất vào ${OUTPUT_DIR}; nhiều gói, CanCu theo đúng từng mẫu, liên kết số hợp đồng và ghép phụ lục đều đúng`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
