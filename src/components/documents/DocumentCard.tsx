import React, { useState } from "react";
import { FileText, Calendar, Lock, Eye } from "lucide-react";
import Modal from "../ui/Modal";

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
  } = document;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const getBase64Preview = () => {
    if (DataImage?.data) {
      const binaryString = new Uint8Array(DataImage.data).reduce(
        (acc, byte) => acc + String.fromCharCode(byte),
        ""
      );
      return `data:application/pdf;base64,${btoa(binaryString)}`;
    }
    return null;
  };

  const previewUrl = getBase64Preview();

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

        <div className="text-sm text-gray-500 flex gap-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {FileDate ? new Date(FileDate).toLocaleDateString() : "No date"}
          </div>
          {ExpirationDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Exp: {new Date(ExpirationDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="text-xs font-medium uppercase text-gray-500">
            {publishing_status ? "Published" : "Draft"}
          </div>
          {previewUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              View PDF
            </button>
          )}
        </div>
      </div>

      {/* Modal Preview */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <iframe
          src={previewUrl || ""}
          title="Document Preview"
          className="w-full h-full"
        />
      </Modal>
    </React.Fragment>
  );
};

export default DocumentCard;
