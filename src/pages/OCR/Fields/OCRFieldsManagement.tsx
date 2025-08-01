import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Button, Dialog, Portal } from '@chakra-ui/react';
import OCRFieldForm from './OCRFieldForm';
import { OCRField } from './ocrFieldService.ts';
import { Edit, Trash2 } from 'lucide-react';
import { useOCRFields } from './useOCRFields.ts';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions.ts';
const OCRFieldsManagement = () => {
  const { fields, loading, error, addField, editField, removeField } =
    useOCRFields();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState<OCRField | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<number | null>(null);
  const ocrFieldsPermissions = useModulePermissions(11); // 1 = MODULE_ID
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
            Manage OCR Fields
          </h1>
          <p className="mt-2 text-gray-600 sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis">
            Manage the fields available for OCR processing
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50  ">
            <tr className="overflow-hidden">
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                Field
              </th>
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                Updated At
              </th>
              <th className="px-6 py-3 text-right text-base font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fields?.length > 0
              ? fields?.map((field) => (
                  <tr key={field.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {field.ID}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.Field}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(field.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(field.updatedAt).toLocaleString()}
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
        {fields?.length === 0 && (
          <h1 className="text-center font-bold text-2xl my-8">
            No fields found. Add a new field.
          </h1>
        )}
      </div>

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
