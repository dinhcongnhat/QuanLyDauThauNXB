import { execFileSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Convert a DOCX buffer to PDF using LibreOffice.
 * Requires libreoffice-writer to be installed.
 */
export function convertDocxToPdf(docxBuffer: Buffer): Buffer {
  const tempDir = mkdtempSync(join(tmpdir(), 'docx2pdf-'));
  const inputPath = join(tempDir, 'input.docx');
  const outputPath = join(tempDir, 'input.pdf');

  try {
    writeFileSync(inputPath, docxBuffer);

    execFileSync('libreoffice', [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', tempDir,
      inputPath,
    ], { timeout: 30000 });

    return readFileSync(outputPath);
  } finally {
    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}
    try { require('fs').rmdirSync(tempDir); } catch {}
  }
}
