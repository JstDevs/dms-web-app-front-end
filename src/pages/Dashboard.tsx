import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDocument } from '../contexts/DocumentContext';
import { TrendingUp, Folder, BarChart3, FileText, RotateCcw, ChevronDown } from 'lucide-react';
// import { Button } from '@chakra-ui/react'; // Uncomment if using Chakra UI buttons
import { useAuth } from '@/contexts/AuthContext';
//
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import axios from '@/api/axios';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
// import { fetchDocuments } from '@/pages/Document/utils/uploadAPIs'; // Unused import
//

//

const Dashboard: React.FC = () => {
  const { documentList, fetchDocumentList } = useDocument();
  const { selectedRole, user } = useAuth();
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

  // Loading states
  const [isDocumentsLoading, setIsDocumentsLoading] = useState<boolean>(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [isFilterLoading, setIsFilterLoading] = useState<boolean>(false);

  const COLORS = ['#5fad56', '#f2c14e', '#f78154', '#4d9078'];

  // Debounced function to prevent rapid API calls
  const debouncedFetchData = useCallback(
    (() => {
      let timeoutId: number;
      return (fetchFn: () => Promise<void>, delay: number = 200) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(fetchFn, delay);
      };
    })(),
    []
  );

  // Combined function to fetch both documents and analytics
  const fetchAllData = useCallback(async () => {
    if (!selectedRole?.ID) return;
    
    setIsDocumentsLoading(true);
    setIsAnalyticsLoading(true);
    setIsFilterLoading(true);
    
    try {
      // Fetch documents and analytics in parallel
      const [documentsResult, analyticsResult] = await Promise.allSettled([
        // Documents API call
        fetchDocumentList(
          Number(selectedRole.ID), 
          1, 
          undefined, 
          selectedDepartment || undefined, 
          selectedSubDepartment || undefined, 
          startDate || undefined, 
          endDate || undefined
        ),
        // Analytics API call
        (async () => {
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

          const allActivities = filteredActivities as any[];

          // File types
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

          // Stats
          const uploads = allActivities.filter(a => a.Action === 'CREATED').length;
          const downloads = allActivities.filter(a => a.Action === 'DOWNLOADED').length;
          setUploadsCount(uploads);
          setDownloadsCount(downloads);

          const uniqueUsers = new Set(allActivities.map(a => a.actor?.userName || a.actor?.id));
          setActiveUsersCount(uniqueUsers.size);

          const confidentialSet = new Set(
            allActivities
              .filter(a => a.documentNew?.Confidential)
              .map(a => a.documentNew?.ID)
          );
          setConfidentialDocsCount(confidentialSet.size);
        })()
      ]);

      // Handle results
      if (documentsResult.status === 'rejected') {
        console.error('Failed to fetch documents:', documentsResult.reason);
      }
      if (analyticsResult.status === 'rejected') {
        console.error('Failed to fetch analytics:', analyticsResult.reason);
      }
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsDocumentsLoading(false);
      setIsAnalyticsLoading(false);
      setIsFilterLoading(false);
    }
  }, [selectedRole, fetchDocumentList, startDate, endDate, selectedDepartment, selectedSubDepartment, selectedYear]);

  // Effect to fetch all data on role change and filter changes
  useEffect(() => {
    if (selectedRole?.ID) {
      if (startDate || endDate || selectedDepartment || selectedSubDepartment) {
        // Debounce filter changes
        debouncedFetchData(fetchAllData, 100);
      } else {
        // Immediate for role changes
        fetchAllData();
      }
    }
  }, [selectedRole, startDate, endDate, selectedDepartment, selectedSubDepartment, fetchAllData, debouncedFetchData]);

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

  // Show welcome message only if sessionStorage says so (first after login)
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    const shouldShow = sessionStorage.getItem('showDashboardWelcome');
    if (shouldShow === 'true') {
      setShowWelcome(true);
      sessionStorage.removeItem('showDashboardWelcome');
    }
  }, []);


  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('');
    setSelectedSubDepartment('');
  };

  // Compute total pages from loaded documents (server-side filtered)
  const totalPagesFromDocuments = useMemo(() => {
    const docs = documentList?.documents || [];
    
    const totalPages = docs.reduce((sum: number, doc: any) => {
      // Check both direct PageCount and nested newdoc.PageCount
      const pageCount = typeof doc?.PageCount === 'number' ? doc.PageCount : 
                       typeof doc?.newdoc?.PageCount === 'number' ? doc.newdoc.PageCount : 0;
      
      // If PageCount is null, assume 1 page per document
      const actualPageCount = pageCount || (doc?.newdoc ? 1 : 0);
      
      return sum + actualPageCount;
    }, 0);
    
    return totalPages;
  }, [documentList?.documents]);

  const statCards = [
    {
      title: 'Total Documents',
      count: documentList?.totalDocuments,
      icon: <Folder className="h-8 w-8 text-green-500" />,
      color: 'border-green-100',
      isLoading: isDocumentsLoading || isFilterLoading,
      hoverBorder: "hover:border-green-500",
    },
    {
      title: 'Pages',
      count: totalPagesFromDocuments,
      icon: <FileText className="h-8 w-8 text-purple-500" />,
      color: 'border-purple-100',
      isLoading: isDocumentsLoading || isFilterLoading,
      hoverBorder: "hover:border-violet-500",
    },
  ];

  return (
    <div className="animate-fade-in">
      {showWelcome && user && (
        <div className="bg-blue-100 border border-blue-300 rounded-md p-4 mb-4 text-blue-900 text-lg font-semibold animate-fade-in">
          {`Welcome, ${user.UserName}!`}
        </div>
      )}
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`relative ${stat.color} bg-gradient-to-r from-white to-slate-50 border border-gray-200 rounded-2xl shadow-lg p-6 flex items-center justify-between transition-all duration-300 ease-out cursor-default hover:shadow-2xl hover:from-indigo-50 ${stat.hoverBorder}`}
        >
          {/* Left side: Icon + Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 shadow-inner hover:scale-105 transition-transform duration-300">
              {stat.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1 tracking-tight">
                {stat.title}
              </h3>
              {stat.isLoading ? (
                <div className="flex items-center text-gray-500 text-sm">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Loading...</span>
                </div>
              ) : (
                <p className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                  {stat.count || 0}
                </p>
              )}
            </div>
          </div>

          {/* Right accent bar */}
          <div className="relative">
            <div className="w-2 h-20 bg-gradient-to-b from-indigo-400 to-blue-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -right-1 top-0 w-3 h-20 blur-lg bg-indigo-300 opacity-0 hover:opacity-80 transition-opacity"></div>
          </div>
        </div>
      ))}
    </div>



      
      {/* --- Filters Section --- */}
          <div className="bg-gradient-to-b from-blue-50 via-white to-gray-50 p-6 rounded-2xl border border-blue-100 
                      shadow-md hover:shadow-lg transition-all duration-300 mb-8 
                      hover:border-blue-500 hover:ring-2 hover:ring-blue-200">        
          <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-1.5 h-5 bg-blue-600 rounded-sm shadow-md"></span>
            Filters
          </h3>
          <button
            onClick={handleResetFilters}
            disabled={!startDate && !endDate && !selectedDepartment && !selectedSubDepartment}
            className="px-4 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg 
                      hover:bg-blue-600 hover:text-white transition-all duration-200 flex items-center gap-2 
                      shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-widest">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || undefined}
              className="w-full px-4 py-2.5 border border-blue-200 rounded-lg text-sm bg-white 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                        transition-all shadow-sm hover:border-blue-300"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-widest">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full px-4 py-2.5 border border-blue-200 rounded-lg text-sm bg-white 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                        transition-all shadow-sm hover:border-blue-300"
            />
          </div>
        </div>

        {/* Department Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-widest">
              Department
            </label>
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg text-sm bg-white 
                          appearance-none cursor-pointer focus:outline-none 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          transition-all shadow-sm hover:border-blue-300"
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-widest">
              Document Type
            </label>
            <div className="relative">
              <select
                value={selectedSubDepartment}
                onChange={(e) => setSelectedSubDepartment(e.target.value)}
                disabled={!selectedDepartment}
                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg text-sm bg-white 
                          appearance-none cursor-pointer focus:outline-none 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          transition-all shadow-sm hover:border-blue-300
                          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}

      {/* --- Dashboard Analytics Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart - File Types (Dynamic) */}
        <div className="bg-gradient-to-b from-blue-50 via-white to-blue-50/20 rounded-2xl shadow-md border border-blue-100 
                    hover:border-blue-400 hover:shadow-lg hover:ring-2 hover:ring-blue-100 
                    p-6 transition-all duration-300 mb-6"
        >
          <div className="flex items-center mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 shadow-sm mr-3">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 tracking-wide flex items-center gap-2">
              File Types
              {/* <span className="text-xs font-medium text-blue-500 bg-blue-100 px-2 py-0.5 rounded-md">Overview</span> */}
            </h3>
          </div>

          {isAnalyticsLoading || isFilterLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="flex flex-col items-center">
                <LoadingSpinner size="lg" className="mb-3 text-blue-600" />
                <span className="text-gray-500 text-sm font-medium animate-pulse">
                  Loading chart data...
                </span>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={documentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={90}
                    stroke="#fff"
                    strokeWidth={2}
                    dataKey="value"
                  >
                    {documentTypeData.map((_, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        className="cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-[1.03]"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Count']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '13px',
                      color: '#334155',
                      fontWeight: 500,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Subtle gradient hover highlight */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 bg-blue-400 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          )}
        </div>


        {/* Stats Overview */}
        <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl shadow-sm border border-blue-100 p-6 transition-all duration-300 hover:shadow-md hover:border-blue-300 h-[400px]">
  <div className="flex items-center mb-5">
    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full mr-3">
      <TrendingUp className="h-4 w-4" />
    </div>
    <h3 className="text-lg font-semibold text-slate-800">Quick Stats</h3>
  </div>

  {isAnalyticsLoading || isFilterLoading ? (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-gray-500">Loading statistics...</span>
      </div>
    </div>
  ) : (
    <div className="space-y-4 h-full flex flex-col justify-center">
      <div className="flex justify-between items-center pb-3 border-b border-gray-100 transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2">
        <span className="text-gray-700 font-medium">Total Uploads</span>
        <span className="text-2xl font-bold text-blue-600">{uploadsCount}</span>
      </div>

      <div className="flex justify-between items-center pb-3 border-b border-gray-100 transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2">
        <span className="text-gray-700 font-medium">Total Downloads</span>
        <span className="text-2xl font-bold text-green-600">{downloadsCount}</span>
      </div>

      <div className="flex justify-between items-center pb-3 border-b border-gray-100 transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2">
        <span className="text-gray-700 font-medium">Active Users</span>
        <span className="text-2xl font-bold text-purple-600">{activeUsersCount}</span>
      </div>

      <div className="flex justify-between items-center transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2">
        <span className="text-gray-700 font-medium">Confidential Docs</span>
        <span className="text-2xl font-bold text-red-600">{confidentialDocsCount}</span>
      </div>
    </div>
  )}
</div>
      </div>

      {/* Recent Activity moved to Audit Trail page */}
    </div>
  );
};

export default Dashboard;