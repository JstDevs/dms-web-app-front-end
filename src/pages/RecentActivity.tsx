import React from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "../contexts/DocumentContext";
import { format } from "date-fns";
import { Clock } from "lucide-react";

const RecentActivity: React.FC = () => {
  const { documents } = useDocument();
  const navigate = useNavigate();

  // Combine all activities from all documents and sort by timestamp
  const allActivities = documents
    .flatMap((doc) =>
      doc.activity.map((activity) => ({
        ...activity,
        documentId: doc.id,
        documentTitle: doc.title,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Recent Activity</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        {allActivities.map((activity, index) => (
          <div
            key={`${activity.documentId}-${activity.timestamp}`}
            className={`p-4 flex items-start hover:bg-gray-50 cursor-pointer ${
              index !== allActivities.length - 1
                ? "border-b border-gray-100"
                : ""
            }`}
            onClick={() => navigate(`/documents/${activity.documentId}`)}
          >
            <div className="flex-shrink-0 mr-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {activity.userName} {activity.action} "{activity.documentTitle}"
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(activity.timestamp), "MMM d, yyyy h:mm a")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
