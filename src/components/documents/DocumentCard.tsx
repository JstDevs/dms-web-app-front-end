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
  const { user: loggedUser } = useAuth();

  // Fetch actual approval status from approval requests
  React.useEffect(() => {
    const fetchApprovalStatus = async () => {
      try {
        const response = await axios.get(`/documents/documents/${ID}/approvals`);
        if (response.data.success && response.data.data.length > 0) {
          const requests = response.data.data;
          const hasApproved = requests.some((req: any) => req.Status === 'APPROVED' || req.Status === '1');
          const hasRejected = requests.some((req: any) => req.Status === 'REJECTED');
          
          if (hasApproved) {
            setActualApprovalStatus('approved');
          } else if (hasRejected) {
            setActualApprovalStatus('rejected');
          } else {
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
      className="group relative flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Professional top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Confidential Banner */}
      {Confidential && (
        <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg shadow-sm z-10 flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          CONFIDENTIAL
        </div>
      )}

      {/* Expiration Warning */}
      {isExpired && (
        <div className="absolute top-0 left-0 bg-orange-600 text-white px-3 py-1 text-xs font-semibold rounded-br-lg shadow-sm z-10 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          EXPIRED
        </div>
      )}

      <div className="p-5 pt-8 flex flex-col h-full relative">
        {/* Document Icon Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors duration-200">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          {getStatusBadge()}
        </div>

        {/* Title and Description */}
        <div className="mb-4 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors duration-200 leading-tight">
            {FileName || 'Untitled Document'}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
            {FileDescription || 'No description available for this document.'}
          </p>
        </div>

        {/* Metadata Section */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 group-hover:bg-gray-100/70 transition-colors">
            <Calendar className="w-4 h-4 mr-2.5 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-700">Created:</span>
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

          {Expiration && ExpirationDate && (
            <div
              className={`flex items-center text-sm bg-gray-50 rounded-md px-3 py-2 group-hover:bg-gray-100/70 transition-colors ${
                isExpired ? 'bg-red-50 group-hover:bg-red-100/70' : ''
              }`}
            >
              <Clock className={`w-4 h-4 mr-2.5 flex-shrink-0 ${isExpired ? 'text-red-500' : 'text-gray-500'}`} />
              <span className={`font-medium ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>Expires:</span>
              <span className={`ml-2 ${isExpired ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                {new Date(ExpirationDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
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
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
                    loadingText="Sending..."
                  >
                    <Send className="w-4 h-4" />
                    Request Approval
                  </Button>
                )}

              {requestSent && (
                <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md border border-green-200">
                  <CheckCircle className="w-4 h-4" />
                  Request Sent
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle professional hover overlay */}
      <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/30 transition-all duration-200 pointer-events-none rounded-xl" />
    </div>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;
