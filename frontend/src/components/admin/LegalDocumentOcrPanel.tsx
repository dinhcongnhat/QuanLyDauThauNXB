'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  FileImage,
  FileText,
  Loader2,
  ScanText,
  Upload,
} from 'lucide-react';
import {
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { LoggerMessage } from 'tesseract.js';
import {
  LegalDocumentOcrResult,
  mergeVietnameseLegalDocumentOcrResults,
  parseVietnameseLegalDocumentOcr,
} from '@/lib/vietnamese-legal-document-ocr';

interface LegalDocumentOcrPanelProps {
  onExtract: (result: LegalDocumentOcrResult) => void;
  onFileSelected?: (file: File) => void;
  disabled?: boolean;
}

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PDF_BYTES = 100 * 1024 * 1024;

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Đang tải bộ máy OCR',
  'initializing tesseract': 'Đang khởi tạo OCR',
  'loading language traineddata': 'Đang tải dữ liệu tiếng Việt',
  'initializing api': 'Đang chuẩn bị nhận dạng',
  'recognizing text': 'Đang nhận dạng nội dung',
};

function isPdf(file: File): boolean {
  return (
    file.type === 'application/pdf'
    || file.name.toLocaleLowerCase('vi').endsWith('.pdf')
  );
}

async function renderPdfFirstPage(file: File): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.js',
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.max(2, Math.min(4, 2600 / baseViewport.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không thể tạo ảnh từ PDF');
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png', 1),
    );
    if (!blob) throw new Error('Không thể kết xuất trang đầu PDF');
    return blob;
  } finally {
    await pdf.destroy();
  }
}

async function prepareImage(
  input: File | Blob,
): Promise<{ fullPage: File | Blob; header: File | Blob }> {
  if (typeof createImageBitmap !== 'function') {
    return { fullPage: input, header: input };
  }

  try {
    const bitmap = await createImageBitmap(input);
    const requestedScale = Math.min(4, Math.max(1, 2600 / bitmap.width));
    const pixelLimitedScale = Math.sqrt(
      (20 * 1024 * 1024) / (bitmap.width * bitmap.height),
    );
    const scale = Math.min(requestedScale, pixelLimitedScale);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return { fullPage: input, header: input };
    }

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = 'grayscale(1) contrast(1.55) brightness(1.04)';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const fullPage =
      (await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 1),
      )) || input;

    const headerCanvas = document.createElement('canvas');
    headerCanvas.width = canvas.width;
    headerCanvas.height = Math.max(
      1,
      Math.round(canvas.height * 0.58),
    );
    const headerContext = headerCanvas.getContext('2d');
    if (!headerContext) return { fullPage, header: fullPage };
    headerContext.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      headerCanvas.height,
      0,
      0,
      canvas.width,
      headerCanvas.height,
    );
    const header =
      (await new Promise<Blob | null>((resolve) =>
        headerCanvas.toBlob(resolve, 'image/png', 1),
      )) || fullPage;
    return { fullPage, header };
  } catch {
    return { fullPage: input, header: input };
  }
}

function findClipboardImage(event: ClipboardEvent): File | null {
  const item = Array.from(event.clipboardData?.items || []).find((entry) =>
    entry.type.startsWith('image/'),
  );
  return item?.getAsFile() || null;
}

export function LegalDocumentOcrPanel({
  onExtract,
  onFileSelected,
  disabled = false,
}: LegalDocumentOcrPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<LegalDocumentOcrResult | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState('');

  const setPreview = useCallback((file: File) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setFileName(file.name || 'anh-tu-clipboard.png');
  }, []);

  const recognizeImage = useCallback(
    async (file: File) => {
      if (disabled || recognizing) return;
      const pdfFile = isPdf(file);
      if (!pdfFile && !file.type.startsWith('image/')) {
        setError('Chỉ hỗ trợ PDF, PNG, JPG, WEBP hoặc BMP.');
        return;
      }
      if (pdfFile && file.size > MAX_PDF_BYTES) {
        setError('PDF vượt quá 100 MB. Vui lòng chọn tệp nhỏ hơn.');
        return;
      }
      if (!pdfFile && file.size > MAX_IMAGE_BYTES) {
        setError('Ảnh vượt quá 12 MB. Vui lòng giảm kích thước ảnh.');
        return;
      }

      setPreview(file);
      onFileSelected?.(file);
      setRecognizing(true);
      setProgress(0);
      setStatus('Đang chuẩn bị ảnh');
      setError('');
      setResult(null);
      setConfidence(null);

      let worker:
        | Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>
        | undefined;
      try {
        const ocrSource = pdfFile ? await renderPdfFirstPage(file) : file;
        if (pdfFile) setStatus('Đã lấy trang 1 · đang tăng độ rõ');
        const images = await prepareImage(ocrSource);
        const { createWorker, PSM } = await import('tesseract.js');
        worker = await createWorker('vie+eng', 1, {
          logger: (message: LoggerMessage) => {
            setStatus(STATUS_LABELS[message.status] || message.status);
            if (typeof message.progress === 'number') {
              setProgress(Math.round(message.progress * 100));
            }
          },
        });
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        });
        const primaryResponse = await worker.recognize(images.fullPage);
        setStatus('Đang dò bổ sung chữ viết tay ở đầu trang');
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        });
        const supplementalResponse = await worker.recognize(images.header);
        const parsed = mergeVietnameseLegalDocumentOcrResults(
          parseVietnameseLegalDocumentOcr(primaryResponse.data.text),
          parseVietnameseLegalDocumentOcr(supplementalResponse.data.text),
        );
        setConfidence(
          Math.round(
            primaryResponse.data.confidence * 0.75
            + supplementalResponse.data.confidence * 0.25,
          ),
        );
        setResult(parsed);
        onExtract(parsed);
      } catch (ocrError) {
        setError(
          ocrError instanceof Error
            ? `Không thể nhận dạng ảnh: ${ocrError.message}`
            : 'Không thể nhận dạng ảnh. Vui lòng thử lại.',
        );
      } finally {
        if (worker) await worker.terminate().catch(() => undefined);
        setRecognizing(false);
      }
    },
    [disabled, onExtract, onFileSelected, recognizing, setPreview],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const image = findClipboardImage(event);
      if (!image || disabled || recognizing) return;
      event.preventDefault();
      void recognizeImage(image);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled, recognizeImage, recognizing]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = Array.from(event.dataTransfer.files).find((candidate) =>
      candidate.type.startsWith('image/') || isPdf(candidate),
    );
    if (file) void recognizeImage(file);
    else setError('Không tìm thấy PDF hoặc ảnh trong dữ liệu vừa thả.');
  };

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
          <ScanText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Nhận dạng nhanh bằng OCR tiếng Việt
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-gray-600">
            Dán/chọn ảnh hoặc tải PDF. PDF tối đa 100 MB và hệ thống chỉ OCR
            trang đầu tiên; tệp gốc sẽ được lưu để đối chiếu.
          </p>
        </div>
      </div>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`mt-3 rounded-xl border-2 border-dashed p-3 transition-colors ${
          dragging
            ? 'border-violet-500 bg-violet-100'
            : 'border-violet-200 bg-white'
        }`}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {previewUrl ? (
            fileName.toLocaleLowerCase('vi').endsWith('.pdf') ? (
              <div className="flex h-20 w-28 items-center justify-center rounded-lg border bg-red-50">
                <FileText className="h-8 w-8 text-red-500" />
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Ảnh văn bản chờ nhận dạng"
                className="h-20 w-28 rounded-lg border bg-gray-50 object-contain"
              />
            )
          ) : (
            <div className="flex h-20 w-28 items-center justify-center rounded-lg border bg-gray-50">
              <FileImage className="h-7 w-7 text-gray-400" />
            </div>
          )}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="truncate text-sm font-medium text-gray-800">
              {fileName || 'Dán ảnh từ clipboard hoặc chọn tệp'}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              PDF tối đa 100 MB (chỉ OCR trang 1) · ảnh tối đa 12 MB
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                disabled={disabled || recognizing}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Chọn ảnh / PDF
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
                <ClipboardPaste className="h-3.5 w-3.5" />
                Ctrl+V để dán ảnh
              </span>
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,image/bmp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void recognizeImage(file);
            event.currentTarget.value = '';
          }}
        />
      </div>

      {recognizing && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-violet-800">
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {status || 'Đang nhận dạng'}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-violet-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            OCR dùng tiếng Việt + tiếng Anh và dò riêng vùng đầu trang để nhận
            các số/ngày viết tay rõ hơn.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && !recognizing && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Đã tự điền {result.matchedFields.length}/7 trường
              {confidence !== null ? ` · độ tin cậy OCR ${confidence}%` : ''}.
              Vui lòng kiểm tra lại trước khi lưu.
            </span>
          </div>
          {result.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {result.warnings.map((warning) => (
                <p key={warning}>• {warning}</p>
              ))}
            </div>
          )}
          <details className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-gray-600">
              Xem nội dung OCR gốc
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5 text-gray-600">
              {result.normalizedText}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}

export default LegalDocumentOcrPanel;
