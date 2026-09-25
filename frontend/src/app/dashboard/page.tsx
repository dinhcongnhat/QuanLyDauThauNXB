'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Ban,
  BookOpen,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gavel,
  History,
  Monitor,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Người dùng',
};

const typeLabels: Record<string, string> = {
  TT_DUTOAN: 'Tờ trình dự toán',
  QD_DUTOAN: 'Quyết định dự toán',
  TT_KHLCNT: 'Tờ trình KHLCNT',
  BC_KHLCNT: 'Báo cáo KHLCNT',
  QD_KHLCNT: 'Quyết định KHLCNT',
};

const actionLabels: Record<string, string> = {
  SUBMIT: 'Gửi duyệt',
  APPROVE: 'Phê duyệt',
  REJECT: 'Từ chối',
  RESUBMIT: 'Gửi lại',
  DELEGATE: 'Ủy quyền',
};

function projectStatus(status: string) {
  if (status === 'IN_PROGRESS') return { label: 'Đang thực hiện', className: 'status-processing' };
  if (status === 'COMPLETED') return { label: 'Hoàn thành', className: 'status-approved' };
  if (status === 'CANCELLED') return { label: 'Đã hủy', className: 'status-neutral' };
  return { label: status || 'Chưa xác định', className: 'status-neutral' };
}

function reviewStatus(action: string) {
  if (action.includes('APPROVE')) return 'status-approved';
  if (action === 'REJECT') return 'status-rejected';
  if (action === 'SUBMIT' || action === 'RESUBMIT') return 'status-pending';
  return 'status-neutral';
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [projectStats, setProjectStats] = useState<any>(null);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsData, projectsData] = await Promise.all([
          api.getProjectStats(),
          api.getProjects(),
        ]);
        setProjectStats(statsData);
        const projectsList = projectsData.projects || projectsData || [];
        setRecentProjects(Array.isArray(projectsList) ? projectsList.slice(0, 5) : []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Đang tải dữ liệu tổng quan">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-700" />
      </div>
    );
  }

  const { total, inProgress, completed, cancelled } = projectStats || {
    total: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  const statistics = [
    { label: 'Tổng dự án', value: total, icon: FolderKanban },
    { label: 'Đang thực hiện', value: inProgress, icon: Clock3 },
    { label: 'Hoàn thành', value: completed, icon: CheckCircle2 },
    { label: 'Đã hủy', value: cancelled, icon: Ban },
  ];

  const quickActions = [
    { href: '/dashboard/du-an', label: 'Quản lý dự án', description: 'Danh sách và tiến độ dự án', icon: FolderKanban },
    { href: '/dashboard/mua-sam/thiet-bi/du-toan', label: 'Thầu thiết bị', description: 'Hồ sơ dự toán thiết bị', icon: Monitor },
    { href: '/dashboard/mua-sam/sach/dat-sach', label: 'Thầu sách', description: 'Đặt sách và lập dự toán', icon: BookOpen },
    { href: '/dashboard/lua-chon-nha-thau', label: 'Lựa chọn nhà thầu', description: 'Theo dõi quy trình LCNT', icon: Gavel },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-3 border-b border-[#E4E7EC] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary-700">Tổng quan nghiệp vụ</p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight text-[#1F2328] sm:text-[30px]">Bảng điều hành</h1>
          <p className="mt-2 text-sm text-[#667085]">
            Xin chào, <span className="font-medium text-[#344054]">{user?.name}</span>
            {user?.role ? ` · ${roleLabels[user.role] || user.role}` : ''}
          </p>
        </div>
        <p className="text-xs text-[#667085]">Dữ liệu được tổng hợp theo quyền truy cập của tài khoản</p>
      </section>

      <section aria-label="Thống kê dự án" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-lg border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#667085]">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-primary-800">{value}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-800">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#E4E7EC] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#1F2328]">Dự án gần đây</h2>
              <p className="mt-0.5 text-xs text-[#667085]">Các dự án được cập nhật gần nhất</p>
            </div>
            <Link href="/dashboard/du-an" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-primary-900">
              Xem tất cả
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <div className="divide-y divide-[#E4E7EC]">
              {recentProjects.map((project: any) => {
                const status = projectStatus(project.status);
                const ProjectIcon = project.procurementType === 'THAU_SACH' ? BookOpen : Monitor;
                return (
                  <div key={project.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-primary-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4E7EC] bg-[#FAFAFA] text-[#475467]">
                        <ProjectIcon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-[#1F2328]">{project.tenDuAn}</p>
                        <p className="mt-1 text-xs text-[#667085]">
                          {project.procurementType === 'THAU_SACH' ? 'Thầu sách' : 'Thầu thiết bị'}
                          {project.creator?.name ? ` · ${project.creator.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 pl-12 sm:block sm:pl-0 sm:text-right">
                      <span className={status.className}>{status.label}</span>
                      <p className="mt-0 text-xs tabular-nums text-[#667085] sm:mt-1.5">
                        {format(new Date(project.createdAt), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <FolderKanban className="mx-auto h-9 w-9 text-[#98A2B3]" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-medium text-[#475467]">Chưa có dự án nào</p>
              <Link href="/dashboard/du-an" className="mt-2 inline-flex text-sm font-semibold text-primary-800 hover:text-primary-900">
                Mở trang quản lý dự án
              </Link>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <h2 className="text-base font-semibold text-[#1F2328]">Truy cập nhanh</h2>
          <p className="mt-0.5 text-xs text-[#667085]">Các phân hệ sử dụng thường xuyên</p>
          <div className="mt-4 space-y-2">
            {quickActions.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-md border border-[#E4E7EC] bg-[#FAFAFA] px-3 py-3 text-[#344054] hover:border-[#D8AEB1] hover:bg-primary-50 hover:text-primary-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#667085] ring-1 ring-inset ring-[#E4E7EC] group-hover:text-primary-800">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block truncate text-xs font-normal text-[#667085]">{description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#98A2B3] group-hover:text-primary-700" />
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div className="flex items-center gap-3 border-b border-[#E4E7EC] px-5 py-4">
          <History className="h-5 w-5 text-primary-700" />
          <div>
            <h2 className="text-base font-semibold text-[#1F2328]">Hoạt động gần đây</h2>
            <p className="mt-0.5 text-xs text-[#667085]">Lịch sử xử lý và phê duyệt mới nhất</p>
          </div>
        </div>

        {(projectStats?.recentReviews || []).length > 0 ? (
          <div className="divide-y divide-[#E4E7EC]">
            {(projectStats.recentReviews || []).slice(0, 10).map((review: any) => (
              <div key={review.id} className="flex flex-col gap-2 px-5 py-3.5 hover:bg-primary-50 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={reviewStatus(review.action)}>{actionLabels[review.action] || review.action}</span>
                  <p className="min-w-0 truncate text-sm text-[#475467]">
                    <span className="font-semibold text-[#1F2328]">{review.user?.name}</span>
                    <span className="mx-1.5 text-[#98A2B3]">·</span>
                    {typeLabels[review.document?.type] || review.document?.type}
                  </p>
                </div>
                <time className="shrink-0 pl-0 text-xs tabular-nums text-[#667085] sm:pl-4">
                  {format(new Date(review.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-[#667085]">Chưa có hoạt động được ghi nhận.</div>
        )}
      </section>
    </div>
  );
}
