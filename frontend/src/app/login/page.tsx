'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

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
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <Image src="/logo.png" alt="Logo" width={72} height={72} priority className="drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Hệ thống<br />Quản lý Đấu thầu
          </h1>
          <p className="text-lg text-white/80 mb-8 leading-relaxed max-w-md">
            Quản lý quy trình mua sắm, phê duyệt dự toán và kế hoạch lựa chọn nhà thầu một cách hiệu quả.
          </p>
          <div className="flex gap-6 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">📋</div>
              <span>Tờ trình & Quyết định</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">✅</div>
              <span>Phê duyệt trực tuyến</span>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-white/60 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">📄</div>
              <span>Xuất DOCX tự động</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">🔐</div>
              <span>Phân quyền linh hoạt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-3">
              <Image src="/logo.png" alt="Logo" width={64} height={64} priority />
            </div>
            <p className="text-gray-500 text-sm">Hệ thống Quản lý Đấu thầu</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Đăng nhập</h2>
              <p className="text-gray-500 mt-1 text-sm">Vui lòng đăng nhập để tiếp tục</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm transition-all"
                    placeholder="Nhập email của bạn"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-12 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm transition-all"
                    placeholder="Nhập mật khẩu"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-all text-sm shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Đang xử lý...
                  </span>
                ) : 'Đăng nhập'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            &copy; {new Date().getFullYear()} Hệ thống Quản lý Đấu thầu. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
