import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocument } from "../../contexts/DocumentContext";
import { useNotification } from "../../contexts/NotificationContext";
import DocumentVersionHistory from "../../components/versioning/DocumentVersionHistory";
import DocumentCollaboration from "../../components/documents/DocumentCollaboration";
import DocumentApproval from "../../components/documents/DocumentApproval";
import DocumentAuditTrail from "../../components/documents/DocumentAuditTrail";
import {
  ChevronLeft,
  Share2,
  Download,
  History,
  MessageSquare,
  CheckCircle,
  ClipboardList,
  Save,
  Clock,
  Loader,
  EyeIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import FieldRestrictions from "../../components/documents/DocumentRestriction";
import { Button } from "@chakra-ui/react";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/ui/Modal";
import { getBase64FromBuffer } from "./utils/documentHelpers";

type TabType =
  | "document"
  | "versions"
  | "collaboration"
  | "approval"
  | "audit"
  | "restrictions";
// const users = [
//   { id: "1", name: "Alice" },
//   { id: "2", name: "Bob" },
// ];

// const dummyDocument = {
//   fields: {
//     Header: "CERTIFICATE OF LIVE BIRTH",
//     Registry: "123456",
//     Sex: "Male",
//     "Full Name": "John Doe",
//   },
// };
const DocumentView: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { currentDocument, loading, error, fetchDocument, updateDocument } =
    useDocument();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("document");
  const [isEditing, setIsEditing] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [documentContent, setDocumentContent] = useState("");
  // const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null);

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId]);

  useEffect(() => {
    if (currentDocument) {
      // setDocumentContent(currentDocument.content);
    }
  }, [currentDocument]);

  const handleViewDocument = () => {
    setIsViewerOpen(true);
    // setDocumentContent(document.content);
  };

  const handleSave = () => {
    // const updatedDoc = {
    //   ...document,
    //   content: documentContent,
    //   lastModifiedAt: new Date().toISOString(),
    //   lastModifiedBy: user?.UserName,
    //   lastAction: "updated",
    //   versions: [
    //     {
    //       id: `v${document.versions.length + 1}`,
    //       number: document.versions.length + 1,
    //       createdAt: new Date().toISOString(),
    //       createdBy: user?.UserName,
    //       content: documentContent,
    //     },
    //     ...document.versions,
    //   ],
    // };

    // updateDocument(updatedDoc);
    setIsEditing(false);

    // Add notification
    addNotification({
      id: `notif-${Date.now()}`,
      title: "Document Updated",
      message: `${user?.UserName} updated "${document.title}"`,
      time: "Just now",
      read: false,
    });

    toast.success("Document updated successfully");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDocumentContent("");
  };
  // handler
  const handleRestrictField = (field: string, userId: string) => {
    // setRestrictedFields((prev) => ({
    //   ...prev,
    //   [userId]: [...(prev[userId] || []), field],
    // }));
  };

  const handleRemoveRestriction = (field: string, userId: string) => {
    // setRestrictedFields((prev) => ({
    //   ...prev,
    //   [userId]: (prev[userId] || []).filter((f) => f !== field),
    // }));
  };
  console.log({
    currentDocument,
    v: currentDocument?.versions[0]?.VersionNumber,
  });
  const renderTabContent = () => {
    switch (activeTab) {
      case "document":
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-6">
            {isViewerOpen && currentDocument?.document?.DataImage ? (
              <Modal
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
              >
                <div className="w-full h-full">
                  <iframe
                    src={getBase64FromBuffer(
                      currentDocument?.document?.DataImage
                    )}
                    title="Document Preview"
                    className="w-full h-full border-none rounded"
                  />
                </div>
              </Modal>
            ) : (
              <div className="prose max-w-none">
                <div className="mb-6 flex justify-between items-center gap-2 flex-wrap">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                      {currentDocument?.versions[0].VersionNumber}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold mb-1">
                      {currentDocument?.document.FileName}
                    </h1>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock
                        size={14}
                        className="text-gray-500 max-sm:hidden"
                      />
                      Last modified:{" "}
                      {currentDocument?.versions[0].ModificationDate
                        ? new Date(
                            currentDocument?.versions[0]?.ModificationDate
                          ).toLocaleString()
                        : "—"}{" "}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleViewDocument}
                      className="w-full sm:w-auto px-2 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <EyeIcon /> View
                    </Button>
                  </div>
                </div>
                <div className="mb-4  border border-gray-200 rounded-md bg-gray-50">
                  {/* <p>{document.content}</p> */}
                </div>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Document Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Type
                  </h4>
                  <p className="text-gray-900">
                    {currentDocument?.document?.DataType}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Confidential
                  </h4>
                  <p className="text-gray-900">
                    {currentDocument?.document?.Confidential ? "Yes" : "No"}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Department Id
                  </h4>
                  <p className="text-gray-900">
                    {currentDocument?.document?.DepartmentId}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Sub-Department Id
                  </h4>
                  <p className="text-gray-900">
                    {" "}
                    {currentDocument?.document?.SubDepartmentId}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    File Description
                  </h4>
                  <p className="text-gray-900">
                    {" "}
                    {currentDocument?.document?.FileDescription}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    File Date
                  </h4>
                  <p className="text-gray-900">
                    {" "}
                    {currentDocument?.document?.FileDate
                      ? new Date(
                          currentDocument.document.FileDate
                        ).toLocaleString()
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case "versions":
        return <DocumentVersionHistory document={currentDocument} />;
      case "collaboration":
        return <DocumentCollaboration document={currentDocument} />;
      case "approval":
        return <DocumentApproval document={currentDocument} />;
      case "audit":
        return <DocumentAuditTrail document={currentDocument} />;
      case "restrictions":
        return (
          <FieldRestrictions
            // restrictedFields={restrictedFields}
            document={[]}
            users={[
              { id: "1", name: "Alice" },
              { id: "2", name: "Bob" },
            ]}
            onRestrictField={handleRestrictField}
            onRemoveRestriction={handleRemoveRestriction}
          />
        );
      default:
        return null;
    }
  };

  const tabs = [
    { id: "document", name: "Document", icon: <ClipboardList size={16} /> },
    { id: "versions", name: "Versions", icon: <History size={16} /> },
    {
      id: "collaboration",
      name: "Collaboration",
      icon: <MessageSquare size={16} />,
    },
    { id: "approval", name: "Approvals", icon: <CheckCircle size={16} /> },
    { id: "audit", name: "Audit Trail", icon: <ClipboardList size={16} /> },
    {
      id: "restrictions",
      name: "Restrictions",
      icon: <ClipboardList size={16} />,
    },
  ];
  if (loading)
    return (
      <div className="flex items-center justify-center">
        <Loader />
      </div>
    );

  if (!currentDocument) return <div>Document not found</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center flex-1 w-full">
          <button
            onClick={() => navigate("/dashboard")}
            className="mr-2 p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 ">
            {currentDocument?.document.FileName}
          </h1>
        </div>

        {/* <div className="flex flex-wrap gap-2">
          <Button
            className="btn flex items-center gap-2 w-full sm:w-auto"
            variant="outline"
          >
            <Share2 size={16} />
            <span className="inline">Share</span>
          </Button>
          <Button
            className="btn flex items-center gap-2 w-full sm:w-auto"
            variant="outline"
          >
            <Download size={16} />
            <span className="inline">Download</span>
          </Button>
        </div> */}
      </div>

      <div className="mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 pb-2">
        <nav className="flex flex-nowrap -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center py-3 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}
    </div>
  );
};

export default DocumentView;
