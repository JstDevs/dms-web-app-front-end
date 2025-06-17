import React, { createContext, useContext, useState, ReactNode } from "react";
// import { Document } from "../types/Document";
import { fetchDocumentAnalytics } from "@/pages/Document/utils/documentHelpers";
import { CurrentDocument, DocumentContextType } from "@/types/Document";

// Mock data
// const mockDocuments: Document[] = [
//   {
//     id: "doc-2",
//     title: "Q1 2025 Financial Report",
//     type: "Financial",
//     content:
//       "This financial report covers the company performance for Q1 2025. It includes revenue, expenses, profit margins, and growth projections for the upcoming quarters.",
//     description: "Quarterly financial analysis and projections",
//     status: "approved",
//     department: "Finance",
//     createdBy: "Robert Johnson",
//     createdAt: "2025-04-05T11:15:00Z",
//     lastModifiedBy: "Robert Johnson",
//     lastModifiedAt: "2025-04-12T16:30:00Z",
//     lastAction: "approved",
//     subDepartment: "Accounts",
//     versions: [
//       {
//         id: "v1",
//         number: 1,
//         createdAt: "2025-04-05T11:15:00Z",
//         createdBy: "Robert Johnson",
//         content: "Draft financial report for Q1 2025.",
//       },
//       {
//         id: "v2",
//         number: 2,
//         createdAt: "2025-04-10T09:45:00Z",
//         createdBy: "Robert Johnson",
//         content: "Updated financial figures based on final calculations.",
//       },
//     ],
//     comments: [
//       {
//         id: "comment-1",
//         userId: "user-1",
//         userName: "John Doe",
//         text: "The revenue numbers look great. Good job!",
//         createdAt: "2025-04-11T13:20:00Z",
//       },
//     ],
//     collaborators: [
//       {
//         id: "user-1",
//         name: "John Doe",
//         email: "john@example.com",
//         role: "Reviewer",
//         avatar: "",
//       },
//     ],
//     approvalMatrix: [
//       {
//         name: "Financial Review",
//         type: "all",
//         active: true,
//         completed: true,
//         completedAt: "2025-04-12T10:15:00Z",
//         approvers: [
//           {
//             id: "user-2",
//             name: "Jane Smith",
//             role: "Manager",
//             approved: true,
//             approvedAt: "2025-04-12T10:15:00Z",
//             comment: "Numbers look accurate.",
//           },
//         ],
//       },
//       {
//         name: "Executive Approval",
//         type: "single",
//         active: true,
//         completed: true,
//         completedAt: "2025-04-12T16:30:00Z",
//         approvers: [
//           {
//             id: "user-1",
//             name: "John Doe",
//             role: "Admin",
//             approved: true,
//             approvedAt: "2025-04-12T16:30:00Z",
//             comment: "Approved for distribution.",
//           },
//         ],
//       },
//     ],
//     auditTrail: [
//       {
//         id: "audit-1",
//         documentId: "doc-2",
//         userId: "user-3",
//         userName: "Robert Johnson",
//         action: "created the document",
//         timestamp: "2025-04-05T11:15:00Z",
//         changes: [],
//       },
//       {
//         id: "audit-2",
//         documentId: "doc-2",
//         userId: "user-3",
//         userName: "Robert Johnson",
//         action: "updated the document",
//         timestamp: "2025-04-10T09:45:00Z",
//         changes: [
//           {
//             field: "content",
//             oldValue: "Draft financial report for Q1 2025.",
//             newValue: "Updated financial figures based on final calculations.",
//           },
//         ],
//       },
//     ],
//     activity: [
//       {
//         userId: "user-2",
//         userName: "Jane Smith",
//         action: "approved the document",
//         timestamp: "2025-04-12T10:15:00Z",
//       },
//       {
//         userId: "user-1",
//         userName: "John Doe",
//         action: "approved the document",
//         timestamp: "2025-04-12T16:30:00Z",
//       },
//     ],
//   },
// ];

const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentDocument, setCurrentDocument] =
    useState<CurrentDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = React.useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const document = await fetchDocumentAnalytics(id); // Make sure this is the correct function
      if (!document) throw new Error("Document not found");

      setCurrentDocument(document.data);
    } catch (err) {
      setError("Failed to fetch document");
      console.error("Error fetching document:", err);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array means this function is memoized and won't change

  const updateDocument = React.useCallback(
    (updatedDocument: CurrentDocument) => {
      setCurrentDocument(updatedDocument);
    },
    []
  );

  return (
    <DocumentContext.Provider
      value={{
        currentDocument,
        loading,
        error,
        fetchDocument,
        updateDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export default DocumentContext;

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
};
