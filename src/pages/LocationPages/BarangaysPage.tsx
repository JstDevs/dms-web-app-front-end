import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
// import { Button } from "../../components/ui/Button";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { DeleteDialog } from "../../components/ui/DeleteDialog";
import { Barangay } from "@/types/User";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Button } from "@chakra-ui/react";
// import { current } from "@reduxjs/toolkit";

export const BarangaysPage: React.FC = () => {
  const [barangays, setBarangays] = useState<Barangay[]>([
    { id: "1", name: "Poblacion", municipalityId: "1" },
    { id: "2", name: "San Antonio", municipalityId: "1" },
    { id: "3", name: "San Jose", municipalityId: "2" },
    { id: "4", name: "Santa Rosa", municipalityId: "2" },
    { id: "5", name: "San Isidro", municipalityId: "3" },
    { id: "6", name: "Some Things", municipalityId: "5" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBarangay, setCurrentBarangay] = useState<Barangay | null>(null);
  const [formData, setFormData] = useState({ name: "", municipalityId: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const filteredBarangays = barangays.filter((barangay) =>
    barangay.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedDepartments = filteredBarangays.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newBarangay: Barangay = {
      id: (barangays.length + 1).toString(),
      name: formData.name,
      municipalityId: formData.municipalityId,
    };

    setBarangays([...barangays, newBarangay]);
    setFormData({ name: "", municipalityId: "" });
    setIsCreating(false);
  };
  const handleEditClick = (barangay: Barangay) => {
    setCurrentBarangay(barangay);
    setFormData({
      name: barangay.name,
      municipalityId: barangay.municipalityId,
    });
    setIsEditing(true);
    setIsCreating(false);
  };
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentBarangay) {
      const updatedBarangays = barangays.map((barangay) =>
        barangay.id === currentBarangay.id
          ? {
              ...barangay,
              name: formData.name,
              municipalityId: formData.municipalityId,
            }
          : barangay
      );

      setBarangays(updatedBarangays);
      setFormData({ name: "", municipalityId: "" });
      setIsEditing(false);
      setCurrentBarangay(null);
    }
  };
  const handleDeleteClick = (id: string) => {
    setBarangays(barangays.filter((barangay) => barangay.id !== id));
  };
  return (
    <div className="py-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:flex-nowrap sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Barangays</h1>
          <p className="mt-2 text-gray-600">Manage barangays in the system</p>
        </div>
        <div className="w-full sm:w-auto">
          <Button
            onClick={() => setIsCreating(true)}
            // icon={<Plus className="h-4 w-4" />}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Add Barangay
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle>Barangays</CardTitle>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search barangays..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              icon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isCreating && (
            <div className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Add Barangay</h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <Input
                  label="Municipality ID"
                  value={formData.municipalityId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      municipalityId: e.target.value,
                    })
                  }
                  required
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </div>
          )}
          {isEditing && currentBarangay ? (
            <div className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Edit Barangay</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <Input
                  label="Municipality ID"
                  value={formData.municipalityId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      municipalityId: e.target.value,
                    })
                  }
                  required
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentBarangay(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Update</Button>
                </div>
              </form>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Municipality ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDepartments.length > 0 ? (
                  paginatedDepartments.map((barangay) => (
                    <tr key={barangay.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {barangay.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {barangay.municipalityId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900 mr-2"
                          // icon={<Edit className="h-4 w-4" />}
                          onClick={() => handleEditClick(barangay)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <DeleteDialog
                          key={barangay.id}
                          onConfirm={() => handleDeleteClick(barangay.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-900"
                            // icon={<Trash2 className="h-4 w-4" />}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </DeleteDialog>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No barangays found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <PaginationControls
        currentPage={currentPage}
        totalItems={barangays.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
