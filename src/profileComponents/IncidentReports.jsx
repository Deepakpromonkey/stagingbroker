import { useCallback, useEffect, useState } from "react";

import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import EastOutlined from "@mui/icons-material/EastOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import CircularProgress from "@mui/material/CircularProgress";

import { apiFetch, apiDownload } from "../lib/api";

/**
 * Incident reports filed against this carrier, by any broker.
 *
 * The list is deliberately not limited to the viewing company: a report is
 * only worth filing if the next broker to look at this carrier can see it.
 * What a private report withholds — who filed it, and its attachments — is
 * stripped by the API before it is serialised, so there is nothing sensitive
 * here to hide in the markup; `reported_by_company` simply arrives null.
 */
export default function IncidentReports({ rowId, reloadKey = 0 }) {
  /*
  | One piece of state stamped with the request that produced it, rather than
  | separate reports/loading/error flags. Loading is then derived — the answer
  | on screen is for an older key than the one being asked for — which keeps
  | the effect free of the synchronous setState that resetting three flags on
  | every rowId change would need.
  */
  const [result, setResult] = useState({ key: null, reports: [], error: "" });
  const [downloading, setDownloading] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  const requestKey = rowId ? `${rowId}:${reloadKey}` : null;
  const loading = !!rowId && result.key !== requestKey;
  const error = result.error || downloadError;

  useEffect(
    function () {
      if (!rowId) return undefined;

      let cancelled = false;

      apiFetch(`/carrier-reports?row_id=${encodeURIComponent(rowId)}`, {
        method: "GET",
      })
        .then(function (res) {
          if (cancelled) return;

          setResult({
            key: requestKey,
            reports: Array.isArray(res?.data) ? res.data : [],
            error: "",
          });
        })
        .catch(function (err) {
          if (cancelled) return;

          setResult({
            key: requestKey,
            reports: [],
            error: err?.message || "Could not load incident reports.",
          });
        });

      return function () {
        cancelled = true;
      };
    },
    [rowId, requestKey],
  );

  const reports = result.reports;

  /*
  | The attachment sits behind the same auth as every other call, so it cannot
  | be a plain href — the bearer token would never be sent. apiDownload fetches
  | it with the auth headers and hands the blob to the browser.
  |
  | Keyed on the document uuid rather than a single boolean so one slow file
  | does not put a spinner on every row.
  */
  const download = useCallback(async function (file) {
    setDownloading(file.uuid);
    setDownloadError("");

    try {
      await apiDownload(
        `/carrier-reports/documents/${file.uuid}`,
        file.name || "attachment",
      );
    } catch (err) {
      setDownloadError(err?.message || "Could not download that attachment.");
    } finally {
      setDownloading(null);
    }
  }, []);

  const place = (location) =>
    [location?.city, location?.state, location?.country]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm">
      <div className="flex flex-col gap-[16px] px-[18px] py-[18px] sm:flex-row sm:items-center sm:justify-between sm:px-[24px] sm:py-[22px] xl:px-[32px] xl:py-[24px]">
        <div className="flex items-center gap-[10px] text-[#1656b8]">
          <ReportProblemOutlined sx={{ fontSize: 20 }} />

          <span className="text-[12px] font-[800] tracking-tight uppercase sm:text-[13px]">
            Incident Reports
          </span>
        </div>

        {!loading && !error && (
          <span className="text-[12px] font-semibold text-[#6B7280]">
            {reports.length === 1 ? "1 report" : `${reports.length} reports`}
          </span>
        )}
      </div>

      <div className="border-t border-[#EEF2F7] px-[18px] py-[18px] sm:px-[24px] sm:py-[22px] xl:px-[32px]">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <CircularProgress size={24} />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ReportProblemOutlined
              sx={{ fontSize: 44 }}
              className="text-[#E2E8F0]"
            />

            <p className="mt-3 max-w-[320px] text-[13px] text-[#6B7280]">
              No incident reports have been filed against this carrier.
            </p>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="flex flex-col gap-4">
            {reports.map(function (report) {
              return (
                <article
                  key={report.uuid}
                  className="rounded-[12px] border border-[#E5EAF2] bg-[#FAFBFD] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-[#111827]">
                          {report.incident_date || "Date not recorded"}
                        </span>

                        {report.is_own_company && (
                          <span className="rounded-full bg-[#1656b8]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#1656b8] uppercase">
                            Filed by you
                          </span>
                        )}

                        {report.is_private && (
                          <span className="flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#6B7280] uppercase">
                            <LockOutlined sx={{ fontSize: 12 }} />
                            Private
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[#4B5563]">
                        <span>{place(report.origin)}</span>
                        <EastOutlined
                          sx={{ fontSize: 14 }}
                          className="text-[#9CA3AF]"
                        />
                        <span>{place(report.destination)}</span>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] text-[#9CA3AF]">
                      Reported {report.reported_at}
                    </span>
                  </div>

                  {report.incident_labels?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {report.incident_labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-2 py-1 text-[11px] font-semibold text-[#92400E]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  {report.comments && (
                    <p className="mt-3 text-[13px] leading-relaxed whitespace-pre-line text-[#374151]">
                      {report.comments}
                    </p>
                  )}

                  {report.documents?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.documents.map(function (file) {
                        // Null means the API withheld it — a private report's
                        // evidence stays inside the filing company. Listed
                        // anyway, so a reader can see the report is backed up.
                        const locked = !file.download_url;

                        return (
                          <button
                            key={file.uuid}
                            type="button"
                            disabled={locked || downloading === file.uuid}
                            onClick={() => download(file)}
                            title={
                              locked
                                ? "Attachment withheld on a private report"
                                : `Download ${file.name}`
                            }
                            className="flex max-w-full items-center gap-2 rounded-lg border border-[#E5EAF2] bg-white px-2.5 py-1.5 text-[12px] text-[#374151] transition-colors hover:border-[#1656b8] hover:text-[#1656b8] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#E5EAF2] disabled:hover:text-[#374151]"
                          >
                            {downloading === file.uuid ? (
                              <CircularProgress size={13} />
                            ) : locked ? (
                              <LockOutlined sx={{ fontSize: 14 }} />
                            ) : (
                              <DescriptionOutlined sx={{ fontSize: 14 }} />
                            )}

                            <span className="truncate">{file.name}</span>

                            {!locked && (
                              <DownloadOutlined
                                sx={{ fontSize: 14 }}
                                className="text-[#9CA3AF]"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 border-t border-[#EEF2F7] pt-2.5 text-[11px] text-[#6B7280]">
                    {report.reported_by_company ? (
                      <>
                        Filed by{" "}
                        <span className="font-semibold text-[#374151]">
                          {report.reported_by_company}
                        </span>
                        {report.reported_by ? ` · ${report.reported_by}` : ""}
                      </>
                    ) : (
                      "Reporting company withheld"
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
