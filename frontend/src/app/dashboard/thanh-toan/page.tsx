'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  GOI_THAU_TU_VAN: 'Gói thầu tư vấn',
  GOI_THAU_PHI_TU_VAN: 'Gói thầu phi tư vấn',
  GOI_THAU_TRIEN_KHAI: 'Gói thầu triển khai',
};

const PACKAGE_TYPE_COLORS: Record<string, string> = {
  GOI_THAU_TU_VAN: 'bg-blue-100 text-blue-700',
  GOI_THAU_PHI_TU_VAN: 'bg-purple-100 text-purple-700',
  GOI_THAU_TRIEN_KHAI: 'bg-orange-100 text-orange-700',
};

const STEP_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

export default function ThanhToanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [payments, setPayments] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await api.getAllPayments(selectedProject || undefined);
      setPayments(data);
      const projectList = await api.getProjects();
      setProjects(projectList);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadPayments();
  }, [selectedProject]);

  const handleSearch = async () => {
    if (!search.trim()) { loadPayments(); return; }
    try {
      const data = await api.searchPayments(search, selectedProject || undefined);
      setPayments(data);
    } catch (err: any) { toast.error(err.message); }
  };

  const openCreateDialog = async () => {
    try {
      const data = await api.getPaymentContracts(selectedProject || undefined);
      setContracts(data);
      setShowCreate(true);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreate = async (contractorSelectionId: string) => {
    setCreating(true);
    try {
      const payment = await api.createPayment(contractorSelectionId, selectedProject || undefined);
      toast.success('Đã tạo hồ sơ thanh toán');
      setShowCreate(false);
      router.push(`/dashboard/thanh-toan/${payment.id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thanh toán</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý quy trình thanh toán hợp đồng</p>
        </div>
        <button onClick={openCreateDialog}
          className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm">
          + Tạo hồ sơ thanh toán
        </button>
      </div>

      {/* Project Selector */}
      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <label className="block text-sm font-medium text-indigo-900 mb-2">Chọn dự án</label>
        <select
          className="w-full max-w-xs bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="">— Tất cả dự án —</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.tenDuAn}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Tìm theo mã số hợp đồng..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}
          className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
          🔍 Tìm
        </button>
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-400 text-lg mb-2">Chưa có hồ sơ thanh toán nào</p>
          <p className="text-sm text-gray-400">Hoàn thành hợp đồng trong LCNT để tạo hồ sơ thanh toán.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map(payment => {
            const completedSteps = payment.steps.filter((s: any) => s.status === 'COMPLETED').length;
            const totalSteps = payment.steps.length;
            const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
            const tenGoiThau = payment.contractorSelection?.tenGoiThau || 'N/A';

            return (
              <Link key={payment.id} href={`/dashboard/thanh-toan/${payment.id}`}>
                <motion.div
                  whileHover={{ scale: 1.005 }}
                  className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{tenGoiThau}</h3>
                        <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + (PACKAGE_TYPE_COLORS[payment.contractPackageType] || '')}>
                          {PACKAGE_TYPE_LABELS[payment.contractPackageType] || payment.contractPackageType}
                        </span>
                      </div>
                      {payment.maSoHD && (
                        <p className="text-sm text-gray-500">Mã HĐ: {payment.maSoHD}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Tạo: {format(new Date(payment.createdAt), 'dd/MM/yyyy', { locale: vi })}</span>
                        {payment.creator && <span>Bởi: {payment.creator.name}</span>}
                        <span>{completedSteps}/{totalSteps} bước</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-2xl font-bold text-primary-600">{Math.round(progress)}%</span>
                      <p className="text-xs text-gray-400">Tiến độ</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: progress + '%' }} />
                  </div>

                  {/* Steps preview */}
                  <div className="mt-3 flex gap-1.5 flex-wrap">
                    {payment.steps.map((step: any) => (
                      <span key={step.id}
                        className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + STEP_STATUS_COLORS[step.status]}
                        title={step.title}
                      >
                        {step.status === 'COMPLETED' ? '✓' : step.stepOrder}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6"
            >
              <h3 className="text-lg font-semibold mb-2">Tạo hồ sơ thanh toán</h3>
              <p className="text-sm text-gray-500 mb-4">Chọn hợp đồng đã hoàn thành để tạo quy trình thanh toán.</p>

              {contracts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Chưa có hợp đồng nào đã hoàn thành.</p>
                  <p className="text-xs text-gray-400 mt-1">Hãy hoàn thành bước hợp đồng và chọn loại gói thầu trong LCNT.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {contracts.map((contract: any) => {
                    const hasPayment = contract.payments && contract.payments.length > 0;
                    const hopDongData = contract.steps?.[0]?.data || {};
                    const maSoHD = hopDongData.MaSoHD || hopDongData.MaSoHopDong || '';

                    return (
                      <div key={contract.id}
                        className={'border rounded-lg p-3 ' + (hasPayment ? 'bg-gray-50 border-gray-200' : 'hover:bg-blue-50 border-gray-200 cursor-pointer hover:border-blue-300')}
                        onClick={() => !hasPayment && !creating && handleCreate(contract.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-gray-900 truncate">{contract.tenGoiThau}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ' + (PACKAGE_TYPE_COLORS[contract.contractPackageType] || '')}>
                                {PACKAGE_TYPE_LABELS[contract.contractPackageType] || ''}
                              </span>
                              {maSoHD && (
                                <span className="text-xs text-gray-400">HĐ: {maSoHD}</span>
                              )}
                            </div>
                          </div>
                          {hasPayment ? (
                            <span className="text-xs text-gray-400 shrink-0 ml-2">Đã tạo TT</span>
                          ) : (
                            <span className="text-xs text-primary-600 font-medium shrink-0 ml-2">
                              {creating ? '⏳...' : '➕ Chọn'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
