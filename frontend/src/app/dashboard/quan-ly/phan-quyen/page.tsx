'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { DynamicRole, Permission } from '@/lib/types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Plus, Trash2, Edit2, Check, X, ChevronDown, Save, Loader2 } from 'lucide-react';

const PERMISSION_CATEGORIES = ['documents', 'budget', 'plan', 'users', 'roles', 'admin', 'dat-sach', 'payment'];

const CATEGORY_LABELS: Record<string, string> = {
  documents: 'Tài liệu',
  budget: 'Dự toán',
  plan: 'Kế hoạch',
  users: 'Người dùng',
  roles: 'Vai trò',
  admin: 'Quản trị',
  'dat-sach': 'Đặt sách',
  payment: 'Thanh toán',
};

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  priority: number;
}

interface PermissionFormData {
  key: string;
  displayName: string;
  description: string;
  category: string;
}

export default function PermissionManagementPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Data states
  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});
  const [selectedRole, setSelectedRole] = useState<DynamicRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<string[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormData>({ name: '', displayName: '', description: '', priority: 0 });
  const [permissionForm, setPermissionForm] = useState<PermissionFormData>({ key: '', displayName: '', description: '', category: 'documents' });
  const [modalLoading, setModalLoading] = useState(false);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'role' | 'permission'; id: string; name: string } | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        api.getRoles(),
        api.getPermissionsByCategory(),
      ]);
      setRoles(rolesData);
      setPermissionsByCategory(permsData);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch role permissions when role is selected
  const handleSelectRole = async (role: DynamicRole) => {
    setSelectedRole(role);
    try {
      const perms = await api.getRolePermissions(role.id);
      const permIds = perms.map((p: Permission) => p.id);
      setSelectedPermissions(permIds);
      setOriginalPermissions(permIds);
    } catch (err: any) {
      toast.error('Không thể tải quyền của vai trò');
    }
  };

  // Toggle permission
  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  // Save role permissions
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.setRolePermissions(selectedRole.id, selectedPermissions);
      toast.success('Cập nhật quyền thành công');
      setOriginalPermissions(selectedPermissions);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu quyền');
    } finally {
      setSaving(false);
    }
  };

  // Role CRUD
  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', displayName: '', description: '', priority: roles.length + 1 });
    setShowRoleModal(true);
  };

  const openEditRole = (role: DynamicRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      priority: role.priority,
    });
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name || !roleForm.displayName) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setModalLoading(true);
    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, roleForm);
        toast.success('Cập nhật vai trò thành công');
      } else {
        await api.createRole(roleForm);
        toast.success('Tạo vai trò thành công');
      }
      setShowRoleModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu vai trò');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteRole(deleteTarget.id);
      toast.success('Xóa vai trò thành công');
      if (selectedRole?.id === deleteTarget.id) {
        setSelectedRole(null);
        setSelectedPermissions([]);
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa vai trò');
    }
  };

  // Permission CRUD
  const openCreatePermission = () => {
    setEditingPermission(null);
    setPermissionForm({ key: '', displayName: '', description: '', category: 'documents' });
    setShowPermissionModal(true);
  };

  const openEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      key: permission.key,
      displayName: permission.displayName,
      description: permission.description || '',
      category: permission.category,
    });
    setShowPermissionModal(true);
  };

  const handleSavePermission = async () => {
    if (!permissionForm.key || !permissionForm.displayName || !permissionForm.category) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setModalLoading(true);
    try {
      if (editingPermission) {
        await api.updatePermission(editingPermission.id, permissionForm);
        toast.success('Cập nhật quyền thành công');
      } else {
        await api.createPermission(permissionForm);
        toast.success('Tạo quyền thành công');
      }
      setShowPermissionModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu quyền');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeletePermission = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePermission(deleteTarget.id);
      toast.success('Xóa quyền thành công');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa quyền');
    }
  };

  const hasChanges = JSON.stringify([...selectedPermissions].sort()) !== JSON.stringify([...originalPermissions].sort());

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Phân quyền</h1>
          <p className="text-gray-500 mt-1">Quản lý vai trò và quyền hạn động cho hệ thống</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Vai trò
          </div>
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'permissions'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Quyền hạn
          </div>
        </button>
      </div>

      {/* Roles Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'roles' && (
          <motion.div
            key="roles-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-12 gap-6"
          >
            {/* Left Panel - Role List */}
            <div className="col-span-4 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Danh sách vai trò</h3>
                  <button
                    onClick={openCreateRole}
                    className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    title="Tạo vai trò mới"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {roles.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>Chưa có vai trò nào</p>
                    </div>
                  ) : (
                    roles.map(role => (
                      <div
                        key={role.id}
                        onClick={() => handleSelectRole(role)}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          selectedRole?.id === role.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{role.displayName}</p>
                              {!role.isActive && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">
                                  Tắt
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {role.description || 'Không có mô tả'}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-400">
                                Ưu tiên: {role.priority}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {role._count?.userRoles || 0} người dùng
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditRole(role); }}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'role', id: role.id, name: role.displayName }); }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
              {selectedRole ? (
                <motion.div
                  key={selectedRole.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden"
                >
                  <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Quyền của: {selectedRole.displayName}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedPermissions.length} / {Object.values(permissionsByCategory).flat().length} quyền được gán
                      </p>
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

                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {PERMISSION_CATEGORIES.map(category => {
                      const perms = permissionsByCategory[category] || [];
                      if (perms.length === 0) return null;
                      return (
                        <div key={category} className="p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary-600" />
                            {CATEGORY_LABELS[category] || category}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {perms.map(perm => (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  selectedPermissions.includes(perm.id)
                                    ? 'border-primary-300 bg-primary-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  className="mt-0.5 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{perm.displayName}</p>
                                  <code className="text-xs text-gray-400">{perm.key}</code>
                                  {perm.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Chọn một vai trò để xem và chỉnh sửa quyền</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <motion.div
            key="permissions-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {Object.values(permissionsByCategory).flat().length} quyền hạn
              </p>
              <button
                onClick={openCreatePermission}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Thêm quyền
              </button>
            </div>

            {PERMISSION_CATEGORIES.map(category => {
              const perms = permissionsByCategory[category] || [];
              if (perms.length === 0) return null;
              return (
                <div key={category} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary-600" />
                      {CATEGORY_LABELS[category] || category}
                      <span className="text-xs text-gray-400 font-normal">({perms.length})</span>
                    </h4>
                  </div>
                  <div className="divide-y">
                    {perms.map(perm => (
                      <div key={perm.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{perm.displayName}</p>
                            <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{perm.key}</code>
                            {!perm.isActive && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">
                                Tắt
                              </span>
                            )}
                          </div>
                          {perm.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{perm.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => openEditPermission(perm)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'permission', id: perm.id, name: perm.displayName })}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowRoleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                {editingRole ? 'Sửa vai trò' : 'Tạo vai trò mới'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên (key)</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="vd: editor, viewer"
                    disabled={!!editingRole}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
                  <input
                    type="text"
                    value={roleForm.displayName}
                    onChange={e => setRoleForm({ ...roleForm, displayName: e.target.value })}
                    placeholder="vd: Người chỉnh sửa"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={roleForm.description}
                    onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="Mô tả vai trò..."
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ưu tiên</label>
                  <input
                    type="number"
                    value={roleForm.priority}
                    onChange={e => setRoleForm({ ...roleForm, priority: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {editingRole && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editingRole.isActive}
                      onChange={(e) => setEditingRole({ ...editingRole, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Vai trò đang hoạt động</label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6 justify-end">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveRole}
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingRole ? 'Lưu' : 'Tạo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowPermissionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                {editingPermission ? 'Sửa quyền' : 'Tạo quyền mới'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                  <input
                    type="text"
                    value={permissionForm.key}
                    onChange={e => setPermissionForm({ ...permissionForm, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="vd: documents.create"
                    disabled={!!editingPermission}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
                  <input
                    type="text"
                    value={permissionForm.displayName}
                    onChange={e => setPermissionForm({ ...permissionForm, displayName: e.target.value })}
                    placeholder="vd: Tạo tài liệu"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={permissionForm.description}
                    onChange={e => setPermissionForm({ ...permissionForm, description: e.target.value })}
                    placeholder="Mô tả quyền..."
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={permissionForm.category}
                    onChange={e => setPermissionForm({ ...permissionForm, category: e.target.value })}
                    disabled={!!editingPermission}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                  >
                    {PERMISSION_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6 justify-end">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSavePermission}
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingPermission ? 'Lưu' : 'Tạo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Xác nhận xóa</h3>
                <p className="text-gray-500 mb-6">
                  Bạn có chắc chắn muốn xóa {deleteTarget.type === 'role' ? 'vai trò' : 'quyền'}{' '}
                  <strong>&quot;{deleteTarget.name}&quot;</strong> không?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={deleteTarget.type === 'role' ? handleDeleteRole : handleDeletePermission}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
