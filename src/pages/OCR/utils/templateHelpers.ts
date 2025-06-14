import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist/build/pdf";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

// Set worker
// pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const convertPdfToImage = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const page = await pdf.getPage(1); // First page only (can extend later)

  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context!, viewport }).promise;
  return canvas.toDataURL("image/png");
};
const convertBufferToFile = (
  data: { type: string; data: number[] },
  fileName: string
): File => {
  const byteArray = new Uint8Array(data.data);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  return new File([blob], fileName, { type: "application/pdf" });
};
export { convertPdfToImage, convertBufferToFile };
