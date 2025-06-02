import React from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "../../contexts/DocumentContext";
import DocumentCard from "../../components/documents/DocumentCard";

const MyDocuments: React.FC = () => {
  const { documents } = useDocument();
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        My Documents
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((document) => (
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

export default MyDocuments;
