import { Button } from "@chakra-ui/react";
import { useState } from "react";

export const FieldSettingsPanel = ({
  setShowFieldsPanel,
}: {
  setShowFieldsPanel: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [selectedField, setSelectedField] = useState<number | null>(null);

  // ✅ Controlled fields state
  const [fields, setFields] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      description: `File Description ${i + 1}`,
      dataType: "text",
      active: false, // checkbox state
    }))
  );

  // ✅ Handle checkbox toggle
  const toggleFieldActive = (index: number) => {
    setFields((prev) =>
      prev.map((field, i) =>
        i === index ? { ...field, active: !field.active } : field
      )
    );
  };

  // ✅ Handle description change
  const handleDescriptionChange = (index: number, value: string) => {
    setFields((prev) =>
      prev.map((field, i) =>
        i === index ? { ...field, description: value } : field
      )
    );
  };

  // ✅ Handle type change (text/date)
  const handleTypeChange = (index: number, type: string) => {
    setFields((prev) =>
      prev.map((field, i) =>
        i === index ? { ...field, dataType: type } : field
      )
    );
  };

  const handleSave = () => {
    const activeFields = fields.filter((f) => f.active);
    console.log("Saving fields:", activeFields); // You can send this to backend or Redux
    setShowFieldsPanel(false);
  };

  return (
    <div className="bg-white border rounded-xl p-2 md:p-6 space-y-4 mt-6 shadow-md">
      {/* Header and Default Fields Omitted for Brevity */}

      {/* Dynamic Fields */}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            onClick={() => setSelectedField(index)}
            className={`grid grid-cols-1 sm:grid-cols-5 items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${
              selectedField === index
                ? "bg-blue-100 border border-blue-600"
                : "bg-gray-50"
            }`}
          >
            <div className="text-sm font-medium text-gray-700 sm:col-span-1">
              Field {field.id}
            </div>

            <div className="flex justify-center sm:justify-start">
              <input
                type="checkbox"
                checked={field.active}
                onChange={() => toggleFieldActive(index)}
                className="mx-auto sm:mx-0"
              />
            </div>

            <input
              type="text"
              className="col-span-1 sm:col-span-2 px-2 py-1 border rounded text-sm w-full"
              value={field.description}
              disabled={!field.active}
              onChange={(e) => handleDescriptionChange(index, e.target.value)}
            />

            <div className="flex items-center justify-start sm:justify-end gap-2 col-span-1 sm:col-span-1">
              <label className="text-sm flex items-center gap-1">
                <input
                  type="radio"
                  name={`type-${index}`}
                  value="text"
                  checked={field.dataType === "text"}
                  disabled={!field.active}
                  onChange={() => handleTypeChange(index, "text")}
                />
                Text
              </label>
              <label className="text-sm flex items-center gap-1">
                <input
                  type="radio"
                  name={`type-${index}`}
                  value="date"
                  checked={field.dataType === "date"}
                  disabled={!field.active}
                  onChange={() => handleTypeChange(index, "date")}
                />
                Date
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-4 gap-3">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm w-full"
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            className="bg-gray-100 hover:bg-gray-200 text-black px-2 py-1 rounded text-sm w-full"
            onClick={() => setShowFieldsPanel(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
