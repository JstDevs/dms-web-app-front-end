export interface Restriction {
  ID: number;
  DocumentID: number;
  Field: string;
  Reason: string;
  UserID: number;
  UserRole: number;
  restrictedType: 'field' | 'open';
  xaxis: number;
  yaxis: number;
  width: number;
  height: number;
  pageNumber?: number;
  CreatedBy: string;
  CreatedDate: string;
  CollaboratorName?: string;
}

export interface RestrictionFormData {
  field: string;
  reason: string;
  userId: number | null;
  userRole: number | null;
  restrictedType: 'field' | 'open';
  pageNumber: number;
  coordinates: {
    xaxis: number;
    yaxis: number;
    width: number;
    height: number;
  };
}
