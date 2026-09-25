const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.join(
  __dirname,
  '..',
  'src',
  'lib',
  'vietnamese-legal-document-ocr.ts',
);
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
  fileName: sourcePath,
});
const loadedModule = { exports: {} };
const load = new Function(
  'exports',
  'require',
  'module',
  '__filename',
  '__dirname',
  output.outputText,
);
load(
  loadedModule.exports,
  require,
  loadedModule,
  sourcePath,
  path.dirname(sourcePath),
);

const { parseVietnameseLegalDocumentOcr } = loadedModule.exports;

const citationSourcePath = path.join(
  __dirname,
  '..',
  'src',
  'lib',
  'legal-document-api.ts',
);
const citationSource = fs.readFileSync(citationSourcePath, 'utf8');
const citationOutput = ts.transpileModule(citationSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
  fileName: citationSourcePath,
});
const citationModule = { exports: {} };
const loadCitation = new Function(
  'exports',
  'require',
  'module',
  '__filename',
  '__dirname',
  citationOutput.outputText,
);
loadCitation(
  citationModule.exports,
  require,
  citationModule,
  citationSourcePath,
  path.dirname(citationSourcePath),
);
const { formatLegalDocumentCitation } = citationModule.exports;

const sample = [
  'Cơ quan ban hành',
  'CHÍNH PHỦ        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  'Độc lập - Tự do - Hạnh phúc',
  'Số: 274/2026/NĐ-CP       Hà Nội, ngày 07 tháng 7 năm 2026',
  'số hiệu                         Ngày ban hành',
  'Hình thức văn bản',
  'NGHỊ ĐỊNH',
  'Quy định chi tiết một số điều và biện pháp thi hành Luật Đấu thầu',
  'về lựa chọn nhà đầu tư thực hiện dự án đầu tư kinh doanh',
  'Trích yếu nội dung',
].join('\n');
const parsedSample = parseVietnameseLegalDocumentOcr(sample);

assert.deepEqual(parsedSample.warnings, []);
assert.equal(parsedSample.fields.soHieu, '274/2026/NĐ-CP');
assert.equal(parsedSample.fields.coQuanBanHanh, 'Chính phủ');
assert.equal(parsedSample.fields.hinhThucVanBan, 'Nghị định');
assert.equal(parsedSample.fields.linhVuc, 'Đấu thầu');
assert.equal(parsedSample.fields.ngayBanHanh, '2026-07-07');
assert.equal(
  parsedSample.fields.trichYeuNoiDung,
  'Quy định chi tiết một số điều và biện pháp thi hành Luật Đấu thầu về lựa chọn nhà đầu tư thực hiện dự án đầu tư kinh doanh',
);
assert.match(parsedSample.fields.tenCanCu, /^Nghị định số 274\/2026\/NĐ-CP/);
assert.equal(
  formatLegalDocumentCitation(parsedSample.fields),
  'Căn cứ Nghị định số 274/2026/NĐ-CP ngày 07 tháng 7 năm 2026 của Chính phủ quy định chi tiết một số điều và biện pháp thi hành Luật Đấu thầu về lựa chọn nhà đầu tư thực hiện dự án đầu tư kinh doanh;',
);

const noisyVietnameseSample = sample
  .replace('Quy định chi tiết', 'Quy định chỉ tiết')
  .replace('Luật Đấu thầu', 'Luật Đầu thầu');
assert.equal(
  parseVietnameseLegalDocumentOcr(noisyVietnameseSample).fields
    .trichYeuNoiDung,
  'Quy định chi tiết một số điều và biện pháp thi hành Luật Đấu thầu về lựa chọn nhà đầu tư thực hiện dự án đầu tư kinh doanh',
);

const numericDateSample = [
  'BỘ XÂY DỰNG',
  'Số: 18/2025/QĐ-BXD',
  'QUYẾT ĐỊNH',
  'Ban hành định mức chi phí quản lý dự án xây dựng',
  'Ngày ban hành: 15/08/2025',
].join('\n');
const parsedNumericDate = parseVietnameseLegalDocumentOcr(numericDateSample);

assert.equal(parsedNumericDate.fields.soHieu, '18/2025/QĐ-BXD');
assert.equal(parsedNumericDate.fields.coQuanBanHanh, 'Bộ Xây dựng');
assert.equal(parsedNumericDate.fields.hinhThucVanBan, 'Quyết định');
assert.equal(parsedNumericDate.fields.ngayBanHanh, '2025-08-15');
assert.equal(parsedNumericDate.fields.linhVuc, 'Xây dựng');

const handwrittenHeaderSample = [
  'BỘ TÀI CHÍNH        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  'Số: 4O5 / 2O25 / TT-BTC',
  'Hà Nội, ngay 3l thang lO nam 2025',
  'THÔNG TƯ',
  'Sửa đổi, bổ sung một số điều của Thông tư số 02/2024/TT-BKHĐT',
].join('\n');
const parsedHandwrittenHeader = parseVietnameseLegalDocumentOcr(
  handwrittenHeaderSample,
);
assert.equal(parsedHandwrittenHeader.fields.soHieu, '405/2025/TT-BTC');
assert.equal(parsedHandwrittenHeader.fields.ngayBanHanh, '2025-10-31');
assert.equal(parsedHandwrittenHeader.fields.coQuanBanHanh, 'Bộ Tài chính');

const incomplete = parseVietnameseLegalDocumentOcr('Văn bản bị mờ');
assert.ok(incomplete.warnings.length >= 5);

console.log('PASS: Vietnamese legal document OCR extraction rules');
