import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@chakra-ui/react';
import axios from '@/api/axios';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

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

  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actualApprovalStatus, setActualApprovalStatus] = useState<'approved' | 'rejected' | 'pending' | null>(null);
  const [versionNumber, setVersionNumber] = useState<string | null>(null);
  const { user: loggedUser } = useAuth();

  // Fetch actual approval status from approval status endpoint
  React.useEffect(() => {
    const fetchApprovalStatus = async () => {
      try {
        // Try the new status endpoint first
        try {
          const statusResponse = await axios.get(`/documents/${ID}/approvals/status`);
          if (statusResponse.data) {
            const finalStatus = statusResponse.data.finalStatus;
            console.log('DocumentCard status endpoint response:', {
              finalStatus,
              allorMajority: statusResponse.data.allorMajority,
              currentLevel: statusResponse.data.currentLevel,
              totalLevels: statusResponse.data.totalLevels,
              levelsCompleted: statusResponse.data.levelsCompleted
            });
            
            if (finalStatus === 'APPROVED') {
              setActualApprovalStatus('approved');
              return;
            } else if (finalStatus === 'REJECTED') {
              setActualApprovalStatus('rejected');
              return;
            } else if (finalStatus === 'IN_PROGRESS' || finalStatus === 'PENDING') {
              setActualApprovalStatus('pending');
              return;
            }
          }
        } catch (statusError: any) {
          // If status endpoint returns 404, fall back to legacy endpoint
          if (statusError?.response?.status !== 404) {
            console.error('Failed to fetch approval status:', statusError);
          }
        }

        // Fallback to legacy endpoint
        const response = await axios.get(`/documents/documents/${ID}/approvals`);
        if (response.data.success && response.data.data.length > 0) {
          const requests = response.data.data;
          
          // Get rule from status endpoint or try to fetch from document's approval matrix
          let rule: 'ALL' | 'MAJORITY' = 'ALL';
          try {
            const statusResp = await axios.get(`/documents/${ID}/approvals/status`);
            if (statusResp.data?.allorMajority) {
              rule = statusResp.data.allorMajority;
            } else if (statusResp.data?.finalStatus === 'REJECTED' || statusResp.data?.finalStatus === 'APPROVED') {
              // If finalStatus is set, use it directly
              setActualApprovalStatus(statusResp.data.finalStatus.toLowerCase() as 'approved' | 'rejected');
              return;
            }
          } catch {
            // Try to get rule from document details and approval matrix
            try {
              const docResponse = await axios.get(`/documents/documents/${ID}`);
              if (docResponse.data?.success && docResponse.data?.data?.document?.[0]) {
                const doc = docResponse.data.data.document[0];
                if (doc.DepartmentId && doc.SubDepartmentId) {
                  const matrixResp = await axios.get('/approvalMatrix', {
                    params: { DepartmentId: doc.DepartmentId, SubDepartmentId: doc.SubDepartmentId }
                  });
                  if (matrixResp.data?.approvalMatrix?.AllorMajority) {
                    rule = matrixResp.data.approvalMatrix.AllorMajority;
                  }
                }
              }
            } catch {
              // Rule not available, use default
            }
          }
          
          // Filter out cancelled requests
          const activeRequests = requests.filter((req: any) => 
            req.IsCancelled === 0 || req.IsCancelled === false || req.IsCancelled === '0' || req.IsCancelled === null
          );
          
          // Check final status: if all levels are completed, determine final status
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
            // All levels completed - calculate final status based on rule
            const rejected = activeRequests.filter((req: any) => {
              const status = req.Status;
              return status === 'REJECTED' || status === '0' || 
                     (status === 'PENDING' && req.ApprovalDate && req.RejectionReason);
            });
            const approved = activeRequests.filter((req: any) => {
              const status = req.Status;
              return status === 'APPROVED' || status === '1';
            });
            
            console.log('DocumentCard approval calculation:', {
              rule,
              total: activeRequests.length,
              approved: approved.length,
              rejected: rejected.length,
              requests: activeRequests.map((r: any) => ({ id: r.ID, status: r.Status, level: r.SequenceLevel }))
            });
            
            if (rule === 'ALL') {
              // ALL rule: all levels must be APPROVED
              setActualApprovalStatus(approved.length === activeRequests.length ? 'approved' : 'rejected');
            } else if (rule === 'MAJORITY') {
              // MAJORITY rule: count approvals vs rejections
              setActualApprovalStatus(approved.length > rejected.length ? 'approved' : 'rejected');
            } else {
              // Fallback: any rejection means rejected
              setActualApprovalStatus(rejected.length > 0 ? 'rejected' : 'approved');
            }
          } else {
            // Still in progress
            setActualApprovalStatus('pending');
          }
        } else {
          setActualApprovalStatus('pending');
        }
      } catch (error) {
        console.error('Failed to fetch approval status:', error);
        setActualApprovalStatus('pending');
      }
    };

    fetchApprovalStatus();
  }, [ID]);

  // Fetch document version - using same endpoint as DocumentCurrentView
  React.useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await axios.get(`/documents/documents/${ID}/analytics`);
        if (response.data.success && response.data.data) {
          const documentData = response.data.data;
          // Check if versions array exists and get current version (same as DocumentCurrentView)
          if (documentData.versions && Array.isArray(documentData.versions) && documentData.versions.length > 0) {
            // Use first version like DocumentCurrentView does: document?.versions?.[0]?.VersionNumber
            const version = documentData.versions[0];
            setVersionNumber(version?.VersionNumber || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch document version:', error);
        // Don't set default, leave as null if fetch fails
      }
    };

    fetchVersion();
  }, [ID]);

  const handleRequestApproval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRequesting(true);

    try {
      const response = await axios.post(
        `/documents/documents/${ID}/approvals`,
        {
          requestedBy: loggedUser?.ID,
          approverId: '1',
          approverName: loggedUser?.UserName,
          dueDate: '',
          comments: 'Please approve this document',
        }
      );

      if (response.data.success) {
        toast.success('Approval request sent successfully!');
        setRequestSent(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error requesting approval:', error);
      toast.error('Failed to send approval request');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${FileName}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

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
  };

  const getStatusBadge = () => {
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
  };

  const isExpired =
    Expiration && ExpirationDate && new Date(ExpirationDate) < new Date();

  return (
    <div
      onClick={onClick}
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
          {getStatusBadge()}
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
                onClick={handleDelete}
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
            <div className="flex justify-end gap-2">
              {(actualApprovalStatus === 'pending' || actualApprovalStatus === null) &&
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

              {/* Hide button if already approved or rejected */}
              {(actualApprovalStatus === 'approved' || actualApprovalStatus === 'rejected') && (
                <div className="text-xs text-gray-500 italic">
                  {actualApprovalStatus === 'approved' ? 'Approval completed' : 'Approval rejected'}
                </div>
              )}

              {requestSent && (
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
    </div>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;
