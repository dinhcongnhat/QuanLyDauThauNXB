'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Document as Doc } from '@/lib/types';

const PROJ_TYPE = 'THAU_THIET_BI';

function firstValue(data: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return '';
}

function getPackageNames(data: Record<string, any>): string {
  const derived = firstValue(data, 'TenCacGoiThau', 'tenCacGoiThau');
  if (derived) return derived;

  const raw =
    data?.packages ??
    data?.goiThau ??
    data?.GoiThau ??
    data?.cacGoiThau ??
    data?.CacGoiThau;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => firstValue(item || {}, 'tenGoiThau', 'TenGoiThau'))
      .map((name) => name.trim())
      .filter(Boolean)
      .join(', ');
  }
  return firstValue(data, 'tenGoiThau', 'TenGoiThau');
}

function formatMoney(value: unknown): string {
  const digits = String(value ?? '').replace(/[^\d-]/g, '');
  if (!digits) return '—';
  const parsed = Number(digits);
  return Number.isFinite(parsed)
    ? `${parsed.toLocaleString('vi-VN')} đồng`
    : String(value);
}

function ThietBiKHLcntPageInner() {
  const searchParams = useSearchParams();
  const [approvedDuToan, setApprovedDuToan] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(
    searchParams.get('project') || '',
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [documentResponse, projectResponse] = await Promise.all([
        api.getDocumentsByType(
          ['QD_DUTOAN'],
          selectedProject || undefined,
          1,
          100,
          'THAU_THIET_BI',
        ),
        api.getProjects(),
      ]);
      const documents = Array.isArray(documentResponse)
        ? documentResponse
        : (documentResponse as any)?.documents || [];
      setApprovedDuToan(
        documents.filter(
          (document: Doc) => document.status === 'APPROVED',
        ),
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

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    if (!query) return approvedDuToan;

    return approvedDuToan.filter((document) => {
      const data = document.data || {};
      return [
        firstValue(
          data,
          'SoVanBan',
          'soVanBan',
          'SoQuyetDinh',
          'soQuyetDinh',
        ),
        firstValue(data, 'TenDuAn', 'tenDuAn'),
        getPackageNames(data),
        document.creator?.name,
      ].some((value) =>
        String(value || '')
          .toLocaleLowerCase('vi')
          .includes(query),
      );
    });
  }, [approvedDuToan, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Phê duyệt KHLCNT
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Thầu Thiết Bị — chọn Quyết định dự toán đã duyệt để kế thừa
          toàn bộ gói thầu và căn cứ pháp lý.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <label className="mb-2 block text-sm font-medium text-blue-900">
          Dự án Thầu Thiết Bị
        </label>
        <select
          value={selectedProject}
          onChange={(event) => setSelectedProject(event.target.value)}
          className="w-full max-w-xl rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">— Tất cả dự án —</option>
          {projects.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.tenDuAn}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm số quyết định, dự án hoặc gói thầu..."
          className="w-full rounded-xl border bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-primary-200"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          ⌕
        </span>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-gray-400">
          Chưa có Quyết định dự toán thiết bị nào được phê duyệt.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((document) => {
            const data = document.data || {};
            const documentProjectId =
              document.projectId || selectedProject;
            return (
              <Link
                key={document.id}
                href={`/dashboard/mua-sam/khlcnt/${document.id}${
                  documentProjectId
                    ? `?project=${encodeURIComponent(documentProjectId)}`
                    : ''
                }`}
                className="block rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        Đã duyệt
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {firstValue(
                          data,
                          'SoVanBan',
                          'soVanBan',
                          'SoQuyetDinh',
                          'soQuyetDinh',
                        ) || 'Quyết định dự toán'}
                      </span>
                    </div>
                    <h2 className="mt-2 font-semibold text-gray-900">
                      {firstValue(data, 'TenDuAn', 'tenDuAn') ||
                        'Chưa có tên dự án'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Gói thầu: {getPackageNames(data) || '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Tổng dự toán:{' '}
                        {formatMoney(
                          data.TongGiaDuToanGoiThau ??
                            data.tongGiaDuToanGoiThau ??
                            data.DuToanBangSo ??
                            data.giaTriDuToanDuyet,
                        )}
                      </span>
                      <span>
                        Người tạo: {document.creator?.name || '—'}
                      </span>
                      <span>
                        {format(new Date(document.createdAt), 'dd/MM/yyyy', {
                          locale: vi,
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-primary-700">
                    Mở hồ sơ KHLCNT →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ThietBiKHLcntPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      }
    >
      <ThietBiKHLcntPageInner />
    </Suspense>
  );
}
