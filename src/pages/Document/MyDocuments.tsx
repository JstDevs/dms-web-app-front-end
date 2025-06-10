import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "@/contexts/DocumentContext";
import DocumentCard from "@/components/documents/DocumentCard";
// import { Input, Select } from "@/components/ui"; // Assuming you have these UI components
import { FiSearch, FiFilter, FiX } from "react-icons/fi";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

const MyDocuments: React.FC = () => {
  const { documents } = useDocument();
  const navigate = useNavigate();

  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] = useState("");
  const [subDepartment, setSubDepartment] = useState("");
  const [filteredDocs, setFilteredDocs] = useState(documents);
  const [showFilters, setShowFilters] = useState(false);

  // Get unique departments and sub-departments for filter options
  const departments = Array.from(
    new Set(documents.map((doc) => doc.department))
  );
  const subDepartments = Array.from(
    new Set(
      documents
        .filter((doc) => (department ? doc.department === department : true))
        .map((doc) => doc.subDepartment)
    )
  );

  // Apply filters whenever any filter changes
  useEffect(() => {
    const results = documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = department ? doc.department === department : true;
      const matchesSubDept = subDepartment
        ? doc.subDepartment === subDepartment
        : true;

      return matchesSearch && matchesDept && matchesSubDept;
    });
    setFilteredDocs(results);
  }, [searchTerm, department, subDepartment, documents]);

  const clearFilters = () => {
    setSearchTerm("");
    setDepartment("");
    setSubDepartment("");
  };

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
            {/* {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX />
              </button>
            )} */}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          >
            <FiFilter />
            {showFilters ? "Hide Filters" : "Show Filters"}
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
                  setSubDepartment(""); // Reset sub-department when department changes
                }}
                options={[
                  { value: "", label: "All Departments" },
                  ...departments.map((dept) => ({ value: dept, label: dept })),
                ]}
              />

              <Select
                label="Sub-Department"
                value={subDepartment}
                onChange={(e) => setSubDepartment(e.target.value)}
                options={[
                  { value: "", label: "All Sub-Departments" },
                  ...subDepartments.map((subDept) => ({
                    value: subDept,
                    label: subDept,
                  })),
                ]}
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
        {filteredDocs.length === 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onClick={() => navigate(`/documents/${document.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-md p-8 text-center">
          <p className="text-gray-500">
            No documents found matching your criteria
          </p>
          <button
            onClick={clearFilters}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default MyDocuments;
