import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Button, Dialog, Portal } from '@chakra-ui/react';
import ModuleForm from './ModuleForm';
import { useModules } from './useModules';
import { Module } from './moduleService';
import { Edit, Search, Trash2 } from 'lucide-react';

const ModulesManagement = () => {
  const { modules, loading, error, addModule, editModule, removeModule } =
    useModules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);

  const handleAddModule = () => {
    setCurrentModule(null);
    setIsDialogOpen(true);
  };

  const handleEditModule = (module: Module) => {
    setCurrentModule(module);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setModuleToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (moduleToDelete !== null) {
      await removeModule(moduleToDelete);
      setIsDeleteConfirmOpen(false);
      setModuleToDelete(null);
    }
  };

  const handleSubmit = async (moduleData: { Description: string }) => {
    const success = currentModule
      ? await editModule(currentModule.ID, moduleData)
      : await addModule(moduleData);

    if (success) {
      setIsDialogOpen(false);
    }
  };

  if (loading)
    return <div className="text-center py-8">Loading modules...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
      <div className="flex justify-between mb-6 max-sm:flex-col flex-wrap gap-4">
        <div className="text-left flex-1 ">
          <h1 className="text-3xl font-bold text-blue-800">Manage Modules</h1>
          <p className="mt-2 text-gray-600 sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis">
            Manage the modules available in the system
          </p>
        </div>
        <Button
          colorScheme="blue"
          onClick={handleAddModule}
          className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          <FiPlus />
          Add Module
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-base font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {modules.length > 0 ? (
              modules.map((module) => (
                <tr key={module.ID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {module.ID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {module.Description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex justify-end">
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleEditModule(module)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(module.ID)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <Search className="h-8 w-8 text-gray-300 mb-2" />
                    <p>No Module found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                  {currentModule ? 'Edit Module' : 'Add New Module'}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <ModuleForm
                  module={currentModule}
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
                  Are you sure you want to delete this module? <br /> This
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

export default ModulesManagement;
