'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';

type PendingData = {
  pendingGDNs: any[];
  pendingPCDIs: any[];
  pendingQDs: any[];
  pendingDocuments: any[];
};

export default function UnifiedPendingReviewsPage() {
  const [data, setData] = useState<PendingData>({
    pendingGDNs: [],
    pendingPCDIs: [],
    pendingQDs: [],
    pendingDocuments: [],
  });
  const [pendingSteps, setPendingSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gdn' | 'pcdi' | 'qd' | 'document' | 'lcnt'>('gdn');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reworkComment, setReworkComment] = useState('');
  const [showRework, setShowRework] = useState(false);
  const [activePreview, setActivePreview] = useState<{ id: string; type: 'gdn' | 'pcdi' | 'qd' | 'document' } | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const result = await api.getPendingReviews();
      setData({
        pendingGDNs: result.pendingGDNs || [],
        pendingPCDIs: result.pendingPCDIs || [],
        pendingQDs: result.pendingQDs || [],
        pendingDocuments: result.pendingDocuments || [],
      });
      const steps = await api.getPendingApprovals();
      setPendingSteps(steps || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (type: 'gdn' | 'pcdi' | 'qd' | 'document' | 'lcnt', id: string) => {
    setActionLoading(true);
    try {
      if (type === 'gdn') {
        await api.approveGDN(id);
      } else if (type === 'pcdi') {
        await api.approvePCDI(id);
      } else if (type === 'qd') {
        await api.approveQDQuyetDinhDatSach(id);
      } else if (type === 'document') {
        await api.approveDocument(id);
      } else if (type === 'lcnt') {
        await api.approveLCNTStep(id, 'Đồng ý phê duyệt');
      }
      toast.success('Đã duyệt thành công!');
      setSelectedItem(null);
      loadPending();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRework = async (type: 'gdn' | 'pcdi' | 'qd' | 'document' | 'lcnt', id: string) => {
    if (!reworkComment.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    setActionLoading(true);
    try {
      if (type === 'gdn') {
        await api.reworkGDN(id, reworkComment);
      } else if (type === 'pcdi') {
        await api.reworkPCDI(id, reworkComment);
      } else if (type === 'qd') {
        await api.reworkQD(id, reworkComment);
      } else if (type === 'document') {
        await api.rejectDocument(id, reworkComment);
      } else if (type === 'lcnt') {
        await api.rejectLCNTStep(id, reworkComment);
      }
      toast.success('Đã gửi yêu cầu sửa lại!');
      setShowRework(false);
      setReworkComment('');
      setSelectedItem(null);
      loadPending();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const docTypeLabels: Record<string, string> = {
    TT_DUTOAN: 'Tờ trình phê duyệt dự toán',
    QD_DUTOAN: 'Quyết định phê duyệt dự toán',
    TT_KHLCNT: 'Tờ trình kế hoạch lựa chọn nhà thầu',
    BC_KHLCNT: 'Báo cáo thẩm định kế hoạch lựa chọn nhà thầu',
    QD_KHLCNT: 'Quyết định phê duyệt kế hoạch lựa chọn nhà thầu',
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'TT_DUTOAN': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'QD_DUTOAN': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'TT_KHLCNT': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BC_KHLCNT': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'QD_KHLCNT': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const total =
    data.pendingGDNs.length +
    data.pendingPCDIs.length +
    data.pendingQDs.length +
    data.pendingDocuments.length +
    pendingSteps.length;

  const statusBadge = (status: string) => {
    const cls =
      status === 'APPROVED'
        ? 'bg-green-100 text-green-700 border-green-200'
        : status === 'PENDING_REVIEW' || status === 'PENDING_APPROVAL' || status === 'PENDING_HEAD' || status === 'PENDING_DIRECTOR'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : status === 'REWORK' || status === 'REJECTED'
        ? 'bg-red-100 text-red-700 border-red-200'
        : 'bg-gray-100 text-gray-600 border-gray-200';
    const label =
      status === 'APPROVED'
        ? 'Đã duyệt'
        : status === 'PENDING_REVIEW' || status === 'PENDING_APPROVAL' || status === 'PENDING_HEAD' || status === 'PENDING_DIRECTOR'
        ? 'Chờ duyệt'
        : status === 'REWORK' || status === 'REJECTED'
        ? 'Cần sửa lại'
        : 'Nháp';
    return <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${cls}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Danh sách Phê duyệt</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và phê duyệt tất cả các quy trình, tài liệu liên quan đến dự án</p>
        </div>
        <div className="text-2xl font-extrabold text-primary-600 bg-primary-50 border border-primary-100 rounded-2xl px-5 py-2.5 shadow-sm">
          {total} chờ duyệt
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1.5 border border-gray-200/50 shadow-inner">
        {[
          { key: 'gdn', label: 'Giấy đề nghị in (GDN)', count: data.pendingGDNs.length },
          { key: 'pcdi', label: 'Chỉ định cơ sở in (PCDI)', count: data.pendingPCDIs.length },
          { key: 'qd', label: 'QĐ đặt sách', count: data.pendingQDs.length },
          { key: 'document', label: 'Dự toán & KHLCNT', count: data.pendingDocuments.length },
          { key: 'lcnt', label: 'Lựa chọn nhà thầu', count: pendingSteps.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key
                ? 'bg-white shadow-md text-primary-700 border-b border-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* GDN Tab */}
      {activeTab === 'gdn' && (
        <div className="space-y-4 animate-fadeIn">
          {data.pendingGDNs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-medium">Không có GDN nào chờ duyệt</p>
            </div>
          ) : (
            data.pendingGDNs.map(gdn => (
              <div key={gdn.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    GDN
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="font-bold text-gray-900 text-base">{gdn.datSachProject?.tenDuAn || '—'}</p>
                      {statusBadge(gdn.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p><span className="font-semibold text-gray-700">Tên sách:</span> {gdn.data?.tenSach || gdn.data?.TenSach || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Số lượng:</span> {(gdn.assignments || []).reduce((s: number, a: any) => s + (a.soLuong || 0), 0).toLocaleString('vi-VN')} cuốn</p>
                      <p><span className="font-semibold text-gray-700">Người gửi:</span> {gdn.creator?.name || '—'} · {(gdn.assignments || []).length} người thực hiện</p>
                    </div>
                    {gdn.reviewHistory && (gdn.reviewHistory as any[]).length > 0 && (
                      <div className="mt-3 bg-gray-50 border border-gray-150 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[10px] text-gray-450 mb-1">Lịch sử phê duyệt:</p>
                        {(gdn.reviewHistory as any[]).map((h: any, i: number) => (
                          <p key={i}>• {h.action === 'SUBMITTED' ? 'Đã trình' : h.action === 'APPROVED' ? 'Đã duyệt' : 'Yêu cầu sửa lại'} bởi {h.userId === gdn.creatorId ? gdn.creator?.name : 'Người duyệt'} {h.comment ? `- "${h.comment}"` : ''} · {new Date(h.timestamp).toLocaleDateString('vi-VN')}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setActivePreview({ id: gdn.id, type: 'gdn' })}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      📄 Xem DOCX
                    </button>
                    <Link
                      href={`/dashboard/mua-sam/sach/dat-sach/${gdn.datSachProjectId || gdn.datSachProject?.id}`}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-all text-center"
                    >
                      Chi tiết
                    </Link>
                    <button
                      onClick={() => handleApprove('gdn', gdn.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-150 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(gdn); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-550 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-100 disabled:opacity-50"
                    >
                      🔁 Sửa lại
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PCDI Tab */}
      {activeTab === 'pcdi' && (
        <div className="space-y-4 animate-fadeIn">
          {data.pendingPCDIs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-medium">Không có PCDI nào chờ duyệt</p>
            </div>
          ) : (
            data.pendingPCDIs.map(pcdi => (
              <div key={pcdi.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-50 border border-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    PCDI
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="font-bold text-gray-900 text-base">{pcdi.datSachProject?.tenDuAn || '—'}</p>
                      {statusBadge(pcdi.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p><span className="font-semibold text-gray-700">Cơ sở in:</span> {pcdi.data?.coSoIn || pcdi.data?.CoSoIn || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Số lượng in:</span> {pcdi.data?.soLuongIn || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Giá trị hợp đồng:</span> {pcdi.data?.giaTriHopDong || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Người gửi:</span> {pcdi.creator?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setActivePreview({ id: pcdi.id, type: 'pcdi' })}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      📄 Xem DOCX
                    </button>
                    <Link
                      href={`/dashboard/mua-sam/sach/dat-sach/${pcdi.datSachProjectId || pcdi.datSachProject?.id}`}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-all text-center"
                    >
                      Chi tiết
                    </Link>
                    <button
                      onClick={() => handleApprove('pcdi', pcdi.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-150 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(pcdi); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-555 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      🔁 Sửa lại
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QD Tab */}
      {activeTab === 'qd' && (
        <div className="space-y-4 animate-fadeIn">
          {data.pendingQDs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-medium">Không có QĐ nào chờ duyệt</p>
            </div>
          ) : (
            data.pendingQDs.map(qd => (
              <div key={qd.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    QĐ
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="font-bold text-gray-900 text-base">{qd.tenDuAn}</p>
                      {statusBadge(qd.reviewStatus || qd.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p><span className="font-semibold text-gray-700">Tài liệu đính kèm:</span> GDN: {qd.gdnDocuments?.length || 0} · PCDI: {qd.pcdiDocuments?.length || 0}</p>
                      <p><span className="font-semibold text-gray-700">Người lập:</span> {qd.creator?.name || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Ngày gửi trình:</span> {new Date(qd.updatedAt || qd.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setActivePreview({ id: qd.id, type: 'qd' })}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      📄 Xem DOCX
                    </button>
                    <Link
                      href={`/dashboard/mua-sam/sach/dat-sach/${qd.id}`}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-all text-center"
                    >
                      Chi tiết
                    </Link>
                    <button
                      onClick={() => handleApprove('qd', qd.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-150 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(qd); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-555 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      🔁 Sửa lại
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Documents Tab (Dự toán & KHLCNT) */}
      {activeTab === 'document' && (
        <div className="space-y-4 animate-fadeIn">
          {data.pendingDocuments.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-medium">Không có tài liệu dự toán/KHLCNT nào chờ duyệt</p>
            </div>
          ) : (
            data.pendingDocuments.map(doc => (
              <div key={doc.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${getDocTypeBadge(doc.type)}`}>
                    DOC
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="font-bold text-gray-900 text-base">{doc.project?.tenDuAn || 'Dự án'}</p>
                      {statusBadge(doc.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p><span className="font-semibold text-gray-700">Loại tài liệu:</span> {docTypeLabels[doc.type] || doc.type}</p>
                      <p><span className="font-semibold text-gray-700">Tên gói thầu:</span> {doc.data?.TenGoiThau || doc.data?.tenGoiThau || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Người lập:</span> {doc.creator?.name || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Giá trị:</span> {(doc.data?.giaTriDuToan || doc.data?.giaTriDuToanDuyet || doc.data?.tongMucDauTu || 0).toLocaleString('vi-VN')} VND</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setActivePreview({ id: doc.id, type: 'document' })}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      📄 Xem DOCX
                    </button>
                    <button
                      onClick={() => handleApprove('document', doc.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-150 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(doc); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-555 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      🔁 Sửa lại
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* LCNT Steps Tab */}
      {activeTab === 'lcnt' && (
        <div className="space-y-4 animate-fadeIn">
          {pendingSteps.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-medium">Không có bước LCNT nào chờ duyệt</p>
            </div>
          ) : (
            pendingSteps.map(step => (
              <div key={step.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    LCNT
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="font-bold text-gray-900 text-base">{step.contractorSelection?.project?.tenDuAn || '—'}</p>
                      {statusBadge(step.approvalStatus)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p><span className="font-semibold text-gray-700">Bước thực hiện:</span> {step.title}</p>
                      <p><span className="font-semibold text-gray-700">Người trình:</span> {step.approvalRequests?.[0]?.user?.name || step.contractorSelection?.creator?.name || '—'}</p>
                      <p><span className="font-semibold text-gray-700">Ý kiến trình duyệt:</span> {step.approvalRequests?.[0]?.comment || '—'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/dashboard/lua-chon-nha-thau/${step.contractorSelectionId}/step/${step.id}`}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-all text-center"
                    >
                      Mở biểu mẫu
                    </Link>
                    <button
                      onClick={() => handleApprove('lcnt', step.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-150 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(step); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-555 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      🔁 Từ chối
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rework Modal */}
      {showRework && selectedItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowRework(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-700 mb-2">🔁 Yêu cầu làm lại / Từ chối</h3>
            <p className="text-sm text-gray-500 mb-3">
              Nhập ý kiến hoặc lý do yêu cầu sửa đổi:
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              rows={4}
              value={reworkComment}
              onChange={e => setReworkComment(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowRework(false); setReworkComment(''); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all">Hủy</button>
              <button
                onClick={() => {
                  const type = activeTab;
                  const id = selectedItem.id;
                  handleRework(type, id);
                }}
                disabled={!reworkComment.trim() || actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm shadow-red-100"
              >
                {actionLoading ? '...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OnlyOffice Preview Modal */}
      {activePreview && (
        <OnlyOfficePreview
          documentId={activePreview.id}
          type={activePreview.type}
          onClose={() => setActivePreview(null)}
        />
      )}
    </div>
  );
}
