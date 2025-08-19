import React, { useState, useEffect } from 'react';
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
  // TODO CHANGE THIS TS TYPE
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState(documents);
  const [showFilters, setShowFilters] = useState(false);
  const { selectedRole } = useAuth(); // assuming user object has user.id
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationData, setPaginationData] = useState<any>(null);
  // console.log("selectedRole", selectedRole);
  const myDocumentPermissions = useModulePermissions(4); // 1 = MODULE_ID
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const { data } = await fetchDocuments(
          Number(selectedRole?.ID),
          currentPage
        );

        setDocuments(data.documents);
        setFilteredDocs(data.documents);
        setPaginationData(data.pagination);
      } catch (err) {
        console.error('Failed to fetch documents', err);
      }
    };

    loadDocuments();
  }, [selectedRole, currentPage]);
  // Department/subDept options
  // const departments = Array.from(new Set(documents.map((d) => d.DepartmentId)));
  // const subDepartments = Array.from(
  //   new Set(
  //     documents
  //       .filter((d) => (department ? d.DepartmentId === +department : true))
  //       .map((d) => d.SubDepartmentId)
  //   )
  // );

  // Apply filters whenever any filter changes
  // Filtering logic
  useEffect(() => {
    const filtered = documents.filter((docWrapper) => {
      const doc = docWrapper.newdoc;
      const matchesSearch =
        doc.FileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.FileDescription?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = department ? doc.DepartmentId === +department : true;
      const matchesSubDept = subDepartment
        ? doc.SubDepartmentId === +subDepartment
        : true;
      return matchesSearch && matchesDept && matchesSubDept;
    });
    setFilteredDocs(filtered);
  }, [searchTerm, department, subDepartment, documents]);

  const clearFilters = () => {
    setSearchTerm('');
    setDepartment('');
    setSubDepartment('');
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
            />
            <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          >
            <FiFilter />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select
                label="Department"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setSubDepartment(''); // Reset sub-department when department changes
                }}
                placeholder="All Departments"
                options={departmentOptions}
              />

              <Select
                label="Sub-Department"
                value={subDepartment}
                onChange={(e) => setSubDepartment(e.target.value)}
                options={subDepartmentOptions}
                placeholder="All Sub-Departments"
                disabled={!department} // Only enable when department is selected
              />
            </div>

            {(department || subDepartment || searchTerm) && (
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
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredDocs.length} of {documents.length} documents
        </p>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map((document) => {
            const doc = document.newdoc;
            // console.log(doc);
            return (
              <DocumentCard
                key={doc.ID}
                document={doc}
                onClick={() => navigate(`/documents/${doc.ID}`)}
                permissions={myDocumentPermissions}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-md p-8 text-center">
          <p className="text-gray-500">
            No documents found matching your criteria
          </p>
        </div>
      )}
      {!searchTerm && (
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
