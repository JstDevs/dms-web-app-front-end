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
import { Municipality } from "@/types/User";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Button } from "@chakra-ui/react";

export const MunicipalitiesPage: React.FC = () => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([
    { id: "1", name: "Manila", code: "MNL", regionId: "1" },
    { id: "2", name: "Quezon City", code: "QC", regionId: "1" },
    { id: "3", name: "Makati", code: "MKT", regionId: "1" },
    { id: "4", name: "Pasig", code: "PSG", regionId: "1" },
    { id: "5", name: "Taguig", code: "TGG", regionId: "1" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMunicipality, setCurrentMunicipality] =
    useState<Municipality | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    regionId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const filteredMunicipalities = municipalities.filter(
    (municipality) =>
      municipality.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (municipality.code ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedDepartments = filteredMunicipalities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newMunicipality: Municipality = {
      id: (municipalities.length + 1).toString(),
      name: formData.name,
      code: formData.code,
      regionId: formData.regionId,
    };

    setMunicipalities([...municipalities, newMunicipality]);
    setFormData({ name: "", code: "", regionId: "" });
    setIsCreating(false);
  };

  const handleEditClick = (municipality: Municipality) => {
    setCurrentMunicipality(municipality);
    setFormData({
      name: municipality.name,
      code: municipality.code || "",
      regionId: municipality.regionId,
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentMunicipality) {
      const updatedMulcipalities = municipalities.map((municipality) =>
        municipality.id === currentMunicipality.id
          ? {
              ...municipality,
              name: formData.name,
              code: formData.code,
              regionId: formData.regionId,
            }
          : municipality
      );

      setMunicipalities(updatedMulcipalities);
      setFormData({ name: "", code: "", regionId: "" });
      setIsEditing(false);
      setCurrentMunicipality(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setMunicipalities(
      municipalities.filter((municipality) => municipality.id !== id)
    );
  };

  return (
    <div className="py-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:flex-nowrap sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Municipalities</h1>
          <p className="mt-2 text-gray-600">
            Manage municipalities in the system
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Button
            onClick={() => setIsCreating(true)}
            // icon={<Plus className="h-4 w-4" />}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Add Municipality
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle>Municipalities</CardTitle>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search municipalities..."
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
              <h3 className="text-lg font-medium mb-4">Add Municipality</h3>
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
                <Input
                  label="Region ID"
                  value={formData.regionId}
                  onChange={(e) =>
                    setFormData({ ...formData, regionId: e.target.value })
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
          {/* // Edit Municipalities  */}
          {isEditing && currentMunicipality ? (
            <div className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">Edit Municipality</h3>
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
                <Input
                  label="Region ID"
                  value={formData.regionId}
                  onChange={(e) =>
                    setFormData({ ...formData, regionId: e.target.value })
                  }
                  required
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentMunicipality(null);
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Region ID
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
                  paginatedDepartments.map((municipality) => (
                    <tr key={municipality.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {municipality.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {municipality.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {municipality.regionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900 mr-2"
                          // icon={<Edit className="h-4 w-4" />}
                          onClick={() => handleEditClick(municipality)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>

                        <DeleteDialog
                          key={municipality.id}
                          onConfirm={() => handleDeleteClick(municipality.id)}
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
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No municipalities found
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
        totalItems={municipalities.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
