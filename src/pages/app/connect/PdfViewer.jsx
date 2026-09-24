import { useState, useRef } from "react";
import { Document, Page } from "react-pdf";

import { ensurePdfWorker } from "../../../lib/pdfWorker";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import Assignment from "@mui/icons-material/Assignment";
import ZoomIn from "@mui/icons-material/ZoomIn";
import ZoomOut from "@mui/icons-material/ZoomOut";
import Close from "@mui/icons-material/Close";
import OpenInNew from "@mui/icons-material/OpenInNew";

/**
 * The broker's own uploaded agreement, with a drop target on every page.
 *
 * `placement` is `{ page, xPct, yPct }` where the percentages are relative to
 * the page box, so the position the carrier picks survives any zoom level and
 * matches what the API stores.
 */
export default function PdfViewer({
  pdfUrl,
  title = "Broker agreement",
  signatureUrl = null,
  placement = null,
  onPlace,
  onClear,
}) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(0.9);
  const [loadError, setLoadError] = useState(false);
  const [dragOverPage, setDragOverPage] = useState(null);

  const pageRefs = useRef({});

  if (!pdfUrl) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#FAFBFD]">
        <Assignment style={{ fontSize: 64 }} className="text-[#E2E8F0]" />

        <p className="mt-3 max-w-[280px] text-center text-sm text-[#4B5563]">
          The broker has not uploaded an agreement yet, so there is nothing to
          sign. Please check back later.
        </p>
      </div>
    );
  }

  ensurePdfWorker();

  const placeAt = (pageNumber, clientX, clientY) => {
    const pageEl = pageRefs.current[pageNumber];
    if (!pageEl || !onPlace) return;

    const rect = pageEl.getBoundingClientRect();

    // Clamped so a drop that lands slightly outside the page still resolves to
    // a valid position rather than being silently discarded.
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));

    onPlace({
      page: pageNumber,
      xPct: Number(xPct.toFixed(2)),
      yPct: Number(yPct.toFixed(2)),
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-lg bg-[#F5F7FB] p-2">
        <div className="flex min-w-0 items-center gap-2">
          <Assignment style={{ fontSize: 18 }} className="text-[#1D4ED8]" />
          <span className="truncate text-xs font-semibold text-[#1F2937]">
            {title}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((v) => Math.max(0.5, v - 0.2))}
            className="rounded p-1 hover:bg-white"
          >
            <ZoomOut style={{ fontSize: 16 }} className="text-[#191C1E]" />
          </button>

          <span className="w-9 text-center text-xs text-gray-500">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setScale((v) => Math.min(2.5, v + 0.2))}
            className="rounded p-1 hover:bg-white"
          >
            <ZoomIn style={{ fontSize: 16 }} className="text-[#191C1E]" />
          </button>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 hover:bg-white"
            title="Open in new tab"
          >
            <OpenInNew style={{ fontSize: 16 }} className="text-[#1D4ED8]" />
          </a>
        </div>
      </div>

      {loadError ? (
        <div className="flex h-[520px] flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#FAFBFD]">
          <Assignment style={{ fontSize: 64 }} className="text-[#E2E8F0]" />

          <p className="mt-3 max-w-[280px] text-center text-sm text-[#4B5563]">
            The agreement could not be displayed. Use the open-in-new-tab button
            above to read it.
          </p>
        </div>
      ) : (
        <div className="h-[520px] overflow-auto rounded-xl border-8 border-[#F5F7FB] bg-[#F5F7FB]">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: count }) => setNumPages(count)}
            onLoadError={() => setLoadError(true)}
            loading={
              <div className="flex h-[480px] items-center justify-center text-sm text-gray-400">
                Loading agreement...
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, index) => {
              const pageNumber = index + 1;
              const isTarget = dragOverPage === pageNumber;
              const hasSignature = placement?.page === pageNumber && signatureUrl;

              return (
                <div
                  key={`page_${pageNumber}`}
                  ref={(el) => {
                    pageRefs.current[pageNumber] = el;
                  }}
                  className="relative mb-2 bg-white"
                  style={{
                    outline: isTarget ? "2px dashed #1D4ED8" : "none",
                    outlineOffset: -2,
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                    setDragOverPage(pageNumber);
                  }}
                  onDragLeave={() =>
                    setDragOverPage((current) =>
                      current === pageNumber ? null : current,
                    )
                  }
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOverPage(null);

                    if (!event.dataTransfer.getData("application/x-signature")) {
                      return;
                    }

                    placeAt(pageNumber, event.clientX, event.clientY);
                  }}
                  // Tapping also places it, so this works without a mouse.
                  onClick={(event) => {
                    if (!signatureUrl || placement) return;
                    placeAt(pageNumber, event.clientX, event.clientY);
                  }}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />

                  {hasSignature && (
                    <div
                      className="group absolute"
                      style={{
                        left: `${placement.xPct}%`,
                        top: `${placement.yPct}%`,
                        width: "22%",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <img
                        src={signatureUrl}
                        alt="Your signature"
                        draggable={false}
                        className="pointer-events-none h-auto w-full select-none"
                      />

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onClear?.();
                        }}
                        title="Remove signature"
                        className="absolute -top-2 -right-2 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                      >
                        <Close style={{ fontSize: 10 }} />
                      </button>
                    </div>
                  )}

                  <span className="absolute right-2 bottom-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
                    {pageNumber} / {numPages}
                  </span>
                </div>
              );
            })}
          </Document>
        </div>
      )}
    </div>
  );
}
