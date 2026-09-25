'use client';

import { OnlyOfficeFilePreview } from '@/components/OnlyOfficeFilePreview';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';
import { ApprovalDossierWorkspace } from '@/components/ApprovalDossierWorkspace';
import { ApproverSelect } from '@/components/ApproverSelect';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Search,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type Mode = 'PENDING' | 'PROCESSED';
type Category = 'ALL' | 'DAT_SACH' | 'DU_TOAN' | 'KHLCNT' | 'LCNT';

const categoryLabels: Record<Category, string> = {
  ALL: 'Tất cả',
  DAT_SACH: 'Đặt sách',
  DU_TOAN: 'Dự toán',
  KHLCNT: 'KHLCNT',
  LCNT: 'LCNT',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
};

function formatTime(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function dossierCategory(workflowType?: string): Category {
  if (workflowType === 'DU_TOAN') return 'DU_TOAN';
  if (workflowType === 'KHLCNT') return 'KHLCNT';
  if (workflowType === 'DAT_SACH') return 'DAT_SACH';
  return 'LCNT';
}

export default function ApprovalPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [mode, setMode] = useState<Mode>('PENDING');
  const [category, setCategory] = useState<Category>('ALL');
  const [query, setQuery] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionComment, setDecisionComment] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [dossier, setDossier] = useState<any | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const [forwardApproverId, setForwardApproverId] = useState('');

  const canUseApproval =
    user?.role === 'ADMIN' ||
    !!user?.canApprove ||
    !!user?.permissions?.includes('approval:review') ||
    !!user?.permissions?.includes('approval:final');
  const canAccessAssignedDossiers =
    canUseApproval ||
    !!user?.isInvestor ||
    !!user?.permissions?.includes('feature:projects') ||
    !!user?.permissions?.includes('feature:book-procurement') ||
    !!user?.permissions?.includes('feature:equipment-procurement');

  const loadRequests = useCallback(async () => {
    if (!canAccessAssignedDossiers) return;
    setLoading(true);
    const countRequest = canUseApproval
      ? api
          .getApprovalPendingCount()
          .then((result) => setPendingCount(result.count || 0))
          .catch(() => undefined)
      : Promise.resolve(setPendingCount(0));
    try {
      if (mode === 'PENDING') {
        const [data, assignedDossiers] = await Promise.all([
          canUseApproval
            ? api.getApprovalRequests({
                status: 'PENDING',
                q: query.trim() || undefined,
                limit: 100,
              })
            : Promise.resolve({ requests: [] }),
          api.getAssignedApprovalDossiers(),
        ]);
        const rework = assignedDossiers
          .filter((item: any) => item.status === 'REWORK')
          .filter(
            (item: any) =>
              !query.trim() ||
              [item.title, item.project?.tenDuAn, item.creator?.name]
                .filter(Boolean)
                .some(value =>
                  String(value)
                    .toLocaleLowerCase('vi')
                    .includes(query.trim().toLocaleLowerCase('vi')),
                ),
          )
          .map((item: any) => ({
            id: `dossier:${item.id}`,
            dossierId: item.id,
            isDossierRework: true,
            category: dossierCategory(item.workflowType),
            label: 'Bộ hồ sơ cần làm lại',
            title: item.title,
            status: 'REWORK',
            requester: item.requests?.[0]?.approver || item.creator,
            approver: item.currentHandler,
            submittedAt: item.updatedAt,
          }));
        setRequests([...(data.requests || []), ...rework]);
      } else {
        if (!canUseApproval) {
          setRequests([]);
          await countRequest;
          return;
        }
        const [approved, rejected] = await Promise.all([
          api.getApprovalRequests({
            status: 'APPROVED',
            q: query.trim() || undefined,
            limit: 100,
          }),
          api.getApprovalRequests({
            status: 'REJECTED',
            q: query.trim() || undefined,
            limit: 100,
          }),
        ]);
        setRequests(
          [...(approved.requests || []), ...(rejected.requests || [])].sort(
            (a, b) =>
              new Date(b.decidedAt || b.submittedAt).getTime()
              - new Date(a.decidedAt || a.submittedAt).getTime(),
          ),
        );
      }
      await countRequest;
    } catch (error: any) {
      if (error.message?.includes('quyền')) router.replace('/dashboard');
      else toast.error(error.message || 'Không thể tải danh sách phê duyệt');
    } finally {
      setLoading(false);
    }
  }, [canAccessAssignedDossiers, canUseApproval, mode, query, router]);

  useEffect(() => {
    const timer = window.setTimeout(loadRequests, 250);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  const filtered = useMemo(
    () =>
      category === 'ALL'
        ? requests
        : requests.filter((request) => request.category === category),
    [category, requests],
  );

  const openDetail = async (request: any) => {
    setSelected(request);
    setDetailLoading(true);
    setDecisionComment('');
    setRejecting(false);
    setForwarding(false);
    setForwardApproverId('');
    setDossier(null);
    try {
      if (request.isDossierRework) {
        const assigned = await api.getApprovalDossier(request.dossierId);
        setDossier(assigned);
        setSelected(request);
        return;
      }
      const detail = await api.getApprovalRequest(request.id);
      setSelected(detail);
      if (detail.dossierId) {
        setDossier(await api.getApprovalDossier(detail.dossierId));
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải chi tiết');
    } finally {
      setDetailLoading(false);
    }
  };

  const decide = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && !decisionComment.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      if (action === 'approve') {
        if (dossier) {
          await api.finalApproveRequest(selected.id, {
            expectedVersion: dossier.version,
            comment: decisionComment.trim() || undefined,
          });
          toast.success('Đã phê duyệt cuối toàn bộ bộ hồ sơ');
        } else {
          await api.approveRequest(selected.id, decisionComment.trim() || undefined);
          toast.success('Đã phê duyệt quyết định');
        }
      } else {
        if (dossier) {
          await api.rejectDossierRequest(selected.id, {
            expectedVersion: dossier.version,
            comment: decisionComment.trim(),
          });
          toast.success('Đã trả bộ hồ sơ về người gửi gần nhất');
        } else {
          await api.rejectRequest(selected.id, decisionComment.trim());
          toast.success('Đã trả lại quyết định để chỉnh sửa');
        }
      }
      setSelected(null);
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || 'Không thể xử lý yêu cầu');
    } finally {
      setActionLoading(false);
    }
  };

  const refreshDossier = useCallback(async () => {
    if (!dossier?.id) return;
    setDossier(await api.getApprovalDossier(dossier.id));
  }, [dossier?.id]);

  const forwardDossier = async () => {
    if (!selected || !dossier || !forwardApproverId) {
      toast.error('Vui lòng chọn người nhận tiếp theo');
      return;
    }
    setActionLoading(true);
    try {
      if (dossier.status === 'REWORK') {
        await api.resubmitApprovalDossier(dossier.id, {
          approverId: forwardApproverId,
          expectedVersion: dossier.version,
          comment: decisionComment.trim() || undefined,
        });
        toast.success('Đã sửa và gửi lại toàn bộ bộ hồ sơ');
      } else {
        await api.forwardApprovalRequest(selected.id, {
          approverId: forwardApproverId,
          expectedVersion: dossier.version,
          comment: decisionComment.trim() || undefined,
        });
        toast.success('Đã duyệt và chuyển tiếp toàn bộ bộ hồ sơ');
      }
      setSelected(null);
      setDossier(null);
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || 'Không thể chuyển tiếp bộ hồ sơ');
    } finally {
      setActionLoading(false);
    }
  };

  const returnDossier = async () => {
    if (!dossier) return;
    setActionLoading(true);
    try {
      await api.returnApprovalDossier(dossier.id, {
        expectedVersion: dossier.version,
        comment: decisionComment.trim() || undefined,
      });
      toast.success('Đã trả tiếp bộ hồ sơ về người gửi trước đó');
      setSelected(null);
      setDossier(null);
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || 'Không thể trả tiếp bộ hồ sơ');
    } finally {
      setActionLoading(false);
    }
  };

  const openPreview = async () => {
    if (!selected?.preview) return;
    if (
      selected.preview.kind !== 'PROCUREMENT_STEP'
      || selected.preview.attachmentPath
    ) {
      setPreview(selected.preview);
      return;
    }
    setPreviewLoading(true);
    try {
      const generated = await api.generateLCNTDocx(selected.preview.stepId);
      setPreview({
        ...selected.preview,
        attachmentPath: generated.objectName,
      });
    } catch (error: any) {
      toast.error(error.message || 'Không thể tạo bản xem trước Quyết định');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!isLoading && !canAccessAssignedDossiers) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
            <FileCheck2 className="h-7 w-7 text-blue-600" />
            Danh sách Phê duyệt
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xử lý trọn bộ hồ sơ được giao, xem chuỗi chuyển tiếp và lịch sử phiên bản.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">
          {pendingCount} chờ duyệt
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
            {([
              ['PENDING', 'Cần xử lý'],
              ['PROCESSED', 'Đã xử lý'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === value
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-full xl:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm dự án, người gửi..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(categoryLabels) as Category[]).map((value) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${
                category === value
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {categoryLabels[value]}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <FileCheck2 className="mb-3 h-12 w-12 text-slate-200" />
            <p className="font-medium">Không có Quyết định phù hợp</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((request) => (
              <button
                key={request.id}
                onClick={() => openDetail(request)}
                className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[1fr_180px_170px_24px] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                      {categoryLabels[request.category as Category] || request.category}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                        request.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : request.status === 'REJECTED'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {request.status === 'REWORK' ? 'Cần làm lại' : statusLabels[request.status]}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-semibold text-slate-900">
                    {request.label}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {request.title}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Người gửi</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-700">
                    {request.requester?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Thời điểm gửi</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatTime(request.submittedAt)}
                  </p>
                </div>
                <ChevronRight className="hidden h-5 w-5 text-slate-300 md:block" />
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <>
          <button
            aria-label="Đóng"
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 bg-slate-950/30"
          />
          <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-4xl flex-col bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  {selected.label}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {selected.title}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <>
                  <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">Người gửi</p>
                      <p className="mt-1 text-sm font-semibold">{selected.requester?.name}</p>
                      <p className="text-xs text-slate-500">{selected.requester?.department || selected.requester?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Gửi lúc</p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatTime(selected.submittedAt)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-400">Ghi chú gửi duyệt</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selected.submitComment || 'Không có ghi chú'}
                      </p>
                    </div>
                  </div>

                  {dossier ? (
                    <ApprovalDossierWorkspace
                      dossier={dossier}
                      onRefresh={refreshDossier}
                    />
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Hồ sơ tiền nhiệm
                        </h3>
                        <div className="mt-2 space-y-2">
                          {selected.target?.sourceDocument && (
                            <Prerequisite
                              label={selected.target.sourceDocument.type}
                              status={selected.target.sourceDocument.status}
                            />
                          )}
                          {selected.target?.parent && (
                            <Prerequisite
                              label={selected.target.parent.type}
                              status={selected.target.parent.status}
                            />
                          )}
                          {selected.target?.gdnDocuments?.map((item: any) => (
                            <Prerequisite key={item.id} label="Giấy đề nghị in" status={item.status} />
                          ))}
                          {selected.target?.pcdiDocuments?.map((item: any) => (
                            <Prerequisite key={item.id} label="Phiếu chỉ định cơ sở in" status={item.status} />
                          ))}
                          {selected.target?.contractorSelection?.steps
                            ?.filter((item: any) => item.stepOrder < selected.target.stepOrder)
                            .map((item: any) => (
                              <Prerequisite
                                key={item.id}
                                label={item.title}
                                status={item.status}
                              />
                            ))}
                          {!selected.target?.sourceDocument
                            && !selected.target?.parent
                            && !selected.target?.gdnDocuments?.length
                            && !selected.target?.pcdiDocuments?.length
                            && !selected.target?.contractorSelection?.steps?.some(
                              (item: any) => item.stepOrder < selected.target.stepOrder,
                            ) && (
                              <p className="rounded-xl border border-dashed p-3 text-sm text-slate-400">
                                Các bước tiền nhiệm đã được hệ thống kiểm tra khi gửi.
                              </p>
                            )}
                        </div>
                      </div>

                      <button
                        onClick={openPreview}
                        disabled={previewLoading}
                        className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        {previewLoading ? 'Đang tạo bản xem trước...' : 'Xem trước Quyết định'}
                      </button>
                    </>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Lịch sử các vòng duyệt
                    </h3>
                    <div className="mt-3 space-y-3">
                      {(dossier?.requests || selected.history || [selected]).map((item: any) => (
                        <div key={item.id} className="flex gap-3">
                          {item.status === 'APPROVED' ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                          ) : item.status === 'REJECTED' ? (
                            <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                          ) : (
                            <Clock3 className="mt-0.5 h-5 w-5 text-amber-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {statusLabels[item.status]} · {item.approver?.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatTime(item.decidedAt || item.submittedAt)}
                            </p>
                            {(item.decisionComment || item.submitComment) && (
                              <p className="mt-1 text-sm text-slate-600">
                                {item.decisionComment || item.submitComment}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {(selected.status === 'PENDING' || dossier?.status === 'REWORK') && (
              <footer className="border-t bg-white px-6 py-4">
                <textarea
                  value={decisionComment}
                  onChange={(event) => setDecisionComment(event.target.value)}
                  placeholder={
                    rejecting
                      ? 'Nhập lý do từ chối (bắt buộc)...'
                      : forwarding
                        ? 'Ý kiến chuyển tiếp (không bắt buộc)...'
                        : 'Ý kiến phê duyệt (không bắt buộc)...'
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-3 flex justify-end gap-2">
                  {rejecting ? (
                    <>
                      <button
                        onClick={() => {
                          setRejecting(false);
                          setDecisionComment('');
                        }}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Hủy
                      </button>
                      <button
                        disabled={actionLoading || !decisionComment.trim()}
                        onClick={() => decide('reject')}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Xác nhận từ chối
                      </button>
                    </>
                  ) : forwarding && dossier ? (
                    <div className="w-full space-y-3">
                      <ApproverSelect
                        value={forwardApproverId}
                        onChange={setForwardApproverId}
                        disabled={actionLoading}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setForwarding(false);
                            setForwardApproverId('');
                          }}
                          className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading || !forwardApproverId}
                          onClick={forwardDossier}
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {dossier.status === 'REWORK'
                            ? 'Gửi lại bộ hồ sơ'
                            : 'Duyệt và chuyển tiếp'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {dossier?.status !== 'REWORK' && (
                        <button
                          onClick={() => setRejecting(true)}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Yêu cầu làm lại
                        </button>
                      )}
                      {dossier?.actions?.canReturn && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={returnDossier}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          Trả xuống người gửi trước
                        </button>
                      )}
                      {(dossier?.actions?.canForward || dossier?.actions?.canSubmit) && (
                        <button
                          type="button"
                          onClick={() => setForwarding(true)}
                          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                        >
                          <Send className="h-4 w-4" />
                          {dossier?.status === 'REWORK' ? 'Gửi lại bộ hồ sơ' : 'Duyệt và chuyển tiếp'}
                        </button>
                      )}
                      {(!dossier || dossier.actions?.canFinalApprove) && (
                        <button
                          disabled={actionLoading}
                          onClick={() => decide('approve')}
                          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {actionLoading
                            ? 'Đang xử lý...'
                            : dossier
                              ? 'Phê duyệt cuối'
                              : 'Duyệt'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </footer>
            )}
          </aside>
        </>
      )}

      {preview?.kind === 'DOCUMENT' && (
        <OnlyOfficePreview
          documentId={preview.documentId}
          onClose={() => setPreview(null)}
        />
      )}
      {preview?.kind === 'DAT_SACH' && (
        <OnlyOfficePreview
          type="qd"
          documentId={preview.projectId}
          onClose={() => setPreview(null)}
        />
      )}
      {preview?.kind === 'PROCUREMENT_STEP' && preview.attachmentPath && (
        <OnlyOfficeFilePreview
          objectPath={preview.attachmentPath}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function Prerequisite({ label, status }: { label: string; status: string }) {
  const complete = status === 'COMPLETED' || status === 'APPROVED';
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
          complete
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}
      >
        {complete ? 'Hoàn thành' : status}
      </span>
    </div>
  );
}
