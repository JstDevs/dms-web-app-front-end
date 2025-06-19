import React, { useState } from "react";
import { Button } from "@chakra-ui/react";
import { UserCircle, Lock, Unlock, ChevronDown, ChevronUp } from "lucide-react";
import { CurrentDocument } from "@/types/Document";
import toast from "react-hot-toast";
import {
  removeRestrictedFields,
  restrictFields,
} from "./documentHelper/Restriction";

interface FieldRestrictionProps {
  document: CurrentDocument | null;
}

const FieldRestrictions: React.FC<FieldRestrictionProps> = ({ document }) => {
  if (!document) return null;

  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<
    number | null
  >(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const {
    OCRDocumentReadFields: documentFields,
    collaborations: collaborators,
    restrictions,
    document: docInfo,
  } = document;

  const handleRestrict = async () => {
    if (!selectedCollaboratorId || !selectedFieldId) return;

    const selectedField = documentFields.find(
      (field) => field.ID === selectedFieldId
    );

    const Collaborator = collaborators.find(
      (collaborator) => collaborator.CollaboratorID === selectedCollaboratorId
    );

    const payload = {
      LinkId: selectedField?.LinkId || "",
      Field: selectedField?.Field || "",
      UserID: Collaborator?.CollaboratorID || 0,
      UserRole: 1,
      Reason: "just wanted to test it out", // TODO : ADD REASON Field
    };

    try {
      const res = await restrictFields(String(docInfo[0].ID), payload);
      if (!res.success) throw new Error("Failed to restrict field");

      toast.success("Field restricted successfully!");
    } catch (error) {
      console.error("Failed to restrict field:", error);
      toast.error("Failed to restrict field");
    } finally {
      setSelectedFieldId(null);
      setSelectedCollaboratorId(null);
    }
  };

  const toggleUserExpansion = (userId: number) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  // Group restrictions by collaborator
  const restrictionsByCollaborator = collaborators?.reduce(
    (acc, collaborator) => {
      acc[collaborator.CollaboratorID] =
        restrictions?.filter(
          (restriction) =>
            restriction.UserID === String(collaborator.CollaboratorID)
        ) || [];
      return acc;
    },
    {} as Record<number, typeof restrictions>
  );

  const handleRemoveRestriction = async (restrictionId: number) => {
    try {
      const res = await removeRestrictedFields(
        String(docInfo[0].ID),
        String(restrictionId)
      );
      if (!res.success) throw new Error("Failed to remove restriction");

      toast.success("Restriction removed successfully!");
    } catch (error) {
      console.error("Failed to remove restriction:", error);
      toast.error("Failed to remove restriction");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Field Restrictions
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage which fields collaborators can access
        </p>
      </div>

      <div className="p-6">
        {/* Field and User Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Field
            </label>
            <select
              value={selectedFieldId || ""}
              onChange={(e) =>
                setSelectedFieldId(Number(e.target.value) || null)
              }
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" hidden>
                Select a field
              </option>
              {documentFields?.map((field) => (
                <option key={field.ID} value={field.ID}>
                  {field.Field}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collaborator
            </label>
            <select
              value={selectedCollaboratorId || ""}
              onChange={(e) =>
                setSelectedCollaboratorId(Number(e.target.value) || null)
              }
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" hidden>
                Select a collaborator
              </option>
              {collaborators?.map((collab) => (
                <option key={collab.ID} value={collab.CollaboratorID}>
                  {collab.CollaboratorName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleRestrict}
              disabled={!selectedFieldId || !selectedCollaboratorId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Restrict Field
            </Button>
          </div>
        </div>

        {/* Restrictions List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Current Restrictions
          </h3>

          {collaborators?.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No collaborators found</p>
            </div>
          ) : (
            collaborators?.map((collab) => (
              <div
                key={collab.ID}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                  onClick={() => toggleUserExpansion(collab.CollaboratorID)}
                >
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">
                      {collab.CollaboratorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {restrictionsByCollaborator[collab.CollaboratorID]
                        ?.length || 0}{" "}
                      restricted fields
                    </span>
                    {expandedUser === collab.CollaboratorID ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>

                {expandedUser === collab.CollaboratorID && (
                  <div className="p-4 bg-white">
                    {restrictionsByCollaborator[collab.CollaboratorID]
                      ?.length ? (
                      <ul className="space-y-2">
                        {restrictionsByCollaborator[collab.CollaboratorID].map(
                          (restriction) => (
                            <li
                              key={restriction.ID}
                              className="flex flex-col p-3 hover:bg-gray-50 rounded-lg border border-gray-100"
                            >
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {restriction.Field}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                      {restriction.LinkID}
                                    </span>
                                  </div>

                                  <div className="text-sm text-gray-500">
                                    <span>
                                      Restricted on:{" "}
                                      {new Date(
                                        restriction.CreatedDate
                                      ).toLocaleDateString()}
                                    </span>
                                    {restriction.Reason && (
                                      <span className="ml-3">
                                        Reason: {restriction.Reason}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() =>
                                      handleRemoveRestriction(restriction.ID)
                                    }
                                    size="sm"
                                    variant="outline"
                                    colorScheme="red"
                                    className="flex items-center gap-1"
                                  >
                                    <Unlock className="h-4 w-4" />
                                    <span>Remove</span>
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <UserCircle className="h-3 w-3" />
                                  <span>
                                    Restricted by: User {restriction.CreatedBy}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  <span>
                                    Access Level: {restriction.UserRole}
                                  </span>
                                </div>
                              </div>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No field restrictions for this collaborator
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldRestrictions;
