declare module "pdfjs-dist/build/pdf" {
  export * from "pdfjs-dist/types/src/pdf";
  export as namespace pdfjsLib;
}

declare module "pdfjs-dist/build/pdf.worker.min.js" {
  const workerSrc: string;
  export default workerSrc;
}
