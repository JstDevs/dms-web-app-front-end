import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  MessageSquare,
  UserPlus,
  Send,
  Clock,
  UserCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Trash2,
  Upload,
  FileText,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import axios from '@/api/axios';
import { useUsers } from '@/pages/Users/useUser';
import { User } from '@/types/User';
import { CurrentDocument } from '@/types/Document';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Button } from '@chakra-ui/react';
import { logCollaborationActivity } from '@/utils/activityLogger';
import { useDocument } from '@/contexts/DocumentContext';
import { editDocument } from '@/pages/Document/utils/uploadAPIs';
import { buildDocumentFormData } from '@/pages/Document/utils/documentHelpers';

interface DocumentCollaborationProps {
  document: CurrentDocument | null;
  permissions?: {
    Comment?: boolean;
    Collaborate?: boolean;
    Finalize?: boolean;
  };
}

interface Comment {
  ID: number;
  DocumentID: number;
  CollaboratorID: string;
  CollaboratorName: string;
  Comment: string;
  CommentDate: string;
  CommentType: string;
  ParentCommentID: string | null;
  PageNumber: number;
}

interface Collaborator {
  ID: number;
  DocumentID: number;
  CollaboratorID: string;
  CollaboratorName: string;
  PermissionLevel: 'READ' | 'WRITE' | 'COMMENT' | 'ADMIN';
  AddedBy: string;
  AddedDate: string;
}

const DocumentCollaboration: React.FC<DocumentCollaborationProps> = ({
  document,
  permissions,
}) => {
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const { user: loggedUser } = useAuth();
  const { fetchDocument } = useDocument();
  const [comment, setComment] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<
    'READ' | 'WRITE' | 'COMMENT' | 'ADMIN'
  >('WRITE');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<
    string | null
  >(null);
  const [removingCommentId, setRemovingCommentId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // File upload & finalize states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document) {
      fetchComments();
      fetchCollaborators();
    }
  }, [document]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(
        `/documents/documents/${document?.document[0].ID}/comments`
      );
      if (response.data.success) {
        setComments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      showMessage('Failed to load comments. Please try again.', true);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const response = await axios.get(
        `/documents/documents/${document?.document[0].ID}/collaborators`
      );
      if (response.data.success) {
        setCollaborators(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch collaborators:', error);
      showMessage('Failed to load collaborators. Please try again.', true);
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
  // -------------ADD COMMENTS--------
  const handleAddComment = async () => {
    // Check Comment permission
    if (!permissions?.Comment) {
      toast.error('You do not have permission to comment on this document.');
      return;
    }
    
    if (!comment.trim() || !document) return;

    setIsAddingComment(true);
    try {
      const response = await axios.post(
        `/documents/documents/${document.document[0].ID}/comments`,
        {
          collaboratorId: loggedUser?.ID,
          collaboratorName: loggedUser?.UserName,
          comment: comment.trim(),
          commentType: 'general',
          parentCommentId: '',
          pageNumber: 1,
        }
      );

      if (response.data.success) {
        // Log comment activity
        try {
          await logCollaborationActivity(
            'COMMENT_ADDED',
            loggedUser!.ID,
            loggedUser!.UserName,
            document.document[0].ID,
            document.document[0].FileName,
            undefined,
            undefined,
            comment.trim()
          );
          
          // Refresh document data to show the new audit trail entry
          await fetchDocument(String(document.document[0].ID));
        } catch (logError) {
          console.warn('Failed to log comment activity:', logError);
        }

        setComment('');
        showMessage('Comment added successfully!');
        fetchComments(); // Refresh comments
      }
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      showMessage('Failed to add comment. Please try again.', true);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleRemoveComment = async (commentId: string) => {
    if (!document) return;

    setRemovingCommentId(commentId);
    // const payload = { deletedBy: loggedUser?.ID };
    console.log({ deletedBy: loggedUser?.ID });
    try {
      const response = await axios.delete(
        `/documents/documents/${document.document[0].ID}/comments/${commentId}`,
        // This is how you send body with DELETE in Axios
        {
          data: {
            deletedBy: String(loggedUser?.ID),
          },
        }
      );

      if (response.data.success) {
        // Log comment deletion activity
        try {
          // Find the deleted comment to get its text for logging
          const deletedComment = comments.find(c => c.ID.toString() === commentId);
          await logCollaborationActivity(
            'COMMENT_DELETED',
            loggedUser!.ID,
            loggedUser!.UserName,
            document.document[0].ID,
            document.document[0].FileName,
            undefined,
            undefined,
            deletedComment?.Comment
          );
          
          // Refresh document data to show the new audit trail entry
          await fetchDocument(String(document.document[0].ID));
        } catch (logError) {
          console.warn('Failed to log comment deletion activity:', logError);
        }

        showMessage('Comment removed successfully!');
        fetchComments(); // Refresh comments
      }
    } catch (error: any) {
      console.error('Failed to remove comment:', error);
      showMessage('Failed to remove comment. Please try again.', true);
    } finally {
      setRemovingCommentId(null);
    }
  };
  const handleAddCollaborator = async (user: User) => {
    if (!document) return;

    // Check if user is already a collaborator
    const isAlreadyCollaborator = collaborators.some(
      (c) => c.CollaboratorID.toString() == user.ID.toString()
    );

    if (isAlreadyCollaborator) {
      showMessage(`${user.UserName} is already a collaborator`, true);
      return;
    }

    setIsAddingCollaborator(true);
    try {
      const response = await axios.post(
        `/documents/documents/${document.document[0].ID}/collaborators`,
        {
          collaboratorId: user.ID.toString(),
          collaboratorName: user.UserName,
          permissionLevel: selectedPermission,
          addedBy: loggedUser?.UserName,
        }
      );

      if (response.data.success) {
        // Log collaborator addition activity
        try {
          await logCollaborationActivity(
            'COLLABORATOR_ADDED',
            loggedUser!.ID,
            loggedUser!.UserName,
            document.document[0].ID,
            document.document[0].FileName,
            user.UserName,
            selectedPermission
          );
          
          // Refresh document data to show the new audit trail entry
          await fetchDocument(String(document.document[0].ID));
        } catch (logError) {
          console.warn('Failed to log collaborator addition activity:', logError);
        }

        setShowUserSelector(false);
        showMessage(`${user.UserName} added as collaborator successfully!`);
        fetchCollaborators(); // Refresh collaborators
      }
    } catch (error: any) {
      console.error('Failed to add collaborator:', error);
      showMessage('Failed to add collaborator. Please try again.', true);
    } finally {
      setIsAddingCollaborator(false);
    }
  };
  const handleRemoveCollaborator = async (collaborator: Collaborator) => {
    if (!document) return;

    setRemovingCollaboratorId(collaborator.CollaboratorID.toString());
    try {
      const response = await axios.delete(
        `/documents/documents/${document.document[0].ID}/collaborators/${collaborator.CollaboratorID}`,
        {}
      );

      if (response.data.success) {
        // Log collaborator removal activity
        try {
          await logCollaborationActivity(
            'COLLABORATOR_REMOVED',
            loggedUser!.ID,
            loggedUser!.UserName,
            document.document[0].ID,
            document.document[0].FileName,
            collaborator.CollaboratorName
          );
          
          // Refresh document data to show the new audit trail entry
          await fetchDocument(String(document.document[0].ID));
        } catch (logError) {
          console.warn('Failed to log collaborator removal activity:', logError);
        }

        showMessage(
          `${collaborator.CollaboratorName} removed as collaborator successfully!`
        );
        toast.success(
          `${collaborator.CollaboratorName} removed as collaborator successfully!`
        );
        fetchCollaborators(); // Refresh collaborators
      }
    } catch (error: any) {
      console.error('Failed to remove collaborator:', error);
      showMessage('Failed to remove collaborator. Please try again.', true);
    } finally {
      setRemovingCollaboratorId(null);
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // -------- Version Upload Handlers --------
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadSection(true);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadSection(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUploadNewVersion = async () => {
    if (!selectedFile || !document) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const currentDoc = document.document[0];

      const docData = {
        ID: currentDoc.ID,
        FileName: currentDoc.FileName,
        FileDescription: currentDoc.FileDescription,
        Description: currentDoc.Description,
        FileDate: currentDoc.FileDate,
        Remarks: currentDoc.Remarks,
        Expiration: currentDoc.Expiration,
        ExpirationDate: currentDoc.ExpirationDate,
        Confidential: currentDoc.Confidential,
        DepartmentId: currentDoc.DepartmentId,
        SubDepartmentId: currentDoc.SubDepartmentId,
        Active: currentDoc.Active,
        publishing_status: currentDoc.publishing_status,
        // Dynamic fields (coerce null to undefined)
        Text1: currentDoc.Text1 || undefined,
        Text2: currentDoc.Text2 || undefined,
        Text3: currentDoc.Text3 || undefined,
        Text4: currentDoc.Text4 || undefined,
        Text5: currentDoc.Text5 || undefined,
        Text6: currentDoc.Text6 || undefined,
        Text7: currentDoc.Text7 || undefined,
        Text8: currentDoc.Text8 || undefined,
        Text9: currentDoc.Text9 || undefined,
        Text10: currentDoc.Text10 || undefined,
        Date1: currentDoc.Date1 || undefined,
        Date2: currentDoc.Date2 || undefined,
        Date3: currentDoc.Date3 || undefined,
        Date4: currentDoc.Date4 || undefined,
        Date5: currentDoc.Date5 || undefined,
        Date6: currentDoc.Date6 || undefined,
        Date7: currentDoc.Date7 || undefined,
        Date8: currentDoc.Date8 || undefined,
        Date9: currentDoc.Date9 || undefined,
        Date10: currentDoc.Date10 || undefined,
      } as any;

      // File uploads create minor versions (v1 → v1.1, v2 → v2.1, etc.)
      const formData = buildDocumentFormData(
        docData, 
        selectedFile, 
        false, 
        currentDoc.ID,
        undefined,
        true,   // isMinorVersion: true - file uploads create minor versions
        false   // finalize: false
      );

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await editDocument(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.status) {
        try {
          await logCollaborationActivity(
            'VERSION_CREATED',
            loggedUser!.ID,
            loggedUser!.UserName,
            document.document[0].ID,
            document.document[0].FileName,
            `New version uploaded: ${selectedFile.name}`
          );
          await fetchDocument(String(document.document[0].ID));
        } catch (logError) {
          console.warn('Failed to log version creation activity:', logError);
        }

        showMessage('New version uploaded successfully!');
        setSelectedFile(null);
        setShowUploadSection(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        showMessage(response.message || 'Failed to upload new version', true);
      }
    } catch (error) {
      console.error('Failed to upload new version:', error);
      showMessage('Failed to upload new version. Please try again.', true);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFinalizeVersion = async () => {
    // Check Finalize permission
    if (!permissions?.Finalize) {
      toast.error('You do not have permission to finalize versions of this document.');
      return;
    }
    
    if (!document) return;

    setIsFinalizing(true);
    setShowFinalizeModal(false);
    try {
      const currentDoc = document.document[0];
      
      // Prepare document data for finalize request
      const docData = {
        ID: currentDoc.ID,
        FileName: currentDoc.FileName,
        FileDescription: currentDoc.FileDescription,
        Description: currentDoc.Description,
        FileDate: currentDoc.FileDate,
        Remarks: currentDoc.Remarks,
        Expiration: currentDoc.Expiration,
        ExpirationDate: currentDoc.ExpirationDate,
        Confidential: currentDoc.Confidential,
        DepartmentId: currentDoc.DepartmentId,
        SubDepartmentId: currentDoc.SubDepartmentId,
        Active: currentDoc.Active,
        publishing_status: currentDoc.publishing_status,
        // Dynamic fields
        Text1: currentDoc.Text1 || undefined,
        Text2: currentDoc.Text2 || undefined,
        Text3: currentDoc.Text3 || undefined,
        Text4: currentDoc.Text4 || undefined,
        Text5: currentDoc.Text5 || undefined,
        Text6: currentDoc.Text6 || undefined,
        Text7: currentDoc.Text7 || undefined,
        Text8: currentDoc.Text8 || undefined,
        Text9: currentDoc.Text9 || undefined,
        Text10: currentDoc.Text10 || undefined,
        Date1: currentDoc.Date1 || undefined,
        Date2: currentDoc.Date2 || undefined,
        Date3: currentDoc.Date3 || undefined,
        Date4: currentDoc.Date4 || undefined,
        Date5: currentDoc.Date5 || undefined,
        Date6: currentDoc.Date6 || undefined,
        Date7: currentDoc.Date7 || undefined,
        Date8: currentDoc.Date8 || undefined,
        Date9: currentDoc.Date9 || undefined,
        Date10: currentDoc.Date10 || undefined,
      } as any;

      // Finalize version - bumps major version (v1.x → v2, v2.x → v3, etc.)
      const formData = buildDocumentFormData(
        docData,
        null,      // No file upload for finalize
        false,
        currentDoc.ID,
        undefined,
        false,     // isMinorVersion: false - finalize is major version bump
        true       // finalize: true - triggers major version increment
      );

      const response = await editDocument(formData);

      if (response.status) {
        try {
          await logCollaborationActivity(
            'VERSION_FINALIZED',
            loggedUser!.ID,
            loggedUser!.UserName,
            document.document[0].ID,
            document.document[0].FileName,
            'Version finalized'
          );
          await fetchDocument(String(document.document[0].ID));
        } catch (logError) {
          console.warn('Failed to log finalization activity:', logError);
        }
        showMessage('Version finalized successfully! Check the Audit Trail tab to see the activity.');
        toast.success('Version finalized successfully!', { duration: 4000, position: 'top-right' });
      } else {
        throw new Error(response.message || 'Failed to finalize version');
      }
    } catch (error) {
      console.error('Failed to finalize version:', error);
      showMessage('Failed to finalize version. Please try again.', true);
      toast.error('Failed to finalize version. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setShowUploadSection(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Collaboration</h2>
        <p className="text-sm text-gray-600 mt-1">
          Work together with your team on this document
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
          <AlertCircle size={16} className="text-red-600" />
          <span className="text-sm text-red-700">{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-[600px]">
        {/* Comments Section */}
        <div className="w-full lg:w-3/3 border-r border-gray-200">
          {/* Version Management */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Upload className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-sm font-semibold text-gray-700">Version Management</h3>
              </div>
              <button
                // onClick={() => setShowUploadSection(!showUploadSection)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Upload size={14} />
                Upload New Version
              </button>
            </div>

            {showUploadSection && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="h-8 w-8 text-green-600 mx-auto" />
                      <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                      <p className="text-xs text-green-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-600">
                        Drag and drop a file here, or{' '}
                        <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:text-blue-700 font-medium">browse</button>
                      </p>
                      <p className="text-xs text-gray-500">Supports PDF, DOC, DOCX, images</p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  className="hidden"
                />

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="text-gray-500">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {selectedFile && !isUploading && (
                  <div className="flex gap-2">
                    <button onClick={handleUploadNewVersion} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      <Upload size={14} />
                      Upload Version
                    </button>
                    <button onClick={cancelUpload} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Finalize Version Button */}
            {permissions?.Finalize && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowFinalizeModal(true)}
                  disabled={isFinalizing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    isFinalizing ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700 hover:shadow-md'
                  }`}
                >
                  {isFinalizing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  {isFinalizing ? 'Finalizing...' : 'Finalize Current Version'}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-sm font-semibold text-gray-700">Comments</h3>
            </div>
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
              {comments.length} comments
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-500px)] p-4 space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MessageSquare size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No comments yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Be the first to comment on this document
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.ID}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 relative hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {comment.CollaboratorName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.CommentDate)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {comment.Comment}
                      </p>
                    </div>
                  </div>
                  {/* Show delete button only for user's own comments or if admin */}
                  {comment.CollaboratorID == loggedUser?.ID.toString() && (
                    <Button
                      onClick={() => handleRemoveComment(comment.ID.toString())}
                      disabled={removingCommentId == comment.ID.toString()}
                      className="absolute bottom-2 right-2 text-gray-500 hover:text-red-500 transition-colors duration-300"
                    >
                      {removingCommentId == comment.ID.toString() ? (
                        <Loader2 className="spinner-icon" />
                      ) : (
                        <Trash2 className="delete-icon" />
                      )}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          {permissions?.Comment && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none transition-all"
                    rows={3}
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={isAddingComment}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleAddComment}
                      disabled={!comment.trim() || isAddingComment}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isAddingComment ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      {isAddingComment ? 'Adding...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!permissions?.Comment && (
            <div className="p-4 border-t border-gray-200 bg-yellow-50">
              <div className="flex items-center gap-2 text-yellow-700 text-sm">
                <AlertCircle size={16} />
                <span>You do not have permission to comment on this document.</span>
              </div>
            </div>
          )}
        </div>


        {/* Collaborators Section */}
        <div className="w-full lg:w-1/3 bg-gray-50 hidden">
          <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-sm font-semibold text-gray-700">
                Collaborators
              </h3>
            </div>
            <button
              onClick={() => setShowUserSelector(!showUserSelector)}
              disabled={usersLoading}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <UserPlus size={14} />
              Add
            </button>
          </div>

          {/* Collaborator List */}
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.ID}
                className="flex items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                  <UserCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {collaborator.CollaboratorName}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {collaborator.CollaboratorID}
                  </p>
                </div>
                <div className="ml-auto">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      collaborator.PermissionLevel === 'ADMIN'
                        ? 'bg-red-100 text-red-800'
                        : collaborator.PermissionLevel === 'WRITE'
                        ? 'bg-blue-100 text-blue-800'
                        : collaborator.PermissionLevel === 'COMMENT'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {collaborator.PermissionLevel}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveCollaborator(collaborator)}
                  className="text-red-500 hover:text-red-700 p-1 ml-2 rounded-full hover:bg-red-50"
                  disabled={
                    removingCollaboratorId ===
                    collaborator.CollaboratorID.toString()
                  }
                >
                  {removingCollaboratorId ===
                  collaborator.CollaboratorID.toString() ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}

            {collaborators.length === 0 && (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Users size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No collaborators yet</p>
              </div>
            )}
          </div>

          {/* User Selector */}
          {showUserSelector && (
            <div className="p-4 border-t border-gray-200">
              <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Add Collaborator
                  </h4>
                  <button
                    onClick={() => setShowUserSelector(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Permission Level Selector */}
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <label className="text-xs font-medium text-gray-700 mb-2 block">
                    Permission Level
                  </label>
                  <select
                    value={selectedPermission}
                    onChange={(e) =>
                      setSelectedPermission(e.target.value as any)
                    }
                    className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="READ">Read Only</option>
                    <option value="WRITE">Read & Write</option>
                    <option value="COMMENT">Comment Only</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="max-h-48 overflow-y-auto">
                  {usersLoading ? (
                    <div className="p-4 text-center">
                      <Loader2
                        size={20}
                        className="animate-spin mx-auto text-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Loading users...
                      </p>
                    </div>
                  ) : usersError ? (
                    <div className="p-4 text-center">
                      <AlertCircle
                        size={20}
                        className="mx-auto text-red-400 mb-2"
                      />
                      <p className="text-xs text-red-600">
                        Failed to load users
                      </p>
                    </div>
                  ) : (
                    users
                      .filter(
                        (user) =>
                          !collaborators.some(
                            (c) =>
                              c.CollaboratorID.toString() == user.ID.toString()
                          )
                      )
                      .map((user) => (
                        <div
                          key={user.ID}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center transition-colors"
                          onClick={() => handleAddCollaborator(user)}
                        >
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                            <UserCircle className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {user.UserName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Employee ID: {user.EmployeeID}
                            </p>
                          </div>
                          {isAddingCollaborator && (
                            <Loader2
                              size={16}
                              className="animate-spin text-blue-600"
                            />
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-sm font-semibold text-gray-700">
                Recent Activity
              </h3>
            </div>

            <div className="space-y-3">
              {collaborators.slice(0, 5).map((collaboration) => (
                <div
                  key={collaboration.ID}
                  className="flex items-start text-xs"
                >
                  <div className="flex-shrink-0 mr-2 mt-0.5">
                    <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="h-2 w-2 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-900">
                      <span className="font-medium">
                        {collaboration.CollaboratorName}
                      </span>{' '}
                      was added as collaborator
                    </p>
                    <p className="text-gray-500">
                      {formatDate(collaboration.AddedDate)}
                    </p>
                  </div>
                </div>
              ))}

              {collaborators.length === 0 && (
                <p className="text-xs text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>


      </div>
    {/* Finalize Confirmation Modal */}
    {showFinalizeModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Finalize Version</h3>
              <p className="text-sm text-gray-600">Confirm this action</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 mb-3">Are you sure you want to finalize the current version of:</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="font-medium text-gray-900">{document?.document[0].FileName}</p>
              <p className="text-sm text-gray-600">Version {document?.versions[0]?.VersionNumber || '1.0'}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Important</p>
                  <p className="text-sm text-amber-700">This action will mark the version as finalized and cannot be undone. The activity will be logged in the audit trail.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowFinalizeModal(false)} disabled={isFinalizing} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">Cancel</button>
            <button onClick={handleFinalizeVersion} disabled={isFinalizing} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">
              {isFinalizing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              {isFinalizing ? 'Finalizing...' : 'Yes, Finalize Version'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default DocumentCollaboration;
