export type Role = 'ADMIN' | 'USER';
export type DocType = 'TT_DUTOAN' | 'QD_DUTOAN' | 'TT_KHLCNT' | 'BC_KHLCNT' | 'QD_KHLCNT';
export type DocStatus = 'DRAFT' | 'COMPLETED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  canApprove?: boolean;
  canFinalApprove?: boolean;
  isInvestor?: boolean;
  isContractor?: boolean;
  department?: string;
  position?: string;  // NEW: Chức vụ
  createdAt?: string;
  permissions?: string[];
  dynamicRoles?: DynamicRole[];
}

export interface Review {
  id: string;
  documentId: string;
  userId: string;
  action: string;
  comment?: string;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'role'>;
}

export interface Document {
  id: string;
  type: DocType;
  status: DocStatus;
  data: any;
  parentId?: string;
  sourceDocumentId?: string;
  projectId?: string;
  procurementType?: string;
  createdBy: string;
  assignedTo?: string;
  delegatedTo?: string;
  createdAt: string;
  updatedAt: string;
  creator: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  parent?: { id: string; type: DocType; data?: any; status?: DocStatus };
  sourceDocument?: {
    id: string;
    type: DocType;
    data?: any;
    status?: DocStatus;
  };
  project?: {
    id: string;
    tenDuAn: string;
    procurementType: string;
    status?: string;
  };
  children?: Document[];
  reviews?: Review[];
}

export interface LegalBasisSelectionValue {
  legalDocumentId: string | null;
  source: 'LIBRARY' | 'MANUAL';
  citationSnapshot: string;
}

export interface ProcurementPackage {
  id: string;
  tenGoiThau: string;
  giaDuToanGoiThau: string;
  ghiChu: string;
  congViec: string;
  nguonVon: string;
  hinhThucLuaChonNhaThau: string;
  phuongThucLuaChonNhaThau: string;
  thoiGianToChucLuaChonNhaThau: string;
  thoiGianBatDauToChucLuaChonNhaThau: string;
  loaiHopDong: string;
  thoiGianThucHienGoiThau: string;
  tuyChonMuaThem: string;
}

export interface KhaiToanAttachment {
  objectPath: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface DashboardStats {
  docStats: { type: DocType; status: DocStatus; _count: { id: number } }[];
  recentReviews: (Review & { document: { id: string; type: DocType; status: DocStatus } })[];
}

export interface RolePermission {
  id: string;
  role: Role;
  permissionKey: string;
}

export type ProcurementMethod = 'CHI_DINH_THAU' | 'CHAO_HANG_CANH_TRANH' | 'DAU_THAU_RONG_RAI';
export type StepApprovalStatus = 'NO_APPROVAL_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface StepApprovalRequest {
  id: string;
  stepId: string;
  userId: string;
  action: string;
  comment?: string;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'role'>;
}

export interface ProcurementStep {
  id: string;
  contractorSelectionId: string;
  stepKey: string;
  stepOrder: number;
  title: string;
  status: string;
  data?: any;
  attachmentPath?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Approval fields
  requiresApproval: boolean;
  approvalStatus: StepApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  approverRole?: string;
  approvalComment?: string;
  approvalRequests?: StepApprovalRequest[];
}

export interface ContractorSelection {
  id: string;
  qdKhlcntId: string;
  goiThauIndex: number;
  packageId?: string;
  tenGoiThau: string;
  soHopDong?: string;
  ngayKyHopDong?: string;
  procurementMethod: ProcurementMethod;
  data?: any;
  createdBy: string;
  projectId?: string;
  project?: { id: string; tenDuAn: string; procurementType: string; status: string };
  creator?: Pick<User, 'id' | 'name' | 'role'>;
  steps: ProcurementStep[];
  qdKhlcnt?: { id: string; data: any; status: string };
  createdAt: string;
  updatedAt: string;
}

// ========== Dynamic RBAC Types ==========

export interface DynamicRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  permissions?: Permission[];
  _count?: { userRoles: number };
}

export interface Permission {
  id: string;
  key: string;
  displayName: string;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt?: string;
}

export interface RoleWithPermissions extends DynamicRole {
  permissions: Permission[];
}

export interface UserWithDynamicRoles extends User {
  dynamicRoles: DynamicRole[];
}

export type DossierWorkflowType =
  | 'DU_TOAN'
  | 'KHLCNT'
  | 'DAT_SACH'
  | 'LCNT_QD_HSMT'
  | 'LCNT_QD_KQLCNT'
  | 'LCNT_QD_LCNT';

export type DossierStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'REWORK'
  | 'APPROVED'
  | 'CANCELLED';

export interface ApprovalDossierItem {
  id: string;
  itemKey: string;
  label: string;
  kind: string;
  source: 'FORM' | 'FILE' | 'ENTITY_REFERENCE';
  data: Record<string, any>;
  objectPath?: string | null;
  renderedOverridePath?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  required: boolean;
  editable: boolean;
  version: number;
}

export interface ApprovalDossier {
  id: string;
  workflowType: DossierWorkflowType;
  status: DossierStatus;
  version: number;
  title: string;
  projectId?: string | null;
  createdBy: string;
  currentHandlerId?: string | null;
  items: ApprovalDossierItem[];
  revisions: any[];
  requests: any[];
  activeRequestId?: string | null;
  actions: {
    canEdit: boolean;
    canSubmit: boolean;
    canForward: boolean;
    canFinalApprove: boolean;
    canReject: boolean;
    canReturn: boolean;
  };
}
