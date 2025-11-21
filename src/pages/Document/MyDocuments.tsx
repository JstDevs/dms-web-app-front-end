import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// import { useDocument } from "@/contexts/DocumentContext";
import DocumentCard from '@/components/documents/DocumentCard';
// import { Input, Select } from "@/components/ui"; // Assuming you have these UI components
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { FileText, Search, Filter, X, Calendar, Building2, FolderOpen, AlertTriangle, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDocuments, deleteDocument } from './utils/uploadAPIs';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useAllocationPermissions } from './utils/useAllocationPermissions';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { logDocumentActivity } from '@/utils/activityLogger';
import { toast } from 'react-hot-toast';


const MyDocuments: React.FC = () => {
  // const { documents } = useDocument();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { departmentOptions, getSubDepartmentOptions, loading: loadingDepartments } = useNestedDepartmentOptions();
  
  // Initialize filter state from URL query parameters
  const getInitialStateFromURL = useCallback(() => {
    return {
      searchTerm: searchParams.get('search') || '',
      department: searchParams.get('department') || '',
      subDepartment: searchParams.get('subDepartment') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      appliedDepartment: searchParams.get('appliedDepartment') || '',
      appliedSubDepartment: searchParams.get('appliedSubDepartment') || '',
      appliedStartDate: searchParams.get('appliedStartDate') || '',
      appliedEndDate: searchParams.get('appliedEndDate') || '',
      currentPage: parseInt(searchParams.get('page') || '1', 10),
    };
  }, [searchParams]);
  
  // State for filter selections (what user selects)
  const [searchTerm, setSearchTerm] = useState('');
  const [department, setDepartment] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for applied filters (what's actually used for filtering)
  const [appliedDepartment, setAppliedDepartment] = useState('');
  const [appliedSubDepartment, setAppliedSubDepartment] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  
  // TODO CHANGE THIS TS TYPE
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const { selectedRole, user } = useAuth(); // assuming user object has user.id
  const [currentPage, setCurrentPage] = useState(1);
  
  // Initialize state from URL on mount and when URL changes (e.g., when navigating back)
  const hasInitializedFromURL = useRef(false);
  useEffect(() => {
    const urlState = getInitialStateFromURL();
    
    // Only initialize from URL if we haven't done it yet, or if URL has applied filters
    if (!hasInitializedFromURL.current || urlState.appliedDepartment || urlState.appliedSubDepartment) {
      if (urlState.searchTerm) setSearchTerm(urlState.searchTerm);
      if (urlState.department) setDepartment(urlState.department);
      if (urlState.subDepartment) setSubDepartment(urlState.subDepartment);
      if (urlState.startDate) setStartDate(urlState.startDate);
      if (urlState.endDate) setEndDate(urlState.endDate);
      if (urlState.appliedDepartment) setAppliedDepartment(urlState.appliedDepartment);
      if (urlState.appliedSubDepartment) setAppliedSubDepartment(urlState.appliedSubDepartment);
      if (urlState.appliedStartDate) setAppliedStartDate(urlState.appliedStartDate);
      if (urlState.appliedEndDate) setAppliedEndDate(urlState.appliedEndDate);
      if (urlState.currentPage > 1) setCurrentPage(urlState.currentPage);
      hasInitializedFromURL.current = true;
    }
  }, [getInitialStateFromURL, searchParams]);
  const [paginationData, setPaginationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 10;
  
  // Fetch allocation permissions for applied department/subdepartment
  const { permissions: allocationPermissions, loading: loadingPermissions } = useAllocationPermissions({
    departmentId: appliedDepartment ? Number(appliedDepartment) : null,
    subDepartmentId: appliedSubDepartment ? Number(appliedSubDepartment) : null,
    userId: user?.ID || null,
  });
  
  // Get document types for selected department
  const documentTypeOptions = useMemo(() => {
    if (!department) return [];
    const deptId = Number(department);
    return getSubDepartmentOptions(deptId);
  }, [department, getSubDepartmentOptions]);
  
  // Set default department to first available option (for UI only, not applied)
  // Only set default if not already set from URL
  useEffect(() => {
    if (departmentOptions.length > 0 && !department && !searchParams.get('department')) {
      const firstDept = departmentOptions[0].value;
      setDepartment(firstDept);
      // Don't set appliedDepartment here - wait for Apply Filters button
    }
  }, [departmentOptions, department, searchParams]);
  
  // Set default document type when department is selected (for UI only, not applied)
  // Only set default if not already set from URL
  useEffect(() => {
    if (department && documentTypeOptions.length > 0) {
      // If no document type is selected, set the first one (unless it's in URL)
      if (!subDepartment && !searchParams.get('subDepartment')) {
        const firstDocType = documentTypeOptions[0].value;
        setSubDepartment(firstDocType);
        // Don't set appliedSubDepartment here - wait for Apply Filters button
      } else if (subDepartment) {
        // If a document type is selected, check if it's still valid
        const isValid = documentTypeOptions.some(opt => opt.value === subDepartment);
        if (!isValid) {
          // If invalid, reset to first available option
          const firstDocType = documentTypeOptions[0].value;
          setSubDepartment(firstDocType);
          // Don't set appliedSubDepartment here - wait for Apply Filters button
        }
      }
    }
    // Clear document type if department changes and no options available
    if (department && documentTypeOptions.length === 0 && subDepartment) {
      setSubDepartment('');
      // Don't clear appliedSubDepartment here - wait for Apply Filters button
    }
  }, [department, documentTypeOptions, subDepartment, searchParams]);

  // Auto-apply initial filters once on first visit only (skip if restoring from URL)
  const hasAppliedInitial = useRef(false);
  useEffect(() => {
    // Don't auto-apply if we're restoring from URL (URL has applied filters)
    const urlState = getInitialStateFromURL();
    if (urlState.appliedDepartment || urlState.appliedSubDepartment) {
      hasAppliedInitial.current = true;
      return;
    }
    
    if (
      !hasAppliedInitial.current &&
      department &&
      subDepartment &&
      !appliedDepartment &&
      !appliedSubDepartment
    ) {
      hasAppliedInitial.current = true;
      setAppliedDepartment(department);
      setAppliedSubDepartment(subDepartment);
      setCurrentPage(1);
    }
  }, [department, subDepartment, appliedDepartment, appliedSubDepartment, getInitialStateFromURL]);
  
  // Debounce search term to prevent too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Date range validation
  const isDateRangeValid = () => {
    if (!startDate && !endDate) return true;
    if (!startDate || !endDate) return true; // Allow partial dates
    return new Date(startDate) <= new Date(endDate);
  };

  // Reset to page 1 when filters are applied
  useEffect(() => {
    if (appliedDepartment || appliedSubDepartment || appliedStartDate || appliedEndDate || debouncedSearchTerm) {
      setCurrentPage(1);
    }
  }, [appliedDepartment, appliedSubDepartment, appliedStartDate, appliedEndDate, debouncedSearchTerm]);
  
  // Update URL when applied filters or page changes (skip during initial URL restoration)
  useEffect(() => {
    // Don't update URL if we're still initializing from URL
    if (!hasInitializedFromURL.current) {
      return;
    }
    
    const newParams = new URLSearchParams();
    if (debouncedSearchTerm) newParams.set('search', debouncedSearchTerm);
    if (department) newParams.set('department', department);
    if (subDepartment) newParams.set('subDepartment', subDepartment);
    if (startDate) newParams.set('startDate', startDate);
    if (endDate) newParams.set('endDate', endDate);
    if (appliedDepartment) newParams.set('appliedDepartment', appliedDepartment);
    if (appliedSubDepartment) newParams.set('appliedSubDepartment', appliedSubDepartment);
    if (appliedStartDate) newParams.set('appliedStartDate', appliedStartDate);
    if (appliedEndDate) newParams.set('appliedEndDate', appliedEndDate);
    if (currentPage > 1) newParams.set('page', currentPage.toString());
    
    // Only update URL if there are actual filters applied
    if (appliedDepartment || appliedSubDepartment || appliedStartDate || appliedEndDate || debouncedSearchTerm || currentPage > 1) {
      setSearchParams(newParams, { replace: true });
    }
  }, [appliedDepartment, appliedSubDepartment, appliedStartDate, appliedEndDate, debouncedSearchTerm, currentPage, department, subDepartment, startDate, endDate, setSearchParams]);

  const loadDocuments = useCallback(async () => {
      // Only load if both department and document type are applied
      if (!appliedDepartment || !appliedSubDepartment) {
        setDocuments([]);
        setFilteredDocs([]);
        setPaginationData(null);
        setLoading(false);
        setFilterLoading(false);
        return;
      }

      // Use filterLoading when filters are applied (not initial load)
      setFilterLoading(true);
      setLoading(false);
      
      try {

        // Check if we need to fetch all pages for client-side date filtering
        const needsAllPages = appliedStartDate || appliedEndDate;
        
        if (needsAllPages) {
          // For date filtering, we need to fetch all pages to filter client-side
          const firstPageResponse = await fetchDocuments(
            Number(selectedRole?.ID),
            1,
            debouncedSearchTerm,
            appliedDepartment,
            appliedSubDepartment,
            '', // Don't send date filters to backend
            ''
          );
          const firstPageRaw = firstPageResponse.data;
          const firstPage = (firstPageRaw && (firstPageRaw.data ?? firstPageRaw)) as any;
          
          const totalPages = firstPage?.pagination?.totalPages || 1;
          const allPages = [firstPage];
          
          if (totalPages > 1) {
            const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
            const pageResults = await Promise.all(
              remainingPages.map((p) =>
                fetchDocuments(
                  Number(selectedRole?.ID),
                  p,
                  debouncedSearchTerm,
                  appliedDepartment,
                  appliedSubDepartment,
                  '', // Don't send date filters to backend
                  ''
                )
              )
            );
            allPages.push(
              ...pageResults.map((r) => {
                const raw = r.data;
                return (raw && (raw.data ?? raw)) as any;
              })
            );
          }
          
          const combinedDocuments = allPages.flatMap((page) =>
            Array.isArray(page?.documents) ? (page.documents as any[]) : []
          );
          const effectivePagination = {
            ...(firstPage?.pagination ?? {}),
            totalItems: combinedDocuments.length,
            totalPages: 1,
          };
          
          setDocuments(combinedDocuments);
          setPaginationData(effectivePagination);
          // Don't set filteredDocs here - let the filtering effect handle it
        } else {
          // Normal pagination for other filters
          console.log('📡 Fetching documents with filters:', {
            userId: Number(selectedRole?.ID),
            page: currentPage,
            searchTerm: debouncedSearchTerm,
            department: appliedDepartment,
            subDepartment: appliedSubDepartment,
            startDate: appliedStartDate,
            endDate: appliedEndDate
          });
          
          const response = await fetchDocuments(
            Number(selectedRole?.ID),
            currentPage,
            debouncedSearchTerm,
            appliedDepartment,
            appliedSubDepartment,
            appliedStartDate,
            appliedEndDate
          );
          const raw = response.data as any;
          const responseData = (raw && (raw.data ?? raw)) as any;
          const pageDocuments = Array.isArray(responseData?.documents)
            ? (responseData.documents as any[])
            : [];
          const effectivePagination = responseData?.pagination ?? {
            totalItems: pageDocuments.length,
            totalPages: 1,
          };
          
          console.log('📥 Received documents:', {
            count: pageDocuments?.length ?? 0,
            totalItems: effectivePagination?.totalItems ?? 0,
            sampleDepts: pageDocuments.slice(0, 5).map((d: any) => ({
              id: d.newdoc?.ID,
              deptId: d.newdoc?.DepartmentId,
              subDeptId: d.newdoc?.SubDepartmentId
            }))
          });
          
          // Fetch ALL pages to get all matching documents for this department/subdepartment
          // This is needed because we do client-side filtering and pagination
          const appliedDeptId = Number(appliedDepartment);
          const appliedSubDeptId = Number(appliedSubDepartment);
          let allFilteredDocs = pageDocuments.filter((doc: any) => {
            const docDeptId = Number(doc.newdoc?.DepartmentId || 0);
            const docSubDeptId = Number(doc.newdoc?.SubDepartmentId || 0);
            return docDeptId === appliedDeptId && docSubDeptId === appliedSubDeptId;
          });

          // Fetch remaining pages to get all matching documents
          const totalPages = effectivePagination?.totalPages || 1;
          if (totalPages > 1) {
            // Get all pages except the current page
            const remainingPages = [];
            for (let p = 1; p <= totalPages; p++) {
              if (p !== currentPage) {
                remainingPages.push(p);
              }
            }

            try {
              const pageResults = await Promise.all(
                remainingPages.map((p) =>
                  fetchDocuments(
                    Number(selectedRole?.ID),
                    p,
                    debouncedSearchTerm,
                    appliedDepartment,
                    appliedSubDepartment,
                    appliedStartDate,
                    appliedEndDate
                  )
                )
              );

              pageResults.forEach((nextResp) => {
                const nextRaw = nextResp.data as any;
                const nextData = (nextRaw && (nextRaw.data ?? nextRaw)) as any;
                const nextDocs = Array.isArray(nextData?.documents) ? nextData.documents : [];
                const nextFiltered = nextDocs.filter((doc: any) => {
                  const docDeptId = Number(doc.newdoc?.DepartmentId || 0);
                  const docSubDeptId = Number(doc.newdoc?.SubDepartmentId || 0);
                  return docDeptId === appliedDeptId && docSubDeptId === appliedSubDeptId;
                });
                allFilteredDocs = allFilteredDocs.concat(nextFiltered);
              });
            } catch (e) {
              console.warn('Failed to fetch some pages:', e);
              // Continue with what we have
            }
          }

          // Store ALL matching documents (not just 10)
          // Client-side pagination will handle slicing per page
          setDocuments(allFilteredDocs);
          setPaginationData(effectivePagination);
          // Filtering effect will handle additional filtering (confidential, etc.)
        }
        
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error('❌ Failed to fetch documents:', err);
        setError("Error loading documents. Please try again.");
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    }, [selectedRole, debouncedSearchTerm, appliedDepartment, appliedSubDepartment, appliedStartDate, appliedEndDate]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Client-side filtering: department/type + optional date range + View permission check + Confidential permission check
  useEffect(() => {
    // Require applied department/type to show anything
    if (!appliedDepartment || !appliedSubDepartment) {
      setFilteredDocs([]);
      return;
    }

    // Check View permission - if user doesn't have View permission, don't show any documents
    if (!allocationPermissions.View) {
      setFilteredDocs([]);
      return;
    }

    // Department/type filter
    const appliedDeptId = Number(appliedDepartment);
    const appliedSubDeptId = Number(appliedSubDepartment);
    let filtered = documents.filter((doc: any) => {
      const docDeptId = Number(doc.newdoc?.DepartmentId || 0);
      const docSubDeptId = Number(doc.newdoc?.SubDepartmentId || 0);
      return docDeptId === appliedDeptId && docSubDeptId === appliedSubDeptId;
    });

    // Confidential permission check - filter out confidential documents if user doesn't have Confidential permission
    if (!allocationPermissions.Confidential) {
      filtered = filtered.filter((doc: any) => {
        // Only show non-confidential documents
        return !doc.newdoc?.Confidential;
      });
    }

    // Optional date filtering
    if (appliedStartDate || appliedEndDate) {
      const startBoundary = appliedStartDate
        ? new Date(`${appliedStartDate}T00:00:00`)
        : null;
      const endBoundary = appliedEndDate
        ? new Date(`${appliedEndDate}T23:59:59.999`)
        : null;

      filtered = filtered.filter((doc: any) => {
        const docDateStr = doc.newdoc?.CreatedDate || doc.newdoc?.FileDate;
        if (!docDateStr) return false;
        const docDate = new Date(docDateStr);
        if (Number.isNaN(docDate.getTime())) return false;
        if (startBoundary && docDate < startBoundary) return false;
        if (endBoundary && docDate > endBoundary) return false;
        return true;
      });
    }

    setFilteredDocs(filtered);
  }, [documents, appliedDepartment, appliedSubDepartment, appliedStartDate, appliedEndDate, allocationPermissions.View, allocationPermissions.Confidential]);

  // Delete handler - must be defined before documentCards useMemo
  const handleDelete = useCallback(async (documentId: string) => {
    try {
      const documentToDelete = filteredDocs.find(
        (doc: any) => doc.newdoc?.ID?.toString() === documentId.toString()
      );

      await deleteDocument(Number(documentId));

      // Log document deletion activity
      if (documentToDelete && user) {
        try {
          await logDocumentActivity(
            'DELETED',
            user.ID,
            user.UserName || 'Unknown',
            Number(documentId),
            documentToDelete.newdoc?.FileName || 'Unknown',
            `Deleted by ${user.UserName || 'Unknown'}`
          );
        } catch (logError) {
          console.warn('Failed to log document deletion activity:', logError);
        }
      }

      toast.success('Document deleted successfully');
      
      // Refresh document list
      await loadDocuments();
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      toast.error(
        error?.response?.data?.error || 'Failed to delete document. Please try again.'
      );
    }
  }, [filteredDocs, user, loadDocuments]);

  // Calculate pagination based on filtered documents
  const totalFilteredItems = filteredDocs.length;
  const totalFilteredPages = Math.ceil(totalFilteredItems / ITEMS_PER_PAGE);
  
  // Reset to page 1 if current page is beyond available pages
  useEffect(() => {
    if (totalFilteredPages > 0 && currentPage > totalFilteredPages) {
      setCurrentPage(1);
    }
  }, [totalFilteredPages, currentPage]);
  
  // Get paginated documents for current page
  const paginatedDocs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredDocs.slice(startIndex, endIndex);
  }, [filteredDocs, currentPage]);

  // Memoize the document cards to prevent unnecessary re-renders
  // Use allocation permissions instead of module permissions
  const documentCards = useMemo(() => 
    paginatedDocs.map((document) => {
      const doc = document.newdoc;
      // Preserve current filter state in URL when navigating to document
      const currentParams = new URLSearchParams();
      if (debouncedSearchTerm) currentParams.set('search', debouncedSearchTerm);
      if (department) currentParams.set('department', department);
      if (subDepartment) currentParams.set('subDepartment', subDepartment);
      if (startDate) currentParams.set('startDate', startDate);
      if (endDate) currentParams.set('endDate', endDate);
      if (appliedDepartment) currentParams.set('appliedDepartment', appliedDepartment);
      if (appliedSubDepartment) currentParams.set('appliedSubDepartment', appliedSubDepartment);
      if (appliedStartDate) currentParams.set('appliedStartDate', appliedStartDate);
      if (appliedEndDate) currentParams.set('appliedEndDate', appliedEndDate);
      if (currentPage > 1) currentParams.set('page', currentPage.toString());
      
      const queryString = currentParams.toString();
      const documentUrl = queryString 
        ? `/documents/${doc.ID}?${queryString}`
        : `/documents/${doc.ID}`;
      
      return (
        <DocumentCard
          key={doc.ID}
          document={doc}
          onClick={() => navigate(documentUrl)}
          permissions={allocationPermissions}
          onDelete={handleDelete}
        />
      );
    }), [paginatedDocs, allocationPermissions, navigate, handleDelete, debouncedSearchTerm, department, subDepartment, startDate, endDate, appliedDepartment, appliedSubDepartment, appliedStartDate, appliedEndDate, currentPage]
  );
  // Department/subDept options
  // const departments = Array.from(new Set(documents.map((d) => d.DepartmentId)));
  // const subDepartments = Array.from(
  //   new Set(
  //     documents
  //       .filter((d) => (department ? d.DepartmentId === +department : true))
  //       .map((d) => d.SubDepartmentId)
  //   )
  // );

  // Server-side filtering is now handled by the API
  // No need for client-side filtering

  const applyFilters = () => {
    // Validate that both department and document type are selected
    if (!department || !subDepartment) {
      setError("Please select both Department and Document Type before applying filters.");
      return;
    }
    
    // Apply the selected filters
    setAppliedDepartment(department);
    setAppliedSubDepartment(subDepartment);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
    setError(""); // Clear any previous errors
    
    // Update URL query parameters
    const newParams = new URLSearchParams();
    if (searchTerm) newParams.set('search', searchTerm);
    if (department) newParams.set('department', department);
    if (subDepartment) newParams.set('subDepartment', subDepartment);
    if (startDate) newParams.set('startDate', startDate);
    if (endDate) newParams.set('endDate', endDate);
    if (department) newParams.set('appliedDepartment', department);
    if (subDepartment) newParams.set('appliedSubDepartment', subDepartment);
    if (startDate) newParams.set('appliedStartDate', startDate);
    if (endDate) newParams.set('appliedEndDate', endDate);
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  };

  const clearFilters = () => {
    // Reset to default values (first department and first document type)
    const firstDept = departmentOptions.length > 0 ? departmentOptions[0].value : '';
    setDepartment(firstDept);
    // Don't set appliedDepartment - wait for Apply Filters button
    
    // Reset document type - will be set by useEffect when documentTypeOptions loads
    setSubDepartment('');
    // Don't set appliedSubDepartment - wait for Apply Filters button
    
    // Clear applied filters
    setAppliedDepartment('');
    setAppliedSubDepartment('');
    
    // Clear date filters
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    
    // Clear search
    setSearchTerm('');
    
    setCurrentPage(1);
    setError("");
    
    // Clear URL query parameters
    setSearchParams({}, { replace: true });
  };
  // if (!myDocumentPermissions.View) {
  //   return (
  //     <div className="animate-fade-in">
  //       <h1 className="text-3xl font-bold text-blue-800 mb-6">
  //         You do not have permission to view this page
  //       </h1>
  //     </div>
  //   );
  // }
  return (
    <div className="animate-fade-in">
      {/* Enhanced Header */}
      <header className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-6 py-8 sm:px-8 sm:py-10 rounded-xl shadow-xl mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
              Document Library
              {totalFilteredItems > 0 && (
                <span className="text-sm font-normal bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {totalFilteredItems} {totalFilteredItems === 1 ? 'Document' : 'Documents'}
                </span>
              )}
            </h1>
            <p className="text-blue-100 text-sm sm:text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              View and manage your documents with advanced filtering
            </p>
          </div>
        </div>
      </header>

      {/* Enhanced Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity blur-sm"></div>
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" size={20} />
            <Input
              type="text"
              placeholder="Search documents by name, type, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="relative pl-12 pr-12 py-3 border-2 border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
              disabled={filterLoading}
            />
            {filterLoading ? (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
              </div>
            ) : searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            ) : null}
          </div>

          {/* <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          >
            <FiFilter />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button> */}
        </div>

        {/* Enhanced Filter Panel */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Filter Documents</h2>
              <p className="text-sm text-gray-500">Refine your search with advanced filters</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Building2 className="w-4 h-4 text-blue-600" />
                Department
              </label>
              <Select
                label=""
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setSubDepartment(''); // Reset document type when department changes
                  setError(""); // Clear any errors
                }}
                options={departmentOptions}
                disabled={filterLoading || loadingDepartments}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                Document Type
              </label>
              <Select
                label=""
                value={subDepartment}
                onChange={(e) => {
                  setSubDepartment(e.target.value);
                  setError(""); // Clear any errors
                }}
                options={documentTypeOptions}
                placeholder={!department ? "Select Department first" : documentTypeOptions.length === 0 ? "No document types available" : "Select Document Type"}
                disabled={!department || filterLoading || loadingDepartments || documentTypeOptions.length === 0}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                }}
                className="w-full border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={filterLoading}
                max={endDate || undefined}
              />
              <p className="text-xs text-gray-500">Filter by creation date</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                }}
                className="w-full border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={filterLoading}
                min={startDate || undefined}
              />
              <p className="text-xs text-gray-500">Filter by creation date</p>
              {!isDateRangeValid() && (
                <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  End date must be after start date
                </div>
              )}
            </div>
          </div>

            {/* Enhanced Apply Filters Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}
              {filterLoading && (
                <div className="mb-4 flex items-center justify-center gap-3 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span className="text-sm font-semibold">Applying filters...</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                  onClick={applyFilters}
                  disabled={filterLoading || !isDateRangeValid() || loadingDepartments || !department || !subDepartment}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <Filter className="w-4 h-4" />
                  Apply Filters
                </button>

                {(appliedDepartment || appliedSubDepartment || searchTerm || appliedStartDate || appliedEndDate) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* Enhanced Results Count */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              Showing <span className="text-blue-600">{paginatedDocs.length}</span> of{' '}
              <span className="text-blue-600">{totalFilteredItems}</span> documents
              {totalFilteredPages > 1 && (
                <span className="text-gray-500 font-normal ml-1">
                  (Page {currentPage} of {totalFilteredPages})
                </span>
              )}
            </p>
          </div>
          {(appliedDepartment || appliedSubDepartment || debouncedSearchTerm || appliedStartDate || appliedEndDate) && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-semibold">Filters Active</span>
              {(appliedStartDate || appliedEndDate) && (
                <span className="text-xs text-gray-600 ml-1">
                  • {appliedStartDate || 'any'} to {appliedEndDate || 'any'}
                </span>
              )}
            </div>
          )}
        </div>
        {filterLoading && (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        )}
      </div>

      {/* Enhanced Documents Grid */}
      {appliedDepartment && appliedSubDepartment && !loadingPermissions && !filterLoading && !loading && !allocationPermissions.View ? (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-12 text-center shadow-lg">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-yellow-100 rounded-full mb-4">
              <AlertTriangle className="h-12 w-12 text-yellow-600" />
            </div>
            <p className="text-xl font-bold text-yellow-800 mb-2">No View Permission</p>
            <p className="text-sm text-yellow-700 max-w-md">
              You do not have permission to view documents in this department and document type.
            </p>
          </div>
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
          {documentCards}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-12 shadow-lg">
          <div className="p-4 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <p className="text-xl font-bold text-red-800 mb-2">Oops! Something Went Wrong</p>
          <p className="text-sm text-red-700 max-w-md text-center">
            Please try refreshing the page or check your network connection.
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-12 shadow-lg">
          <div className="relative mb-6">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <FileText className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-lg text-blue-700 font-semibold mb-2">Please Wait...</p>
          <p className="text-sm text-blue-600">Almost there! Thanks for your patience...</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">No Documents Found</p>
            <p className="text-sm text-gray-500 max-w-md">
              No documents found matching your criteria. Try adjusting your filters or search terms.
            </p>
          </div>
        </div>
      )}
      {/* Show pagination controls - only show if there are multiple pages */}
      {totalFilteredPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalFilteredItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          // onItemsPerPageChange={setItemsPerPage}
        />
      )}
      
    </div>
  );
};

export default MyDocuments;
