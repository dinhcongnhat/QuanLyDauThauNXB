'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ContractorSelection, ProcurementStep } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SmartFormField, FieldDef } from '@/components/SmartFormField';
import { LegalBasisField } from '@/components/LegalBasisField';
import { getFieldsForStep, ATTACHMENT_ONLY } from '@/lib/lcnt-field-defs';
import { ZipDownloadModal } from '@/components/ZipDownloadModal';
import { HistoryModal } from '@/components/HistoryModal';
import { OnlyOfficeFilePreview } from '@/components/OnlyOfficeFilePreview';
import { motion } from 'framer-motion';
import { WorkflowArrowStepper } from '@/components/WorkflowDocumentUI';
import {
  getLCNTTemplateFieldKeys,
  isBlankWorkflowValue,
  mergeTemplateFields,
  normalizeLegalBasisValue,
  normalizeWorkflowAttachments,
  pickWorkflowFormData,
} from '@/lib/workflow-template-api';

const METHOD_LABELS: Record<string, string> = {
  CHI_DINH_THAU: 'Chỉ định thầu',
  CHAO_HANG_CANH_TRANH: 'Chào hàng cạnh tranh',
  DAU_THAU_RONG_RAI: 'Đấu thầu rộng rãi',
};

const STEP_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
};
const STEP_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-200 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
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

export default function LCNTProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const selectionId = params.selectionId as string;

  const [selection, setSelection] = useState<ContractorSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadGhiChu, setUploadGhiChu] = useState('');
  const [contractPackageType, setContractPackageType] = useState<string>('');
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  // Step form data
  const [stepFormData, setStepFormData] = useState<Record<string, any>>({});
  const [autoFillData, setAutoFillData] = useState<Record<string, any>>({});
  const [templateFieldKeys, setTemplateFieldKeys] = useState<string[]>([]);

  // Approval
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject' | 'request'>('approve');
  const [approvers, setApprovers] = useState<any[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');
  const [showZipModal, setShowZipModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadSelection = useCallback(async () => {
    try {
      const data = await api.getContractorSelection(selectionId);
      setSelection(data);
      if (data.contractPackageType) setContractPackageType(data.contractPackageType);
      // Re-sync selected step data if still selected
      if (selectedStepId) {
        const updatedStep = data.steps.find((s: any) => s.id === selectedStepId);
        if (updatedStep) {
          const rawData = (updatedStep.data || {}) as Record<string, any>;
          const allowedFields = mergeTemplateFields(
            getFieldsForStep(updatedStep.stepKey, data.procurementMethod),
            templateFieldKeys,
          );
          setStepFormData(
            pickWorkflowFormData(
              rawData,
              allowedFields.map((field) => field.key),
            ),
          );
        }
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectionId, selectedStepId, templateFieldKeys]);

  // Load selection only on mount or selectionId change to avoid selectedStepId selection race conditions
  useEffect(() => {
    const initLoad = async () => {
      try {
        const data = await api.getContractorSelection(selectionId);
        setSelection(data);
        if (data.contractPackageType) setContractPackageType(data.contractPackageType);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    initLoad();
  }, [selectionId]);

  // Only accounts explicitly granted canApprove by Admin are selectable.
  useEffect(() => {
    api.getApprovers().then(setApprovers).catch(() => setApprovers([]));
  }, []);

  const handleSelectStep = async (step: ProcurementStep) => {
    if (selectedStepId === step.id) {
      setSelectedStepId(null);
      return;
    }
    setSelectedStepId(step.id);
    const dynamicFields = await getLCNTTemplateFieldKeys(step.id).catch(
      () => [],
    );
    setTemplateFieldKeys(dynamicFields);
    const allowedFields = mergeTemplateFields(
      getFieldsForStep(step.stepKey, selection?.procurementMethod || 'CHI_DINH_THAU'),
      dynamicFields,
    );
    const rawData = (step.data || {}) as Record<string, any>;
    const normalizedData = pickWorkflowFormData(
      rawData,
      allowedFields.map((field) => field.key),
    );
    setStepFormData(normalizedData);
    setAutoFillData({});

    // Load auto-fill for NOT_STARTED or IN_PROGRESS steps to populate blank fields
    if (step.status !== 'COMPLETED') {
      try {
        const data = await api.getLCNTAutoFill(step.id);
        if (data && Object.keys(data).length > 0) {
          const normalizedAutoFill = pickWorkflowFormData(
            data,
            allowedFields.map((field) => field.key),
          );
          setAutoFillData(normalizedAutoFill);
          
          const mergedData = { ...normalizedData };
          let hasNewUpdates = false;
          const keysToUpdate: Record<string, any> = {};

          for (const [key, val] of Object.entries(normalizedAutoFill)) {
            if (isBlankWorkflowValue(mergedData[key])) {
              mergedData[key] = val;
              keysToUpdate[key] = val;
              hasNewUpdates = true;
            }
          }

          if (hasNewUpdates) {
            setStepFormData(mergedData);
            await api.updateLCNTStep(step.id, keysToUpdate);
            
            // Reload selection so that selection.steps gets the updated data from DB
            const updatedSelection = await api.getContractorSelection(selectionId);
            setSelection(updatedSelection);
          } else {
            setStepFormData(prev => {
              const merged = { ...prev };
              for (const [key, val] of Object.entries(normalizedAutoFill)) {
                if (isBlankWorkflowValue(merged[key])) {
                  merged[key] = val;
                }
              }
              return merged;
            });
          }
        }
      } catch (err) {
        console.error('Auto-fill error:', err);
      }
    }
  };

  const getCurrentStep = (): ProcurementStep | null => {
    if (!selection || !selectedStepId) return null;
    return selection.steps.find(s => s.id === selectedStepId) || null;
  };

  const handleSave = async () => {
    if (!selectedStepId) return;
    const step = getCurrentStep();
    setSaving(true);
    try {
      await api.updateLCNTStep(selectedStepId, stepFormData);
      const isAtt = ATTACHMENT_ONLY.has(step?.stepKey || '');
      if (!isAtt) {
        try { await api.generateLCNTDocx(selectedStepId); } catch {}
      }
      toast.success('Đã lưu thông tin');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!selectedStepId) return;
    const step = getCurrentStep();
    if (step?.stepKey === 'hop_dong' && !contractPackageType) {
      toast.error('Vui lòng chọn loại gói thầu trước khi hoàn thành');
      return;
    }
    try {
      await api.updateLCNTStep(selectedStepId, stepFormData);
      if (step?.stepKey === 'hop_dong' && contractPackageType) {
        await api.setContractPackageType(selectionId, contractPackageType);
      }
      await api.completeLCNTStep(selectedStepId);
      toast.success('Đã hoàn thành bước');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReopen = async () => {
    if (!selectedStepId) return;
    try {
      await api.reopenLCNTStep(selectedStepId);
      toast.success('Đã mở lại bước để chỉnh sửa');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRequestApproval = async () => {
    if (!selectedStepId) return;
    if (!selectedApproverId) {
      toast.error('Vui lòng chọn người phê duyệt');
      return;
    }
    try {
      await api.requestStepApproval(selectedStepId, approvalComment, selectedApproverId);
      toast.success('Đã gửi Quyết định đến người phê duyệt');
      setShowApprovalModal(false);
      setApprovalComment('');
      setSelectedApproverId('');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleApprove = async () => {
    if (!selectedStepId) return;
    try {
      await api.approveLCNTStep(selectedStepId, approvalComment);
      toast.success('Đã phê duyệt bước');
      setShowApprovalModal(false);
      setApprovalComment('');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async () => {
    if (!selectedStepId) return;
    if (!approvalComment.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    try {
      await api.rejectLCNTStep(selectedStepId, approvalComment);
      toast.success('Đã từ chối bước');
      setShowApprovalModal(false);
      setApprovalComment('');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDownloadDocx = async () => {
    if (!selectedStepId) return;
    try {
      const res = await api.downloadLCNTStepDocx(selectedStepId);
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

  const handlePreviewGeneratedDocx = async (step: ProcurementStep) => {
    setSaving(true);
    try {
      let objectPath = String((step as any).attachmentPath || '');
      // Legacy generated paths embedded a long Vietnamese package title and
      // can no longer be opened reliably by MinIO/OnlyOffice. Regenerate them
      // once with the canonical short object key.
      if (!objectPath.endsWith('/document.docx')) {
        const generated = await api.generateLCNTDocx(step.id);
        objectPath = generated.objectName;
        await loadSelection();
      }
      if (!objectPath) throw new Error('Không tạo được file DOCX');
      setPreviewPath(objectPath);
    } catch (err: any) {
      toast.error(err.message || 'Không thể xem file DOCX');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!selectedStepId) return;
    setUploading(true);
    try {
      await api.uploadLCNTAttachment(selectedStepId, file, uploadGhiChu.trim() || undefined);
      toast.success('Đã tải lên: ' + file.name);
      setUploadGhiChu('');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };
  
  const handleDeleteAttachment = async (path: string) => {
    if (!selectedStepId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa file đính kèm này không?')) return;
    try {
      await api.deleteLCNTAttachment(selectedStepId, path);
      toast.success('Đã xóa file đính kèm');
      await loadSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
    e.target.value = '';
  };

  const handlePreviewFile = async (objectPath: string) => {
    const ext = objectPath.split('.').pop()?.toLowerCase();
    const officeExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'pdf'];
    if (ext && officeExtensions.includes(ext)) {
      setPreviewPath(objectPath);
    } else {
      try {
        const { url } = await api.getLCNTFileUrl(objectPath);
        window.open(url, '_blank');
      } catch (err: any) { toast.error(err.message); }
    }
  };

  const getAttachments = (step: ProcurementStep): any[] => {
    return normalizeWorkflowAttachments((step.data as any)?._attachments);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy quy trình</p>
        <button onClick={() => router.push('/dashboard/lua-chon-nha-thau')}
          className="mt-3 text-primary-600 hover:text-primary-700">← Quay lại</button>
      </div>
    );
  }

  const steps = selection.steps;
  const currentStep = getCurrentStep();

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected}
        accept=".doc,.docx,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip,.rar" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/dashboard/lua-chon-nha-thau')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Quay lại danh sách gói thầu
          </button>
          <h1 className="text-xl font-bold text-gray-900">{selection.tenGoiThau}</h1>
          <p className="text-sm text-gray-500">
            {METHOD_LABELS[selection.procurementMethod]}
            {selection.qdKhlcnt && ` · QĐ: ${((selection.qdKhlcnt.data as any)?.tenDuAn) || ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selection.projectId && (
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border border-indigo-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lịch sử
            </button>
          )}
          {steps.every(s => s.status === 'COMPLETED') && (
            <button onClick={() => setShowZipModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
              📦 Tải toàn bộ file
            </button>
          )}
        </div>
      </div>

      {/* Steps Timeline */}
      <WorkflowArrowStepper
        title="Tiến trình LCNT"
        stages={steps.map((step, idx) => {
          const prevCompleted = idx === 0 || steps[idx - 1]?.status === 'COMPLETED';
          return {
            label: step.title,
            number: step.stepOrder,
            status: step.status === 'COMPLETED' ? 'completed' : step.status === 'IN_PROGRESS' ? 'active' : 'pending',
            selected: selectedStepId === step.id,
            disabled: step.status === 'NOT_STARTED' && !prevCompleted,
            meta: `${STEP_STATUS_LABELS[step.status]}${step.requiresApproval ? ` · ${APPROVAL_STATUS_LABELS[step.approvalStatus]}` : ''}`,
            onClick: () => handleSelectStep(step),
          };
        })}
      />

      {/* Step Detail */}
      {currentStep && (() => {
        const isAttachment = ATTACHMENT_ONLY.has(currentStep.stepKey);
        const fields = mergeTemplateFields(
          getFieldsForStep(currentStep.stepKey, selection.procurementMethod),
          templateFieldKeys,
        );
        const canEdit = currentStep.status !== 'COMPLETED';
        const canRequestApproval = currentStep.requiresApproval && currentStep.approvalStatus === 'NO_APPROVAL_REQUIRED';
        const canApproveStep = currentStep.approvalStatus === 'PENDING_APPROVAL';
        const canComplete = currentStep.status !== 'COMPLETED' && !canRequestApproval;
        const attachments = getAttachments(currentStep);

        return (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Step header */}
            <div className="px-6 py-4 bg-indigo-50 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-indigo-900">{currentStep.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STEP_STATUS_COLORS[currentStep.status]}`}>
                    {STEP_STATUS_LABELS[currentStep.status]}
                  </span>
                  {currentStep.requiresApproval && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${APPROVAL_STATUS_COLORS[currentStep.approvalStatus]}`}>
                      {APPROVAL_STATUS_LABELS[currentStep.approvalStatus]}
                    </span>
                  )}
                  {currentStep.completedAt && (
                    <span className="text-xs text-gray-400">
                      Hoàn thành: {format(new Date(currentStep.completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && canComplete && (
                  <button onClick={handleComplete}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    ✓ Hoàn thành
                  </button>
                )}
                {currentStep.status === 'COMPLETED' && (
                  <button onClick={handleReopen}
                    className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                    ↺ Mở lại
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Auto-fill notice */}
              {Object.keys(autoFillData).length > 0 && currentStep.status === 'NOT_STARTED' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">💡 Các trường thông tin đã được tự động điền từ bước trước.</p>
                </div>
              )}

              {/* Approval rejection notice */}
              {currentStep.approvalStatus === 'REJECTED' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800">⚠️ Bước đã bị từ chối</p>
                  {currentStep.approvalComment && (
                    <p className="text-xs text-red-600 mt-1">Lý do: {currentStep.approvalComment}</p>
                  )}
                </div>
              )}

              {/* Approval history */}
              {currentStep.approvalRequests && currentStep.approvalRequests.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Lịch sử phê duyệt:</p>
                  <div className="space-y-1.5">
                    {currentStep.approvalRequests.map((ar: any) => (
                      <div key={ar.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className={'font-medium ' + (
                          ar.action === 'APPROVED' ? 'text-green-600' :
                          ar.action === 'REJECTED' ? 'text-red-600' : 'text-orange-600'
                        )}>
                          {ar.action === 'APPROVED' ? '✅ Phê duyệt' :
                           ar.action === 'REJECTED' ? '❌ Từ chối' : '⏳ Trình duyệt'}
                        </span>
                        <span className="text-gray-500">{ar.user?.name || ar.userId}</span>
                        <span className="text-gray-400">{format(new Date(ar.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                        {ar.comment && <span className="text-gray-400 italic">- {ar.comment}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DOCX template form fields */}
              {fields.length > 0 && (() => {
                const hasGroups = fields.some(f => f.group);
                const chungFields = hasGroups ? fields.filter(f => !f.group || f.group === 'chung') : fields;
                const cdtFields = hasGroups ? fields.filter(f => f.group === 'cdt') : [];
                const ntFields = hasGroups ? fields.filter(f => f.group === 'nt') : [];

                const renderFields = (flds: FieldDef[]) => (
                  <div className="grid grid-cols-2 gap-4">
                    {flds.map(f => {
                      if (f.key === 'CanCu') {
                        const legalBasis = normalizeLegalBasisValue(
                          stepFormData.CanCu,
                        );
                        return canEdit ? (
                          <div key={f.key} className="col-span-2">
                            <LegalBasisField
                              value={legalBasis}
                              onChange={(value) =>
                                setStepFormData({
                                  ...stepFormData,
                                  CanCu: value,
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div key={f.key} className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              {f.label}
                            </label>
                            {legalBasis.length > 0 ? (
                              <ol className="space-y-1 text-sm">
                                {legalBasis.map((basis, index) => (
                                  <li key={`${basis.legalDocumentId || 'manual'}-${index}`}>
                                    {index + 1}. {basis.citationSnapshot}
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-sm">-</p>
                            )}
                          </div>
                        );
                      }

                      return canEdit ? (
                        <SmartFormField
                          key={f.key}
                          field={f}
                          value={String(stepFormData[f.key] ?? '')}
                          onChange={(key, val) => setStepFormData({ ...stepFormData, [key]: val })}
                          disabled={false}
                          isAutoFilled={!!autoFillData[f.key]}
                          formData={stepFormData as Record<string, string>}
                          onFormDataChange={(data) => setStepFormData(data)}
                        />
                      ) : (
                        <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                          <p className="text-sm">{String(stepFormData[f.key] ?? '') || '-'}</p>
                        </div>
                      );
                    })}
                  </div>
                );

                return (
                  <div className="space-y-4">
                    {hasGroups ? (
                      <>
                        {chungFields.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Thông tin chung</h4>
                            {renderFields(chungFields)}
                          </div>
                        )}
                        {cdtFields.length > 0 && (
                          <div className="border-l-4 border-l-blue-500 pl-4">
                            <h4 className="text-sm font-semibold text-blue-700 mb-3">🏛 Thông tin Chủ đầu tư</h4>
                            {renderFields(cdtFields)}
                          </div>
                        )}
                        {ntFields.length > 0 && (
                          <div className="border-l-4 border-l-amber-500 pl-4">
                            <h4 className="text-sm font-semibold text-amber-700 mb-3">🏢 Thông tin Nhà thầu</h4>
                            {renderFields(ntFields)}
                          </div>
                        )}
                      </>
                    ) : (
                      renderFields(fields)
                    )}
                  </div>
                );
              })()}

              {/* Attachment section */}
              {(isAttachment || attachments.length > 0) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    {isAttachment ? 'Đính kèm file' : 'File đính kèm'}
                  </h4>
                  {attachments.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {attachments.map((att: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{att.fileName}</p>
                            {att.ghiChu && <p className="text-xs text-gray-400 italic">Ghi chú: {att.ghiChu}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <button onClick={() => handlePreviewFile(att.path)}
                              className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem</button>
                            <button onClick={async () => {
                              try {
                                const { url } = await api.getLCNTFileUrl(att.path);
                                const a = document.createElement('a');
                                a.href = url; a.download = att.fileName || displayFilename(att.path); a.click();
                              } catch { toast.error('Lỗi tải file'); }
                            }}
                              className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥</button>
                            {canEdit && (
                              <button onClick={() => handleDeleteAttachment(att.path)}
                                className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">🗑️ Xóa</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isAttachment ? (
                    <p className="text-sm text-gray-400 italic mb-3">Chưa có file đính kèm</p>
                  ) : null}

                  {canEdit && (
                    <div className="flex gap-3">
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50">
                        {uploading ? 'Đang tải lên...' : '📎 Chọn file tải lên'}
                      </button>
                      <input type="text"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Ghi chú (tùy chọn)"
                        value={uploadGhiChu} onChange={e => setUploadGhiChu(e.target.value)} disabled={uploading} />
                    </div>
                  )}
                </div>
              )}

              {/* Contract package type for hop_dong */}
              {currentStep.stepKey === 'hop_dong' && canEdit && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Loại gói thầu (cho Thanh toán)</h4>
                  <select
                    className="w-full md:w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
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
              <div className="flex items-center gap-2 flex-wrap pt-4 border-t">
                {canEdit && fields.length > 0 && (
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50">
                    {saving ? 'Đang lưu...' : '💾 Lưu thông tin'}
                  </button>
                )}
                {canRequestApproval && fields.length > 0 && (
                  <button onClick={() => { setApprovalMode('request'); setShowApprovalModal(true); }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                    📤 Trình phê duyệt
                  </button>
                )}
                {canApproveStep && (
                  <>
                    <button onClick={() => { setApprovalMode('approve'); setApprovalComment(''); setShowApprovalModal(true); }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                      ✅ Phê duyệt
                    </button>
                    <button onClick={() => { setApprovalMode('reject'); setApprovalComment(''); setShowApprovalModal(true); }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                      ❌ Từ chối
                    </button>
                  </>
                )}
                {!isAttachment && (
                  <>
                    <button
                      onClick={() => void handlePreviewGeneratedDocx(currentStep)}
                      disabled={saving}
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm disabled:opacity-50"
                    >
                      👁 Xem DOCX
                    </button>
                    <button onClick={handleDownloadDocx}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      📥 Tải DOCX
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Prompt when no step selected */}
      {!currentStep && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">
          Chọn một bước trong tiến trình để xem chi tiết
        </div>
      )}

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
            {approvalMode === 'request' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn người phê duyệt</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedApproverId} onChange={e => setSelectedApproverId(e.target.value)}
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
              value={approvalComment} onChange={e => setApprovalComment(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
              <button
                onClick={approvalMode === 'request' ? handleRequestApproval :
                         approvalMode === 'approve' ? handleApprove : handleReject}
                className={'px-4 py-2 text-white rounded-lg text-sm font-medium ' + (
                  approvalMode === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  approvalMode === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-orange-500 hover:bg-orange-600'
                )}>
                {approvalMode === 'request' ? 'Gửi phê duyệt' :
                 approvalMode === 'approve' ? 'Phê duyệt' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZIP Download Modal */}
      <ZipDownloadModal
        open={showZipModal}
        onClose={() => setShowZipModal(false)}
        loadPreview={() => api.getLCNTZipPreview(selectionId)}
        downloadZip={() => api.downloadLCNTZip(selectionId)}
      />
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={selection.projectId}
        stepKey="lcnt"
        title="Lịch sử Lựa chọn nhà thầu"
      />
      {previewPath && (
        <OnlyOfficeFilePreview objectPath={previewPath} onClose={() => setPreviewPath(null)} />
      )}
    </div>
  );
}
