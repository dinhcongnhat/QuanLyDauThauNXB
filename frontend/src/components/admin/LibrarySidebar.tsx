'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const iconLibrary = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM12 15.203h-1.25c-.1 0-.17.082-.17.185v.257c0 .103.07.185.17.185h1.25a.185.185 0 0 0 .185-.185v-.257a.185.185 0 0 0-.185-.185ZM8.938 10.818v2.614A3.13 3.13 0 0 0 10.076 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432Zm3.063 4.385v2.614a3.13 3.13 0 0 0 1.138-.432c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM10.75 2.875a2.638 2.638 0 0 1-1.75.534c-.482-.315-.612-.648-.612-.875 0-.227.13-.56.612-.875a2.638 2.638 0 0 1 1.75.534Z" />
  </svg>
);

const iconOrg = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a1 1 0 1 0 0 2h3v2H7a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2h3a1 1 0 1 0 0-2H6a2 2 0 0 1-2-2V4Zm3 1.5a.75.75 0 0 0-.75.75v1.5h-1.5a.75.75 0 0 0 0 1.5H6v1.5a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5H7.75v-1.5A.75.75 0 0 0 7 5.375Z" clipRule="evenodd" />
  </svg>
);

const iconDoc = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5ZM10 8a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 10 8Z" clipRule="evenodd" />
  </svg>
);

export function LibrarySidebar() {
  const pathname = usePathname();

  const basePath = '/dashboard/admin/thu-vien-van-ban';
  const isActive = (href: string) =>
    pathname === href || (href !== basePath && pathname.startsWith(href));

  const navItem = (href: string, icon: React.ReactNode, label: string) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
          active
            ? 'bg-red-50 text-red-800 font-semibold border-l-[3px] border-red-700 -ml-[3px]'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <span className={active ? 'text-red-600' : 'text-gray-400'}>{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <nav className="space-y-1">
      {navItem(basePath, iconOrg, 'Tổ chức & Thư viện')}
    </nav>
  );
}
