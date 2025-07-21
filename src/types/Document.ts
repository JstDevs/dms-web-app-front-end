import { User } from './User';

export type DocumentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'needs_attention';

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
// -------------------------------NEW INTERFACES----------------------------------
// TODO : MIGHT ADD IN FUTURE
export interface DocumentVersionChanges {
  FileName?: string;
  FileDate?: string;
  FileDescription?: string;
  Description?: string;
  Expiration?: boolean;
  ExpirationDate?: string;
  Confidential?: boolean;
  Remarks?: string;
  publishing_status?: string | boolean;
}
export interface DocumentVersion {
  Changes: string | DocumentVersionChanges;
  ID: number;
  DocumentID: number;
  LinkID: string;
  VersionNumber: string;
  ModificationDate: string;
  ModifiedBy: string;
  IsCurrentVersion: boolean;
  Active: boolean;
}

export interface Collaborator {
  userAccessArray: string;
  ID: number;
  EmployeeID: number;
  UserName: string;
  Password: string;
  UserAccessID: string;
  Active: boolean;
  CreatedBy: string;
  CreatedDate: string;
}

export interface DocumentActivity {
  ActivityDetails: string;
  ID: number;
  DocumentID: number;
  LinkID: string;
  CollaboratorID: number;
  DocumentCollaborationID: number;
  ActivityType: string;
  ActivityDate: string;
  Duration: number | null;
  PageViewed: number | null;
  IPAddress: string;
  DeviceInfo: string;
}

export interface DocumentCollaboration {
  ID: number;
  DocumentID: number;
  LinkID: string;
  CollaboratorID: number;
  CollaboratorName: string;
  PermissionLevel: string;
  AddedBy: string;
  AddedDate: string;
  LastActivity: string | null;
  Active: boolean;
  Collaborator: Collaborator;
  Activities: DocumentActivity[];
}

export interface AuditTrail {
  OldValues: any;
  NewValues: any;
  ChangedFields: any;
  AdditionalData: any;
  ID: number;
  DocumentID: number;
  LinkID: string;
  Action: string;
  ActionBy: number;
  ActionDate: string;
  IPAddress: string;
  UserAgent: string;
  SessionID: string | null;
  Description: string | null;
  actor: { id: number; userName: string };
}

export interface OCRDocumentReadField {
  ID: number;
  Field: string;
  Value: string;
  DocumentID: string;
  LinkId: string;
  template_id: number;
  createdAt: string;
  updatedAt: string;
  Restricted: boolean;
}

export interface NewDocument {
  ID: number;
  LinkID: string;
  DepartmentId: number;
  SubDepartmentId: number;
  DataImage: {
    type: string;
    data: number[];
  };
  DataName: string | null;
  DataType: string;
  FileName: string;
  FileDescription: string;
  Description: string;
  FileDate: string;
  Text1: string | null;
  Date1: string | null;
  Text2: string | null;
  Date2: string | null;
  Text3: string | null;
  Date3: string | null;
  Text4: string | null;
  Date4: string | null;
  Text5: string | null;
  Date5: string | null;
  Text6: string | null;
  Date6: string | null;
  Text7: string | null;
  Date7: string | null;
  Text8: string | null;
  Date8: string | null;
  Text9: string | null;
  Date9: string | null;
  Text10: string | null;
  Date10: string | null;
  Expiration: boolean;
  ExpirationDate: string;
  Confidential: boolean;
  PageCount: number | null;
  Remarks: string;
  Active: boolean;
  Createdby: string;
  CreatedDate: string;
  approvalstatus: string;
  publishing_status: boolean;
  filepath: string;
}

export interface CurrentDocument {
  document: NewDocument[];
  versions: DocumentVersion[];
  collaborations: DocumentCollaboration[];
  comments: any[];
  auditTrails: AuditTrail[];
  restrictions: any[];
  OCRDocumentReadFields: OCRDocumentReadField[];
}
export interface DocumentListType {
  documents: any[]; // Replace 'any' with your actual document type
  filteredDocs: any[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  totalDocuments: number;
  error: string | null;
}
export interface DocumentContextType {
  documentList: DocumentListType | null;
  currentDocument: CurrentDocument | null;
  loading: boolean;
  error: string | null;
  fetchDocument: (id: string) => Promise<CurrentDocument>;
  fetchDocumentList: (userId: number, page?: number) => Promise<void>;
  filterDocuments: (filterFn: (doc: any) => boolean) => void;
  updateDocument: (updatedDocument: CurrentDocument) => void;
}
