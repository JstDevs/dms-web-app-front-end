import {
  Box,
  Button,
  Input,
  Textarea,
  Spinner,
  Icon,
  VStack,
  Text,
} from "@chakra-ui/react";
import { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import PdfJsWorker from "pdfjs-dist/build/pdf.worker?worker";
import toast from "react-hot-toast";
import { FiUploadCloud, FiFileText, FiImage } from "react-icons/fi";

// @ts-ignore
GlobalWorkerOptions.workerPort = new PdfJsWorker();

export const HandWrittenOCRUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const isPDF = file?.type === "application/pdf";
  const isImage = file?.type?.startsWith("image");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (
      !["image/png", "image/jpeg", "application/pdf"].includes(selected.type)
    ) {
      toast.error(`Unsupported file type: ${selected.type}`);
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
      toast.error("OCR Failed: Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in">
      {/* // HEADER  */}
      <header className="text-left flex-1 py-4 px-6">
        <h1 className="text-3xl font-bold text-blue-800">
          {" "}
          Handwritten OCR Extractor
        </h1>
        <p className="mt-2 text-gray-600">
          Extract text from handwritten documents
        </p>
      </header>
      <main className="flex-1 p-4 md:p-6">
        {/* Drag and Drop Upload Box */}
        <Box
          border="2px dashed #3182CE"
          borderRadius="lg"
          p={6}
          textAlign="center"
          cursor="pointer"
          onClick={() => inputRef.current?.click()}
          bg="gray.50"
          _hover={{ bg: "blue.50" }}
          mb={6}
        >
          <VStack>
            <Icon as={FiUploadCloud} w={10} h={10} color="blue.400" />
            <Text fontWeight="medium" color="gray.600">
              Click or drag file to upload
            </Text>
            <Text fontSize="sm" color="gray.500">
              Only PNG, JPEG, or PDF files are supported
            </Text>
          </VStack>
          <Input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            ref={inputRef}
            onChange={handleFileChange}
            display="none"
          />
        </Box>

        {/* File Preview */}
        {file && (
          <Box
            p={4}
            mb={4}
            borderRadius="md"
            border="1px solid #E2E8F0"
            display="flex"
            alignItems="center"
            bg="gray.50"
            gap={3}
          >
            <Icon
              as={isPDF ? FiFileText : FiImage}
              color="blue.500"
              w={6}
              h={6}
            />
            <Text fontSize="sm" color="gray.700">
              {file.name}
            </Text>
          </Box>
        )}

        <div className="flex justify-center">
          <Button
            // variant="solid"
            onClick={runOCR}
            disabled={!file || loading}
            mb={4}
            colorPalette="blue"
            // className="bg-blue-500 hover:bg-blue-600 text-white w-1/2"
          >
            {loading ? <Spinner size="sm" mr={2} /> : null}
            {loading ? "Processing..." : "Run OCR"}
          </Button>
          <Button colorPalette="teal" variant="outline">
            Call us
          </Button>
          <Button>Button</Button>
        </div>

        <Box>
          <Text fontWeight="semibold" mb={2} fontSize="sm" color="gray.700">
            Extracted Text
          </Text>
          <Textarea
            placeholder="Extracted text will appear here..."
            value={ocrText}
            readOnly
            size="sm"
            minH="200px"
            bg="gray.50"
            borderColor="gray.300"
            _focus={{ borderColor: "blue.400" }}
          />
        </Box>
      </main>
    </div>
  );
};
