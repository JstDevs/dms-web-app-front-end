import { Button, Input, Textarea, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import Tesseract from "tesseract.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import PdfJsWorker from "pdfjs-dist/build/pdf.worker?worker";
import toast from "react-hot-toast";

// @ts-ignore
GlobalWorkerOptions.workerPort = new PdfJsWorker();

export const OCRUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (
      !["image/png", "image/jpeg", "application/pdf"].includes(selected.type)
    ) {
      toast.error(
        "Unsupported file type: " +
          selected.type +
          ". Please upload a supported file type (PNG, JPEG, or PDF).",
        {
          duration: 4000,
        }
      );
      return;
    }

    setFile(selected);
    setOcrText("");
  };

  const runOCR = async () => {
    if (!file) return;
    setLoading(true);

    try {
      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) })
          .promise;

        let finalText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context!, viewport }).promise;

          const blob: Blob = await new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b!), "image/png")
          );

          const result = await Tesseract.recognize(blob, "eng+osd", {
            logger: (m) => console.log(m),
          });

          finalText += result.data.text + "\n\n";
        }

        setOcrText(finalText.trim());
      } else {
        const result = await Tesseract.recognize(file, "eng+osd", {
          logger: (m) => console.log(m),
        });
        setOcrText(result.data.text);
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast.error(
        "OCR Failed: Something went wrong while processing the file.",
        {
          duration: 4000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-8">
      <h1 className="text-3xl font-bold text-blue-800 mb-6 text-center">
        OCR File Extractor
      </h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Upload a file (PNG, JPG, or PDF)
        </label>
        <Input
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          onChange={handleFileChange}
          variant="outline"
          size="md"
        />
      </div>

      <Button
        colorScheme="blue"
        onClick={runOCR}
        disabled={!file || loading}
        w="100%"
        mb={4}
      >
        {loading ? <Spinner size="sm" mr={2} /> : null}
        {loading ? "Processing..." : "Run OCR"}
      </Button>

      <div className="mb-2 font-semibold text-sm text-gray-700">
        Extracted Text
      </div>
      <Textarea
        placeholder="Extracted text will appear here..."
        value={ocrText}
        readOnly
        size="sm"
        minH="200px"
        borderColor="gray.300"
      />
    </div>
  );
};
