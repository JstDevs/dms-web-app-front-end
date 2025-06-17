import React from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "../contexts/DocumentContext";
import DocumentCard from "../components/documents/DocumentCard";
import {
  Clock,
  FileCheck,
  AlertTriangle,
  Folder,
  FileText,
  Users,
  FileType,
} from "lucide-react";
import { Button } from "@chakra-ui/react";

const Dashboard: React.FC = () => {
  // const { documents } = useDocument();
  const navigate = useNavigate();

  // Filter documents by status
  // const recentDocuments = documents.slice(0, 4);
  // const pendingApproval = documents.filter(
  //   (doc) => doc.status === "pending_approval"
  // );
  // const needsAttention = documents.filter(
  //   (doc) => doc.status === "needs_attention"
  // );

  const handleCardClick = (id: string) => {
    navigate(`/documents/${id}`);
  };

  const statCards = [
    {
      title: "Total Documents",
      count: 5,
      icon: <Folder className="h-8 w-8 text-green-500" />,
      color: "border-green-100",
      path: "/documents/library",
    },
    // {
    //   title: "Departments",
    //   count: pendingApproval.length,
    //   icon: <FileCheck className="h-8 w-8 text-yellow-500" />,
    //   color: "border-yellow-100",
    // },
    // {
    //   title: "Sub-Departments",
    //   count: needsAttention.length,
    //   icon: <FileType className="h-8 w-8 text-red-500" />,
    //   color: "border-red-100",
    // },
    {
      title: "Users",
      count: 8,
      icon: <Users className="h-8 w-8 text-blue-500" />,
      color: "border-blue-100",
      path: "/users/members",
    },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-10 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`${stat.color} bg-slate-50 rounded-xl border border-gray-200 shadow-lg p-4 flex items-center transition-transform cursor-pointer hover:scale-105`}
            onClick={() => navigate(stat.path)}
          >
            <div className="mr-4">{stat.icon}</div>
            <div>
              <h3 className="font-medium text-gray-900">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Documents */}
      {/* <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-blue-700">
            Recent Documents
          </h2>
          <button
            onClick={() => navigate("/documents/upload")}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3   xl:gap-10 lg:gap-6 gap-4">
          {recentDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onClick={() => handleCardClick(document.id)}
            />
          ))}
        </div>
      </div> */}

      {/* Pending Approvals */}
      {/* <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-gray-900">
            Pending Approvals
          </h2>
          <button
            onClick={() => navigate("/pending-approvals")}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all
          </button>
        </div>

        {pendingApproval.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pendingApproval.slice(0, 4).map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onClick={() => handleCardClick(document.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-gray-500">No documents pending approval</p>
          </div>
        )}
      </div> */}

      {/* Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-800">
            Recent Activity
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="text-sm font-semibold border border-slate-200 hover:bg-slate-100 px-4 py-2 flex items-center"
          >
            View All
          </Button>
        </div>
        <div className="space-y-4">
          {[
            {
              action: "Document uploaded",
              file: "Q4_Report.pdf",
              time: "2 minutes ago",
              user: "John Doe",
            },
            {
              action: "File shared",
              file: "Project_Proposal.docx",
              time: "15 minutes ago",
              user: "Sarah Wilson",
            },
            {
              action: "Archive created",
              file: "2023_Documents.zip",
              time: "1 hour ago",
              user: "System",
            },
            {
              action: "Document accessed",
              file: "Company_Policy.pdf",
              time: "2 hours ago",
              user: "Mike Johnson",
            },
            {
              action: "Document updated",
              file: "Employee_Handbook.pdf",
              time: "3 hours ago",
              user: "HR Team",
            },
            {
              action: "Bulk upload completed",
              file: "Marketing_Assets.zip",
              time: "4 hours ago",
              user: "Marketing Team",
            },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    <span className="text-blue-600">{activity.user}</span>{" "}
                    {activity.action}
                  </p>
                  <p className="text-sm text-slate-600">{activity.file}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
