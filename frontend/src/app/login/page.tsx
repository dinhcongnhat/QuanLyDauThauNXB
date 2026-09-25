'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const systemCapabilities = [
  { icon: FileCheck2, label: 'Quản lý hồ sơ và văn bản tập trung' },
  { icon: CheckCircle2, label: 'Phê duyệt theo đúng quy trình nghiệp vụ' },
  { icon: ShieldCheck, label: 'Phân quyền, bảo mật và truy vết đầy đủ' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(email, password);
      login(res.access_token, res.user);
      toast.success('Đăng nhập thành công');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F7F8] lg:grid lg:grid-cols-[minmax(440px,0.9fr)_minmax(560px,1.1fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-primary-900 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-white/15" />
        <div aria-hidden="true" className="absolute -right-28 top-20 h-72 w-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-16 top-32 h-48 w-48 rounded-full border border-white/10" />

        <div className="relative z-10 px-12 pt-10 xl:px-16">
          <div className="flex items-center gap-4 border-b border-white/15 pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white p-2 shadow-sm">
              <Image src="/logo.png" alt="Biểu trưng Nhà xuất bản" width={52} height={52} priority />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Cơ quan chủ quản</p>
              <p className="mt-1 max-w-sm text-sm font-semibold leading-snug text-white">
                Nhà xuất bản Chính trị quốc gia Sự thật
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 py-12 xl:px-16">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
            <Landmark className="h-4 w-4" />
            Nền tảng nghiệp vụ nội bộ
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.2] tracking-tight text-white xl:text-[42px]">
            Hệ thống Quản lý Đấu thầu
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
            Chuẩn hóa quy trình mua sắm, quản lý hồ sơ và phê duyệt văn bản trên một hệ thống thống nhất, an toàn.
          </p>

          <div className="mt-10 space-y-4 border-t border-white/15 pt-8">
            {systemCapabilities.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 px-12 pb-8 text-xs text-white/45 xl:px-16">
          Hệ thống dành cho cán bộ, viên chức và người dùng được cấp quyền.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white p-2">
              <Image src="/logo.png" alt="Biểu trưng Nhà xuất bản" width={44} height={44} priority />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-800">Hệ thống QLĐT</p>
              <p className="mt-0.5 text-xs leading-snug text-[#667085]">Nhà xuất bản Chính trị quốc gia Sự thật</p>
            </div>
          </div>

          <div className="rounded-lg border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06)] sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">Cổng nghiệp vụ nội bộ</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#1F2328]">Đăng nhập hệ thống</h2>
              <p className="mt-2 text-sm text-[#667085]">Sử dụng tài khoản đã được cơ quan cấp để tiếp tục.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#344054]">
                  Địa chỉ email
                </label>
                <div className="relative">
                  <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#667085]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-md border border-[#D0D5DD] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-primary-700 focus:ring-4 focus:ring-primary-100"
                    placeholder="ten.nguoidung@donvi.vn"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#344054]">
                  Mật khẩu
                </label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#667085]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-md border border-[#D0D5DD] bg-white pl-10 pr-11 text-sm outline-none transition focus:border-primary-700 focus:ring-4 focus:ring-primary-100"
                    placeholder="Nhập mật khẩu"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#667085] hover:bg-[#F2F4F7] hover:text-[#344054]"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary h-11 w-full">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Đang xác thực...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-2.5 border-t border-[#E4E7EC] pt-5 text-xs leading-5 text-[#667085]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
              <p>Không chia sẻ tài khoản. Mọi thao tác trên hệ thống được ghi nhận để bảo đảm an toàn và truy vết.</p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#667085]">
            © {new Date().getFullYear()} Nhà xuất bản Chính trị quốc gia Sự thật
          </p>
        </div>
      </section>
    </main>
  );
}
