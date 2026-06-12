'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Người dùng',
};

const typeLabels: Record<string, string> = {
  TT_DUTOAN: 'TT Dự toán',
  QD_DUTOAN: 'QĐ Dự toán',
  TT_KHLCNT: 'TT KHLCNT',
  BC_KHLCNT: 'BC KHLCNT',
  QD_KHLCNT: 'QĐ KHLCNT',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const actionLabels: Record<string, string> = {
  SUBMIT: 'Gửi duyệt',
  APPROVE: 'Phê duyệt',
  REJECT: 'Từ chối',
  RESUBMIT: 'Gửi lại',
  DELEGATE: 'Ủy quyền',
};

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
      } catch (err: any) { toast.error(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  const { total, inProgress, completed, cancelled } = projectStats || { total: 0, inProgress: 0, completed: 0, cancelled: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-500 mt-1">Xin chào, {user?.name} ({roleLabels[user?.role || '']})</p>
      </div>

      {/* Project Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Tổng dự án</p>
          <p className="text-3xl font-bold text-gray-700 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Đang thực hiện</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Hoàn thành</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{completed}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Đã hủy</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{cancelled}</p>
        </div>
      </div>

      {/* Quick access to projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Projects */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Dự án gần đây</h3>
            <Link href="/dashboard/du-an" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-3">
            {recentProjects.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    p.procurementType === 'THAU_SACH' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.tenDuAn}</p>
                    <p className="text-xs text-gray-400">
                      {p.procurementType === 'THAU_SACH' ? 'Thầu Sách' : 'Thầu Thiết Bị'}
                      {' · '}{p.creator?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    p.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                    p.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {p.status === 'IN_PROGRESS' ? 'Đang thực hiện' :
                     p.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
              </div>
            ))}
            {recentProjects.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Chưa có dự án nào</p>
                <Link href="/dashboard/du-an" className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block">
                  Tạo dự án đầu tiên
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick navigation */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Thao tác nhanh</h3>
          <div className="space-y-2">
            <Link href="/dashboard/du-an" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013.414 3.414l-6.92 6.918a4 4 0 01-1.242.84l-3.155 1.262a.5.5 0 01-.65-.65zM3.5 15.5h13a.5.5 0 000-.5h-13a.5.5 0 000 .5z" />
              </svg>
              <span className="text-sm font-medium">Quản lý Dự án</span>
            </Link>
            <Link href="/dashboard/mua-sam/thiet-bi/du-toan" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Thầu Thiết Bị</span>
            </Link>
            <Link href="/dashboard/mua-sam/sach/dat-sach" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              </svg>
              <span className="text-sm font-medium">Thầu Sách</span>
            </Link>
            <Link href="/dashboard/lua-chon-nha-thau" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5H3.75a.75.75 0 010-1.5H4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Lựa chọn Nhà thầu</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Hoạt động gần đây</h3>
        <div className="space-y-3">
          {(projectStats?.recentReviews || []).slice(0, 10).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  r.action.includes('APPROVE') ? 'bg-green-50 text-green-700' :
                  r.action === 'REJECT' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-700'
                }`}>
                  {actionLabels[r.action] || r.action}
                </span>
                <span className="text-sm font-medium">{r.user?.name}</span>
                <span className="text-sm text-gray-500">
                  {typeLabels[r.document?.type] || r.document?.type}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {format(new Date(r.createdAt), 'dd/MM HH:mm', { locale: vi })}
              </span>
            </div>
          ))}
          {(!projectStats?.recentReviews || projectStats.recentReviews.length === 0) && (
            <p className="text-sm text-gray-400">Chưa có hoạt động</p>
          )}
        </div>
      </div>
    </div>
  );
}
