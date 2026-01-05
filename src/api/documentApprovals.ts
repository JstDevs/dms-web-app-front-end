import axios from '@/api/axios';

export type ApprovalAction = 'APPROVE' | 'REJECT';

export interface RequestApprovalResponse {
  success: boolean;
  trackingId?: number;
}

export interface ApprovalStatusLevel {
  sequenceLevel: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  actedBy?: string;
  actedAt?: string;
  comments?: string | null;
}

export interface ApprovalRequestSummary {
  id: number;
  approverId: number;
  approverName: string;
  sequenceLevel: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedDate: string;
  comments?: string | null;
}

export interface ApprovalHistoryEntry {
  id: number;
  approverId: number;
  approverName: string;
  sequenceLevel: number;
  status: 'APPROVED' | 'REJECTED';
  actedAt: string;
  comments?: string | null;
  rejectionReason?: string | null;
}

export interface ApprovalStatusResponse {
  documentId: number;
  currentLevel: number;
  totalLevels: number;
  finalStatus: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  allorMajority: 'ALL' | 'MAJORITY';
  levelsCompleted: number;
  levels: ApprovalStatusLevel[];
  pendingRequests?: ApprovalRequestSummary[];
  history?: ApprovalHistoryEntry[];
  canRequestApproval?: boolean;
  trackingId?: number;
}

export const requestDocumentApproval = async (documentId: number) => {
  const response = await axios.post<RequestApprovalResponse>(
    `/documents/${documentId}/approvals/request`,
    {},
    {
      timeout: 30000, // 30 second timeout (backend is slow)
    }
  );
  return response.data;
};

export const actOnDocumentApproval = async (
  documentId: number,
  approvalId: number,
  payload: { action: ApprovalAction; comments?: string; approverId?: number }
) => {
  // Backend expects 'status' field, not 'action'
  const status = payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const backendPayload: any = {
    status,
    comments: payload.comments || '',
    rejectionReason: payload.action === 'REJECT' ? (payload.comments || '') : '',
  };

  // Include approverId if provided
  if (payload.approverId) {
    backendPayload.approverId = payload.approverId;
  }

  console.log('Sending approval action:', { documentId, approvalId, backendPayload });

  const response = await axios.put(
    `/documents/${documentId}/approvals/${approvalId}`,
    backendPayload
  );

  console.log('Approval response:', response.data);
  return response.data;
};

export const getDocumentApprovalStatus = async (documentId: number) => {
  try {
    const response = await axios.get<ApprovalStatusResponse>(
      `/documents/${documentId}/approvals/status`
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Legacy endpoint that returns raw approval requests list
export interface LegacyApprovalRequest {
  ID: number;
  DocumentID: number;
  LinkID: string;
  RequestedBy: string;
  RequestedDate: string;
  ApproverID: number;
  ApproverName: string;
  SequenceLevel: number;
  IsCancelled: 0 | 1;
  Status: 'PENDING' | 'APPROVED' | 'REJECTED' | '1' | '0';
  ApprovalDate: string | null;
  Comments: string | null;
  RejectionReason: string | null;
}

export const fetchLegacyApprovalRequests = async (documentId: number) => {
  const response = await axios.get(`/documents/documents/${documentId}/approvals`);
  // Expecting { success: boolean, data: LegacyApprovalRequest[] }
  return response.data as { success: boolean; data: LegacyApprovalRequest[] };
};

export interface CancelApprovalResponse {
  success: boolean;
  message?: string;
}

/**
 * Cancel a document approval request
 * This will cancel all pending approval requests for the document
 */
export const cancelDocumentApproval = async (
  documentId: number,
  payload?: { reason?: string; approverId?: number }
) => {
  const backendPayload: any = {
    isCancelled: true,
  };

  if (payload?.reason) {
    backendPayload.reason = payload.reason;
  }

  if (payload?.approverId) {
    backendPayload.approverId = payload.approverId;
  }

  console.log('Cancelling approval request:', { documentId, backendPayload });

  const response = await axios.put<CancelApprovalResponse>(
    `/documents/${documentId}/approvals/cancel`,
    backendPayload
  );

  console.log('Cancel approval response:', response.data);
  return response.data;
};

