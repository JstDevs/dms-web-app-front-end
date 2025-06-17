import { Select } from "@/components/ui/Select";
import { useDepartmentOptions } from "@/hooks/useDepartmentOptions";
import { Button } from "@chakra-ui/react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTemplates } from "./utils/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import {
  UnrecordedDocument,
  useUnrecordedDocuments,
} from "./utils/useUnrecorded";
import { runOCR } from "./utils/unrecordedHelpers";
interface FormData {
  department: string;
  subdepartment: string;
  template: string;
  accessId: string;
  selectedDoc: UnrecordedDocument | null;
  isLoaded: boolean;
  previewUrl: string;
  lastFetchedValues?: {
    // Track what was last fetched
    department: string;
    subdepartment: string;
    template: string;
  };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OCRUnrecordedUI = () => {
  const [formData, setFormData] = useState<FormData>({
    department: "",
    subdepartment: "",
    template: "",
    accessId: "",
    selectedDoc: null,
    isLoaded: false,
    previewUrl: "",
  });
  const imgRef = useRef<HTMLImageElement>(null);

  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { templateOptions } = useTemplates();
  const { selectedRole } = useAuth();
  const { unrecordedDocuments, fetchUnrecorded } = useUnrecordedDocuments();
  const handleOCR = async () => {
    const selectedDocument = unrecordedDocuments.find(
      (doc) => doc.FileName === formData.selectedDoc?.FileName
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
      linkId: selectedDocument.LinkID,
    };

    try {
      const res = await runOCR(selectedDocument.ID, payload);
      console.log(res, "runOCR");
      // TODO : IF OCR IS SUCCESSFUL THEN REMOVE IT FROM THE LIST....
      setFormData({ ...formData, selectedDoc: null });
      fetchUnrecorded(
        formData.department,
        formData.subdepartment,
        String(selectedRole?.ID)
      );
      toast.success("OCR processing started successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to start OCR");
    }
  };
  // -------GET ALL UNRECORDED DOCUMENTS-----------
  const handleLoad = async () => {
    if (!selectedRole?.ID) {
      toast.error("Please select a role");
      return;
    }
    setFormData({ ...formData, isLoaded: false });
    try {
      fetchUnrecorded(
        formData.department,
        formData.subdepartment,
        String(selectedRole?.ID)
      );
      setFormData((prev) => ({
        ...prev,
        lastFetchedValues: {
          department: prev.department,
          subdepartment: prev.subdepartment,
          template: prev.template,
        },
      }));
      toast.success("Documents loaded successfully");
    } catch (error) {
      console.log(error);
      toast.error("Failed to load document");
    } finally {
      setFormData({ ...formData, isLoaded: true });
    }
  };
  const handleDocSelection = (doc: UnrecordedDocument) => {
    const byteArray = new Uint8Array(doc.DataImage.data);
    const blob = new Blob([byteArray], {
      type: doc.DataType === "pdf" ? "application/pdf" : "image/png", // Adjust MIME as needed
    });
    const previewUrl = URL.createObjectURL(blob);

    setFormData({
      ...formData,
      selectedDoc: doc,
      isLoaded: true,
      previewUrl,
    });
  };

  const isSameAsLastFetch =
    formData.department === formData.lastFetchedValues?.department &&
    formData.subdepartment === formData.lastFetchedValues?.subdepartment &&
    formData.template === formData.lastFetchedValues?.template;
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
        <div className="w-full lg:w-1/2 p-2 sm:p-6 space-y-6 border-r bg-white">
          <div className="flex gap-4 flex-col">
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
                !formData.template ||
                isSameAsLastFetch
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
                onClick={() => handleDocSelection(doc)}
                className={`cursor-pointer text-sm px-2 py-1 rounded hover:bg-blue-100 ${
                  formData.selectedDoc?.FileName === doc.FileName
                    ? "bg-blue-200"
                    : ""
                }`}
              >
                {doc.FileName}
              </div>
            ))}

          {unrecordedDocuments.length === 0 && formData.isLoaded && (
            <div className="text-xl text-center px-2 py-1  ">
              No Documents Found
            </div>
          )}

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
        <div className="w-full lg:w-1/2 p-2 sm:p-4 bg-white">
          {/* <div className="w-full h-full flex items-center justify-center relative"> */}
          {formData.isLoaded && formData.selectedDoc ? (
            <div className="w-full max-h-[60vh] overflow-auto border rounded-md">
              <div
                className="relative"
                style={{ width: "100%", minWidth: "100%", height: "100%" }}
              >
                {formData.selectedDoc.DataType === "pdf" ? (
                  <iframe
                    src={formData.previewUrl}
                    title="PDF Preview"
                    className="w-full h-full"
                  />
                ) : (
                  <>
                    <img
                      ref={imgRef}
                      src={formData.previewUrl}
                      alt="Document Preview"
                      className="block"
                      style={{
                        width: "100%",
                        height: "100%",
                        minWidth: "100%",
                      }}
                      draggable={false}
                    />
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Select a document to preview</p>
          )}
        </div>
        {/* </div> */}
      </div>
    </div>
  );
};

export default OCRUnrecordedUI;
