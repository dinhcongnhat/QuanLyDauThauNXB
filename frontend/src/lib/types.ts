export type Role = 'ADMIN' | 'INVESTOR' | 'HEAD_OF_DEPARTMENT' | 'DIRECTOR';
export type DocType = 'TT_DUTOAN' | 'QD_DUTOAN' | 'TT_KHLCNT' | 'BC_KHLCNT' | 'QD_KHLCNT';
export type DocStatus = 'DRAFT' | 'PENDING_HEAD' | 'PENDING_DIRECTOR' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isInvestor?: boolean;
  isContractor?: boolean;
  department?: string;
  createdAt?: string;
  permissions?: string[];
  dynamicRoles?: DynamicRole[];  // NEW
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
  projectId?: string;
  createdBy: string;
  delegatedTo?: string;
  createdAt: string;
  updatedAt: string;
  creator: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  parent?: { id: string; type: DocType; data?: any; status?: DocStatus };
  children?: Document[];
  reviews?: Review[];
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
  tenGoiThau: string;
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
