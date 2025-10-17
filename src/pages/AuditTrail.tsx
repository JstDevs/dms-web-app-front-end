import React, { useEffect, useState } from 'react';
import { FileText, RotateCcw, ChevronDown, Search } from 'lucide-react';
import axios from '@/api/axios';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { PaginationControls } from '@/components/ui/PaginationControls';

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

const DEFAULT_PAGE_SIZE = 10;

const ACTION_OPTIONS = [
  { label: 'All Activities', value: '' },
  { label: 'Viewed', value: 'VIEWED' },
  { label: 'Downloaded', value: 'DOWNLOADED' },
  { label: 'Created', value: 'CREATED' },
  { label: 'Updated', value: 'UPDATED' },
  { label: 'Deleted', value: 'DELETED' },
];

const AuditTrail: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const { departmentOptions, getSubDepartmentOptions } = useNestedDepartmentOptions();

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);

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

  // Fetch activities with filters + pagination
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const hasRange = Boolean(startDate && endDate);
        const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const defaultStart = '1970-01-01';
        const defaultEnd = todayStr;

        const effectiveStart = hasRange ? startDate : defaultStart;
        const effectiveEnd = hasRange ? endDate : defaultEnd;

        const startAt = new Date(effectiveStart + 'T00:00:00.000Z').toISOString();
        const endAt = new Date(effectiveEnd + 'T23:59:59.999Z').toISOString();

        const params = {
          // Always send inclusive default range to avoid API defaulting to today-only
          startDate: effectiveStart,
          endDate: effectiveEnd,
          start_date: effectiveStart,
          end_date: effectiveEnd,
          from: effectiveStart,
          to: effectiveEnd,
          startAt,
          endAt,
          ...(selectedDepartment && { department: selectedDepartment }),
          ...(selectedSubDepartment && { subDepartment: selectedSubDepartment }),
          ...(selectedAction && { action: selectedAction }),
          ...(searchText && { q: searchText }),
          page: currentPage,
          pageSize: itemsPerPage,
        } as Record<string, any>;

        const { data } = await axios.get(`/documents/activities-dashboard`, { params });
        if (!data?.success) throw new Error('Failed to fetch activities');

        // If backend returns paginated envelope, use it; else fallback to client-side
        const apiActivities: Activity[] = (data?.data?.auditTrails || []) as Activity[];
        const totalFromApi: number | undefined = data?.data?.total || data?.total;

        if (typeof totalFromApi === 'number') {
          // Server-side pagination
          setActivities(apiActivities);
          setTotalItems(totalFromApi);
        } else {
          // Fallback: client-side filtering + pagination (we already applied date range above)
          const filteredByAction = selectedAction
            ? apiActivities.filter((a) => a.Action === selectedAction)
            : apiActivities;

          const filteredBySearch = searchText
            ? filteredByAction.filter((a) => {
                const hay = (
                  `${a.actor?.userName || ''} ${a.Action || ''} ${a.documentNew?.FileName || ''}`
                ).toLowerCase();
                return hay.includes(searchText.toLowerCase());
              })
            : filteredByAction;

          const sorted = filteredBySearch
            .slice()
            .sort((a, b) => new Date(b.ActionDate).getTime() - new Date(a.ActionDate).getTime());

          setTotalItems(sorted.length);
          const startIndex = (currentPage - 1) * itemsPerPage;
          setActivities(sorted.slice(startIndex, startIndex + itemsPerPage));
        }
      } catch (error) {
        console.error('Failed to fetch activities', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [startDate, endDate, selectedDepartment, selectedSubDepartment, selectedAction, searchText, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('');
    setSelectedSubDepartment('');
    setSelectedAction('');
    setSearchText('');
    setCurrentPage(1);
  };

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
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Audit Trail</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>

        {/* Top row: search + action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by user, action, filename"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 pl-9 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
            <div className="relative">
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ACTION_OPTIONS.map(opt => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

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
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
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
                onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
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
                onChange={(e) => { setSelectedSubDepartment(e.target.value); setCurrentPage(1); }}
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
            disabled={!startDate && !endDate && !selectedDepartment && !selectedSubDepartment && !selectedAction && !searchText}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 transition duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset All Filters
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-800">Audit Trail</h3>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : activities.length > 0 ? (
          <>
            <div className="space-y-4">
              {activities.map((activity) => (
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
                        <span className="text-blue-600">{activity.actor.userName}</span>{' '}
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
                  <div className="text-xs text-slate-500">{formatTimeAgo(activity.ActionDate)}</div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            />
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">No activities found</div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;


