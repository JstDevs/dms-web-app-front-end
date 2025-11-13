import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { CurrentDocument } from '@/types/Document';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserCircle,
  MessageSquare,
  Loader2,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/api/axios';
import {
  requestDocumentApproval,
  actOnDocumentApproval,
  getDocumentApprovalStatus,
  ApprovalStatusResponse,
  ApprovalRequestSummary,
  ApprovalHistoryEntry,
  fetchLegacyApprovalRequests,
} from '@/api/documentApprovals';
import { listDocumentApprovers } from '@/api/documentApprovers';
import { useUsers } from '@/pages/Users/useUser';

interface DocumentApprovalProps {
  document: CurrentDocument | null;
  onRefresh?: () => void;
}

type CommentsState = Record<number, string>;

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  'IN_PROGRESS': 'bg-blue-100 text-blue-800',
};

const statusIcons: Record<string, JSX.Element> = {
  PENDING: <Clock className="h-4 w-4 mr-1" />,
  APPROVED: <CheckCircle className="h-4 w-4 mr-1" />,
  REJECTED: <XCircle className="h-4 w-4 mr-1" />,
  IN_PROGRESS: <Layers className="h-4 w-4 mr-1" />,
};

const DocumentApproval: React.FC<DocumentApprovalProps> = ({
  document,
  onRefresh,
}) => {
  const documentId = document?.document?.[0]?.ID ?? null;
  const { user } = useAuth();
  const { users } = useUsers();
  const [status, setStatus] = useState<ApprovalStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [comments, setComments] = useState<CommentsState>({});
  
  // Create a map of approver ID to name from users and approval matrix
  const approverNameMap = useMemo(() => {
    const map = new Map<number, string>();
    
    // First, add all users to the map
    users.forEach((u) => {
      map.set(u.ID, u.UserName);
    });
    
    return map;
  }, [users]);

  const pendingRequests = status?.pendingRequests ?? [];
  const historyEntries = status?.history ?? [];
  
  // Filter out requests that are already in history (safety check)
  const activePendingRequests = useMemo(() => {
    const historyIds = new Set(historyEntries.map((h) => h.id));
    return pendingRequests.filter((req) => !historyIds.has(req.id));
  }, [pendingRequests, historyEntries]);

  const showMessage = (message: string, isError = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 5000); // Increased to 5 seconds for better visibility
    }
  };

  const loadStatus = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    
    // Fetch approval matrix approvers to get correct approver names
    let matrixApproversMap = new Map<number, string>();
    if (document?.document?.[0]) {
      try {
        const deptId = document.document[0].DepartmentId;
        const subDeptId = document.document[0].SubDepartmentId;
        if (deptId && subDeptId) {
          const approversResponse = await listDocumentApprovers({
            DepartmentId: deptId,
            SubDepartmentId: subDeptId,
          });
          
          // Create a map of approver ID to name from approval matrix
          approversResponse?.approvers?.forEach((approver) => {
            if (approver.ApproverID && approver.Active !== false) {
              // Use ApproverName from matrix if available, otherwise lookup from users
              const name = approver.ApproverName || approverNameMap.get(approver.ApproverID);
              if (name) {
                matrixApproversMap.set(approver.ApproverID, name);
              }
            }
          });
        }
      } catch (error) {
        console.warn('Failed to fetch approval matrix approvers:', error);
      }
    }
    
    // Helper function to get approver name from matrix or users map
    const getApproverName = (approverId: number, fallbackName?: string): string => {
      return matrixApproversMap.get(approverId) || 
             approverNameMap.get(approverId) || 
             fallbackName || 
             `User ${approverId}`;
    };
    
    try {
      const response = await getDocumentApprovalStatus(documentId);
      
      // Always try legacy endpoint to get the most up-to-date data
      try {
        const legacy = await fetchLegacyApprovalRequests(documentId);
        const raw = (legacy as any);
        const rows: any[] = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.approvals)
              ? raw.approvals
              : Array.isArray(raw?.result)
                ? raw.result
                : [];
        
        if (rows.length > 0) {
          const pending = rows
            .filter((r) => {
              const status = r.Status;
              const isCancelled = r.IsCancelled;
              const hasApprovalDate = r.ApprovalDate !== null && r.ApprovalDate !== undefined;
              
              // Exclude if already decided (has ApprovalDate or status is APPROVED/REJECTED)
              const isDecided = 
                hasApprovalDate ||
                status === 'APPROVED' ||
                status === 'REJECTED' ||
                status === '1' ||
                status === '0';
              
              // Only include if truly pending and not cancelled
              const isPending =
                (status === 'PENDING' ||
                status === 'Pending' ||
                status === 'pending' ||
                status === null ||
                status === undefined) &&
                !isDecided;
              
              return isPending && (isCancelled === 0 || isCancelled === false || isCancelled === '0');
            })
            .map<ApprovalRequestSummary>((r) => ({
              id: Number(r.ID),
              approverId: Number(r.ApproverID),
              approverName: getApproverName(Number(r.ApproverID), r.ApproverName),
              sequenceLevel: Number(r.SequenceLevel ?? 1),
              status: 'PENDING',
              requestedDate: r.RequestedDate,
              comments: r.Comments ?? undefined,
            }));

          const history = rows
            .filter((r) => {
              const status = r.Status;
              const isCancelled = r.IsCancelled;
              const isProcessed = 
                status === 'APPROVED' || 
                status === 'REJECTED' || 
                status === '1' || 
                status === '0' ||
                (r.ApprovalDate !== null && r.ApprovalDate !== undefined);
              return isProcessed && (isCancelled === 0 || isCancelled === false || isCancelled === '0');
            })
            .map<ApprovalHistoryEntry>((r) => ({
              id: Number(r.ID),
              approverId: Number(r.ApproverID),
              approverName: getApproverName(Number(r.ApproverID), r.ApproverName),
              sequenceLevel: Number(r.SequenceLevel ?? 1),
              status: (r.Status === 'APPROVED' || r.Status === '1') ? 'APPROVED' : 'REJECTED',
              actedAt: r.ApprovalDate ?? r.RequestedDate,
              comments: r.Comments ?? undefined,
              rejectionReason: r.RejectionReason ?? undefined,
            }));

          // Get rule from status endpoint, or try to fetch from approval matrix
          let rule: 'ALL' | 'MAJORITY' = response?.allorMajority ?? 'ALL';
          
          // If rule not in status response, try to get from approval matrix
          if (!response?.allorMajority && document?.document?.[0]) {
            try {
              const deptId = document.document[0].DepartmentId;
              const subDeptId = document.document[0].SubDepartmentId;
              if (deptId && subDeptId) {
                const matrixResponse = await axios.get('/approvalMatrix', {
                  params: { DepartmentId: deptId, SubDepartmentId: subDeptId }
                });
                if (matrixResponse.data?.approvalMatrix?.AllorMajority) {
                  rule = matrixResponse.data.approvalMatrix.AllorMajority;
                }
              }
            } catch {
              // Rule not available, use default
            }
          }
          
          const totalLevels = response?.totalLevels ?? Math.max(1, ...rows.map((x: any) => Number(x.SequenceLevel ?? 1)));
          
          let calculatedFinalStatus: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' = 'PENDING';
          
          if (pending.length === 0 && history.length > 0) {
            // All levels completed - calculate final status based on rule
            if (rule === 'ALL') {
              // ALL rule: all levels must be APPROVED
              const allApproved = history.every((h) => h.status === 'APPROVED');
              calculatedFinalStatus = allApproved ? 'APPROVED' : 'REJECTED';
            } else if (rule === 'MAJORITY') {
              // MAJORITY rule: count approvals vs rejections
              const approvedCount = history.filter((h) => h.status === 'APPROVED').length;
              const rejectedCount = history.filter((h) => h.status === 'REJECTED').length;
              calculatedFinalStatus = approvedCount > rejectedCount ? 'APPROVED' : 'REJECTED';
            }
          } else if (pending.length > 0) {
            calculatedFinalStatus = 'IN_PROGRESS';
          }
          
          // Merge with status API response if available, otherwise use legacy data
          // Update approver names in response if they exist
          const updatedPendingRequests = response?.pendingRequests?.length 
            ? response.pendingRequests.map(req => ({
                ...req,
                approverName: getApproverName(req.approverId, req.approverName)
              }))
            : pending;
            
          const updatedHistory = response?.history?.length
            ? response.history.map(entry => ({
                ...entry,
                approverName: getApproverName(entry.approverId, entry.approverName)
              }))
            : history;
          
          setStatus({
            documentId: documentId,
            currentLevel: response?.currentLevel ?? (pending[0]?.sequenceLevel ?? 1),
            totalLevels,
            finalStatus: response?.finalStatus ?? calculatedFinalStatus,
            allorMajority: rule,
            levelsCompleted: response?.levelsCompleted ?? history.length,
            levels: response?.levels ?? [],
            pendingRequests: updatedPendingRequests,
            history: updatedHistory,
            canRequestApproval: response?.canRequestApproval ?? false,
            trackingId: response?.trackingId,
          });
        } else if (response) {
          // Update approver names in response if they exist
          const updatedResponse = {
            ...response,
            pendingRequests: response.pendingRequests?.map(req => ({
              ...req,
              approverName: getApproverName(req.approverId, req.approverName)
            })),
            history: response.history?.map(entry => ({
              ...entry,
              approverName: getApproverName(entry.approverId, entry.approverName)
            }))
          };
          setStatus(updatedResponse);
        } else {
          setStatus(null);
        }
      } catch (legacyError) {
        // If legacy fails, use status API response if available
        if (response) {
          // Update approver names in response if they exist
          const updatedResponse = {
            ...response,
            pendingRequests: response.pendingRequests?.map(req => ({
              ...req,
              approverName: getApproverName(req.approverId, req.approverName)
            })),
            history: response.history?.map(entry => ({
              ...entry,
              approverName: getApproverName(entry.approverId, entry.approverName)
            }))
          };
          setStatus(updatedResponse);
        } else {
          setStatus(null);
        }
      }
    } catch (error) {
      console.error('Failed to load approval status', error);
      showMessage(
        'Failed to load approval status. Please try again.',
        true
      );
    } finally {
      setLoading(false);
    }
  }, [documentId, document, approverNameMap]);

  useEffect(() => {
    if (documentId) {
      loadStatus();
    }
  }, [documentId, loadStatus]);

  const totalApproved = useMemo(() => {
    return historyEntries.filter((entry) => entry.status === 'APPROVED')
      .length;
  }, [historyEntries]);

  const totalRejected = useMemo(() => {
    return historyEntries.filter((entry) => entry.status === 'REJECTED')
      .length;
  }, [historyEntries]);

  const handleRequestApproval = async () => {
    if (!documentId) return;
    setRequesting(true);
    try {
      const response = await requestDocumentApproval(documentId);
      if (response?.success) {
        showMessage('Approval request initiated.');
        await loadStatus();
        onRefresh?.();
      } else {
        showMessage('Unable to start approval workflow.', true);
      }
    } catch (error) {
      console.error('Failed to request approval', error);
      showMessage('Failed to request approval. Please try again.', true);
    } finally {
      setRequesting(false);
    }
  };

  const updateComment = (requestId: number, value: string) => {
    setComments((prev) => ({
      ...prev,
      [requestId]: value,
    }));
  };

  const handleAction = async (
    request: ApprovalRequestSummary,
    action: 'APPROVE' | 'REJECT'
  ) => {
    if (!documentId) return;
    if (processingId) return;
    if (action === 'REJECT' && !comments[request.id]?.trim()) {
      showMessage('Please provide a reason for rejection.', true);
      return;
    }

    setProcessingId(request.id);
    try {
      await actOnDocumentApproval(documentId, request.id, {
        action,
        comments: comments[request.id]?.trim(),
        approverId: user?.ID,
      });
      
      // Show success message
      const successMsg = action === 'APPROVE'
        ? `✅ Level ${request.sequenceLevel} approved successfully!`
        : `❌ Level ${request.sequenceLevel} rejected.`;
      showMessage(successMsg);
      
      // Clear comment for this request
      setComments((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
      
      // Force refresh - wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadStatus();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to submit approval action', error);
      const errorMsg = error?.response?.data?.message 
        || error?.message 
        || 'Action failed. Please try again.';
      showMessage(`Failed: ${errorMsg}`, true);
    } finally {
      setProcessingId(null);
    }
  };

  if (!documentId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500">
        Document information unavailable.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const finalStatus = status?.finalStatus ?? 'PENDING';
  const statusLabel =
    finalStatus.charAt(0) + finalStatus.slice(1).toLowerCase();
  const badgeClasses =
    statusColors[finalStatus] ?? 'bg-gray-100 text-gray-800';
  const statusIcon = statusIcons[finalStatus] ?? (
    <Clock className="h-4 w-4 mr-1" />
  );

  const canRequestApproval =
    status?.canRequestApproval ??
    (finalStatus === 'PENDING' ||
      finalStatus === 'REJECTED' ||
      !status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Document Approvals
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Track approval progress and perform actions for this document.
        </p>
      </div>

      {successMessage && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm text-green-700">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600" />
          <span className="text-sm text-red-700">{errorMessage}</span>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeClasses}`}
            >
              {statusIcon}
              {statusLabel.replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-600">
              Rule: <strong>{status?.allorMajority ?? '—'}</strong> | Levels:{' '}
              <strong>
                {status ? `${status.currentLevel}/${status.totalLevels}` : '—'}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleRequestApproval}
            disabled={!canRequestApproval || requesting}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {requesting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {requesting ? 'Submitting...' : 'Request Approval'}
          </button>
        </div>

        {!status && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            No approval tracking found yet. Start the process to begin routing
            approvals.
          </div>
        )}
      </div>

      {status && Array.isArray(status.levels) && (
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Level Progress
          </h3>
          {status.levels.length ? (
            <div className="space-y-3">
              {status.levels.map((level) => {
                const levelBadge =
                  statusColors[level.status] ??
                  'bg-gray-100 text-gray-800';
                const levelIcon =
                  statusIcons[level.status] ?? (
                    <Clock className="h-4 w-4 mr-1" />
                  );
                return (
                  <div
                    key={level.sequenceLevel}
                    className="border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          Level {level.sequenceLevel}
                        </p>
                        <p className="text-xs text-gray-500">
                          {level.status === 'PENDING'
                            ? 'Awaiting decision'
                            : `Decision recorded ${formatDateTime(
                                level.actedAt
                              )}`}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${levelBadge}`}
                      >
                        {levelIcon}
                        {level.status}
                      </span>
                    </div>
                    {level.actedBy && (
                      <div className="mt-2 text-xs text-gray-600">
                        Action taken by <strong>{level.actedBy}</strong>
                      </div>
                    )}
                    {level.comments && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                        “{level.comments}”
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-500 text-center">
              No approval levels configured for this document.
            </div>
          )}
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Pending Requests
          </h3>
          <span className="text-sm text-gray-600">
            {activePendingRequests.length} awaiting decision
          </span>
        </div>

        {activePendingRequests.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
            No pending approval requests at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {activePendingRequests.map((request) => {
              // Use both direct and number comparison to handle type differences
              const isCurrentUser = request.approverId === user?.ID || Number(request.approverId) === Number(user?.ID);
              const requestBadge =
                statusColors[request.status] ??
                'bg-gray-100 text-gray-800';
              const requestIcon =
                statusIcons[request.status] ?? (
                  <Clock className="h-4 w-4 mr-1" />
                );
              return (
                <div
                  key={request.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                        <UserCircle className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">
                          Level {request.sequenceLevel}: {request.approverName}
                        </h4>
                        <p className="text-xs text-gray-600">
                          Requested on {formatDateTime(request.requestedDate)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${requestBadge}`}
                    >
                      {requestIcon}
                      {request.status}
                    </span>
                  </div>

                  {request.comments && (
                    <div className="mb-3 p-3 bg-white border border-yellow-100 rounded-md text-sm text-gray-700">
                      <p className="font-medium text-yellow-800 mb-1">
                        Request note
                      </p>
                      <p>{request.comments}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none transition-all"
                      rows={3}
                      placeholder={
                        isCurrentUser
                          ? 'Add comments (required for rejection)'
                          : 'Only the assigned approver can act on this request.'
                      }
                      value={comments[request.id] ?? ''}
                      onChange={(e) =>
                        updateComment(request.id, e.target.value)
                      }
                      disabled={!isCurrentUser || processingId === request.id}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAction(request, 'APPROVE')}
                        disabled={!isCurrentUser || processingId === request.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {processingId === request.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        {processingId === request.id
                          ? 'Processing...'
                          : 'Approve'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(request, 'REJECT')}
                        disabled={!isCurrentUser || processingId === request.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {processingId === request.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        {processingId === request.id
                          ? 'Processing...'
                          : 'Reject'}
                      </button>
                      {!isCurrentUser && (
                        <p className="text-xs text-gray-500">
                          Awaiting action from the assigned approver.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Approval History
          </h3>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md">
              <CheckCircle className="h-4 w-4 mr-1" />
              {totalApproved} Approved
            </span>
            <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-md">
              <XCircle className="h-4 w-4 mr-1" />
              {totalRejected} Rejected
            </span>
          </div>
        </div>

        {historyEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MessageSquare size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">
              No approval decisions have been recorded yet.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Decisions will appear here as levels complete.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyEntries.map((entry) => {
              const historyBadge =
                statusColors[entry.status] ??
                'bg-gray-100 text-gray-800';
              const historyIcon =
                statusIcons[entry.status] ?? (
                  <Clock className="h-4 w-4 mr-1" />
                );
              return (
                <div
                  key={entry.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          entry.status === 'APPROVED'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-red-500 to-pink-500'
                        }`}
                      >
                        <UserCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          Level {entry.sequenceLevel}: {entry.approverName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Decided on {formatDateTime(entry.actedAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${historyBadge}`}
                    >
                      {historyIcon}
                      {entry.status}
                    </span>
                  </div>

                  {(entry.comments || entry.rejectionReason) && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        {entry.status === 'APPROVED'
                          ? 'Comment'
                          : 'Reason for rejection'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {entry.comments ?? entry.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentApproval;
