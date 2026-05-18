import { create } from 'zustand';

export type LibraryType = 'THONG_TIN_TO_CHUC' | 'THONG_TIN_NHA_THAU' | 'DIA_CHI' | 'KY_TUONG' | 'CUSTOM';
export type FieldType = 'TEXT' | 'TEXTAREA' | 'DATE' | 'MONEY' | 'NUMBER' | 'EMAIL' | 'PHONE';

export interface LibraryField {
  id: string;
  libraryId: string;
  tenTruong: string;
  khoa: string;
  kieuDuLieu: FieldType;
  giaTriMacDinh?: string;
  batBuoc: boolean;
  thuTu: number;
  nhom?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedValue {
  id: string;
  libraryId: string;
  tenGiaTri: string;
  duLieu: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Library {
  id: string;
  ten: string;
  loai: LibraryType;
  organizationId: string;
  organization?: { id: string; ten: string };
  fields?: LibraryField[];
  savedValues?: SavedValue[];
  _count?: { fields: number; savedValues: number };
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  ten: string;
  moTa?: string;
  libraries?: Library[];
  createdAt: string;
  updatedAt: string;
}

export const LIBRARY_TYPE_LABELS: Record<LibraryType, string> = {
  THONG_TIN_TO_CHUC: 'Thông tin tổ chức',
  THONG_TIN_NHA_THAU: 'Thông tin nhà thầu',
  DIA_CHI: 'Địa chỉ',
  KY_TUONG: 'Ký tượng',
  CUSTOM: 'Tuỳ chỉnh',
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Văn bản',
  TEXTAREA: 'Văn bản dài',
  DATE: 'Ngày tháng',
  MONEY: 'Tiền tệ',
  NUMBER: 'Số',
  EMAIL: 'Email',
  PHONE: 'Số điện thoại',
};

interface DocumentLibraryState {
  organizations: Organization[];
  libraries: Library[];
  activeLibrary: Library | null;
  activeOrganization: Organization | null;
  loading: boolean;

  setOrganizations: (orgs: Organization[]) => void;
  setLibraries: (libs: Library[]) => void;
  setActiveLibrary: (lib: Library | null) => void;
  setActiveOrganization: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;

  addOrganization: (org: Organization) => void;
  updateOrganization: (id: string, data: Partial<Organization>) => void;
  removeOrganization: (id: string) => void;

  addLibrary: (lib: Library) => void;
  updateLibrary: (id: string, data: Partial<Library>) => void;
  removeLibrary: (id: string) => void;
}

export const useDocumentLibraryStore = create<DocumentLibraryState>((set) => ({
  organizations: [],
  libraries: [],
  activeLibrary: null,
  activeOrganization: null,
  loading: false,

  setOrganizations: (orgs) => set({ organizations: orgs }),
  setLibraries: (libs) => set({ libraries: libs }),
  setActiveLibrary: (lib) => set({ activeLibrary: lib }),
  setActiveOrganization: (org) => set({ activeOrganization: org }),
  setLoading: (loading) => set({ loading }),

  addOrganization: (org) => set((s) => ({ organizations: [...s.organizations, org] })),
  updateOrganization: (id, data) => set((s) => ({
    organizations: s.organizations.map((o) => (o.id === id ? { ...o, ...data } : o)),
  })),
  removeOrganization: (id) => set((s) => ({
    organizations: s.organizations.filter((o) => o.id !== id),
  })),

  addLibrary: (lib) => set((s) => ({ libraries: [...s.libraries, lib] })),
  updateLibrary: (id, data) => set((s) => ({
    libraries: s.libraries.map((l) => (l.id === id ? { ...l, ...data } : l)),
    activeLibrary: s.activeLibrary?.id === id ? { ...s.activeLibrary, ...data } : s.activeLibrary,
  })),
  removeLibrary: (id) => set((s) => ({
    libraries: s.libraries.filter((l) => l.id !== id),
    activeLibrary: s.activeLibrary?.id === id ? null : s.activeLibrary,
  })),
}));
