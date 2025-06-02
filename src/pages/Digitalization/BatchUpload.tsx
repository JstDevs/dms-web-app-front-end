import { UploadCloud, Trash2, Eye, ChevronDown } from "lucide-react";
import { useState, useRef, ChangeEvent, DragEvent } from "react";

type Department = {
  value: string;
  label: string;
};

type SubDepartment = {
  value: string;
  label: string;
};

type Template = {
  value: string;
  label: string;
};

type UploadedFile = {
  id: number;
  name: string;
  type: string;
  size: string;
  status: "Pending" | "Success";
  department: string;
};
export const BatchUploadPanel = () => {
  // Dummy data for dropdowns
  const departments: Department[] = [
    { value: "finance", label: "Finance" },
    { value: "payroll", label: "Payroll" },
    { value: "hr", label: "HR" },
  ];

  const subDepartments: SubDepartment[] = [
    { value: "payroll", label: "Payroll" },
    { value: "documents", label: "Documents" },
    { value: "records", label: "Records" },
  ];

  const templates: Template[] = [
    { value: "id", label: "ID Card" },
    { value: "birth", label: "Birth Certificate" },
    { value: "passport", label: "Passport" },
  ];

  // State for selections
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedSubDepartment, setSelectedSubDepartment] =
    useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // State for uploaded files
  const [files, setFiles] = useState<UploadedFile[]>([
    {
      id: 1,
      name: "Payroll_June.xlsx",
      type: "Excel",
      size: "220 KB",
      status: "Success",
      department: "Payroll",
    },
    {
      id: 2,
      name: "HR_Records.pdf",
      type: "PDF",
      size: "115 KB",
      status: "Pending",
      department: "HR",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles: UploadedFile[] = Array.from(e.target.files).map(
      (file, index) => ({
        id: Date.now() + index,
        name: file.name,
        type:
          file.type || file.name.split(".").pop()?.toUpperCase() || "Unknown",
        size: `${(file.size / 1024).toFixed(2)} KB`,
        status: "Pending",
        department: selectedDepartment
          ? departments.find((d) => d.value === selectedDepartment)?.label ||
            "Not specified"
          : "Not specified",
      })
    );

    setFiles([...files, ...newFiles]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!selectedTemplate || !e.dataTransfer.files) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const event = {
        target: { files: droppedFiles },
      } as unknown as ChangeEvent<HTMLInputElement>;
      handleFileUpload(event);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const deleteFile = (id: number) => {
    setFiles(files.filter((file) => file.id !== id));
  };

  return (
    <div className="bg-white shadow-md rounded-xl p-6 space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-blue-800">Batch Upload</h2>
        <p className="mt-2 text-gray-600">
          Upload and manage batch document files here
        </p>
      </header>

      {/* Context Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <div className="relative">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sub-Department
          </label>
          <div className="relative">
            <select
              value={selectedSubDepartment}
              onChange={(e) => setSelectedSubDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedDepartment}
            >
              <option value="">Select Sub-Department</option>
              {subDepartments.map((subDept) => (
                <option key={subDept.value} value={subDept.value}>
                  {subDept.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OCR Template
          </label>
          <div className="relative">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedSubDepartment}
            >
              <option value="">Select Template</option>
              {templates.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-md p-6 text-center transition cursor-pointer ${
          selectedTemplate
            ? "border-gray-300 bg-gray-50 hover:bg-gray-100"
            : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        onClick={selectedTemplate ? triggerFileInput : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p className="text-sm">
          {selectedTemplate
            ? "Drag & drop files here or click to upload"
            : "Please select a template first"}
        </p>
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
          disabled={!selectedTemplate}
        />
      </div>

      {/* Upload Button - Now shows count of pending files */}
      <div className="flex justify-between items-center">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm ${
            files.some((f) => f.status === "Pending")
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!files.some((f) => f.status === "Pending")}
        >
          <UploadCloud className="w-4 h-4" />
          Upload{" "}
          {files.filter((f) => f.status === "Pending").length > 0 &&
            `(${files.filter((f) => f.status === "Pending").length})`}
        </button>

        {files.length > 0 && (
          <button
            className="flex items-center gap-2 text-red-600 text-sm hover:underline"
            onClick={() => setFiles([])}
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Uploaded Files Table */}
      {files.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-4 py-2">File Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b border-gray-200">
                  <td className="px-4 py-2 font-medium">{file.name}</td>
                  <td className="px-4 py-2">{file.type}</td>
                  <td className="px-4 py-2">{file.size}</td>
                  <td className="px-4 py-2">{file.department}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        file.status === "Success"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {file.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => deleteFile(file.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
