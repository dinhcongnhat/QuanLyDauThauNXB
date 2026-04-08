'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Role, RolePermission } from '@/lib/types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  INVESTOR: 'Nhân viên',
  HEAD_OF_DEPARTMENT: 'Trưởng phòng',
  DIRECTOR: 'Giám đốc',
};

const allPermissions = [
  { key: 'admin:full', label: 'Quản trị toàn quyền', desc: 'Toàn quyền quản trị hệ thống' },
  { key: 'doc:create', label: 'Tạo tài liệu', desc: 'Tạo tờ trình, quyết định, báo cáo' },
  { key: 'doc:read', label: 'Xem tài liệu', desc: 'Xem danh sách và chi tiết tài liệu' },
  { key: 'doc:edit', label: 'Sửa tài liệu', desc: 'Chỉnh sửa tài liệu bị từ chối' },
  { key: 'doc:approve', label: 'Phê duyệt', desc: 'Phê duyệt tài liệu chờ duyệt' },
  { key: 'doc:reject', label: 'Từ chối', desc: 'Từ chối tài liệu, yêu cầu làm lại' },
  { key: 'doc:delegate', label: 'Ủy quyền', desc: 'Ủy quyền tạo QĐ KHLCNT cho nhân viên' },
];

const roles: Role[] = ['ADMIN', 'INVESTOR', 'HEAD_OF_DEPARTMENT', 'DIRECTOR'];

export default function PermissionManagementPage() {
  const { user: currentUser } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<Role>('INVESTOR');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [allPerms, setAllPerms] = useState<Record<Role, string[]>>({} as any);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchAllPermissions = async () => {
    const result: Record<string, string[]> = {};
    for (const role of roles) {
      try {
        const perms = await api.getPermissions(role);
        result[role] = perms.map((p: RolePermission) => p.permissionKey);
      } catch { result[role] = []; }
    }
    setAllPerms(result as Record<Role, string[]>);
    setPermissions(result[selectedRole] || []);
    setInitialLoading(false);
  };

  useEffect(() => { fetchAllPermissions(); }, []);

  useEffect(() => {
    if (allPerms[selectedRole]) {
      setPermissions([...allPerms[selectedRole]]);
    }
  }, [selectedRole]);

  const togglePermission = (key: string) => {
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.setPermissions(selectedRole, permissions);
      toast.success(`Cập nhật quyền cho ${roleLabels[selectedRole]} thành công`);
      setAllPerms(prev => ({ ...prev, [selectedRole]: [...permissions] }));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div className="text-center py-20 text-gray-400">Bạn không có quyền truy cập trang này</div>;
  }

  if (initialLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  const hasChanges = JSON.stringify([...permissions].sort()) !== JSON.stringify([...(allPerms[selectedRole] || [])].sort());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý phân quyền</h1>
        <p className="text-gray-500 mt-1">Cấu hình quyền hạn cho từng vai trò trong hệ thống</p>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2">
        {roles.map(role => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRole === role
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {roleLabels[role]}
            <span className="ml-2 text-xs opacity-75">({(allPerms[role] || []).length})</span>
          </button>
        ))}
      </div>

      {/* Permissions matrix */}
      <motion.div
        key={selectedRole}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-sm border"
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Quyền của {roleLabels[selectedRole]}</h3>
            <p className="text-xs text-gray-500 mt-1">{permissions.length}/{allPermissions.length} quyền đang bật</p>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          )}
        </div>
        <div className="divide-y">
          {allPermissions.map(perm => (
            <div key={perm.key} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{perm.desc}</p>
                <code className="text-xs text-gray-400 mt-1 block">{perm.key}</code>
              </div>
              <button
                onClick={() => togglePermission(perm.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  permissions.includes(perm.key) ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  permissions.includes(perm.key) ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Summary */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h3 className="font-semibold text-gray-700 mb-3">Tổng quan quyền theo vai trò</h3>
        <div className="grid grid-cols-4 gap-4">
          {roles.map(role => (
            <div key={role} className="border rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">{roleLabels[role]}</p>
              <div className="mt-2 space-y-1">
                {allPermissions.map(perm => (
                  <div key={perm.key} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${(allPerms[role] || []).includes(perm.key) ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <span className={(allPerms[role] || []).includes(perm.key) ? 'text-gray-700' : 'text-gray-400'}>{perm.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
