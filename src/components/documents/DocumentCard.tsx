import React, { useState, useCallback, useMemo } from 'react';
import {
  Calendar,
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
} from 'lucide-react';
import { Button } from '@chakra-ui/react';
import axios from '@/api/axios';
import toast from 'react-hot-toast';
import { requestDocumentApproval, actOnDocumentApproval } from '@/api/documentApprovals';
import { useAuth } from '@/contexts/AuthContext';
import ModernModal from '@/components/ui/ModernModal';

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
}

const DocumentCard: React.FC<DocumentCardProps> = React.memo(({
  document,
  onClick,
  permissions,
  onDelete,
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
  React.useEffect(() => {
    const abortController = new AbortController();
    
    // Don't fetch if user doesn't have Collaborate permission
    // Check explicitly: if permissions exists and Collaborate is explicitly false or undefined, skip
    const hasCollaboratePermission = permissions?.Collaborate === true;
    
    if (!hasCollaboratePermission) {
      setVersionNumber(null);
      return;
    }
    
    // Note: Even with permission check, request may still return 403 if:
    // - Document belongs to different department than permissions checked
    // - User is new and permissions haven't been configured yet
    // - Backend has stricter permission checks
    // Browser console will show these 403 errors - this is normal and expected

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
          }
        } else {
          // If success is false (handled by interceptor for 403), just set version to null
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
    // Use actual approval status from API if available
    if (actualApprovalStatus === 'approved') {
      if (publishing_status) {
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200/60">
            <CheckCircle className="w-3.5 h-3.5" />
            Published
          </div>
        );
      }
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <CheckCircle className="w-3.5 h-3.5" />
          Approved
        </div>
      );
    }

    if (actualApprovalStatus === 'rejected') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
          <AlertCircle className="w-3.5 h-3.5" />
          Rejected
        </div>
      );
    }

    if (actualApprovalStatus === 'in_progress') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-sm">
          <Layers className="w-3.5 h-3.5" />
          <span className="font-medium">In Progress</span>
        </div>
      );
    }

    if (actualApprovalStatus === 'pending') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm">
          <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '2s' }} />
          <span className="font-medium">Pending Approval</span>
        </div>
      );
    }

    // Fallback to publishing_status
    if (publishing_status) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200/60">
          <CheckCircle className="w-3.5 h-3.5" />
          Published
        </div>
      );
    }

    // Default: pending approval
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm">
        <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '2s' }} />
        <span className="font-medium">Pending Approval</span>
      </div>
    );
  }, [actualApprovalStatus, publishing_status]);

  const isExpired = useMemo(() => 
    Expiration && ExpirationDate && new Date(ExpirationDate) < new Date(),
    [Expiration, ExpirationDate]
  );

  return (
    <div
      onClick={() => {
        // Don't navigate if modal is open
        if (!isDeleteModalOpen && !isRejectModalOpen) {
          onClick();
        }
      }}
      className="group relative flex flex-col h-full bg-white rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-2xl hover:border-blue-400 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Professional top accent bar with gradient - always visible */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />

      {/* Confidential Banner */}
      {Confidential && (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-4 py-1.5 text-xs font-bold rounded-lg shadow-lg z-10 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          CONFIDENTIAL
        </div>
      )}

      {/* Expiration Warning */}
      {isExpired && (
        <div className="absolute top-2 left-2 bg-orange-600 text-white px-4 py-1.5 text-xs font-bold rounded-lg shadow-lg z-10 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          EXPIRED
        </div>
      )}

      <div className="p-6 pt-10 flex flex-col h-full relative">
        {/* Document Icon Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-300 shadow-sm">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            {/* Version Badge */}
            {versionNumber ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                <Layers className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {(() => {
                    // Remove any existing 'v' or 'V' prefix and normalize
                    const cleanVersion = versionNumber.replace(/^[vV]/i, '').trim();
                    return `v${cleanVersion}`;
                  })()}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                <Layers className="w-3.5 h-3.5" />
                <span>Loading...</span>
              </div>
            )}
          </div>
          {getStatusBadge}
        </div>

        {/* Title and Description */}
        <div className="mb-5 flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-700 transition-colors duration-200 leading-tight">
            {FileName || 'Untitled Document'}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
            {FileDescription || 'No description available for this document.'}
          </p>
        </div>

        {/* Enhanced Metadata Section */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-center text-sm text-gray-700 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-lg px-3.5 py-2.5 group-hover:from-gray-100 group-hover:to-gray-100/50 transition-all duration-200 border border-gray-100">
            <div className="p-1.5 rounded-md bg-blue-50 mr-3">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">
                {(CreatedDate || FileDate)
                    ? new Date(CreatedDate || FileDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'No date'}
              </span>
            </div>
          </div>

          {Expiration && ExpirationDate && (
            <div
              className={`flex items-center text-sm rounded-lg px-3.5 py-2.5 transition-all duration-200 border ${
                isExpired 
                  ? 'bg-gradient-to-r from-red-50 to-red-50/50 group-hover:from-red-100 group-hover:to-red-100/50 border-red-200' 
                  : 'bg-gradient-to-r from-gray-50 to-gray-50/50 group-hover:from-gray-100 group-hover:to-gray-100/50 border-gray-100'
              }`}
            >
              <div className={`p-1.5 rounded-md mr-3 ${isExpired ? 'bg-red-100' : 'bg-amber-50'}`}>
                <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1">
                <span className={`font-semibold ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>Expires:</span>
                <span className={`ml-2 ${isExpired ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  {new Date(ExpirationDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions - pushed to bottom with mt-auto */}
        <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center gap-2">
            {/* Delete Button - Left Side */}
            {permissions.Delete && (
              <Button
                onClick={handleDeleteClick}
                loading={isDeleting}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center gap-2"
                loadingText="Deleting..."
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}

            {/* Right Side Actions */}
            <div className="flex justify-end gap-2 flex-wrap">
              {/* Show Approve/Reject buttons when IN_PROGRESS - enable/disable based on if user is approver */}
              {actualApprovalStatus === 'in_progress' && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    loading={isProcessing}
                    disabled={!isCurrentUserApprover || isProcessing}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    loadingText="Processing..."
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    onClick={handleRejectClick}
                    loading={isProcessing}
                    disabled={!isCurrentUserApprover || isProcessing}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    loadingText="Processing..."
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    Reject
                  </Button>
                </div>
              )}

              {/* Show Request Approval button when pending or null and not sent */}
              {(actualApprovalStatus === 'pending' || actualApprovalStatus === null || actualApprovalStatus === 'rejected') &&
                !requestSent &&
                permissions.Add &&
                permissions.Edit &&
                permissions.Delete && (
                  <Button
                    onClick={handleRequestApproval}
                    loading={isRequesting}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center gap-2"
                    loadingText="Sending..."
                  >
                    <Send className="w-4 h-4" />
                    Request Approval
                  </Button>
                )}

              {/* Status helper text */}
              {actualApprovalStatus === 'approved' && (
                <div className="text-xs text-gray-500 italic">
                  Approval completed
                </div>
              )}

              {requestSent && actualApprovalStatus !== 'in_progress' && (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-green-700 bg-green-50 rounded-lg border border-green-200 shadow-sm">
                  <CheckCircle className="w-4 h-4" />
                  Request Sent
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced professional hover overlay with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 group-hover:from-blue-50/30 group-hover:via-indigo-50/20 group-hover:to-purple-50/30 transition-all duration-300 pointer-events-none rounded-2xl" />
      
      {/* Subtle corner accent */}
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-blue-100/0 to-blue-100/0 group-hover:from-blue-100/20 group-hover:to-blue-100/10 rounded-tl-full transition-all duration-300 pointer-events-none" />

      {/* Delete Confirmation Modal */}
      <ModernModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        size="md"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 p-3 rounded-full bg-gradient-to-br from-red-100 to-red-200 shadow-lg">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Confirm Delete</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{FileName}"</span>?
            </p>
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                This will permanently remove the document and all associated data.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteModalOpen(false);
              }}
              size="sm"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-md"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteConfirm();
              }}
              loading={isDeleting}
              size="sm"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              loadingText="Deleting..."
            >
              Delete Document
            </Button>
          </div>
        </div>
      </ModernModal>

      {/* Reject Approval Modal */}
      <ModernModal 
        isOpen={isRejectModalOpen} 
        onClose={() => setIsRejectModalOpen(false)}
        size="md"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 p-3 rounded-full bg-gradient-to-br from-orange-100 to-red-200 shadow-lg">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Reject Document Approval</h3>
              <p className="text-sm text-gray-500">Please provide a reason for rejection</p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <label 
              htmlFor="reject-reason" 
              className="block text-sm font-semibold text-gray-700 mb-3"
            >
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter your reason for rejection..."
              rows={5}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all duration-200 text-gray-700 placeholder-gray-400"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              A clear reason helps document owners understand why the approval was rejected.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsRejectModalOpen(false);
                setRejectReason('');
              }}
              size="sm"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-md"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleRejectConfirm();
              }}
              loading={isProcessing}
              size="sm"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              loadingText="Rejecting..."
              disabled={!rejectReason.trim() || isProcessing}
            >
              Reject Approval
            </Button>
          </div>
        </div>
      </ModernModal>
    </div>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;
