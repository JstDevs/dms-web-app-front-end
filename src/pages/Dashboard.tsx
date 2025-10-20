import React, { useEffect, useMemo, useState } from 'react';
import { useDocument } from '../contexts/DocumentContext';
import { Folder, BarChart3, FileText, RotateCcw, ChevronDown } from 'lucide-react';
// import { Button } from '@chakra-ui/react'; // Uncomment if using Chakra UI buttons
import { useAuth } from '@/contexts/AuthContext';
//
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import axios from '@/api/axios';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
// import { fetchDocuments } from '@/pages/Document/utils/uploadAPIs'; // Unused import
//

//

const Dashboard: React.FC = () => {
  const { documentList, fetchDocumentList } = useDocument();
  const { selectedRole } = useAuth();
  // Recent Activity moved to AuditTrail page
  
// Add this after line 16 in Dashboard.tsx
// console.log('🔍 Auth Context Debug:', {
//   selectedRole: selectedRole,
//   hasSelectedRole: !!selectedRole,
//   hasID: !!selectedRole?.ID,
//   idValue: selectedRole?.ID,
//   idType: typeof selectedRole?.ID
// });

  // Filters for analytics
  const [selectedYear] = useState<string>(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Department and Sub-department filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<string>('');
  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);
  
  // Department options hook
  const {
    departmentOptions,
    getSubDepartmentOptions,
  } = useNestedDepartmentOptions();

  // Dynamic state for charts and quick stats
  const [documentTypeData, setDocumentTypeData] = useState<{ name: string; value: number }[]>([]);
  const [uploadsCount, setUploadsCount] = useState<number>(0);
  const [downloadsCount, setDownloadsCount] = useState<number>(0);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [confidentialDocsCount, setConfidentialDocsCount] = useState<number>(0);

  const COLORS = ['#5fad56', '#f2c14e', '#f78154', '#4d9078'];

  // Effect to fetch document list on role change
  useEffect(() => {
    // console.log('🔍 Dashboard useEffect triggered:', {
    //   selectedRole: selectedRole,
    //   selectedRoleID: selectedRole?.ID,
    //   hasSelectedRole: !!selectedRole,
    //   fetchDocumentList: typeof fetchDocumentList
    // });
    
    if (selectedRole?.ID) {
      // console.log('🔍 Calling fetchDocumentList with userId:', selectedRole.ID);
      
      // Test direct API call
      // const testDirectAPI = async () => {
      //   try {
      //     console.log('🔍 Testing direct API call...');
      //     const response = await fetchDocuments(Number(selectedRole.ID), 1);
      //     console.log('🔍 Direct API response:', response);
      //     console.log('🔍 Direct API documents:', response.data.documents);
      //     console.log('🔍 First document keys:', Object.keys(response.data.documents[0] || {}));
      //     console.log('🔍 First document newdoc keys:', Object.keys(response.data.documents[0]?.newdoc || {}));
      //     console.log('🔍 First document PageCount:', response.data.documents[0]?.newdoc?.PageCount);
      //   } catch (error) {
      //     console.log('🔍 Direct API error:', error);
      //   }
      // };
      
      // testDirectAPI();
      
      // Use the same API call that's working in MyDocuments
      fetchDocumentList(Number(selectedRole.ID), 1);
    } else {
      // console.log('🔍 No selectedRole.ID, not fetching documents');
    }
  }, [selectedRole]);

  // Update sub-departments when department selection changes
  useEffect(() => {
    if (selectedDepartment && departmentOptions.length > 0) {
      const selectedDeptId = departmentOptions.find(
        (dept) => dept.label === selectedDepartment
      )?.value;

      if (selectedDeptId) {
        const subs = getSubDepartmentOptions(Number(selectedDeptId));
        setSubDepartmentOptions(subs);
        if (!subs.some((sub) => sub.label === selectedSubDepartment)) {
          setSelectedSubDepartment('');
        }
      }
    } else {
      setSubDepartmentOptions([]);
      if (selectedSubDepartment) {
        setSelectedSubDepartment('');
      }
    }
  }, [selectedDepartment, departmentOptions]);

  // Fetch activities and aggregate for analytics
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Normalize date params to match potential backend expectations
        const hasRange = Boolean(startDate && endDate);
        const startAt = startDate ? new Date(startDate + 'T00:00:00.000Z').toISOString() : undefined;
        const endAt = endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined;

        const paramsWhenRange = hasRange
          ? {
              startDate: startDate,
              endDate: endDate,
              start_date: startDate,
              end_date: endDate,
              from: startDate,
              to: endDate,
              startAt,
              endAt,
              ...(selectedDepartment && { department: selectedDepartment }),
              ...(selectedSubDepartment && { subDepartment: selectedSubDepartment }),
            }
          : { 
              year: selectedYear,
              ...(selectedDepartment && { department: selectedDepartment }),
              ...(selectedSubDepartment && { subDepartment: selectedSubDepartment }),
            };

        const { data } = await axios.get(`/documents/activities-dashboard`, {
          params: paramsWhenRange,
        });
        
        if (!data?.success) throw new Error('Failed to fetch activities');

        const auditTrails = data?.data?.auditTrails || [];

        // Client-side date filtering (inclusive) to ensure UI reflects selected range
        const startBound = startDate ? new Date(startDate + 'T00:00:00') : null;
        const endBound = endDate ? new Date(endDate + 'T23:59:59.999') : null;
        const withinRange = (d: string) => {
          const ts = new Date(d);
          if (startBound && ts < startBound) return false;
          if (endBound && ts > endBound) return false;
          return true;
        };
        const filteredActivities = startBound || endBound
          ? auditTrails.filter((a: any) => withinRange(a.ActionDate))
          : auditTrails;

        // Aggregate dynamic stats from all filtered activities
        const allActivities = filteredActivities as any[];

        // File types by DataType or derive from FileName
        const typeCounter: Record<string, number> = {};
        for (const act of allActivities) {
          const rawType = (act.documentNew?.DataType || '').toLowerCase();
          let typeKey = '';
          if (rawType) {
            typeKey = rawType;
          } else if (act.documentNew?.FileName) {
            const match = act.documentNew.FileName.split('.').pop();
            typeKey = (match || 'others').toLowerCase();
          } else {
            typeKey = 'others';
          }
          const pretty =
            typeKey === 'pdf' ? 'PDF' :
            typeKey === 'doc' || typeKey === 'docx' ? 'Word' :
            typeKey === 'xls' || typeKey === 'xlsx' ? 'Excel' :
            typeKey.toUpperCase();
          typeCounter[pretty] = (typeCounter[pretty] || 0) + 1;
        }
        const typeData = Object.entries(typeCounter)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
        setDocumentTypeData(typeData);

        // Uploads/Downloads counts
        const uploads = allActivities.filter(a => a.Action === 'CREATED').length;
        const downloads = allActivities.filter(a => a.Action === 'DOWNLOADED').length;
        setUploadsCount(uploads);
        setDownloadsCount(downloads);

        // Active users by unique actor
        const uniqueUsers = new Set(allActivities.map(a => a.actor?.userName || a.actor?.id));
        setActiveUsersCount(uniqueUsers.size);

        // Confidential documents count (unique documents marked confidential)
        const confidentialSet = new Set(
          allActivities
            .filter(a => a.documentNew?.Confidential)
            .map(a => a.documentNew?.ID)
        );
        setConfidentialDocsCount(confidentialSet.size);
      } catch (error) {
        console.error('Failed to fetch activities', error);
      }
    };

    fetchActivities();
  }, [selectedYear, startDate, endDate, selectedDepartment, selectedSubDepartment]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('');
    setSelectedSubDepartment('');
  };

  // Compute total pages from loaded documents
  const totalPagesFromDocuments = useMemo(() => {
    const docs = documentList?.documents || [];
    // console.log('🔍 Computing pages from documents:', {
    //   documentCount: docs.length,
    //   documents: docs,
    //   pageCounts: docs.map(doc => ({
    //     id: doc.ID,
    //     fileName: doc.FileName,
    //     pageCount: doc.PageCount,
    //     pageCountType: typeof doc.PageCount
    //   })),
    //   firstDocumentKeys: docs.length > 0 ? Object.keys(docs[0]) : [],
    //   firstDocument: docs.length > 0 ? docs[0] : null
    // });
    
    const totalPages = docs.reduce((sum: number, doc: any) => {
      // Check both direct PageCount and nested newdoc.PageCount
      const pageCount = typeof doc?.PageCount === 'number' ? doc.PageCount : 
                       typeof doc?.newdoc?.PageCount === 'number' ? doc.newdoc.PageCount : 0;
      
      // If PageCount is null, assume 1 page per document
      const actualPageCount = pageCount || (doc?.newdoc ? 1 : 0);
      
      // console.log(`🔍 Document ${doc?.newdoc?.FileName || doc?.FileName}: PageCount = ${actualPageCount} (original: ${doc?.newdoc?.PageCount})`);
      return sum + actualPageCount;
    }, 0);
    
    // console.log('🔍 Total pages calculated:', totalPages);
    return totalPages;
  }, [documentList?.documents]);

// console.log('🔍 Document List Debug:', {
//   documentList: documentList,
//   documents: documentList?.documents,
//   firstDocument: documentList?.documents?.[0],
//   pageCounts: documentList?.documents?.map(doc => ({
//     id: doc.ID,
//     fileName: doc.FileName,
//     pageCount: doc.PageCount,
//     pageCountType: typeof doc.PageCount
//   }))
// });

  const statCards = [
    {
      title: 'Total Documents',
      count: documentList?.totalDocuments,
      icon: <Folder className="h-8 w-8 text-green-500" />,
      color: 'border-green-100',
    },
    {
      title: 'Pages',
      count: totalPagesFromDocuments,
      icon: <FileText className="h-8 w-8 text-purple-500" />,
      color: 'border-purple-100',
    },
  ];

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
      
      {/* --- Filters Section --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
        
        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || undefined} 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Department Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" hidden>
                  Select Department
                </option>
                {departmentOptions.map((dept) => (
                  <option key={dept.value} value={dept.label}>
                    {dept.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <div className="relative">
              <select
                value={selectedSubDepartment}
                onChange={(e) => setSelectedSubDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedDepartment}
              >
                
                <option value="" hidden>
                  {subDepartmentOptions.length === 0
                    ? 'No document types available'
                    : 'Select Document Type'}
                </option>
                {subDepartmentOptions.map((subDept) => (
                  <option key={subDept.value} value={subDept.label}>
                    {subDept.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-end">
          <button
            onClick={handleResetFilters}
            disabled={!startDate && !endDate && !selectedDepartment && !selectedSubDepartment}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 transition duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset All Filters
          </button>
        </div>
      </div>
      {/* ------------------------------------------------------------------ */}

      {/* --- Dashboard Analytics Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart - File Types (Dynamic) */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-slate-800">
              File Types
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={documentTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {documentTypeData.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, 'Count']} />
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
              <span className="text-2xl font-bold text-blue-600">{uploadsCount}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-700">Total Downloads</span>
              <span className="text-2xl font-bold text-green-600">{downloadsCount}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-700">Active Users</span>
              <span className="text-2xl font-bold text-purple-600">{activeUsersCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Confidential Docs</span>
              <span className="text-2xl font-bold text-red-600">{confidentialDocsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity moved to Audit Trail page */}
    </div>
  );
};

export default Dashboard;