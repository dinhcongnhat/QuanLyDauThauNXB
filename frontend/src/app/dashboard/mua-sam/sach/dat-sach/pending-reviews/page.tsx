'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

type PendingData = {
  pendingGDNs: any[];
  pendingPCDIs: any[];
  pendingQDs: any[];
};

export default function PendingReviewsPage() {
  const [data, setData] = useState<PendingData>({ pendingGDNs: [], pendingPCDIs: [], pendingQDs: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gdn' | 'pcdi' | 'qd'>('gdn');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reworkComment, setReworkComment] = useState('');
  const [showRework, setShowRework] = useState(false);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const result = await api.getPendingReviews();
      setData(result);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleApprove = async (type: 'gdn' | 'pcdi' | 'qd', id: string) => {
    setActionLoading(true);
    try {
      if (type === 'gdn') await api.approveGDN(id);
      else if (type === 'pcdi') await api.approvePCDI(id);
      else await api.approveQDQuyetDinhDatSach(id);
      toast.success('Đã duyệt thành công!');
      setSelectedItem(null);
      loadPending();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  };

  const handleRework = async (type: 'gdn' | 'pcdi' | 'qd', id: string) => {
    if (!reworkComment.trim()) { toast.error('Nhập lý do'); return; }
    setActionLoading(true);
    try {
      if (type === 'gdn') await api.reworkGDN(id, reworkComment);
      else if (type === 'pcdi') await api.reworkPCDI(id, reworkComment);
      else await api.reworkQD(id, reworkComment);
      toast.success('Đã gửi yêu cầu làm lại!');
      setShowRework(false);
      setReworkComment('');
      setSelectedItem(null);
      loadPending();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  };

  const openOnlyOffice = async (type: 'gdn' | 'pcdi', id: string) => {
    try {
      let config: any;
      if (type === 'gdn') config = await api.getOnlyofficeConfigForGdn(id);
      else config = await api.getOnlyofficeConfigForPcdi(id);
      const url = `${config.onlyofficeUrl}/apps/documenteditor/5.2/?_lang=vi`;
      window.open(url, '_blank');
    } catch (err: any) { toast.error('Không thể mở OnlyOffice: ' + err.message); }
  };

  const total = data.pendingGDNs.length + data.pendingPCDIs.length + data.pendingQDs.length;

  const statusBadge = (status: string) => {
    const cls = status === 'APPROVED' ? 'bg-green-100 text-green-700' :
      status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
      status === 'REWORK' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
    const label = status === 'APPROVED' ? 'Đã duyệt' :
      status === 'PENDING_REVIEW' ? 'Chờ duyệt' :
      status === 'REWORK' ? 'Cần sửa lại' : 'Nháp';
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Phê duyệt Thầu Sách</h1>
          <p className="text-sm text-gray-500 mt-1">Xem và phê duyệt các quy trình được gửi đến bạn</p>
        </div>
        <div className="text-2xl font-bold text-indigo-600 bg-indigo-50 rounded-xl px-4 py-2">
          {total} chờ duyệt
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'gdn', label: 'GDN', count: data.pendingGDNs.length },
          { key: 'pcdi', label: 'PCDI', count: data.pendingPCDIs.length },
          { key: 'qd', label: 'QĐ', count: data.pendingQDs.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* GDNN List */}
      {activeTab === 'gdn' && (
        <div className="space-y-4">
          {data.pendingGDNs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <p className="text-4xl mb-2">📭</p>
              <p>Không có GDN nào chờ duyệt</p>
            </div>
          ) : (
            data.pendingGDNs.map(gdn => (
              <div key={gdn.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                    GDN
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{gdn.datSachProject?.tenDuAn || '—'}</p>
                      {statusBadge(gdn.status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Sách: {gdn.data?.tenSach || gdn.data?.TenSach || '—'} · SL: {(gdn.assignments || []).reduce((s: number, a: any) => s + (a.soLuong || 0), 0)} cuốn
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Người gửi: {gdn.creator?.name || '—'} · {(gdn.assignments || []).length} người được phân công
                    </p>
                    {gdn.reviewHistory && (gdn.reviewHistory as any[]).length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        {(gdn.reviewHistory as any[]).slice(-2).map((h: any, i: number) => (
                          <p key={i}>• {h.action} {h.comment ? `- "${h.comment}"` : ''} · {new Date(h.timestamp).toLocaleDateString('vi-VN')}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openOnlyOffice('gdn', gdn.id)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs hover:bg-blue-100"
                    >
                      📄 Xem DOCX
                    </button>
                    <Link
                      href={`/dashboard/mua-sam/dat-sach/${gdn.datSachProject?.id}`}
                      className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100 text-center"
                    >
                      Mở chi tiết
                    </Link>
                    <button
                      onClick={() => handleApprove('gdn', gdn.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(gdn); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs hover:bg-red-100"
                    >
                      🔁 Làm lại
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PCDI List */}
      {activeTab === 'pcdi' && (
        <div className="space-y-4">
          {data.pendingPCDIs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <p className="text-4xl mb-2">📭</p>
              <p>Không có PCDI nào chờ duyệt</p>
            </div>
          ) : (
            data.pendingPCDIs.map(pcdi => (
              <div key={pcdi.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                    PCDI
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{pcdi.datSachProject?.tenDuAn || '—'}</p>
                      {statusBadge(pcdi.status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Cơ sở in: {pcdi.data?.coSoIn || pcdi.data?.CoSoIn || '—'} · SL: {pcdi.data?.soLuongIn || '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Người gửi: {pcdi.creator?.name || '—'}</p>
                    {pcdi.reviewHistory && (pcdi.reviewHistory as any[]).length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        {(pcdi.reviewHistory as any[]).slice(-2).map((h: any, i: number) => (
                          <p key={i}>• {h.action} {h.comment ? `- "${h.comment}"` : ''} · {new Date(h.timestamp).toLocaleDateString('vi-VN')}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openOnlyOffice('pcdi', pcdi.id)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs hover:bg-blue-100"
                    >
                      📄 Xem DOCX
                    </button>
                    <Link
                      href={`/dashboard/mua-sam/dat-sach/${pcdi.datSachProject?.id}`}
                      className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100 text-center"
                    >
                      Mở chi tiết
                    </Link>
                    <button
                      onClick={() => handleApprove('pcdi', pcdi.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(pcdi); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs hover:bg-red-100"
                    >
                      🔁 Làm lại
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QD List */}
      {activeTab === 'qd' && (
        <div className="space-y-4">
          {data.pendingQDs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <p className="text-4xl mb-2">📭</p>
              <p>Không có QĐ nào chờ duyệt</p>
            </div>
          ) : (
            data.pendingQDs.map(qd => (
              <div key={qd.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                    QĐ
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{qd.tenDuAn}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        qd.reviewStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        qd.reviewStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        qd.reviewStatus === 'REWORK' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {qd.reviewStatus === 'APPROVED' ? 'Đã duyệt' :
                         qd.reviewStatus === 'PENDING' ? 'Chờ duyệt' :
                         qd.reviewStatus === 'REWORK' ? 'Cần sửa lại' : '—'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      GDN: {qd.gdnDocuments?.length || 0} · PCDI: {qd.pcdiDocuments?.length || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Người gửi: {qd.creator?.name || '—'} · Ngày tạo: {new Date(qd.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                    {qd.reviewHistory && (qd.reviewHistory as any[]).length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        {(qd.reviewHistory as any[]).slice(-2).map((h: any, i: number) => (
                          <p key={i}>• {h.action} {h.comment ? `- "${h.comment}"` : ''} · {new Date(h.timestamp).toLocaleDateString('vi-VN')}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/dashboard/mua-sam/dat-sach/${qd.id}`}
                      className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100 text-center"
                    >
                      Mở chi tiết
                    </Link>
                    <button
                      onClick={() => handleApprove('qd', qd.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => { setSelectedItem(qd); setShowRework(true); setReworkComment(''); }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs hover:bg-red-100"
                    >
                      🔁 Làm lại
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowRework(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-red-700 mb-2">🔁 Yêu cầu làm lại</h3>
            <p className="text-sm text-gray-500 mb-3">
              Nhập lý do yêu cầu làm lại {activeTab === 'gdn' ? 'GDN' : activeTab === 'pcdi' ? 'PCDI' : 'QĐ'}:
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              rows={4}
              value={reworkComment}
              onChange={e => setReworkComment(e.target.value)}
              placeholder="VD: Số lượng chưa chính xác, thông tin cần bổ sung..."
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowRework(false); setReworkComment(''); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
              <button
                onClick={() => {
                  const type = activeTab;
                  const id = selectedItem.id;
                  handleRework(type, id);
                }}
                disabled={!reworkComment.trim() || actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? '...' : '🔁 Gửi làm lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
