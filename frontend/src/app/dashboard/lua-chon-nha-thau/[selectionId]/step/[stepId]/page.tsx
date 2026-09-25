'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProcurementStep, ContractorSelection } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SmartFormField } from '@/components/SmartFormField';
import { LegalBasisField } from '@/components/LegalBasisField';
import {
  WorkflowFormSection,
} from '@/components/WorkflowDocumentUI';
import { WorkflowDocxPreview } from '@/components/WorkflowDocxPreview';
import { ATTACHMENT_ONLY, getFieldsForStep } from '@/lib/lcnt-field-defs';
import {
  getLCNTTemplateFieldKeys,
  isBlankWorkflowValue,
  mergeTemplateFields,
  normalizeLegalBasisValue,
  normalizeWorkflowAttachments,
  pickWorkflowFormData,
} from '@/lib/workflow-template-api';

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
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [autoFillData, setAutoFillData] = useState<Record<string, any>>({});
  const [templateFieldKeys, setTemplateFieldKeys] = useState<string[]>([]);
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
      const [selData, stepData, dynamicFields] = await Promise.all([
        api.getContractorSelection(selectionId),
        api.getLCNTStep(stepId),
        getLCNTTemplateFieldKeys(stepId).catch(() => []),
      ]);
      setSelection(selData);
      setStep(stepData);
      setTemplateFieldKeys(dynamicFields);
      if (selData.contractPackageType) {
        setContractPackageType(selData.contractPackageType);
      }

      const rawData = (stepData.data || {}) as Record<string, any>;
      const allowedFields = mergeTemplateFields(
        getFieldsForStep(stepData.stepKey, selData.procurementMethod),
        dynamicFields,
      );
      setFormData(
        pickWorkflowFormData(
          rawData,
          allowedFields.map((field) => field.key),
        ),
      );
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectionId, stepId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Only accounts explicitly granted canApprove by Admin are selectable.
  useEffect(() => {
    api.getApprovers().then(setApprovers).catch(() => setApprovers([]));
  }, []);

  // Load auto-fill data — also persist to DB so DOCX generation has the data
  useEffect(() => {
    if (!step || !selection || step.status === 'COMPLETED') return;
    api.getLCNTAutoFill(stepId).then(async (data) => {
      if (!data || Object.keys(data).length === 0) return;
      const allowedFields = mergeTemplateFields(
        getFieldsForStep(step.stepKey, selection.procurementMethod),
        templateFieldKeys,
      );
      const normalizedAutoFill = pickWorkflowFormData(
        data,
        allowedFields.map((field) => field.key),
      );
      setAutoFillData(normalizedAutoFill);
      // Merge auto-fill into formData for non-completed steps
      setFormData(prev => {
        const merged = { ...prev };
        for (const [key, val] of Object.entries(normalizedAutoFill)) {
          if (isBlankWorkflowValue(merged[key])) {
            merged[key] = val;
          }
        }
        return merged;
      });
      // Persist auto-fill data to DB immediately
      try {
        const keysToUpdate: Record<string, any> = {};
        const currentData = pickWorkflowFormData(
          (step.data || {}) as Record<string, any>,
          allowedFields.map((field) => field.key),
        );
        for (const [key, val] of Object.entries(normalizedAutoFill)) {
          if (isBlankWorkflowValue(currentData[key])) {
            keysToUpdate[key] = val;
          }
        }
        if (Object.keys(keysToUpdate).length > 0) {
          await api.updateLCNTStep(stepId, keysToUpdate);
        }
      } catch { /* ignore - will be saved on explicit save */ }
    }).catch(() => {});
  }, [selection?.procurementMethod, stepId, step, templateFieldKeys]);

  const fields = step && selection
    ? mergeTemplateFields(
        getFieldsForStep(step.stepKey, selection.procurementMethod),
        templateFieldKeys,
      )
    : [];

  const isAttachment = step ? ATTACHMENT_ONLY.has(step.stepKey) : false;
  const attachments = normalizeWorkflowAttachments(
    (step?.data as any)?._attachments,
  );
  const canEdit =
    step &&
    step.status !== 'COMPLETED' &&
    step.approvalStatus !== 'APPROVED';
  const canRequestApproval = step && step.requiresApproval && step.approvalStatus === 'NO_APPROVAL_REQUIRED';
  const canApprove = step && step.approvalStatus === 'PENDING_APPROVAL';
  const canComplete =
    step &&
    step.status !== 'COMPLETED' &&
    (!step.requiresApproval || step.approvalStatus === 'APPROVED');

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
    if (!selectedApproverId) {
      toast.error('Vui lòng chọn người phê duyệt');
      return;
    }
    try {
      // Chốt đúng dữ liệu người dùng đang nhìn thấy và sinh DOCX trước khi
      // tạo dossier, để người duyệt luôn nhận được một snapshot có thể mở.
      await api.updateLCNTStep(stepId, formData);
      if (!isAttachment) {
        await api.generateLCNTDocx(stepId);
      }
      await api.requestStepApproval(stepId, approvalComment, selectedApproverId);
      toast.success('Đã gửi Quyết định đến người phê duyệt');
      setShowApprovalModal(false);
      setApprovalComment('');
      setSelectedApproverId('');
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

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 2xl:space-y-6">
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
        const legalFields = fields.filter(f => f.key === 'CanCu');
        const nonLegalFields = fields.filter(f => f.key !== 'CanCu');
        const hasGroups = nonLegalFields.some(f => f.group);
        const chungFields = hasGroups
          ? nonLegalFields.filter(f => !f.group || f.group === 'chung')
          : nonLegalFields;
        const cdtFields = hasGroups
          ? nonLegalFields.filter(f => f.group === 'cdt')
          : [];
        const ntFields = hasGroups
          ? nonLegalFields.filter(f => f.group === 'nt')
          : [];
        let sectionNumber = 1;
        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
        const nextTitle = (title: string) =>
          `${roman[sectionNumber++ - 1]}. ${title}`;
        const chungTitle = nextTitle(
          hasGroups ? 'Thông tin chung' : 'Thông tin văn bản',
        );
        const legalTitle =
          legalFields.length > 0 ? nextTitle('Căn cứ pháp lý') : '';
        const cdtTitle =
          cdtFields.length > 0 ? nextTitle('Thông tin Chủ đầu tư') : '';
        const ntTitle =
          ntFields.length > 0 ? nextTitle('Thông tin Nhà thầu') : '';
        const renderFields = (flds: typeof fields) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flds.map(field => {
              const isAutoFilled = !!autoFillData[field.key];
              if (field.key === 'CanCu') {
                return (
                  <div key={field.key} className="md:col-span-2">
                    <LegalBasisField
                      value={normalizeLegalBasisValue(formData.CanCu)}
                      onChange={(value) =>
                        setFormData({ ...formData, CanCu: value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                );
              }
              return (
                <SmartFormField
                  key={field.key}
                  field={field}
                  value={String(formData[field.key] ?? '')}
                  onChange={(key, val) => setFormData({ ...formData, [key]: val })}
                  disabled={!canEdit}
                  isAutoFilled={isAutoFilled}
                  formData={formData as Record<string, string>}
                  onFormDataChange={(data) => setFormData(data)}
                />
              );
            })}
          </div>
        );
        return (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] 2xl:gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(520px,0.8fr)]">
            <div className="space-y-4">
              {chungFields.length > 0 && (
                <WorkflowFormSection title={chungTitle}>
                  {renderFields(chungFields)}
                </WorkflowFormSection>
              )}
              {legalFields.length > 0 && (
                <WorkflowFormSection
                  title={legalTitle}
                  description="Mục này chỉ xuất hiện vì file mẫu của bước có biến {{CanCu}}."
                >
                  {renderFields(legalFields)}
                </WorkflowFormSection>
              )}
              {cdtFields.length > 0 && (
                <WorkflowFormSection title={cdtTitle}>
                  {renderFields(cdtFields)}
                </WorkflowFormSection>
              )}
              {ntFields.length > 0 && (
                <WorkflowFormSection title={ntTitle}>
                  {renderFields(ntFields)}
                </WorkflowFormSection>
              )}
            </div>
            <WorkflowDocxPreview
              debounceMs={800}
              documents={[
                {
                  id: step.stepKey,
                  label: step.title,
                  previewData: formData,
                  loadPreview: () => api.previewLCNTStepPdf(stepId, formData),
                },
              ]}
            />
          </div>
        );
      })()}

      {!isAttachment && fields.length === 0 && (
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="font-semibold text-slate-900">Bản xem trước văn bản</h2>
            <p className="mt-1 text-xs text-slate-500">
              Mẫu Word của bước này chưa khai báo trường nhập liệu, nhưng vẫn có thể xem nội dung được hệ thống tự điền.
            </p>
          </div>
          <WorkflowDocxPreview
            debounceMs={800}
            documents={[
              {
                id: step.stepKey,
                label: step.title,
                previewData: formData,
                loadPreview: () => api.previewLCNTStepPdf(stepId, formData),
              },
            ]}
          />
        </div>
      )}

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
      <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
        {/* Save */}
        {canEdit && fields.length > 0 && (
          <button onClick={handleSave} disabled={saving}
            className="min-h-10 w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto">
            {saving
              ? '⏳ Đang lưu...'
              : step.approvalStatus === 'PENDING_APPROVAL'
                ? '💾 Lưu chỉnh sửa'
                : '💾 Lưu thông tin'}
          </button>
        )}

        {/* Request approval */}
        {canRequestApproval && fields.length > 0 && (
          <button onClick={() => { setApprovalMode('request'); setShowApprovalModal(true); }}
            className="min-h-10 w-full rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 sm:w-auto">
            📤 Trình lên Giám đốc/Trưởng phòng
          </button>
        )}

        {/* Approve / Reject (for HEAD/DIRECTOR) */}
        {canApprove && (
          <>
            <button onClick={() => { setApprovalMode('approve'); setApprovalComment(''); setShowApprovalModal(true); }}
              className="min-h-10 w-full rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto">
              ✅ Phê duyệt
            </button>
            <button onClick={() => { setApprovalMode('reject'); setApprovalComment(''); setShowApprovalModal(true); }}
              className="min-h-10 w-full rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 sm:w-auto">
              ❌ Từ chối
            </button>
          </>
        )}

        {/* Download DOCX (auto-generated on save) */}
        {!isAttachment && (
          <button onClick={handleDownloadDocx}
            className="min-h-10 w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">
            📥 Tải DOCX
          </button>
        )}

        {/* Complete */}
        {canComplete && !canRequestApproval && (
          <button onClick={handleComplete}
            className="min-h-10 w-full rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto">
            ✅ Hoàn thành bước
          </button>
        )}

        {/* Reopen */}
        {step.status === 'COMPLETED' && (
          <button onClick={handleReopen}
            className="min-h-10 w-full rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 sm:w-auto">
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
              {approvalMode === 'request' ? 'Chọn một người có thẩm quyền để phê duyệt Quyết định.'
               : approvalMode === 'approve' ? 'Xác nhận phê duyệt bước này.'
               : 'Vui lòng nhập lý do từ chối.'}
            </p>
            {/* Approver selector - only show when requesting approval */}
            {approvalMode === 'request' && (
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
                      {u.name}{u.position ? ` · ${u.position}` : ''}{u.department ? ` · ${u.department}` : ''}
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
