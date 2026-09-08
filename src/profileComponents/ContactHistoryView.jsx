import { useEffect, useMemo, useState } from "react";
import {
  PersonOutlined,
  EmailOutlined,
  PhoneOutlined,
  PrintOutlined,
  LocationOnOutlined,
  GroupsOutlined,
  DownloadOutlined,
  HomeOutlined,
  BusinessOutlined,
  MailOutlined,
  CalendarMonthOutlined,
  ArrowForwardRounded,
  BadgeOutlined
} from "@mui/icons-material";

import { apiFetch } from "../lib/api";

const PAGE_SIZE = 25;

/*
| The five things FMCSA records a carrier's contact details under, in the order
| they are shown. `group` matches the key the API summarises by, which comes
| from the field names in the change log export itself.
*/
const GROUPS = [
  { key: "name", label: "Legal / DBA Name", icon: <BadgeOutlined /> },
  { key: "address", label: "Address", icon: <LocationOnOutlined /> },
  { key: "phone", label: "Phone", icon: <PhoneOutlined /> },
  { key: "fax", label: "Fax", icon: <PrintOutlined /> },
  { key: "email", label: "Email", icon: <EmailOutlined /> },
  { key: "contact", label: "Company Rep", icon: <GroupsOutlined /> }
];

const FILTERS = [{ key: "ALL", label: "All Changes" }].concat(
  GROUPS.map((group) => ({ key: group.key, label: group.label }))
);

function StatusBadge({ status }) {
  const styles = {
    VERIFIED: "bg-green-100 text-green-700",
    PRIMARY: "bg-blue-600 text-white",
    PRIOR: "bg-slate-100 text-slate-600",
    ACTIVE: "bg-blue-100 text-blue-700"
  };

  return (
    <span
      className={`shrink-0 rounded-full px-[10px] py-[3px] text-[9px] font-[800] uppercase ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "--"}
    </span>
  );
}

function AddressIcon({ type }) {
  const base =
    "flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px]";

  if (type === "Physical Address") {
    return (
      <div className={`${base} bg-blue-50 text-blue-600`}>
        <HomeOutlined />
      </div>
    );
  }

  if (type === "Mailing Address") {
    return (
      <div className={`${base} bg-slate-100 text-slate-500`}>
        <MailOutlined />
      </div>
    );
  }

  if (type === "Fax") {
    return (
      <div className={`${base} bg-blue-50 text-blue-600`}>
        <BusinessOutlined />
      </div>
    );
  }

  return (
    <div className={`${base} bg-blue-50 text-blue-600`}>
      <LocationOnOutlined />
    </div>
  );
}

function formatAddress(addressObj = {}) {
  return [
    addressObj?.street,
    addressObj?.city,
    addressObj?.state,
    addressObj?.zip,
    addressObj?.country
  ]
    .filter(Boolean)
    .join(", ");
}

/** "2026-07-18 10:50:45" -> "18 Jul 2026". Falls back to whatever it was given. */
function formatDate(iso, fallback) {
  if (!iso) {
    return fallback || "--";
  }

  const parsed = new Date(iso.replace(" ", "T"));

  if (Number.isNaN(parsed.getTime())) {
    return fallback || "--";
  }

  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function ContactHistoryView({ data = {} }) {
  const dotNumber = data?.dot_number;

  const [loaded, setLoaded] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Derived rather than cleared in the effect, so a carrier without a DOT
  // number never renders the previous carrier's history for a frame.
  const history = dotNumber ? loaded : null;

  useEffect(() => {
    if (!dotNumber) {
      return undefined;
    }

    let cancelled = false;

    setIsLoading(true);
    setFetchError("");
    setFilter("ALL");
    setVisible(PAGE_SIZE);

    apiFetch(`/carriers/${dotNumber}/contact-history`)
      .then((result) => {
        if (cancelled) return;
        setLoaded(result?.data || null);
      })
      .catch((error) => {
        if (cancelled) return;
        setFetchError(error?.message || "Could not load contact history.");
        setLoaded(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dotNumber]);

  // The carrier's contact details as they stand today, which the change log
  // does not carry — it only records the moments they moved.
  const addresses = useMemo(() => {
    const physical = formatAddress(data?.physical_address);
    const mailing = formatAddress(data?.mailing_address);

    return [
      { type: "Physical Address", status: "PRIMARY", address: physical || "--" },
      { type: "Mailing Address", status: "VERIFIED", address: mailing || "--" },
      { type: "Fax", status: "ACTIVE", address: data?.fax || "--" }
    ];
  }, [data]);

  const entries = useMemo(() => history?.entries || [], [history]);

  const filteredEntries = useMemo(
    () =>
      filter === "ALL"
        ? entries
        : entries.filter((entry) => entry.group === filter),
    [entries, filter]
  );

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `contact-history-${dotNumber || "carrier"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-[20px] rounded-[16px] border border-[#e5eaf1] bg-white p-[14px] sm:p-[20px] lg:space-y-[28px] lg:p-[24px]">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div>
          <h2 className="text-[15px] font-[800] text-[#0f172a] sm:text-[18px]">
            Audit Trail & Modifications
          </h2>

          <p className="mt-[4px] flex items-center gap-[6px] text-[11px] text-[#64748b]">
            <span className="h-[6px] w-[6px] rounded-full bg-green-500" />
            {isLoading
              ? "Loading FMCSA change history..."
              : `${history?.contact_changes ?? 0} contact changes on record${
                  history?.last_changed_at
                    ? `, last on ${formatDate(history.last_changed_at)}`
                    : ""
                }`}
          </p>
        </div>

        {!!entries.length && (
          <button
            onClick={exportHistory}
            className="flex items-center gap-[6px] rounded-[8px] border border-[#e5eaf1] px-[10px] py-[5px] text-[10px] font-[600] hover:bg-[#f8fafc]"
          >
            <DownloadOutlined sx={{ fontSize: 18 }} />
            Export History
          </button>
        )}
      </div>

      {/* How many times each contact point has moved. FMCSA-derived fields —
          region and county codes — are on the timeline but out of these counts,
          because they change on their own and would drown the real edits. */}
      <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3 lg:grid-cols-6 lg:gap-[16px]">
        {GROUPS.map(({ key, label, icon }) => {
          const item = history?.summary?.[key] || {};

          return (
            <div
              key={key}
              className="rounded-[14px] border border-[#e5eaf1] bg-white p-[16px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#eef4ff] text-[#2563eb]">
                  {icon}
                </div>

                {item.count > 0 && (
                  <span className="rounded-[6px] bg-blue-50 px-[8px] py-[2px] text-[9px] font-[800] text-blue-700">
                    CHANGED
                  </span>
                )}
              </div>

              <p className="mt-[15px] text-[10px] font-[500] text-[#64748b]">
                {label}
              </p>

              <p className="mt-[2px] text-[18px] font-[800] text-[#0f172a]">
                {isLoading ? "--" : (item.count ?? 0)}
                <span className="ml-[4px] text-[10px] font-[600] text-[#94a3b8]">
                  {item.count === 1 ? "change" : "changes"}
                </span>
              </p>

              <div className="my-[8px] h-[1px] w-full bg-[#e5eaf1]" />

              <div className="flex items-center gap-[6px] text-[10px] text-[#64748b]">
                <CalendarMonthOutlined sx={{ fontSize: 14 }} />
                {formatDate(item.last_changed_at)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-[14px]">
        <h3 className="text-[14px] font-[800] text-[#0f172a]">
          Current Contact Points
        </h3>

        {addresses.map((item, index) => (
          <div
            key={index}
            className={`flex items-start gap-[12px] rounded-[14px] border p-[14px] sm:gap-[16px] sm:p-[18px] ${
              item.status === "PRIMARY"
                ? "border-blue-300 bg-[#fbfdff]"
                : "border-[#e5eaf1]"
            }`}
          >
            <AddressIcon type={item.type} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-[8px]">
                <p className="text-[11px] font-[800] uppercase text-[#0f172a]">
                  {item.type}
                </p>
                <StatusBadge status={item.status} />
              </div>

              <p className="mt-[4px] break-words text-[13px] font-[500] text-[#0f172a]">
                {item.address}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-[14px]">
        <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[14px] font-[800] text-[#0f172a]">
            FMCSA Change History
          </h3>

          <div className="flex flex-wrap items-center gap-[6px]">
            {FILTERS.map((item) => {
              const count =
                item.key === "ALL"
                  ? entries.length
                  : entries.filter((entry) => entry.group === item.key).length;

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setFilter(item.key);
                    setVisible(PAGE_SIZE);
                  }}
                  className={`rounded-[8px] border px-[10px] py-[5px] text-[10px] font-[700] ${
                    filter === item.key
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]"
                      : "border-[#e5eaf1] text-[#64748b] hover:bg-[#f8fafc]"
                  }`}
                >
                  {item.label}
                  <span className="ml-[5px] text-[#94a3b8]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && (
          <div className="space-y-[10px]">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="h-[64px] animate-pulse rounded-[14px] bg-[#f1f5f9]"
              />
            ))}
          </div>
        )}

        {!isLoading && fetchError && (
          <div className="rounded-[14px] border border-red-200 bg-red-50/40 p-[24px] text-center">
            <p className="text-[13px] font-[600] text-red-600">{fetchError}</p>
          </div>
        )}

        {/* The export is indexed by a scheduled command, so a profile opened
            before that has run gets an explanation rather than an empty list. */}
        {!isLoading && !fetchError && history && !history.indexed && (
          <div className="rounded-[14px] border border-[#d9e1ee] bg-[#f8fafc] p-[24px] text-center">
            <p className="text-[13px] font-[700] text-[#1e3a8a]">
              Change history is not available yet
            </p>
            <p className="mt-[4px] text-[12px] text-[#64748b]">
              The FMCSA change log has not been indexed on this server.
            </p>
          </div>
        )}

        {!isLoading && !fetchError && history?.indexed && !filteredEntries.length && (
          <div className="rounded-[14px] border border-[#e5eaf1] bg-[#f8fafc] p-[24px] text-center">
            <p className="text-[13px] font-[600] text-[#94a3b8]">
              No contact changes recorded for this carrier
            </p>
          </div>
        )}

        {!isLoading &&
          filteredEntries.slice(0, visible).map((entry, index) => (
            <div
              key={`${entry.changed_at}-${entry.field}-${index}`}
              className="rounded-[14px] border border-[#e5eaf1] p-[14px] sm:p-[16px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-[8px]">
                <p className="text-[11px] font-[800] uppercase text-[#0f172a]">
                  {entry.field}
                </p>

                <div className="flex items-center gap-[8px]">
                  {entry.derived && (
                    <span className="rounded-full bg-slate-100 px-[8px] py-[2px] text-[9px] font-[700] uppercase text-slate-500">
                      FMCSA derived
                    </span>
                  )}

                  <span className="text-[10px] font-[600] text-[#64748b]">
                    {formatDate(entry.changed_at_iso, entry.changed_at)}
                  </span>
                </div>
              </div>

              <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
                <span className="break-all rounded-[8px] bg-[#f8fafc] px-[10px] py-[4px] text-[12px] font-[500] text-[#94a3b8] line-through">
                  {entry.old_value || "Not set"}
                </span>

                <ArrowForwardRounded sx={{ fontSize: 15 }} className="text-[#cbd5e1]" />

                <span className="break-all rounded-[8px] bg-[#eff6ff] px-[10px] py-[4px] text-[12px] font-[700] text-[#1d4ed8]">
                  {entry.new_value || "Removed"}
                </span>
              </div>

              <p className="mt-[8px] flex items-center gap-[5px] text-[10px] text-[#94a3b8]">
                <PersonOutlined sx={{ fontSize: 13 }} />
                {entry.changed_by || "Unknown"}
                {entry.category ? ` · ${entry.category}` : ""}
              </p>
            </div>
          ))}

        {!isLoading && filteredEntries.length > visible && (
          <button
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
            className="w-full rounded-[10px] border border-[#e5eaf1] py-[10px] text-[11px] font-[700] text-[#1d4ed8] hover:bg-[#f8fafc]"
          >
            Show {Math.min(PAGE_SIZE, filteredEntries.length - visible)} more of{" "}
            {filteredEntries.length}
          </button>
        )}

        {!isLoading && history?.truncated && (
          <p className="text-center text-[10px] text-[#94a3b8]">
            Showing the most recent {entries.length} of {history.total_changes}{" "}
            recorded changes.
          </p>
        )}
      </div>
    </div>
  );
}
