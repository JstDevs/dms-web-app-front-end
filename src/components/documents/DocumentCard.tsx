import React, { useState } from "react";
import { Calendar, Lock, Eye, Mail } from "lucide-react";
import { Button } from "@chakra-ui/react";
import axios from "@/api/axios";

interface DocumentCardProps {
  document: any;
  onClick: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick }) => {
  const {
    FileName,
    FileDescription,
    FileDate,
    ExpirationDate,
    Confidential,
    DataImage,
    publishing_status,
    Expiration,
    ID,
    approvalstatus,
  } = document;

  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState("");

  const handleRequestApproval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRequesting(true);
    setRequestError("");

    try {
      const response = await axios.post(
        `/documents/documents/${ID}/approvals`,
        {
          requestedBy: "1", // Replace with actual user ID
          approverId: "1", // Replace with author's user ID
          approverName: "ro", // Replace with author's name
          dueDate: "",
          comments: "Please approve this document",
        }
      );

      if (response.status === 200) {
        alert("Approval request sent successfully!");
        // You might want to update the document status here if needed
      }
    } catch (error) {
      console.error("Error requesting approval:", error);
      setRequestError("Failed to send approval request. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <React.Fragment key={document.ID}>
      <div
        onClick={onClick}
        className="border rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-all space-y-3 bg-white"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-blue-800 truncate">
              {FileName || "Untitled"}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {FileDescription || "No description"}
            </p>
          </div>
          {Confidential && <Lock className="text-red-500 w-4 h-4 shrink-0" />}
        </div>

        <div className="text-sm text-gray-500 flex gap-4 justify-between">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Created:{" "}
            {FileDate ? new Date(FileDate).toLocaleDateString() : "No date"}
          </div>
          {Expiration && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Exp: {new Date(ExpirationDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="text-xs font-medium uppercase text-gray-500">
            {publishing_status ? "Published" : "Draft"}
            {!approvalstatus && " • Not Approved"}
          </div>

          <div className="flex gap-2">
            {/* <Button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
              size="sm"
              variant="ghost"
            >
              <Eye className="w-4 h-4" />
              View PDF
            </Button> */}

            {/* Approval request button - only shown when not approved */}
            {!approvalstatus && (
              <Button
                onClick={handleRequestApproval}
                className="text-green-600 hover:underline text-sm flex items-center gap-1"
                size="sm"
                variant="outline"
                loading={isRequesting}
              >
                <Mail className="w-4 h-4" />
                Request Approval
              </Button>
            )}
          </div>
        </div>

        {requestError && (
          <div className="text-red-500 text-sm mt-2">{requestError}</div>
        )}
      </div>
    </React.Fragment>
  );
};

export default DocumentCard;
