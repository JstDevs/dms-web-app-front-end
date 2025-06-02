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
import { Region } from "@/types/User";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Button } from "@chakra-ui/react";

export const RegionsPage: React.FC = () => {
  const [regions, setRegions] = useState<Region[]>([
    { id: "1", name: "NCR", code: "NCR" },
    { id: "2", name: "CAR", code: "CAR" },
    { id: "3", name: "Region I", code: "R1" },
    { id: "4", name: "Region II", code: "R2" },
    { id: "5", name: "Region III", code: "R3" },
    { id: "6", name: "Ahamd", code: "R3" },
    { id: "7", name: "Region III", code: "R3" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const filteredRegions = regions.filter(
    (region) =>
      region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (region.code ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedDepartments = filteredRegions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRegion: Region = {
      id: (regions.length + 1).toString(),
      name: formData.name,
      code: formData.code,
    };

    setRegions([...regions, newRegion]);
    setFormData({ name: "", code: "" });
    setIsCreating(false);
  };

  const handleEditClick = (region: Region) => {
    setCurrentRegion(region);
    setFormData({ name: region.name, code: region.code || "" });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentRegion) {
      const updatedRegions = regions.map((region) =>
        region.id === currentRegion.id
          ? { ...region, name: formData.name, code: formData.code }
          : region
      );

      setRegions(updatedRegions);
      setFormData({ name: "", code: "" });
      setIsEditing(false);
      setCurrentRegion(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setRegions(regions.filter((region) => region.id !== id));
  };

  return (
    <div className="py-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:flex-nowrap sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Regions</h1>
          <p className="mt-2 text-gray-600">Manage regions in the system</p>
        </div>
        <div className="w-full sm:w-auto">
          <Button
            onClick={() => {
              setIsCreating(true);
              setIsEditing(false);
              setFormData({ name: "", code: "" });
            }}
            // icon={<Plus className="h-4 w-4" />}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Add Region
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle>Regions</CardTitle>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search regions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              icon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isCreating ? (
            <div className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Add Region</h3>
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
                  label="Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
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
          ) : null}

          {isEditing && currentRegion ? (
            <div className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Edit Region</h3>
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
                  label="Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  required
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentRegion(null);
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
                    Code
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
                  paginatedDepartments.map((region) => (
                    <tr key={region.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {region.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900 mr-2"
                          // icon={<Edit className="h-4 w-4" />}
                          onClick={() => handleEditClick(region)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <DeleteDialog
                          key={region.id}
                          onConfirm={() => handleDeleteClick(region.id)}
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
                      No regions found
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
        totalItems={regions.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
