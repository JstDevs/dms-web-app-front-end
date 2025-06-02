import React from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "../contexts/DocumentContext";
import DocumentCard from "../components/documents/DocumentCard";
import { Clock, FileCheck, AlertTriangle, Folder } from "lucide-react";

const Dashboard: React.FC = () => {
  const { documents } = useDocument();
  const navigate = useNavigate();

  // Filter documents by status
  const recentDocuments = documents.slice(0, 4);
  const pendingApproval = documents.filter(
    (doc) => doc.status === "pending_approval"
  );
  const needsAttention = documents.filter(
    (doc) => doc.status === "needs_attention"
  );

  const handleCardClick = (id: string) => {
    navigate(`/documents/${id}`);
  };

  const statCards = [
    {
      title: "Pending Approvals",
      count: pendingApproval.length,
      icon: <FileCheck className="h-8 w-8 text-yellow-500" />,
      color: "bg-yellow-50 border-yellow-100",
    },
    {
      title: "Needs Attention",
      count: needsAttention.length,
      icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
      color: "bg-red-50 border-red-100",
    },
    {
      title: "Recent Activity",
      count: recentDocuments.length,
      icon: <Clock className="h-8 w-8 text-blue-500" />,
      color: "bg-blue-50 border-blue-100",
    },
    {
      title: "Total Documents",
      count: documents.length,
      icon: <Folder className="h-8 w-8 text-green-500" />,
      color: "bg-green-50 border-green-100",
    },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-10 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`${stat.color} bg-slate-50 rounded-xl border border-gray-200 shadow-lg p-4 flex items-center transition-transform`}
            // onClick={() => navigate("/documents")}
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
      <div className="mb-8">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10 gap-4">
          {recentDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onClick={() => handleCardClick(document.id)}
            />
          ))}
        </div>
      </div>

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
      {/* <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-gray-900">Recent Activity</h2>
          <button
            onClick={() => navigate("/activity")}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          {documents.slice(0, 5).map((doc, index) => (
            <div
              key={doc.id}
              className={`p-4 flex items-start hover:bg-gray-50 cursor-pointer ${
                index !== documents.length - 1 ? "border-b border-gray-100" : ""
              }`}
              onClick={() => handleCardClick(doc.id)}
            >
              <div className="flex-shrink-0 mr-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {doc.lastModifiedBy} {doc.lastAction} "{doc.title}"
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {doc.lastModifiedAt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
};

export default Dashboard;
