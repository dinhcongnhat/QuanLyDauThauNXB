'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ZipDownloadModal } from '@/components/ZipDownloadModal';
import { OnlyOfficeFilePreview } from '@/components/OnlyOfficeFilePreview';

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  GOI_THAU_TU_VAN: 'Gói thầu tư vấn',
  GOI_THAU_PHI_TU_VAN: 'Gói thầu phi tư vấn',
  GOI_THAU_TRIEN_KHAI: 'Gói thầu triển khai',
};

const STEP_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
};
const STEP_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

// Steps that are attachment-only (no template file)
const ATTACHMENT_ONLY = new Set(['bang_tien_do_cung_cap']);

function displayFilename(path: string): string {
  const raw = path.split('/').pop() || path;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStepId, setUploadStepId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showZipModal, setShowZipModal] = useState(false);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const loadPayment = useCallback(async () => {
    try {
      const data = await api.getPayment(paymentId);
      setPayment(data);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [paymentId]);

  useEffect(() => { loadPayment(); }, [loadPayment]);

  const handleUploadFile = async (stepId: string, file: File) => {
    setUploading(true);
    try {
      await api.uploadPaymentAttachment(stepId, file);
      toast.success('Đã tải lên: ' + file.name);
      await loadPayment();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleDeleteAttachment = async (stepId: string, path: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa file đính kèm này không?')) return;
    try {
      await api.deletePaymentAttachment(stepId, path);
      toast.success('Đã xóa file đính kèm');
      await loadPayment();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleGenerateDocx = async (stepId: string) => {
    setGenerating(stepId);
    try {
      await api.generatePaymentDocx(stepId);
      toast.success('Đã tạo file DOCX');
      await loadPayment();
    } catch (err: any) { toast.error(err.message); }
    finally { setGenerating(null); }
  };

  const handleDownloadDocx = async (stepId: string) => {
    try {
      const res = await api.downloadPaymentStepDocx(stepId);
      if (!res.ok) { toast.error('Lỗi tải file'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'document.docx';
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/);
        if (utf8Match) filename = decodeURIComponent(utf8Match[1]);
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePreviewFile = async (objectPath: string) => {
    const ext = objectPath.split('.').pop()?.toLowerCase();
    const officeExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'pdf'];
    if (ext && officeExtensions.includes(ext)) {
      setPreviewPath(objectPath);
    } else {
      try {
        const { url } = await api.getPaymentFileUrl(objectPath);
        window.open(url, '_blank');
      } catch (err: any) { toast.error(err.message); }
    }
  };

  const triggerFileUpload = (stepId: string) => {
    setUploadStepId(stepId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadStepId) handleUploadFile(uploadStepId, file);
    e.target.value = '';
    setUploadStepId(null);
  };

  const getAttachments = (step: any): any[] => {
    const raw = (step.data)?._attachments || [];
    return raw.map((att: any) => typeof att === 'string' ? { path: att, fileName: displayFilename(att), ghiChu: '' } : att);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy hồ sơ thanh toán</p>
        <button onClick={() => router.push('/dashboard/thanh-toan')}
          className="mt-3 text-primary-600 hover:text-primary-700">← Quay lại</button>
      </div>
    );
  }

  const completedCount = payment.steps.filter((s: any) => s.status === 'COMPLETED').length;
  const progress = (completedCount / payment.steps.length) * 100;
  const tenGoiThau = payment.contractorSelection?.tenGoiThau || 'N/A';
  const qdData = payment.contractorSelection?.qdKhlcnt?.data || {};
  const selData = payment.contractorSelection?.data || {};

  // Extract contract info from LCNT hop_dong step data (loaded from contractorSelection)
  const hopDongFields = (() => {
    const lcntHopDong = payment.contractorSelection?.steps?.[0]?.data || {};
    const d = { ...lcntHopDong };
    return {
      nhaThau: d.NhaThau || selData.NhaThau || '',
      chuDauTu: d.ChuDauTu || qdData.chuDauTu || '',
      tenDuAn: d.TenDuAn || qdData.tenDuAn || '',
      giaHD: d.GiaHDBangSo || d.GiaTriHopDongBangSo || '',
      thoiGianThucHien: d.ThoiGianThucHienHD || '',
      loaiHopDong: d.LoaiHopDong || '',
    };
  })();

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected}
        accept=".doc,.docx,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip,.rar" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/thanh-toan')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              ← Quay lại
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{tenGoiThau}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {PACKAGE_TYPE_LABELS[payment.contractPackageType] || payment.contractPackageType}
            </span>
            {payment.maSoHD && (
              <span className="text-sm text-gray-500">HĐ: {payment.maSoHD}</span>
            )}
            <span className="text-sm text-gray-500">
              {completedCount}/{payment.steps.length} bước hoàn thành
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <span className="text-2xl font-bold text-primary-600">{Math.round(progress)}%</span>
            <p className="text-xs text-gray-500">Tiến độ</p>
          </div>
          {payment.steps.every((s: any) => s.status === 'COMPLETED') && (
            <button onClick={() => setShowZipModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
              📦 Tải toàn bộ file
            </button>
          )}
        </div>
      </div>

      {/* Contract Info from LCNT */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            📋 Thông tin hợp đồng lựa chọn nhà thầu
          </h3>
          <Link
            href={`/dashboard/lua-chon-nha-thau/${payment.contractorSelectionId}`}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-2 py-1 rounded transition-colors"
          >
            Xem chi tiết LCNT →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {hopDongFields.tenDuAn && (
            <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Dự án:</span><span className="text-gray-900 font-medium">{hopDongFields.tenDuAn}</span></div>
          )}
          <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Gói thầu:</span><span className="text-gray-900 font-medium">{tenGoiThau}</span></div>
          {hopDongFields.chuDauTu && (
            <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Chủ đầu tư:</span><span className="text-gray-900 font-medium">{hopDongFields.chuDauTu}</span></div>
          )}
          {hopDongFields.nhaThau && (
            <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Nhà thầu:</span><span className="text-gray-900 font-medium">{hopDongFields.nhaThau}</span></div>
          )}
          {hopDongFields.giaHD && (
            <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Giá trị HĐ:</span><span className="text-gray-900 font-medium">{Number(hopDongFields.giaHD).toLocaleString('vi-VN')} đồng</span></div>
          )}
          {hopDongFields.loaiHopDong && (
            <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Loại HĐ:</span><span className="text-gray-900 font-medium">{hopDongFields.loaiHopDong}</span></div>
          )}
          {hopDongFields.thoiGianThucHien && (
            <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Thời gian TH:</span><span className="text-gray-900 font-medium">{hopDongFields.thoiGianThucHien}</span></div>
          )}
          {payment.maSoHD && (
            <div className="flex gap-2"><span className="text-gray-500 shrink-0 w-36">Mã số HĐ:</span><span className="text-gray-900 font-medium">{payment.maSoHD}</span></div>
          )}
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Tiến trình thanh toán</h3>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: progress + '%' }} />
            </div>
            <span className="text-xs font-bold text-primary-600">{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {payment.steps.map((step: any, idx: number) => {
            const isActive = selectedStepId === step.id;
            const isCompleted = step.status === 'COMPLETED';
            const isInProgress = step.status === 'IN_PROGRESS';
            const prevCompleted = idx === 0 || payment.steps[idx - 1]?.status === 'COMPLETED';
            const isDisabled = step.status === 'NOT_STARTED' && !prevCompleted;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => !isDisabled && setSelectedStepId(isActive ? null : step.id)}
                  disabled={isDisabled}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs transition-all min-w-[110px] ${
                    isActive ? 'bg-indigo-50 border-2 border-indigo-400 text-indigo-700' :
                    isDisabled ? 'opacity-40 cursor-not-allowed' :
                    'hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-xs font-bold ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isInProgress ? 'bg-yellow-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : step.stepOrder}
                  </div>
                  <span className="text-center leading-tight">{step.title}</span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] ${STEP_STATUS_COLORS[step.status]}`}>
                    {STEP_STATUS_LABELS[step.status]}
                  </span>
                </button>
                {idx < payment.steps.length - 1 && (
                  <div className={`w-6 h-0.5 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Detail Inline */}
      {selectedStepId && (() => {
        const step = payment.steps.find((s: any) => s.id === selectedStepId);
        if (!step) return null;
        const isAttachment = ATTACHMENT_ONLY.has(step.stepKey);
        const isCompleted = step.status === 'COMPLETED';
        const stepIdx = payment.steps.findIndex((s: any) => s.id === selectedStepId);
        const prevCompleted = stepIdx === 0 || payment.steps[stepIdx - 1]?.status === 'COMPLETED';
        const canWork = prevCompleted && !isCompleted;
        const attachments = getAttachments(step);
        const stepData = (step.data || {}) as Record<string, any>;
        const dataEntries = Object.entries(stepData).filter(([k]) => !k.startsWith('_'));

        return (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Step detail header */}
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{step.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STEP_STATUS_COLORS[step.status]}`}>
                    {STEP_STATUS_LABELS[step.status]}
                  </span>
                </div>
                {step.completedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Hoàn thành: {format(new Date(step.completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                )}
              </div>
              <Link href={`/dashboard/thanh-toan/${paymentId}/step/${step.id}`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 font-medium">
                📝 Mở chi tiết
              </Link>
            </div>

            <div className="p-6 space-y-4">
              {/* Data preview */}
              {dataEntries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Dữ liệu đã nhập:</p>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dataEntries.slice(0, 10).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-sm">
                        <span className="text-gray-500 min-w-32 shrink-0">{k}:</span>
                        <span className="text-gray-900 font-medium truncate">{String(v ?? '')}</span>
                      </div>
                    ))}
                    {dataEntries.length > 10 && (
                      <p className="text-xs text-gray-400 col-span-2">... và {dataEntries.length - 10} trường khác</p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isAttachment && dataEntries.length > 0 && (
                  <button onClick={() => handleDownloadDocx(step.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    📥 Tải DOCX
                  </button>
                )}
                {canWork && (
                  <button onClick={() => triggerFileUpload(step.id)}
                    disabled={uploading}
                    className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                    {uploading ? '⏳ Đang tải...' : '📤 Tải file lên'}
                  </button>
                )}
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Đính kèm ({attachments.length}):</p>
                  <div className="space-y-1">
                    {attachments.map((att: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-lg px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate">{att.fileName}</span>
                        <div className="flex gap-2 shrink-0 ml-2">
                          <button onClick={() => handlePreviewFile(att.path)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium">Xem</button>
                          {canWork && (
                            <button onClick={() => handleDeleteAttachment(step.id, att.path)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium">Xóa</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ZIP Download Modal */}
      <ZipDownloadModal
        open={showZipModal}
        onClose={() => setShowZipModal(false)}
        loadPreview={() => api.getPaymentZipPreview(paymentId)}
        downloadZip={() => api.downloadPaymentZip(paymentId)}
      />
      {previewPath && (
        <OnlyOfficeFilePreview objectPath={previewPath} onClose={() => setPreviewPath(null)} />
      )}
    </div>
  );
}
