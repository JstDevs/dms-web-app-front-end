import { Select } from "@/components/ui/Select";
import { Button } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { Rect } from "./Unrecorded";
import toast from "react-hot-toast";
import { useDepartmentOptions } from "@/hooks/useDepartmentOptions";
import { createTemplate } from "./utils/template";
import { useOCRFields } from "./Fields/useOCRFields";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDocuments } from "../Document/utils/uploadAPIs";
import {
  convertBufferToFile,
  convertPdfToImage,
} from "./utils/templateHelpers";
import { set } from "date-fns";
interface BackendPDF {
  FileName: string;
  DataImage: {
    type: string;
    data: number[];
  };
  [key: string]: any; // Add more fields as needed
}
export const TemplateOCR = () => {
  const [templateName, setTemplateName] = useState("");
  const [headerName, setHeaderName] = useState("");
  // const [fieldName, setFieldName] = useState("");
  const [selectedPDF, setSelectedPDF] = useState<BackendPDF | null>();
  const [selectionArea, setSelectionArea] = useState<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [pdfPanelVisible, setPdfPanelVisible] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<{
    ID: number;
    Field: string;
  } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [ocrFields, setOcrFields] = useState<
    {
      id: number;
      fieldName: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[]
  >([]);
  const [formData, setFormData] = useState({
    department: "",
    subdepartment: "",
    template: "",
    header: "",
    samplePdf: null as File | null,
    imageWidth: 800,
    imageHeight: 600,
  });
  const imgRef = useRef<HTMLImageElement>(null);

  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { fields, loading, error } = useOCRFields();
  const { selectedRole } = useAuth();
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

  const handleSaveField = () => {
    if (!selectionArea || !selectedField) {
      toast.error("Please select a field and draw an area.");
      setSelectionArea(null);
      return;
    }

    if (ocrFields.some((f) => f.fieldName === selectedField.Field)) {
      toast.error("Field already exists.");
      setSelectionArea(null);
      return;
    }

    const newField = {
      id: selectedField.ID,
      fieldName: selectedField.Field,
      x: Math.round(selectionArea.x),
      y: Math.round(selectionArea.y),
      width: Math.round(selectionArea.width),
      height: Math.round(selectionArea.height),
    };

    setOcrFields((prev) => [...prev, newField]);
    setSelectionArea(null);
    toast.success("Field saved!");
  };
  const handleDeleteField = (fieldId: number) => {
    if (!ocrFields.some((field) => field.id === fieldId)) {
      toast.error("Field not found.");
      return;
    }
    setOcrFields((prev) => prev.filter((field) => field.id !== fieldId));
    setSelectionArea(null);
    setSelectedField(null);
    toast.success("Field deleted!");
  };
  const handleSaveTemplate = async () => {
    const formDataToSend = new FormData();

    formDataToSend.append("departmentId", String(formData.department));
    formDataToSend.append("subDepartmentId", String(formData.subdepartment));
    formDataToSend.append("imageWidth", String(formData?.imageWidth || 800));
    formDataToSend.append("imageHeight", String(formData?.imageHeight || 600));
    formDataToSend.append("header", formData.header || "");
    formDataToSend.append("name", formData.template || "");

    formDataToSend.append("fields", JSON.stringify(ocrFields));

    // ✅ Convert backend PDF buffer to File if needed
    let fileToSend: File | null = null;
    if (selectedPDF instanceof File) {
      fileToSend = selectedPDF;
    } else if (selectedPDF?.DataImage?.data) {
      fileToSend = convertBufferToFile(
        selectedPDF?.DataImage,
        selectedPDF?.FileName || "sample.pdf"
      );
    }

    if (!fileToSend) {
      toast.error("PDF file is missing or invalid.");
      return;
    }

    formDataToSend.append("samplePdf", fileToSend);

    try {
      await createTemplate(formDataToSend);
      toast.success("Template saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save template");
    } finally {
      setFormData({
        department: "",
        subdepartment: "",
        template: "",
        header: "",
        samplePdf: null,
        imageWidth: 800,
        imageHeight: 600,
      });
      setPdfPanelVisible(false);
      setShowImagePanel(false);
      setPdfImage(null);
      setDocuments([]);
      setSelectionArea(null);
      setOcrFields([]);
      setSelectedPDF(null);
      setTemplateName("");
      setHeaderName("");
    }
  };

  const handleSelectDocument = async (doc: any) => {
    if (doc?.DataImage?.data) {
      const byteArray = new Uint8Array(doc.DataImage.data);
      const arrayBuffer = byteArray.buffer;

      try {
        const imageDataUrl = await convertPdfToImage(arrayBuffer);
        setPdfImage(imageDataUrl); // Store image URL
        setShowImagePanel(true);
      } catch (error) {
        toast.error("Failed to convert PDF to image");
        setPdfImage(null);
        setShowImagePanel(false);
        console.error(error);
      }
    } else {
      setPdfImage(null);
      setShowImagePanel(false);
    }
  };
  const handlePDFsUploadClick = async () => {
    if (!selectedRole?.ID) {
      toast.error("Invalid user role");
      return;
    }

    try {
      const docs = await fetchDocuments(selectedRole.ID);
      console.log({ docs });
      setDocuments(docs.data.documents);
      setPdfPanelVisible(true);
    } catch (err) {
      toast.error("Failed to load documents");
      console.error("Error fetching documents:", err);
    }
  };
  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg">
      {/* // HEADER  */}
      <header className="text-left flex-1 py-4 px-3 sm:px-6">
        <h1 className="text-3xl font-bold text-blue-800">Template Documents</h1>
        <p className="mt-2 text-gray-600">Manage all template documents here</p>
      </header>

      {/* TOP ROW - Department, Sub-Department, Load Button */}
      <div className="flex flex-col gap-2 sm:flex-row p-2 sm:p-4">
        <div className="flex-1">
          <Select
            label="Department"
            value={formData.department}
            onChange={(e) =>
              setFormData({ ...formData, department: e.target.value })
            }
            placeholder="Select a Department"
            options={departmentOptions}
          />
        </div>
        <div className="flex-1">
          <Select
            label="Sub-Department"
            value={formData.subdepartment}
            onChange={(e) =>
              setFormData({ ...formData, subdepartment: e.target.value })
            }
            placeholder="Select a Sub-Department"
            options={subDepartmentOptions}
          />
        </div>
        <div className="flex items-end">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            onClick={handlePDFsUploadClick}
            disabled={
              !formData.department || !formData.subdepartment || pdfPanelVisible
            }
          >
            Load PDFs
          </Button>
        </div>
      </div>

      {/* MAIN PANEL - AFTER LOADING */}
      {pdfPanelVisible ? (
        <div className="flex gap-4 p-2 sm:p-4 w-full max-lg:flex-col">
          {/* LEFT SIDE */}
          <div className="w-full lg:w-1/2 p-2 sm:p-6 space-y-4 border-r bg-white">
            {/* PDF Selection */}
            <div className="space-y-3">
              <div className="flex justify-between w-full items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Select a PDF
                </label>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded text-sm"
                  onClick={() => handleSelectDocument(selectedPDF)}
                >
                  Upload
                </button>
              </div>
              <div className="flex gap-2 flex-col max-h-[200px] overflow-auto">
                {documents?.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPDF(doc)}
                    className={`cursor-pointer text-sm px-2 py-1 rounded  ${
                      selectedPDF === doc
                        ? "bg-blue-300 "
                        : "bg-slate-50 hover:bg-blue-100 border border-slate-300"
                    }`}
                  >
                    {doc.FileName}
                  </div>
                ))}
              </div>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mt-4">
                Template Name
              </label>
              <input
                type="text"
                className="mt-1 border w-full px-2 py-1 rounded disabled:bg-slate-300 disabled:text-gray-500"
                placeholder="Template Name"
                disabled={templateName ? true : false}
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
                    setTemplateName(formData.template);
                    toast.success("Template Added successfully!");
                  }}
                  disabled={!formData.template || templateName ? true : false}
                >
                  Add Template
                </Button>
              </div>

              {/* Header */}
              <label className="block text-sm font-medium text-gray-700 mt-2">
                Header
              </label>
              <input
                type="text"
                className="mt-1 border w-full px-2 py-1 rounded disabled:bg-slate-300 disabled:text-gray-500"
                placeholder="e.g., CERTIFICATE OF LIVE BIRTH"
                disabled={headerName ? true : false}
                value={formData.header}
                onChange={(e) =>
                  setFormData((pre) => ({ ...pre, header: e.target.value }))
                }
              />
              <div className="flex gap-2 my-3">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm mt-1 w-full"
                  onClick={() => {
                    if (!formData.header) {
                      toast.error("Please enter header name");
                      return;
                    }
                    setHeaderName(formData.header);
                    toast.success("Header Tag Added successfully!");
                  }}
                  disabled={!formData.header || headerName ? true : false}
                >
                  Save Header Tag
                </Button>
              </div>
            </div>

            {/* Field Dropdown + Save/Delete */}
            <div className="flex gap-2 w-full items-end max-sm:flex-col">
              <Select
                label="Fields"
                value={selectedField?.ID || ""}
                onChange={(e) => {
                  const selected = fields.find(
                    (f) => f.ID === parseInt(e.target.value)
                  );
                  setSelectedField(selected || null);
                }}
                placeholder="Select a Field"
                options={fields.map((field) => ({
                  value: field.ID.toString(),
                  label: field.Field,
                }))}
              />
              <div className="flex-1 flex gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm flex-initial px-4"
                  disabled={!selectionArea || !selectedField}
                  onClick={handleSaveField}
                >
                  Save Field
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded text-sm flex-initial px-4"
                  disabled={!showImagePanel || !selectedField}
                  onClick={() => handleDeleteField(selectedField?.ID || 0)}
                >
                  Delete Field
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Image and Coordinates */}
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
                    {ocrFields.map((field) => (
                      <tr key={field.id}>
                        <td className="border px-2 py-1">{field.fieldName}</td>
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

              {/* Image Selection Panel */}
              <div
                className="relative w-full h-[600px] border rounded-md overflow-hidden"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* <img
                  ref={imgRef}
                  src="/sample.png"
                  alt="OCR Template"
                  className="object-contain w-full h-full select-none"
                  draggable={false}
                /> */}
                {pdfImage ? (
                  <img
                    ref={imgRef}
                    src={pdfImage}
                    alt="PDF Page"
                    className="object-contain w-full h-full select-none"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No PDF selected
                  </div>
                )}
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

              <div className="flex justify-end gap-2">
                <Button
                  className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm"
                  onClick={() => setShowImagePanel(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                  onClick={handleSaveTemplate}
                  disabled={
                    !ocrFields.length ||
                    !pdfImage ||
                    !templateName ||
                    !headerName
                  }
                >
                  Save Template
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-3xl font-bold text-blue-800 mb-6">
            OCR Template
          </h1>
          <p className="text-lg text-gray-500">
            Please select a Department and Sub-Department to start OCR.
          </p>
        </div>
      )}
    </div>
  );
};
