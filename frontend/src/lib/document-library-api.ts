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

export const docLibraryApi = {
  // Organization
  getOrganizations: () => request<any[]>('/document-library/organization'),
  getOrganization: (id: string) => request<any>(`/document-library/organization/${encodeURIComponent(id)}`),
  createOrganization: (data: { ten: string; moTa?: string }) =>
    request<any>('/document-library/organization', { method: 'POST', body: JSON.stringify(data) }),
  updateOrganization: (id: string, data: { ten?: string; moTa?: string }) =>
    request<any>(`/document-library/organization/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrganization: (id: string) =>
    request<any>(`/document-library/organization/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Library
  getLibraries: (organizationId?: string) =>
    request<any[]>(`/document-library/library${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`),
  getLibrariesByTypes: (types: string[]) =>
    request<any[]>('/document-library/libraries/by-types', { method: 'POST', body: JSON.stringify({ types }) }),
  getLibrary: (id: string) =>
    request<any>(`/document-library/library/${encodeURIComponent(id)}`),
  createLibrary: (data: { ten: string; loai: string; organizationId: string }) =>
    request<any>('/document-library/library', { method: 'POST', body: JSON.stringify(data) }),
  updateLibrary: (id: string, data: { ten?: string; loai?: string }) =>
    request<any>(`/document-library/library/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLibrary: (id: string) =>
    request<any>(`/document-library/library/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Fields
  getLibraryFields: (libraryId: string) =>
    request<any[]>(`/document-library/library/${encodeURIComponent(libraryId)}/fields`),
  createField: (libraryId: string, data: {
    tenTruong: string; khoa: string; kieuDuLieu: string;
    giaTriMacDinh?: string; batBuoc?: boolean; thuTu?: number; nhom?: string;
  }) =>
    request<any>(`/document-library/library/${encodeURIComponent(libraryId)}/field`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateField: (libraryId: string, fieldId: string, data: {
    tenTruong?: string; khoa?: string; kieuDuLieu?: string;
    giaTriMacDinh?: string; batBuoc?: boolean; thuTu?: number; nhom?: string;
  }) =>
    request<any>(`/document-library/library/${encodeURIComponent(libraryId)}/field/${encodeURIComponent(fieldId)}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  deleteField: (libraryId: string, fieldId: string) =>
    request<any>(`/document-library/library/${encodeURIComponent(libraryId)}/field/${encodeURIComponent(fieldId)}`, {
      method: 'DELETE',
    }),

  // Saved Values
  getSavedValues: (libraryId: string) =>
    request<any[]>(`/document-library/library/${encodeURIComponent(libraryId)}/value`),
  saveValue: (libraryId: string, data: { tenGiaTri: string; duLieu: Record<string, any> }) =>
    request<any>(`/document-library/library/${encodeURIComponent(libraryId)}/value`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateValue: (libraryId: string, valueId: string, data: { tenGiaTri?: string; duLieu?: Record<string, any> }) =>
    request<any>(`/document-library/library/${encodeURIComponent(libraryId)}/value/${encodeURIComponent(valueId)}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  deleteValue: (libraryId: string, valueId: string) =>
    request<any>(`/document-library/library/${encodeURIComponent(libraryId)}/value/${encodeURIComponent(valueId)}`, {
      method: 'DELETE',
    }),
};
