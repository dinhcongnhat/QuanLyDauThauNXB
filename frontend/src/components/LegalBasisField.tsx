'use client';

import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  LegalDocument,
  legalDocumentApi,
  normalizeManualCitation,
} from '@/lib/legal-document-api';

export interface LegalBasisSelection {
  legalDocumentId: string | null;
  source: 'LIBRARY' | 'MANUAL';
  citationSnapshot: string;
}

interface LegalBasisFieldProps {
  value: LegalBasisSelection[];
  onChange: (value: LegalBasisSelection[]) => void;
  disabled?: boolean;
  label?: string;
}

const EMPTY_MANUAL_BASIS: LegalBasisSelection = {
  legalDocumentId: null,
  source: 'MANUAL',
  citationSnapshot: '',
};

export function LegalBasisField({
  value,
  onChange,
  disabled = false,
  label = 'Căn cứ',
}: LegalBasisFieldProps) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<LegalDocument[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  useEffect(() => {
    if (pickerIndex === null) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const response = await legalDocumentApi.list({
          q: searchText,
          page: 1,
          limit: 20,
        });
        if (!cancelled) setResults(response.items);
      } catch (error) {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            error instanceof Error
              ? error.message
              : 'Không thể tải thư viện văn bản',
          );
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [pickerIndex, searchText]);

  const updateAt = (
    index: number,
    selection: LegalBasisSelection,
  ) => {
    onChange(
      value.map((item, itemIndex) =>
        itemIndex === index ? selection : item,
      ),
    );
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;

    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  const openPicker = (index: number) => {
    setPickerIndex(index);
    setSearchText('');
    setResults([]);
    setDuplicateError('');
  };

  const closePicker = () => {
    setPickerIndex(null);
    setSearchText('');
    setResults([]);
    setSearchError('');
    setDuplicateError('');
  };

  const selectDocument = (document: LegalDocument) => {
    if (pickerIndex === null) return;

    const isDuplicate = value.some(
      (item, index) =>
        index !== pickerIndex &&
        item.source === 'LIBRARY' &&
        item.legalDocumentId === document.id,
    );
    if (isDuplicate) {
      setDuplicateError('Văn bản này đã được chọn làm căn cứ.');
      return;
    }

    updateAt(pickerIndex, {
      legalDocumentId: document.id,
      source: 'LIBRARY',
      citationSnapshot: document.citation,
    });
    closePicker();
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-gray-800">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-gray-500">
          Có thể chọn từ thư viện hoặc nhập căn cứ chưa có trong thư viện.
        </p>
      </div>

      {value.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-500">
          Chưa có căn cứ nào.
        </div>
      )}

      {value.map((item, index) => (
        <div
          key={`${item.legalDocumentId || 'manual'}-${index}`}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                Căn cứ {index + 1}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.source === 'LIBRARY'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {item.source === 'LIBRARY' ? 'Thư viện' : 'Nhập tạm'}
              </span>
            </div>

            {!disabled && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Đưa lên"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Đưa xuống"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                  title="Xóa căn cứ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {item.source === 'LIBRARY' ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm leading-6 text-gray-800">
                {item.citationSnapshot || 'Chưa chọn văn bản'}
              </div>
              {!disabled && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openPicker(index)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    <BookOpen className="h-4 w-4" />
                    Đổi văn bản
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAt(index, { ...EMPTY_MANUAL_BASIS })}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Chuyển sang nhập tạm
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={3}
                value={item.citationSnapshot}
                disabled={disabled}
                onChange={(event) =>
                  updateAt(index, {
                    legalDocumentId: null,
                    source: 'MANUAL',
                    citationSnapshot: event.target.value,
                  })
                }
                onBlur={() =>
                  updateAt(index, {
                    legalDocumentId: null,
                    source: 'MANUAL',
                    citationSnapshot: normalizeManualCitation(
                      item.citationSnapshot,
                    ),
                  })
                }
                placeholder="Ví dụ: Luật Đấu thầu số 22/2023/QH15..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => openPicker(index)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  <BookOpen className="h-4 w-4" />
                  Chọn từ thư viện
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...value, { ...EMPTY_MANUAL_BASIS }])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary-300 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
        >
          <Plus className="h-4 w-4" />
          Thêm căn cứ
        </button>
      )}

      {pickerIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Chọn văn bản pháp lý"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePicker();
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Chọn căn cứ {pickerIndex + 1}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Tìm theo tên căn cứ, số hiệu, cơ quan, hình thức, lĩnh vực
                  hoặc trích yếu.
                </p>
              </div>
              <button
                type="button"
                onClick={closePicker}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setDuplicateError('');
                  }}
                  placeholder="Ví dụ: 22/2023/QH15"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-600" />
                )}
              </div>

              {(searchError || duplicateError) && (
                <p className="mt-2 text-sm text-red-600">
                  {duplicateError || searchError}
                </p>
              )}

              <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
                {!searching && !searchError && results.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                    Không tìm thấy văn bản phù hợp. Bạn có thể đóng cửa sổ
                    và nhập tạm căn cứ.
                  </div>
                )}
                {results.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => selectDocument(document)}
                    className="block w-full rounded-xl border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                  >
                    {document.tenCanCu && (
                      <p className="mb-1 font-medium text-blue-800">
                        {document.tenCanCu}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-gray-900">
                        {document.soHieu}
                      </span>
                      <span className="text-xs text-gray-500">
                        {document.hinhThucVanBan} · {document.linhVuc}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-gray-700">
                      {document.citation}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LegalBasisField;
