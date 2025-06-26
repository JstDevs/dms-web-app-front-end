import React, { useState } from 'react';
import {
  Calendar,
  Lock,
  Eye,
  FileText,
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
    FileDate: string;
    ExpirationDate?: string;
    Confidential: boolean;
    publishing_status: boolean;
    Expiration: boolean;
    approvalstatus: boolean;
  };
  onClick: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick }) => {
  const {
    FileName,
    FileDescription,
    FileDate,
    ExpirationDate,
    Confidential,
    publishing_status,
    Expiration,
    approvalstatus,
    ID,
  } = document;

  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const { user: loggedUser } = useAuth();

  const handleRequestApproval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRequesting(true);
    setRequestError('');

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
        setRequestError(response.data.message);
      }
    } catch (error) {
      console.error('Error requesting approval:', error);
      setRequestError('Failed to send approval request. Please try again.');
      toast.error('Failed to send approval request');
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!approvalstatus) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" />
          Pending Approval
        </div>
      );
    }

    if (publishing_status) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle className="w-3 h-3" />
          Published
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <FileText className="w-3 h-3" />
        Draft
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
                {FileDate
                  ? new Date(FileDate).toLocaleDateString('en-US', {
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
            {!approvalstatus && !requestSent && (
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
};

export default DocumentCard;
