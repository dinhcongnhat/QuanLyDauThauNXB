'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { docLibraryApi } from '@/lib/document-library-api';
import {
  Organization, Library, LibraryField, SavedValue,
  LibraryType, FieldType,
  LIBRARY_TYPE_LABELS, FIELD_TYPE_LABELS,
  useDocumentLibraryStore,
} from '@/lib/document-library-types';
import { LibrarySidebar } from '@/components/admin/LibrarySidebar';
import { FieldTypeIcon } from '@/components/admin/FieldTypeIcon';

const LOAI_OPTIONS: LibraryType[] = [
  'THONG_TIN_TO_CHUC', 'THONG_TIN_NHA_THAU', 'DIA_CHI', 'KY_TUONG', 'CUSTOM',
  'DAT_SACH_GDN', 'DAT_SACH_PCDI', 'DAT_SACH_QD',
  'DUTOAN_TT', 'DUTOAN_QD',
  'KHLCNT',
  'LCNT_STEP',
  'THANH_TOAN',
];
const FIELD_TYPE_OPTIONS: FieldType[] = ['TEXT', 'TEXTAREA', 'DATE', 'MONEY', 'NUMBER', 'EMAIL', 'PHONE'];

type Tab = 'organizations' | 'library-detail' | 'saved-values';

export default function ThuVienVanBanPage() {
  const [tab, setTab] = useState<Tab>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [activeLib, setActiveLib] = useState<Library | null>(null);
  const [activeFields, setActiveFields] = useState<LibraryField[]>([]);
  const [activeValues, setActiveValues] = useState<SavedValue[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showLibForm, setShowLibForm] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [showValueForm, setShowValueForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editingLib, setEditingLib] = useState<Library | null>(null);
  const [editingField, setEditingField] = useState<LibraryField | null>(null);
  const [editingValue, setEditingValue] = useState<SavedValue | null>(null);

  const [orgForm, setOrgForm] = useState({ ten: '', moTa: '' });
  const [libForm, setLibForm] = useState({ ten: '', loai: 'THONG_TIN_TO_CHUC' as LibraryType });
  const [fieldForm, setFieldForm] = useState({
    tenTruong: '', khoa: '', kieuDuLieu: 'TEXT' as FieldType,
    giaTriMacDinh: '', batBuoc: false, thuTu: 0, nhom: '',
  });
  const [valueForm, setValueForm] = useState({ tenGiaTri: '', duLieu: {} as Record<string, string> });
  const [saving, setSaving] = useState(false);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const data = await docLibraryApi.getOrganizations();
      setOrganizations(data);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const fetchLibraries = async (orgId?: string) => {
    try {
      const data = await docLibraryApi.getLibraries(orgId);
      setLibraries(data);
    } catch (err: any) { toast.error(err.message); }
  };

  const fetchLibraryDetail = async (libId: string) => {
    try {
      const data = await docLibraryApi.getLibrary(libId);
      setActiveLib(data);
      setActiveFields(data.fields || []);
      setActiveValues(data.savedValues || []);
    } catch (err: any) { toast.error(err.message); }
  };

  const selectOrg = async (org: Organization) => {
    setActiveOrg(org);
    setTab('library-detail');
    setActiveLib(null);
    try {
      const libs = await docLibraryApi.getLibraries(org.id);
      setLibraries(libs);
    } catch (err: any) { toast.error(err.message); }
  };

  const selectLib = async (lib: Library) => {
    await fetchLibraryDetail(lib.id);
    setTab('saved-values');
  };

  useEffect(() => { fetchOrganizations(); }, []);

  // Organization CRUD
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingOrg) {
        await docLibraryApi.updateOrganization(editingOrg.id, orgForm);
        toast.success('Cập nhật tổ chức thành công');
      } else {
        await docLibraryApi.createOrganization(orgForm);
        toast.success('Tạo tổ chức thành công');
      }
      await fetchOrganizations();
      setShowOrgForm(false);
      setEditingOrg(null);
      setOrgForm({ ten: '', moTa: '' });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm('Xoá tổ chức này? Tất cả thư viện và dữ liệu bên trong sẽ bị xoá.')) return;
    try {
      await docLibraryApi.deleteOrganization(id);
      toast.success('Đã xoá tổ chức');
      if (activeOrg?.id === id) setActiveOrg(null);
      await fetchOrganizations();
    } catch (err: any) { toast.error(err.message); }
  };

  const openEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setOrgForm({ ten: org.ten, moTa: org.moTa || '' });
    setShowOrgForm(true);
  };

  // Library CRUD
  const handleSaveLib = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      if (editingLib) {
        await docLibraryApi.updateLibrary(editingLib.id, libForm);
        toast.success('Cập nhật thư viện thành công');
      } else {
        await docLibraryApi.createLibrary({ ...libForm, organizationId: activeOrg.id });
        toast.success('Tạo thư viện thành công');
      }
      await fetchLibraries(activeOrg.id);
      setShowLibForm(false);
      setEditingLib(null);
      setLibForm({ ten: '', loai: 'THONG_TIN_TO_CHUC' });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteLib = async (lib: Library) => {
    if (!confirm(`Xoá thư viện "${lib.ten}"? Tất cả fields và giá trị sẽ bị xoá.`)) return;
    try {
      await docLibraryApi.deleteLibrary(lib.id);
      toast.success('Đã xoá thư viện');
      if (activeLib?.id === lib.id) setActiveLib(null);
      if (activeOrg) await fetchLibraries(activeOrg.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const openEditLib = (lib: Library) => {
    setEditingLib(lib);
    setLibForm({ ten: lib.ten, loai: lib.loai as LibraryType });
    setShowLibForm(true);
  };

  // Field CRUD
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLib) return;
    setSaving(true);
    try {
      if (editingField) {
        await docLibraryApi.updateField(activeLib.id, editingField.id, fieldForm);
        toast.success('Cập nhật trường thành công');
      } else {
        await docLibraryApi.createField(activeLib.id, fieldForm);
        toast.success('Thêm trường thành công');
      }
      await fetchLibraryDetail(activeLib.id);
      setShowFieldForm(false);
      setEditingField(null);
      setFieldForm({ tenTruong: '', khoa: '', kieuDuLieu: 'TEXT', giaTriMacDinh: '', batBuoc: false, thuTu: 0, nhom: '' });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Xoá trường này?')) return;
    if (!activeLib) return;
    try {
      await docLibraryApi.deleteField(activeLib.id, fieldId);
      toast.success('Đã xoá trường');
      await fetchLibraryDetail(activeLib.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const openEditField = (field: LibraryField) => {
    setEditingField(field);
    setFieldForm({
      tenTruong: field.tenTruong,
      khoa: field.khoa,
      kieuDuLieu: field.kieuDuLieu as FieldType,
      giaTriMacDinh: field.giaTriMacDinh || '',
      batBuoc: field.batBuoc,
      thuTu: field.thuTu,
      nhom: field.nhom || '',
    });
    setShowFieldForm(true);
  };

  // Saved Value CRUD
  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLib) return;
    setSaving(true);
    try {
      if (editingValue) {
        await docLibraryApi.updateValue(activeLib.id, editingValue.id, valueForm);
        toast.success('Cập nhật giá trị thành công');
      } else {
        await docLibraryApi.saveValue(activeLib.id, valueForm);
        toast.success('Lưu giá trị thành công');
      }
      await fetchLibraryDetail(activeLib.id);
      setShowValueForm(false);
      setEditingValue(null);
      setValueForm({ tenGiaTri: '', duLieu: {} });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteValue = async (valueId: string) => {
    if (!confirm('Xoá giá trị đã lưu này?')) return;
    if (!activeLib) return;
    try {
      await docLibraryApi.deleteValue(activeLib.id, valueId);
      toast.success('Đã xoá giá trị');
      await fetchLibraryDetail(activeLib.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const openEditValue = (val: SavedValue) => {
    setEditingValue(val);
    setValueForm({ tenGiaTri: val.tenGiaTri, duLieu: val.duLieu });
    setShowValueForm(true);
  };

  const getLoaiColor = (loai: LibraryType) => {
    const colors: Record<LibraryType, string> = {
      THONG_TIN_TO_CHUC: 'bg-blue-100 text-blue-700',
      THONG_TIN_NHA_THAU: 'bg-amber-100 text-amber-700',
      DIA_CHI: 'bg-green-100 text-green-700',
      KY_TUONG: 'bg-purple-100 text-purple-700',
      CUSTOM: 'bg-gray-100 text-gray-700',
      DAT_SACH_GDN: 'bg-indigo-100 text-indigo-700',
      DAT_SACH_PCDI: 'bg-indigo-100 text-indigo-700',
      DAT_SACH_QD: 'bg-indigo-100 text-indigo-700',
      DUTOAN_TT: 'bg-teal-100 text-teal-700',
      DUTOAN_QD: 'bg-teal-100 text-teal-700',
      KHLCNT: 'bg-orange-100 text-orange-700',
      LCNT_STEP: 'bg-pink-100 text-pink-700',
      THANH_TOAN: 'bg-red-100 text-red-700',
    };
    return colors[loai] || 'bg-gray-100 text-gray-700';
  };

  const renderOrgCard = (org: Organization) => (
    <div key={org.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{org.ten}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{org.moTa || 'Không có mô tả'}</p>
          <div className="flex gap-2 mt-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {org.libraries?.length || 0} thư viện
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => openEditOrg(org)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.5l-6.97 6.97.93 3.417 3.416-.929L11.189 6.25Z" /></svg>
          </button>
          <button onClick={() => handleDeleteOrg(org.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xoá">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => selectOrg(org)} className="flex-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs font-medium transition-colors">
          Quản lý thư viện
        </button>
      </div>
    </div>
  );

  const renderFieldRow = (field: LibraryField) => (
    <tr key={field.id} className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{field.tenTruong}</td>
      <td className="px-4 py-3 text-xs font-mono text-gray-500">{field.khoa}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <FieldTypeIcon type={field.kieuDuLieu as FieldType} />
          {FIELD_TYPE_LABELS[field.kieuDuLieu as FieldType]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{field.nhom || '-'}</td>
      <td className="px-4 py-3 text-center">
        {field.batBuoc && <span className="text-xs text-red-500 font-medium">Bắt buộc</span>}
      </td>
      <td className="px-4 py-3 text-center">
        <button onClick={() => openEditField(field)} className="p-1 text-gray-400 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086Z" /></svg></button>
        <button onClick={() => handleDeleteField(field.id)} className="p-1 text-gray-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" clipRule="evenodd" /></svg></button>
      </td>
    </tr>
  );

  const renderValueRow = (val: SavedValue) => (
    <tr key={val.id} className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{val.tenGiaTri}</td>
      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{JSON.stringify(val.duLieu)}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{new Date(val.createdAt).toLocaleDateString('vi-VN')}</td>
      <td className="px-4 py-3 text-center">
        <button onClick={() => openEditValue(val)} className="p-1 text-gray-400 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086Z" /></svg></button>
        <button onClick={() => handleDeleteValue(val.id)} className="p-1 text-gray-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" clipRule="evenodd" /></svg></button>
      </td>
    </tr>
  );

  const renderValueForm = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">{editingValue ? 'Sửa giá trị' : 'Lưu giá trị mới'}</h3>
      <form onSubmit={handleSaveValue} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên giá trị</label>
          <input type="text" value={valueForm.tenGiaTri} onChange={e => setValueForm({ ...valueForm, tenGiaTri: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="VD: Công ty ABC" required />
        </div>
        {activeFields.map(f => (
          <div key={f.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.tenTruong}</label>
            {f.kieuDuLieu === 'TEXTAREA' ? (
              <textarea value={(valueForm.duLieu[f.khoa] as string) || ''}
                onChange={e => setValueForm({ ...valueForm, duLieu: { ...valueForm.duLieu, [f.khoa]: e.target.value } })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 min-h-[60px]" />
            ) : f.kieuDuLieu === 'DATE' ? (
              <input type="date" value={(valueForm.duLieu[f.khoa] as string) || ''}
                onChange={e => setValueForm({ ...valueForm, duLieu: { ...valueForm.duLieu, [f.khoa]: e.target.value } })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            ) : (
              <input type={f.kieuDuLieu === 'EMAIL' ? 'email' : f.kieuDuLieu === 'NUMBER' ? 'number' : 'text'}
                value={(valueForm.duLieu[f.khoa] as string) || ''}
                onChange={e => setValueForm({ ...valueForm, duLieu: { ...valueForm.duLieu, [f.khoa]: e.target.value } })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={f.giaTriMacDinh || ''} />
            )}
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => { setShowValueForm(false); setEditingValue(null); setValueForm({ tenGiaTri: '', duLieu: {} }); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Hủy</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm">
            {saving ? 'Đang lưu...' : (editingValue ? 'Cập nhật' : 'Lưu giá trị')}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Quản lý hệ thống</h2>
          <LibrarySidebar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Thư viện Văn Bản</h1>
          <p className="text-gray-500 mt-1">Quản lý tổ chức, thư viện, trường thông tin và giá trị tái sử dụng</p>
        </div>

        {/* Breadcrumb */}
        {(activeOrg || activeLib) && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button onClick={() => { setActiveOrg(null); setActiveLib(null); setTab('organizations'); }}
              className="hover:text-primary-600 transition-colors">Tổ chức</button>
            {activeOrg && (
              <>
                <span>/</span>
                <button onClick={() => { setActiveLib(null); setTab('library-detail'); }}
                  className="hover:text-primary-600 transition-colors">{activeOrg.ten}</button>
              </>
            )}
            {activeLib && (
              <>
                <span>/</span>
                <span className="text-gray-900 font-medium">{activeLib.ten}</span>
              </>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => { setTab('organizations'); setActiveOrg(null); setActiveLib(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'organizations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            Tổ chức
          </button>
          {activeOrg && (
            <button onClick={() => { setTab('library-detail'); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'library-detail' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Thư viện
            </button>
          )}
          {activeLib && (
            <button onClick={() => { setTab('saved-values'); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'saved-values' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Giá trị đã lưu
            </button>
          )}
        </div>

        {/* ── ORGANIZATIONS TAB ── */}
        {tab === 'organizations' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Danh sách Tổ chức</h2>
              <button onClick={() => { setShowOrgForm(true); setEditingOrg(null); setOrgForm({ ten: '', moTa: '' }); }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                + Thêm Tổ chức
              </button>
            </div>

            {showOrgForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4">{editingOrg ? 'Sửa Tổ chức' : 'Thêm Tổ chức mới'}</h3>
                <form onSubmit={handleSaveOrg} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên tổ chức</label>
                    <input type="text" value={orgForm.ten} onChange={e => setOrgForm({ ...orgForm, ten: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="VD: Tổ chức A - Chủ đầu tư" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                    <input type="text" value={orgForm.moTa} onChange={e => setOrgForm({ ...orgForm, moTa: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Mô tả ngắn..." />
                  </div>
                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <button type="button" onClick={() => { setShowOrgForm(false); setEditingOrg(null); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Hủy</button>
                    <button type="submit" disabled={saving}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm">
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
            ) : organizations.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500">Chưa có tổ chức nào. Nhấn "Thêm Tổ chức" để bắt đầu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map(renderOrgCard)}
              </div>
            )}
          </div>
        )}

        {/* ── LIBRARIES TAB ── */}
        {tab === 'library-detail' && activeOrg && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Thư viện: {activeOrg.ten}</h2>
                <p className="text-sm text-gray-500">{activeOrg.moTa}</p>
              </div>
              <button onClick={() => { setShowLibForm(true); setEditingLib(null); setLibForm({ ten: '', loai: 'THONG_TIN_TO_CHUC' }); }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                + Thêm Thư viện
              </button>
            </div>

            {showLibForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4">{editingLib ? 'Sửa Thư viện' : 'Thêm Thư viện mới'}</h3>
                <form onSubmit={handleSaveLib} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên thư viện</label>
                    <input type="text" value={libForm.ten} onChange={e => setLibForm({ ...libForm, ten: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="VD: Thông tin Chủ đầu tư" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại thư viện</label>
                    <select value={libForm.loai} onChange={e => setLibForm({ ...libForm, loai: e.target.value as LibraryType })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
                      {LOAI_OPTIONS.map(t => <option key={t} value={t}>{LIBRARY_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <button type="button" onClick={() => { setShowLibForm(false); setEditingLib(null); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Hủy</button>
                    <button type="submit" disabled={saving}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm">
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {libraries.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500">Chưa có thư viện nào trong tổ chức này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {libraries.map(lib => (
                  <div key={lib.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{lib.ten}</h3>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getLoaiColor(lib.loai as LibraryType)}`}>
                            {LIBRARY_TYPE_LABELS[lib.loai as LibraryType]}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                          <span>{lib._count?.fields || lib.fields?.length || 0} trường</span>
                          <span>{lib._count?.savedValues || lib.savedValues?.length || 0} giá trị</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => selectLib(lib)}
                          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs font-medium">
                          Quản lý
                        </button>
                        <button onClick={() => openEditLib(lib)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086Z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteLib(lib)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FIELDS + VALUES TAB ── */}
        {tab === 'saved-values' && activeLib && (
          <div>
            {/* Library Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{activeLib.ten}</h2>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getLoaiColor(activeLib.loai as LibraryType)}`}>
                  {LIBRARY_TYPE_LABELS[activeLib.loai as LibraryType]}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowFieldForm(true); setEditingField(null); setFieldForm({ tenTruong: '', khoa: '', kieuDuLieu: 'TEXT', giaTriMacDinh: '', batBuoc: false, thuTu: 0, nhom: '' }); }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                + Thêm Trường
              </button>
                <button onClick={() => { setShowValueForm(true); setEditingValue(null); setValueForm({ tenGiaTri: '', duLieu: {} }); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                + Lưu Giá trị
              </button>
              </div>
            </div>

            {/* Value Form */}
            {showValueForm && renderValueForm()}

            {/* Field Form */}
            {showFieldForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h3 className="text-lg font-semibold mb-4">{editingField ? 'Sửa Trường' : 'Thêm Trường mới'}</h3>
                <form onSubmit={handleSaveField} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên trường (label)</label>
                    <input type="text" value={fieldForm.tenTruong} onChange={e => setFieldForm({ ...fieldForm, tenTruong: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="VD: Tên công ty" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khoá (key)</label>
                    <input type="text" value={fieldForm.khoa} onChange={e => setFieldForm({ ...fieldForm, khoa: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                      placeholder="VD: cdt_ten_cong_ty" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kiểu dữ liệu</label>
                    <select value={fieldForm.kieuDuLieu} onChange={e => setFieldForm({ ...fieldForm, kieuDuLieu: e.target.value as FieldType })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
                      {FIELD_TYPE_OPTIONS.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm</label>
                    <input type="text" value={fieldForm.nhom} onChange={e => setFieldForm({ ...fieldForm, nhom: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="VD: Thông tin chung" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị mặc định</label>
                    <input type="text" value={fieldForm.giaTriMacDinh} onChange={e => setFieldForm({ ...fieldForm, giaTriMacDinh: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                    <input type="number" value={fieldForm.thuTu} onChange={e => setFieldForm({ ...fieldForm, thuTu: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="batBuoc" checked={fieldForm.batBuoc}
                      onChange={e => setFieldForm({ ...fieldForm, batBuoc: e.target.checked })} className="w-4 h-4" />
                    <label htmlFor="batBuoc" className="text-sm text-gray-700">Bắt buộc</label>
                  </div>
                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <button type="button" onClick={() => { setShowFieldForm(false); setEditingField(null); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Hủy</button>
                    <button type="submit" disabled={saving}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm">
                      {saving ? 'Đang lưu...' : 'Lưu Trường'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Fields Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Trường thông tin ({activeFields.length})</h3>
              </div>
              {activeFields.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Chưa có trường nào. Nhấn "Thêm Trường" để bắt đầu.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Tên trường</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Khoá</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Kiểu</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nhóm</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">Bắt buộc</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>{activeFields.map(renderFieldRow)}</tbody>
                </table>
              )}
            </div>

            {/* Saved Values Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Giá trị đã lưu ({activeValues.length})</h3>
              </div>
              {activeValues.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Chưa có giá trị nào. Điền thông tin vào form rồi nhấn "Lưu Giá trị".</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Tên</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Dữ liệu</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>{activeValues.map(renderValueRow)}</tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
