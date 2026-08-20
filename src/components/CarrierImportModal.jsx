import { useRef, useState } from "react";

import Close from "@mui/icons-material/Close";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import CircularProgress from "@mui/material/CircularProgress";

import { apiFetch } from "../lib/api";

// Mirrors the API's own rule (`file|mimes:csv,txt|max:10240`). Checking here
// too keeps a 10MB upload from crossing the wire only to be rejected.
const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPES = ".csv,.txt";

const COPY = {
  monitored: {
    title: "Import monitored carriers",
    blurb:
      "Upload a CSV of DOT numbers to add carriers to your shortlist in one go.",
    accent: "text-[#2953E4]",
    accentBg: "bg-[#EEF2FF]",
  },
  blocked: {
    title: "Import blocked carriers",
    blurb:
      "Upload a CSV of DOT numbers to add carriers to your blocklist in one go.",
    accent: "text-[#B42318]",
    accentBg: "bg-[#FEECEB]",
  },
};

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Bulk-adds carriers to the shortlist or the blocklist from a CSV.
 *
 * The API matches rows on DOT number and ignores every other column, so the
 * only real requirement on the file is a DOT column — which is why the hint
 * below lists the header spellings the backend actually recognises rather
 * than asking for a rigid template.
 */
export default function CarrierImportModal({
  isOpen,
  onClose,
  type = "monitored",
  onImported,
}) {
  const copy = COPY[type] ?? COPY.monitored;

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The component stays mounted while closed, so state has to be cleared on
  // the way out — otherwise the next open still shows the previous run's file
  // and error. Resetting here rather than in an effect keyed on isOpen avoids
  // a second render pass every time the modal closes.
  function handleClose() {
    if (submitting) return;

    setFile(null);
    setError("");
    onClose?.();
  }

  function pickFile(selected) {
    if (!selected) return;

    const name = selected.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
      setError("Please choose a .csv file.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`That file is larger than ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setError("");
    setFile(selected);
  }

  async function handleSubmit() {
    if (!file || submitting) return;

    setSubmitting(true);
    setError("");

    // Multipart, not JSON — apiFetch detects the FormData body and leaves
    // Content-Type to the browser so the boundary is set correctly.
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);

    try {
      const res = await apiFetch("/carriers/bulk-import", {
        method: "POST",
        body: formData,
      });

      // A file whose DOT numbers match nothing still comes back 200/success
      // with total_matched absent, so the count has to be read defensively —
      // reporting "undefined carriers imported" would be worse than silence.
      onImported?.({
        message: res?.message || "Import complete.",
        total: res?.total_matched ?? 0,
      });

      setFile(null);
      onClose?.();
    } catch (err) {
      setError(err.message || "The import failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#F1F5F9] px-6 py-5">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${copy.accentBg} ${copy.accent}`}
            >
              <CloudUploadOutlined style={{ fontSize: 20 }} />
            </span>

            <div>
              <h3 className="text-xl font-bold tracking-tight text-[#111827]">
                {copy.title}
              </h3>
              <p className="mt-1 text-sm text-[#6B7280]">{copy.blurb}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <Close style={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              // Reset so re-picking the same file still fires onChange.
              e.target.value = "";
            }}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 transition-colors hover:border-[#2953E4] hover:bg-[#F5F7FF]"
            >
              <CloudUploadOutlined className="!text-[28px] text-[#98A2B3]" />
              <span className="text-sm font-semibold text-[#344054]">
                Click to upload or drag a CSV here
              </span>
              <span className="text-xs text-[#98A2B3]">
                CSV up to {MAX_FILE_SIZE_MB}MB
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <InsertDriveFileOutlined className="!text-[22px] text-[#2953E4]" />

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#101828]">
                  {file.name}
                </div>
                <div className="text-xs text-[#667085]">
                  {formatFileSize(file.size)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={submitting}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:opacity-40"
              >
                <Close style={{ fontSize: 18 }} />
              </button>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-[#E4E7EC] bg-white px-4 py-3">
            <div className="text-xs font-semibold tracking-wide text-[#6B7280] uppercase">
              File format
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">
              The file needs one column of DOT numbers, headed{" "}
              <code className="rounded bg-[#F2F4F7] px-1 py-0.5 text-[12px]">
                DOT
              </code>
              ,{" "}
              <code className="rounded bg-[#F2F4F7] px-1 py-0.5 text-[12px]">
                DOT Number
              </code>
              ,{" "}
              <code className="rounded bg-[#F2F4F7] px-1 py-0.5 text-[12px]">
                dot_number
              </code>{" "}
              or{" "}
              <code className="rounded bg-[#F2F4F7] px-1 py-0.5 text-[12px]">
                USDOT
              </code>
              . Any other columns are ignored, and carriers already on the list
              are left as they are.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#F1F5F9] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg border border-[#D0D5DD] px-4 py-2.5 text-sm font-semibold text-[#344054] transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2953E4] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3FB8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && <CircularProgress size={14} sx={{ color: "#fff" }} />}
            {submitting ? "Importing…" : "Import carriers"}
          </button>
        </div>
      </div>
    </div>
  );
}
