'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Role, RolePermission } from '@/lib/types';
import toast from 'react-hot-toast';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  INVESTOR: 'Chủ đầu tư',
  HEAD_OF_DEPARTMENT: 'Trưởng phòng',
  DIRECTOR: 'Giám đốc',
};

const allPermissions = [
  { key: 'budget:create', label: 'Tạo dự toán' },
  { key: 'budget:edit', label: 'Sửa dự toán' },
  { key: 'budget:submit', label: 'Gửi dự toán' },
  { key: 'budget:approve', label: 'Duyệt dự toán' },
  { key: 'budget:reject', label: 'Từ chối dự toán' },
  { key: 'budget:read', label: 'Xem dự toán' },
  { key: 'plan:create', label: 'Tạo KH LCNT' },
  { key: 'plan:edit', label: 'Sửa KH LCNT' },
  { key: 'plan:submit', label: 'Gửi KH LCNT' },
  { key: 'plan:review', label: 'Thẩm định KH LCNT' },
  { key: 'plan:approve', label: 'Duyệt KH LCNT' },
  { key: 'plan:reject', label: 'Từ chối KH LCNT' },
  { key: 'plan:read', label: 'Xem KH LCNT' },
  { key: 'user:manage', label: 'Quản lý người dùng' },
  { key: 'admin:full', label: 'Toàn quyền admin' },
];

const roles: Role[] = ['INVESTOR', 'HEAD_OF_DEPARTMENT', 'DIRECTOR', 'ADMIN'];

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('INVESTOR');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPermissions = async (role: Role) => {
    setLoading(true);
    try {
      const data = await api.getPermissions(role);
      setPermissions(data.map((p: RolePermission) => p.permissionKey));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPermissions(selectedRole); }, [selectedRole]);

  const togglePermission = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setPermissions(selectedRole, permissions);
      toast.success('Cập nhật quyền thành công');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phân quyền</h1>
        <p className="text-gray-500 mt-1">Cấu hình quyền hạn theo vai trò</p>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2">
        {roles.map((r) => (
          <button key={r} onClick={() => setSelectedRole(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRole === r ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {roleLabels[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Quyền của {roleLabels[selectedRole]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allPermissions.map((p) => (
              <label key={p.key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={permissions.includes(p.key)} onChange={() => togglePermission(p.key)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.key}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
              {saving ? 'Đang lưu...' : 'Lưu quyền'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
