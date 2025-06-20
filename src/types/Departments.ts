// SubDepartment Types

export interface SubDepartment {
  ID: number;
  Code: string;
  Name: string;
  Active: boolean;
  CreatedBy: string | null;
  CreatedDate: string;
  ModifyBy: string | null;
  ModifyDate: string | null;
  DepartmentID: number;
}

// Department Types
export interface Department {
  ID: number;
  Code: string;
  Name: string;
  Active: boolean;
  CreatedBy: string;
  CreatedDate: string;
  ModifyBy: string | null;
  ModifyDate: string | null;
  SubDepartments?: SubDepartment[];
}
