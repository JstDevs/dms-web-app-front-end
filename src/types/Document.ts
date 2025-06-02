import { User } from './User';

export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'needs_attention';

export interface Version {
  id: string;
  number: number;
  createdAt: string;
  createdBy: string;
  content: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Approver {
  id: string;
  name: string;
  role: string;
  approved?: boolean;
  rejected?: boolean;
  approvedAt?: string;
  rejectedAt?: string;
  comment?: string;
}

export interface ApprovalStep {
  name: string;
  type: 'single' | 'all' | 'any';
  active: boolean;
  completed: boolean;
  completedAt: string;
  approvers: Approver[];
}

export interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface AuditEntry {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  changes: Change[];
}

export interface ActivityEntry {
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
}

export interface Document {
  id: string;
  title: string;
  type: string;
  content: string;
  description: string;
  status: DocumentStatus;
  department: string;
  createdBy: string;
  createdAt: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  lastAction: string;
  versions: Version[];
  comments: Comment[];
  collaborators: User[];
  approvalMatrix: ApprovalStep[];
  auditTrail: AuditEntry[];
  activity: ActivityEntry[];
}