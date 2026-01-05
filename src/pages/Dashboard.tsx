import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDocument } from '../contexts/DocumentContext';
import { TrendingUp, Folder, BarChart3, FileText, RotateCcw, ChevronDown } from 'lucide-react';
// import { Button } from '@chakra-ui/react'; // Uncomment if using Chakra UI buttons
import { useAuth } from '@/contexts/AuthContext';
//
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import axios from '@/api/axios';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { fetchDocuments } from '@/pages/Document/utils/uploadAPIs';
import { fetchRoleAllocations, fetchRoleAllocationsByLink } from '@/pages/Digitalization/utils/allocationServices';
//

//

const normalizeFileType = (dataType: string, fileName?: string): string => {
  if (!dataType) {
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      return ext || 'others';
    }
    return 'others';
  }

  const lowerType = dataType.toLowerCase().trim();
  const upperType = dataType.toUpperCase().trim();
  const originalType = dataType.trim();

  if (
    !lowerType.includes('/') &&
    !lowerType.includes('vnd') &&
    !lowerType.includes('openxml') &&
    !upperType.includes('VND') &&
    !upperType.includes('OPENXML')
  ) {
    return lowerType;
  }

  if (
    lowerType === 'application/pdf' ||
    lowerType === 'pdf' ||
    (upperType.includes('PDF') && !upperType.includes('VND'))
  ) {
    return 'pdf';
  }

  const hasWordProcessing = /wordprocessing/i.test(originalType);
  const hasVndOpenXml = /vnd\.openxmlformats/i.test(originalType);
  const hasOfficeDocument = /officedocument/i.test(originalType);

  if (
    hasWordProcessing ||
    (hasVndOpenXml && hasOfficeDocument && /wordprocessing|document/i.test(originalType)) ||
    (hasVndOpenXml && hasWordProcessing) ||
    (hasVndOpenXml && hasOfficeDocument && !/spreadsheet/i.test(originalType)) ||
    lowerType === 'application/msword' ||
    lowerType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerType.includes('vnd.openxmlformats-officedocument.wordprocessingml.document')
  ) {
    return 'docx';
  }

  if (
    lowerType.includes('spreadsheetml') ||
    lowerType.includes('spreadsheet') ||
    upperType.includes('SPREADSHEETML') ||
    upperType.includes('SPREADSHEET') ||
    lowerType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lowerType === 'application/vnd.ms-excel' ||
    lowerType.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ) {
    return 'xlsx';
  }

  if (lowerType.startsWith('image/') || upperType.startsWith('IMAGE/')) {
    if (lowerType === 'image/png' || upperType === 'IMAGE/PNG') return 'png';
    if (
      lowerType === 'image/jpeg' ||
      lowerType === 'image/jpg' ||
      upperType === 'IMAGE/JPEG' ||
      upperType === 'IMAGE/JPG'
    )
      return 'jpg';
    return 'image';
  }

  if (
    lowerType === 'text/plain' ||
    upperType === 'TEXT/PLAIN' ||
    lowerType === 'txt'
  ) {
    return 'txt';
  }

  if (
    lowerType === 'text/csv' ||
    lowerType === 'application/vnd.ms-excel' ||
    upperType === 'TEXT/CSV' ||
    lowerType === 'csv'
  ) {
    return 'csv';
  }

  if (
    lowerType === 'application/zip' ||
    lowerType === 'application/x-zip-compressed' ||
    upperType.includes('ZIP') ||
    lowerType === 'zip'
  ) {
    return 'zip';
  }

  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext) return ext;
  }

  return 'others';
};

const formatFileTypeLabel = (typeKey: string): string => {
  return typeKey === 'pdf'
    ? 'PDF'
    : typeKey === 'doc' || typeKey === 'docx'
      ? 'Docx'
      : typeKey === 'xls' || typeKey === 'xlsx'
        ? 'Excel'
        : typeKey === 'png' || typeKey === 'jpg' || typeKey === 'jpeg'
          ? 'Image'
          : typeKey === 'txt'
            ? 'Text'
            : typeKey === 'csv'
              ? 'CSV'
              : typeKey === 'zip'
                ? 'ZIP'
                : typeKey === 'others'
                  ? 'Others'
                  : typeKey.toUpperCase();
};

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }
  return false;
};

const Dashboard: React.FC = () => {
  const { fetchDocumentList } = useDocument();
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
  const [accessibleDepartments, setAccessibleDepartments] = useState<
    { value: string; label: string }[]
  >([]);
  const [accessibleSubDepartmentsMap, setAccessibleSubDepartmentsMap] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const [isAccessOptionsLoading, setIsAccessOptionsLoading] = useState(false);

  // Dynamic state for charts and quick stats
  const [documentTypeData, setDocumentTypeData] = useState<{ name: string; value: number }[]>([]);
  const [uploadsCount, setUploadsCount] = useState<number>(0);
  const [downloadsCount, setDownloadsCount] = useState<number>(0);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [confidentialDocsCount, setConfidentialDocsCount] = useState<number>(0);
  const [totalPagesCount, setTotalPagesCount] = useState<number>(0);
  const [totalDocumentsCount, setTotalDocumentsCount] = useState<number>(0);

  // Loading states
  const [isDocumentsLoading, setIsDocumentsLoading] = useState<boolean>(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [isFilterLoading, setIsFilterLoading] = useState<boolean>(false);
  const roleAccessCacheRef = useRef<Map<string, boolean>>(new Map());

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

  // Function to fetch all pages and compute filtered totals
  const fetchAllPagesForCount = useCallback(async (
    userId: number,
    department?: string,
    subDepartment?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalDocuments: number;
    totalPages: number;
    fileTypes: Record<string, number>;
    uploads: number;
    confidentialDocs: number;
    createdByUsers: Set<string>;
  }> => {
    try {
      let totalFilteredDocuments = 0;
      let totalFilteredPages = 0;
      let currentPage = 1;
      let hasMorePages = true;
      const startBound = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const endBound = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
      const typeCounter: Record<string, number> = {};
      let uploadsCount = 0;
      const confidentialDocIds = new Set<number>();
      const createdByUsers = new Set<string>();

      while (hasMorePages) {
        const response = await fetchDocuments(
          userId,
          currentPage,
          undefined,
          department,
          subDepartment,
          startDate,
          endDate
        );

        const raw = response?.data as any;
        const data = (raw && (raw.data ?? raw)) as any;
        const docs = Array.isArray(data?.documents) ? data.documents : [];
        const pagination = data?.pagination ?? { totalPages: 1 };

        const filteredDocs = docs.filter((doc: any) => {
          const docDeptId = Number(doc?.newdoc?.DepartmentId ?? doc?.DepartmentId ?? 0);
          const docSubDeptId = Number(doc?.newdoc?.SubDepartmentId ?? doc?.SubDepartmentId ?? 0);
          const matchesDepartment = !department || docDeptId === Number(department);
          const matchesSubDepartment = !subDepartment || docSubDeptId === Number(subDepartment);
          if (!matchesDepartment || !matchesSubDepartment) return false;

          if (startBound || endBound) {
            const docDateStr = doc?.newdoc?.CreatedDate || doc?.newdoc?.FileDate || doc?.CreatedDate || doc?.FileDate;
            if (!docDateStr) return false;
            const docDate = new Date(docDateStr);
            if (Number.isNaN(docDate.getTime())) return false;
            if (startBound && docDate < startBound) return false;
            if (endBound && docDate > endBound) return false;
          }

          return true;
        });

        totalFilteredDocuments += filteredDocs.length;

        filteredDocs.forEach((doc: any) => {
          const docData = doc?.newdoc || doc;

          // Count uploads (documents created in the date range)
          if (startBound || endBound) {
            const docDateStr = docData?.CreatedDate || docData?.FileDate;
            if (docDateStr) {
              const docDate = new Date(docDateStr);
              if (!Number.isNaN(docDate.getTime())) {
                const isInRange = (!startBound || docDate >= startBound) && (!endBound || docDate <= endBound);
                if (isInRange) {
                  uploadsCount++;
                  // Track who created the document
                  const createdBy = docData?.Createdby || docData?.CreatedBy || '';
                  if (createdBy) createdByUsers.add(createdBy);
                }
              }
            }
          } else {
            // If no date filter, count all documents as uploads
            uploadsCount++;
            const createdBy = docData?.Createdby || docData?.CreatedBy || '';
            if (createdBy) createdByUsers.add(createdBy);
          }

          // Count confidential documents
          const isConfidential = toBool(docData?.Confidential);
          if (isConfidential) {
            const docId = docData?.ID || doc?.ID;
            if (docId) confidentialDocIds.add(Number(docId));
          }

          // File type counting
          const rawType = docData?.DataType || '';
          const fileName = docData?.FileName;
          const typeKey = normalizeFileType(rawType, fileName);
          const pretty = formatFileTypeLabel(typeKey);
          typeCounter[pretty] = (typeCounter[pretty] || 0) + 1;
        });

        const pageCount = filteredDocs.reduce((sum: number, doc: any) => {
          const docPageCount = typeof doc?.PageCount === 'number' ? doc.PageCount :
            typeof doc?.newdoc?.PageCount === 'number' ? doc.newdoc.PageCount : 0;
          return sum + (docPageCount || 0);
        }, 0);

        totalFilteredPages += pageCount;

        // Check if there are more pages
        if (currentPage >= (pagination.totalPages || 1) || docs.length === 0) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
      }

      console.log('📊 Documents stats:', {
        totalDocuments: totalFilteredDocuments,
        totalPages: totalFilteredPages,
        uploads: uploadsCount,
        confidentialDocs: confidentialDocIds.size,
        createdByUsers: createdByUsers.size,
        hasDateFilter: !!(startBound || endBound),
        hasDeptFilter: !!department,
        hasSubDeptFilter: !!subDepartment
      });

      return {
        totalDocuments: totalFilteredDocuments,
        totalPages: totalFilteredPages,
        fileTypes: typeCounter,
        uploads: uploadsCount,
        confidentialDocs: confidentialDocIds.size,
        createdByUsers,
      };
    } catch (error) {
      console.error('Error fetching all pages for count:', error);
      return {
        totalDocuments: 0,
        totalPages: 0,
        fileTypes: {},
        uploads: 0,
        confidentialDocs: 0,
        createdByUsers: new Set<string>(),
      };
    }
  }, []);

  // Combined function to fetch both documents and analytics
  const fetchAllData = useCallback(async () => {
    if (!selectedRole?.ID) return;

    // Reset counts when filters change to show loading state
    const hasFilters = !!(selectedDepartment || selectedSubDepartment || startDate || endDate);
    if (hasFilters) {
      // Reset to 0 first to show that we're filtering
      setTotalDocumentsCount(0);
      setTotalPagesCount(0);
    }

    setIsDocumentsLoading(true);
    setIsAnalyticsLoading(true);
    setIsFilterLoading(true);

    try {
      // Fetch documents, analytics, total page count, and all users in parallel
      const [documentsResult, analyticsResult, countsResult, usersResult] = await Promise.allSettled([
        // Documents API call (first page only for display) - but we need the total count
        (async () => {
          // Fetch documents directly to get pagination info
          const deptFilter = selectedDepartment || undefined;
          const subDeptFilter = selectedSubDepartment || undefined;

          const hasFilters = !!(deptFilter || subDeptFilter || startDate || endDate);

          console.log('🔍 Dashboard fetching with filters:', {
            userId: Number(selectedRole.ID),
            department: deptFilter,
            subDepartment: subDeptFilter,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            hasFilters: hasFilters
          });

          const response = await fetchDocuments(
            Number(selectedRole.ID),
            1,
            undefined,
            deptFilter,
            subDeptFilter,
            startDate || undefined,
            endDate || undefined
          );

          const raw = response?.data as any;
          const data = (raw && (raw.data ?? raw)) as any;
          const pagination = data?.pagination ?? { totalItems: 0 };
          const docs = Array.isArray(data?.documents) ? data.documents : [];

          // Check if returned documents match the filters
          const firstDoc = docs[0];
          const docMatchesFilter = firstDoc ? (
            (!deptFilter || Number(firstDoc.newdoc?.DepartmentId || firstDoc.DepartmentId) === Number(deptFilter)) &&
            (!subDeptFilter || Number(firstDoc.newdoc?.SubDepartmentId || firstDoc.SubDepartmentId) === Number(subDeptFilter))
          ) : true;

          console.log('📊 Dashboard API response:', {
            totalItems: pagination?.totalItems,
            totalPages: pagination?.totalPages,
            documentsCount: docs.length,
            hasFilters: hasFilters,
            firstDocMatches: docMatchesFilter,
            firstDoc: firstDoc ? {
              id: firstDoc.newdoc?.ID || firstDoc.ID,
              deptId: firstDoc.newdoc?.DepartmentId || firstDoc.DepartmentId,
              subDeptId: firstDoc.newdoc?.SubDepartmentId || firstDoc.SubDepartmentId,
              expectedDept: deptFilter,
              expectedSubDept: subDeptFilter
            } : 'no documents'
          });

          // Also update the context for other components that might use it
          await fetchDocumentList(
            Number(selectedRole.ID),
            1,
            undefined,
            deptFilter,
            subDeptFilter,
            startDate || undefined,
            endDate || undefined
          );

          return { totalDocuments: pagination?.totalItems ?? docs.length };
        })(),
        // Analytics API call - for downloads and active users
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

          try {
            const { data } = await axios.get(`/documents/activities-dashboard`, {
              params: paramsWhenRange,
            });

            if (!data?.success) {
              console.warn('Activities API returned unsuccessful response');
              return { downloads: 0, activeUsers: new Set<string>() };
            }

            const auditTrails = data?.data?.auditTrails || [];
            const startBound = startDate ? new Date(startDate + 'T00:00:00') : null;
            const endBound = endDate ? new Date(endDate + 'T23:59:59.999') : null;

            // Filter activities by date, department, and sub-department
            const filteredActivities = auditTrails.filter((a: any) => {
              // Date filtering - check ActionDate
              if (startBound || endBound) {
                const actionDateStr = a.ActionDate || a.actionDate || a.CreatedDate || a.createdDate;
                if (!actionDateStr) return false;
                const actionDate = new Date(actionDateStr);
                if (isNaN(actionDate.getTime())) return false;
                if (startBound && actionDate < startBound) return false;
                if (endBound && actionDate > endBound) return false;
              }

              // Department filtering - check document's department
              if (selectedDepartment) {
                const docDeptId = Number(
                  a.documentNew?.DepartmentId ||
                  a.document?.DepartmentId ||
                  a.documentNew?.departmentId ||
                  a.document?.departmentId ||
                  a.DepartmentId ||
                  a.departmentId ||
                  0
                );
                if (docDeptId === 0 || docDeptId !== Number(selectedDepartment)) return false;
              }

              // Sub-department filtering - check document's sub-department
              if (selectedSubDepartment) {
                const docSubDeptId = Number(
                  a.documentNew?.SubDepartmentId ||
                  a.document?.SubDepartmentId ||
                  a.documentNew?.subDepartmentId ||
                  a.document?.subDepartmentId ||
                  a.SubDepartmentId ||
                  a.subDepartmentId ||
                  0
                );
                if (docSubDeptId === 0 || docSubDeptId !== Number(selectedSubDepartment)) return false;
              }

              return true;
            });

            // Calculate downloads from filtered activities
            const downloads = filteredActivities.filter((a: any) => {
              const action = (a.Action || a.action || '').toUpperCase();
              return action === 'DOWNLOADED' || action === 'DOWNLOAD';
            }).length;

            // Calculate active users from all filtered activities (not just downloads)
            const activeUsers = new Set<string>();
            filteredActivities.forEach((a: any) => {
              const userName = a.actor?.userName || a.actor?.user_name || a.userName || a.user_name || a.actor?.name;
              const userId = a.actor?.id || a.actor?.ID || a.ActionBy || a.actionBy;
              if (userName && userName !== 'Unknown' && userName !== '') {
                activeUsers.add(userName);
              } else if (userId) {
                activeUsers.add(String(userId));
              }
            });

            console.log('📊 Activities stats:', {
              totalActivities: auditTrails.length,
              filteredActivities: filteredActivities.length,
              downloads,
              activeUsers: activeUsers.size,
              sampleActivity: filteredActivities[0]
            });

            return { downloads, activeUsers };
          } catch (error) {
            console.error('Error fetching activities:', error);
            return { downloads: 0, activeUsers: new Set<string>() };
          }
        })(),
        // Fetch all pages to calculate total page count
        fetchAllPagesForCount(
          Number(selectedRole.ID),
          selectedDepartment || undefined,
          selectedSubDepartment || undefined,
          startDate || undefined,
          endDate || undefined
        ),
        // Fetch all users from the system
        (async () => {
          try {
            const { data } = await axios.get('/users');
            const users = data?.users || [];
            return { totalUsers: users.length };
          } catch (error) {
            console.error('Error fetching users:', error);
            return { totalUsers: 0 };
          }
        })()
      ]);

      // Handle results
      if (documentsResult.status === 'fulfilled') {
        const result = documentsResult.value;
        if (result?.totalDocuments !== undefined) {
          console.log('✅ Total documents updated:', result.totalDocuments);
        }
      } else if (documentsResult.status === 'rejected') {
        console.error('Failed to fetch documents:', documentsResult.reason);
        setTotalDocumentsCount(0);
      }

      // Handle analytics results (downloads and active users from activities)
      let activitiesActiveUsers = new Set<string>();
      if (analyticsResult.status === 'fulfilled') {
        const { downloads, activeUsers } = analyticsResult.value;
        setDownloadsCount(downloads || 0);
        activitiesActiveUsers = activeUsers || new Set<string>();
        console.log('✅ Quick Stats (activities):', { downloads, activeUsers: activitiesActiveUsers.size });
      } else if (analyticsResult.status === 'rejected') {
        console.error('Failed to fetch analytics:', analyticsResult.reason);
        setDownloadsCount(0);
      }

      // Handle counts results (uploads and confidential docs from documents)
      let documentCreatedByUsers = new Set<string>();
      if (countsResult.status === 'fulfilled') {
        const { totalDocuments, totalPages, fileTypes, uploads, confidentialDocs, createdByUsers } = countsResult.value;
        setTotalDocumentsCount(totalDocuments);
        setTotalPagesCount(totalPages);

        // Set uploads from documents (more accurate)
        setUploadsCount(uploads || 0);

        // Set confidential docs from documents (more accurate)
        setConfidentialDocsCount(confidentialDocs || 0);

        // Store createdByUsers for combining with activities
        documentCreatedByUsers = createdByUsers || new Set<string>();

        if (fileTypes) {
          const typeData = Object.entries(fileTypes)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
          setDocumentTypeData(typeData);
        }
        console.log('✅ Filtered totals updated:', {
          totalDocuments,
          totalPages,
          uploads,
          confidentialDocs,
          createdByUsers: documentCreatedByUsers.size
        });
      } else if (countsResult.status === 'rejected') {
        console.error('Failed to fetch filtered totals:', countsResult.reason);
        setTotalDocumentsCount(0);
        setTotalPagesCount(0);
        setUploadsCount(0);
        setConfidentialDocsCount(0);
      }

      // Handle users result - fetch total users count
      if (usersResult.status === 'fulfilled') {
        const { totalUsers } = usersResult.value;
        setActiveUsersCount(totalUsers || 0);
        console.log('✅ Total users updated:', totalUsers);
      } else if (usersResult.status === 'rejected') {
        console.error('Failed to fetch users:', usersResult.reason);
        // Fallback: combine active users from both sources if users fetch fails
        const allActiveUsers = new Set([...documentCreatedByUsers, ...activitiesActiveUsers]);
        setActiveUsersCount(allActiveUsers.size);
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsDocumentsLoading(false);
      setIsAnalyticsLoading(false);
      setIsFilterLoading(false);
    }
  }, [selectedRole, fetchDocumentList, fetchAllPagesForCount, startDate, endDate, selectedDepartment, selectedSubDepartment, selectedYear]);


  const checkRoleViewAccess = useCallback(
    async (departmentId: number, subDepartmentId: number) => {
      if (!selectedRole?.ID) return false;
      const cacheKey = `${selectedRole.ID}-${departmentId}-${subDepartmentId}`;
      if (roleAccessCacheRef.current.has(cacheKey)) {
        return roleAccessCacheRef.current.get(cacheKey) as boolean;
      }
      try {
        let allocations = await fetchRoleAllocations(departmentId, subDepartmentId);
        if (!allocations || allocations.length === 0) {
          allocations = await fetchRoleAllocationsByLink(subDepartmentId);
        }
        const match = allocations?.find(
          (alloc: any) => Number(alloc.UserAccessID) === Number(selectedRole.ID)
        );
        const canView = match ? toBool(match.View) : false;
        roleAccessCacheRef.current.set(cacheKey, canView);
        return canView;
      } catch (error) {
        console.error('Failed to evaluate role allocations for filters:', error);
        roleAccessCacheRef.current.set(cacheKey, false);
        return false;
      }
    },
    [selectedRole?.ID]
  );

  useEffect(() => {
    roleAccessCacheRef.current.clear();
    setSelectedDepartment('');
    setSelectedSubDepartment('');
  }, [selectedRole?.ID]);

  useEffect(() => {
    let isMounted = true;

    const filterOptionsByRole = async () => {
      if (!selectedRole?.ID) {
        if (isMounted) {
          setIsAccessOptionsLoading(false);
          setAccessibleDepartments([]);
          setAccessibleSubDepartmentsMap({});
        }
        return;
      }

      if (departmentOptions.length === 0) {
        if (isMounted) {
          setIsAccessOptionsLoading(false);
          setAccessibleDepartments([]);
          setAccessibleSubDepartmentsMap({});
        }
        return;
      }

      // Removed: isAdmin bypass - even admins should only see allocated depts/subdepts
      // as requested by the user.

      setIsAccessOptionsLoading(true);
      try {
        const tasks: Array<{
          deptValue: string;
          deptId: number;
          sub: { value: string; label: string };
        }> = [];

        for (const dept of departmentOptions) {
          const deptId = Number(dept.value);
          const subOptions = getSubDepartmentOptions(deptId);
          if (!subOptions.length) continue;

          subOptions.forEach((sub) => {
            tasks.push({
              deptValue: dept.value,
              deptId,
              sub,
            });
          });
        }

        const allowedDeptSet = new Set<string>();
        const subMap: Record<string, { value: string; label: string }[]> = {};

        // Use a pending requests map to avoid duplicate concurrent calls
        const pendingRequests = new Map<string, Promise<boolean>>();

        const checkWithPending = async (deptId: number, subId: number) => {
          const cacheKey = `${selectedRole.ID}-${deptId}-${subId}`;
          if (roleAccessCacheRef.current.has(cacheKey)) {
            return roleAccessCacheRef.current.get(cacheKey)!;
          }
          if (pendingRequests.has(cacheKey)) {
            return pendingRequests.get(cacheKey)!;
          }

          const request = checkRoleViewAccess(deptId, subId);
          pendingRequests.set(cacheKey, request);
          const result = await request;
          pendingRequests.delete(cacheKey);
          return result;
        };

        const CONCURRENCY = 10; // Increased concurrency
        for (let i = 0; i < tasks.length; i += CONCURRENCY) {
          if (!isMounted) return;
          const slice = tasks.slice(i, i + CONCURRENCY);
          const sliceResults = await Promise.all(
            slice.map(async ({ deptValue, deptId, sub }) => {
              const canView = await checkWithPending(deptId, Number(sub.value));
              return canView ? { deptValue, sub } : null;
            })
          );

          sliceResults.forEach((result) => {
            if (!result) return;
            allowedDeptSet.add(result.deptValue);
            if (!subMap[result.deptValue]) {
              subMap[result.deptValue] = [];
            }
            subMap[result.deptValue].push(result.sub);
          });
        }

        const allowedDepts = departmentOptions.filter((dept) =>
          allowedDeptSet.has(dept.value)
        );

        if (isMounted) {
          console.log('✅ Dashboard filters strictly limited by role:', {
            accessibleDepts: allowedDepts.length,
            roleId: selectedRole.ID
          });
          setAccessibleDepartments(allowedDepts);
          setAccessibleSubDepartmentsMap(subMap);
        }
      } catch (error) {
        console.error('Failed to limit filter options by role allocations:', error);
        if (isMounted) {
          // If filtering fails, show nothing to ensure security
          setAccessibleDepartments([]);
          setAccessibleSubDepartmentsMap({});
        }
      } finally {
        if (isMounted) {
          setIsAccessOptionsLoading(false);
        }
      }
    };

    filterOptionsByRole();

    return () => {
      isMounted = false;
    };
  }, [
    selectedRole?.ID,
    departmentOptions,
    getSubDepartmentOptions,
    checkRoleViewAccess,
  ]);

  useEffect(() => {
    if (!selectedDepartment) return;
    const stillAllowed = accessibleDepartments.some((dept) => dept.value === selectedDepartment);
    if (!stillAllowed) {
      setSelectedDepartment('');
      setSelectedSubDepartment('');
    }
  }, [selectedDepartment, accessibleDepartments]);

  // Effect to fetch all data on role change and filter changes
  useEffect(() => {
    if (selectedRole?.ID) {
      // Always fetch data, whether filters are applied or not
      // If filters are applied, debounce to avoid too many API calls
      if (startDate || endDate || selectedDepartment || selectedSubDepartment) {
        // Debounce filter changes
        debouncedFetchData(fetchAllData, 300);
      } else {
        // Immediate for role changes or when filters are cleared
        fetchAllData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole?.ID, startDate, endDate, selectedDepartment, selectedSubDepartment]);

  // Update sub-departments when department selection changes
  useEffect(() => {
    if (selectedDepartment) {
      const allowedSubs = accessibleSubDepartmentsMap[selectedDepartment] || [];
      setSubDepartmentOptions(allowedSubs);
      if (selectedSubDepartment && !allowedSubs.some((sub) => sub.value === selectedSubDepartment)) {
        setSelectedSubDepartment('');
      }
    } else {
      setSubDepartmentOptions([]);
      if (selectedSubDepartment) {
        setSelectedSubDepartment('');
      }
    }
  }, [selectedDepartment, accessibleSubDepartmentsMap, selectedSubDepartment]);

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

  // Use the total pages count from all fetched documents
  // This is calculated by fetching all pages, not just the first page
  const totalPagesFromDocuments = totalPagesCount;

  // Note: totalDocumentsCount is now set directly in fetchAllData from API response
  // Removed useEffect that synced from documentList to prevent infinite loops

  const statCards = [
    {
      title: 'Total Documents',
      count: totalDocumentsCount,
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
                disabled={isAccessOptionsLoading || accessibleDepartments.length === 0}
                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg text-sm bg-white 
                          appearance-none cursor-pointer focus:outline-none 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          transition-all shadow-sm hover:border-blue-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option value="" hidden>
                  {isAccessOptionsLoading
                    ? 'Loading departments...'
                    : accessibleDepartments.length === 0
                      ? 'No departments available'
                      : 'Select Department'}
                </option>
                {accessibleDepartments.map((dept) => (
                  <option key={dept.value} value={dept.value}>
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
                disabled={
                  !selectedDepartment ||
                  isAccessOptionsLoading ||
                  subDepartmentOptions.length === 0
                }
                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg text-sm bg-white 
                          appearance-none cursor-pointer focus:outline-none 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          transition-all shadow-sm hover:border-blue-300
                          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option value="" hidden>
                  {isAccessOptionsLoading
                    ? 'Loading document types...'
                    : subDepartmentOptions.length === 0
                      ? 'No document types available'
                      : 'Select Document Type'}
                </option>
                {subDepartmentOptions.map((subDept) => (
                  <option key={subDept.value} value={subDept.value}>
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
                <span className="text-gray-700 font-medium">Total Users</span>
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