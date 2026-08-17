import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ScheduleSend from "@mui/icons-material/ScheduleSend";
import HourglassTop from "@mui/icons-material/HourglassTop";
import GppMaybe from "@mui/icons-material/GppMaybe";
import TimerOff from "@mui/icons-material/TimerOff";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
import ChevronRight from "@mui/icons-material/ChevronRight";
import ExpandMore from "@mui/icons-material/ExpandMore";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import DrawOutlined from "@mui/icons-material/DrawOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";

import { apiFetch, apiDownload } from "../../../lib/api";

// Keys match the `stage` the API derives, so the two can never drift.
const STAGES = [
  { key: "all", label: "All", icon: <GroupsOutlined sx={{ fontSize: 18 }} />, tone: "text-[#1F2937]", chip: "bg-gray-100 text-gray-700" },
  { key: "invited", label: "Invited", icon: <ScheduleSend sx={{ fontSize: 18 }} />, tone: "text-[#1E40AF]", chip: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "in_progress", label: "In progress", icon: <HourglassTop sx={{ fontSize: 18 }} />, tone: "text-[#B45309]", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "completed", label: "Onboarded", icon: <CheckCircle sx={{ fontSize: 18 }} />, tone: "text-[#047857]", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "declined", label: "ID check failed", icon: <GppMaybe sx={{ fontSize: 18 }} />, tone: "text-[#B91C1C]", chip: "bg-red-50 text-red-700 border-red-200" },
  { key: "expired", label: "Expired", icon: <TimerOff sx={{ fontSize: 18 }} />, tone: "text-[#6B7280]", chip: "bg-gray-100 text-gray-600 border-gray-200" },
];

const stageMeta = (key) => STAGES.find((s) => s.key === key) || STAGES[0];

/**
 * Everything the carrier handed over, flattened into one list.
 *
 * The W-9 and COI live in `documents`; the factoring notice and the signature
 * are columns on the request itself, so they are folded in here rather than
 * being rendered as three separate special cases in the table.
 */
function carrierFiles(item) {
  const files = (item.documents || []).map((document) => ({
    type: document.type,
    label: document.label,
    name: document.name,
    icon: <DescriptionOutlined sx={{ fontSize: 18 }} />,
  }));

  if (item.factoring?.download_url) {
    files.push({
      type: "factoring",
      label: "Notice of Assignment",
      name: item.factoring.document_name || "notice-of-assignment.pdf",
      icon: <ReceiptLongOutlined sx={{ fontSize: 18 }} />,
    });
  }

  if (item.signature_url) {
    files.push({
      type: "signature",
      label: "E-signature",
      name: "signature.png",
      icon: <DrawOutlined sx={{ fontSize: 18 }} />,
    });
  }

  return files;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

/**
 * Shared modal shell — centered card over a dim backdrop, closes on
 * backdrop click or the X button. Kept local since this is the only
 * place that needs one right now.
 */
function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-[#F1F5F9] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[#111827]">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[#6B7280]">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[#F1F5F9] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Every carrier this company has invited, and how far each one got.
 *
 * Scoped to the company by the API, so a teammate's invitations show up here
 * too rather than only the ones the signed-in user sent.
 */
export default function ConnectedCarriers() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});

  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");

  const [expanded, setExpanded] = useState(null);
  const [downloading, setDownloading] = useState(null);

  // Import / Export modals — UI only for now, no API wired up yet.
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [exportScope, setExportScope] = useState("filtered");
  const fileInputRef = useRef(null);

  const closeImportModal = () => {
    setImportOpen(false);
    setImportFile(null);
    setDragActive(false);
  };

  const closeExportModal = () => {
    setExportOpen(false);
    setExportScope("filtered");
  };

  const handleFileChosen = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMessage("Please choose a .csv file.");
      return;
    }

    setImportFile(file);
  };

  const downloadCarrierFile = async (uuid, file) => {
    setDownloading(`${uuid}:${file.type}`);

    try {
      await apiDownload(
        `/carrier-connect/${uuid}/files/${file.type}`,
        file.name,
      );
    } catch (err) {
      setErrorMessage(err?.message || "Could not download that document.");
    } finally {
      setDownloading(null);
    }
  };

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    apiFetch("/carrier-connect", { method: "GET" })
      .then((res) => {
        setRequests(res?.data?.requests || []);
        setSummary(res?.data?.summary || {});
      })
      .catch((err) => {
        setErrorMessage(err?.message || "Could not load connected carriers.");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  // Filtered client side so switching tabs is instant — the API already
  // returned the company's full set with its stage on each row.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests.filter((item) => {
      if (stage !== "all" && item.stage !== stage) return false;

      if (!term) return true;

      return [
        item.carrier?.legal_name,
        item.carrier?.dot_number,
        item.carrier?.email,
        item.invited_by,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [requests, stage, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-6 md:px-8 md:py-8">
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
            Connected Carriers
          </h1>

          <p className="mt-1 text-sm text-[#6B7280]">
            Every carrier your company has invited, and how far each one has got
            through onboarding.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-auto">
            <SearchIcon
              sx={{ fontSize: 18 }}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, DOT or email"
              className="h-10 w-full sm:w-64 rounded-lg border border-[#E5E7EB] bg-white pr-3 pl-9 text-sm text-[#1F2937] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-gray-50"
            >
              <FileUploadOutlined sx={{ fontSize: 18 }} />
              Import
            </button>

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-gray-50"
            >
              <FileDownloadOutlined sx={{ fontSize: 18 }} />
              Export
            </button>

            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshIcon
                sx={{ fontSize: 18 }}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stage tabs */}
      <div className="mb-6 flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {STAGES.map((item) => {
          const count = summary[item.key] ?? 0;
          const isActive = stage === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStage(item.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1E40AF]"
                  : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#CBD5E1]"
              }`}
            >
              <span className={isActive ? "text-[#1D4ED8]" : "text-gray-400"}>
                {item.icon}
              </span>

              {item.label}

              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? "bg-[#1D4ED8] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#FAFBFD]">
                {[
                  "Carrier",
                  "DOT",
                  "Status",
                  "Progress",
                  "Invited by",
                  "Sent",
                  "Documents",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-xs font-bold tracking-wider text-[#9CA3AF] uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                [0, 1, 2, 3, 4].map((row) => (
                  <tr key={row} className="border-b border-[#F1F5F9]">
                    {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                      <td key={cell} className="px-4 py-4">
                        <Skeleton variant="text" height={20} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <GroupsOutlined
                      sx={{ fontSize: 64 }}
                      className="text-[#E2E8F0]"
                    />

                    <p className="mt-2 text-sm font-semibold text-[#4B5563]">
                      {requests.length === 0
                        ? "No carriers invited yet"
                        : "Nothing matches this filter"}
                    </p>

                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      {requests.length === 0
                        ? "Open a carrier profile and press Connect to invite them."
                        : "Try a different status or clear the search."}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((item) => {
                  const meta = stageMeta(item.stage);
                  const pct = Math.round(
                    ((item.steps_completed || 0) / (item.steps_total || 6)) * 100,
                  );

                  const files = carrierFiles(item);
                  const isOpen = expanded === item.uuid;

                  return (
                    <Fragment key={item.uuid}>
                    <tr
                      onClick={() =>
                        item.carrier?.row_id &&
                        navigate(`/carriers/${item.carrier.row_id}`)
                      }
                      className="cursor-pointer border-b border-[#F1F5F9] transition-colors last:border-0 hover:bg-[#FAFBFD]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1F2937]">
                            {item.carrier?.legal_name || "—"}
                          </span>

                          {item.identity_risk_flagged && (
                            <span
                              title="Verification came from a VPN or data centre"
                              className="flex items-center"
                            >
                              <WarningAmber
                                sx={{ fontSize: 16 }}
                                className="text-amber-500"
                              />
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 text-xs text-[#9CA3AF]">
                          {item.carrier?.email || "no email on file"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-[#4B5563]">
                        {item.carrier?.dot_number || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.chip}`}
                        >
                          {item.stage_label || meta.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${
                                item.stage === "completed"
                                  ? "bg-emerald-500"
                                  : item.stage === "declined"
                                    ? "bg-red-400"
                                    : "bg-[#1D4ED8]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <span className="text-xs text-[#6B7280]">
                            {item.steps_completed || 0}/{item.steps_total || 5}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-[#4B5563]">
                        {item.invited_by || "—"}
                      </td>

                      <td className="px-4 py-4 text-sm text-[#4B5563]">
                        {formatDate(item.sent_on)}

                        {item.stage === "invited" && item.expires_at && (
                          <div className="mt-0.5 text-xs text-[#9CA3AF]">
                            expires {formatDate(item.expires_at)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Stops the row's navigate-to-profile handler. */}
                          <button
                            type="button"
                            disabled={files.length === 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpanded(isOpen ? null : item.uuid);
                            }}
                            title={
                              files.length
                                ? `${files.length} document${files.length === 1 ? "" : "s"}`
                                : "No documents uploaded yet"
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                              files.length === 0
                                ? "cursor-not-allowed border-gray-100 text-gray-300"
                                : "border-gray-200 text-[#4B5563] hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                            }`}
                          >
                            <DescriptionOutlined sx={{ fontSize: 15 }} />
                            {files.length}

                            <ExpandMore
                              sx={{ fontSize: 15 }}
                              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                          </button>

                          <ChevronRight
                            sx={{ fontSize: 20 }}
                            className="text-gray-300"
                          />
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="border-b border-[#F1F5F9] bg-[#FAFBFD]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                              Documents from {item.carrier?.legal_name || "this carrier"}
                            </span>

                            <span className="flex items-center gap-3">
                              {item.signed_at && (
                                <span className="text-xs text-[#047857]">
                                  Agreement signed {formatDate(item.signed_at)}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {files.map((file) => {
                              const busy =
                                downloading === `${item.uuid}:${file.type}`;

                              return (
                                <button
                                  key={file.type}
                                  type="button"
                                  disabled={busy}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    downloadCarrierFile(item.uuid, file);
                                  }}
                                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left transition-colors hover:border-[#1D4ED8] disabled:opacity-50"
                                >
                                  <span className="rounded-lg bg-[#F1F5F9] p-2 text-[#1D4ED8]">
                                    {file.icon}
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-[#1F2937]">
                                      {file.label}
                                    </span>

                                    <span className="block truncate text-xs text-[#9CA3AF]">
                                      {file.name}
                                    </span>
                                  </span>

                                  <DownloadOutlined
                                    sx={{ fontSize: 18 }}
                                    className="text-gray-400"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && visible.length > 0 && (
        <p className="mt-3 text-xs text-[#9CA3AF]">
          Showing {visible.length} of {requests.length} carriers.
        </p>
      )}

      {/* Import modal — UI shell only, no API call wired up yet */}
      {importOpen && (
        <Modal
          title="Import carriers"
          subtitle="Upload a CSV to bulk-invite carriers."
          onClose={closeImportModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeImportModal}
                className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!importFile}
                onClick={() => {
                  // TODO: wire up to the import API once it exists.
                  closeImportModal();
                }}
                className="h-9 rounded-lg bg-[#1D4ED8] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                Import
              </button>
            </>
          }
        >
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              handleFileChosen(event.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
              dragActive
                ? "border-[#1D4ED8] bg-[#EFF6FF]"
                : "border-[#E5E7EB] bg-[#FAFBFD] hover:border-[#CBD5E1]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(event) => handleFileChosen(event.target.files)}
            />

            {importFile ? (
              <>
                <InsertDriveFileOutlined
                  sx={{ fontSize: 32 }}
                  className="text-[#1D4ED8]"
                />
                <p className="text-sm font-semibold text-[#1F2937]">
                  {importFile.name}
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  {(importFile.size / 1024).toFixed(1)} KB — click to choose a
                  different file
                </p>
              </>
            ) : (
              <>
                <CloudUploadOutlined
                  sx={{ fontSize: 32 }}
                  className="text-gray-400"
                />
                <p className="text-sm font-semibold text-[#1F2937]">
                  Drag and drop a CSV, or click to browse
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  Columns: legal_name, dot_number, email
                </p>
              </>
            )}
          </div>

          <p className="mt-3 text-xs text-[#9CA3AF]">
            Import isn't connected yet — this is a preview of the flow.
          </p>
        </Modal>
      )}

      {/* Export modal — UI shell only, no API call wired up yet */}
      {exportOpen && (
        <Modal
          title="Export carriers"
          subtitle="Download the carrier list as a CSV."
          onClose={closeExportModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeExportModal}
                className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3.5 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  // TODO: wire up to the export API once it exists.
                  closeExportModal();
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF]"
              >
                <FileDownloadOutlined sx={{ fontSize: 16 }} />
                Export CSV
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
                exportScope === "filtered"
                  ? "border-[#1D4ED8] bg-[#EFF6FF]"
                  : "border-[#E5E7EB] hover:border-[#CBD5E1]"
              }`}
            >
              <input
                type="radio"
                name="export-scope"
                checked={exportScope === "filtered"}
                onChange={() => setExportScope("filtered")}
                className="h-4 w-4"
              />
              <span>
                <span className="block font-semibold text-[#1F2937]">
                  Current view
                </span>
                <span className="block text-xs text-[#9CA3AF]">
                  {visible.length} carrier{visible.length === 1 ? "" : "s"}{" "}
                  matching the selected status and search
                </span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
                exportScope === "all"
                  ? "border-[#1D4ED8] bg-[#EFF6FF]"
                  : "border-[#E5E7EB] hover:border-[#CBD5E1]"
              }`}
            >
              <input
                type="radio"
                name="export-scope"
                checked={exportScope === "all"}
                onChange={() => setExportScope("all")}
                className="h-4 w-4"
              />
              <span>
                <span className="block font-semibold text-[#1F2937]">
                  All carriers
                </span>
                <span className="block text-xs text-[#9CA3AF]">
                  {requests.length} carrier{requests.length === 1 ? "" : "s"}{" "}
                  total, ignoring filters
                </span>
              </span>
            </label>
          </div>

          <p className="mt-3 text-xs text-[#9CA3AF]">
            Export isn't connected yet — this is a preview of the flow.
          </p>
        </Modal>
      )}
    </div>
  );
}