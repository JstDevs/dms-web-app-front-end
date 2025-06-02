import React, { useState } from "react";
import { Document, ApprovalStep } from "../../types/Document";
import { useUser } from "../../contexts/UserContext";
import { useDocument } from "../../contexts/DocumentContext";
import { useNotification } from "../../contexts/NotificationContext";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@chakra-ui/react";
// import { Button } from "../ui/Button";

interface DocumentApprovalProps {
  document: Document;
}

const DocumentApproval: React.FC<DocumentApprovalProps> = ({ document }) => {
  const { users } = useUser();
  const { updateDocument } = useDocument();
  const { addNotification } = useNotification();

  const [showApprovalMatrix, setShowApprovalMatrix] = useState(true);
  const [approvalComment, setApprovalComment] = useState("");

  const currentUser = users[0]; // In a real app, this would be the logged-in user

  const handleApprove = () => {
    // Find the current user's approval step
    const currentStepIndex = document.approvalMatrix.findIndex((step) =>
      step.approvers.some(
        (approver) =>
          approver.id === currentUser.id &&
          !approver.approved &&
          !approver.rejected
      )
    );

    if (currentStepIndex === -1) {
      toast.error("You're not an approver for this document");
      return;
    }

    const updatedMatrix = [...document.approvalMatrix];
    const currentStep = updatedMatrix[currentStepIndex];

    // Update the approver status
    const approverIndex = currentStep.approvers.findIndex(
      (approver) => approver.id === currentUser.id
    );
    currentStep.approvers[approverIndex] = {
      ...currentStep.approvers[approverIndex],
      approved: true,
      approvedAt: new Date().toISOString(),
      comment: approvalComment,
    };

    // Check if this step is completed
    const isStepCompleted = currentStep.approvers.every(
      (approver) => approver.approved || approver.rejected
    );
    if (isStepCompleted) {
      currentStep.completed = true;
      currentStep.completedAt = new Date().toISOString();

      // If all approvers in this step approved, move to next step
      const allApproved = currentStep.approvers.every(
        (approver) => approver.approved
      );
      if (allApproved && currentStepIndex < updatedMatrix.length - 1) {
        updatedMatrix[currentStepIndex + 1].active = true;
      }

      // If this is the last step and all approved, mark document as approved
      if (allApproved && currentStepIndex === updatedMatrix.length - 1) {
        updateDocument({
          ...document,
          approvalMatrix: updatedMatrix,
          status: "approved",
          activity: [
            {
              userId: currentUser.id,
              userName: currentUser.name,
              action: "approved the document",
              timestamp: new Date().toISOString(),
            },
            ...document.activity,
          ],
        });

        addNotification({
          id: `notif-${Date.now()}`,
          title: "Document Approved",
          message: `Document "${document.title}" has been fully approved`,
          time: "Just now",
          read: false,
        });

        toast.success("Document approved successfully");
        return;
      }
    }

    // Update the document
    updateDocument({
      ...document,
      approvalMatrix: updatedMatrix,
      activity: [
        {
          userId: currentUser.id,
          userName: currentUser.name,
          action: "approved the document",
          timestamp: new Date().toISOString(),
        },
        ...document.activity,
      ],
    });

    addNotification({
      id: `notif-${Date.now()}`,
      title: "Approval Updated",
      message: `${currentUser.name} approved "${document.title}"`,
      time: "Just now",
      read: false,
    });

    setApprovalComment("");
    toast.success("Document approved");
  };

  const handleReject = () => {
    if (!approvalComment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    // Find the current user's approval step
    const currentStepIndex = document.approvalMatrix.findIndex((step) =>
      step.approvers.some(
        (approver) =>
          approver.id === currentUser.id &&
          !approver.approved &&
          !approver.rejected
      )
    );

    if (currentStepIndex === -1) {
      toast.error("You're not an approver for this document");
      return;
    }

    const updatedMatrix = [...document.approvalMatrix];
    const currentStep = updatedMatrix[currentStepIndex];

    // Update the approver status
    const approverIndex = currentStep.approvers.findIndex(
      (approver) => approver.id === currentUser.id
    );
    currentStep.approvers[approverIndex] = {
      ...currentStep.approvers[approverIndex],
      rejected: true,
      rejectedAt: new Date().toISOString(),
      comment: approvalComment,
    };

    // Mark step as completed and document as rejected
    currentStep.completed = true;
    currentStep.completedAt = new Date().toISOString();

    updateDocument({
      ...document,
      approvalMatrix: updatedMatrix,
      status: "needs_attention",
      activity: [
        {
          userId: currentUser.id,
          userName: currentUser.name,
          action: "rejected the document",
          timestamp: new Date().toISOString(),
        },
        ...document.activity,
      ],
    });

    addNotification({
      id: `notif-${Date.now()}`,
      title: "Document Rejected",
      message: `${currentUser.name} rejected "${document.title}"`,
      time: "Just now",
      read: false,
    });

    setApprovalComment("");
    toast.error("Document rejected");
  };

  const getStepStatus = (step: ApprovalStep) => {
    if (!step.active) return "pending";
    if (step.completed) {
      const allApproved = step.approvers.every((approver) => approver.approved);
      return allApproved ? "approved" : "rejected";
    }
    return "in_progress";
  };

  const isUserCurrentApprover = () => {
    return document.approvalMatrix.some(
      (step) =>
        step.active &&
        !step.completed &&
        step.approvers.some(
          (approver) =>
            approver.id === currentUser.id &&
            !approver.approved &&
            !approver.rejected
        )
    );
  };

  const renderStepStatus = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStepStatusClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStepStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "in_progress":
        return "In Progress";
      default:
        return "Pending";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-3 sm:p-6  border-b border-gray-200">
        <h2 className="text-xl font-medium text-gray-900">Approval Workflow</h2>
        <p className="text-sm text-gray-500 mt-1">
          Track the approval status of this document
        </p>
      </div>

      {/* Document status summary */}
      <div className="p-3 sm:p-6  bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
          {/* Current Status */}
          <div className="flex flex-row sm:flex-col max-sm:gap-4 justify-between items-center sm:items-start">
            <h2 className="text-sm font-medium text-gray-700">
              Current Status
            </h2>
            <div className="flex items-center mt-1">
              {document.status === "approved" ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approved
                </span>
              ) : document.status === "pending_approval" ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <Clock className="h-4 w-4 mr-1" />
                  Pending Approval
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Needs Attention
                </span>
              )}
            </div>
          </div>

          {/* Approval Progress */}
          <div className="sm:w-full sm:max-w-[15rem]">
            <p className="text-sm font-medium text-gray-700">
              Approval Progress
            </p>
            <div className="mt-1 flex items-center gap-2 w-full">
              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{
                    width: `${
                      (document.approvalMatrix.filter((step) => step.completed)
                        .length /
                        document.approvalMatrix.length) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {
                  document.approvalMatrix.filter((step) => step.completed)
                    .length
                }
                /{document.approvalMatrix.length} steps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval matrix */}
      <div>
        <div
          className="p-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => setShowApprovalMatrix(!showApprovalMatrix)}
        >
          <h3 className="text-sm font-medium text-gray-700">Approval Matrix</h3>
          <Button className="text-gray-500">
            {showApprovalMatrix ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </Button>
        </div>

        {showApprovalMatrix && (
          <div className="p-4 overflow-x-auto">
            <div className="space-y-4 min-w-[400px]">
              {document.approvalMatrix.map((step, stepIndex) => {
                const stepStatus = getStepStatus(step);

                return (
                  <div
                    key={stepIndex}
                    className={`border rounded-md overflow-hidden ${
                      step.active && !step.completed
                        ? "border-yellow-300"
                        : "border-gray-200"
                    }`}
                  >
                    <div
                      className={`p-3 flex justify-between items-center ${
                        step.active && !step.completed
                          ? "bg-yellow-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full bg-white">
                          {renderStepStatus(stepStatus)}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            Step {stepIndex + 1}: {step.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {step.type === "single"
                              ? "Single Approver"
                              : step.type === "all"
                              ? "All Must Approve"
                              : "Any Can Approve"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStepStatusClass(
                          stepStatus
                        )}`}
                      >
                        {getStepStatusText(stepStatus)}
                      </span>
                    </div>

                    <div className="p-3 divide-y divide-gray-100">
                      {step.approvers.map((approver, approverIndex) => (
                        <div
                          key={approverIndex}
                          className="py-2 first:pt-0 last:pb-0 flex items-start justify-between"
                        >
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <UserCircle className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {approver.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {approver.role}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {approver.approved ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </span>
                            ) : approver.rejected ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </span>
                            )}

                            {(approver.approved || approver.rejected) &&
                              approver.comment && (
                                <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                  "{approver.comment}"
                                </p>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Current user's approval actions */}
      {isUserCurrentApprover() && (
        <div className="p-3 sm:p-6  border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Your Approval Action
          </h3>

          <div className="mb-4">
            <label
              htmlFor="approval-comment"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Comments (optional for approval, required for rejection)
            </label>
            <textarea
              id="approval-comment"
              rows={3}
              className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
              placeholder="Add your comments here..."
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
            ></textarea>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleApprove}
              className="shadow-sm text-white bg-green-600 hover:bg-green-700 px-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>

            <Button
              onClick={handleReject}
              className="text-white bg-red-600 hover:bg-red-700 px-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentApproval;
