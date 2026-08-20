import { useState } from "react";

import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import CircularProgress from "@mui/material/CircularProgress";

import CarrierImportModal from "./CarrierImportModal";
import { apiDownload } from "../lib/api";

/**
 * The import/export pair shown above the shortlist and the blocklist.
 *
 * Both lists hit the same two endpoints and differ only by `type`, so the
 * buttons live here rather than being copied into each page.
 */
export default function CarrierListActions({
  type = "monitored",
  onSuccess,
  onError,
  onImported,
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting) return;

    setExporting(true);

    try {
      // apiDownload — not apiFetch. The endpoint streams a CSV, and apiFetch
      // would try to JSON.parse it and throw on the first line.
      await apiDownload(
        `/carriers/export?type=${type}`,
        `${type}_carriers.csv`,
      );

      onSuccess?.("Export downloaded.");
    } catch (err) {
      onError?.(err.message || "The export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#344054] transition-colors hover:bg-gray-50"
        >
          <FileUploadOutlined className="!text-[18px]" />
          Import CSV
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#344054] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? (
            <CircularProgress size={16} sx={{ color: "#344054" }} />
          ) : (
            <FileDownloadOutlined className="!text-[18px]" />
          )}
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <CarrierImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        type={type}
        onImported={onImported}
      />
    </>
  );
}
