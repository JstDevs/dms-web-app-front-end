import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import axios from '@/api/axios';
import { useUsers } from '@/pages/Users/useUser';
import { User } from '@/types/User';
import { CurrentDocument } from '@/types/Document';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Button } from '@chakra-ui/react';

interface DocumentCollaborationProps {
  document: CurrentDocument | null;
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
}) => {
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const { user: loggedUser } = useAuth();
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
        <div className="w-full lg:w-2/3 border-r border-gray-200">
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
        </div>

        {/* Collaborators Section */}
        <div className="w-full lg:w-1/3 bg-gray-50">
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
    </div>
  );
};

export default DocumentCollaboration;
