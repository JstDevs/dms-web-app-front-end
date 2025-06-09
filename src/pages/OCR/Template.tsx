import { Select } from "@/components/ui/Select";
import { Button, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { documents, Rect } from "./Unrecorded";
import toast from "react-hot-toast";
import { set } from "date-fns";

export const TemplateOCR = () => {
  const [templateName, setTemplateName] = useState("");
  const [headerName, setHeaderName] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [selectedPDF, setSelectedPDF] = useState<string | null>();
  const [selectionArea, setSelectionArea] = useState<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [formData, setFormData] = useState({
    department: "",
    subdepartment: "",
    template: "",
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const fields = [
    { name: "Registry", x: 398, y: 108, width: 180, height: 26 },
    { name: "Full Name", x: 72, y: 147, width: 504, height: 17 },
    { name: "Sex", x: 72, y: 177, width: 136, height: 13 },
    { name: "Header", x: 173, y: 68, width: 286, height: 22 },
  ];
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !startPoint || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionArea({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg">
      {/* // HEADER  */}
      <header className="text-left flex-1 py-4 px-3 sm:px-6">
        <h1 className="text-3xl font-bold text-blue-800">Template Documents</h1>
        <p className="mt-2 text-gray-600">Manage all template documents here</p>
      </header>

      <div className="flex gap-4 p-2 sm:p-4 w-full max-lg:flex-col">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-1/2 p-2 sm:p-6 space-y-4 border-r bg-white">
          <div>
            <Select
              label="Department"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              options={[
                { value: "finance", label: "Finance" },
                { value: "payroll", label: "Payroll" },
                { value: "hr", label: "HR" },
              ]}
            />
          </div>

          <div>
            <Select
              label="Sub-Department"
              value={formData.subdepartment}
              onChange={(e) =>
                setFormData({ ...formData, subdepartment: e.target.value })
              }
              options={[
                { value: "payroll", label: "Payroll" },
                { value: "documents", label: "Documents" },
                { value: "records", label: "Records" },
              ]}
            />
          </div>

          <div>
            {/* <Select
              label="OCR Template"
              value={formData.template}
              onChange={(e) =>
                setFormData({ ...formData, template: e.target.value })
              }
              options={[
                { value: "id", label: "ID Card" },
                { value: "birth", label: "Birth Certificate" },
                { value: "passport", label: "Passport" },
              ]}
            /> */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {" "}
              Template Name
            </label>
            <input
              type="text"
              className="mt-1 border w-full px-2 py-1 rounded"
              placeholder="Template Name"
              value={formData.template}
              onChange={(e) =>
                setFormData((pre) => ({ ...pre, template: e.target.value }))
              }
            />
            <div className="flex gap-2 my-3">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm flex-1"
                onClick={() => {
                  if (!formData.template) {
                    toast.error("Please enter template name");
                    return;
                  }
                  toast.success("Template Added successfully!");
                }}
                disabled={!formData.template}
              >
                Add Template
              </Button>
              {/* <Button className="bg-red-600 hover:bg-red-700 text-white p-2 rounded text-sm flex-1">
                Delete Template
              </Button> */}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 ">
              Header
            </label>
            <input
              type="text"
              className="border w-full px-2 py-1 rounded"
              placeholder="e.g., CERTIFICATE OF LIVE BIRTH"
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
            />
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm mt-1 w-full"
              onClick={() => {
                if (!headerName) {
                  toast.error("Please enter header name");
                  return;
                }
                toast.success("Header Tag Added successfully!");
              }}
              disabled={!headerName}
            >
              Save Header Tag
            </Button>
          </div>

          <div className="flex gap-2 w-full items-end max-sm:flex-col">
            <Select
              label="Fields"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              options={[
                { value: "registry", label: "Registry" },
                { value: "fullname", label: "Full Name" },
                { value: "sex", label: "Sex" },
                { value: "header", label: "Header" },
              ]}
            />
            <div className="flex-1  flex gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm flex-initial px-4"
                disabled={!showImagePanel}
              >
                Save Field
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded text-sm flex-initial px-4"
                disabled={!showImagePanel}
              >
                Delete Field
              </Button>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <div className="flex justify-between w-full items-center">
              <label className="block text-sm font-medium text-gray-700">
                Select PDF
              </label>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded text-sm"
                onClick={() => setShowImagePanel(true)}
              >
                Upload
              </button>
            </div>
            <div className="flex gap-2 flex-col max-h-[200px] overflow-auto">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPDF(doc)}
                  className={`cursor-pointer text-sm px-2 py-1 rounded hover:bg-blue-100 ${
                    selectedPDF === doc ? "bg-blue-200" : ""
                  }`}
                >
                  {doc}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        {showImagePanel && (
          <div className="w-full lg:w-1/2 p-2 sm:p-4 bg-white space-y-6">
            {/* Coordinates Table */}
            <div className="overflow-auto max-h-40 border rounded">
              <table className="text-sm w-full table-auto border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1 text-left">Field Name</th>
                    <th className="border px-2 py-1">X</th>
                    <th className="border px-2 py-1">Y</th>
                    <th className="border px-2 py-1">Width</th>
                    <th className="border px-2 py-1">Height</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">{field.name}</td>
                      <td className="border px-2 py-1 text-center">
                        {field.x}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {field.y}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {field.width}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {field.height}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Image Display */}

            {/* <div className="h-[500px] border rounded overflow-hidden"> */}
            <div
              className="relative w-full h-[600px] border rounded-md overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <img
                ref={imgRef}
                src="/sample.png"
                alt="OCR Template"
                className="object-contain w-full h-full select-none"
                draggable={false}
              />
              {selectionArea && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20"
                  style={{
                    left: selectionArea.x,
                    top: selectionArea.y,
                    width: selectionArea.width,
                    height: selectionArea.height,
                  }}
                />
              )}
              <div className="max-sm:hidden absolute bottom-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                Drag to select OCR area
              </div>
            </div>
            {/* </div> */}
          </div>
        )}
      </div>
    </div>
  );
};
