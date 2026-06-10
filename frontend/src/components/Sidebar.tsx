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
  INVESTOR: 'Nhân viên',
  HEAD_OF_DEPARTMENT: 'Trưởng phòng',
  DIRECTOR: 'Giám đốc',
};

/* ── SVG Icons ── */
const Icon = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7Z" />
    </svg>
  ),
  project: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M3 6a2 2 0 012-2H6a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  device: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" clipRule="evenodd" />
    </svg>
  ),
  book: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
    </svg>
  ),
  clipboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5V7A2.5 2.5 0 0011 4.5H8.128a2.252 2.252 0 011.884-1.488A2.25 2.25 0 0112.25 1h1.5a2.25 2.25 0 012.238 2.012ZM11.5 3.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.25h-3v-.25Z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M2 7a1 1 0 011-1h8a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7Zm2 3.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75Zm0 3.5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75Z" clipRule="evenodd" />
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.75Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  ),
  docApproval: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
    </svg>
  ),
  docText: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
    </svg>
  ),
  building: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 0 1 0-1.5h12.5a.75.75 0 0 1 0 1.5H16v13h.25a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1 0-1.5H4Zm3-11a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm.5 3.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Zm-.5 4.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm4.5-8.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM11 9.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm.5 3.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Z" clipRule="evenodd" />
    </svg>
  ),
  wallet: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 1 1-1h13.5A2.25 2.25 0 0 1 19 9.25v7.5A2.25 2.25 0 0 1 16.75 19H3.25A2.25 2.25 0 0 1 1 16.75v-7.5A2.25 2.25 0 0 1 3.25 7H7Zm3 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    </svg>
  ),
  stamp: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v.258a33.186 33.186 0 0 1 6.668.83.75.75 0 0 1-.336 1.461 31.28 31.28 0 0 0-1.103-.232l1.702 7.545a.75.75 0 0 1-.387.832A4.981 4.981 0 0 1 15 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 0 1-.387-.832l1.77-7.849a31.743 31.743 0 0 0-3.339-.254v11.505l5.25.024a.75.75 0 0 1-.006 1.5l-5.244-.024h-1.5l-5.244.024a.75.75 0 0 1-.006-1.5l5.25-.024V4.508a31.743 31.743 0 0 0-3.339.254l1.77 7.85a.75.75 0 0 1-.387.83A4.981 4.981 0 0 1 5 14a4.981 4.981 0 0 1-2.294-.556.75.75 0 0 1-.387-.832L4.02 5.067c-.374.07-.746.148-1.114.233a.75.75 0 1 1-.335-1.462 33.186 33.186 0 0 1 6.668-.83V2.75A.75.75 0 0 1 10 2ZM5 12.658l-1.29-5.709a29.857 29.857 0 0 0-1.71.59l1.29 5.714a3.48 3.48 0 0 0 1.71-.595Zm10 0 1.29-5.714a29.857 29.857 0 0 0-1.71-.59L13.29 12.064c.524.31 1.1.528 1.71.594Z" clipRule="evenodd" />
    </svg>
  ),
  contract: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5ZM10 8a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 10 8Z" clipRule="evenodd" />
    </svg>
  ),
  bidding: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10 9.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V10a.75.75 0 0 0-.75-.75H10ZM6 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H6ZM8 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H8ZM9.25 14a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H10a.75.75 0 0 1-.75-.75V14ZM12 11.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V12a.75.75 0 0 0-.75-.75H12ZM12 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H12Z" />
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
  ),
  gear: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  ),
  switchRole: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H4.397a.75.75 0 0 0-.75.75v3.834a.75.75 0 0 0 1.5 0v-2.02l.31.312a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm-10.624-2.85a5.5 5.5 0 0 1 9.201-2.465l.312.31H11.77a.75.75 0 0 0 0 1.5h3.835a.75.75 0 0 0 .75-.75V3.335a.75.75 0 0 0-1.5 0v2.02l-.31-.311A7 7 0 0 0 2.83 8.182a.75.75 0 0 0 1.449.39l.408.002Z" clipRule="evenodd" />
    </svg>
  ),
  cart: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M1 2.25A.75.75 0 0 1 1.75 1.5h2.494l.93 3.745-1.014 1.377a.75.75 0 0 1-1.33-.5l-1.876-5.372A.75.75 0 0 1 1 2.25zM4 5.25A.75.75 0 0 1 4.75 4.5h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 5.25zm0 3A.75.75 0 0 1 4.75 7.5h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 8.25zm0 3A.75.75 0 0 1 4.75 11h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 11.25z" />
    </svg>
  ),
};

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
    const canCDT = !!user.isInvestor || user.role === 'HEAD_OF_DEPARTMENT' || user.role === 'DIRECTOR';
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
  const canCDT = !!user.isInvestor || user.role === 'HEAD_OF_DEPARTMENT' || user.role === 'DIRECTOR';
  const canNT = !!user.isContractor;
  const canSwitch = !isAdmin && canCDT && canNT;
  const isCDT = !isAdmin && canCDT && activeView === 'chu-dau-tu';
  const isNT = !isAdmin && canNT && (activeView === 'nha-thau' || (!canCDT && canNT));

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const linkCls = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
      isActive(href)
        ? 'bg-red-50 text-red-800 font-semibold border-l-[3px] border-red-700 -ml-[3px]'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const roleDisplay = activeView === 'chu-dau-tu' ? 'Chủ đầu tư' : 'Nhà thầu';

  const dropdownCls = (isOpen: boolean) =>
    `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
      isOpen
        ? 'bg-red-50 text-red-800 font-semibold'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const subLinkCls = (href: string) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
      isActive(href)
        ? 'bg-red-50 text-red-800 font-semibold border-l-[3px] border-red-700 -ml-[3px]'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col shrink-0">
      {/* ── Header / Logo ── */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Logo" width={48} height={48} className="rounded-xl shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">Hệ thống QLĐT</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Quản lý Đấu thầu</p>
          </div>
        </div>
      </div>

      {/* ── Role indicator ── */}
      {!isAdmin && (isCDT || isNT) && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-100">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Vai trò hiện tại</p>
          <p className="text-sm font-bold text-red-800 mt-0.5">{roleDisplay}</p>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Tổng quan */}
        <Link href="/dashboard" className={linkCls('/dashboard')}>
          {Icon.dashboard}<span>Tổng quan</span>
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
                    {Icon.gear}<span>Thư viện Văn Bản</span>
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
                    {Icon.book}<span>Đặt sách</span>
                  </Link>
                  <Link href="/dashboard/mua-sam/sach/dat-sach/pending-reviews" className={subLinkCls('/dashboard/mua-sam/sach/dat-sach/pending-reviews')}>
                    {Icon.stamp}<span>Phê duyệt</span>
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
