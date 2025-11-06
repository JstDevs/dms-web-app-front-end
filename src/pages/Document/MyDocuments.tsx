import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useDocument } from "@/contexts/DocumentContext";
import DocumentCard from '@/components/documents/DocumentCard';
// import { Input, Select } from "@/components/ui"; // Assuming you have these UI components
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDocuments } from './utils/uploadAPIs';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { PaginationControls } from '@/components/ui/PaginationControls';


const MyDocuments: React.FC = () => {
  // const { documents } = useDocument();
  const navigate = useNavigate();
  const { departmentOptions, getSubDepartmentOptions, loading: loadingDepartments } = useNestedDepartmentOptions();
  
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
  const { selectedRole } = useAuth(); // assuming user object has user.id
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationData, setPaginationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 10;
  // console.log("selectedRole", selectedRole);
  const myDocumentPermissions = useModulePermissions(4); // 1 = MODULE_ID
  
  // Get document types for selected department
  const documentTypeOptions = useMemo(() => {
    if (!department) return [];
    const deptId = Number(department);
    return getSubDepartmentOptions(deptId);
  }, [department, getSubDepartmentOptions]);
  
  // Set default department to first available option (for UI only, not applied)
  useEffect(() => {
    if (departmentOptions.length > 0 && !department) {
      const firstDept = departmentOptions[0].value;
      setDepartment(firstDept);
      // Don't set appliedDepartment here - wait for Apply Filters button
    }
  }, [departmentOptions, department]);
  
  // Set default document type when department is selected (for UI only, not applied)
  useEffect(() => {
    if (department && documentTypeOptions.length > 0) {
      // If no document type is selected, set the first one
      if (!subDepartment) {
        const firstDocType = documentTypeOptions[0].value;
        setSubDepartment(firstDocType);
        // Don't set appliedSubDepartment here - wait for Apply Filters button
      } else {
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
  }, [department, documentTypeOptions, subDepartment]);

  // Auto-apply initial filters once on first visit only
  const hasAppliedInitial = useRef(false);
  useEffect(() => {
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
  }, [department, subDepartment, appliedDepartment, appliedSubDepartment]);
  
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
          
          // Backfill next pages until we have up to ITEMS_PER_PAGE matching docs
          const appliedDeptId = Number(appliedDepartment);
          const appliedSubDeptId = Number(appliedSubDepartment);
          let filteredPageDocs = pageDocuments.filter((doc: any) => {
            const docDeptId = Number(doc.newdoc?.DepartmentId || 0);
            const docSubDeptId = Number(doc.newdoc?.SubDepartmentId || 0);
            return docDeptId === appliedDeptId && docSubDeptId === appliedSubDeptId;
          });

          if (filteredPageDocs.length < ITEMS_PER_PAGE) {
            const totalPages = effectivePagination?.totalPages || 1;
            let nextPage = currentPage + 1;
            while (filteredPageDocs.length < ITEMS_PER_PAGE && nextPage <= totalPages) {
              try {
                const nextResp = await fetchDocuments(
                  Number(selectedRole?.ID),
                  nextPage,
                  debouncedSearchTerm,
                  appliedDepartment,
                  appliedSubDepartment,
                  appliedStartDate,
                  appliedEndDate
                );
                const nextRaw = nextResp.data as any;
                const nextData = (nextRaw && (nextRaw.data ?? nextRaw)) as any;
                const nextDocs = Array.isArray(nextData?.documents) ? nextData.documents : [];
                const nextFiltered = nextDocs.filter((doc: any) => {
                  const docDeptId = Number(doc.newdoc?.DepartmentId || 0);
                  const docSubDeptId = Number(doc.newdoc?.SubDepartmentId || 0);
                  return docDeptId === appliedDeptId && docSubDeptId === appliedSubDeptId;
                });
                filteredPageDocs = filteredPageDocs.concat(nextFiltered);
              } catch (e) {
                break;
              }
              nextPage += 1;
            }
            if (filteredPageDocs.length > ITEMS_PER_PAGE) {
              filteredPageDocs = filteredPageDocs.slice(0, ITEMS_PER_PAGE);
            }
          }

          setDocuments(filteredPageDocs);
          setPaginationData(effectivePagination);
          // Filtering effect will keep the same set
        }
        
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error('❌ Failed to fetch documents:', err);
        setError("Error loading documents. Please try again.");
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    }, [selectedRole, currentPage, debouncedSearchTerm, appliedDepartment, appliedSubDepartment, appliedStartDate, appliedEndDate]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Client-side filtering: department/type + optional date range
  useEffect(() => {
    // Require applied department/type to show anything
    if (!appliedDepartment || !appliedSubDepartment) {
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
  }, [documents, appliedDepartment, appliedSubDepartment, appliedStartDate, appliedEndDate]);

  // Memoize the document cards to prevent unnecessary re-renders
  const documentCards = useMemo(() => 
    filteredDocs.map((document) => {
      const doc = document.newdoc;
      return (
        <DocumentCard
          key={doc.ID}
          document={doc}
          onClick={() => navigate(`/documents/${doc.ID}`)}
          permissions={myDocumentPermissions}
        />
      );
    }), [filteredDocs, myDocumentPermissions, navigate]
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
      <header className="text-left mb-6">
        <h1 className="text-3xl font-bold text-blue-800">Document Library</h1>
        <p className="mt-1 text-base text-gray-600">
          View and manage your documents
        </p>
      </header>

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-2 w-full"
              disabled={filterLoading}
            />
            {filterLoading ? (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            )}
          </div>

          {/* <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          >
            <FiFilter />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button> */}
        </div>

        {/* Filter Panel */}
        {/* {showFilters && ( */}
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            {filterLoading && (
              <div className="mb-4 flex items-center justify-center text-blue-600 bg-blue-50 p-3 rounded-md">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                <span className="text-sm font-medium">Applying filters...</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Department"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setSubDepartment(''); // Reset document type when department changes
                  // Clear applied filters when department changes - user must click Apply Filters again
                  setAppliedDepartment('');
                  setAppliedSubDepartment('');
                  setError(""); // Clear any errors
                }}
                options={departmentOptions}
                disabled={filterLoading || loadingDepartments}
              />

              <Select
                label="Document Type"
                value={subDepartment}
                onChange={(e) => {
                  setSubDepartment(e.target.value);
                  // Clear applied filters when document type changes - user must click Apply Filters again
                  setAppliedDepartment('');
                  setAppliedSubDepartment('');
                  setError(""); // Clear any errors
                }}
                options={documentTypeOptions}
                placeholder={!department ? "Select Department first" : documentTypeOptions.length === 0 ? "No document types available" : "Select Document Type"}
                disabled={!department || filterLoading || loadingDepartments || documentTypeOptions.length === 0}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    // Clear applied date filters when changed - user must click Apply Filters again
                    setAppliedStartDate('');
                    setAppliedEndDate('');
                  }}
                  className="w-full"
                  disabled={filterLoading}
                  max={endDate || undefined} // Prevent start date from being after end date
                />
                <p className="text-xs text-gray-500 mt-1">Filter by document creation date</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    // Clear applied date filters when changed - user must click Apply Filters again
                    setAppliedStartDate('');
                    setAppliedEndDate('');
                  }}
                  className="w-full"
                  disabled={filterLoading}
                  min={startDate || undefined} // Prevent end date from being before start date
                />
                <p className="text-xs text-gray-500 mt-1">Filter by document creation date</p>
                {!isDateRangeValid() && (
                  <p className="text-xs text-red-500 mt-1">End date must be after start date</p>
                )}
              </div>
            </div>

            {/* Apply Filters Button */}
            <div className="mt-4">
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <button
                  onClick={applyFilters}
                  disabled={filterLoading || !isDateRangeValid() || loadingDepartments || !department || !subDepartment}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiFilter className="mr-2" size={16} />
                  Apply Filters
                </button>

                {(appliedDepartment || appliedSubDepartment || searchTerm || appliedStartDate || appliedEndDate) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <FiX size={14} />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </div>
        {/* )} */}
      </div>

      {/* Results Count */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing {filteredDocs.length} of {appliedStartDate || appliedEndDate ? documents.length : paginationData?.totalItems || 0} documents
          </p>
          {(appliedDepartment || appliedSubDepartment || debouncedSearchTerm || appliedStartDate || appliedEndDate) && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Filters active</span>
              {(appliedStartDate || appliedEndDate) && (
                <span className="text-xs text-gray-500">
                  (Date: {appliedStartDate || 'any'} to {appliedEndDate || 'any'})
                </span>
              )}
            </div>
          )}
        </div>
        {filterLoading && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
          {documentCards}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center bg-gray-50 text-red-700 rounded-md p-8 shadow-md animate-pulse">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mb-3 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-.01-10a9 9 0 100 18 9 9 0 000-18z"
            />
          </svg>
          <p className="text-lg font-semibold">Oops! Something Went Wrong</p>
          <p className="text-sm text-red-600 mt-2">
            Please try refreshing the page or check your network connection.
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center bg-gray-50 text-blue-700 rounded-md p-8 shadow-md">
          <svg
            className="animate-spin h-10 w-10 text-blue-500 mb-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <p className="text-lg text-blue-600 font-medium">Please Wait...</p>
          <p className="text-sm text-blue-600 mt-2">Almost there! Thanks for your patience...</p>
        </div>
      ) :
      (
        <div className="bg-gray-50 rounded-md p-8 text-center">
          <p className="text-gray-500">
            No documents found matching your criteria
          </p>
        </div>
      )}
      {/* Show pagination controls - hide when date filtering is active */}
      {!appliedStartDate && !appliedEndDate && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={paginationData?.totalItems}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
          // onItemsPerPageChange={setItemsPerPage}
        />
      )}
      
    </div>
  );
};

export default MyDocuments;
