import React from "react";
import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Document } from "../../types/Document";

interface DocumentCardProps {
  document: Document;
  onClick: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick }) => {
  const getStatusIcon = () => {
    switch (document.status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending_approval":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "needs_attention":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusClass = () => {
    switch (document.status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800";
      case "needs_attention":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusText = () => {
    switch (document.status) {
      case "approved":
        return "Approved";
      case "pending_approval":
        return "Pending Approval";
      case "needs_attention":
        return "Needs Attention";
      default:
        return "Draft";
    }
  };

  return (
    <div
      className="card transition-transform hover:shadow-md hover:scale-[1.02] cursor-pointer overflow-hidden h-full flex flex-col rounded-3xl border border-gray-200 shadow-lg"
      onClick={onClick}
    >
      <div className="p-4 flex-grow splace-y-4">
        <div className="flex items-center justify-between ">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusClass()}`}
          >
            {getStatusText()}
          </span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mt-3 mb-1 line-clamp-2">
          {document.title}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {document.type} • {document.department}
        </p>
        <p className="text-sm text-gray-700 line-clamp-2 mb-4">
          {document.description}
        </p>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>
            {" "}
            {document.lastModifiedAt
              ? new Date(document.lastModifiedAt).toLocaleString()
              : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <span>v{document.versions.length}</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
