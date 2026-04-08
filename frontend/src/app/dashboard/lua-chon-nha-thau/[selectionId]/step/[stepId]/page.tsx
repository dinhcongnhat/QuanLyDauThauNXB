'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProcurementStep, ContractorSelection } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { SmartFormField, FieldDef } from '@/components/SmartFormField';
import { CDT_STEP_FIELDS, CHCT_STEP_FIELDS, ATTACHMENT_ONLY, getFieldsForStep } from '@/lib/lcnt-field-defs';

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
const APPROVAL_STATUS_COLORS: Record<string, string> = {
  NO_APPROVAL_REQUIRED: 'bg-gray-100 text-gray-500',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};
const APPROVAL_STATUS_LABELS: Record<string, string> = {
  NO_APPROVAL_REQUIRED: 'Không cần phê duyệt',
  PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Bị từ chối',
};

function displayFilename(path: string): string {
  const raw = path.split('/').pop() || path;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export default function LCNTStepDetailPage() {
  const params = useParams();
  const router = useRouter();
  const selectionId = params.selectionId as string;
  const stepId = params.stepId as string;

  const [selection, setSelection] = useState<ContractorSelection | null>(null);
  const [step, setStep] = useState<ProcurementStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [autoFillData, setAutoFillData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadGhiChu, setUploadGhiChu] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject' | 'request'>('approve');
  const [contractPackageType, setContractPackageType] = useState<string>('');
  const [approvers, setApprovers] = useState<any[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [selData, stepData] = await Promise.all([
        api.getContractorSelection(selectionId),
        api.getLCNTStep(stepId),
      ]);
      setSelection(selData);
      setStep(stepData);
      if (selData.contractPackageType) {
        setContractPackageType(selData.contractPackageType);
      }

      const rawData = (stepData.data || {}) as Record<string, any>;
      const stringData: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawData)) {
        if (k !== '_attachments') stringData[k] = String(v ?? '');
      }
      setFormData(stringData);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectionId, stepId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load potential approvers (directors + heads of department)
  useEffect(() => {
    Promise.all([
      api.getUsersByRole('DIRECTOR').catch(() => []),
      api.getUsersByRole('HEAD_OF_DEPARTMENT').catch(() => []),
    ]).then(([directors, heads]) => {
      setApprovers([...directors, ...heads]);
    });
  }, []);

  // Load auto-fill data — also persist to DB so DOCX generation has the data
  useEffect(() => {
    if (!step || step.status !== 'NOT_STARTED') return;
    api.getLCNTAutoFill(stepId).then(async (data) => {
      if (!data || Object.keys(data).length === 0) return;
      setAutoFillData(data);
      // Merge auto-fill into formData for new steps
      setFormData(prev => ({ ...data, ...prev }));
      // Persist auto-fill data to DB immediately
      try {
        await api.updateLCNTStep(stepId, data);
      } catch { /* ignore - will be saved on explicit save */ }
    }).catch(() => {});
  }, [stepId, step]);

  const fields = step && selection
    ? (selection.procurementMethod === 'CHI_DINH_THAU'
      ? CDT_STEP_FIELDS[step.stepKey] || []
      : CHCT_STEP_FIELDS[step.stepKey] || [])
    : [];

  const isAttachment = step ? ATTACHMENT_ONLY.has(step.stepKey) : false;
  const attachmentsRaw: any[] = (step?.data as any)?._attachments || [];
  const attachments = attachmentsRaw.map((att: any) => typeof att === 'string' ? { path: att, fileName: displayFilename(att), ghiChu: '' } : att);
  const canEdit = step && step.status !== 'COMPLETED';
  const canRequestApproval = step && step.requiresApproval && step.approvalStatus === 'NO_APPROVAL_REQUIRED';
  const canApprove = step && step.approvalStatus === 'PENDING_APPROVAL';
  const canComplete = step && step.status !== 'COMPLETED';

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateLCNTStep(stepId, formData);
      // Auto-generate DOCX after saving so user can download immediately
      if (!isAttachment) {
        try {
          await api.generateLCNTDocx(stepId);
        } catch { /* ignore DOCX gen errors on save */ }
      }
      toast.success('Đã lưu thông tin');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleRequestApproval = async () => {
    try {
      await api.requestStepApproval(stepId, approvalComment);
      toast.success('Đã trình lên Giám đốc/Trưởng phòng');
      setShowApprovalModal(false);
      setApprovalComment('');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleApprove = async () => {
    try {
      await api.approveLCNTStep(stepId, approvalComment);
      toast.success('Đã phê duyệt bước');
      setShowApprovalModal(false);
      setApprovalComment('');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async () => {
    if (!approvalComment.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    try {
      await api.rejectLCNTStep(stepId, approvalComment);
      toast.success('Đã từ chối bước');
      setShowApprovalModal(false);
      setApprovalComment('');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleComplete = async () => {
    if (step?.stepKey === 'hop_dong' && !contractPackageType) {
      toast.error('Vui lòng chọn loại gói thầu trước khi hoàn thành');
      return;
    }
    try {
      // Save form data before completing
      await api.updateLCNTStep(stepId, formData);
      if (step?.stepKey === 'hop_dong' && contractPackageType) {
        await api.setContractPackageType(selectionId, contractPackageType);
      }
      await api.completeLCNTStep(stepId);
      toast.success('Đã hoàn thành bước');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReopen = async () => {
    try {
      await api.reopenLCNTStep(stepId);
      toast.success('Đã mở lại bước để chỉnh sửa');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleGenerateDocx = async () => {
    setGenerating(true);
    try {
      // Always save current form data before generating DOCX
      await api.updateLCNTStep(stepId, formData);
      await api.generateLCNTDocx(stepId);
      toast.success('Đã tạo file DOCX');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setGenerating(false); }
  };

  const handleDownloadDocx = async () => {
    try {
      const res = await api.downloadLCNTStepDocx(stepId);
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

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    try {
      await api.uploadLCNTAttachment(stepId, file, uploadGhiChu.trim() || undefined);
      toast.success('Đã tải lên: ' + file.name);
      setUploadGhiChu('');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
    e.target.value = '';
  };

  const handlePreviewFile = async (objectPath: string) => {
    try {
      const { url } = await api.getLCNTFileUrl(objectPath);
      window.open(url, '_blank');
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!step || !selection) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy bước</p>
        <button onClick={() => router.push(`/dashboard/lua-chon-nha-thau/${selectionId}`)}
          className="mt-3 text-primary-600 hover:text-primary-700">← Quay lại</button>
      </div>
    );
  }

  const stepData = (step.data || {}) as Record<string, any>;
  const dataEntries = Object.entries(stepData).filter(([k]) => !k.startsWith('_'));

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected}
        accept=".doc,.docx,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip,.rar" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <button onClick={() => router.push(`/dashboard/lua-chon-nha-thau/${selectionId}`)}
            className="text-primary-600 hover:text-primary-700">← {selection.tenGoiThau}</button>
          <span>/</span>
          <span>{step.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{step.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + STEP_STATUS_COLORS[step.status]}>
                {STEP_STATUS_LABELS[step.status]}
              </span>
              {step.requiresApproval && (
                <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + APPROVAL_STATUS_COLORS[step.approvalStatus]}>
                  {APPROVAL_STATUS_LABELS[step.approvalStatus]}
                </span>
              )}
              {step.completedAt && (
                <span className="text-xs text-gray-400">
                  Hoàn thành: {format(new Date(step.completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </span>
              )}
              {step.approvedAt && step.approvedBy && (
                <span className="text-xs text-green-600">
                  Phê duyệt: {format(new Date(step.approvedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-fill notice */}
      {Object.keys(autoFillData).length > 0 && step.status === 'NOT_STARTED' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">💡</span>
            <p className="text-sm font-medium text-blue-800">Trường thông tin tự động điền</p>
          </div>
          <p className="text-xs text-blue-600">
            Các trường bên dưới được tự động điền từ bước trước. Bạn có thể chỉnh sửa nếu cần.
          </p>
        </div>
      )}

      {/* Approval rejection notice */}
      {step.approvalStatus === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-600">⚠️</span>
            <p className="text-sm font-medium text-red-800">Bước đã bị từ chối</p>
          </div>
          {step.approvalComment && (
            <p className="text-xs text-red-600">Lý do: {step.approvalComment}</p>
          )}
          <p className="text-xs text-red-500 mt-1">Hãy chỉnh sửa thông tin và trình lại.</p>
        </div>
      )}

      {/* Approval history */}
      {step.approvalRequests && step.approvalRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Lịch sử phê duyệt</h3>
          <div className="space-y-2">
            {step.approvalRequests.map((ar: any) => (
              <div key={ar.id} className="flex items-start gap-3 text-sm">
                <span className={'mt-0.5 shrink-0 ' + (
                  ar.action === 'APPROVED' ? 'text-green-500' :
                  ar.action === 'REJECTED' ? 'text-red-500' :
                  'text-orange-500'
                )}>
                  {ar.action === 'APPROVED' ? '✅' : ar.action === 'REJECTED' ? '❌' : '⏳'}
                </span>
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">{ar.action === 'APPROVED' ? 'Phê duyệt' : ar.action === 'REJECTED' ? 'Từ chối' : 'Trình duyệt'}</span>
                    {' '}bởi <span className="font-medium">{ar.user?.name || ar.userId}</span>
                  </p>
                  {ar.comment && <p className="text-gray-500 text-xs mt-0.5 italic">"{ar.comment}"</p>}
                  <p className="text-gray-400 text-xs">{format(new Date(ar.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form fields or attachment upload */}
      {fields.length > 0 && (() => {
        const hasGroups = fields.some(f => f.group);
        const chungFields = hasGroups ? fields.filter(f => !f.group || f.group === 'chung') : fields;
        const cdtFields = hasGroups ? fields.filter(f => f.group === 'cdt') : [];
        const ntFields = hasGroups ? fields.filter(f => f.group === 'nt') : [];
        const renderFields = (flds: typeof fields) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flds.map(field => {
              const isAutoFilled = !!autoFillData[field.key];
              return (
                <SmartFormField
                  key={field.key}
                  field={field}
                  value={formData[field.key] || ''}
                  onChange={(key, val) => setFormData({ ...formData, [key]: val })}
                  disabled={!canEdit}
                  isAutoFilled={isAutoFilled}
                  formData={formData}
                  onFormDataChange={setFormData}
                />
              );
            })}
          </div>
        );
        return (
          <div className="space-y-4">
            {/* Thông tin chung */}
            {chungFields.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {hasGroups ? '📋 Thông tin chung' : 'Thông tin bước'}
                </h2>
                {renderFields(chungFields)}
              </div>
            )}
            {/* Thông tin Chủ đầu tư */}
            {cdtFields.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-blue-500">
                <h2 className="text-lg font-semibold text-blue-700 mb-4">🏛 Thông tin Chủ đầu tư</h2>
                {renderFields(cdtFields)}
              </div>
            )}
            {/* Thông tin Nhà thầu */}
            {ntFields.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-amber-500">
                <h2 className="text-lg font-semibold text-amber-700 mb-4">🏢 Thông tin Nhà thầu</h2>
                {renderFields(ntFields)}
              </div>
            )}
          </div>
        );
      })()}

      {/* Attachment-only step */}
      {isAttachment && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Đính kèm file</h2>
          {attachments.length > 0 ? (
            <div className="space-y-2 mb-4">
              {attachments.map((att: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg px-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{att.fileName}</p>
                      {att.ghiChu && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">Ghi chú: {att.ghiChu}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <button onClick={() => handlePreviewFile(att.path)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium">Xem</button>
                      <button onClick={async () => {
                        try {
                          const { url } = await api.getLCNTFileUrl(att.path);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = att.fileName || displayFilename(att.path);
                          a.click();
                        } catch { toast.error('Lỗi tải file'); }
                      }}
                        className="text-xs text-gray-600 hover:text-gray-700 font-medium">Tải</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">Chưa có file đính kèm.</p>
          )}
          {canEdit && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                  {uploading ? '⏳ Đang tải...' : '📤 Tải file lên'}
                </button>
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  placeholder="Ghi chú (tùy chọn)"
                  value={uploadGhiChu}
                  onChange={e => setUploadGhiChu(e.target.value)}
                  disabled={uploading}
                />
              </div>
              {uploadGhiChu && (
                <p className="text-xs text-gray-500">📝 Ghi chú: {uploadGhiChu}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contract package type selection for hop_dong step */}
      {step.stepKey === 'hop_dong' && canEdit && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loại gói thầu (cho Thanh toán)</h2>
          <p className="text-sm text-gray-500 mb-4">Chọn loại gói thầu để xác định quy trình thanh toán sau khi hợp đồng hoàn thành.</p>
          <select
            className="w-full md:w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            value={contractPackageType}
            onChange={e => setContractPackageType(e.target.value)}
          >
            <option value="">-- Chọn loại gói thầu --</option>
            <option value="GOI_THAU_TU_VAN">Gói thầu tư vấn</option>
            <option value="GOI_THAU_PHI_TU_VAN">Gói thầu phi tư vấn</option>
            <option value="GOI_THAU_TRIEN_KHAI">Gói thầu triển khai</option>
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Save */}
        {canEdit && fields.length > 0 && (
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium text-sm">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thông tin'}
          </button>
        )}

        {/* Request approval */}
        {canRequestApproval && fields.length > 0 && (
          <button onClick={() => { setApprovalMode('request'); setShowApprovalModal(true); }}
            className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm">
            📤 Trình lên Giám đốc/Trưởng phòng
          </button>
        )}

        {/* Approve / Reject (for HEAD/DIRECTOR) */}
        {canApprove && (
          <>
            <button onClick={() => { setApprovalMode('approve'); setApprovalComment(''); setShowApprovalModal(true); }}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
              ✅ Phê duyệt
            </button>
            <button onClick={() => { setApprovalMode('reject'); setApprovalComment(''); setShowApprovalModal(true); }}
              className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm">
              ❌ Từ chối
            </button>
          </>
        )}

        {/* Download DOCX (auto-generated on save) */}
        {!isAttachment && dataEntries.length > 0 && (
          <button onClick={handleDownloadDocx}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            📥 Tải DOCX
          </button>
        )}

        {/* Complete */}
        {canComplete && !canRequestApproval && (
          <button onClick={handleComplete}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
            ✅ Hoàn thành bước
          </button>
        )}

        {/* Reopen */}
        {step.status === 'COMPLETED' && (
          <button onClick={handleReopen}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium text-sm">
            🔄 Mở lại để chỉnh sửa
          </button>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {approvalMode === 'request' ? '📤 Trình phê duyệt' :
               approvalMode === 'approve' ? '✅ Phê duyệt bước' :
               '❌ Từ chối bước'}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              {approvalMode === 'request' ? 'Gửi bước này lên Giám đốc/Trưởng phòng để phê duyệt.'
               : approvalMode === 'approve' ? 'Xác nhận phê duyệt bước này.'
               : 'Vui lòng nhập lý do từ chối.'}
            </p>
            {/* Approver selector - only show when requesting approval */}
            {approvalMode === 'request' && approvers.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn người phê duyệt</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedApproverId}
                  onChange={e => setSelectedApproverId(e.target.value)}
                >
                  <option value="">-- Chọn người phê duyệt --</option>
                  {approvers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'DIRECTOR' ? 'Giám đốc' : 'Trưởng phòng'}{u.department ? ` - ${u.department}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-y min-h-24 mb-4"
              placeholder={approvalMode === 'reject' ? 'Nhập lý do từ chối...' : 'Nhập ý kiến (không bắt buộc)...'}
              value={approvalComment}
              onChange={e => setApprovalComment(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                Hủy
              </button>
              <button
                onClick={approvalMode === 'request' ? handleRequestApproval :
                         approvalMode === 'approve' ? handleApprove : handleReject}
                className={'px-4 py-2 text-white rounded-lg text-sm font-medium ' + (
                  approvalMode === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  approvalMode === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-orange-500 hover:bg-orange-600'
                )}>
                {approvalMode === 'request' ? 'Gửi phê duyệt' :
                 approvalMode === 'approve' ? 'Phê duyệt' :
                 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
