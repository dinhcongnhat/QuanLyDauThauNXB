import { DynamicRole, Permission, RoleWithPermissions } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // ── Project ────────────────────────────────────────────────
  getProjects: () => request<any[]>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${encodeURIComponent(id)}`),
  getProjectSummary: (id: string) => request<any>(`/projects/${encodeURIComponent(id)}/summary`),
  createProject: (tenDuAn: string, procurementType: string) =>
    request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify({ tenDuAn, procurementType }),
    }),
  updateProject: (id: string, data: { status?: string; tenDuAn?: string }) =>
    request<any>(`/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProject: (id: string) =>
    request<any>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getProjectStats: () => request<any>('/projects/stats'),

  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getProfile: () => request<any>('/auth/profile'),

  // Users
  getUsers: () => request<any[]>('/users'),
  createUser: (data: { name: string; email: string; password: string; role: string; department?: string; isInvestor?: boolean; isContractor?: boolean }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { name?: string; email?: string; department?: string; isInvestor?: boolean; isContractor?: boolean }) =>
    request<any>(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<any>(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateUserRole: (id: string, role: string) =>
    request<any>(`/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<any>('/users/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }),
  adminResetPassword: (id: string, newPassword: string) =>
    request<any>(`/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  getPermissions: (role: string) => request<any[]>(`/users/permissions/${encodeURIComponent(role)}`),
  setPermissions: (role: string, permissionKeys: string[]) =>
    request<any>('/users/permissions', { method: 'POST', body: JSON.stringify({ role, permissionKeys }) }),

  // Documents
  createDocument: (type: string, data: any, parentId?: string, assignedTo?: string, projectId?: string) =>
    request<any>('/documents', {
      method: 'POST',
      body: JSON.stringify({ type, data, parentId, assignedTo, projectId }),
    }),

  createDuToanBatch: (ttData: any, qdData: any, assignedTo: string, projectId?: string) =>
    request<any>('/documents/create-du-toan-batch', {
      method: 'POST',
      body: JSON.stringify({ ttData, qdData, assignedTo, projectId }),
    }),

  getUsersByRole: (role: string) =>
    request<any[]>(`/users/by-role/${encodeURIComponent(role)}`),

  getDocumentsByType: (types: string[], projectId?: string) =>
    request<any[]>(`/documents/by-type?types=${encodeURIComponent(types.join(','))}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}`),

  getDocumentsByParent: (parentId: string) =>
    request<any[]>(`/documents/by-parent/${encodeURIComponent(parentId)}`),

  getDocument: (id: string) => request<any>(`/documents/${encodeURIComponent(id)}`),

  getApprovedDecisions: (projectId?: string) =>
    request<any[]>(`/documents/approved${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),

  approveDocument: (id: string, comment?: string) =>
    request<any>(`/documents/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  rejectDocument: (id: string, comment: string) =>
    request<any>(`/documents/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  resubmitDocument: (id: string, data?: any) =>
    request<any>(`/documents/${encodeURIComponent(id)}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),

  delegateQDKHLCNT: (parentId: string, employeeId: string) =>
    request<any>(`/documents/delegate/${encodeURIComponent(parentId)}`, {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    }),

  getStats: () => request<any>('/documents/stats'),

  downloadDocument: (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  downloadDocumentPdf: (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/download-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getOnlyofficeConfig: (id: string) =>
    request<any>(`/documents/${encodeURIComponent(id)}/onlyoffice-config`),

  // Contractor Selection (LCNT)
  getAllLCNTSelections: (projectId?: string) =>
    request<any[]>(`/contractor-selection${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
  getApprovedQDForLCNT: (projectId?: string) =>
    request<any[]>(`/contractor-selection/approved-qd${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
  getPendingApprovals: () => request<any[]>('/contractor-selection/pending-approvals'),

  createContractorSelection: (qdKhlcntId: string, goiThauIndex: number, projectId?: string) =>
    request<any>('/contractor-selection', {
      method: 'POST',
      body: JSON.stringify({ qdKhlcntId, goiThauIndex, projectId }),
    }),

  getContractorSelection: (id: string) =>
    request<any>(`/contractor-selection/${encodeURIComponent(id)}`),

  getLCNTStep: (stepId: string) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}`),

  getContractorSelectionsByQD: (qdKhlcntId: string, projectId?: string) =>
    request<any[]>(`/contractor-selection/by-qd/${encodeURIComponent(qdKhlcntId)}${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),

  getLCNTAutoFill: (stepId: string) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}/auto-fill`),

  updateLCNTStep: (stepId: string, data: any) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}/update`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),

  requestStepApproval: (stepId: string, comment?: string) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}/request-approval`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  approveLCNTStep: (stepId: string, comment?: string) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  rejectLCNTStep: (stepId: string, comment: string) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  completeLCNTStep: (stepId: string) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}/complete`, {
      method: 'POST',
    }),

  reopenLCNTStep: (stepId: string) =>
    request<any>(`/contractor-selection/step/${encodeURIComponent(stepId)}/reopen`, {
      method: 'POST',
    }),

  getCompletedContracts: (projectId?: string) =>
    request<any[]>(`/contractor-selection/contracts${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),

  downloadLCNTStepPdf: (stepId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/contractor-selection/step/${encodeURIComponent(stepId)}/download-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  downloadLCNTStepDocx: (stepId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/contractor-selection/step/${encodeURIComponent(stepId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  generateLCNTDocx: (stepId: string) =>
    request<{ objectName: string; url: string }>(`/contractor-selection/step/${encodeURIComponent(stepId)}/generate-docx`, {
      method: 'POST',
    }),

  uploadLCNTAttachment: async (stepId: string, file: File, ghiChu?: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    if (ghiChu) formData.append('ghiChu', ghiChu);
    const res = await fetch(`/api/contractor-selection/step/${encodeURIComponent(stepId)}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<{ objectName: string; url: string }>;
  },

  getLCNTFileUrl: (objectPath: string) =>
    request<{ url: string }>(`/contractor-selection/file/url?path=${encodeURIComponent(objectPath)}`),

  getLCNTOnlyofficeConfig: (objectPath: string) =>
    request<{ onlyofficeUrl: string; editorConfig: any }>(`/contractor-selection/file/onlyoffice-config?path=${encodeURIComponent(objectPath)}`),

  setContractPackageType: (selectionId: string, contractPackageType: string) =>
    request<any>(`/contractor-selection/${encodeURIComponent(selectionId)}/set-package-type`, {
      method: 'POST',
      body: JSON.stringify({ contractPackageType }),
    }),

  getLCNTZipPreview: (selectionId: string) =>
    request<{ files: any[]; zipName: string }>(`/contractor-selection/${encodeURIComponent(selectionId)}/zip-preview`),

  downloadLCNTZip: (selectionId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/contractor-selection/${encodeURIComponent(selectionId)}/download-zip`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // ====================== Payment (Thanh toán) ======================
  getAllPayments: (projectId?: string) =>
    request<any[]>(`/payment${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
  searchPayments: (q: string, projectId?: string) =>
    request<any[]>(`/payment/search?q=${encodeURIComponent(q)}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}`),
  getPaymentContracts: (projectId?: string) =>
    request<any[]>(`/payment/contracts${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
  getPayment: (id: string) => request<any>(`/payment/${encodeURIComponent(id)}`),
  getPaymentStep: (stepId: string) => request<any>(`/payment/step/${encodeURIComponent(stepId)}`),

  createPayment: (contractorSelectionId: string, projectId?: string) =>
    request<any>('/payment', {
      method: 'POST',
      body: JSON.stringify({ contractorSelectionId, projectId }),
    }),

  getPaymentAutoFill: (stepId: string) =>
    request<any>(`/payment/step/${encodeURIComponent(stepId)}/auto-fill`),

  updatePaymentStep: (stepId: string, data: any) =>
    request<any>(`/payment/step/${encodeURIComponent(stepId)}/update`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),

  completePaymentStep: (stepId: string) =>
    request<any>(`/payment/step/${encodeURIComponent(stepId)}/complete`, { method: 'POST' }),

  reopenPaymentStep: (stepId: string) =>
    request<any>(`/payment/step/${encodeURIComponent(stepId)}/reopen`, { method: 'POST' }),

  downloadPaymentStepDocx: (stepId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/payment/step/${encodeURIComponent(stepId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  generatePaymentDocx: (stepId: string) =>
    request<{ objectName: string; url: string }>(`/payment/step/${encodeURIComponent(stepId)}/generate-docx`, { method: 'POST' }),

  uploadPaymentAttachment: async (stepId: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/payment/step/${encodeURIComponent(stepId)}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<{ objectName: string; url: string }>;
  },

  deletePaymentAttachment: (stepId: string, path: string) =>
    request<any>(`/payment/step/${encodeURIComponent(stepId)}/delete-attachment`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  getPaymentFileUrl: (objectPath: string) =>
    request<{ url: string }>(`/payment/file/url?path=${encodeURIComponent(objectPath)}`),

  getPaymentZipPreview: (paymentId: string) =>
    request<{ files: any[]; zipName: string }>(`/payment/${encodeURIComponent(paymentId)}/zip-preview`),

  downloadPaymentZip: (paymentId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/payment/${encodeURIComponent(paymentId)}/download-zip`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // ====================== Bid Participation (Nhà thầu - Tham dự đấu thầu) ======================
  createBidParticipation: (data: { maThongBaoMoiThau: string; tenChuDauTu: string; tenGoiThau?: string }) =>
    request<any>('/bid-participation', { method: 'POST', body: JSON.stringify(data) }),

  getAllBidParticipations: () => request<any[]>('/bid-participation'),

  getMyContracts: () => request<any[]>('/bid-participation/my-contracts'),

  getBidParticipation: (id: string) => request<any>(`/bid-participation/${encodeURIComponent(id)}`),

  getBidStep: (stepId: string) => request<any>(`/bid-participation/step/${encodeURIComponent(stepId)}`),

  updateBidStep: (stepId: string, data: any) =>
    request<any>(`/bid-participation/step/${encodeURIComponent(stepId)}/update`, {
      method: 'POST', body: JSON.stringify({ data }),
    }),

  completeBidStep: (stepId: string) =>
    request<any>(`/bid-participation/step/${encodeURIComponent(stepId)}/complete`, { method: 'POST' }),

  reopenBidStep: (stepId: string) =>
    request<any>(`/bid-participation/step/${encodeURIComponent(stepId)}/reopen`, { method: 'POST' }),

  setBidResult: (bidId: string, result: 'WON' | 'LOST') =>
    request<any>(`/bid-participation/${encodeURIComponent(bidId)}/set-result`, {
      method: 'POST', body: JSON.stringify({ result }),
    }),

  uploadBidAttachment: async (stepId: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/bid-participation/step/${encodeURIComponent(stepId)}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<{ objectName: string; originalName: string }>;
  },

  deleteBidAttachment: (stepId: string, path: string) =>
    request<any>(`/bid-participation/step/${encodeURIComponent(stepId)}/delete-attachment`, {
      method: 'POST', body: JSON.stringify({ path }),
    }),

  getBidFileUrl: (objectPath: string) =>
    request<{ url: string }>(`/bid-participation/file/url?path=${encodeURIComponent(objectPath)}`),

  generateBidDocx: (stepId: string) =>
    request<{ objectName: string }>(`/bid-participation/step/${encodeURIComponent(stepId)}/generate-docx`, { method: 'POST' }),

  downloadBidDocx: (stepId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/bid-participation/step/${encodeURIComponent(stepId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getBidZipPreview: (bidId: string) =>
    request<{ files: any[]; zipName: string }>(`/bid-participation/${encodeURIComponent(bidId)}/zip-preview`),

  downloadBidZip: (bidId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/bid-participation/${encodeURIComponent(bidId)}/download-zip`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // ====================== DatSach / Thầu Sách ======================
  createDatSachProject: (parentId: string, tenDuAn: string, procurementType: string) =>
    request<any>('/dat-sach/projects', {
      method: 'POST',
      body: JSON.stringify({ parentId, tenDuAn, procurementType }),
    }),

  getDatSachProjects: (parentId: string) =>
    request<any[]>(`/dat-sach/projects?parentId=${encodeURIComponent(parentId)}`),

  getDatSachProject: (id: string) =>
    request<any>(`/dat-sach/projects/${encodeURIComponent(id)}`),

  // Create a DatSachProject from a Project entity (auto-links projectId)
  createDatSachProjectFromProject: (projectId: string, tenDuAn: string) =>
    request<any>('/dat-sach/projects', {
      method: 'POST',
      body: JSON.stringify({ projectId, tenDuAn, procurementType: 'THAU_SACH', parentId: projectId }),
    }),

  createGDNInSach: (projectId: string, data: any) =>
    request<any>('/dat-sach/gdn', {
      method: 'POST',
      body: JSON.stringify({ projectId, data }),
    }),

  updateGDNInSach: (id: string, data: any) =>
    request<any>(`/dat-sach/gdn/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data }),
    }),

  assignUsersForSL: (gdnId: string, userIds: string[]) =>
    request<any>(`/dat-sach/gdn/${encodeURIComponent(gdnId)}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }),

  fillSL: (gdnId: string, userId: string, soLuong: number) =>
    request<any>(`/dat-sach/gdn/${encodeURIComponent(gdnId)}/fill-sl`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, soLuong }),
    }),

  getMyAssignments: () =>
    request<any[]>('/dat-sach/my-assignments'),

  // Auto-fill endpoints
  getAutoFillForPCDI: (projectId: string) =>
    request<any>(`/dat-sach/project/${encodeURIComponent(projectId)}/auto-fill/pcdi`),

  getAutoFillForDutoan: (projectId: string) =>
    request<any>(`/dat-sach/project/${encodeURIComponent(projectId)}/auto-fill/dutoan`),

  getAutoFillForKHLcnt: (projectId: string) =>
    request<any>(`/dat-sach/project/${encodeURIComponent(projectId)}/auto-fill/khlcnt`),

  approveGDN: (gdnId: string) =>
    request<any>(`/dat-sach/gdn/${encodeURIComponent(gdnId)}/approve`, {
      method: 'POST',
    }),

  createPCDICoSoIn: (projectId: string, data: any) =>
    request<any>('/dat-sach/pcdi', {
      method: 'POST',
      body: JSON.stringify({ projectId, data }),
    }),

  updatePCDICoSoIn: (id: string, data: any) =>
    request<any>(`/dat-sach/pcdi/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data }),
    }),

  approvePCDI: (pcdiId: string) =>
    request<any>(`/dat-sach/pcdi/${encodeURIComponent(pcdiId)}/approve`, {
      method: 'POST',
    }),

  downloadGDNDatSach: (gdnId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/dat-sach/gdn/${encodeURIComponent(gdnId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  downloadPCDIDatSach: (pcdiId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/dat-sach/pcdi/${encodeURIComponent(pcdiId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  generateQuyetDinhDatSach: (projectId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/dat-sach/project/${encodeURIComponent(projectId)}/generate`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  markDatSachCompleted: (projectId: string) =>
    request<any>(`/dat-sach/projects/${encodeURIComponent(projectId)}/complete`, {
      method: 'PATCH',
    }),

  updateQDQuyetDinhDatSach: (projectId: string, qdData: any) =>
    request<any>(`/dat-sach/project/${encodeURIComponent(projectId)}/qd`, {
      method: 'PATCH',
      body: JSON.stringify({ qdData }),
    }),

  approveQDQuyetDinhDatSach: (projectId: string) =>
    request<any>(`/dat-sach/project/${encodeURIComponent(projectId)}/approve-qd`, {
      method: 'POST',
    }),

  downloadQDQuyetDinhDatSach: (projectId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`/api/dat-sach/project/${encodeURIComponent(projectId)}/download-qd`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // OnlyOffice preview
  getOnlyofficeConfigForGdn: (gdnId: string) =>
    request<{ onlyofficeUrl: string; editorConfig: any }>(
      `/dat-sach/gdn/${encodeURIComponent(gdnId)}/onlyoffice-config`
    ),
  getOnlyofficeConfigForPcdi: (pcdiId: string) =>
    request<{ onlyofficeUrl: string; editorConfig: any }>(
      `/dat-sach/pcdi/${encodeURIComponent(pcdiId)}/onlyoffice-config`
    ),
  getOnlyofficeConfigForQD: (projectId: string) =>
    request<{ onlyofficeUrl: string; editorConfig: any }>(
      `/dat-sach/project/${encodeURIComponent(projectId)}/onlyoffice-config`
    ),

  // ====================== Notifications ======================
  getNotifications: (page: number = 1) =>
    request<{ notifications: any[]; total: number; page: number; totalPages: number }>(`/notifications?page=${page}`),

  getUnreadCount: () =>
    request<{ count: number }>('/notifications/unread-count'),

  markNotificationRead: (id: string) =>
    request<any>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' }),

  markAllNotificationsRead: () =>
    request<any>('/notifications/read-all', { method: 'PUT' }),

  subscribePush: (subscription: { endpoint: string; p256dh: string; auth: string }) =>
    request<any>('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),

  unsubscribePush: (endpoint: string) =>
    request<any>('/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    }),

  getVapidPublicKey: () =>
    request<{ publicKey: string }>('/notifications/vapid-public-key'),

  // ========== Dynamic RBAC ==========

  // Roles
  getRoles: () => request<DynamicRole[]>('/rbac/roles'),
  getRole: (id: string) => request<RoleWithPermissions>(`/rbac/roles/${id}`),
  createRole: (data: { name: string; displayName: string; description?: string; priority?: number }) =>
    request<DynamicRole>('/rbac/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: { displayName?: string; description?: string; priority?: number; isActive?: boolean }) =>
    request<DynamicRole>(`/rbac/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRole: (id: string) => request<any>(`/rbac/roles/${id}`, { method: 'DELETE' }),
  getRoleUsers: (roleId: string) => request<any[]>(`/rbac/roles/${roleId}/users`),

  // Permissions
  getAllPermissions: () => request<Permission[]>('/rbac/permissions'),
  getPermissionsByCategory: () => request<Record<string, Permission[]>>('/rbac/permissions/categories'),
  createPermission: (data: { key: string; displayName: string; description?: string; category: string }) =>
    request<Permission>('/rbac/permissions', { method: 'POST', body: JSON.stringify(data) }),
  updatePermission: (id: string, data: { displayName?: string; description?: string; isActive?: boolean }) =>
    request<Permission>(`/rbac/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePermission: (id: string) => request<any>(`/rbac/permissions/${id}`, { method: 'DELETE' }),

  // Role-Permission mapping
  getRolePermissions: (roleId: string) => request<Permission[]>(`/rbac/roles/${roleId}/permissions`),
  setRolePermissions: (roleId: string, permissionIds: string[]) =>
    request<any>(`/rbac/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionIds }) }),

  // User-Role mapping
  getUserRoles: (userId: string) => request<DynamicRole[]>(`/rbac/users/${userId}/roles`),
  setUserRoles: (userId: string, roleIds: string[]) =>
    request<any>(`/rbac/users/${userId}/roles`, { method: 'PUT', body: JSON.stringify({ roleIds }) }),
  addUserRole: (userId: string, roleId: string) =>
    request<any>(`/rbac/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ roleId }) }),
  // ====================== Document Library ======================
  getLibraries: (organizationId?: string) =>
    request<any[]>(`/document-library/library${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`),
  getLibraryByType: (types: string[]) =>
    request<any[]>('/document-library/libraries/by-types', {
      method: 'POST',
      body: JSON.stringify({ types }),
    }),
  getSavedValues: (libraryId: string) =>
    request<any[]>(`/document-library/library/${encodeURIComponent(libraryId)}/value`),
  createSavedValue: (libraryId: string, data: { tenGiaTri: string; duLieu: Record<string, any> }) =>
    request<any>(`/document-library/library/${encodeURIComponent(libraryId)}/value`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeUserRole: (userId: string, roleId: string) =>
    request<any>(`/rbac/users/${userId}/roles/${roleId}`, { method: 'DELETE' }),
};
