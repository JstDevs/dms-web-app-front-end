export interface ModuleAccess {
  ID: number;
  UAID: number;
  ModuleID: number;
  View: boolean;
  Add: boolean;
  Edit: boolean;
  Delete: boolean;
  Print: boolean;
}

export interface UserUserAccess {
  UserID: number;
  UserAccessID: number;
  createdAt: string;
  // Add other fields if needed
}

export interface Role {
  ID: number;
  Description: string;
  Active: boolean;
  CreatedDate: string;
  Createdby: string;
  UserUserAccess: UserUserAccess;
  moduleAccess: ModuleAccess[];
}
