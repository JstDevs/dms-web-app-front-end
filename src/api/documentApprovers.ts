import axios from '@/api/axios';

export interface DocumentApproverRecord {
  ID: number;
  DepartmentId: number;
  SubDepartmentId: number;
  ApproverID: number;
  SequenceLevel: number;
  Active: boolean;
  ApproverName?: string;
  CreatedDate?: string;
  CreatedBy?: string;
}

export interface DocumentApproverParams {
  DepartmentId: number | string;
  SubDepartmentId: number | string;
  includeInactive?: boolean;
}

export interface UpsertDocumentApproverPayload {
  DepartmentId: number;
  SubDepartmentId: number;
  ApproverID: number;
  SequenceLevel: number;
  Active?: boolean;
}

export const listDocumentApprovers = async ({
  DepartmentId,
  SubDepartmentId,
  includeInactive,
}: DocumentApproverParams) => {
  const response = await axios.get('/document-approvers', {
    params: {
      DepartmentId,
      SubDepartmentId,
      includeInactive,
    },
  });
  return response.data as { approvers: DocumentApproverRecord[] };
};

export const createDocumentApprover = async (
  payload: UpsertDocumentApproverPayload
) => {
  const response = await axios.post('/document-approvers', payload);
  return response.data as { approver: DocumentApproverRecord };
};

export const updateDocumentApprover = async (
  id: number,
  payload: Partial<UpsertDocumentApproverPayload>
) => {
  const response = await axios.put(`/document-approvers/${id}`, payload);
  return response.data as { approver: DocumentApproverRecord };
};

export const deleteDocumentApprover = async (id: number) => {
  const response = await axios.delete(`/document-approvers/${id}`);
  return response.data as { success: boolean };
};



