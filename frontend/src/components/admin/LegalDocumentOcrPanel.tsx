'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  FileImage,
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
  parseVietnameseLegalDocumentOcr,
} from '@/lib/vietnamese-legal-document-ocr';

interface LegalDocumentOcrPanelProps {
  onExtract: (result: LegalDocumentOcrResult) => void;
  disabled?: boolean;
}

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Đang tải bộ máy OCR',
  'initializing tesseract': 'Đang khởi tạo OCR',
  'loading language traineddata': 'Đang tải dữ liệu tiếng Việt',
  'initializing api': 'Đang chuẩn bị nhận dạng',
  'recognizing text': 'Đang nhận dạng nội dung',
};

async function prepareImage(file: File): Promise<File | Blob> {
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(3, Math.max(1, 1800 / bitmap.width));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }

    context.filter = 'grayscale(1) contrast(1.25)';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return (
      (await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 1),
      )) || file
    );
  } catch {
    return file;
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
      if (!file.type.startsWith('image/')) {
        setError('Chỉ hỗ trợ tệp ảnh PNG, JPG, WEBP hoặc BMP.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError('Ảnh vượt quá 12 MB. Vui lòng giảm kích thước ảnh.');
        return;
      }

      setPreview(file);
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
        const image = await prepareImage(file);
        const { createWorker } = await import('tesseract.js');
        worker = await createWorker('vie', 1, {
          logger: (message: LoggerMessage) => {
            setStatus(STATUS_LABELS[message.status] || message.status);
            if (typeof message.progress === 'number') {
              setProgress(Math.round(message.progress * 100));
            }
          },
        });
        const response = await worker.recognize(image);
        const parsed = parseVietnameseLegalDocumentOcr(response.data.text);
        setConfidence(Math.round(response.data.confidence));
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
    [disabled, onExtract, recognizing, setPreview],
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
      candidate.type.startsWith('image/'),
    );
    if (file) void recognizeImage(file);
    else setError('Không tìm thấy ảnh trong dữ liệu vừa thả.');
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
            Chụp phần đầu văn bản rồi nhấn Ctrl+V, hoặc chọn/kéo ảnh vào đây.
            Ảnh chỉ được xử lý trên trình duyệt và không tự lưu.
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
            <img
              src={previewUrl}
              alt="Ảnh văn bản chờ nhận dạng"
              className="h-20 w-28 rounded-lg border bg-gray-50 object-contain"
            />
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
              PNG, JPG, WEBP, BMP · tối đa 12 MB
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                disabled={disabled || recognizing}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Chụp / chọn ảnh
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
          accept="image/png,image/jpeg,image/webp,image/bmp"
          capture="environment"
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
            Lần đầu có thể lâu hơn vì trình duyệt cần tải dữ liệu tiếng Việt.
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
