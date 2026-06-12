'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { User, Role } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Người dùng',
};

const roleColors: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  USER: 'bg-blue-100 text-blue-700',
};

type ModalType = 'create' | 'edit' | 'detail' | 'resetPw' | null;

export default function UserManagementPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as Role,
    department: '',
    position: '',
    isInvestor: false,
    isContractor: false,
    canApprove: false
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    role: 'USER' as Role,
    isInvestor: false,
    isContractor: false,
    canApprove: false
  });
  const [resetPw, setResetPw] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await api.getUsers(1, 100);
      const userList = result.users || result;
      setUsers(userList);
    }
    catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    try {
      await api.createUser({
        ...form,
        department: form.department || undefined,
        position: form.position || undefined
      });
      toast.success('Tạo người dùng thành công');
      setModal(null);
      setForm({
        name: '', email: '', password: '',
        role: 'USER', department: '', position: '',
        isInvestor: false, isContractor: false, canApprove: false
      });
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    try {
      const updates: Record<string, any> = {};
      if (editForm.name !== selectedUser.name) updates.name = editForm.name;
      if (editForm.email !== selectedUser.email) updates.email = editForm.email;
      if (editForm.department !== (selectedUser.department || '')) updates.department = editForm.department;
      if (editForm.position !== (selectedUser.position || '')) updates.position = editForm.position;
      if (editForm.isInvestor !== (selectedUser.isInvestor ?? false)) updates.isInvestor = editForm.isInvestor;
      if (editForm.isContractor !== (selectedUser.isContractor ?? false)) updates.isContractor = editForm.isContractor;
      if (editForm.canApprove !== (selectedUser.canApprove ?? false)) updates.canApprove = editForm.canApprove;

      if (Object.keys(updates).length > 0) {
        await api.updateUser(selectedUser.id, updates);
      }
      if (editForm.role !== selectedUser.role) {
        await api.updateUserRole(selectedUser.id, editForm.role);
      }

      toast.success('Cập nhật thành công');
      setModal(null);
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Xác nhận xóa người dùng "${u.name}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await api.deleteUser(u.id);
      toast.success('Đã xóa người dùng');
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPw) {
      toast.error('Vui lòng nhập mật khẩu mới');
      return;
    }
    try {
      await api.adminResetPassword(selectedUser.id, resetPw);
      toast.success('Đặt lại mật khẩu thành công');
      setModal(null);
      setResetPw('');
    } catch (err: any) { toast.error(err.message); }
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      department: u.department || '',
      position: u.position || '',
      role: u.role,
      isInvestor: u.isInvestor ?? false,
      isContractor: u.isContractor ?? false,
      canApprove: u.canApprove ?? false,
    });
    setModal('edit');
  };

  const openDetail = (u: User) => {
    setSelectedUser(u);
    setModal('detail');
  };

  const openResetPw = (u: User) => {
    setSelectedUser(u);
    setResetPw('');
    setModal('resetPw');
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div className="text-center py-20 text-gray-400">Bạn không có quyền truy cập trang này</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>;
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.position || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-gray-500 mt-1">Thêm, sửa, xóa và phân quyền cho người dùng trong hệ thống</p>
        </div>
        <button
          onClick={() => {
            setForm({
              name: '', email: '', password: '',
              role: 'USER', department: '', position: '',
              isInvestor: false, isContractor: false, canApprove: false
            });
            setModal('create');
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          + Thêm người dùng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Quản trị viên</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{users.filter(u => u.role === 'ADMIN').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Người dùng</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{users.filter(u => u.role === 'USER').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Có thể phê duyệt</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">{users.filter(u => u.canApprove).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Tổng số</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{users.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border px-4 py-3">
        <input
          className="w-full text-sm outline-none"
          placeholder="🔍 Tìm kiếm theo tên, email, phòng ban, chức vụ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phòng ban</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chức vụ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phê duyệt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                      {u.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.department || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.position || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${roleColors[u.role]}`}>
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.canApprove ? (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">Có</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">Không</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {u.createdAt ? format(new Date(u.createdAt), 'dd/MM/yyyy', { locale: vi }) : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => openDetail(u)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => openResetPw(u)}
                      className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                    >
                      Đổi MK
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-gray-400">
            Không tìm thấy người dùng nào
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >

              {/* Create Modal */}
              {modal === 'create' && (
                <>
                  <h3 className="text-lg font-semibold mb-4">Tạo người dùng mới</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Nguyễn Văn A"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        type="email"
                        placeholder="user@qlda.vn"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                        <input
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Phòng Mua sắm"
                          value={form.department}
                          onChange={e => setForm({ ...form, department: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
                        <input
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Kế toán trưởng"
                          value={form.position}
                          onChange={e => setForm({ ...form, position: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò hệ thống</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-blue-50"
                          style={{ borderColor: form.role === 'USER' ? '#2563eb' : '#d1d5db', backgroundColor: form.role === 'USER' ? '#eff6ff' : '' }}>
                          <input type="radio" name="createRole" checked={form.role === 'USER'}
                            onChange={() => setForm({ ...form, role: 'USER' })}
                            className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Người dùng</span>
                        </label>
                        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-red-50"
                          style={{ borderColor: form.role === 'ADMIN' ? '#dc2626' : '#d1d5db', backgroundColor: form.role === 'ADMIN' ? '#fef2f2' : '' }}>
                          <input type="radio" name="createRole" checked={form.role === 'ADMIN'}
                            onChange={() => setForm({ ...form, role: 'ADMIN' })}
                            className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-gray-700">Quản trị viên</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-violet-50"
                        style={{ borderColor: form.canApprove ? '#7c3aed' : '#d1d5db', backgroundColor: form.canApprove ? '#f5f3ff' : '' }}>
                        <input type="checkbox" checked={form.canApprove}
                          onChange={e => setForm({ ...form, canApprove: e.target.checked })}
                          className="w-4 h-4 text-violet-600 rounded" />
                        <span className="text-sm font-medium text-gray-700">Có quyền phê duyệt</span>
                      </label>
                      <p className="text-xs text-gray-400 mt-1 ml-1">Cho phép người dùng phê duyệt tài liệu và quy trình</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 justify-end">
                    <button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Hủy</button>
                    <button onClick={handleCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Tạo người dùng</button>
                  </div>
                </>
              )}

              {/* Edit Modal */}
              {modal === 'edit' && selectedUser && (
                <>
                  <h3 className="text-lg font-semibold mb-4">Chỉnh sửa người dùng</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                        <input
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                          value={editForm.department}
                          onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
                        <input
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                          value={editForm.position}
                          onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò hệ thống</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-blue-50"
                          style={{ borderColor: editForm.role === 'USER' ? '#2563eb' : '#d1d5db', backgroundColor: editForm.role === 'USER' ? '#eff6ff' : '' }}>
                          <input type="radio" name="editRole" checked={editForm.role === 'USER'}
                            onChange={() => setEditForm({ ...editForm, role: 'USER' })}
                            className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Người dùng</span>
                        </label>
                        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-red-50"
                          style={{ borderColor: editForm.role === 'ADMIN' ? '#dc2626' : '#d1d5db', backgroundColor: editForm.role === 'ADMIN' ? '#fef2f2' : '' }}>
                          <input type="radio" name="editRole" checked={editForm.role === 'ADMIN'}
                            onChange={() => setEditForm({ ...editForm, role: 'ADMIN' })}
                            className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-gray-700">Quản trị viên</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-violet-50"
                        style={{ borderColor: editForm.canApprove ? '#7c3aed' : '#d1d5db', backgroundColor: editForm.canApprove ? '#f5f3ff' : '' }}>
                        <input type="checkbox" checked={editForm.canApprove}
                          onChange={e => setEditForm({ ...editForm, canApprove: e.target.checked })}
                          className="w-4 h-4 text-violet-600 rounded" />
                        <span className="text-sm font-medium text-gray-700">Có quyền phê duyệt</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 justify-end">
                    <button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Hủy</button>
                    <button onClick={handleEdit} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Lưu thay đổi</button>
                  </div>
                </>
              )}

              {/* Detail Modal */}
              {modal === 'detail' && selectedUser && (
                <>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${roleColors[selectedUser.role]}`}>
                        {roleLabels[selectedUser.role]}
                      </span>
                      {selectedUser.canApprove && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-violet-100 text-violet-700 ml-1">Phê duyệt</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Phòng ban</span>
                      <span className="font-medium">{selectedUser.department || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Chức vụ</span>
                      <span className="font-medium">{selectedUser.position || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Vai trò hệ thống</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${roleColors[selectedUser.role]}`}>
                        {roleLabels[selectedUser.role]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">Quyền phê duyệt</span>
                      {selectedUser.canApprove ? (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">Có</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">Không</span>
                      )}
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">Ngày tạo</span>
                      <span className="font-medium">
                        {selectedUser.createdAt ? format(new Date(selectedUser.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 justify-end">
                    <button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Đóng</button>
                    <button onClick={() => { setModal('edit'); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Sửa thông tin</button>
                  </div>
                </>
              )}

              {/* Reset Password Modal */}
              {modal === 'resetPw' && selectedUser && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Đặt lại mật khẩu</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Đặt mật khẩu mới cho <span className="font-medium text-gray-700">{selectedUser.name}</span>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới *</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={resetPw}
                      onChange={e => setResetPw(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mt-5 justify-end">
                    <button onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Hủy</button>
                    <button onClick={handleResetPassword} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm">Đặt lại mật khẩu</button>
                  </div>
                </>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
