'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

const PROJ_TYPE = 'THAU_SACH';

function formatMoney(value: string | number): string {
  if (!value) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/[.,]/g, '')) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('vi-VN');
}

export default function SachDatSachPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <SachDatSachPageInner />
    </Suspense>
  );
}

function SachDatSachPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [datSachProjects, setDatSachProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tenDuAn, setTenDuAn] = useState('');
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [filling, setFilling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const projectList = await api.getProjects();
      setProjects(projectList.filter((p: any) => p.procurementType === PROJ_TYPE));
      if (selectedProject) {
        const summary = await api.getProjectSummary(selectedProject);
        setDatSachProjects(summary.datSachProjects || []);
      } else {
        setDatSachProjects([]);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectedProject]);

  const loadMyAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const data = await api.getMyAssignments();
      setMyAssignments(Array.isArray(data) ? data : []);
    } catch { setMyAssignments([]); }
    finally { setLoadingAssignments(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { loadMyAssignments(); }, [loadMyAssignments]);

  useEffect(() => {
    const interval = setInterval(loadMyAssignments, 30000);
    return () => clearInterval(interval);
  }, [loadMyAssignments]);

  const currentProject = projects.find((p: any) => p.id === selectedProject);
  const hasDatSachCompleted = datSachProjects.some((d: any) => d.reviewStatus === 'APPROVED');
  const currentDatSach = datSachProjects[0];

  const gdnStatus = currentDatSach?.gdnDocuments?.[0]?.status;
  const pcdiStatus = currentDatSach?.pcdiDocuments?.[0]?.status;

  const handleCreateDatSach = async () => {
    if (!tenDuAn.trim()) { toast.error('Nhập tên dự án'); return; }
    setCreating(true);
    try {
      const dsProject = await api.createDatSachProjectFromProject(selectedProject, tenDuAn);
      toast.success('Đã tạo đơn đặt sách');
      setShowCreateModal(false);
      setTenDuAn('');
      router.push(`/dashboard/mua-sam/dat-sach/${dsProject.id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const handleFillAssignment = async (gdnId: string, userId: string, soLuong: string) => {
    const num = parseInt(soLuong.replace(/[.,]/g, ''));
    if (!soLuong || isNaN(num) || num <= 0) { toast.error('Nhập số lượng hợp lệ'); return; }
    setFilling(gdnId + userId);
    try {
      await api.fillSL(gdnId, userId, num);
      toast.success('Đã cập nhật số lượng');
      loadMyAssignments();
    } catch (err: any) { toast.error(err.message); }
    finally { setFilling(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đặt sách</h1>
        <p className="text-gray-500 mt-1 text-sm">Thầu Sách — Luồng: GDN In → PCDI → QĐ → Auto-fill vào Dự toán → KHLCNT</p>
      </div>

      {/* My Assignments Section */}
      {myAssignments.length > 0 && (
        <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-orange-800">📋 Việc cần làm: Bạn được giao nhập số lượng</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-orange-200 text-orange-800 font-medium">{myAssignments.length} việc</span>
          </div>
          <div className="space-y-3">
            {myAssignments.map((a: any) => {
              const gdn = a.gdnInSach;
              const project = gdn?.datSachProject;
              const hasCompleted = !!a.completedAt;
              const needsRework = gdn?.status === 'REWORK';
              const statusBadge = hasCompleted ? (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Đã điền ({formatMoney(a.soLuong)} cuốn)</span>
              ) : needsRework ? (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Cần sửa lại: {gdn?.reviewComment || '—'}</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">Chưa điền</span>
              );
              return (
                <div key={a.id} className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project?.tenDuAn || 'Dự án đặt sách'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        GDN: {gdn?.data?.tenSach || gdn?.data?.TenSach || '—'} &bull; {gdn?.data?.tacGia || gdn?.data?.TacGia || '—'}
                      </p>
                    </div>
                    {statusBadge}
                  </div>
                  {!hasCompleted && !needsRework && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32 focus:ring-2 focus:ring-primary-500 outline-none"
                        defaultValue={a.soLuong ? formatMoney(a.soLuong) : ''}
                        placeholder="VD: 500"
                        onBlur={e => {
                          if (e.target.value) handleFillAssignment(gdn.id, a.userId, e.target.value);
                        }}
                      />
                      <span className="text-xs text-gray-500">cuốn</span>
                      <span className={`text-xs ml-auto ${filling === gdn.id + a.userId ? 'text-orange-500' : 'text-gray-400'}`}>
                        {filling === gdn.id + a.userId ? 'Đang lưu...' : 'Enter để lưu'}
                      </span>
                    </div>
                  )}
                  {!hasCompleted && a.soLuong > 0 && (
                    <p className="text-xs text-green-600 mt-1 font-medium">✓ Đã nhập: {formatMoney(a.soLuong)} cuốn</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loadingAssignments && myAssignments.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-orange-400 border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-gray-500">Đang tải việc được giao...</span>
        </div>
      )}

      {!loadingAssignments && myAssignments.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400 border border-gray-100">
          Không có việc được giao. Các dự án đặt sách bạn tham gia sẽ hiển thị ở đây.
        </div>
      )}

      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
        <label className="block text-sm font-medium text-green-900 mb-2">Chọn dự án</label>
        <select
          className="w-full max-w-md bg-white border border-green-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
          value={selectedProject}
          onChange={e => { setSelectedProject(e.target.value); setTenDuAn(''); }}
        >
          <option value="">— Chọn dự án Thầu Sách —</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.tenDuAn}</option>
          ))}
        </select>
      </div>

      {!selectedProject ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 border">
          Vui lòng chọn một dự án để xem và tạo đơn đặt sách.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Dự án</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{currentProject?.tenDuAn}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Người tạo: {currentProject?.creator?.name} - {format(new Date(currentProject?.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </p>
              </div>
              <div className="text-right">
                {currentDatSach ? (
                  hasDatSachCompleted ? (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-50 text-green-700">✓ Hoàn thành</span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-yellow-50 text-yellow-700">✓ Đang thực hiện</span>
                  )
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-600">Chưa bắt đầu</span>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Luồng Đặt sách</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    gdnStatus === 'APPROVED' ? 'bg-green-500 text-white' :
                    gdnStatus ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>1</div>
                  <span className="text-xs whitespace-nowrap text-gray-600">GDN</span>
                </div>
                <div className="w-6 h-0.5 bg-gray-200 shrink-0" />
                <div className="flex items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    pcdiStatus === 'APPROVED' ? 'bg-green-500 text-white' :
                    pcdiStatus ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>2</div>
                  <span className="text-xs whitespace-nowrap text-gray-600">PCDI</span>
                </div>
                <div className="w-6 h-0.5 bg-gray-200 shrink-0" />
                <div className="flex items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasDatSachCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>3</div>
                  <span className="text-xs whitespace-nowrap text-gray-600">QĐ</span>
                </div>
                <div className="w-6 h-0.5 bg-gray-200 shrink-0" />
                <div className="flex items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasDatSachCompleted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>4</div>
                  <span className="text-xs whitespace-nowrap text-gray-600">Dự toán</span>
                </div>
                <div className="w-6 h-0.5 bg-gray-200 shrink-0" />
                <div className="flex items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasDatSachCompleted ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>5</div>
                  <span className="text-xs whitespace-nowrap text-gray-600">KHLCNT</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {hasDatSachCompleted
                  ? 'Đặt sách hoàn thành. Chuyển sang bước tiếp theo.'
                  : currentDatSach ? 'Tiếp tục với bước hiện tại.' : 'Bắt đầu từ GDN In Sách.'}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t flex gap-2 flex-wrap">
              {currentDatSach ? (
                <button
                  onClick={() => router.push(`/dashboard/mua-sam/dat-sach/${currentDatSach.id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  → Quản lý Đặt sách
                </button>
              ) : (
                <button
                  onClick={() => { setTenDuAn(currentProject?.tenDuAn || ''); setShowCreateModal(true); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  + Tạo đơn Đặt sách
                </button>
              )}
              {hasDatSachCompleted && (
                <button
                  onClick={() => router.push(`/dashboard/mua-sam/sach/du-toan?project=${selectedProject}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  → Tiếp: Phê duyệt Dự toán
                </button>
              )}
            </div>
          </div>

          {datSachProjects.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border space-y-4">
              <h3 className="text-base font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                ⏳ Lịch sử đơn đặt sách của dự án
              </h3>
              <div className="divide-y divide-gray-100">
                {datSachProjects.map((ds: any) => {
                  const dsGdn = ds.gdnDocuments?.[0];
                  const dsPcdi = ds.pcdiDocuments?.[0];
                  const dsGdnStatus = dsGdn?.status;
                  const dsPcdiStatus = dsPcdi?.status;
                  const dsQdStatus = ds.reviewStatus; // APPROVED = QD Approved
                  
                  return (
                    <div key={ds.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ds.tenDuAn}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            dsGdnStatus === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                            dsGdnStatus === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            dsGdnStatus === 'REWORK' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}>
                            GDN: {dsGdnStatus === 'APPROVED' ? 'Đã duyệt' : dsGdnStatus === 'PENDING_REVIEW' ? 'Chờ duyệt' : dsGdnStatus === 'REWORK' ? 'Cần sửa' : 'Nháp'}
                          </span>
                          
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            dsPcdiStatus === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                            dsPcdiStatus === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            dsPcdiStatus === 'REWORK' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}>
                            PCDI: {dsPcdiStatus === 'APPROVED' ? 'Đã duyệt' : dsPcdiStatus === 'PENDING_REVIEW' ? 'Chờ duyệt' : dsPcdiStatus === 'REWORK' ? 'Cần sửa' : 'Nháp'}
                          </span>

                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            dsQdStatus === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                            dsQdStatus === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            dsQdStatus === 'REWORK' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}>
                            QĐ: {dsQdStatus === 'APPROVED' ? 'Đã duyệt' : dsQdStatus === 'PENDING_REVIEW' ? 'Chờ duyệt' : dsQdStatus === 'REWORK' ? 'Cần sửa' : 'Nháp'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Tạo ngày: {format(new Date(ds.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => router.push(`/dashboard/mua-sam/dat-sach/${ds.id}`)}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 transition-colors flex items-center gap-1"
                        >
                          → Tiếp tục điền &amp; xử lý
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Tạo đơn Đặt sách</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đơn đặt sách</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  value={tenDuAn}
                  onChange={e => setTenDuAn(e.target.value)}
                  placeholder="VD: Đặt sách Q2/2026"
                />
              </div>
              <p className="text-xs text-gray-400">
                Hệ thống sẽ tạo GDN và PCDI. Sau khi hoàn thành, dữ liệu sẽ tự động fill vào Dự toán.
              </p>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
              <button onClick={handleCreateDatSach} disabled={creating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50">
                {creating ? 'Đang tạo...' : 'Tạo đơn Đặt sách'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
