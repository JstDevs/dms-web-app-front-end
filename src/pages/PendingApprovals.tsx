import React from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "../contexts/DocumentContext";
import DocumentCard from "../components/documents/DocumentCard";

const PendingApprovals: React.FC = () => {
  const { documents } = useDocument();
  const navigate = useNavigate();

  const pendingDocuments = documents.filter(
    (doc) => doc.status === "pending_approval"
  );

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">
        Pending Approvals
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pendingDocuments.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onClick={() => navigate(`/documents/${document.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default PendingApprovals;
