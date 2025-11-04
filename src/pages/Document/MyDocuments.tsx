import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useDocument } from "@/contexts/DocumentContext";
import DocumentCard from '@/components/documents/DocumentCard';
// import { Input, Select } from "@/components/ui"; // Assuming you have these UI components
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDocuments } from './utils/uploadAPIs';
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { PaginationControls } from '@/components/ui/PaginationControls';


const MyDocuments: React.FC = () => {
  // const { documents } = useDocument();
  const navigate = useNavigate();
  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [department, setDepartment] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // TODO CHANGE THIS TS TYPE
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const { selectedRole } = useAuth(); // assuming user object has user.id
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationData, setPaginationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [debouncedDepartment, setDebouncedDepartment] = useState('');
  const [debouncedSubDepartment, setDebouncedSubDepartment] = useState('');
  const [debouncedStartDate, setDebouncedStartDate] = useState('');
  const [debouncedEndDate, setDebouncedEndDate] = useState('');
  // console.log("selectedRole", selectedRole);
  const myDocumentPermissions = useModulePermissions(4); // 1 = MODULE_ID
  
  // Debounce search term to prevent too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce department changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDepartment(department);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [department]);

  // Debounce subdepartment changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSubDepartment(subDepartment);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [subDepartment]);

  // Debounce start date
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStartDate(startDate);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [startDate]);

  // Debounce end date
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEndDate(endDate);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [endDate]);

  // Date range validation
  const isDateRangeValid = () => {
    if (!debouncedStartDate && !debouncedEndDate) return true;
    if (!debouncedStartDate || !debouncedEndDate) return true; // Allow partial dates
    return new Date(debouncedStartDate) <= new Date(debouncedEndDate);
  };

  // Reset to page 1 only when filters are active (non-empty)
  useEffect(() => {
    const anyFilterActive = Boolean(
      debouncedSearchTerm ||
      debouncedDepartment ||
      debouncedSubDepartment ||
      debouncedStartDate ||
      debouncedEndDate
    );
    if (anyFilterActive) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, debouncedDepartment, debouncedSubDepartment, debouncedStartDate, debouncedEndDate]);

  const loadDocuments = useCallback(async () => {
      // Use filterLoading for non-initial loads
      const isInitialLoad = !documents.length && !filteredDocs.length;
      if (!isInitialLoad) {
        setFilterLoading(true);
      } else {
        setLoading(true);
      }
      
      try {

        // Check if we need to fetch all pages for client-side date filtering
        const needsAllPages = debouncedStartDate || debouncedEndDate;
        
        if (needsAllPages) {
          // For date filtering, we need to fetch all pages to filter client-side
          const firstPage = await fetchDocuments(
            Number(selectedRole?.ID),
            1,
            debouncedSearchTerm,
            debouncedDepartment,
            debouncedSubDepartment,
            '', // Don't send date filters to backend
            ''
          );
          
          const totalPages = firstPage.data.pagination.totalPages;
          const allPages = [firstPage];
          
          if (totalPages > 1) {
            const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
            const pageResults = await Promise.all(
              remainingPages.map((p) =>
                fetchDocuments(
                  Number(selectedRole?.ID),
                  p,
                  debouncedSearchTerm,
                  debouncedDepartment,
                  debouncedSubDepartment,
                  '', // Don't send date filters to backend
                  ''
                )
              )
            );
            allPages.push(...pageResults);
          }
          
          const combinedDocuments = allPages.flatMap((page) => page.data.documents as any[]);
          const effectivePagination = {
            ...firstPage.data.pagination,
            totalItems: combinedDocuments.length,
            totalPages: 1,
          };
          
          setDocuments(combinedDocuments);
          setFilteredDocs(combinedDocuments);
          setPaginationData(effectivePagination);
        } else {
          // Normal pagination for other filters
          const response = await fetchDocuments(
            Number(selectedRole?.ID),
            currentPage,
            debouncedSearchTerm,
            debouncedDepartment,
            debouncedSubDepartment,
            debouncedStartDate,
            debouncedEndDate
          );
          const responseData = response.data;

          const combinedDocuments = responseData.documents as any[];
          const effectivePagination = responseData.pagination;
          
          setDocuments(combinedDocuments);
          setFilteredDocs(combinedDocuments);
          setPaginationData(effectivePagination);
        }
        
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error('❌ Failed to fetch documents:', err);
        setError("Error loading documents. Please try again.");
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    }, [selectedRole, currentPage, debouncedSearchTerm, debouncedDepartment, debouncedSubDepartment, debouncedStartDate, debouncedEndDate]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Client-side date filtering as fallback if backend doesn't handle it properly
  useEffect(() => {
    if (debouncedStartDate || debouncedEndDate) {
      const startBoundary = debouncedStartDate
        ? new Date(`${debouncedStartDate}T00:00:00`)
        : null;
      const endBoundary = debouncedEndDate
        ? new Date(`${debouncedEndDate}T23:59:59.999`)
        : null;

      const filteredByDate = documents.filter((doc: any) => {
        const docDateStr = doc.newdoc?.CreatedDate || doc.newdoc?.FileDate;
        if (!docDateStr) return false;
        const docDate = new Date(docDateStr);
        if (Number.isNaN(docDate.getTime())) return false;

        if (startBoundary && docDate < startBoundary) return false;
        if (endBoundary && docDate > endBoundary) return false;
        return true;
      });

      console.log('🔍 Date filtering applied:', {
        originalCount: documents.length,
        filteredCount: filteredByDate.length,
        dateRange: { start: debouncedStartDate, end: debouncedEndDate }
      });

      setFilteredDocs(filteredByDate);
    } else {
      // No date filter, show all documents
      setFilteredDocs(documents);
    }
  }, [documents, debouncedStartDate, debouncedEndDate]);

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

  const clearFilters = () => {
    setSearchTerm('');
    setDepartment('');
    setSubDepartment('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
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
                }}
                placeholder="Select Department"
                options={departmentOptions}
                disabled={filterLoading}
              />

              <Select
                label="Document Type"
                value={subDepartment}
                onChange={(e) => setSubDepartment(e.target.value)}
                options={subDepartmentOptions}
                placeholder="Select Document Type"
                disabled={!department || filterLoading} // Only enable when department is selected
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                  onChange={(e) => setEndDate(e.target.value)}
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

            {(department || subDepartment || searchTerm || startDate || endDate) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <FiX size={14} />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        {/* )} */}
      </div>

      {/* Results Count */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing {filteredDocs.length} of {debouncedStartDate || debouncedEndDate ? documents.length : paginationData?.totalItems || 0} documents
          </p>
          {(department || subDepartment || debouncedSearchTerm || startDate || endDate) && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Filters active</span>
              {(startDate || endDate) && (
                <span className="text-xs text-gray-500">
                  (Date: {startDate || 'any'} to {endDate || 'any'})
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
      {!debouncedStartDate && !debouncedEndDate && (
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
