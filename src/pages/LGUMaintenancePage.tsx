import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
// import { Button } from "../components/ui/Button";
import { Building } from "lucide-react";
import {
  Button,
  Image as ChakraImage,
  Input as ChakraInput,
} from "@chakra-ui/react";
import { LGU } from "@/types/User";

export const LGUMaintenancePage: React.FC = () => {
  const [lgu, setLgu] = useState<LGU>({
    id: "1",
    code: "LGU001",
    name: "Sample LGU",
    tin: "123-456-789",
    rdo: "RDO123",
    staddress: "123 Main Street",
    barangayId: "1",
    municipalityId: "1",
    regionId: "1",
    zipcode: "1234",
    number: "123-4567",
    email: "info@samplelgu.gov.ph",
    website: "www.samplelgu.gov.ph",
  });

  const [image, setImage] = useState<string>("https://picsum.photos/200/300");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(lgu);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLgu(formData);
    setIsEditing(false);
  };

  return (
    <div className="py-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800">LGU Maintenance</h1>
        <p className="mt-2 text-gray-600">
          Manage Local Government Unit information
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2 text-blue-600" />
            LGU Information
          </CardTitle>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto"
            >
              Edit Information
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <ChakraImage
              src={image}
              boxSize="150px"
              objectFit="cover"
              borderRadius="full"
              alt="LGU Logo"
            />
            {isEditing && (
              <ChakraInput
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                mt={2}
                w="auto"
              />
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* All Inputs stay the same */}
                <Input
                  label="LGU Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  required
                />
                <Input
                  label="LGU Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <Input
                  label="TIN"
                  value={formData.tin}
                  onChange={(e) =>
                    setFormData({ ...formData, tin: e.target.value })
                  }
                  required
                />
                <Input
                  label="RDO"
                  value={formData.rdo}
                  onChange={(e) =>
                    setFormData({ ...formData, rdo: e.target.value })
                  }
                  required
                />
                <Input
                  label="Street Address"
                  value={formData.staddress}
                  onChange={(e) =>
                    setFormData({ ...formData, staddress: e.target.value })
                  }
                  required
                />
                <Input
                  label="Zip Code"
                  value={formData.zipcode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipcode: e.target.value })
                  }
                  required
                />
                <Input
                  label="Contact Number"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
                <Input
                  label="Website"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData(lgu);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">LGU Code</h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.code}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">LGU Name</h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">TIN</h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.tin}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">RDO</h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.rdo}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Street Address
                </h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.staddress}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Zip Code</h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.zipcode}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Contact Number
                </h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.number}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Website</h3>
                <p className="mt-1 text-sm text-gray-900">{lgu.website}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
