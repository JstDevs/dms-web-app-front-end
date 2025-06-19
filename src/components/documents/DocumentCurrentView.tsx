import { CurrentDocument } from "@/types/Document";
import Modal from "../ui/Modal";
import { Clock, EyeIcon } from "lucide-react";
import { Button } from "@chakra-ui/react";
import { useDepartmentOptions } from "@/hooks/useDepartmentOptions";
import { useState } from "react";

const DocumentCurrentView = ({
  document,
}: {
  document: CurrentDocument | null;
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();

  const currentDocumentInfo = document?.document[0];
  const documentsDepartment = departmentOptions.find(
    (department) =>
      department.value === String(currentDocumentInfo?.DepartmentId)
  );
  const documentsSubDepartment = subDepartmentOptions.find(
    (subDepartment) =>
      subDepartment.value === String(currentDocumentInfo?.SubDepartmentId)
  );
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-6">
      {isViewerOpen && currentDocumentInfo?.filepath ? (
        <Modal isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)}>
          <div className="w-full h-full">
            <img src={currentDocumentInfo?.filepath || ""} alt="" />
          </div>
        </Modal>
      ) : (
        <div className="prose max-w-none">
          <div className="mb-6 flex justify-between items-center gap-2 flex-wrap">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                {document?.versions[0].VersionNumber}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold mb-1">
                {currentDocumentInfo?.FileName}
              </h1>
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <Clock size={14} className="text-gray-500 max-sm:hidden" />
                Last modified:{" "}
                {document?.versions[0].ModificationDate
                  ? new Date(
                      document?.versions[0]?.ModificationDate
                    ).toLocaleString()
                  : "—"}{" "}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsViewerOpen(true)}
                disabled={!currentDocumentInfo?.filepath}
                className="w-full sm:w-auto px-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                <EyeIcon /> View
              </Button>
            </div>
          </div>
          <div className="mb-4  border border-gray-200 rounded-md bg-gray-50"></div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Document Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Type</h4>
            <p className="text-gray-900">{currentDocumentInfo?.DataType}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Confidential
            </h4>
            <p className="text-gray-900">
              {currentDocumentInfo?.Confidential ? "Yes" : "No"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Department Id
            </h4>
            <p className="text-gray-900">
              {documentsDepartment?.label || "N/A"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Sub-Department Id
            </h4>
            <p className="text-gray-900">
              {" "}
              {documentsSubDepartment?.label || "N/A"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              File Description
            </h4>
            <p className="text-gray-900">
              {" "}
              {currentDocumentInfo?.FileDescription}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              File Date
            </h4>
            <p className="text-gray-900">
              {" "}
              {currentDocumentInfo?.FileDate
                ? new Date(currentDocumentInfo.FileDate).toLocaleString()
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCurrentView;
