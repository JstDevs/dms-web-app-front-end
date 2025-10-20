import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  RotateCcw, 
  ChevronDown, 
  Search, 
  User, 
  Settings, 
  Shield, 
  CheckCircle, 
  Eye, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Users, 
  Lock, 
  Unlock,
  Clock,
  AlertTriangle,
  Database,
  Zap
} from 'lucide-react';
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

// Activity Categories with Icons and Colors
const ACTIVITY_CATEGORIES = {
  DOCUMENT: {
    name: 'Document Activities',
    icon: FileText,
    color: 'blue',
    activities: [
      { label: 'Viewed', value: 'VIEWED', icon: Eye },
      { label: 'Downloaded', value: 'DOWNLOADED', icon: Download },
      { label: 'Created', value: 'CREATED', icon: Upload },
      { label: 'Updated', value: 'UPDATED', icon: Edit },
      { label: 'Deleted', value: 'DELETED', icon: Trash2 },
      { label: 'Shared', value: 'DOCUMENT_SHARED', icon: Users },
      { label: 'Unshared', value: 'DOCUMENT_UNSHARED', icon: Users },
    ]
  },
  USER: {
    name: 'User Management',
    icon: User,
    color: 'green',
    activities: [
      { label: 'Login', value: 'LOGIN', icon: Lock },
      { label: 'Logout', value: 'LOGOUT', icon: Unlock },
      { label: 'User Created', value: 'USER_CREATED', icon: User },
      { label: 'User Updated', value: 'USER_UPDATED', icon: Edit },
      { label: 'User Deleted', value: 'USER_DELETED', icon: Trash2 },
      { label: 'Password Changed', value: 'PASSWORD_CHANGE', icon: Lock },
      { label: 'Access Changed', value: 'USER_ACCESS_CHANGED', icon: Shield },
    ]
  },
  COLLABORATION: {
    name: 'Collaboration',
    icon: MessageSquare,
    color: 'purple',
    activities: [
      { label: 'Collaborator Added', value: 'COLLABORATOR_ADDED', icon: Users },
      { label: 'Collaborator Removed', value: 'COLLABORATOR_REMOVED', icon: Users },
      { label: 'Comment Added', value: 'COMMENT_ADDED', icon: MessageSquare },
      { label: 'Comment Deleted', value: 'COMMENT_DELETED', icon: MessageSquare },
      { label: 'Permission Changed', value: 'COLLABORATOR_PERMISSION_CHANGED', icon: Shield },
    ]
  },
  SECURITY: {
    name: 'Security & Restrictions',
    icon: Shield,
    color: 'red',
    activities: [
      { label: 'Restriction Added', value: 'RESTRICTION_ADDED', icon: Shield },
      { label: 'Restriction Removed', value: 'RESTRICTION_REMOVED', icon: Shield },
      { label: 'Confidential Access', value: 'CONFIDENTIAL_ACCESS', icon: AlertTriangle },
      { label: 'Bulk Operation', value: 'BULK_OPERATION', icon: Database },
    ]
  },
  APPROVAL: {
    name: 'Approval Workflow',
    icon: CheckCircle,
    color: 'orange',
    activities: [
      { label: 'Submitted for Approval', value: 'DOCUMENT_SUBMITTED_FOR_APPROVAL', icon: CheckCircle },
      { label: 'Document Approved', value: 'DOCUMENT_APPROVED', icon: CheckCircle },
      { label: 'Document Rejected', value: 'DOCUMENT_REJECTED', icon: AlertTriangle },
      { label: 'Approval Matrix Created', value: 'APPROVAL_MATRIX_CREATED', icon: Settings },
      { label: 'Approval Matrix Updated', value: 'APPROVAL_MATRIX_UPDATED', icon: Settings },
    ]
  },
  SYSTEM: {
    name: 'System & Settings',
    icon: Settings,
    color: 'gray',
    activities: [
      { label: 'Department Created', value: 'DEPARTMENT_CREATED', icon: Settings },
      { label: 'Department Updated', value: 'DEPARTMENT_UPDATED', icon: Edit },
      { label: 'Department Deleted', value: 'DEPARTMENT_DELETED', icon: Trash2 },
      { label: 'Department Item Created', value: 'SUBDEPARTMENT_CREATED', icon: Settings },
      { label: 'Department Item Updated', value: 'SUBDEPARTMENT_UPDATED', icon: Edit },
      { label: 'Department Item Deleted', value: 'SUBDEPARTMENT_DELETED', icon: Trash2 },
      { label: 'Settings Changed', value: 'SETTINGS_CHANGED', icon: Settings },
      { label: 'Field Configuration', value: 'FIELD_CONFIGURATION_UPDATED', icon: Settings },
      { label: 'Allocation Updated', value: 'ALLOCATION_UPDATED', icon: Users },
    ]
  },
  OCR: {
    name: 'OCR & Digitalization',
    icon: Zap,
    color: 'indigo',
    activities: [
      { label: 'OCR Processed', value: 'OCR_PROCESSED', icon: Zap },
      { label: 'OCR Failed', value: 'OCR_FAILED', icon: AlertTriangle },
      { label: 'Batch Upload Started', value: 'BATCH_UPLOAD_STARTED', icon: Upload },
      { label: 'Batch Upload Completed', value: 'BATCH_UPLOAD_COMPLETED', icon: CheckCircle },
      { label: 'Template Created', value: 'TEMPLATE_CREATED', icon: FileText },
      { label: 'Template Updated', value: 'TEMPLATE_UPDATED', icon: Edit },
      { label: 'Template Deleted', value: 'TEMPLATE_DELETED', icon: Trash2 },
    ]
  }
};

// Flatten all activities for the dropdown
const ACTION_OPTIONS = [
  { label: 'All Activities', value: '', category: 'ALL' },
  ...Object.entries(ACTIVITY_CATEGORIES).flatMap(([categoryKey, category]) => 
    category.activities.map(activity => ({
      ...activity,
      category: categoryKey,
      categoryName: category.name,
      categoryColor: category.color
    }))
  )
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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
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

        // Fetch both document activities and user activities
        const [documentResponse, userActivityResponse] = await Promise.allSettled([
          axios.get(`/documents/activities-dashboard`, { params }),
          axios.get(`/audit/user-activities`, { 
            params: {
              startDate: effectiveStart,
              endDate: effectiveEnd,
              ...(selectedAction && { action: selectedAction }),
              ...(searchText && { q: searchText }),
            }
          })
        ]);

        let allActivities: Activity[] = [];

        // Process document activities
        if (documentResponse.status === 'fulfilled' && documentResponse.value.data?.success) {
          const documentActivities = documentResponse.value.data?.data?.auditTrails || [];
          allActivities = [...allActivities, ...documentActivities];
        }

        // Process user activities (login/logout)
        let userActivities: any[] = [];
        
        if (userActivityResponse.status === 'fulfilled' && userActivityResponse.value.data?.success) {
          userActivities = userActivityResponse.value.data?.data || [];
        } else {
          // Fallback: Get from localStorage for demo purposes
          const localActivities = JSON.parse(localStorage.getItem('userActivities') || '[]');
          userActivities = localActivities.filter((activity: any) => {
            const activityDate = new Date(activity.timestamp);
            const startDate = new Date(effectiveStart + 'T00:00:00.000Z');
            const endDate = new Date(effectiveEnd + 'T23:59:59.999Z');
            return activityDate >= startDate && activityDate <= endDate;
          });
        }

        // Transform user activities to match Activity interface
        const transformedUserActivities = userActivities.map((activity: any) => ({
          ID: activity.id || activity.ID,
          DocumentID: 0, // User activities don't have document ID
          LinkID: '',
          Action: activity.action || activity.Action,
          ActionBy: activity.userId || activity.userID,
          ActionDate: activity.timestamp || activity.actionDate,
          IPAddress: activity.ipAddress || '',
          UserAgent: activity.userAgent || '',
          actor: {
            id: activity.userId || activity.userID,
            userName: activity.userName || activity.user_name
          },
          documentNew: {
            ID: 0,
            FileName: 'System Activity',
            FileDescription: 'User authentication activity',
            DataType: 'system',
            Confidential: false
          }
        }));
        allActivities = [...allActivities, ...transformedUserActivities];

        // Sort all activities by date
        const sortedActivities = allActivities.sort((a, b) => 
          new Date(b.ActionDate).getTime() - new Date(a.ActionDate).getTime()
        );

        // Apply client-side filtering
        let filteredActivities = sortedActivities;

        if (selectedAction) {
          filteredActivities = filteredActivities.filter(a => a.Action === selectedAction);
        }

        if (searchText) {
          filteredActivities = filteredActivities.filter(a => {
            const searchString = `${a.actor?.userName || ''} ${a.Action || ''} ${a.documentNew?.FileName || ''}`.toLowerCase();
            return searchString.includes(searchText.toLowerCase());
          });
        }

        setTotalItems(filteredActivities.length);
        const startIndex = (currentPage - 1) * itemsPerPage;
        setActivities(filteredActivities.slice(startIndex, startIndex + itemsPerPage));

      } catch (error) {
        console.error('Failed to fetch activities', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [startDate, endDate, selectedDepartment, selectedSubDepartment, selectedAction, selectedCategory, searchText, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('');
    setSelectedSubDepartment('');
    setSelectedAction('');
    setSelectedCategory('');
    setSearchText('');
    setCurrentPage(1);
  };

  // Filter activities by category
  const getFilteredActivities = () => {
    let filtered = activities;
    
    if (selectedCategory && selectedCategory !== 'ALL') {
      const categoryActivities = ACTIVITY_CATEGORIES[selectedCategory as keyof typeof ACTIVITY_CATEGORIES]?.activities || [];
      const categoryValues = categoryActivities.map(activity => activity.value);
      filtered = filtered.filter(activity => categoryValues.includes(activity.Action));
    }
    
    return filtered;
  };

  // Group activities by category for grouped view
  const getGroupedActivities = () => {
    const filtered = getFilteredActivities();
    const grouped: Record<string, Activity[]> = {};
    
    Object.entries(ACTIVITY_CATEGORIES).forEach(([categoryKey, category]) => {
      const categoryValues = category.activities.map(activity => activity.value);
      const categoryActivities = filtered.filter(activity => categoryValues.includes(activity.Action));
      if (categoryActivities.length > 0) {
        grouped[categoryKey] = categoryActivities;
      }
    });
    
    return grouped;
  };

  const formatActivityType = (action: string) => {
    // Find the activity in our categories
    for (const category of Object.values(ACTIVITY_CATEGORIES)) {
      const activity = category.activities.find(act => act.value === action);
      if (activity) {
        return activity.label.toLowerCase();
      }
    }
    
    // Fallback for unknown actions
    return action.toLowerCase().replace(/_/g, ' ');
  };

  const getActivityIcon = (action: string) => {
    // Find the activity icon in our categories
    for (const category of Object.values(ACTIVITY_CATEGORIES)) {
      const activity = category.activities.find(act => act.value === action);
      if (activity) {
        const IconComponent = activity.icon;
        return <IconComponent className="w-5 h-5" />;
      }
    }
    
    // Fallback icon
    return <FileText className="w-5 h-5" />;
  };

  const getActivityCategory = (action: string) => {
    for (const [categoryKey, category] of Object.entries(ACTIVITY_CATEGORIES)) {
      const activity = category.activities.find(act => act.value === action);
      if (activity) {
        return { key: categoryKey, name: category.name, color: category.color };
      }
    }
    return { key: 'UNKNOWN', name: 'Unknown', color: 'gray' };
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

        {/* Top row: search + action + category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedAction(''); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {Object.entries(ACTIVITY_CATEGORIES).map(([key, category]) => (
                  <option key={key} value={key}>{category.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
            <div className="relative">
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={selectedCategory !== ''}
              >
                <option value="">All Activities</option>
                {selectedCategory && selectedCategory !== '' 
                  ? ACTIVITY_CATEGORIES[selectedCategory as keyof typeof ACTIVITY_CATEGORIES]?.activities.map(activity => (
                      <option key={activity.value} value={activity.value}>{activity.label}</option>
                    ))
                  : ACTION_OPTIONS.slice(1).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))
                }
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

        {/* Reset Button and View Mode Toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">View Mode:</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'grouped' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Grouped View
              </button>
            </div>
          </div>
          <button
            onClick={handleResetFilters}
            disabled={!startDate && !endDate && !selectedDepartment && !selectedSubDepartment && !selectedAction && !selectedCategory && !searchText}
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
          <h3 className="text-xl font-semibold text-slate-800">
            Audit Trail {viewMode === 'grouped' ? '- Grouped View' : '- List View'}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Total: {activities.length} activities</span>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : activities.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              // List View
              <div className="space-y-4">
                {getFilteredActivities().map((activity) => {
                  const categoryInfo = getActivityCategory(activity.Action);
                  return (
                    <div
                      key={activity.ID}
                      className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0 hover:bg-gray-50 rounded-lg px-3 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          categoryInfo.color === 'blue' ? 'bg-blue-50' :
                          categoryInfo.color === 'green' ? 'bg-green-50' :
                          categoryInfo.color === 'purple' ? 'bg-purple-50' :
                          categoryInfo.color === 'red' ? 'bg-red-50' :
                          categoryInfo.color === 'orange' ? 'bg-orange-50' :
                          categoryInfo.color === 'indigo' ? 'bg-indigo-50' :
                          'bg-gray-50'
                        }`}>
                          {getActivityIcon(activity.Action)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-slate-800">
                              <span className="text-blue-600">{activity.actor.userName}</span>{' '}
                              {formatActivityType(activity.Action)}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              categoryInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                              categoryInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                              categoryInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                              categoryInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                              categoryInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              categoryInfo.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {categoryInfo.name}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            {activity.documentNew?.FileName || 'System Activity'}
                            {activity.documentNew?.Confidential && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Confidential
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">{formatTimeAgo(activity.ActionDate)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Grouped View
              <div className="space-y-6">
                {Object.entries(getGroupedActivities()).map(([categoryKey, categoryActivities]) => {
                  const categoryInfo = ACTIVITY_CATEGORIES[categoryKey as keyof typeof ACTIVITY_CATEGORIES];
                  const CategoryIcon = categoryInfo.icon;
                  
                  return (
                    <div key={categoryKey} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className={`bg-gradient-to-r ${
                        categoryInfo.color === 'blue' ? 'from-blue-50 to-blue-100' :
                        categoryInfo.color === 'green' ? 'from-green-50 to-green-100' :
                        categoryInfo.color === 'purple' ? 'from-purple-50 to-purple-100' :
                        categoryInfo.color === 'red' ? 'from-red-50 to-red-100' :
                        categoryInfo.color === 'orange' ? 'from-orange-50 to-orange-100' :
                        categoryInfo.color === 'indigo' ? 'from-indigo-50 to-indigo-100' :
                        'from-gray-50 to-gray-100'
                      } px-4 py-3 border-b border-gray-200`}>
                        <div className="flex items-center space-x-3">
                          <CategoryIcon className={`w-5 h-5 ${
                            categoryInfo.color === 'blue' ? 'text-blue-600' :
                            categoryInfo.color === 'green' ? 'text-green-600' :
                            categoryInfo.color === 'purple' ? 'text-purple-600' :
                            categoryInfo.color === 'red' ? 'text-red-600' :
                            categoryInfo.color === 'orange' ? 'text-orange-600' :
                            categoryInfo.color === 'indigo' ? 'text-indigo-600' :
                            'text-gray-600'
                          }`} />
                          <h4 className="font-semibold text-gray-800">{categoryInfo.name}</h4>
                          <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                            {categoryActivities.length} activities
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {categoryActivities.map((activity) => (
                          <div
                            key={activity.ID}
                            className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                {getActivityIcon(activity.Action)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  <span className="text-blue-600">{activity.actor.userName}</span>{' '}
                                  {formatActivityType(activity.Action)}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {activity.documentNew?.FileName || 'System Activity'}
                                  {activity.documentNew?.Confidential && (
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
                    </div>
                  );
                })}
              </div>
            )}
            
            <PaginationControls
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-500">Try adjusting your filters or date range to see more activities.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;


