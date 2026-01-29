import React, { useState, useCallback, useMemo } from 'react';
import {
  Lock,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Trash2,
  FileText,
  Layers,
  XCircle,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { Button } from '@chakra-ui/react';
import axios from '@/api/axios';
import toast from 'react-hot-toast';
import { requestDocumentApproval, actOnDocumentApproval } from '@/api/documentApprovals';
import { useAuth } from '@/contexts/AuthContext';
import ModernModal from '@/components/ui/ModernModal';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';


interface DocumentCardProps {
  document: {
    ID: string;
    FileName: string;
    FileDescription: string;
    CreatedDate?: string;
    FileDate: string;
    ExpirationDate?: string;
    Confidential: boolean;
    publishing_status: boolean;
    Expiration: boolean;
  };
  onClick: () => void;
  permissions: {
    View?: boolean;
    Add?: boolean;
    Edit?: boolean;
    Delete?: boolean;
    Print?: boolean;
    Collaborate?: boolean;
  };
  onDelete?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onStatusUpdate?: (id: string, status: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = React.memo(({
  document,
  onClick,
  permissions,
  onDelete,
  selected = false,
  onSelect,
  onStatusUpdate,
}) => {
  const {
    FileName,
    FileDescription,
    CreatedDate,
    FileDate,
    ExpirationDate,
    Confidential,
    publishing_status,
    Expiration,
    ID,
  } = document;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(ID),
    data: {
      document: document
    }
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.6 : undefined,
    transition: isDragging ? 'none' : 'transform 200ms ease, box-shadow 200ms ease',
  };

  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actualApprovalStatus, setActualApprovalStatus] = useState<'approved' | 'rejected' | 'pending' | 'in_progress' | null>(null);
  const [versionNumber, setVersionNumber] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [allPendingRequests, setAllPendingRequests] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Report status back to parent whenever it changes
  React.useEffect(() => {
    if (onStatusUpdate && actualApprovalStatus) {
      onStatusUpdate(ID.toString(), actualApprovalStatus);
    }
  }, [ID, actualApprovalStatus, onStatusUpdate]);

  // Check if current user is the approver (same logic as DocumentApproval.tsx)
  // Check both the stored pendingRequest and all pending requests
  const isCurrentUserApprover = useMemo(() => {
    if (!user?.ID) return false;

    // First check if we have a stored pendingRequest
    if (pendingRequest) {
      const approverId = pendingRequest.approverId ?? pendingRequest.ApproverID;
      // Use direct comparison like DocumentApproval.tsx: request.approverId === user?.ID
      if (approverId === user.ID || Number(approverId) === Number(user.ID)) {
        return true;
      }
    }

    // Also check all pending requests (fallback)
    if (allPendingRequests.length > 0) {
      return allPendingRequests.some((req: any) => {
        const approverId = req.approverId ?? req.ApproverID;
        return approverId === user.ID || Number(approverId) === Number(user.ID);
      });
    }

    return false;
  }, [pendingRequest, allPendingRequests, user?.ID]);

  // Optimized: Fetch approval status with parallel API calls where possible
  React.useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchApprovalStatus = async () => {
      try {
        // Try the new status endpoint first (fastest path)
        const statusResponse = await axios.get(`/documents/${ID}/approvals/status`, {
          signal: abortController.signal
        }).catch((err: any) => {
          if (err?.response?.status === 404) {
            return null; // Status endpoint not available, use fallback
          }
          throw err;
        });

        if (!isMounted) return;

        if (statusResponse?.data) {
          const finalStatus = statusResponse.data.finalStatus;

          if (finalStatus === 'APPROVED') {
            setActualApprovalStatus('approved');
            setPendingRequest(null);
            setAllPendingRequests([]);
            return;
          }

          if (finalStatus === 'REJECTED') {
            setActualApprovalStatus('rejected');
            setPendingRequest(null);
            setAllPendingRequests([]);
            return;
          }

          if (finalStatus === 'IN_PROGRESS') {
            setActualApprovalStatus('in_progress');
            // Always fetch pending requests to ensure we have the latest data
            // This matches DocumentApproval.tsx which always fetches from legacy endpoint
            try {
              const pendingResp = await axios.get(`/documents/documents/${ID}/approvals`, {
                signal: abortController.signal
              });
              if (isMounted && pendingResp.data.success && pendingResp.data.data) {
                const requests = pendingResp.data.data;
                // Filter for pending requests first (same logic as DocumentApproval)
                const pendingRequests = requests.filter((req: any) => {
                  const status = req.Status;
                  const isCancelled = req.IsCancelled;
                  const hasApprovalDate = req.ApprovalDate !== null && req.ApprovalDate !== undefined;

                  // Exclude if already decided
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

                  return isPending && (isCancelled === 0 || isCancelled === false || isCancelled === '0' || isCancelled === null);
                });

                // Store all pending requests
                setAllPendingRequests(pendingRequests);

                // Find request for current user - use both direct and number comparison
                // Same comparison as DocumentApproval: req.approverId === user?.ID
                const userPendingRequest = pendingRequests.find((req: any) => {
                  const approverId = req.ApproverID;
                  // Try direct comparison first (like DocumentApproval), then number comparison
                  return approverId === user?.ID || Number(approverId) === Number(user?.ID);
                });
                setPendingRequest(userPendingRequest || null);
              }
            } catch (err) {
              if (isMounted) {
                console.warn('Failed to fetch pending requests:', err);
                setPendingRequest(null);
                setAllPendingRequests([]);
              }
            }
            return;
          }

          if (finalStatus === 'PENDING') {
            setActualApprovalStatus('pending');
            setPendingRequest(null);
            setAllPendingRequests([]);
            return;
          }
        }

        // Fallback: Only use legacy endpoint if status endpoint is not available
        const response = await axios.get(`/documents/documents/${ID}/approvals`, {
          signal: abortController.signal
        });

        if (!isMounted) return;

        if (response.data.success && response.data.data.length > 0) {
          const requests = response.data.data;
          const activeRequests = requests.filter((req: any) =>
            req.IsCancelled === 0 || req.IsCancelled === false || req.IsCancelled === '0' || req.IsCancelled === null
          );

          // Quick check: if all processed, determine status
          const allProcessed = activeRequests.every((req: any) => {
            const status = req.Status;
            const hasApprovalDate = req.ApprovalDate !== null && req.ApprovalDate !== undefined;
            return (
              status === 'APPROVED' ||
              status === 'REJECTED' ||
              status === '1' ||
              status === '0' ||
              hasApprovalDate
            );
          });

          if (allProcessed && activeRequests.length > 0) {
            // Simplified calculation - use default ALL rule for speed
            const approved = activeRequests.filter((req: any) =>
              req.Status === 'APPROVED' || req.Status === '1'
            );

            setActualApprovalStatus(approved.length === activeRequests.length ? 'approved' : 'rejected');
            setPendingRequest(null);
            setAllPendingRequests([]);
          } else {
            // Check for pending requests
            const hasPending = activeRequests.some((req: any) => {
              const status = req.Status;
              const hasApprovalDate = req.ApprovalDate !== null && req.ApprovalDate !== undefined;
              return (
                (status === 'PENDING' || status === null || status === undefined) &&
                !hasApprovalDate
              );
            });

            if (hasPending) {
              setActualApprovalStatus('in_progress');
              // Filter for pending requests first
              const pendingRequests = activeRequests.filter((req: any) =>
                (req.Status === 'PENDING' || req.Status === null || req.Status === undefined) &&
                (req.ApprovalDate === null || req.ApprovalDate === undefined)
              );
              // Store all pending requests
              setAllPendingRequests(pendingRequests);
              // Find request for current user - use both direct and number comparison
              const userPendingRequest = pendingRequests.find((req: any) => {
                return req.ApproverID === user?.ID || Number(req.ApproverID) === Number(user?.ID);
              });
              setPendingRequest(userPendingRequest || null);
            } else {
              setActualApprovalStatus('pending');
              setPendingRequest(null);
              setAllPendingRequests([]);
            }
          }
        } else {
          setActualApprovalStatus('pending');
          setPendingRequest(null);
          setAllPendingRequests([]);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || !isMounted) return;
        console.error('Failed to fetch approval status:', error);
        if (isMounted) {
          setActualApprovalStatus('pending');
        }
      }
    };

    fetchApprovalStatus();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [ID, refreshTrigger, user?.ID]);

  // Fetch document version - using same endpoint as DocumentCurrentView
  // Only fetch if user has Collaborate permission (required for analytics endpoint)
  // Note: Even with Collaborate permission, backend may return 403 if document belongs to different department
  // Browser console will show 403 errors - this is expected and cannot be disabled (browser security feature)
  // Don't fetch if user doesn't have Collaborate permission
  // Check explicitly: if permissions exists and Collaborate is explicitly false or undefined, skip
  React.useEffect(() => {
    const abortController = new AbortController();

    const hasCollaboratePermission = permissions?.Collaborate === true;

    if (!hasCollaboratePermission) {
      setVersionNumber(null);
      return;
    }

    const fetchVersion = async () => {
      try {
        const response = await axios.get(`/documents/documents/${ID}/analytics`, {
          signal: abortController.signal
        });
        // Interceptor handles 403 by returning success: false, so check for that
        if (response.data?.success && response.data?.data) {
          const documentData = response.data.data;
          // Check if versions array exists and get current version (same as DocumentCurrentView)
          if (documentData.versions && Array.isArray(documentData.versions) && documentData.versions.length > 0) {
            // Use first version like DocumentCurrentView does: document?.versions?.[0]?.VersionNumber
            const version = documentData.versions[0];
            setVersionNumber(version?.VersionNumber || null);
          } else {
            setVersionNumber(null);
          }
        } else {
          // If success is false (handled by interceptor for 403), version info unavailable
          setVersionNumber(null);
        }
      } catch (error: any) {
        // Ignore abort errors (component unmounted or effect re-run)
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          return;
        }

        // This catch block should rarely execute for 403 errors since interceptor handles them
        // But keep it as a fallback for other errors
        if (error?.response?.status === 403) {
          // Silently fail - don't log 403 errors as they're expected for new users/departments
          setVersionNumber(null);
          return;
        }
        // Only log non-403 errors
        console.error('Failed to fetch document version:', error);
        // Don't set default, leave as null if fetch fails
      }
    };

    fetchVersion();

    // Cleanup: abort request if component unmounts or effect re-runs
    return () => {
      abortController.abort();
    };
  }, [ID, permissions?.Collaborate]);

  React.useEffect(() => {
    if (actualApprovalStatus === 'rejected' && requestSent) {
      setRequestSent(false);
    }
  }, [actualApprovalStatus, requestSent]);

  const handleRequestApproval = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRequesting(true);

    try {
      // Use the same API as DocumentApproval.tsx which properly gets approvers from approval matrix
      const response = await requestDocumentApproval(Number(ID));

      if (response?.success) {
        toast.success('Approval request sent successfully!');
        setRequestSent(true);
        // Trigger a refresh of approval status after a short delay
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 1000);
      } else {
        toast.error('Unable to start approval workflow.');
      }
    } catch (error: any) {
      console.error('Error requesting approval:', error);
      const errorMsg = error?.response?.data?.message
        || error?.message
        || 'Failed to send approval request';
      toast.error(errorMsg);
    } finally {
      setIsRequesting(false);
    }
  }, [ID]);

  const handleApprove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentUserApprover || isProcessing) return;

    // Get the request to use - prefer pendingRequest, fallback to finding in allPendingRequests
    const requestToUse = pendingRequest || allPendingRequests.find((req: any) => {
      const approverId = req.approverId ?? req.ApproverID;
      return approverId === user?.ID || Number(approverId) === Number(user?.ID);
    });

    if (!requestToUse) return;

    setIsProcessing(true);
    try {
      // Handle both camelCase (id) and PascalCase (ID) from different API responses
      const requestId = requestToUse.id ?? requestToUse.ID;
      await actOnDocumentApproval(Number(ID), Number(requestId), {
        action: 'APPROVE',
        comments: '',
        approverId: user?.ID,
      });

      toast.success('Document approved successfully!');
      setPendingRequest(null);
      setAllPendingRequests([]);
      // Refresh status
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (error: any) {
      console.error('Error approving document:', error);
      const errorMsg = error?.response?.data?.message
        || error?.message
        || 'Failed to approve document';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [ID, pendingRequest, allPendingRequests, isCurrentUserApprover, user?.ID]);

  const handleRejectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentUserApprover || isProcessing) return;
    setRejectReason('');
    setIsRejectModalOpen(true);
  }, [isCurrentUserApprover, isProcessing]);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    // Get the request to use - prefer pendingRequest, fallback to finding in allPendingRequests
    const requestToUse = pendingRequest || allPendingRequests.find((req: any) => {
      const approverId = req.approverId ?? req.ApproverID;
      return approverId === user?.ID || Number(approverId) === Number(user?.ID);
    });

    if (!requestToUse) {
      setIsRejectModalOpen(false);
      return;
    }

    setIsRejectModalOpen(false);
    setIsProcessing(true);
    try {
      // Handle both camelCase (id) and PascalCase (ID) from different API responses
      const requestId = requestToUse.id ?? requestToUse.ID;
      await actOnDocumentApproval(Number(ID), Number(requestId), {
        action: 'REJECT',
        comments: rejectReason.trim(),
        approverId: user?.ID,
      });

      toast.success('Document rejected.');
      setPendingRequest(null);
      setAllPendingRequests([]);
      setRejectReason('');
      // Refresh status
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (error: any) {
      console.error('Error rejecting document:', error);
      const errorMsg = error?.response?.data?.message
        || error?.message
        || 'Failed to reject document';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [ID, pendingRequest, allPendingRequests, isCurrentUserApprover, user?.ID, rejectReason]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleteModalOpen(false);
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(ID);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, ID]);

  const getStatusBadge = useMemo(() => {
    if (actualApprovalStatus === 'approved') {
      if (publishing_status) {
        return (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-600 border border-green-100 uppercase tracking-tighter">
            <CheckCircle className="w-3 h-3" />
            PUBLISHED
          </div>
        );
      }
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-tighter">
          <CheckCircle className="w-3 h-3" />
          APPROVED
        </div>
      );
    }

    if (actualApprovalStatus === 'rejected') {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-tighter">
          <AlertCircle className="w-3 h-3" />
          REJECTED
        </div>
      );
    }

    if (actualApprovalStatus === 'in_progress') {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-tighter">
          <Layers className="w-3 h-3" />
          IN PROGRESS
        </div>
      );
    }

    // Default: pending approval
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tighter">
        <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
        PENDING
      </div>
    );
  }, [actualApprovalStatus, publishing_status]);

  const isExpired = useMemo(() =>
    Expiration && ExpirationDate && new Date(ExpirationDate) < new Date(),
    [Expiration, ExpirationDate]
  );

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-default overflow-hidden ${isDragging ? 'scale-[1.01] rotate-0 shadow-lg ring-1 ring-blue-500/30' : ''}`}
      >
        {/* Click layer for main card interactions (navigation) */}
        <div
          className="absolute inset-0 z-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleteModalOpen && !isRejectModalOpen) {
              onClick();
            }
          }}
        />

        {/* Top Decor Gradient */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

        <div className="p-4 pt-12 flex flex-col h-full relative z-10 pointer-events-none">
          {/* Top Controls Bar - Absolute but managed */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-auto z-30">
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected}
                disabled={actualApprovalStatus === 'approved' || actualApprovalStatus === 'in_progress'}
                onChange={(e) => onSelect?.(ID.toString(), e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Select ${FileName}`}
              />
            </div>

            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-md text-slate-300 hover:text-blue-600 transition-colors bg-white shadow-sm border border-slate-100"
              title="Drag here to move"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          </div>

          {/* Header Info */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              {/* Version Badge */}
              {versionNumber ? (
                <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-200">
                  V{versionNumber.replace(/^[vV]/i, '').trim()}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {getStatusBadge}

              {/* Secondary Banners as subtle badges */}
              {Confidential && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 text-[9px] font-bold uppercase">
                  <Lock className="w-2.5 h-2.5" />
                  CONFIDENTIAL
                </div>
              )}

              {isExpired && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-bold uppercase">
                  <AlertCircle className="w-2.5 h-2.5" />
                  EXPIRED
                </div>
              )}
            </div>
          </div>

          {/* Title and Description */}
          <div className="mb-4 flex-1 pointer-events-none">
            <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
              {FileName || 'Untitled Document'}
            </h3>
            <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed font-medium">
              {FileDescription || 'No description provided.'}
            </p>
          </div>

          {/* Metadata Section */}
          <div className="flex items-center justify-between py-3 border-y border-slate-100 pointer-events-none">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date Added</span>
              <span className="text-xs font-semibold text-slate-600">
                {CreatedDate ? new Date(CreatedDate).toLocaleDateString() : (FileDate ? new Date(FileDate).toLocaleDateString() : '---')}
              </span>
            </div>
            {Expiration && ExpirationDate && (
              <div className="flex flex-col text-right">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>Expiry</span>
                <span className={`text-xs font-semibold ${isExpired ? 'text-red-600' : 'text-slate-600'}`}>
                  {new Date(ExpirationDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions - Bottom */}
          <div className="mt-auto pt-4 flex flex-col gap-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              {permissions.Delete && (
                <button
                  onClick={handleDeleteClick}
                  className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[11px] font-bold transition-all border border-red-100 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              )}

              {actualApprovalStatus === 'in_progress' ? (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={!isCurrentUserApprover || isProcessing}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Approve
                  </button>
                  <button
                    onClick={handleRejectClick}
                    disabled={!isCurrentUserApprover || isProcessing}
                    className="flex-1 px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    Reject
                  </button>
                </div>
              ) : !requestSent && (actualApprovalStatus === 'rejected' || actualApprovalStatus === 'pending' || actualApprovalStatus === null) && (
                <button
                  onClick={handleRequestApproval}
                  disabled={isRequesting}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isRequesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Request Approval
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ModernModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        size="md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 p-3 rounded-full bg-red-100 shadow-lg">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Confirm Delete</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{FileName}"</span>?
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={() => setIsDeleteModalOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              loading={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </ModernModal>

      {/* Reject Approval Modal */}
      <ModernModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectReason('');
        }}
        size="md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 p-3 rounded-full bg-orange-100 shadow-lg">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Reject Approval</h3>
              <p className="text-sm text-gray-500">Provide a reason for rejection</p>
            </div>
          </div>
          <div className="mb-6">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 min-h-[120px]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectReason('');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              loading={isProcessing}
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject
            </Button>
          </div>
        </div>
      </ModernModal>
    </>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;
