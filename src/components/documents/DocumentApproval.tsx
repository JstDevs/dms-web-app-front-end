import React, { useState, useEffect } from 'react';
import { CurrentDocument } from '@/types/Document';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserCircle,
  MessageSquare,
  Loader2,
} from 'lucide-react';
// import { Button } from "@chakra-ui/react";
import axios from '@/api/axios';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentApprovalProps {
  document: CurrentDocument | null;
}

interface ApprovalRequest {
  ID: number;
  DocumentID: number;
  LinkID: string;
  RequestedBy: string;
  RequestedDate: string;
  ApproverID: string;
  ApproverName: string;
  Status: 'PENDING' | '1' | '0';
  ApprovalDate: string | null;
  Comments: string | null;
  RejectionReason: string | null;
}

const DocumentApproval: React.FC<DocumentApprovalProps> = ({ document }) => {
  const [approvalComment, setApprovalComment] = useState('');
  const [processingApproval, setProcessingApproval] = useState<number | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { user: loggedUser } = useAuth();
  useEffect(() => {
    if (document) {
      fetchApprovalRequests();
    }
  }, [document]);

  const fetchApprovalRequests = async () => {
    try {
      const response = await axios.get(
        `/documents/documents/${document?.document[0].ID}/approvals`
      );
      if (response.data.success) {
        setApprovalRequests(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch approval requests:', error);
      showMessage('Failed to load approval requests. Please try again.', true);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (message: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleApprove = async (requestId: number) => {
    if (!document) return;

    setProcessingApproval(requestId);
    try {
      const response = await axios.put(
        `/documents/documents/${document.document[0].ID}/approvals/${requestId}`,
        {
          status: '1',
          comments: approvalComment.trim(),
          rejectionReason: '',
          approverId: loggedUser?.ID,
        }
      );

      if (response.data.success) {
        showMessage(`Approval granted successfully!`);
        setApprovalComment('');
        fetchApprovalRequests(); // Refresh the data
      }
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      showMessage('Failed to approve request. Please try again.', true);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!document) return;

    if (!approvalComment.trim()) {
      showMessage('Please provide a reason for rejection.', true);
      return;
    }

    setProcessingApproval(requestId);
    try {
      const response = await axios.put(
        `/documents/documents/${document.document[0].ID}/approvals/${requestId}`,
        {
          status: '0',
          comments: approvalComment.trim(),
          rejectionReason: '',
          approverId: loggedUser?.ID,
        }
      );

      if (response.data.success) {
        showMessage(`Request has been rejected.`);
        setApprovalComment('');
        fetchApprovalRequests(); // Refresh the data
      }
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      showMessage('Failed to reject request. Please try again.', true);
    } finally {
      setProcessingApproval(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingRequests = approvalRequests.filter(
    (req) => req.Status === 'PENDING'
  );
  const processedRequests = approvalRequests.filter(
    (req) => req.Status !== 'PENDING'
  );

  if (!document) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3  sm:px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Document Approvals
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage approval requests for this document
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm text-green-700">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600" />
          <span className="text-sm text-red-700">{errorMessage}</span>
        </div>
      )}

      {/* Document Status Summary */}
      <div className="px-3 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Approval Status
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Clock className="h-4 w-4 mr-1" />
                {pendingRequests.length} Pending
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                {approvalRequests.filter((r) => r.Status === '1').length}{' '}
                Approved
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <XCircle className="h-4 w-4 mr-1" />
                {approvalRequests.filter((r) => r.Status === '0').length}{' '}
                Rejected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval Requests */}
      {pendingRequests.length > 0 && (
        <div className="px-3 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Pending Approvals ({pendingRequests.length})
          </h3>

          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.ID}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-4 relative">
                  <div className="flex sm:items-center max-sm:flex-col gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                      <UserCircle className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {request.ApproverName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Requested on {formatDate(request.RequestedDate)}
                      </p>
                      {request.Comments && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Request Comment:</span>{' '}
                          {request.Comments}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`max-sm:absolute top-0 right-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                      request.Status
                    )}`}
                  >
                    {getStatusIcon(request.Status)}
                    <span className="ml-1 capitalize">
                      {request.Status.toLowerCase()}
                    </span>
                  </span>
                </div>

                {/* Comment/Reason Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Comment (Optional for approval, Required for rejection)
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none transition-all"
                    rows={3}
                    placeholder="Add your comments or reason for rejection..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    disabled={processingApproval === request.ID}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(request.ID)}
                    disabled={processingApproval === request.ID}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {processingApproval === request.ID ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {processingApproval === request.ID
                      ? 'Processing...'
                      : 'Approve'}
                  </button>

                  <button
                    onClick={() => handleReject(request.ID)}
                    disabled={processingApproval === request.ID}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {processingApproval === request.ID ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    {processingApproval === request.ID
                      ? 'Processing...'
                      : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests History */}
      <div className="px-3 sm:px-6 py-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Approval History ({processedRequests.length})
        </h3>

        {processedRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MessageSquare size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">
              No processed requests yet
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Approved and rejected requests will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {processedRequests.map((request) => (
              <div
                key={request.ID}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        request.Status === '1'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                    >
                      <UserCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {request.ApproverName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Requested: {formatDate(request.RequestedDate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.Status === '1' ? 'Approved' : 'Rejected'}:{' '}
                        {formatDate(request.ApprovalDate)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                      request.Status
                    )}`}
                  >
                    {getStatusIcon(request.Status)}
                    <span className="ml-1 capitalize">
                      {request.Status.toLowerCase()}
                    </span>
                  </span>
                </div>

                {(request.Comments || request.RejectionReason) && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      {request.Status === '1'
                        ? 'Comment:'
                        : 'Reason for rejection:'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {request.Comments || request.RejectionReason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State for No Requests */}
      {approvalRequests.length === 0 && (
        <div className="px-3 sm:px-6 py-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No approval requests</p>
          <p className="text-sm text-gray-400 mt-1">
            Approval requests for this document will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentApproval;
