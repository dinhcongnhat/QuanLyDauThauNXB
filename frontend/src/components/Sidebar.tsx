'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Role } from '@/lib/types';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationBell from './NotificationBell';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Người dùng',
};

/* ── SVG Icons ── */
const Icon = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  project: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18m-18 0v-7.5A2.25 2.25 0 0 1 4.5 4.5h3.182a2.25 2.25 0 0 1 1.737.822L11.4 7.758a2.25 2.25 0 0 0 1.737.822H19.5A2.25 2.25 0 0 1 21.75 11v2.5m-18 0v4.5A2.25 2.25 0 0 0 6 20.25h12a2.25 2.25 0 0 0 2.25-2.25v-4.5" />
    </svg>
  ),
  device: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25M12 3h.008v.008H12V3Zm3.75 0h.008v.008H15.75V3Zm-7.5 0h.008v.008H8.25V3Z" />
    </svg>
  ),
  book: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
    </svg>
  ),
  clipboard: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0-3.741-.479 3 3 0 0 0-4.518 0 9.094 9.094 0 0 0-3.741.479M15 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM19.5 12a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM6.75 12a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0M19.5 17.25c-.015-.03-.032-.058-.05-.087a8.977 8.977 0 0 0-3.412-2.72m3.462 2.807V19.5A1.5 1.5 0 0 1 18 21h-2.25M6.75 14.443a8.977 8.977 0 0 0-3.412 2.72 1.499 1.499 0 0 0-.05.087M1.5 19.5v-2.25A1.5 1.5 0 0 1 3 16h2.25" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  docApproval: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
    </svg>
  ),
  docText: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  building: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 0-1.5.546M12 7.5l3-1.091M17.25 21v-4.5m0 0v-4.5m0 4.5h3m-3-4.5h3m-6 9h3" />
    </svg>
  ),
  wallet: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75-3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  ),
  stamp: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.75 3.75 0 0 1 21 12Z" />
    </svg>
  ),
  contract: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  bidding: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l-7.5 7.5H6.75v-2.25l7.5-7.5Zm0 0 2.25-2.25M14.25 9.75 12 7.5M16.5 12l2.25-2.25M12 7.5l-3-3M6.75 19.5H3" />
    </svg>
  ),
  gear: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
  switchRole: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  cart: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  ),
  library: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-16.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-16.25v14.25" />
    </svg>
  ),
};;

interface SidebarProps {
  onOpenNotifications: () => void;
}

export function Sidebar({ onOpenNotifications }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, activeView, setActiveView } = useAuthStore();
  const [quanLyOpen, setQuanLyOpen] = useState(
    pathname.startsWith('/dashboard/quan-ly') || pathname.startsWith('/dashboard/admin'),
  );
  const [muaSamOpen, setMuaSamOpen] = useState(
    pathname.startsWith('/dashboard/mua-sam/sach'),
  );
  const [thietBiOpen, setThietBiOpen] = useState(
    pathname.startsWith('/dashboard/mua-sam/thiet-bi'),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    const canCDT = !!user.isInvestor || !!user.isContractor;
    const canNT = !!user.isContractor;
    if (activeView === 'chu-dau-tu' && !canCDT && canNT) {
      setActiveView('nha-thau');
    } else if (activeView === 'nha-thau' && !canNT && canCDT) {
      setActiveView('chu-dau-tu');
    }
  }, [user, activeView, setActiveView]);

  if (!user) return null;

  const handleChangePw = async () => {
    if (!pwForm.old || !pwForm.new) { toast.error('Vui lòng điền đầy đủ'); return; }
    if (pwForm.new !== pwForm.confirm) { toast.error('Mật khẩu mới không khớp'); return; }
    if (pwForm.new.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    setPwLoading(true);
    try {
      await api.changePassword(pwForm.old, pwForm.new);
      toast.success('Đổi mật khẩu thành công');
      setShowChangePw(false);
      setPwForm({ old: '', new: '', confirm: '' });
    } catch (err: any) { toast.error(err.message); }
    finally { setPwLoading(false); }
  };

  const handleSwitchRole = () => {
    if (activeView === 'chu-dau-tu') {
      setActiveView('nha-thau');
      router.push('/dashboard/nha-thau/tham-du-dau-thau');
    } else {
      setActiveView('chu-dau-tu');
      router.push('/dashboard');
    }
  };

  const isAdmin = user.role === 'ADMIN';
  const canCDT = !!user.isInvestor || !!user.isContractor;
  const canNT = !!user.isContractor;
  const canSwitch = !isAdmin && canCDT && canNT;
  const isCDT = !isAdmin && canCDT && activeView === 'chu-dau-tu';
  const isNT = !isAdmin && canNT && (activeView === 'nha-thau' || (!canCDT && canNT));

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const linkCls = (href: string) =>
    `flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14.5px] transition-all duration-200 ${
      isActive(href)
        ? 'bg-red-600 text-white font-semibold shadow-md shadow-red-500/20'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
    }`;

  const roleDisplay = activeView === 'chu-dau-tu' ? 'Chủ đầu tư' : 'Nhà thầu';

  const dropdownCls = (isOpen: boolean) =>
    `w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14.5px] transition-colors duration-200 ${
      isOpen
        ? 'bg-slate-50 text-slate-900 font-semibold'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
    }`;

  const subLinkCls = (href: string) =>
    `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13.5px] transition-all duration-200 ${
      isActive(href)
        ? 'bg-red-50 text-red-700 font-semibold border-l-2 border-red-600 pl-3.5'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
    }`;

  return (
    <aside className="w-68 bg-white border-r border-slate-100 h-screen sticky top-0 flex flex-col shrink-0 shadow-sm">
      {/* ── Header / Logo ── */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3.5">
          <Image src="/logo.png" alt="Logo" width={48} height={48} className="rounded-xl shrink-0 shadow-sm" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 leading-tight tracking-tight uppercase">Hệ thống QLĐT</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Quản lý Đấu thầu NXB</p>
          </div>
        </div>
      </div>

      {/* ── Role indicator ── */}
      {!isAdmin && (isCDT || isNT) && (
        <div className="mx-4 mt-4 mb-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-100/60 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vai trò hiện tại</p>
          <p className="text-sm font-extrabold text-red-800 mt-0.5">{roleDisplay}</p>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Tổng quan */}
        <Link href="/dashboard" className={linkCls('/dashboard')}>
          {Icon.dashboard}<span>Tổng quan</span>
        </Link>

        {/* Phê duyệt */}
        <Link href="/dashboard/phe-duyet" className={linkCls('/dashboard/phe-duyet')}>
          {Icon.stamp}<span>Phê duyệt</span>
        </Link>

        {/* ===== ADMIN NAV ===== */}
        {isAdmin && (
          <>
            {/* Quản lý hệ thống */}
            <div>
              <button
                onClick={() => setQuanLyOpen(!quanLyOpen)}
                className={dropdownCls(quanLyOpen)}
              >
                <span className="flex items-center gap-3">
                  {Icon.gear}<span>Quản lý hệ thống</span>
                </span>
                <span className={`text-[10px] transition-transform ${quanLyOpen ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {quanLyOpen && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                  <Link href="/dashboard/admin/thu-vien-van-ban" className={linkCls('/dashboard/admin/thu-vien-van-ban')}>
                    {Icon.library}<span>Thư viện Văn Bản</span>
                  </Link>
                  <Link href="/dashboard/quan-ly/nguoi-dung" className={linkCls('/dashboard/quan-ly/nguoi-dung')}>
                    {Icon.users}<span>Quản lý người dùng</span>
                  </Link>
                  <Link href="/dashboard/quan-ly/phan-quyen" className={linkCls('/dashboard/quan-ly/phan-quyen')}>
                    {Icon.shield}<span>Quản lý phân quyền</span>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== CHỦ ĐẦU TƯ NAV ===== */}
        {isCDT && (
          <>
            {/* Quản lý Dự án */}
            <Link href="/dashboard/du-an" className={linkCls('/dashboard/du-an')}>
              {Icon.project}<span>Quản lý Dự án</span>
            </Link>

            {/* Thầu Sách - expandable */}
            <div>
              <button
                onClick={() => setQuanLyOpen(prev => {
                  const next = !prev;
                  if (next) { setMuaSamOpen(false); setThietBiOpen(false); }
                  return next;
                })}
                className={dropdownCls(quanLyOpen)}
              >
                <span className="flex items-center gap-3">
                  {Icon.book}<span>Thầu Sách</span>
                </span>
                <span className={`text-[10px] transition-transform ${quanLyOpen ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {quanLyOpen && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-green-100 pl-3">
                  <Link href="/dashboard/mua-sam/sach/dat-sach" className={subLinkCls('/dashboard/mua-sam/sach/dat-sach')}>
                    {Icon.cart}<span>Đặt sách</span>
                  </Link>
                  <Link href="/dashboard/mua-sam/sach/du-toan" className={subLinkCls('/dashboard/mua-sam/sach/du-toan')}>
                    {Icon.docText}<span>Phê duyệt Dự toán</span>
                  </Link>
                  <Link href="/dashboard/mua-sam/sach/khlcnt" className={subLinkCls('/dashboard/mua-sam/sach/khlcnt')}>
                    {Icon.clipboard}<span>Kế hoạch LCNT</span>
                  </Link>
                  <Link href="/dashboard/lua-chon-nha-thau" className={subLinkCls('/dashboard/lua-chon-nha-thau')}>
                    {Icon.building}<span>Lựa chọn Nhà thầu</span>
                  </Link>
                  <Link href="/dashboard/thanh-toan" className={subLinkCls('/dashboard/thanh-toan')}>
                    {Icon.wallet}<span>Thanh toán</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Thầu Thiết Bị - expandable */}
            <div>
              <button
                onClick={() => setThietBiOpen(prev => {
                  const next = !prev;
                  if (next) { setQuanLyOpen(false); setMuaSamOpen(false); }
                  return next;
                })}
                className={dropdownCls(thietBiOpen)}
              >
                <span className="flex items-center gap-3">
                  {Icon.device}<span>Thầu Thiết Bị</span>
                </span>
                <span className={`text-[10px] transition-transform ${thietBiOpen ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {thietBiOpen && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-blue-100 pl-3">
                  <Link href="/dashboard/mua-sam/thiet-bi/du-toan" className={subLinkCls('/dashboard/mua-sam/thiet-bi/du-toan')}>
                    {Icon.docText}<span>Phê duyệt Dự toán</span>
                  </Link>
                  <Link href="/dashboard/mua-sam/thiet-bi/khlcnt" className={subLinkCls('/dashboard/mua-sam/thiet-bi/khlcnt')}>
                    {Icon.clipboard}<span>Kế hoạch LCNT</span>
                  </Link>
                  <Link href="/dashboard/lua-chon-nha-thau" className={subLinkCls('/dashboard/lua-chon-nha-thau')}>
                    {Icon.building}<span>Lựa chọn Nhà thầu</span>
                  </Link>
                  <Link href="/dashboard/thanh-toan" className={subLinkCls('/dashboard/thanh-toan')}>
                    {Icon.wallet}<span>Thanh toán</span>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== NHÀ THẦU NAV ===== */}
        {isNT && (
          <>
            <Link href="/dashboard/nha-thau/tham-du-dau-thau" className={linkCls('/dashboard/nha-thau/tham-du-dau-thau')}>
              {Icon.bidding}<span>Tham dự đấu thầu</span>
            </Link>
            <Link href="/dashboard/hop-dong" className={linkCls('/dashboard/hop-dong')}>
              {Icon.contract}<span>Quản lý Hợp đồng</span>
            </Link>
          </>
        )}
      </nav>

      {/* ── Bottom: User + Role Switch + Settings ── */}
      <div className="border-t border-gray-200">
        {canSwitch && (
          <button
            onClick={handleSwitchRole}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors group"
          >
            <span className="text-gray-400 group-hover:text-orange-600 transition-colors">{Icon.switchRole}</span>
            <span>Đổi sang <strong>{activeView === 'chu-dau-tu' ? 'Nhà thầu' : 'Chủ đầu tư'}</strong></span>
          </button>
        )}

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm shrink-0">
            {user.name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500">{roleLabels[user.role]}</p>
          </div>
          <NotificationBell onOpenNotifications={onOpenNotifications} />
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cài đặt"
          >
            {Icon.gear}
          </button>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-100"
            >
              <div className="px-4 py-2 space-y-1">
                <button
                  onClick={() => { setShowChangePw(true); setPwForm({ old: '', new: '', confirm: '' }); setShowSettings(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                  </svg>
                  Đổi mật khẩu
                </button>
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                  </svg>
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePw && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowChangePw(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Đổi mật khẩu</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                  <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    value={pwForm.old} onChange={e => setPwForm({ ...pwForm, old: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                  <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Tối thiểu 6 ký tự" value={pwForm.new} onChange={e => setPwForm({ ...pwForm, new: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                  <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 mt-5 justify-end">
                <button onClick={() => setShowChangePw(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Hủy</button>
                <button onClick={handleChangePw} disabled={pwLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50">
                  {pwLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
