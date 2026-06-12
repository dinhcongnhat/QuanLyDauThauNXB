'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { User, Permission } from '@/lib/types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User as UserIcon, Save, Loader2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Người dùng',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  USER: 'bg-blue-100 text-blue-700',
};

export default function PermissionManagementPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Permission form state for selected user
  const [userPermissions, setUserPermissions] = useState({
    canApprove: false,
    isInvestor: false,
    isContractor: false,
    role: 'USER' as 'ADMIN' | 'USER',
    position: '',
  });
  const [originalPermissions, setOriginalPermissions] = useState({
    canApprove: false,
    isInvestor: false,
    isContractor: false,
    role: 'USER' as 'ADMIN' | 'USER',
    position: '',
  });
  const [editPosition, setEditPosition] = useState('');
  const [originalPosition, setOriginalPosition] = useState('');

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getUsers(1, 100);
      const userList = result.users || result;
      setUsers(userList);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle select user
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setUserPermissions({
      canApprove: user.canApprove ?? false,
      isInvestor: user.isInvestor ?? false,
      isContractor: user.isContractor ?? false,
      role: user.role as 'ADMIN' | 'USER',
      position: user.position || '',
    });
    setOriginalPermissions({
      canApprove: user.canApprove ?? false,
      isInvestor: user.isInvestor ?? false,
      isContractor: user.isContractor ?? false,
      role: user.role as 'ADMIN' | 'USER',
      position: user.position || '',
    });
    setEditPosition(user.position || '');
    setOriginalPosition(user.position || '');
  };

  // Toggle permission
  const togglePermission = (key: keyof typeof userPermissions) => {
    if (key === 'role' || key === 'position') return;
    setUserPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Change role
  const handleRoleChange = (role: 'ADMIN' | 'USER') => {
    setUserPermissions(prev => ({
      ...prev,
      role
    }));
  };

  // Check if there are changes
  const hasChanges = JSON.stringify(userPermissions) !== JSON.stringify(originalPermissions) || editPosition !== originalPosition;

  // Save permissions
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};

      if (userPermissions.canApprove !== originalPermissions.canApprove) {
        updates.canApprove = userPermissions.canApprove;
      }
      if (userPermissions.isInvestor !== originalPermissions.isInvestor) {
        updates.isInvestor = userPermissions.isInvestor;
      }
      if (userPermissions.isContractor !== originalPermissions.isContractor) {
        updates.isContractor = userPermissions.isContractor;
      }
      if (editPosition !== originalPosition) {
        updates.position = editPosition || null;
      }

      if (Object.keys(updates).length > 0) {
        await api.updateUser(selectedUser.id, updates);
      }

      if (userPermissions.role !== originalPermissions.role) {
        await api.updateUserRole(selectedUser.id, userPermissions.role);
      }

      toast.success('Cập nhật quyền thành công');
      setOriginalPermissions(userPermissions);
      setOriginalPosition(editPosition);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu quyền');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Bạn không có quyền truy cập trang này</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Phân quyền</h1>
        <p className="text-gray-500 mt-1">Chọn người dùng để cấp quyền hạn cụ thể</p>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - User List */}
        <div className="col-span-4">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Danh sách người dùng</h3>
              <p className="text-xs text-gray-500 mt-0.5">{users.length} người dùng</p>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {users.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Chưa có người dùng nào</p>
                </div>
              ) : (
                users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{user.name}</p>
                          {user.canApprove && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-violet-100 text-violet-700 rounded">
                              Phê duyệt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                            {roleLabels[user.role] || user.role}
                          </span>
                          {user.position && (
                            <span className="text-[10px] text-gray-400">{user.position}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Permission Checklist */}
        <div className="col-span-8">
          {selectedUser ? (
            <motion.div
              key={selectedUser.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-sm border overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{selectedUser.name}</h3>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  {hasChanges && (
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Lưu thay đổi
                    </button>
                  )}
                </div>
              </div>

              {/* Permission Content */}
              <div className="p-6 space-y-6">
                {/* Chức vụ */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-primary-600" />
                    Thông tin cá nhân
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chức vụ</label>
                    <input
                      type="text"
                      value={editPosition}
                      onChange={e => setEditPosition(e.target.value)}
                      placeholder="VD: Kế toán trưởng, Trưởng phòng..."
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Vai trò hệ thống */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary-600" />
                    Vai trò hệ thống
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleRoleChange('USER')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        userPermissions.role === 'USER'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          userPermissions.role === 'USER' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {userPermissions.role === 'USER' && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Người dùng</p>
                          <p className="text-xs text-gray-500">Quyền hạn cơ bản</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleRoleChange('ADMIN')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        userPermissions.role === 'ADMIN'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          userPermissions.role === 'ADMIN' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                        }`}>
                          {userPermissions.role === 'ADMIN' && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Quản trị viên</p>
                          <p className="text-xs text-gray-500">Toàn quyền quản lý</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quyền hạn đặc biệt */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary-600" />
                    Quyền hạn đặc biệt
                  </h4>
                  <div className="space-y-3">
                    {/* Quyền phê duyệt */}
                    <label
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        userPermissions.canApprove
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={userPermissions.canApprove}
                        onChange={() => togglePermission('canApprove')}
                        className="mt-0.5 w-5 h-5 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">Có quyền phê duyệt</p>
                          <span className="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded">Phê duyệt</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Cho phép người dùng phê duyệt tài liệu, đề xuất mua sắm và các quy trình trong hệ thống
                        </p>
                      </div>
                    </label>

                    {/* Chủ đầu tư */}
                    <label
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        userPermissions.isInvestor
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={userPermissions.isInvestor}
                        onChange={() => togglePermission('isInvestor')}
                        className="mt-0.5 w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">Chủ đầu tư</p>
                          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">CĐT</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Xem và quản lý các dự án với vai trò Chủ đầu tư
                        </p>
                      </div>
                    </label>

                    {/* Nhà thầu */}
                    <label
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        userPermissions.isContractor
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={userPermissions.isContractor}
                        onChange={() => togglePermission('isContractor')}
                        className="mt-0.5 w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">Nhà thầu</p>
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">NT</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Xem và tham gia đấu thầu với vai trò Nhà thầu
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Thông tin người dùng</p>
                      <div className="mt-2 space-y-1 text-xs text-blue-700">
                        <p>Phòng ban: {selectedUser.department || '-'}</p>
                        <p>Ngày tạo: {selectedUser.createdAt ? format(new Date(selectedUser.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn người dùng</h3>
              <p className="text-gray-500">Click vào người dùng bên trái để xem và phân quyền</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
