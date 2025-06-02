export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  password?: string;
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
