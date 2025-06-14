export interface User {
  ID: number;
  UserName: string;
  EmployeeID: number;
  Password?: string;
  Active: boolean;
  CreatedBy: string;
  CreatedDate: string;
  UserAccessID: number;
  accessList: any[];
  userAccess: {
    ID: number;
    Description: string;
    Active: boolean;
    Createdby: string;
    CreatedDate: string;
    moduleAccess: any[]; // You might want to create a specific interface for this if you know its structure
  };
}
// ---------------NEW TYPES------------------
export interface UserAccess {
  id: string;
  username: string;
  accessId: string;
}

export interface DocumentType {
  id: string;
  name: string;
  code: string;
}
export interface Department {
  id: string;
  name: string;
  code: string;
}
export interface DepartmentPayload {
  name: string;
  code: string;
}
export interface Location {
  id: string;
  name: string;
  code?: string;
}

export interface Barangay extends Location {
  municipalityId: string;
}

export interface Municipality extends Location {
  regionId: string;
}

export interface Region extends Location {}

export interface LGU {
  id: string;
  code: string;
  name: string;
  tin: string;
  rdo: string;
  staddress: string;
  barangayId: string;
  municipalityId: string;
  regionId: string;
  zipcode: string;
  number: string;
  email: string;
  website: string;
  imageUrl?: string;
}

export interface DashboardStats {
  totalDocuments: number;
  totalUsers: number;
  totalDepartments: number;
  totalDocumentTypes: number;
}
