'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronRight, Landmark, Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import NotificationPanel from '@/components/NotificationPanel';
import { ProjectChat } from '@/components/ProjectChat';
import { User } from '@/lib/types';

const routeLabels: Record<string, string> = {
  dashboard: 'Tổng quan',
  'du-an': 'Quản lý dự án',
  'mua-sam': 'Mua sắm',
  sach: 'Thầu sách',
  'thiet-bi': 'Thầu thiết bị',
  'dat-sach': 'Đặt sách',
  'du-toan': 'Phê duyệt dự toán',
  khlcnt: 'Phê duyệt KHLCNT',
  'lua-chon-nha-thau': 'Lựa chọn nhà thầu',
  'thanh-toan': 'Thanh toán',
  'hop-dong': 'Quản lý hợp đồng',
  'nha-thau': 'Không gian nhà thầu',
  'tham-du-dau-thau': 'Tham dự đấu thầu',
  'kho-van-ban': 'Kho văn bản',
  'phe-duyet': 'Phê duyệt',
  'quan-ly': 'Quản lý hệ thống',
  admin: 'Quản trị',
  'nguoi-dung': 'Người dùng',
  'phan-quyen': 'Phân quyền',
  'thu-vien-van-ban': 'Thư viện văn bản',
  approvals: 'Phê duyệt',
  documents: 'Văn bản',
  step: 'Bước nghiệp vụ',
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => {
    const isDynamicId = !routeLabels[segment] && index > 0;
    return {
      key: `${segment}-${index}`,
      label: routeLabels[segment] || (isDynamicId ? 'Chi tiết hồ sơ' : segment),
    };
  });
}

function hasPermission(user: User, permission: string) {
  return user.role === 'ADMIN' || !!user.permissions?.includes(permission);
}

function firstAllowedRoute(user: User) {
  if (
    hasPermission(user, 'approval:review') ||
    hasPermission(user, 'approval:final') ||
    user.canApprove
  ) {
    return '/dashboard/phe-duyet';
  }
  if (hasPermission(user, 'feature:projects') || user.isInvestor) {
    return '/dashboard/du-an';
  }
  if (hasPermission(user, 'feature:book-procurement')) {
    return '/dashboard/mua-sam/sach/dat-sach';
  }
  if (hasPermission(user, 'feature:equipment-procurement')) {
    return '/dashboard/mua-sam/thiet-bi/du-toan';
  }
  if (user.isContractor) return '/dashboard/nha-thau/tham-du-dau-thau';
  return '/login';
}

function canOpenRoute(user: User, pathname: string) {
  if (user.role === 'ADMIN') return true;
  const canApprove =
    !!user.canApprove ||
    hasPermission(user, 'approval:review') ||
    hasPermission(user, 'approval:final');
  const canProjects =
    hasPermission(user, 'feature:projects') ||
    ((user.permissions?.length || 0) === 0 && !!user.isInvestor);
  const canBook =
    hasPermission(user, 'feature:book-procurement') ||
    ((user.permissions?.length || 0) === 0 && !!user.isInvestor);
  const canEquipment =
    hasPermission(user, 'feature:equipment-procurement') ||
    ((user.permissions?.length || 0) === 0 && !!user.isInvestor);

  if (pathname.startsWith('/dashboard/quan-ly') || pathname.startsWith('/dashboard/admin')) return false;
  if (
    pathname.startsWith('/dashboard/phe-duyet') ||
    pathname.startsWith('/dashboard/approvals')
  ) {
    // Người tạo không cần quyền duyệt nhưng vẫn phải vào được hồ sơ đang bị
    // trả lại để sửa, gửi lại hoặc trả tiếp về người gửi trước đó.
    return canApprove || canProjects || canBook || canEquipment;
  }
  if (pathname.startsWith('/dashboard/du-an')) return canProjects;
  if (pathname.startsWith('/dashboard/mua-sam/sach')) return canBook;
  if (pathname.startsWith('/dashboard/mua-sam/thiet-bi')) return canEquipment;
  if (
    pathname.startsWith('/dashboard/mua-sam/dat-sach') ||
    pathname.startsWith('/dashboard/mua-sam/du-toan') ||
    pathname.startsWith('/dashboard/mua-sam/khlcnt') ||
    pathname.startsWith('/dashboard/lua-chon-nha-thau') ||
    pathname.startsWith('/dashboard/thanh-toan')
  ) {
    return canBook || canEquipment;
  }
  if (pathname.startsWith('/dashboard/nha-thau') || pathname.startsWith('/dashboard/hop-dong')) {
    return !!user.isContractor;
  }
  if (pathname === '/dashboard') {
    return canProjects || canBook || canEquipment || !!user.isContractor;
  }
  return canProjects || canBook || canEquipment;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, hydrate, setUser, logout } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const breadcrumbs = useMemo(() => getBreadcrumbs(pathname), [pathname]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (isLoading || !user) return;

    let cancelled = false;
    api
      .getProfile()
      .then((profile) => {
        if (!cancelled) {
          setUser(profile);
          setProfileReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
          router.replace('/login');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user?.id, logout, router, setUser]);

  useEffect(() => {
    if (!profileReady || !user) return;
    const target = firstAllowedRoute(user);
    if (pathname === '/dashboard' && target === '/dashboard/phe-duyet') {
      router.replace(target);
      return;
    }
    if (!canOpenRoute(user, pathname)) {
      router.replace(target);
    }
  }, [pathname, profileReady, router, user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading || (user && !profileReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8]" role="status" aria-label="Đang tải hệ thống">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-700" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F7F8]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-slate-950/30 lg:hidden"
          aria-label="Đóng menu điều hướng"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        onOpenNotifications={() => setNotifOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#E4E7EC] bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#D0D5DD] text-[#475467] hover:bg-[#F7F7F8] lg:hidden"
              aria-label="Mở menu điều hướng"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Đường dẫn trang" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <li key={item.key} className="flex min-w-0 items-center gap-1.5">
                      {index > 0 && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#98A2B3]" />}
                      <span
                        className={`truncate ${
                          isLast ? 'font-semibold text-[#344054]' : 'hidden text-[#667085] sm:inline'
                        }`}
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {item.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div className="hidden items-center gap-2 text-xs font-medium text-[#667085] md:flex">
            <Landmark className="h-4 w-4 text-primary-700" />
            <span>Môi trường nghiệp vụ nội bộ</span>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto bg-[#F7F7F8]">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
            {children}
          </div>
        </main>
      </div>

      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <ProjectChat />
    </div>
  );
}
