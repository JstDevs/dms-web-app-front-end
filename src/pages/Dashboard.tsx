import React, { useEffect, useState } from 'react';
import { useDocument } from '../contexts/DocumentContext';
import { Folder, FileText, BarChart3, RotateCcw } from 'lucide-react'; // Added RotateCcw for reset button
// import { Button } from '@chakra-ui/react'; // Uncomment if using Chakra UI buttons
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/api/axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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
  const { documentList, fetchDocumentList } = useDocument();
  const { selectedRole } = useAuth();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  
  // FIX: Renamed unused setters to be usable
  const [selectedYear] = useState<string>(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Mock data for pie chart
  const documentTypeData = [
    { name: 'PDF', value: 45 },
    { name: 'Word', value: 30 },
    { name: 'Excel', value: 15 },
    { name: 'Others', value: 10 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // Effect to fetch document list on role change
  useEffect(() => {
    if (selectedRole?.ID) {
      fetchDocumentList(Number(selectedRole.ID), documentList?.currentPage);
    }
  }, [selectedRole, documentList?.currentPage]);

  // Effect to fetch recent activities based on filters
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`documents/activities-dashboard`, {
          params: {
            // Note: If startDate and endDate are present, the backend should ideally prioritize them over 'year'.
            year: selectedYear, // Kept for general filtering if dates aren't set
            startDate: startDate || undefined, // Send only if not empty string
            endDate: endDate || undefined, // Send only if not empty string
          },
        });
        
        if (!data?.success) throw new Error('Failed to fetch activities');

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
  }, [selectedYear, startDate, endDate]); // Dependencies now include startDate and endDate

  const statCards = [
    {
      title: 'Total Documents',
      count: documentList?.totalDocuments,
      icon: <Folder className="h-8 w-8 text-green-500" />,
      color: 'border-green-100',
    },
    {
      title: 'Pages',
      count: 0, // Placeholder - fetch real data if possible
      icon: <FileText className="h-8 w-8 text-purple-500" />,
      color: 'border-purple-100',
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

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
    // Optionally reset year if you want: setSelectedYear(new Date().getFullYear().toString());
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`${stat.color} bg-slate-50 rounded-xl border border-gray-200 shadow-lg p-4 flex items-center transition-transform hover:scale-105 cursor-default`}
          >
            <div className="mr-4">{stat.icon}</div>
            <div>
              <h3 className="font-medium text-gray-900">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* --- Date Range Filter (The requested feature) --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-6 flex flex-col md:flex-row items-start md:items-end gap-4">
        <div className="flex-1 w-full">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            // Ensure end date is not before start date (basic validation)
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined} 
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-1 w-full">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            // Ensure end date is not before start date (basic validation)
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleResetDates}
          disabled={!startDate && !endDate}
          className="md:h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 transition duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </button>
      </div>
      {/* ------------------------------------------------------------------ */}

      {/* --- Dashboard Analytics Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart - Document Types */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-slate-800">
              Document Types
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={documentTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                // FIX: Used a custom component for label to prevent rendering problems with object types, though your original was mostly fine.
                label={({ name, value }) => `${name}: ${value}%`} 
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {documentTypeData.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Value']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-700">Total Uploads</span>
              <span className="text-2xl font-bold text-blue-600">24</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-700">Total Downloads</span>
              <span className="text-2xl font-bold text-green-600">18</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-700">Active Users</span>
              <span className="text-2xl font-bold text-purple-600">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Confidential Docs</span>
              <span className="text-2xl font-bold text-red-600">8</span>
            </div>
          </div>
        </div>
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