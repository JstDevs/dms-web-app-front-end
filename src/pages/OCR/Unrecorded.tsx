import { Select } from "@/components/ui/Select";
import { useDepartmentOptions } from "@/hooks/useDepartmentOptions";
import { Button } from "@chakra-ui/react";
// import { Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTemplates } from "./utils/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { useUnrecordedDocuments } from "./utils/useUnrecorded";
import { runOCR } from "./utils/unrecordedHelpers";
interface FormData {
  department: string;
  subdepartment: string;
  template: string;
  accessId: string;
  selectedDoc: string;
  isLoaded: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const documents = [
  "BC-187_document-0000000349.pdf",
  "BC-187_document-0000000348.pdf",
  "BC-187_document-0000000347.pdf",
  "BC-187_document-0000000346.pdf",
  "BC-187_document-0000000345.pdf",
  "BC-187_document-0000000344.pdf",
  "BC-187_document-0000000343.pdf",
];
const OCRUnrecordedUI = () => {
  const [formData, setFormData] = useState<FormData>({
    department: "",
    subdepartment: "",
    template: "",
    accessId: "",
    selectedDoc: "",
    isLoaded: false,
  });

  // const [selection, setSelection] = useState<Rect | null>(null);
  // const [isDragging, setIsDragging] = useState(false);
  // const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
  //   null
  // );

  const imgRef = useRef<HTMLImageElement>(null);

  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { templateOptions } = useTemplates();
  const { selectedRole } = useAuth();
  const { unrecordedDocuments, fetchUnrecorded } = useUnrecordedDocuments();
  const handleOCR = async () => {
    const selectedDocument = unrecordedDocuments.find(
      (doc) => doc.FileName === formData.selectedDoc
    );
    const selectedTemplateName = templateOptions.find(
      (temp) => temp.value === formData.template
    )?.label;
    if (!selectedDocument) {
      toast.error("No document selected");
      return;
    }

    const payload = {
      templateName: selectedTemplateName,
      userId: Number(selectedRole?.ID),
    };
    console.log(payload, selectedDocument);
    try {
      await runOCR(selectedDocument.ID, payload);
      toast.success("OCR processing started successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to start OCR");
    }
  };
  // -------GET ALL UNRECORDED DOCUMENTS-----------
  const handleLoad = async () => {
    setFormData({ ...formData, isLoaded: false });

    try {
      fetchUnrecorded(
        formData.department,
        formData.subdepartment,
        String(selectedRole?.ID)
      );

      toast.success("Documents loaded successfully");
    } catch (error) {
      console.log(error);
      toast.error("Failed to load document");
    } finally {
      setFormData({ ...formData, isLoaded: true });
    }
  };
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg">
      {/* HEADER */}
      <header className="text-left flex-1 py-4 px-3 sm:px-6">
        <h1 className="text-3xl font-bold text-blue-800">
          Unrecorded Documents
        </h1>
        <p className="mt-2 text-gray-600">
          Manage all unrecorded documents here
        </p>
      </header>

      <div className="flex gap-4 p-2 sm:p-4 w-full max-md:flex-col">
        {/* Left Panel - Document List */}
        <div className="w-full lg:w-2/5 p-2 sm:p-6 space-y-6 border-r bg-white">
          <div className="flex gap-4 md:flex-col max-sm:flex-col">
            <Select
              label="Department"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              placeholder="Select a Department"
              options={departmentOptions}
            />

            <Select
              label="Sub-Department"
              value={formData.subdepartment}
              onChange={(e) =>
                setFormData({ ...formData, subdepartment: e.target.value })
              }
              placeholder="Select a Sub-Department"
              options={subDepartmentOptions}
            />

            <Select
              label="OCR Template"
              value={formData.template}
              onChange={(e) =>
                setFormData({ ...formData, template: e.target.value })
              }
              placeholder="Select a Template"
              options={templateOptions}
            />

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm w-full"
              onClick={handleLoad}
              disabled={
                !formData.department ||
                !formData.subdepartment ||
                !formData.template
              }
            >
              Get Documents
            </Button>
          </div>

          {/* NOTE: HARD CODED FOR NOW  */}
          {unrecordedDocuments.length > 0 &&
            unrecordedDocuments?.map((doc) => (
              <div
                key={doc.ID}
                onClick={() =>
                  setFormData({
                    ...formData,
                    selectedDoc: doc.FileName,
                    isLoaded: true,
                  })
                }
                className={`cursor-pointer text-sm px-2 py-1 rounded hover:bg-blue-100 ${
                  formData.selectedDoc === doc.FileName ? "bg-blue-200" : ""
                }`}
              >
                {doc.FileName}
              </div>
            ))}

          {formData.selectedDoc && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm w-full"
              onClick={handleOCR}
              disabled={!formData.selectedDoc}
            >
              Start OCR
            </Button>
          )}
        </div>

        {/* Right Panel - Document Preview */}
        <div className="w-full lg:w-3/5 p-2 sm:p-4 bg-white">
          <div className="h-full flex items-center justify-center relative border rounded-md min-h-[500px]">
            {formData.isLoaded ? (
              <div className="relative w-full h-full overflow-hidden">
                {/* <img
                  ref={imgRef}
                  src={
                    formData.selectedDoc
                      ? `/uploads/${formData.selectedDoc}`
                      : "/sample.png"
                  }
                  alt="Document Preview"
                  className="object-contain w-full h-full select-none"
                  draggable={false}
                /> */}
              </div>
            ) : (
              <p className="text-gray-400">Select a document to preview</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRUnrecordedUI;
