import React, { createContext, useContext, useState, ReactNode } from "react";
import { Document, DocumentStatus } from "../types/Document";
// import { format } from 'date-fns';

// Mock data
const mockDocuments: Document[] = [
  // {
  //   id: "doc-1",
  //   title: "Employee Handbook 2025",
  //   type: "Policy",
  //   content:
  //     "This document outlines the company policies and procedures for all employees. It covers topics such as code of conduct, benefits, leave policies, and more.",
  //   description: "Official company handbook with policies and guidelines",
  //   status: "pending_approval",
  //   department: "Human Resources",
  //   createdBy: "John Doe",
  //   createdAt: "2025-01-15T10:30:00Z",
  //   lastModifiedBy: "Jane Smith",
  //   lastModifiedAt: "2025-03-20T14:45:00Z",
  //   lastAction: "updated",
  //   versions: [
  //     {
  //       id: "v1",
  //       number: 1,
  //       createdAt: "2025-01-15T10:30:00Z",
  //       createdBy: "John Doe",
  //       content: "Initial version of the Employee Handbook.",
  //     },
  //   ],
  //   comments: [
  //     {
  //       id: "comment-1",
  //       userId: "user-2",
  //       userName: "Jane Smith",
  //       text: "Please review the updated leave policy section.",
  //       createdAt: "2025-03-20T14:50:00Z",
  //     },
  //   ],
  //   collaborators: [
  //     {
  //       id: "user-2",
  //       name: "Jane Smith",
  //       email: "jane@example.com",
  //       role: "Editor",
  //       avatar: "",
  //     },
  //   ],
  //   approvalMatrix: [
  //     {
  //       name: "Department Review",
  //       type: "all",
  //       active: true,
  //       completed: true,
  //       completedAt: "2025-03-18T09:20:00Z",
  //       approvers: [
  //         {
  //           id: "user-2",
  //           name: "Jane Smith",
  //           role: "Manager",
  //           approved: true,
  //           approvedAt: "2025-03-18T09:20:00Z",
  //           comment: "Looks good to me.",
  //         },
  //       ],
  //     },
  //     {
  //       name: "Executive Approval",
  //       type: "single",
  //       active: true,
  //       completed: false,
  //       completedAt: "",
  //       approvers: [
  //         {
  //           id: "user-1",
  //           name: "John Doe",
  //           role: "Admin",
  //           approved: false,
  //           rejected: false,
  //           comment: "",
  //         },
  //       ],
  //     },
  //   ],
  //   auditTrail: [
  //     {
  //       id: "audit-1",
  //       documentId: "doc-1",
  //       userId: "user-1",
  //       userName: "John Doe",
  //       action: "created the document",
  //       timestamp: "2025-01-15T10:30:00Z",
  //       changes: [],
  //     },
  //     {
  //       id: "audit-2",
  //       documentId: "doc-1",
  //       userId: "user-2",
  //       userName: "Jane Smith",
  //       action: "updated the document",
  //       timestamp: "2025-03-20T14:45:00Z",
  //       changes: [
  //         {
  //           field: "content",
  //           oldValue: "Initial version of the Employee Handbook.",
  //           newValue:
  //             "This document outlines the company policies and procedures for all employees.",
  //         },
  //       ],
  //     },
  //   ],
  //   activity: [
  //     {
  //       userId: "user-2",
  //       userName: "Jane Smith",
  //       action: "approved the document",
  //       timestamp: "2025-03-18T09:20:00Z",
  //     },
  //     {
  //       userId: "user-2",
  //       userName: "Jane Smith",
  //       action: "commented on the document",
  //       timestamp: "2025-03-20T14:50:00Z",
  //     },
  //   ],
  // },
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
    subDepartment: "Accounts",
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

  // {
  //   id: "doc-3",
  //   title: "Q2 Marketing Strategy",
  //   type: "Marketing",
  //   content:
  //     "Comprehensive marketing plan for Q2 2025 including digital campaigns, social media strategy, and upcoming product launches.",
  //   description: "Quarterly marketing strategy document",
  //   status: "pending_approval",
  //   department: "Marketing",
  //   createdBy: "Sarah Williams",
  //   createdAt: "2025-03-15T09:30:00Z",
  //   lastModifiedBy: "Sarah Williams",
  //   lastModifiedAt: "2025-03-20T14:45:00Z",
  //   lastAction: "updated",
  //   subDepartment: "Digital",
  //   versions: [
  //     {
  //       id: "v1",
  //       number: 1,
  //       createdAt: "2025-03-15T09:30:00Z",
  //       createdBy: "Sarah Williams",
  //       content: "Initial draft of Q2 marketing strategy.",
  //     },
  //     {
  //       id: "v2",
  //       number: 2,
  //       createdAt: "2025-03-20T14:45:00Z",
  //       createdBy: "Sarah Williams",
  //       content: "Added budget allocations and campaign timelines.",
  //     },
  //   ],
  //   comments: [
  //     {
  //       id: "comment-2",
  //       userId: "user-4",
  //       userName: "Michael Brown",
  //       text: "We should allocate more budget to influencer marketing.",
  //       createdAt: "2025-03-18T11:20:00Z",
  //     },
  //   ],
  //   collaborators: [
  //     {
  //       id: "user-4",
  //       name: "Michael Brown",
  //       email: "michael@example.com",
  //       role: "Marketing Director",
  //       avatar: "",
  //     },
  //   ],
  //   approvalMatrix: [
  //     {
  //       name: "Marketing Review",
  //       type: "any",
  //       active: true,
  //       completed: false,
  //       completedAt: "",
  //       approvers: [
  //         {
  //           id: "user-4",
  //           name: "Michael Brown",
  //           role: "Marketing Director",
  //           approved: false,
  //         },
  //       ],
  //     },
  //   ],
  //   auditTrail: [
  //     {
  //       id: "audit-3",
  //       documentId: "doc-3",
  //       userId: "user-5",
  //       userName: "Sarah Williams",
  //       action: "created the document",
  //       timestamp: "2025-03-15T09:30:00Z",
  //       changes: [],
  //     },
  //   ],
  //   activity: [
  //     {
  //       userId: "user-5",
  //       userName: "Sarah Williams",
  //       action: "shared the document",
  //       timestamp: "2025-03-15T10:15:00Z",
  //     },
  //   ],
  // },
  // {
  //   id: "doc-4",
  //   title: "Product Development Roadmap",
  //   type: "Technical",
  //   content:
  //     "Detailed product development timeline for the next fiscal year including milestones, resource allocation, and feature priorities.",
  //   description: "Annual product development plan",
  //   status: "draft",
  //   department: "Engineering",
  //   createdBy: "David Chen",
  //   createdAt: "2025-02-28T13:20:00Z",
  //   lastModifiedBy: "David Chen",
  //   lastModifiedAt: "2025-03-10T16:10:00Z",
  //   lastAction: "updated",
  //   subDepartment: "Product",
  //   versions: [
  //     {
  //       id: "v1",
  //       number: 1,
  //       createdAt: "2025-02-28T13:20:00Z",
  //       createdBy: "David Chen",
  //       content: "Initial product roadmap draft.",
  //     },
  //   ],
  //   comments: [],
  //   collaborators: [
  //     {
  //       id: "user-6",
  //       name: "Emma Wilson",
  //       email: "emma@example.com",
  //       role: "Product Manager",
  //       avatar: "",
  //     },
  //   ],
  //   approvalMatrix: [
  //     {
  //       name: "Technical Review",
  //       type: "all",
  //       active: false,
  //       completed: false,
  //       completedAt: "",
  //       approvers: [
  //         {
  //           id: "user-6",
  //           name: "Emma Wilson",
  //           role: "Product Manager",
  //           approved: false,
  //         },
  //       ],
  //     },
  //   ],
  //   auditTrail: [
  //     {
  //       id: "audit-4",
  //       documentId: "doc-4",
  //       userId: "user-7",
  //       userName: "David Chen",
  //       action: "created the document",
  //       timestamp: "2025-02-28T13:20:00Z",
  //       changes: [],
  //     },
  //   ],
  //   activity: [],
  // },
  // {
  //   id: "doc-5",
  //   title: "HR Policy Update 2025",
  //   type: "Policy",
  //   content:
  //     "Updated company HR policies including remote work guidelines, benefits changes, and code of conduct revisions.",
  //   description: "Annual HR policy updates",
  //   status: "approved",
  //   department: "Human Resources",
  //   createdBy: "Lisa Rodriguez",
  //   createdAt: "2025-01-10T10:00:00Z",
  //   lastModifiedBy: "Lisa Rodriguez",
  //   lastModifiedAt: "2025-01-25T15:30:00Z",
  //   lastAction: "approved",
  //   subDepartment: "Compliance",
  //   versions: [
  //     {
  //       id: "v1",
  //       number: 1,
  //       createdAt: "2025-01-10T10:00:00Z",
  //       createdBy: "Lisa Rodriguez",
  //       content: "First draft of policy updates.",
  //     },
  //     {
  //       id: "v2",
  //       number: 2,
  //       createdAt: "2025-01-20T14:15:00Z",
  //       createdBy: "Lisa Rodriguez",
  //       content: "Incorporated legal team feedback.",
  //     },
  //   ],
  //   comments: [
  //     {
  //       id: "comment-3",
  //       userId: "user-8",
  //       userName: "James Wilson",
  //       text: "The remote work policy needs clearer guidelines for international employees.",
  //       createdAt: "2025-01-15T11:45:00Z",
  //     },
  //   ],
  //   collaborators: [
  //     {
  //       id: "user-8",
  //       name: "James Wilson",
  //       email: "james@example.com",
  //       role: "Legal Counsel",
  //       avatar: "",
  //     },
  //   ],
  //   approvalMatrix: [
  //     {
  //       name: "Legal Review",
  //       type: "all",
  //       active: true,
  //       completed: true,
  //       completedAt: "2025-01-22T09:30:00Z",
  //       approvers: [
  //         {
  //           id: "user-8",
  //           name: "James Wilson",
  //           role: "Legal Counsel",
  //           approved: true,
  //           approvedAt: "2025-01-22T09:30:00Z",
  //           comment: "All policies comply with current regulations.",
  //         },
  //       ],
  //     },
  //     {
  //       name: "Executive Approval",
  //       type: "single",
  //       active: true,
  //       completed: true,
  //       completedAt: "2025-01-25T15:30:00Z",
  //       approvers: [
  //         {
  //           id: "user-1",
  //           name: "John Doe",
  //           role: "Admin",
  //           approved: true,
  //           approvedAt: "2025-01-25T15:30:00Z",
  //           comment: "Approved for company-wide distribution.",
  //         },
  //       ],
  //     },
  //   ],
  //   auditTrail: [
  //     {
  //       id: "audit-5",
  //       documentId: "doc-5",
  //       userId: "user-9",
  //       userName: "Lisa Rodriguez",
  //       action: "created the document",
  //       timestamp: "2025-01-10T10:00:00Z",
  //       changes: [],
  //     },
  //   ],
  //   activity: [
  //     {
  //       userId: "user-8",
  //       userName: "James Wilson",
  //       action: "approved the document",
  //       timestamp: "2025-01-22T09:30:00Z",
  //     },
  //     {
  //       userId: "user-1",
  //       userName: "John Doe",
  //       action: "approved the document",
  //       timestamp: "2025-01-25T15:30:00Z",
  //     },
  //   ],
  // },
  // {
  //   id: "doc-6",
  //   title: "IT Infrastructure Upgrade Proposal",
  //   type: "Technical",
  //   content:
  //     "Proposal for upgrading company IT infrastructure including hardware refresh, cloud migration plan, and security enhancements.",
  //   description: "3-year IT infrastructure strategy",
  //   status: "needs_attention",
  //   department: "IT",
  //   createdBy: "Mark Taylor",
  //   createdAt: "2025-03-01T08:45:00Z",
  //   lastModifiedBy: "Mark Taylor",
  //   lastModifiedAt: "2025-03-15T11:20:00Z",
  //   lastAction: "updated",
  //   subDepartment: "Infrastructure",
  //   versions: [
  //     {
  //       id: "v1",
  //       number: 1,
  //       createdAt: "2025-03-01T08:45:00Z",
  //       createdBy: "Mark Taylor",
  //       content: "Initial proposal draft.",
  //     },
  //     {
  //       id: "v2",
  //       number: 2,
  //       createdAt: "2025-03-10T10:30:00Z",
  //       createdBy: "Mark Taylor",
  //       content: "Added cost estimates and timeline.",
  //     },
  //     {
  //       id: "v3",
  //       number: 3,
  //       createdAt: "2025-03-15T11:20:00Z",
  //       createdBy: "Mark Taylor",
  //       content: "Incorporated feedback from security team.",
  //     },
  //   ],
  //   comments: [
  //     {
  //       id: "comment-4",
  //       userId: "user-10",
  //       userName: "Alex Johnson",
  //       text: "We should prioritize the security upgrades in phase 1.",
  //       createdAt: "2025-03-05T14:15:00Z",
  //     },
  //   ],
  //   collaborators: [
  //     {
  //       id: "user-10",
  //       name: "Alex Johnson",
  //       email: "alex@example.com",
  //       role: "Security Specialist",
  //       avatar: "",
  //     },
  //   ],
  //   approvalMatrix: [
  //     {
  //       name: "Technical Review",
  //       type: "all",
  //       active: true,
  //       completed: false,
  //       completedAt: "",
  //       approvers: [
  //         {
  //           id: "user-10",
  //           name: "Alex Johnson",
  //           role: "Security Specialist",
  //           approved: false,
  //         },
  //       ],
  //     },
  //   ],
  //   auditTrail: [
  //     {
  //       id: "audit-6",
  //       documentId: "doc-6",
  //       userId: "user-11",
  //       userName: "Mark Taylor",
  //       action: "created the document",
  //       timestamp: "2025-03-01T08:45:00Z",
  //       changes: [],
  //     },
  //   ],
  //   activity: [
  //     {
  //       userId: "user-11",
  //       userName: "Mark Taylor",
  //       action: "shared the document with IT team",
  //       timestamp: "2025-03-01T09:30:00Z",
  //     },
  //   ],
  // },
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
