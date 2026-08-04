import React, { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import IconButton from "@mui/material/IconButton";
import { Add } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { apiFetch } from "../../../lib/api";

const SHIPMENTS_ENDPOINT = "/shipments";
const TOTALS_ENDPOINT = "/app/shipment/load_search_total";


const TRACKING_METHOD_LABELS = {
  driver_phone: "Driver's Cell Phone",
  eld: "ELD / Telematics",
  gps: "Trailer GPS",
};

const DRIVER_TYPE_LABELS = {
  company_driver: "Company Driver",
  leased_owner_operator: "Owner Operator (Leased)",
  independent_owner_operator: "Owner Operator (Independent)",
  other_company_driver: "Other Carrier Driver",
};

const STATUS_STYLES = {
  pending: { className: "bg-indigo-50 text-indigo-700" },
  draft: { className: "bg-slate-100 text-slate-600" },
  active: { className: "bg-teal-50 text-teal-700" },
  awaiting_pickup: { className: "bg-orange-50 text-orange-600" },
  in_transit: { className: "bg-blue-50 text-blue-600" },
  delivered: { className: "bg-green-50 text-green-600" },
  cancelled: { className: "bg-red-50 text-red-600" },
  canceled: { className: "bg-red-50 text-red-600" },
};

function normalizeStatusKey(status) {
  return String(status || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function statusLabel(status) {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const StatusBadge = ({ status }) => {
  const key = normalizeStatusKey(status);
  const matchedKey = Object.keys(STATUS_STYLES).find((k) => key.includes(k));
  const className = (matchedKey && STATUS_STYLES[matchedKey].className) || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold  ${className}`}>
      {statusLabel(status)}
    </span>
  );
};

// Fetches a page of shipments the same way Dashboard.loadShipments() does,
// plus the real record count from the totals endpoint.
function useShipments(pageIndex, pageSize) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const page = pageIndex + 1;
    const query = `page=${page}&per_page=${pageSize}&sort_by=shipment.added_on&sort_order=desc`;

    apiFetch(`${SHIPMENTS_ENDPOINT}?${query}`)
      .then((shipmentsRes) => {
        if (cancelled) return;
        if (shipmentsRes && shipmentsRes.status) {
          const records = Array.isArray(shipmentsRes.data) ? shipmentsRes.data : [];
          setRows(records);

          setTotal((prev) => (prev > 0 ? prev : records.length));
        } else {
          setRows([]);
        }
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    apiFetch(TOTALS_ENDPOINT)
      .then((totalsRes) => {
        if (cancelled) return;
        if (totalsRes && totalsRes.status) {
          setTotal(Number(totalsRes.all_shipment) || 0);
        }
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [pageIndex, pageSize]);

  return { rows, total, loading };
}

const columnHelper = createColumnHelper();

export default function LoadSearch() {

  const navigate = useNavigate();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { rows, total, loading } = useShipments(pageIndex, pageSize);

  const columns = useMemo(
    () => [
      columnHelper.accessor("shipment_no", {
        header: "Shipment Number",
        cell: (info) => (
          <span className="text-sm font-bold text-blue-700 ">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor((row) => row.carrier_name || row.carrier_mc || row.carrier_dot || "—", {
        id: "carrier",
        header: "Carrier",
        cell: (info) => <span className="text-sm font-bold text-slate-800 ">{info.getValue()}</span>,
      }),
      columnHelper.accessor("pro_number", {
        header: "Pro # / Load ID",
        cell: (info) => <span className="text-sm text-slate-700 ">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("tracking_method", {
        header: "Tracking Method",
        cell: (info) => (
          <span className="text-sm text-slate-700 ">
            {TRACKING_METHOD_LABELS[info.getValue()] || info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("tracking_number", {
        header: "Tracking #",
        cell: (info) => <span className="text-sm font-semibold text-slate-800">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("driver_type", {
        header: "Driver Type",
        cell: (info) => (
          <span className="text-sm text-slate-700 ">
            {DRIVER_TYPE_LABELS[info.getValue()] || info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
    ],
    []
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14 ">
   <div className="mb-8 flex items-start justify-between">
  <div>
    <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">
      Load Search
    </h1>

    <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
      Monitor and manage all active shipment lifecycles with real-time driver authorization and status tracking.
    </p>
  </div>

  {/* Right Side */}
<button
  onClick={() => navigate("/trackshipment/step1")}
  className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-[15px] font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
>
  <Add sx={{ fontSize: 20 }} />
  New Tracking
</button>
</div>

      <div className="mb-6 flex flex-wrap items-center justify-end gap-4">



        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FormatListBulletedIcon sx={{ fontSize: 18 }} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Records</p>
            <p className="text-base font-bold text-slate-900">{total} Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Display:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-slate-400">
            {rangeStart}-{rangeEnd} of {total}
          </span>
          <IconButton
            size="small"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            sx={{ color: "#94a3b8" }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={pageIndex + 1 >= pageCount}
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            sx={{ color: "#94a3b8" }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading shipments…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-slate-400">
                    No shipments found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.original.uuid || row.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 cursor-pointer"
                    onClick={() => {
                      if (row.original.uuid) {
                        window.location.href = `/shipment/${row.original.uuid}`;
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}