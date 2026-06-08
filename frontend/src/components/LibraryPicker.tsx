'use client';

import { useState, useEffect, useRef } from 'react';
import { docLibraryApi } from '@/lib/document-library-api';
import { Library, SavedValue, LibraryType, LIBRARY_TYPE_LABELS, MODULE_LIBRARY_LABELS, ModuleLibraryType } from '@/lib/document-library-types';
import toast from 'react-hot-toast';

interface LibraryPickerProps {
  libraryType: LibraryType;
  onSelect: (savedValue: SavedValue) => void;
  onSaveToLibrary: (savedValue: SavedValue) => void;
  trigger?: React.ReactNode;
  module?: ModuleLibraryType;
}

export function LibraryPicker({ libraryType, onSelect, onSaveToLibrary, trigger, module }: LibraryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLib, setSelectedLib] = useState<Library | null>(null);
  const [values, setValues] = useState<SavedValue[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openPicker = async () => {
    setIsOpen(true);
    setLoading(true);
    try {
      let filtered: any[];
      if (module) {
        filtered = await docLibraryApi.getLibrariesByTypes([module]);
      } else {
        const libs: any[] = await docLibraryApi.getLibraries();
        filtered = libs.filter((l: any) => l.loai === libraryType);
      }
      setLibraries(filtered);
      if (filtered.length === 1) {
        setSelectedLib(filtered[0]);
        const vals = await docLibraryApi.getSavedValues(filtered[0].id);
        setValues(vals);
      } else {
        setSelectedLib(null);
        setValues([]);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const selectLibrary = async (lib: Library) => {
    setSelectedLib(lib);
    try {
      const vals = await docLibraryApi.getSavedValues(lib.id);
      setValues(vals);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSelect = (val: SavedValue) => {
    onSelect(val);
    setIsOpen(false);
    toast.success('Đã điền thông tin từ thư viện');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={openPicker}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
        title="Điền từ thư viện văn bản"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1Z" />
          <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3Zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3Z" />
        </svg>
        {trigger || 'Từ thư viện'}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg w-80 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Thư viện: {LIBRARY_TYPE_LABELS[libraryType]}
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Đang tải...</div>
          ) : libraries.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>Chưa có thư viện cho loại này.</p>
              <p className="text-xs mt-1 text-gray-400">Vào Thư viện Văn Bản để tạo.</p>
            </div>
          ) : (
            <>
              {libraries.length > 1 && !selectedLib && (
                <div className="p-2">
                  <p className="text-xs text-gray-500 px-2 mb-1">Chọn thư viện:</p>
                  {libraries.map(lib => (
                    <button key={lib.id} onClick={() => selectLibrary(lib)}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="font-medium text-gray-900">{lib.ten}</span>
                      <span className="text-xs text-gray-400 ml-2">({lib._count?.savedValues || 0} giá trị)</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedLib && (
                <>
                  {libraries.length > 1 && (
                    <div className="p-2 border-b border-gray-100">
                      <button onClick={() => { setSelectedLib(null); setValues([]); }}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0Z" clipRule="evenodd" /></svg>
                        {selectedLib.ten}
                      </button>
                    </div>
                  )}

                  <div className="p-2">
                    <p className="text-xs text-gray-500 px-2 mb-1">
                      {values.length > 0 ? 'Chọn giá trị:' : 'Chưa có giá trị nào.'}
                    </p>
                    {values.length === 0 && selectedLib._count?.savedValues === 0 && (
                      <p className="text-xs text-center text-gray-400 py-2">Không có giá trị nào được lưu.</p>
                    )}
                    {values.map(val => (
                      <button key={val.id} onClick={() => handleSelect(val)}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 hover:text-blue-800 transition-colors group">
                        <span className="font-medium">{val.tenGiaTri}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {Object.keys(val.duLieu || {}).length} trường
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <div className="p-2 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              Liên hệ Admin để thêm dữ liệu vào thư viện
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface SaveToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryType: LibraryType;
  formData: Record<string, string>;
  formFieldKeys: string[];
  onSave: () => void;
}

export function SaveToLibraryModal({ isOpen, onClose, libraryType, formData, formFieldKeys, onSave }: SaveToLibraryModalProps) {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibId, setSelectedLibId] = useState('');
  const [tenGiaTri, setTenGiaTri] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const libs: any[] = await docLibraryApi.getLibraries();
        setLibraries(libs.filter((l: any) => l.loai === libraryType));
      } catch (err: any) { toast.error(err.message); }
      finally { setLoading(false); }
    };
    load();
  }, [isOpen, libraryType]);

  const handleSave = async () => {
    if (!selectedLibId || !tenGiaTri.trim()) {
      toast.error('Vui lòng chọn thư viện và nhập tên giá trị');
      return;
    }
    setSaving(true);
    try {
      const duLieu: Record<string, any> = {};
      for (const key of formFieldKeys) {
        if (formData[key] !== undefined) {
          duLieu[key] = formData[key];
        }
      }
      await docLibraryApi.saveValue(selectedLibId, { tenGiaTri: tenGiaTri.trim(), duLieu });
      toast.success('Đã lưu vào thư viện văn bản!');
      onSave();
      onClose();
      setTenGiaTri('');
      setSelectedLibId('');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Lưu vào Thư viện Văn Bản</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thư viện</label>
            {loading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select value={selectedLibId} onChange={e => setSelectedLibId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">-- Chọn thư viện --</option>
                {libraries.map(lib => (
                  <option key={lib.id} value={lib.id}>{lib.ten}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên giá trị</label>
            <input type="text" value={tenGiaTri} onChange={e => setTenGiaTri(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="VD: Công ty ABC" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dữ liệu sẽ lưu:</label>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 max-h-32 overflow-y-auto">
              {formFieldKeys.filter(k => formData[k]?.trim()).map(key => (
                <div key={key} className="flex gap-2 py-0.5">
                  <span className="font-medium text-gray-700 min-w-0 break-all">{key}:</span>
                  <span className="truncate">{formData[key]}</span>
                </div>
              ))}
              {formFieldKeys.filter(k => formData[k]?.trim()).length === 0 && (
                <p className="text-gray-400 italic">Chưa có dữ liệu nào được nhập</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving || !selectedLibId || !tenGiaTri.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm">
            {saving ? 'Đang lưu...' : 'Lưu vào thư viện'}
          </button>
        </div>
      </div>
    </div>
  );
}
