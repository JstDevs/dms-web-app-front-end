import React, { createContext, useContext, useState, ReactNode } from "react";
import { Document, DocumentStatus } from "../types/Document";
// import { format } from 'date-fns';

// Mock data
const mockDocuments: Document[] = [
  {
    id: "doc-1",
    title: "Employee Handbook 2025",
    type: "Policy",
    content:
      "This document outlines the company policies and procedures for all employees. It covers topics such as code of conduct, benefits, leave policies, and more.",
    description: "Official company handbook with policies and guidelines",
    status: "pending_approval",
    department: "Human Resources",
    createdBy: "John Doe",
    createdAt: "2025-01-15T10:30:00Z",
    lastModifiedBy: "Jane Smith",
    lastModifiedAt: "2025-03-20T14:45:00Z",
    lastAction: "updated",
    versions: [
      {
        id: "v1",
        number: 1,
        createdAt: "2025-01-15T10:30:00Z",
        createdBy: "John Doe",
        content: "Initial version of the Employee Handbook.",
      },
    ],
    comments: [
      {
        id: "comment-1",
        userId: "user-2",
        userName: "Jane Smith",
        text: "Please review the updated leave policy section.",
        createdAt: "2025-03-20T14:50:00Z",
      },
    ],
    collaborators: [
      {
        id: "user-2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "Editor",
        avatar: "",
      },
    ],
    approvalMatrix: [
      {
        name: "Department Review",
        type: "all",
        active: true,
        completed: true,
        completedAt: "2025-03-18T09:20:00Z",
        approvers: [
          {
            id: "user-2",
            name: "Jane Smith",
            role: "Manager",
            approved: true,
            approvedAt: "2025-03-18T09:20:00Z",
            comment: "Looks good to me.",
          },
        ],
      },
      {
        name: "Executive Approval",
        type: "single",
        active: true,
        completed: false,
        completedAt: "",
        approvers: [
          {
            id: "user-1",
            name: "John Doe",
            role: "Admin",
            approved: false,
            rejected: false,
            comment: "",
          },
        ],
      },
    ],
    auditTrail: [
      {
        id: "audit-1",
        documentId: "doc-1",
        userId: "user-1",
        userName: "John Doe",
        action: "created the document",
        timestamp: "2025-01-15T10:30:00Z",
        changes: [],
      },
      {
        id: "audit-2",
        documentId: "doc-1",
        userId: "user-2",
        userName: "Jane Smith",
        action: "updated the document",
        timestamp: "2025-03-20T14:45:00Z",
        changes: [
          {
            field: "content",
            oldValue: "Initial version of the Employee Handbook.",
            newValue:
              "This document outlines the company policies and procedures for all employees.",
          },
        ],
      },
    ],
    activity: [
      {
        userId: "user-2",
        userName: "Jane Smith",
        action: "approved the document",
        timestamp: "2025-03-18T09:20:00Z",
      },
      {
        userId: "user-2",
        userName: "Jane Smith",
        action: "commented on the document",
        timestamp: "2025-03-20T14:50:00Z",
      },
    ],
  },
  {
    id: "doc-2",
    title: "Q1 2025 Financial Report",
    type: "Financial",
    content:
      "This financial report covers the company performance for Q1 2025. It includes revenue, expenses, profit margins, and growth projections for the upcoming quarters.",
    description: "Quarterly financial analysis and projections",
    status: "approved",
    department: "Finance",
    createdBy: "Robert Johnson",
    createdAt: "2025-04-05T11:15:00Z",
    lastModifiedBy: "Robert Johnson",
    lastModifiedAt: "2025-04-12T16:30:00Z",
    lastAction: "approved",
    versions: [
      {
        id: "v1",
        number: 1,
        createdAt: "2025-04-05T11:15:00Z",
        createdBy: "Robert Johnson",
        content: "Draft financial report for Q1 2025.",
      },
      {
        id: "v2",
        number: 2,
        createdAt: "2025-04-10T09:45:00Z",
        createdBy: "Robert Johnson",
        content: "Updated financial figures based on final calculations.",
      },
    ],
    comments: [
      {
        id: "comment-1",
        userId: "user-1",
        userName: "John Doe",
        text: "The revenue numbers look great. Good job!",
        createdAt: "2025-04-11T13:20:00Z",
      },
    ],
    collaborators: [
      {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
        role: "Reviewer",
        avatar: "",
      },
    ],
    approvalMatrix: [
      {
        name: "Financial Review",
        type: "all",
        active: true,
        completed: true,
        completedAt: "2025-04-12T10:15:00Z",
        approvers: [
          {
            id: "user-2",
            name: "Jane Smith",
            role: "Manager",
            approved: true,
            approvedAt: "2025-04-12T10:15:00Z",
            comment: "Numbers look accurate.",
          },
        ],
      },
      {
        name: "Executive Approval",
        type: "single",
        active: true,
        completed: true,
        completedAt: "2025-04-12T16:30:00Z",
        approvers: [
          {
            id: "user-1",
            name: "John Doe",
            role: "Admin",
            approved: true,
            approvedAt: "2025-04-12T16:30:00Z",
            comment: "Approved for distribution.",
          },
        ],
      },
    ],
    auditTrail: [
      {
        id: "audit-1",
        documentId: "doc-2",
        userId: "user-3",
        userName: "Robert Johnson",
        action: "created the document",
        timestamp: "2025-04-05T11:15:00Z",
        changes: [],
      },
      {
        id: "audit-2",
        documentId: "doc-2",
        userId: "user-3",
        userName: "Robert Johnson",
        action: "updated the document",
        timestamp: "2025-04-10T09:45:00Z",
        changes: [
          {
            field: "content",
            oldValue: "Draft financial report for Q1 2025.",
            newValue: "Updated financial figures based on final calculations.",
          },
        ],
      },
    ],
    activity: [
      {
        userId: "user-2",
        userName: "Jane Smith",
        action: "approved the document",
        timestamp: "2025-04-12T10:15:00Z",
      },
      {
        userId: "user-1",
        userName: "John Doe",
        action: "approved the document",
        timestamp: "2025-04-12T16:30:00Z",
      },
    ],
  },
  {
    id: "doc-3",
    title: "Product Launch Plan",
    type: "Marketing",
    content:
      "This document outlines the marketing and launch strategy for our new product XYZ. It includes target audience analysis, messaging, channel strategy, timeline, and budget.",
    description: "Strategic plan for new product launch",
    status: "needs_attention",
    department: "Marketing",
    createdBy: "Emily Wilson",
    createdAt: "2025-02-20T13:40:00Z",
    lastModifiedBy: "Jane Smith",
    lastModifiedAt: "2025-03-05T11:25:00Z",
    lastAction: "rejected",
    versions: [
      {
        id: "v1",
        number: 1,
        createdAt: "2025-02-20T13:40:00Z",
        createdBy: "Emily Wilson",
        content: "Initial draft of the product launch plan.",
      },
      {
        id: "v2",
        number: 2,
        createdAt: "2025-02-28T15:10:00Z",
        createdBy: "Emily Wilson",
        content: "Updated plan with revised timeline and budget.",
      },
    ],
    comments: [
      {
        id: "comment-1",
        userId: "user-2",
        userName: "Jane Smith",
        text: "We need to reconsider the budget allocation for digital channels.",
        createdAt: "2025-03-01T09:30:00Z",
      },
      {
        id: "comment-2",
        userId: "user-4",
        userName: "Emily Wilson",
        text: "I've updated the budget section. Please review again.",
        createdAt: "2025-03-03T14:15:00Z",
      },
    ],
    collaborators: [
      {
        id: "user-2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "Reviewer",
        avatar: "",
      },
      {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
        role: "Approver",
        avatar: "",
      },
    ],
    approvalMatrix: [
      {
        name: "Marketing Team Review",
        type: "all",
        active: true,
        completed: true,
        completedAt: "2025-03-02T16:45:00Z",
        approvers: [
          {
            id: "user-4",
            name: "Emily Wilson",
            role: "Viewer",
            approved: true,
            approvedAt: "2025-03-02T16:45:00Z",
            comment: "Looks good from my perspective.",
          },
        ],
      },
      {
        name: "Budget Approval",
        type: "single",
        active: true,
        completed: true,
        completedAt: "2025-03-05T11:25:00Z",
        approvers: [
          {
            id: "user-2",
            name: "Jane Smith",
            role: "Manager",
            approved: false,
            rejected: true,
            rejectedAt: "2025-03-05T11:25:00Z",
            comment:
              "The budget exceeds our quarterly allocation. Please revise.",
          },
        ],
      },
    ],
    auditTrail: [
      {
        id: "audit-1",
        documentId: "doc-3",
        userId: "user-4",
        userName: "Emily Wilson",
        action: "created the document",
        timestamp: "2025-02-20T13:40:00Z",
        changes: [],
      },
      {
        id: "audit-2",
        documentId: "doc-3",
        userId: "user-4",
        userName: "Emily Wilson",
        action: "updated the document",
        timestamp: "2025-02-28T15:10:00Z",
        changes: [
          {
            field: "content",
            oldValue: "Initial draft of the product launch plan.",
            newValue: "Updated plan with revised timeline and budget.",
          },
        ],
      },
      {
        id: "audit-3",
        documentId: "doc-3",
        userId: "user-2",
        userName: "Jane Smith",
        action: "rejected the document",
        timestamp: "2025-03-05T11:25:00Z",
        changes: [
          {
            field: "status",
            oldValue: "pending_approval",
            newValue: "needs_attention",
          },
        ],
      },
    ],
    activity: [
      {
        userId: "user-4",
        userName: "Emily Wilson",
        action: "approved the document",
        timestamp: "2025-03-02T16:45:00Z",
      },
      {
        userId: "user-2",
        userName: "Jane Smith",
        action: "rejected the document",
        timestamp: "2025-03-05T11:25:00Z",
      },
    ],
  },
  {
    id: "doc-4",
    title: "IT Security Policy",
    type: "Policy",
    content:
      "This document outlines the IT security policies and procedures for the organization. It covers data protection, access control, password requirements, incident response, and compliance measures.",
    description: "Organization-wide IT security guidelines",
    status: "pending_approval",
    department: "IT",
    createdBy: "John Doe",
    createdAt: "2025-03-10T09:15:00Z",
    lastModifiedBy: "John Doe",
    lastModifiedAt: "2025-04-01T13:50:00Z",
    lastAction: "updated",
    versions: [
      {
        id: "v1",
        number: 1,
        createdAt: "2025-03-10T09:15:00Z",
        createdBy: "John Doe",
        content: "Initial draft of IT security policy.",
      },
      {
        id: "v2",
        number: 2,
        createdAt: "2025-03-25T14:20:00Z",
        createdBy: "John Doe",
        content: "Updated policy with additional security requirements.",
      },
    ],
    comments: [
      {
        id: "comment-1",
        userId: "user-3",
        userName: "Robert Johnson",
        text: "Should we include a section on remote work security?",
        createdAt: "2025-03-15T10:45:00Z",
      },
      {
        id: "comment-2",
        userId: "user-1",
        userName: "John Doe",
        text: "Good point. I've added a section on remote work security protocols.",
        createdAt: "2025-03-25T13:30:00Z",
      },
    ],
    collaborators: [
      {
        id: "user-3",
        name: "Robert Johnson",
        email: "robert@example.com",
        role: "Reviewer",
        avatar: "",
      },
    ],
    approvalMatrix: [
      {
        name: "IT Department Review",
        type: "all",
        active: true,
        completed: true,
        completedAt: "2025-04-05T11:30:00Z",
        approvers: [
          {
            id: "user-3",
            name: "Robert Johnson",
            role: "Editor",
            approved: true,
            approvedAt: "2025-04-05T11:30:00Z",
            comment: "The policy looks comprehensive.",
          },
        ],
      },
      {
        name: "Legal Review",
        type: "single",
        active: true,
        completed: false,
        completedAt: "",
        approvers: [
          {
            id: "user-2",
            name: "Jane Smith",
            role: "Manager",
            approved: false,
            rejected: false,
            comment: "",
          },
        ],
      },
      {
        name: "Executive Approval",
        type: "single",
        active: false,
        completed: false,
        completedAt: "",
        approvers: [
          {
            id: "user-1",
            name: "John Doe",
            role: "Admin",
            approved: false,
            rejected: false,
            comment: "",
          },
        ],
      },
    ],
    auditTrail: [
      {
        id: "audit-1",
        documentId: "doc-4",
        userId: "user-1",
        userName: "John Doe",
        action: "created the document",
        timestamp: "2025-03-10T09:15:00Z",
        changes: [],
      },
      {
        id: "audit-2",
        documentId: "doc-4",
        userId: "user-1",
        userName: "John Doe",
        action: "updated the document",
        timestamp: "2025-03-25T14:20:00Z",
        changes: [
          {
            field: "content",
            oldValue: "Initial draft of IT security policy.",
            newValue: "Updated policy with additional security requirements.",
          },
        ],
      },
      {
        id: "audit-3",
        documentId: "doc-4",
        userId: "user-3",
        userName: "Robert Johnson",
        action: "approved the document",
        timestamp: "2025-04-05T11:30:00Z",
        changes: [],
      },
    ],
    activity: [
      {
        userId: "user-3",
        userName: "Robert Johnson",
        action: "commented on the document",
        timestamp: "2025-03-15T10:45:00Z",
      },
      {
        userId: "user-1",
        userName: "John Doe",
        action: "commented on the document",
        timestamp: "2025-03-25T13:30:00Z",
      },
      {
        userId: "user-3",
        userName: "Robert Johnson",
        action: "approved the document",
        timestamp: "2025-04-05T11:30:00Z",
      },
    ],
  },
];

interface DocumentContextType {
  documents: Document[];
  updateDocument: (updatedDocument: Document) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
);

export const DocumentProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);

  const updateDocument = (updatedDocument: Document) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === updatedDocument.id ? updatedDocument : doc))
    );
  };

  return (
    <DocumentContext.Provider value={{ documents, updateDocument }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
};
