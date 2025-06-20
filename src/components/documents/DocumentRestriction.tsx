import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Shield,
  UserCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import { CurrentDocument } from "@/types/Document";
import {
  restrictFields,
  removeRestrictedFields,
  fetchDocumentRestrictions,
} from "./documentHelper/Restriction";
import { useAuth } from "@/contexts/AuthContext";

interface FieldRestrictionProps {
  document: CurrentDocument | null;
}

interface RestrictionRequest {
  ID: number;
  DocumentID: number;
  LinkID: string;
  Field: string;
  UserID: string;
  UserRole: string;
  Reason: string | null;
  CreatedBy: string;
  CreatedDate: string;
  CollaboratorName?: string;
}

const FieldRestrictions: React.FC<FieldRestrictionProps> = ({ document }) => {
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<
    number | null
  >(null);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [processingRestriction, setProcessingRestriction] = useState<
    number | null
  >(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [restrictions, setRestrictions] = useState<RestrictionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const { user: loggedUser } = useAuth();

  useEffect(() => {
    if (document) {
      fetchRestrictions();
    }
  }, [document]);

  const fetchRestrictions = async () => {
    try {
      const response = await fetchDocumentRestrictions(
        String(document?.document[0].ID)
      );
      if (response.success) {
        // Merge restriction data with collaborator names
        const restrictionsWithNames = response.data.map((restriction: any) => ({
          ...restriction,
          CollaboratorName:
            document?.collaborations?.find(
              (collab) => collab.CollaboratorID === parseInt(restriction.UserID)
            )?.CollaboratorName || "Unknown User",
        }));
        setRestrictions(restrictionsWithNames);
      }
    } catch (error) {
      console.error("Failed to fetch restrictions:", error);
      showMessage("Failed to load field restrictions. Please try again.", true);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (message: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 5000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleAddRestriction = async () => {
    if (!document || !selectedFieldId || !selectedCollaboratorId) return;

    if (!restrictionReason.trim()) {
      showMessage("Please provide a reason for the restriction.", true);
      return;
    }

    const selectedField = document.OCRDocumentReadFields?.find(
      (field) => field.ID === selectedFieldId
    );
    const selectedCollaborator = document.collaborations?.find(
      (collab) => collab.CollaboratorID === selectedCollaboratorId
    );

    if (!selectedField || !selectedCollaborator) return;

    setProcessingRestriction(-1); // Using -1 for new restriction
    try {
      const payload = {
        LinkID: selectedField.LinkId || "",
        Field: selectedField.Field || "",
        UserID: selectedCollaborator.CollaboratorID,
        UserRole: 1,
        Reason: restrictionReason.trim(),
      };

      const response = await restrictFields(
        String(document.document[0].ID),
        payload
      );

      if (response.success) {
        showMessage(
          `Field "${selectedField.Field}" restricted for ${selectedCollaborator.CollaboratorName}!`
        );
        setSelectedFieldId(null);
        setSelectedCollaboratorId(null);
        setRestrictionReason("");
        fetchRestrictions(); // Refresh the data
      }
    } catch (error: any) {
      console.error("Failed to add restriction:", error);
      showMessage("Failed to add restriction. Please try again.", true);
    } finally {
      setProcessingRestriction(null);
    }
  };

  const handleRemoveRestriction = async (restrictionId: number) => {
    if (!document) return;

    setProcessingRestriction(restrictionId);
    try {
      const response = await removeRestrictedFields(
        String(document.document[0].ID),
        String(restrictionId)
      );

      if (response.success) {
        showMessage("Field restriction removed successfully!");
        fetchRestrictions(); // Refresh the data
      }
    } catch (error: any) {
      console.error("Failed to remove restriction:", error);
      showMessage("Failed to remove restriction. Please try again.", true);
    } finally {
      setProcessingRestriction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group restrictions by collaborator
  const restrictionsByCollaborator =
    document?.collaborations?.reduce((acc, collaborator) => {
      acc[collaborator.CollaboratorID] = restrictions.filter(
        (restriction) =>
          restriction.UserID === String(collaborator.CollaboratorID)
      );
      return acc;
    }, {} as Record<number, RestrictionRequest[]>) || {};

  const totalRestrictions = restrictions.length;

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
        <h2 className="text-xl font-semibold text-gray-900">
          Field Restrictions
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage field access permissions for collaborators
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

      {/* Restriction Status Summary */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Current Restrictions
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <Lock className="h-4 w-4 mr-1" />
                {totalRestrictions} Active Restrictions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Restriction */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-500" />
          Add New Restriction
        </h3>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Field Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Field
              </label>
              <select
                value={selectedFieldId || ""}
                onChange={(e) =>
                  setSelectedFieldId(Number(e.target.value) || null)
                }
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={processingRestriction === -1}
              >
                <option value="">Select a field to restrict</option>
                {document.OCRDocumentReadFields?.map((field) => (
                  <option key={field.ID} value={field.ID}>
                    {field.Field}
                  </option>
                ))}
              </select>
            </div>

            {/* Collaborator Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collaborator
              </label>
              <select
                value={selectedCollaboratorId || ""}
                onChange={(e) =>
                  setSelectedCollaboratorId(Number(e.target.value) || null)
                }
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={processingRestriction === -1}
              >
                <option value="">Select a collaborator</option>
                {document.collaborations?.map((collab) => (
                  <option key={collab.ID} value={collab.CollaboratorID}>
                    {collab.CollaboratorName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Restriction *
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none transition-all"
              rows={3}
              placeholder="Explain why this field should be restricted for this collaborator..."
              value={restrictionReason}
              onChange={(e) => setRestrictionReason(e.target.value)}
              disabled={processingRestriction === -1}
            />
          </div>

          {/* Add Restriction Button */}
          <button
            onClick={handleAddRestriction}
            disabled={
              !selectedFieldId ||
              !selectedCollaboratorId ||
              !restrictionReason.trim() ||
              processingRestriction === -1
            }
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {processingRestriction === -1 ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Lock size={16} />
            )}
            {processingRestriction === -1
              ? "Adding Restriction..."
              : "Add Restriction"}
          </button>
        </div>
      </div>

      {/* Current Restrictions by Collaborator */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          Current Restrictions ({totalRestrictions})
        </h3>

        {document.collaborations?.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <UserCircle size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No collaborators found</p>
            <p className="text-sm text-gray-400 mt-1">
              Add collaborators to manage field restrictions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {document.collaborations?.map((collab) => {
              const collaboratorRestrictions =
                restrictionsByCollaborator[collab.CollaboratorID] || [];
              const isExpanded = expandedUser === collab.CollaboratorID;

              return (
                <div
                  key={collab.ID}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <div
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                      collaboratorRestrictions.length > 0
                        ? "bg-red-50 hover:bg-red-100"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() =>
                      setExpandedUser(isExpanded ? null : collab.CollaboratorID)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          collaboratorRestrictions.length > 0
                            ? "bg-gradient-to-r from-red-500 to-pink-500"
                            : "bg-gradient-to-r from-gray-500 to-gray-600"
                        }`}
                      >
                        <UserCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">
                          {collab.CollaboratorName}
                        </span>
                        <p className="text-sm text-gray-500">
                          {collaboratorRestrictions.length > 0
                            ? `${
                                collaboratorRestrictions.length
                              } restricted field${
                                collaboratorRestrictions.length !== 1 ? "s" : ""
                              }`
                            : "No restrictions"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {collaboratorRestrictions.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Restricted
                        </span>
                      )}
                      {isExpanded ? (
                        <div className="h-5 w-5 text-gray-500">▲</div>
                      ) : (
                        <div className="h-5 w-5 text-gray-500">▼</div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      {collaboratorRestrictions.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="p-3 bg-green-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                            <Eye size={20} className="text-green-600" />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No field restrictions
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            This collaborator has access to all fields
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {collaboratorRestrictions.map((restriction) => (
                            <div
                              key={restriction.ID}
                              className="bg-red-50 border border-red-200 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Lock className="h-5 w-5 text-red-500" />
                                    <span className="font-medium text-gray-900">
                                      {restriction.Field}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                      {restriction.LinkID}
                                    </span>
                                  </div>
                                  {restriction.Reason && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">
                                        Reason:
                                      </span>{" "}
                                      {restriction.Reason}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    Restricted on{" "}
                                    {formatDate(restriction.CreatedDate)} by
                                    User {restriction.CreatedBy}
                                  </p>
                                </div>

                                <button
                                  onClick={() =>
                                    handleRemoveRestriction(restriction.ID)
                                  }
                                  disabled={
                                    processingRestriction === restriction.ID
                                  }
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                >
                                  {processingRestriction === restriction.ID ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Unlock size={14} />
                                  )}
                                  {processingRestriction === restriction.ID
                                    ? "Removing..."
                                    : "Remove"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State */}
      {restrictions.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Shield size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No field restrictions</p>
          <p className="text-sm text-gray-400 mt-1">
            Field restrictions for this document will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default FieldRestrictions;
