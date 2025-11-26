import { useState, useMemo } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Button, Dialog, Portal } from '@chakra-ui/react';
import OCRFieldForm from './OCRFieldForm';
import { OCRField } from './ocrFieldService.ts';
import { Edit, Trash2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOCRFields } from './useOCRFields.ts';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions.ts';
import { MODULE_IDS } from '@/constants/moduleIds';
const OCRFieldsManagement = () => {
  const { fields, loading, error, addField, editField, removeField } =
    useOCRFields();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState<OCRField | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const ocrFieldsPermissions = useModulePermissions(MODULE_IDS.fields);
  const handleAddField = () => {
    setCurrentField(null);
    setIsDialogOpen(true);
  };

  const handleEditField = (field: OCRField) => {
    setCurrentField(field);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setFieldToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (fieldToDelete !== null) {
      await removeField(fieldToDelete);
      setIsDeleteConfirmOpen(false);
      setFieldToDelete(null);
    }
  };

  const handleSubmit = async (fieldData: { Field: string }) => {
    const success = currentField
      ? await editField(currentField.ID, fieldData)
      : await addField(fieldData);

    if (success) {
      setIsDialogOpen(false);
    }
  };

  // Filter fields based on search term
  const filteredFields = useMemo(() => {
    if (!searchTerm.trim()) {
      return fields;
    }
    
    return fields.filter(field =>
      field.Field.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.ID.toString().includes(searchTerm)
    );
  }, [fields, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredFields.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFields = filteredFields.slice(startIndex, endIndex);

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1); // Reset to first page when clearing search
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset to first page when search term changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading)
    return <div className="text-center py-8">Loading OCR fields...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;
  console.log(fields);
  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
      <div className="flex justify-between mb-6 max-sm:flex-col flex-wrap gap-4">
        <div className="text-left flex-1 ">
          <h1 className="text-3xl font-bold text-blue-800">
            Document Fields
          </h1>
          <p className="mt-2 text-gray-600 sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis">
            Manage the fields available for the documents
          </p>
        </div>
        {ocrFieldsPermissions?.Add && (
          <Button
            colorScheme="blue"
            onClick={handleAddField}
            className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            <FiPlus />
            Add Field
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search fields by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {searchTerm ? (
            <p>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredFields.length)} of {filteredFields.length} filtered fields
              {filteredFields.length !== fields.length && ` (${fields.length} total)`}
            </p>
          ) : (
            <p>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredFields.length)} of {filteredFields.length} fields
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50  ">
            <tr className="overflow-hidden">
              {/* 
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                ID
              </th> 
              */}
              <th className="px-12 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                Field
              </th>
              {/* 
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                Created Date
              </th> 
              */}
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                Modified Date
              </th>
              <th className="px-6 py-3 text-right text-base font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedFields?.length > 0
              ? paginatedFields?.map((field) => (
                  <tr key={field.ID} className="hover:bg-gray-50">
                    {/* 
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {field.ID}
                    </td> 
                    */}
                    <td className="px-12 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.Field}
                    </td>
                    {/* 
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(field.createdAt).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td> 
                    */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(field.updatedAt).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex justify-end">
                      <div className="flex space-x-3">
                        {ocrFieldsPermissions?.Edit && (
                          <Button
                            onClick={() => handleEditField(field)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        {ocrFieldsPermissions?.Delete && (
                          <Button
                            onClick={() => handleDeleteClick(field.ID)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        {paginatedFields?.length === 0 && (
          <div className="text-center py-8">
            {fields?.length === 0 ? (
              <h1 className="text-lg font-bold text-gray-500">
                No fields found. Add a new field.
              </h1>
            ) : (
              <div>
                <h1 className="text-lg font-bold text-gray-500 mb-2">
                  No fields match your search
                </h1>
                <p className="text-sm text-gray-400">
                  Try adjusting your search terms or{' '}
                  <button
                    onClick={clearSearch}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    clear the search
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{startIndex + 1}</span>
                {' '}to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredFields.length)}</span>
                {' '}of{' '}
                <span className="font-medium">{filteredFields.length}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current page
                  const shouldShow = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  if (!shouldShow) {
                    // Show ellipsis for gaps
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span
                          key={page}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog.Root
        open={isDialogOpen}
        onOpenChange={(e) => setIsDialogOpen(e.open)}
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content className="bg-white mx-4 max-w-md w-full">
              <Dialog.Header>
                <Dialog.Title className="text-xl font-semibold">
                  {currentField ? 'Edit OCR Field' : 'Add New OCR Field'}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <OCRFieldForm
                  field={currentField}
                  onSubmit={handleSubmit}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        open={isDeleteConfirmOpen}
        onOpenChange={(e) => setIsDeleteConfirmOpen(e.open)}
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content className="bg-white mx-4 max-w-md w-full">
              <Dialog.Header>
                <Dialog.Title className="text-xl font-semibold">
                  Confirm Delete
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body className="space-y-4 p-4">
                <p className="mb-4">
                  Are you sure you want to delete this OCR field? <br /> This
                  action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="px-4 bg-gray-100 hover:bg-gray-200 "
                  >
                    Cancel
                  </Button>
                  <Button
                    colorScheme="red"
                    onClick={handleDeleteConfirm}
                    className="px-4 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                </div>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};

export default OCRFieldsManagement;
