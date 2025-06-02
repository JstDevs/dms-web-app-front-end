import React, { useState } from "react";
import { User } from "../../types/User";
import { Document, Comment } from "../../types/Document";
import { useUser } from "../../contexts/UserContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useDocument } from "../../contexts/DocumentContext";
import {
  Users,
  MessageSquare,
  UserPlus,
  Send,
  Clock,
  UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Button } from "@chakra-ui/react";

interface DocumentCollaborationProps {
  document: Document;
}

const DocumentCollaboration: React.FC<DocumentCollaborationProps> = ({
  document,
}) => {
  const { users } = useUser();
  const { addNotification } = useNotification();
  const { updateDocument } = useDocument();

  const [comment, setComment] = useState("");
  const [showUserSelector, setShowUserSelector] = useState(false);

  const handleAddComment = () => {
    if (!comment.trim()) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      text: comment,
      createdAt: new Date().toISOString(),
      userId: users[0].id,
      userName: users[0].name,
    };

    const updatedComments = [...document.comments, newComment];

    updateDocument({
      ...document,
      comments: updatedComments,
    });

    // Add notification
    addNotification({
      id: `notif-${Date.now()}`,
      title: "New Comment",
      message: `${users[0].name} commented on "${document.title}"`,
      time: "Just now",
      read: false,
    });

    setComment("");
    toast.success("Comment added");
  };

  const handleAddCollaborator = (user: User) => {
    if (document.collaborators.some((c) => c.id === user.id)) {
      toast.error(`${user.name} is already a collaborator`);
      return;
    }

    const updatedCollaborators = [...document.collaborators, user];

    updateDocument({
      ...document,
      collaborators: updatedCollaborators,
    });

    // Add notification
    addNotification({
      id: `notif-${Date.now()}`,
      title: "Collaborator Added",
      message: `${users[0].name} added ${user.name} as a collaborator on "${document.title}"`,
      time: "Just now",
      read: false,
    });

    setShowUserSelector(false);
    toast.success(`${user.name} added as collaborator`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-medium text-gray-900">Collaboration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Work together with your team on this document
        </p>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Comments section */}
        <div className="w-full lg:w-2/3 border-r border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">Comments</h3>
            </div>
            <div className="text-xs text-gray-500">
              {document.comments.length} comments
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-500px)] p-4 space-y-4">
            {document.comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No comments yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Be the first to comment on this document
                </p>
              </div>
            ) : (
              document.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 bg-gray-50 rounded-lg animate-fade-in"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {comment.userName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(
                            new Date(comment.createdAt),
                            "MMM d, yyyy h:mm a"
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  rows={3}
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!comment.trim()}
                    className="w-full sm:w-auto px-2 bg-blue-600 text-white hover:bg-blue-700 "
                  >
                    <Send size={14} />
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collaborators section */}
        <div className="w-full lg:w-1/3 bg-gray-50">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">
                Collaborators
              </h3>
            </div>
            <Button
              onClick={() => setShowUserSelector(!showUserSelector)}
              className="text-xs text-blue-600 hover:opacity-80 flex items-center gap-1"
            >
              <UserPlus size={14} />
              Add
            </Button>
          </div>

          {/* Collaborator list */}
          <div className="p-4 space-y-3">
            {document.collaborators.map((user) => (
              <div
                key={user.id}
                className="flex items-center p-2 bg-white rounded-md border border-gray-200"
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <UserCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                </div>
              </div>
            ))}

            {document.collaborators.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500">No collaborators yet</p>
              </div>
            )}
          </div>

          {/* User selector */}
          {showUserSelector && (
            <div className="p-4 border-t border-gray-200">
              <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">
                    Add Collaborator
                  </h4>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {users
                    .filter(
                      (user) =>
                        !document.collaborators.some((c) => c.id === user.id)
                    )
                    .map((user) => (
                      <div
                        key={user.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer flex items-center"
                        onClick={() => handleAddCollaborator(user)}
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <UserCircle className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity log */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <Clock className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">
                Recent Activity
              </h3>
            </div>

            <div className="space-y-3">
              {document.activity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start text-xs">
                  <div className="flex-shrink-0 mr-2 mt-0.5">
                    <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="h-2 w-2 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-900">
                      <span className="font-medium">{activity.userName}</span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-gray-500">
                      {format(
                        new Date(activity.timestamp),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {document.activity.length === 0 && (
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
