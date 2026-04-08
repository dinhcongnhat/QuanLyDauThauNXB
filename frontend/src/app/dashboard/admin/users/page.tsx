'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User, Role } from '@/lib/types';
import toast from 'react-hot-toast';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  INVESTOR: 'Chủ đầu tư',
  HEAD_OF_DEPARTMENT: 'Trưởng phòng',
  DIRECTOR: 'Giám đốc',
};

const roleColors: Record<Role, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  INVESTOR: 'bg-blue-100 text-blue-700',
  HEAD_OF_DEPARTMENT: 'bg-yellow-100 text-yellow-700',
  DIRECTOR: 'bg-green-100 text-green-700',
};

const roles: Role[] = ['ADMIN', 'INVESTOR', 'HEAD_OF_DEPARTMENT', 'DIRECTOR'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'INVESTOR' as Role, department: '' });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createUser(form);
      toast.success('Tạo người dùng thành công');
      setForm({ name: '', email: '', password: '', role: 'INVESTOR', department: '' });
      setShowCreate(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await api.updateUserRole(userId, role);
      toast.success('Cập nhật vai trò thành công');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Người dùng</h1>
          <p className="text-gray-500 mt-1">Quản lý tài khoản và phân vai trò</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          {showCreate ? 'Đóng' : '+ Thêm người dùng'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Thêm người dùng mới</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none">
                {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
              <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={creating}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
                {creating ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Họ tên</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Phòng ban</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Vai trò</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Thay đổi vai trò</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{u.department || '-'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 outline-none">
                    {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
