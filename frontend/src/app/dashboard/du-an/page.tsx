'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export default function DuAnPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ tenDuAn: '', procurementType: 'THAU_THIET_BI' });
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  // Member picker state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        api.getProjects(),
        api.getProjectStats(),
      ]);
      setProjects(data.projects || []);
      setStats(statsData);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProjects(); }, []);

  // Load users when create dialog opens
  useEffect(() => {
    if (showCreate && allUsers.length === 0) {
      api.getUsers().then((data: any) => setAllUsers(Array.isArray(data) ? data : (data?.users || []))).catch(() => {});
    }
  }, [showCreate]);

  const filteredUsers = allUsers.filter(u => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  }).filter(u => !selectedMembers.some(m => m.id === u.id));

  const toggleMember = (user: any) => {
    setSelectedMembers(prev =>
      prev.some(m => m.id === user.id)
        ? prev.filter(m => m.id !== user.id)
        : [...prev, user],
    );
  };

  const handleCreate = async () => {
    if (!createForm.tenDuAn.trim()) { toast.error('Vui lòng nhập tên dự án'); return; }
    setCreating(true);
    try {
      const memberIds = selectedMembers.map(m => m.id);
      await api.createProject(createForm.tenDuAn, createForm.procurementType, memberIds.length > 0 ? memberIds : undefined);
      toast.success('Tạo dự án thành công');
      setShowCreate(false);
      setCreateForm({ tenDuAn: '', procurementType: 'THAU_THIET_BI' });
      setSelectedMembers([]);
      setMemberSearch('');
      setShowMemberPicker(false);
      loadProjects();
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa dự án này?')) return;
    try {
      await api.deleteProject(id);
      toast.success('Xóa dự án thành công');
      loadProjects();
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setLoadingSummary(true);
    try {
      const data = await api.getProjectSummary(id);
      setSummaryData((prev: any) => ({ ...prev, [id]: data }));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoadingSummary(false); }
  };

  const filtered = filterType
    ? projects.filter((p: any) => p.procurementType === filterType)
    : projects;

  const stepLabels: Record<string, string> = {
    dat_sach: 'Đặt sách',
    du_toan: 'Phê duyệt Dự toán',
    khlcnt: 'Phê duyệt KHLCNT',
    lcnt: 'Lựa chọn Nhà thầu',
    thanh_toan: 'Thanh toán',
  };

  const stepStatusColor = (status: string) =>
    status === 'COMPLETED' ? 'bg-green-500' :
    status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-300';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Dự án</h1>
          <p className="text-gray-500 mt-1">
            {stats && (
              <span>{stats.total} dự án · {stats.inProgress} đang thực hiện · {stats.completed} hoàn thành</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Tạo dự án
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !filterType ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >Tất cả</button>
        <button
          onClick={() => setFilterType('THAU_THIET_BI')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
            filterType === 'THAU_THIET_BI' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" />Thầu Thiết Bị
        </button>
        <button
          onClick={() => setFilterType('THAU_SACH')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
            filterType === 'THAU_SACH' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-green-500" />Thầu Sách
        </button>
      </div>

      {/* Project List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p: any) => {
            const isExpanded = expandedId === p.id;
            const summary = summaryData[p.id];
            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Project Header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      p.procurementType === 'THAU_SACH' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.tenDuAn}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.procurementType === 'THAU_SACH' ? 'Thầu Sách' : 'Thầu Thiết Bị'}
                        {' · '}Tạo bởi {p.creator?.name}
                        {' · '}{format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      p.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                      p.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {p.status === 'IN_PROGRESS' ? 'Đang thực hiện' :
                       p.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}
                    </span>
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Project Summary (expanded) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="px-5 py-4 bg-gray-50">
                        {loadingSummary ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                          </div>
                        ) : summary ? (
                          <>
                            {/* Overall Progress */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="font-medium text-gray-700">Tiến độ tổng thể</span>
                                <span className="text-primary-600 font-semibold">{summary.overallProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${summary.overallProgress}%` }}
                                />
                              </div>
                            </div>

                            {/* Steps Timeline */}
                            <div className="space-y-2">
                              {summary.steps.map((step: any, idx: number) => (
                                <div key={step.key} className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${stepStatusColor(step.status)}`}>
                                    {step.status === 'COMPLETED' ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-white">
                                        <path d="M12.736 3.97a.733.733 0 011.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 01-1.065-.02l-2.244-2.245a.757.757 0 01-.021-1.055.733.733 0 011.04.01l1.505 1.518a.733.733 0 01.01 1.05l-1.505 1.518a.757.757 0 01-1.055.01l-1.505-1.518a.757.757 0 01-.01-1.055.733.733 0 011.04-.01l1.505 1.518a.757.757 0 01.01 1.055l-1.505 1.518a.757.757 0 01-1.055.01l1.505-1.518a.757.757 0 01.01-1.055.733.733 0 011.04-.01l1.505 1.518a.757.757 0 01.01 1.055l-.01 1.055a.733.733 0 01-.01 1.05z" />
                                      </svg>
                                    ) : (
                                      <span className="text-white text-[10px] font-bold">{idx + 1}</span>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700">{step.label}</span>
                                      <span className={`text-xs font-medium ${
                                        step.status === 'COMPLETED' ? 'text-green-600' :
                                        step.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-gray-400'
                                      }`}>
                                        {step.total > 0 ? `${step.count}/${step.total}` :
                                         step.status === 'COMPLETED' ? 'Hoàn thành' :
                                         step.status === 'IN_PROGRESS' ? 'Đang thực hiện' : 'Chưa bắt đầu'}
                                      </span>
                                    </div>
                                    {step.total > 0 && (
                                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                        <div
                                          className={`h-1 rounded-full ${stepStatusColor(step.status)}`}
                                          style={{ width: `${step.progress}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Stats */}
                            <div className="mt-4 grid grid-cols-4 gap-3">
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-gray-700">{summary.stats.totalDocuments}</p>
                                <p className="text-xs text-gray-400">Tài liệu</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-gray-700">{summary.stats.totalGoiThau}</p>
                                <p className="text-xs text-gray-400">Gói thầu</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-gray-700">{summary.stats.totalPayments}</p>
                                <p className="text-xs text-gray-400">Thanh toán</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-gray-700">{summary.stats.datSachProjects}</p>
                                <p className="text-xs text-gray-400">Đặt sách</p>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 px-5 py-3 bg-white border-t">
                        {p.procurementType === 'THAU_SACH' && (
                          <button
                            onClick={() => router.push(`/dashboard/mua-sam/sach/dat-sach?project=${p.id}`)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100"
                          >
                            Đặt sách
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/dashboard/mua-sam/${p.procurementType === 'THAU_SACH' ? 'sach' : 'thiet-bi'}/du-toan?project=${p.id}`)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100"
                        >
                          Dự toán
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/mua-sam/${p.procurementType === 'THAU_SACH' ? 'sach' : 'thiet-bi'}/khlcnt?project=${p.id}`)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100"
                        >
                          KH LCNT
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
              <p className="text-gray-400">Chưa có dự án nào</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
              >
                Tạo dự án đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Tạo dự án mới</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên dự án</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="VD: Mua sắm thiết bị văn phòng 2026"
                    value={createForm.tenDuAn}
                    onChange={e => setCreateForm({ ...createForm, tenDuAn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại thầu</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, procurementType: 'THAU_THIET_BI' })}
                      className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        createForm.procurementType === 'THAU_THIET_BI'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Thầu Thiết Bị
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, procurementType: 'THAU_SACH' })}
                      className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        createForm.procurementType === 'THAU_SACH'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Thầu Sách
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {createForm.procurementType === 'THAU_SACH'
                      ? 'Luồng: Đặt sách → Phê duyệt Dự toán → Phê duyệt KHLCNT → LCNT → Thanh toán'
                      : 'Luồng: Phê duyệt Dự toán → Phê duyệt KHLCNT → LCNT → Thanh toán'}
                  </p>
                </div>

                {/* Member Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành viên dự án</label>
                  {/* Selected members tags */}
                  {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 bg-gray-50 rounded-lg">
                      {selectedMembers.map(m => (
                        <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {m.name}
                          <button type="button" onClick={() => toggleMember(m)} className="hover:text-red-500 font-bold ml-0.5 transition-colors">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Dialog Trigger Button */}
                  <button
                    type="button"
                    onClick={() => { setShowMemberPicker(true); setMemberSearch(''); }}
                    className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  >
                    <span className="text-gray-500 font-normal">
                      {selectedMembers.length === 0 ? 'Chọn thành viên...' : `Đã chọn ${selectedMembers.length} người`}
                    </span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <p className="text-xs text-gray-400 mt-1.5">Chỉ thành viên mới có thể thấy dự án này.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo dự án'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Selection Popup Dialog */}
      {showMemberPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => setShowMemberPicker(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h4 className="font-semibold text-gray-900 text-base">Thành viên hệ thống</h4>
              <button onClick={() => setShowMemberPicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search input in dialog */}
            <div className="relative mb-3 shrink-0">
              <input
                type="text"
                placeholder="Tìm tên hoặc email..."
                className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Checkbox User List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-[150px]">
              {allUsers.filter(u => {
                if (!memberSearch.trim()) return true;
                const q = memberSearch.toLowerCase();
                return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
              }).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Không tìm thấy người dùng</p>
              ) : (
                allUsers.filter(u => {
                  if (!memberSearch.trim()) return true;
                  const q = memberSearch.toLowerCase();
                  return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                }).map(u => {
                  const isSelected = selectedMembers.some(m => m.id === u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(u)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer shrink-0"
                      />
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-500">Đã chọn {selectedMembers.length} người</span>
              <button
                type="button"
                onClick={() => setShowMemberPicker(false)}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
