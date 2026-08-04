import { useState, useRef } from "react";

import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import Close from "@mui/icons-material/Close";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Upload an image of a wet signature instead of drawing one.
 *
 * Single file only, and images only — the backend stores this as the signature
 * itself, so a PDF here would never render onto the agreement.
 */
export default function ESignUpload({ onChange, disabled = false }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const accept = (incoming) => {
    if (!incoming) return;

    if (!ALLOWED_TYPES.includes(incoming.type)) {
      setError("Only PNG and JPG images are supported.");
      return;
    }

    if (incoming.size > MAX_BYTES) {
      setError("That image is larger than 2MB.");
      return;
    }

    setError("");

    // Replace, never accumulate — only one signature can be applied.
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(incoming);
    setPreviewUrl(URL.createObjectURL(incoming));

    onChange?.(incoming);
  };

  const remove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(null);
    setPreviewUrl(null);
    setError("");

    if (fileInputRef.current) fileInputRef.current.value = "";

    onChange?.(null);
  };

  const stop = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".png,.jpg,.jpeg"
        disabled={disabled}
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {!file ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragEnter={(event) => {
            stop(event);
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            stop(event);
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            stop(event);
            setIsDragging(false);
          }}
          onDrop={(event) => {
            stop(event);
            setIsDragging(false);
            if (!disabled) accept(event.dataTransfer.files?.[0]);
          }}
          className={`flex h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            disabled
              ? "cursor-not-allowed border-[#E5E7EB] bg-gray-50 opacity-60"
              : isDragging
                ? "cursor-pointer border-[#1D4ED8] bg-blue-50/40"
                : "cursor-pointer border-[#CBD5E1] bg-[#FAFBFD] hover:border-[#1D4ED8]"
          }`}
        >
          <FileUploadOutlined
            style={{ fontSize: 44 }}
            className="text-blue-100"
          />

          <p className="mt-2 text-sm text-[#4B5563]">
            <span className="font-semibold text-[#1D4ED8] underline">
              Choose an image
            </span>{" "}
            or drop it here
          </p>

          <p className="mt-1 text-xs text-[#9CA3AF]">PNG or JPG, up to 2MB</p>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-4">
          <div className="mb-3 flex h-[100px] items-center justify-center rounded-lg bg-white">
            <img
              src={previewUrl}
              alt="Your signature"
              className="max-h-[90px] max-w-full object-contain"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-[#1D4ED8]">
              <ImageOutlined style={{ fontSize: 20 }} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">
                {file.name}
              </p>
              <p className="text-xs text-gray-400">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>

            <button
              type="button"
              onClick={remove}
              disabled={disabled}
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
            >
              <Close style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
