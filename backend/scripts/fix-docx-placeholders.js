/**
 * Fix broken DOCX template placeholders in FileMau directory.
 * - Removes spaces inside {{...}} braces: {{A B}} → {{AB}}
 * - Fixes missing opening {{: {LoaiHopDong}} → {{LoaiHopDong}}
 * - Fixes specific known broken patterns from templates
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const FILEMAU_PATH = path.resolve(__dirname, '../../FileMau');

// Patterns to fix: [searchRegex, replaceFn] or [searchRegex, replacementString]
const FIXES = [
  // Remove spaces inside braces {{...}}
  [/\{\{(\s+)([^}]+?)(\s+)\}\}/g, (m, lead, inner, trail) => `{{${inner}}}`],
  [/\{\{(\s+)([^}]+?)\}\}/g, (m, lead, inner) => `{{${inner}}}`],
  [/\{\{([^}]+?)(\s+)\}\}/g, (m, inner, trail) => `{{${inner}}}`],

  // Fix missing opening {{ for specific patterns
  [/\{LoaiHopDong\}\}/g, '{{LoaiHopDong}}'],
  [/\{NoiDungBaoHiem\}\}/g, '{{NoiDungBaoHiem}}'],
  [/\{MaSoHĐ\}\}/g, '{{MaSoHD}}'],
  [/\{MaSoHD\}\}/g, '{{MaSoHD}}'],
  [/\{ThoiDiemDongThau\}\}/g, '{{ThoiDiemDongThau}}'],
  [/\{ThoiGianDoiChieuTaiLieu\}\}/g, '{{ThoiGianDoiChieuTaiLieu}}'],

  // Specific broken space patterns
  [/\{\{C oSoIn\}\}/g, '{{CoSoIn}}'],
  [/\{\{B BT\}\}/g, '{{BBT}}'],
  [/\{\{Ph uongThuc\}\}/g, '{{PhuongThuc}}'],
  [/\{\{T enSach\}\}/g, '{{TenSach}}'],
  [/\{\{T acGia\}\}/g, '{{TacGia}}'],
  [/\{\{S oTrang\}\}/g, '{{SoTrang}}'],
  [/\{\{Kh oSach\}\}/g, '{{KhoSach}}'],
  [/\{\{G iaTriHopDong\}\}/g, '{{GiaTriHopDong}}'],
  [/\{\{Th ongSoKyThuat\}\}/g, '{{ThongSoKyThuat}}'],
  [/\{\{Ng onNgu\}\}/g, '{{NgonNgu}}'],
  [/\{\{khuonKho\}\}/g, '{{khuonKho}}'],
  [/\{\{S oTrangCuaXuatBanPhamIn\}\}/g, '{{SoTrangCuaXuatBanPhamIn}}'],
  [/\{\{S oLuongIn\}\}/g, '{{SoLuongIn}}'],
  [/\{\{DoiTacLienKetXuatBan\}\}/g, '{{DoiTacLienKetXuatBan}}'],
  [/\{\{T enBienTapVien\}\}/g, '{{TenBienTapVien}}'],
  [/\{\{MaSoCachTieuChuanQuocTe - ISBN\}\}/g, '{{MaSoCachTieuChuanQuocTeISBN}}'],
  [/\{\{tendonvicuatochuyengia\}\}/g, '{{Tendonvicuatochuyengia}}'],

  // Fix trailing space in braces
  [/\{\{([^}]+?)\s+\}\}/g, '{{$1}}'],
];

function processXml(xmlContent) {
  let content = xmlContent;
  let totalReplacements = 0;

  for (const [pattern, replacement] of FIXES) {
    if (typeof replacement === 'function') {
      const before = content;
      content = content.replace(pattern, replacement);
      const count = (before.match(pattern) || []).length;
      if (count > 0) totalReplacements += count;
    } else {
      const before = content;
      content = content.replace(pattern, replacement);
      const count = before.split(pattern).length - 1;
      if (count > 0) totalReplacements += count;
    }
  }

  return { content, totalReplacements };
}

function processDocx(filePath) {
  const data = fs.readFileSync(filePath);

  return JSZip.loadAsync(data).then((zipData) => {
    const promises = [];
    const filesToUpdate = [];

    zipData.forEach((relativePath, file) => {
      if (relativePath.startsWith('word/') && relativePath.endsWith('.xml')) {
        promises.push(
          file.async('string').then((content) => {
            const { content: fixed, totalReplacements } = processXml(content);
            if (totalReplacements > 0) {
              filesToUpdate.push({ path: relativePath, content: fixed, replacements: totalReplacements });
            }
          }),
        );
      }
    });

    return Promise.all(promises).then(() => {
      if (filesToUpdate.length === 0) {
        return { file: path.basename(filePath), changed: false, totalReplacements: 0 };
      }

      // Update the zip with fixed files
      for (const update of filesToUpdate) {
        zipData.file(update.path, update.content);
      }

      const totalReplacements = filesToUpdate.reduce((sum, f) => sum + f.replacements, 0);
      return zipData.generateAsync({ type: 'nodebuffer' }).then((output) => {
        fs.writeFileSync(filePath, output);
        return {
          file: path.basename(filePath),
          changed: true,
          filesUpdated: filesToUpdate.map((f) => f.path),
          totalReplacements,
        };
      });
    });
  });
}

function walkDir(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.docx')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  console.log('Fixing DOCX placeholders in:', FILEMAU_PATH);
  console.log('');

  const docxFiles = walkDir(FILEMAU_PATH);
  console.log(`Found ${docxFiles.length} DOCX files\n`);

  const results = [];
  for (const filePath of docxFiles) {
    try {
      const result = await processDocx(filePath);
      results.push(result);
      if (result.changed) {
        console.log(`[FIXED] ${result.file}`);
        for (const f of result.filesUpdated) {
          console.log(`        - ${f}: ${result.totalReplacements} replacements`);
        }
      } else {
        console.log(`[OK]     ${result.file} - no issues found`);
      }
    } catch (err) {
      console.error(`[ERROR]  ${filePath}: ${err.message}`);
    }
  }

  console.log('\n--- Summary ---');
  const changed = results.filter((r) => r.changed);
  const unchanged = results.filter((r) => !r.changed);
  console.log(`Total files: ${results.length}`);
  console.log(`Fixed: ${changed.length}`);
  console.log(`No issues: ${unchanged.length}`);
}

main().catch(console.error);
