'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { HistoryModal } from '@/components/HistoryModal';
import {
  LegalBasisField,
  LegalBasisSelection,
} from '@/components/LegalBasisField';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';
import { ApproverSelect } from '@/components/ApproverSelect';
import {
  WorkflowDocxPreview,
  WorkflowDocxPreviewDocument,
} from '@/components/WorkflowDocxPreview';
import {
  WorkflowFormSection,
  WorkflowStageStepper,
} from '@/components/WorkflowDocumentUI';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format-utils';
import { useAuthStore } from '@/lib/store';
import {
  Document as Doc,
  DocStatus,
  LegalBasisSelectionValue,
  ProcurementPackage,
} from '@/lib/types';

const PROJ_TYPE = 'THAU_THIET_BI';
const TODAY = new Date().toISOString().slice(0, 10);
const INPUT_CLASS =
  'w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const statusLabels: Record<DocStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ phê duyệt',
  COMPLETED: 'Hoàn thành',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Cần làm lại',
};

const statusColors: Record<DocStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const typeLabels = {
  TT_DUTOAN: 'Tờ trình phê duyệt dự toán',
  QD_DUTOAN: 'Quyết định phê duyệt dự toán',
} as const;

type FormType = keyof typeof typeLabels;
type DuToanDraftStep = 'COVER' | 'DOCUMENT';

interface DuToanFormData {
  SoVanBan: string;
  NgayBanHanh: string;
  NgayKy: string;
  NguoiSoanVanBan: string;
  ThuTruongDonVi: string;
  TenDuAn: string;
  CanCuMoDau: string;
  canCuMoDau: LegalBasisSelectionValue[];
  ThuyetMinh: string;
  MucTieuQuyMo: string;
  NguonVon: string;
  NamThucHien: string;
  canCu: LegalBasisSelectionValue[];
  packages: ProcurementPackage[];
}

function packageId(prefix = 'package') {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyPackage(id = 'package-1'): ProcurementPackage {
  return {
    id,
    tenGoiThau: '',
    giaDuToanGoiThau: '',
    ghiChu: '',
    congViec: '',
    nguonVon: '',
    hinhThucLuaChonNhaThau: '',
    phuongThucLuaChonNhaThau: '',
    thoiGianToChucLuaChonNhaThau: '',
    thoiGianBatDauToChucLuaChonNhaThau: '',
    loaiHopDong: '',
    thoiGianThucHienGoiThau: '',
    tuyChonMuaThem: '',
  };
}

function emptyForm(): DuToanFormData {
  return {
    SoVanBan: '',
    NgayBanHanh: TODAY,
    NgayKy: TODAY,
    NguoiSoanVanBan: '',
    ThuTruongDonVi: '',
    TenDuAn: '',
    CanCuMoDau: '',
    canCuMoDau: [],
    ThuyetMinh: '',
    MucTieuQuyMo: '',
    NguonVon: '',
    NamThucHien: String(new Date().getFullYear()),
    canCu: [],
    packages: [emptyPackage()],
  };
}

function firstValue(data: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return '';
}

function normalizeLegalBases(
  data: Record<string, any>,
): LegalBasisSelectionValue[] {
  const raw =
    data?.canCu ??
    data?.CanCu ??
    data?.canCuPhapLy ??
    data?.CanCuVanBanPhapLy ??
    data?.TenCacVanBanPhapLyLienQuan ??
    [];
  const values = Array.isArray(raw) ? raw : [raw];

  return values
    .flatMap((item: any) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof item.citationSnapshot === 'string'
      ) {
        return [
          {
            legalDocumentId: item.legalDocumentId ?? null,
            source: item.source === 'LIBRARY' ? 'LIBRARY' : 'MANUAL',
            citationSnapshot: item.citationSnapshot,
          } as LegalBasisSelectionValue,
        ];
      }
      if (typeof item !== 'string') return [];
      return item
        .split(/\r?\n/)
        .map((citationSnapshot) => citationSnapshot.trim())
        .filter(Boolean)
        .map(
          (citationSnapshot): LegalBasisSelectionValue => ({
            legalDocumentId: null,
            source: 'MANUAL',
            citationSnapshot,
          }),
        );
    })
    .filter((item) => item.citationSnapshot.trim());
}

function normalizeOpeningLegalBasis(
  data: Record<string, any>,
): LegalBasisSelectionValue[] {
  const structured =
    data?.canCuMoDau
    ?? data?.CanCuMoDauSelection
    ?? data?.canCuMoDauSelection;
  if (structured !== undefined && structured !== null) {
    return normalizeLegalBases({ canCu: structured }).slice(0, 1);
  }

  const legacy = firstValue(data, 'CanCuMoDau');
  return legacy
    ? normalizeLegalBases({ canCu: legacy }).slice(0, 1)
    : [];
}

function normalizePackage(
  raw: Record<string, any>,
  index: number,
): ProcurementPackage {
  return {
    id: firstValue(raw, 'id') || `legacy-package-${index + 1}`,
    tenGoiThau: firstValue(raw, 'tenGoiThau', 'TenGoiThau'),
    giaDuToanGoiThau: formatMoney(
      firstValue(
        raw,
        'giaDuToanGoiThau',
        'GiaDuToanGoiThau',
        'giaGoiThau',
        'GiaGoiThau',
      ),
    ),
    ghiChu: firstValue(raw, 'ghiChu', 'GhiChu'),
    congViec: firstValue(
      raw,
      'congViec',
      'CongViec',
      'tomTatCongViec',
    ),
    nguonVon: firstValue(raw, 'nguonVon', 'NguonVon'),
    hinhThucLuaChonNhaThau: firstValue(
      raw,
      'hinhThucLuaChonNhaThau',
      'HinhThucLuaChonNhaThau',
      'hinhThucLuaChon',
    ),
    phuongThucLuaChonNhaThau: firstValue(
      raw,
      'phuongThucLuaChonNhaThau',
      'PhuongThucLuaChonNhaThau',
      'phuongThucLuaChon',
    ),
    thoiGianToChucLuaChonNhaThau: firstValue(
      raw,
      'thoiGianToChucLuaChonNhaThau',
      'ThoiGianToChucLuaChonNhaThau',
      'thoiGianToChuc',
    ),
    thoiGianBatDauToChucLuaChonNhaThau: firstValue(
      raw,
      'thoiGianBatDauToChucLuaChonNhaThau',
      'ThoiGianBatDauToChucLuaChonNhaThau',
      'thoiGianBatDau',
    ),
    loaiHopDong: firstValue(raw, 'loaiHopDong', 'LoaiHopDong'),
    thoiGianThucHienGoiThau: firstValue(
      raw,
      'thoiGianThucHienGoiThau',
      'ThoiGianThucHienGoiThau',
      'thoiGianThucHien',
    ),
    tuyChonMuaThem: firstValue(raw, 'tuyChonMuaThem', 'TuyChonMuaThem'),
  };
}

function normalizePackages(data: Record<string, any>): ProcurementPackage[] {
  const raw =
    data?.packages ??
    data?.goiThau ??
    data?.GoiThau ??
    data?.cacGoiThau ??
    data?.CacGoiThau;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, index) =>
      normalizePackage(item || {}, index),
    );
  }

  const legacyName = firstValue(data, 'tenGoiThau', 'TenGoiThau');
  if (legacyName) return [normalizePackage(data, 0)];
  return [emptyPackage()];
}

function normalizeDuToanData(data: Record<string, any>): DuToanFormData {
  return {
    SoVanBan: firstValue(
      data,
      'SoVanBan',
      'soVanBan',
      'SoToTrinh',
      'soToTrinh',
      'SoQuyetDinh',
      'soQuyetDinh',
    ),
    NgayBanHanh:
      firstValue(data, 'NgayBanHanh', 'ngayBanHanh', 'ngayLap').slice(
        0,
        10,
      ) || TODAY,
    NgayKy:
      firstValue(
        data,
        'NgayKy',
        'ngayKy',
        'NgayBanHanh',
        'ngayBanHanh',
        'ngayLap',
      ).slice(0, 10) || TODAY,
    NguoiSoanVanBan: firstValue(
      data,
      'NguoiSoanVanBan',
      'nguoiSoanVanBan',
      'NguoiSoan',
      'nguoiSoan',
    ),
    ThuTruongDonVi: firstValue(
      data,
      'ThuTruongDonVi',
      'thuTruongDonVi',
      'ThuTruong',
      'thuTruong',
    ),
    TenDuAn: firstValue(data, 'TenDuAn', 'tenDuAn'),
    CanCuMoDau: firstValue(data, 'CanCuMoDau', 'canCuMoDau'),
    canCuMoDau: normalizeOpeningLegalBasis(data),
    ThuyetMinh: firstValue(data, 'ThuyetMinh', 'thuyetMinh'),
    MucTieuQuyMo: firstValue(
      data,
      'MucTieuQuyMo',
      'mucTieuQuyMo',
      'quyMo',
    ),
    NguonVon: firstValue(data, 'NguonVon', 'nguonVon'),
    NamThucHien: firstValue(data, 'NamThucHien', 'namThucHien'),
    canCu: normalizeLegalBases(data),
    packages: normalizePackages(data),
  };
}

function packageNames(data: Record<string, any>): string {
  const derived = firstValue(data, 'TenCacGoiThau', 'tenCacGoiThau');
  if (derived) return derived;
  return normalizePackages(data)
    .map((item) => item.tenGoiThau.trim())
    .filter(Boolean)
    .join(', ');
}

function cleanPayload(data: DuToanFormData) {
  const canCuMoDau = data.canCuMoDau
    .filter((item) => item.citationSnapshot.trim())
    .slice(0, 1);
  return {
    ...data,
    CanCuMoDau: canCuMoDau[0]?.citationSnapshot.trim() || '',
    canCuMoDau,
    canCu: data.canCu.filter((item) => item.citationSnapshot.trim()),
    packages: data.packages.map((item) => ({
      ...item,
      tenGoiThau: item.tenGoiThau.trim(),
    })),
  };
}

function duToanDocxPreviewDocuments(
  type: FormType,
  data: DuToanFormData,
  step: DuToanDraftStep,
): WorkflowDocxPreviewDocument[] {
  const payload = cleanPayload(data);
  const cover: WorkflowDocxPreviewDocument = {
    id: 'cover',
    label: '0. Phiếu trình ký',
    type: 'COVER_DUTOAN',
    data: payload,
  };

  if (type === 'TT_DUTOAN' && step === 'COVER') return [cover];
  if (type === 'TT_DUTOAN') {
    return [
      cover,
      {
        id: 'proposal',
        label: '1. Tờ trình',
        type: 'TT_DUTOAN',
        data: payload,
      },
    ];
  }
  return [
    cover,
    {
      id: 'decision',
      label: '2. Quyết định',
      type: 'QD_DUTOAN',
      data: payload,
    },
  ];
}

function ThietBiDuToanPageInner() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(
    searchParams.get('project') || '',
  );
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<FormType | null>(null);
  const [draftStep, setDraftStep] = useState<DuToanDraftStep>('COVER');
  const [ttData, setTtData] = useState<DuToanFormData>(emptyForm);
  const [qdData, setQdData] = useState<DuToanFormData>(emptyForm);
  const [ttFile, setTtFile] = useState<File | null>(null);
  const [qdFile, setQdFile] = useState<File | null>(null);
  const [selectedTTId, setSelectedTTId] = useState('');
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [documentResponse, projectResponse] = await Promise.all([
        api.getDocumentsByType(
          ['TT_DUTOAN', 'QD_DUTOAN'],
          selectedProject || undefined,
          1,
          100,
          PROJ_TYPE,
        ),
        api.getProjects(),
      ]);
      setDocs(
        Array.isArray(documentResponse)
          ? documentResponse
          : (documentResponse as any)?.documents || [],
      );
      setProjects(
        (projectResponse.projects || []).filter(
          (project: any) => project.procurementType === PROJ_TYPE,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedProjectRecord = useMemo(
    () => projects.find((project: any) => project.id === selectedProject),
    [projects, selectedProject],
  );
  const selectedProjectName = selectedProjectRecord?.tenDuAn?.trim() || '';

  useEffect(() => {
    if (!selectedProjectName) return;
    setTtData((current) =>
      current.TenDuAn === selectedProjectName
        ? current
        : { ...current, TenDuAn: selectedProjectName },
    );
    setQdData((current) =>
      current.TenDuAn === selectedProjectName
        ? current
        : { ...current, TenDuAn: selectedProjectName },
    );
  }, [selectedProjectName]);

  const approvedTTs = docs.filter(
    (document) =>
      document.type === 'TT_DUTOAN'
      && ['COMPLETED', 'APPROVED'].includes(document.status),
  );
  const hasTT = docs.some((document) => document.type === 'TT_DUTOAN');
  const hasApprovedQD = docs.some(
    (document) =>
      document.type === 'QD_DUTOAN' && document.status === 'APPROVED',
  );
  const hasQD = docs.some((document) => document.type === 'QD_DUTOAN');
  const canApprove = user?.canApprove === true;

  const resetForm = () => {
    setShowForm(null);
    setDraftStep('COVER');
    setEditingDoc(null);
    setSelectedTTId('');
    setSelectedApproverId('');
    setTtData(emptyForm());
    setQdData(emptyForm());
    setTtFile(null);
    setQdFile(null);
  };

  const openCreate = (type: FormType) => {
    if (!selectedProject || !selectedProjectName) {
      toast.error('Vui lòng chọn dự án Thầu Thiết Bị trước');
      return;
    }
    resetForm();
    const initial = {
      ...emptyForm(),
      TenDuAn: selectedProjectName,
      NguoiSoanVanBan: user?.name || '',
    };
    if (type === 'TT_DUTOAN') {
      setTtData(initial);
      setDraftStep('COVER');
    } else {
      setQdData(initial);
      setDraftStep('DOCUMENT');
    }
    setShowForm(type);
  };

  const selectApprovedTT = (ttId: string) => {
    setSelectedTTId(ttId);
    const proposal = approvedTTs.find((item) => item.id === ttId);
    if (!proposal?.data) return;

    const inherited = normalizeDuToanData(proposal.data);
    setQdData((current) => ({
      ...inherited,
      TenDuAn: selectedProjectName || inherited.TenDuAn,
      SoVanBan: current.SoVanBan,
      NgayBanHanh: current.NgayBanHanh || TODAY,
    }));
  };

  const startEditing = (document: Doc) => {
    const type = document.type as FormType;
    const normalized = normalizeDuToanData(document.data || {});
    if (document.projectId) setSelectedProject(document.projectId);
    setEditingDoc(document);
    setShowForm(type);
    setDraftStep(type === 'TT_DUTOAN' ? 'COVER' : 'DOCUMENT');
    setSelectedTTId(document.sourceDocumentId || '');
    if (type === 'TT_DUTOAN') setTtData(normalized);
    if (type === 'QD_DUTOAN') setQdData(normalized);
  };

  const validate = (data: DuToanFormData, type: FormType) => {
    if (!selectedProject && !editingDoc?.projectId) {
      toast.error('Vui lòng chọn dự án');
      return false;
    }
    if (!selectedProjectName && !data.TenDuAn.trim()) {
      toast.error('Không tìm thấy tên dự án trong Quản lý dự án');
      return false;
    }
    if (
      data.packages.length === 0 ||
      data.packages.some((item) => !item.tenGoiThau.trim())
    ) {
      toast.error('Vui lòng nhập tên cho tất cả gói thầu');
      return false;
    }
    if (
      type === 'TT_DUTOAN'
      && (!data.NguoiSoanVanBan.trim() || !data.ThuTruongDonVi.trim())
    ) {
      toast.error(
        'Vui lòng nhập Người soạn văn bản và Thủ trưởng đơn vị trên Phiếu trình ký',
      );
      return false;
    }
    if (
      data.canCuMoDau.length !== 1
      || data.canCuMoDau[0].source !== 'LIBRARY'
      || !data.canCuMoDau[0].legalDocumentId
      || !data.canCuMoDau[0].citationSnapshot.trim()
    ) {
      toast.error(
        'Vui lòng chọn Căn cứ mở đầu từ Thư viện văn bản',
      );
      return false;
    }
    if (
      data.canCu.length === 0
      || data.canCu.some(
        (item) =>
          item.source !== 'LIBRARY'
          || !item.legalDocumentId
          || !item.citationSnapshot.trim(),
      )
    ) {
      toast.error(
        'Các căn cứ tại Mục I phải được chọn từ Thư viện văn bản',
      );
      return false;
    }
    if (type === 'QD_DUTOAN' && !selectedTTId && !editingDoc) {
      toast.error('Vui lòng chọn Tờ trình dự toán đã hoàn thành');
      return false;
    }
    if (type === 'QD_DUTOAN' && !data.SoVanBan.trim()) {
      toast.error('Vui lòng nhập số Quyết định');
      return false;
    }
    return true;
  };

  const continueFromCover = () => {
    if (!selectedProjectName) {
      toast.error('Vui lòng chọn dự án trong Quản lý dự án');
      return;
    }
    if (!ttData.NgayKy) {
      toast.error('Vui lòng chọn Ngày ký Phiếu trình');
      return;
    }
    if (
      !ttData.NguoiSoanVanBan.trim()
      || !ttData.ThuTruongDonVi.trim()
    ) {
      toast.error(
        'Vui lòng nhập Người soạn văn bản và Thủ trưởng đơn vị',
      );
      return;
    }
    if (
      ttData.packages.length === 0 ||
      ttData.packages.some((item) => !item.tenGoiThau.trim())
    ) {
      toast.error('Vui lòng nhập tên cho tất cả gói thầu ở Phiếu trình ký');
      return;
    }
    setTtData((current) => ({
      ...current,
      TenDuAn: selectedProjectName,
    }));
    setDraftStep('DOCUMENT');
  };

  const saveDocument = async (type: FormType) => {
    const currentData = type === 'TT_DUTOAN' ? ttData : qdData;
    const file = type === 'TT_DUTOAN' ? ttFile : qdFile;
    if (!validate(currentData, type)) return;
    if (type === 'QD_DUTOAN' && !selectedApproverId) {
      toast.error('Vui lòng chọn người phê duyệt');
      return;
    }

    setSubmitting(true);
    try {
      const payload = cleanPayload({
        ...currentData,
        TenDuAn: selectedProjectName || currentData.TenDuAn,
      });
      let saved: Doc;
      if (editingDoc) {
        saved = await api.resubmitDocument(editingDoc.id, payload);
      } else {
        saved = await api.createDocument(
          type,
          payload,
          undefined,
          undefined,
          selectedProject || undefined,
          type === 'QD_DUTOAN' ? selectedTTId : undefined,
        );
      }

      let attachmentFailed = false;
      if (file) {
        try {
          await api.uploadKhaiToanAttachment(saved.id, file);
        } catch (error) {
          attachmentFailed = true;
          toast.error(
            `Văn bản đã tạo nhưng chưa tải được phụ lục: ${
              error instanceof Error ? error.message : 'Lỗi không xác định'
            }`,
          );
        }
      }

      if (type === 'QD_DUTOAN' && !attachmentFailed) {
        await api.submitApproval({
          targetType: 'DOCUMENT',
          targetId: saved.id,
          approverId: selectedApproverId,
        });
      }

      if (!attachmentFailed) {
        toast.success(
          editingDoc
            ? editingDoc.status === 'REJECTED'
              ? type === 'QD_DUTOAN'
                ? 'Đã lưu và gửi lại Quyết định'
                : 'Đã hoàn thành lại Tờ trình'
              : 'Đã lưu văn bản'
            : type === 'QD_DUTOAN'
              ? 'Đã tạo và gửi duyệt Quyết định'
              : 'Đã hoàn thành Tờ trình dự toán',
        );
      }
      resetForm();
      await fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể lưu văn bản',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveDocument(id);
      toast.success('Đã phê duyệt');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể duyệt');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    try {
      await api.rejectDocument(id, rejectComment);
      toast.success('Đã yêu cầu làm lại');
      setRejectingId(null);
      setRejectComment('');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể từ chối');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await api.downloadDocument(id);
      if (!response.ok) throw new Error('Không thể tải văn bản');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'van-ban-du-toan.docx';
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải file');
    }
  };

  const handleDownloadBundle = async (id: string) => {
    try {
      const response = await api.downloadDocumentBundle(id);
      if (!response.ok) throw new Error('Không thể tải bộ hồ sơ');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'bo-ho-so-du-toan.zip';
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải bộ hồ sơ',
      );
    }
  };

  const handleDownloadCover = async (id: string) => {
    try {
      const response = await api.downloadDocumentCover(id);
      if (!response.ok) throw new Error('Không thể tải Phiếu trình ký');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'phieu-trinh-ky-phe-duyet-du-toan.docx';
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải Phiếu trình ký',
      );
    }
  };

  const openKhaiToan = async (id: string) => {
    try {
      const response = await api.getKhaiToanAttachment(id);
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể mở phụ lục',
      );
    }
  };

  const uploadAttachmentForExisting = async (
    id: string,
    file: File,
  ) => {
    if (!file.name.toLocaleLowerCase().endsWith('.docx')) {
      toast.error('Phụ lục khái toán phải là file DOCX');
      return;
    }
    try {
      await api.uploadKhaiToanAttachment(id, file);
      toast.success('Đã tải phụ lục khái toán');
      await fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải phụ lục khái toán',
      );
    }
  };

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    if (!query) return docs;
    return docs.filter((document) => {
      const data = document.data || {};
      return [
        firstValue(data, 'TenDuAn', 'tenDuAn'),
        firstValue(
          data,
          'SoVanBan',
          'soVanBan',
          'SoToTrinh',
          'soToTrinh',
          'SoQuyetDinh',
          'soQuyetDinh',
        ),
        packageNames(data),
        document.creator?.name,
      ].some((value) =>
        String(value || '')
          .toLocaleLowerCase('vi')
          .includes(query),
      );
    });
  }, [docs, searchQuery]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Phê duyệt dự toán
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Thầu Thiết Bị — dữ liệu nhiều gói thầu được dùng xuyên suốt
            Dự toán → KHLCNT.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {selectedProject && (
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Lịch sử
            </button>
          )}
          {!showForm && (
            <>
              <button
                type="button"
                onClick={() => openCreate('TT_DUTOAN')}
                className="min-h-10 flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:flex-none"
              >
                + Bắt đầu hồ sơ dự toán
              </button>
              <button
                type="button"
                onClick={() => openCreate('QD_DUTOAN')}
                disabled={approvedTTs.length === 0}
                className="min-h-10 flex-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:flex-none"
              >
                + Quyết định dự toán
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <label className="mb-2 block text-sm font-medium text-blue-900">
          Dự án Thầu Thiết Bị
        </label>
        <select
          value={selectedProject}
          disabled={Boolean(showForm)}
          onChange={(event) => setSelectedProject(event.target.value)}
          className="w-full max-w-xl rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100"
        >
          <option value="">— Chọn dự án —</option>
          {projects.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.tenDuAn}
            </option>
          ))}
        </select>
      </div>

      <WorkflowStageStepper
        stages={[
          {
            number: 0,
            label: 'Mẫu phiếu trình ký phê duyệt dự toán',
            description:
              'Nhập tên các gói thầu; tên dự án được lấy từ Quản lý dự án.',
            status:
              hasTT ||
              (showForm === 'TT_DUTOAN' && draftStep === 'DOCUMENT')
                ? 'completed'
                : showForm === 'TT_DUTOAN' && draftStep === 'COVER'
                  ? 'active'
                  : 'pending',
          },
          {
            number: 1,
            label: 'Tờ trình dự toán',
            description:
              'Kế thừa Phiếu trình ký, bổ sung số văn bản, căn cứ và giá.',
            status:
              approvedTTs.length > 0
                ? 'completed'
                : hasTT ||
                    (showForm === 'TT_DUTOAN' &&
                      draftStep === 'DOCUMENT')
                  ? 'active'
                  : 'pending',
          },
          {
            number: 2,
            label: 'Quyết định dự toán',
            description:
              'Kế thừa Tờ trình đã hoàn thành và ghép phụ lục khái toán.',
            status: hasApprovedQD
              ? 'completed'
              : hasQD || showForm === 'QD_DUTOAN' || approvedTTs.length > 0
                ? 'active'
                : 'pending',
          },
        ]}
      />

      {showForm && (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div
            className={`rounded-t-2xl border-b px-4 py-4 sm:px-6 ${
              showForm === 'TT_DUTOAN' ? 'bg-blue-50' : 'bg-purple-50'
            }`}
          >
            <h2 className="font-semibold text-gray-900">
              {showForm === 'TT_DUTOAN' && draftStep === 'COVER'
                ? '0. Mẫu phiếu trình ký phê duyệt dự toán'
                : `${
                    editingDoc
                      ? editingDoc.status === 'REJECTED'
                        ? 'Sửa và gửi lại '
                        : 'Chỉnh sửa '
                      : 'Tạo '
                  }${
                    typeLabels[showForm]
                  }`}
            </h2>
          </div>
          <div className="space-y-5 p-3 sm:p-5 2xl:p-6">
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] 2xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
              <div className="space-y-6">
                {showForm === 'QD_DUTOAN' && !editingDoc && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <label className="mb-2 block text-sm font-medium text-blue-900">
                      Tờ trình dự toán đã hoàn thành
                    </label>
                    <select
                      value={selectedTTId}
                      onChange={(event) =>
                        selectApprovedTT(event.target.value)
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">— Chọn văn bản nguồn —</option>
                      {approvedTTs.map((proposal) => (
                        <option key={proposal.id} value={proposal.id}>
                          {firstValue(
                            proposal.data,
                            'SoVanBan',
                            'SoToTrinh',
                            'soToTrinh',
                          ) || 'Tờ trình'}{' '}
                          — {packageNames(proposal.data || {})}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {showForm === 'QD_DUTOAN' && (
                  <ApproverSelect
                    value={selectedApproverId}
                    onChange={setSelectedApproverId}
                    disabled={submitting}
                  />
                )}

                {showForm === 'TT_DUTOAN' && draftStep === 'COVER' ? (
                  <DuToanCoverForm
                    value={ttData}
                    onChange={setTtData}
                    projectName={selectedProjectName}
                  />
                ) : (
                  <DuToanForm
                    value={showForm === 'TT_DUTOAN' ? ttData : qdData}
                    onChange={
                      showForm === 'TT_DUTOAN' ? setTtData : setQdData
                    }
                    file={showForm === 'TT_DUTOAN' ? ttFile : qdFile}
                    onFileChange={
                      showForm === 'TT_DUTOAN' ? setTtFile : setQdFile
                    }
                    sourceAttachmentName={
                      showForm === 'QD_DUTOAN' && selectedTTId
                        ? approvedTTs.find((item) => item.id === selectedTTId)
                            ?.data?.khaiToanAttachment?.originalName ||
                          approvedTTs.find((item) => item.id === selectedTTId)
                            ?.data?.FileKhaiToanDinhKem
                        : undefined
                    }
                    packagesReadOnly={showForm === 'QD_DUTOAN'}
                    projectName={selectedProjectName}
                  />
                )}
              </div>

              <WorkflowDocxPreview
                documents={duToanDocxPreviewDocuments(
                  showForm,
                  showForm === 'TT_DUTOAN' ? ttData : qdData,
                  draftStep,
                ).map((document) => {
                  const attachment =
                    showForm === 'TT_DUTOAN' ? ttFile : qdFile;
                  if (
                    !attachment ||
                    document.id === 'cover' ||
                    !document.type
                  ) {
                    return document;
                  }
                  return {
                    ...document,
                    loadPreview: () =>
                      api.previewDocumentPdfWithAttachment(
                        document.type!,
                        document.data || {},
                        attachment,
                      ),
                  };
                })}
                activeDocumentId={
                  showForm === 'QD_DUTOAN'
                    ? 'decision'
                    : draftStep === 'COVER'
                      ? 'cover'
                      : 'proposal'
                }
              />
            </div>

            <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
              {showForm === 'TT_DUTOAN' &&
                draftStep === 'DOCUMENT' &&
                !editingDoc && (
                  <button
                    type="button"
                    onClick={() => setDraftStep('COVER')}
                    disabled={submitting}
                    className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:mr-auto"
                  >
                    ← Quay lại bước 0
                  </button>
                )}
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="min-h-10 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() =>
                  showForm === 'TT_DUTOAN' && draftStep === 'COVER'
                    ? continueFromCover()
                    : saveDocument(showForm)
                }
                disabled={submitting}
                className={`min-h-10 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
                  showForm === 'TT_DUTOAN'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {showForm === 'TT_DUTOAN' && draftStep === 'COVER'
                  ? 'Tiếp tục: 1. Tờ trình dự toán'
                  : submitting
                  ? 'Đang lưu...'
                  : editingDoc
                    ? editingDoc.status === 'REJECTED'
                      ? 'Lưu và gửi lại'
                      : 'Lưu chỉnh sửa'
                    : showForm === 'QD_DUTOAN'
                      ? 'Tạo và gửi duyệt Quyết định'
                      : 'Hoàn thành Tờ trình'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm số văn bản, dự án hoặc gói thầu..."
          className={`${INPUT_CLASS} bg-white pl-10`}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          ⌕
        </span>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-gray-400">
          Chưa có hồ sơ dự toán phù hợp.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-[980px] w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Số văn bản
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Các gói thầu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocs.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {typeLabels[document.type as FormType] || document.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {firstValue(
                      document.data,
                      'SoVanBan',
                      'soVanBan',
                      'SoToTrinh',
                      'soToTrinh',
                      'SoQuyetDinh',
                      'soQuyetDinh',
                    ) || '—'}
                  </td>
                  <td className="max-w-[360px] px-4 py-3 text-sm text-gray-700">
                    {packageNames(document.data || {}) || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        statusColors[document.status] ||
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {statusLabels[document.status] || document.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(document.createdAt), 'dd/MM/yyyy', {
                      locale: vi,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewDocId(document.id)}
                        className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(document.id)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                      >
                        DOCX
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCover(document.id)}
                        className="rounded bg-cyan-50 px-2 py-1 text-xs text-cyan-700 hover:bg-cyan-100"
                      >
                        Phiếu trình ký
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadBundle(document.id)
                        }
                        className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                      >
                        Tải bộ hồ sơ
                      </button>
                      {(document.data?.khaiToanAttachment ||
                        document.data?._khaiToanAttachment) && (
                        <button
                          type="button"
                          onClick={() => openKhaiToan(document.id)}
                          className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
                        >
                          Phụ lục
                        </button>
                      )}
                      {(document.createdBy === user?.id ||
                        user?.role === 'ADMIN') && (
                        <label className="cursor-pointer rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100">
                          {document.data?.khaiToanAttachment ||
                          document.data?._khaiToanAttachment
                            ? 'Đổi phụ lục'
                            : 'Tải phụ lục'}
                          <input
                            type="file"
                            className="hidden"
                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void uploadAttachmentForExisting(
                                  document.id,
                                  file,
                                );
                              }
                              event.target.value = '';
                            }}
                          />
                        </label>
                      )}
                      {canApprove &&
                        document.assignedTo === user?.id &&
                        document.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(document.id)}
                              className="rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                            >
                              Duyệt
                            </button>
                            {rejectingId === document.id ? (
                              <span className="flex gap-1">
                                <input
                                  value={rejectComment}
                                  onChange={(event) =>
                                    setRejectComment(event.target.value)
                                  }
                                  placeholder="Lý do..."
                                  className="w-32 rounded border px-2 py-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleReject(document.id)}
                                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                                >
                                  Gửi
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRejectingId(document.id)}
                                className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                              >
                                Làm lại
                              </button>
                            )}
                          </>
                        )}
                      {(['DRAFT', 'REJECTED'] as DocStatus[]).includes(
                        document.status,
                      ) &&
                        (document.createdBy === user?.id ||
                          user?.role === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => startEditing(document)}
                            className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                          >
                            {document.status === 'REJECTED'
                              ? 'Sửa & gửi lại'
                              : 'Chỉnh sửa'}
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={selectedProject}
        stepKey="phe_duyet_du_toan"
        title="Lịch sử Phê duyệt Dự toán"
      />

      {previewDocId && (
        <OnlyOfficePreview
          documentId={previewDocId}
          onClose={() => setPreviewDocId(null)}
          type="document"
        />
      )}

    </div>
  );
}

function DuToanCoverForm({
  value,
  onChange,
  projectName,
}: {
  value: DuToanFormData;
  onChange: (value: DuToanFormData) => void;
  projectName: string;
}) {
  const updatePackageName = (index: number, tenGoiThau: string) => {
    onChange({
      ...value,
      TenDuAn: projectName,
      packages: value.packages.map((item, itemIndex) =>
        itemIndex === index ? { ...item, tenGoiThau } : item,
      ),
    });
  };

  const removePackage = (index: number) => {
    const packages = value.packages.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    onChange({
      ...value,
      TenDuAn: projectName,
      packages: packages.length ? packages : [emptyPackage(packageId())],
    });
  };

  return (
    <WorkflowFormSection
      title="0. Mẫu phiếu trình ký phê duyệt dự toán"
    >
      <div className="space-y-5">
        <Field label="Tên dự án (liên kết từ Quản lý dự án)">
          <input
            value={projectName}
            readOnly
            className={`${INPUT_CLASS} cursor-not-allowed bg-slate-100 font-medium text-slate-700`}
          />
        </Field>

        <Field label="Ngày ký Phiếu trình">
          <input
            type="date"
            value={value.NgayKy}
            onChange={(event) =>
              onChange({
                ...value,
                TenDuAn: projectName,
                NgayKy: event.target.value,
              })
            }
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Người soạn văn bản">
            <input
              value={value.NguoiSoanVanBan}
              onChange={(event) =>
                onChange({
                  ...value,
                  TenDuAn: projectName,
                  NguoiSoanVanBan: event.target.value,
                })
              }
              placeholder="Nhập họ tên người soạn"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Thủ trưởng đơn vị">
            <input
              value={value.ThuTruongDonVi}
              onChange={(event) =>
                onChange({
                  ...value,
                  TenDuAn: projectName,
                  ThuTruongDonVi: event.target.value,
                })
              }
              placeholder="Nhập họ tên thủ trưởng đơn vị"
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Danh sách gói thầu
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  TenDuAn: projectName,
                  packages: [
                    ...value.packages,
                    emptyPackage(packageId()),
                  ],
                })
              }
              className="rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              + Thêm gói thầu
            </button>
          </div>

          <div className="space-y-3">
            {value.packages.map((item, index) => (
              <div
                key={item.id}
                className="flex items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <Field label={`Tên gói thầu ${index + 1}`}>
                    <input
                      value={item.tenGoiThau}
                      onChange={(event) =>
                        updatePackageName(index, event.target.value)
                      }
                      placeholder={`Ví dụ: Gói thầu ${index + 1}`}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => removePackage(index)}
                  className="mb-0.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkflowFormSection>
  );
}

function DuToanForm({
  value,
  onChange,
  file,
  onFileChange,
  sourceAttachmentName,
  packagesReadOnly,
  projectName,
}: {
  value: DuToanFormData;
  onChange: (value: DuToanFormData) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  sourceAttachmentName?: string;
  packagesReadOnly: boolean;
  projectName: string;
}) {
  const setField = (
    key: Exclude<
      keyof DuToanFormData,
      'canCu' | 'canCuMoDau' | 'packages'
    >,
    fieldValue: string,
  ) => onChange({ ...value, [key]: fieldValue });

  const updatePackage = (
    index: number,
    patch: Partial<ProcurementPackage>,
  ) => {
    if (packagesReadOnly) return;
    onChange({
      ...value,
      packages: value.packages.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  };

  const removePackage = (index: number) => {
    if (packagesReadOnly) return;
    const next = value.packages.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    onChange({
      ...value,
      packages: next.length ? next : [emptyPackage(packageId())],
    });
  };

  return (
    <>
      <WorkflowFormSection
        title="Thông tin chung của văn bản"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Số văn bản">
            <input
              value={value.SoVanBan}
              onChange={(event) =>
                setField('SoVanBan', event.target.value)
              }
              placeholder="Số tờ trình / số quyết định"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Ngày ban hành">
            <input
              type="date"
              value={value.NgayBanHanh}
              onChange={(event) =>
                setField('NgayBanHanh', event.target.value)
              }
              className={INPUT_CLASS}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Tên dự án (liên kết từ Quản lý dự án)">
              <input
                value={projectName || value.TenDuAn}
                readOnly
                className={`${INPUT_CLASS} cursor-not-allowed bg-slate-100 font-medium text-slate-700`}
              />
            </Field>
          </div>
        </div>
      </WorkflowFormSection>

      <WorkflowFormSection
        title="Phần mở đầu Tờ trình"
      >
        <div className="space-y-4">
          <LegalBasisField
            value={value.canCuMoDau as LegalBasisSelection[]}
            onChange={(canCuMoDau) =>
              onChange({ ...value, canCuMoDau })
            }
            label="Căn cứ mở đầu ({{CanCu}})"
            description="Chọn một văn bản từ Thư viện văn bản. Câu viện dẫn chuẩn sẽ được đưa vào vị trí {{CanCu}} ở phần mở đầu Tờ trình."
            allowManual={false}
            maxItems={1}
          />
          <Field label="Nội dung thuyết minh/đề nghị sau căn cứ mở đầu">
            <textarea
              rows={4}
              value={value.ThuyetMinh}
              onChange={(event) =>
                setField('ThuyetMinh', event.target.value)
              }
              placeholder="Nội dung này nằm ngay sau căn cứ mở đầu và trước Mục I"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </WorkflowFormSection>

      <WorkflowFormSection title="I. Căn cứ xây dựng dự toán">
        <LegalBasisField
          value={value.canCu as LegalBasisSelection[]}
          onChange={(canCu) => onChange({ ...value, canCu })}
          label="Danh sách căn cứ pháp lý tại Mục I"
          description="Chọn các văn bản từ Thư viện văn bản theo đúng thứ tự cần hiển thị tại Mục I."
          allowManual={false}
        />
      </WorkflowFormSection>

      <WorkflowFormSection
        title="II. Nội dung xây dựng dự toán"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Các gói thầu
            </h3>
          </div>
          {!packagesReadOnly && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  packages: [
                    ...value.packages,
                    emptyPackage(packageId()),
                  ],
                })
              }
              className="rounded-lg border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              + Thêm gói thầu
            </button>
          )}
        </div>
        <div className="space-y-3">
          {value.packages.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  Gói thầu {index + 1}
                </span>
                {!packagesReadOnly && (
                  <button
                    type="button"
                    onClick={() => removePackage(index)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Tên gói thầu">
                  <input
                    value={item.tenGoiThau}
                    disabled={packagesReadOnly}
                    onChange={(event) =>
                      updatePackage(index, {
                        tenGoiThau: event.target.value,
                      })
                    }
                    className={`${INPUT_CLASS} disabled:bg-gray-100 disabled:text-gray-600`}
                  />
                </Field>
                <Field label="Giá dự toán gói thầu">
                  <input
                    inputMode="decimal"
                    value={item.giaDuToanGoiThau}
                    disabled={packagesReadOnly}
                    onChange={(event) =>
                      updatePackage(index, {
                        giaDuToanGoiThau: formatMoney(event.target.value),
                      })
                    }
                    placeholder="Ví dụ: 1.500.000.000"
                    className={`${INPUT_CLASS} disabled:bg-gray-100 disabled:text-gray-600`}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Công việc / nội dung">
                    <textarea
                      rows={2}
                      value={item.congViec}
                      disabled={packagesReadOnly}
                      onChange={(event) =>
                        updatePackage(index, {
                          congViec: event.target.value,
                        })
                      }
                      className={`${INPUT_CLASS} disabled:bg-gray-100 disabled:text-gray-600`}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Ghi chú">
                    <input
                      value={item.ghiChu}
                      disabled={packagesReadOnly}
                      onChange={(event) =>
                        updatePackage(index, {
                          ghiChu: event.target.value,
                        })
                      }
                      className={`${INPUT_CLASS} disabled:bg-gray-100 disabled:text-gray-600`}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </WorkflowFormSection>

      <WorkflowFormSection
        title="III. Ý kiến đề xuất của Văn phòng"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Mục tiêu, quy mô">
              <textarea
                rows={3}
                value={value.MucTieuQuyMo}
                onChange={(event) =>
                  setField('MucTieuQuyMo', event.target.value)
                }
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <Field label="Nguồn vốn">
            <input
              value={value.NguonVon}
              onChange={(event) =>
                setField('NguonVon', event.target.value)
              }
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Năm thực hiện">
            <input
              value={value.NamThucHien}
              onChange={(event) =>
                setField('NamThucHien', event.target.value)
              }
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </WorkflowFormSection>

      <WorkflowFormSection
        title="Phụ lục khái toán"
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Field label="Phụ lục khái toán đính kèm (DOCX)">
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              const selected = event.target.files?.[0] || null;
              if (
                selected &&
                !selected.name.toLocaleLowerCase().endsWith('.docx')
              ) {
                toast.error('Phụ lục khái toán phải là file DOCX');
                event.target.value = '';
                onFileChange(null);
                return;
              }
              onFileChange(selected);
            }}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-800"
          />
        </Field>
        {sourceAttachmentName && !file && (
          <p className="mt-2 text-xs text-amber-800">
            Đang kế thừa phụ lục từ Tờ trình: {sourceAttachmentName}. Chọn
            file mới nếu muốn thay thế trong Quyết định.
          </p>
        )}
        {file && (
          <p className="mt-2 text-xs text-amber-800">
            Sẽ tải lên sau khi tạo văn bản: {file.name}
          </p>
        )}
        </div>
      </WorkflowFormSection>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function ThietBiDuToanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      }
    >
      <ThietBiDuToanPageInner />
    </Suspense>
  );
}
