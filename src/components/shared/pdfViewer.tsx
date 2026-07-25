import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import LoadingAnimation from "@/components/shared/loadingAnim";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type Props = {
  url: string;
};

export default function PdfViewer({ url }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-2 bg-neutral-100 dark:bg-neutral-950 p-2"
    >
      <Document
        file={url}
        loading={<LoadingAnimation />}
        error={
          <p className="text-sm text-muted-foreground p-4 text-center">
            No s'ha pogut carregar el PDF.
          </p>
        }
        onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
      >
        {width > 0 &&
          Array.from({ length: numPages ?? 0 }, (_, index) => (
            <Page
              key={index}
              pageNumber={index + 1}
              width={width}
              className="shadow-md mb-2 max-w-full"
            />
          ))}
      </Document>
    </div>
  );
}
