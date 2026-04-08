'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { DashboardStats } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị',
  INVESTOR: 'Nhân viên',
  HEAD_OF_DEPARTMENT: 'Trưởng phòng',
  DIRECTOR: 'Giám đốc',
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
  PENDING_HEAD: 'Chờ Trưởng phòng',
  PENDING_DIRECTOR: 'Chờ Giám đốc',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const actionLabels: Record<string, string> = {
  SUBMIT: 'Gửi duyệt',
  APPROVE: 'Phê duyệt',
  APPROVE_HEAD: 'TP duyệt',
  REJECT: 'Từ chối',
  RESUBMIT: 'Gửi lại',
  DELEGATE: 'Ủy quyền',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (err: any) { toast.error(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  const getCount = (type: string, status: string) => {
    const found = stats?.docStats?.find((s: any) => s.type === type && s.status === status);
    return found?._count?.id || 0;
  };

  const totalPending = (stats?.docStats || []).filter((s: any) =>
    s.status === 'PENDING_HEAD' || s.status === 'PENDING_DIRECTOR'
  ).reduce((sum: number, s: any) => sum + (s._count?.id || 0), 0);

  const totalApproved = (stats?.docStats || []).filter((s: any) =>
    s.status === 'APPROVED'
  ).reduce((sum: number, s: any) => sum + (s._count?.id || 0), 0);

  const totalRejected = (stats?.docStats || []).filter((s: any) =>
    s.status === 'REJECTED'
  ).reduce((sum: number, s: any) => sum + (s._count?.id || 0), 0);

  const totalDocs = (stats?.docStats || []).reduce((sum: number, s: any) => sum + (s._count?.id || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-500 mt-1">Xin chào, {user?.name} ({roleLabels[user?.role || '']})</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Tổng tài liệu</p>
          <p className="text-3xl font-bold text-gray-700 mt-1">{totalDocs}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Chờ duyệt</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{totalPending}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Đã phê duyệt</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{totalApproved}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Cần làm lại</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{totalRejected}</p>
        </div>
      </div>

      {/* Breakdown by type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dự toán</h3>
          <div className="space-y-2">
            {['TT_DUTOAN', 'QD_DUTOAN'].map(type => (
              <div key={type} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{typeLabels[type]}</span>
                <div className="flex gap-2">
                  <span className="text-blue-600">{getCount(type, 'PENDING_DIRECTOR')} chờ</span>
                  <span className="text-green-600">{getCount(type, 'APPROVED')} duyệt</span>
                  <span className="text-red-600">{getCount(type, 'REJECTED')} lại</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">KH LCNT</h3>
          <div className="space-y-2">
            {['TT_KHLCNT', 'BC_KHLCNT', 'QD_KHLCNT'].map(type => (
              <div key={type} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{typeLabels[type]}</span>
                <div className="flex gap-2">
                  <span className="text-yellow-600">{getCount(type, 'PENDING_HEAD')} TP</span>
                  <span className="text-blue-600">{getCount(type, 'PENDING_DIRECTOR')} GĐ</span>
                  <span className="text-green-600">{getCount(type, 'APPROVED')} ✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Hoạt động gần đây</h3>
        <div className="space-y-3">
          {(stats?.recentReviews || []).slice(0, 10).map((r: any) => (
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
          {(!stats?.recentReviews || stats.recentReviews.length === 0) && (
            <p className="text-sm text-gray-400">Chưa có hoạt động</p>
          )}
        </div>
      </div>
    </div>
  );
}
