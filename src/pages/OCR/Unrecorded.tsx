import { Select } from "@/components/ui/Select";
// import { Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
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

  const [selection, setSelection] = useState<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!formData.isLoaded || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !startPoint || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelection({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleOCR = () => {
    if (selection) {
      console.log("Selected OCR Area:", selection);
      toast.success("Selected OCR Area");
      // You would send `selection` coordinates along with `selectedDoc` to your OCR backend
    }
  };

  const handleLoad = () => {
    if (formData.selectedDoc) {
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
        {/* Left Panel */}
        <div className="w-full lg:w-1/2 p-2 sm:p-6 space-y-4 border-r bg-white">
          <div className="flex gap-4 md:flex-col max-sm:flex-col">
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

            <Select
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
            />
          </div>
          {/* NOTE: HARD CODED FOR NOW  */}
          {formData.template === "birth" ? (
            <>
              <div className="bg-orange-100 text-orange-700 font-semibold px-4 py-2 rounded text-center">
                8 Unrecorded Documents
              </div>

              <div className="border rounded p-2 h-40 overflow-y-auto">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        selectedDoc: doc,
                        isLoaded: false,
                      })
                    }
                    className={`cursor-pointer text-sm px-2 py-1 rounded hover:bg-blue-100 ${
                      formData.selectedDoc === doc ? "bg-blue-200" : ""
                    }`}
                  >
                    {doc}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-gray-300 py-1.5 rounded hover:bg-gray-400 text-sm"
                  onClick={handleLoad}
                >
                  Load
                </button>
                <button
                  onClick={handleOCR}
                  disabled={!formData.selectedDoc}
                  className="flex-1 bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 text-sm"
                >
                  OCR
                </button>
              </div>
            </>
          ) : formData.template === "id" ? (
            <div className="bg-orange-100 text-orange-700 font-semibold px-4 py-2 rounded text-center">
              0 Documents Found
            </div>
          ) : null}
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 p-2 sm:p-4 flex items-center justify-center relative bg-white">
          {formData.isLoaded ? (
            <div
              className="relative w-full h-full border rounded-md overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <img
                ref={imgRef}
                src="/sample.png"
                alt="Document Preview"
                className="object-contain w-full h-full select-none"
                draggable={false}
              />
              {selection && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20"
                  style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: selection.height,
                  }}
                />
              )}
              <div className="absolute bottom-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                Drag to select OCR area then click "OCR"
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Select a document to preview</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRUnrecordedUI;
