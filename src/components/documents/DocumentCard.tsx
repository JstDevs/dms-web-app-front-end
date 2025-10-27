import React, { useState } from 'react';
import {
  Calendar,
  Lock,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
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
}

const DocumentCard: React.FC<DocumentCardProps> = React.memo(({
  document,
  onClick,
  permissions,
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

  const getStatusBadge = () => {
    // Use actual approval status from API if available
    if (actualApprovalStatus === 'approved') {
      if (publishing_status) {
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="w-3 h-3" />
            Published
          </div>
        );
      }
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3 h-3" />
          Approved
        </div>
      );
    }

    if (actualApprovalStatus === 'rejected') {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3" />
          Rejected
        </div>
      );
    }

    if (actualApprovalStatus === 'pending') {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" />
          Pending Approval
        </div>
      );
    }

    // Fallback to publishing_status
    if (publishing_status) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle className="w-3 h-3" />
          Published
        </div>
      );
    }

    // Default: pending approval
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3" />
        Pending Approval
      </div>
    );
  };

  const isExpired =
    Expiration && ExpirationDate && new Date(ExpirationDate) < new Date();

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Confidential Banner */}
      {Confidential && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-red-500 to-red-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
          <Lock className="w-3 h-3 inline mr-1" />
          CONFIDENTIAL
        </div>
      )}

      {/* Expiration Warning */}
      {isExpired && (
        <div className="absolute top-0 left-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 text-xs font-semibold rounded-br-lg">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          EXPIRED
        </div>
      )}

      <div className="p-6 pt-8 flex flex-col h-full">
        {/* Header - Removed status badge from here */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {FileName || 'Untitled Document'}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
              {FileDescription || 'No description available for this document.'}
            </p>
          </div>
        </div>

        {/* Moved status badge to be part of the metadata section */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col gap-3 justify-between items-start">
            {getStatusBadge()}
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span className="font-medium">Created:</span>
              <span className="ml-2">
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
              className={`flex items-center text-sm ${
                isExpired ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <span className="font-medium">Expires:</span>
              <span className="ml-2">
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
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex justify-end">
            {(actualApprovalStatus === 'pending' || actualApprovalStatus === null) &&
              !requestSent &&
              permissions.Add &&
              permissions.Edit &&
              permissions.Delete && (
                <Button
                  onClick={handleRequestApproval}
                  loading={isRequesting}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                  loadingText="Sending..."
                >
                  <Send className="w-4 h-4" />
                  Request Approval
                </Button>
              )}

            {requestSent && (
              <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                Request Sent
              </div>
            )}
          </div>

          {/* {requestError && (
            <div className="text-red-500 text-sm mt-2 text-right">
              {requestError}
            </div>
          )} */}
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;
