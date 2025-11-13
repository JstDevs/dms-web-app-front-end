import axios from '@/api/axios';

export type ApprovalRule = 'ALL' | 'MAJORITY';

export interface ApprovalMatrixRecord {
  ID: number;
  DepartmentId: number;
  SubDepartmentId: number;
  AllorMajority: ApprovalRule;
  NumberofApprover?: number | null;
  Active?: boolean;
  CreatedBy?: string;
  CreatedDate?: string;
  AlteredBy?: string;
  AlteredDate?: string;
}

export interface ApprovalMatrixPayload {
  DepartmentId: number;
  SubDepartmentId: number;
  AllorMajority: ApprovalRule;
}

export interface ApprovalMatrixParams {
  DepartmentId: number | string;
  SubDepartmentId: number | string;
}

export const fetchApprovalMatrix = async ({
  DepartmentId,
  SubDepartmentId,
}: ApprovalMatrixParams) => {
  const response = await axios.get('/approvalMatrix', {
    params: {
      DepartmentId,
      SubDepartmentId,
    },
  });
  return response.data as { approvalMatrix?: ApprovalMatrixRecord | null };
};

export const createApprovalMatrix = async (payload: ApprovalMatrixPayload) => {
  const response = await axios.post('/approvalMatrix/create', payload);
  return response.data as { approvalMatrix: ApprovalMatrixRecord };
};

export const updateApprovalMatrix = async (
  id: number,
  payload: ApprovalMatrixPayload
) => {
  const response = await axios.put(`/approvalMatrix/${id}`, payload);
  return response.data as { approvalMatrix: ApprovalMatrixRecord };
};



