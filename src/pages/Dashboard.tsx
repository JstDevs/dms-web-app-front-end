import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocument } from '../contexts/DocumentContext';
import { Folder, FileText, Users } from 'lucide-react';
// import { Button } from '@chakra-ui/react';
import { useUsers } from './Users/useUser';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import axios from '@/api/axios';

interface Activity {
  ID: number;
  DocumentID: number;
  LinkID: string;
  Action: string;
  ActionBy: number;
  ActionDate: string;
  IPAddress: string;
  UserAgent: string;
  actor: {
    id: number;
    userName: string;
  };
  documentNew: {
    ID: number;
    FileName: string;
    FileDescription: string;
    DataType: string;
    Confidential: boolean;
  };
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { users } = useUsers();
  const { documentList, fetchDocumentList } = useDocument();
  const { selectedRole } = useAuth();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const documentsPermissions = useModulePermissions(3);
  const usersPermissions = useModulePermissions(5);

  useEffect(() => {
    if (selectedRole?.ID) {
      fetchDocumentList(Number(selectedRole.ID), documentList?.currentPage);
    }
  }, [selectedRole, documentList?.currentPage]);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`documents/activities-dashboard`);
        // console.log({ data });

        if (!data?.success) throw new Error('Failed to fetch activities');

        // Get the audit trails from the new API response
        const auditTrails = data?.data?.auditTrails || [];

        // Sort by date (newest first) and take top 10
        const sortedActivities = auditTrails
          .sort(
            (a: Activity, b: Activity) =>
              new Date(b.ActionDate).getTime() -
              new Date(a.ActionDate).getTime()
          )
          .slice(0, 10);

        setRecentActivities(sortedActivities);
      } catch (error) {
        console.error('Failed to fetch activities', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const statCards = [
    {
      title: 'Total Documents',
      count: documentList?.totalDocuments,
      icon: <Folder className="h-8 w-8 text-green-500" />,
      color: 'border-green-100',
      path: '/documents/library',
      isPermitted: documentsPermissions?.View,
    },
    {
      title: 'Users',
      count: users.length,
      icon: <Users className="h-8 w-8 text-blue-500" />,
      color: 'border-blue-100',
      path: '/users/members',
      isPermitted: usersPermissions?.View,
    },
  ];

  const formatActivityType = (action: string) => {
    switch (action) {
      case 'VIEWED':
        return 'viewed document';
      case 'DOWNLOADED':
        return 'downloaded document';
      case 'CREATED':
        return 'created document';
      case 'UPDATED':
        return 'updated document';
      case 'DELETED':
        return 'deleted document';
      default:
        return action.toLowerCase().replace(/_/g, ' ');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-10 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`${stat.color} bg-slate-50 rounded-xl border border-gray-200 shadow-lg p-4 flex items-center transition-transform cursor-pointer hover:scale-105`}
            onClick={() => stat.isPermitted && navigate(stat.path)}
          >
            <div className="mr-4">{stat.icon}</div>
            <div>
              <h3 className="font-medium text-gray-900">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-800">
            Recent Activity
          </h3>
          {/* <Button
            variant="outline"
            size="sm"
            className="text-sm font-semibold border border-slate-200 hover:bg-slate-100 px-4 py-2 flex items-center"
          >
            View All
          </Button> */}
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.ID}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      <span className="text-blue-600">
                        {activity.actor.userName}
                      </span>{' '}
                      {formatActivityType(activity.Action)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {activity.documentNew.FileName}
                      {activity.documentNew.Confidential && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Confidential
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {formatTimeAgo(activity.ActionDate)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            No recent activities found
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
