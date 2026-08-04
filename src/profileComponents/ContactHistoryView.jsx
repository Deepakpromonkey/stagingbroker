import React, { useMemo, useState } from "react";
import {
  PersonOutlined,
  EmailOutlined,
  PhoneOutlined,
  LocationOnOutlined,
  GroupsOutlined,
  DownloadOutlined,
  HomeOutlined,
  BusinessOutlined,
  MailOutlined,
  CalendarMonthOutlined
} from "@mui/icons-material";

function SummaryStatus({ status }) {
  const key = status?.toLowerCase();

  const styles = {
    update: "bg-blue-50 text-gray-600",
    active: "bg-blue-100 text-blue-700",
    verified: "bg-green-100 text-green-700",
    prior: "bg-slate-100 text-slate-600"
  };

  return (
    <span
      className={`rounded-[6px] px-[8px] py-[2px] text-[9px] font-[800] ${
        styles[key] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "--"}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    VERIFIED: "bg-green-100 text-green-700",
    PRIMARY: "bg-blue-600 text-white",
    PRIOR: "bg-slate-100 text-slate-600",
    ACTIVE: "bg-blue-100 text-blue-700"
  };

  return (
    <span
      className={`rounded-full px-[10px] py-[3px] text-[9px] font-[800] uppercase ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "--"}
    </span>
  );
}

function AddressIcon({ type }) {
  const base =
    "flex h-[36px] w-[36px] items-center justify-center rounded-[10px]";

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

export default function ContactHistoryView({ data = {} }) {
  const [filter, setFilter] = useState("ALL");

  const contactHistory = useMemo(() => {
    const physicalAddress = formatAddress(data?.physical_address);
    const mailingAddress = formatAddress(data?.mailing_address);

    const addressEntries = [
      {
        type: "Physical Address",
        status: "PRIMARY",
        address: physicalAddress || "--",
        // period: "Current physical address"
      },
      {
        type: "Mailing Address",
        status: "VERIFIED",
        address: mailingAddress || "--",
        // period: "Current mailing address"
      },
      {
        type: "Fax",
        status: "ACTIVE",
        address: data?.fax || "--",
        // period: "Current fax number"
      }
    ];

    return {
      ...data,
      lastUpdated: data?.lastUpdated || "--",
      summary: data?.summary || {},
      addresses: addressEntries
    };
  }, [data]);

  const summary = contactHistory.summary || {};
  const addresses = contactHistory.addresses || [];

  const filteredAddresses =
    filter === "ALL"
      ? addresses
      : addresses.filter((a) => a.status === filter);

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(addresses, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contact-history.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-[28px] rounded-[16px] border border-[#e5eaf1] bg-white p-[24px]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-[800] text-[#0f172a]">
            Audit Trail & Modifications
          </h2>
          {/* <p className="mt-[4px] flex items-center gap-[6px] text-[11px] text-[#64748b]">
            <span className="h-[6px] w-[6px] rounded-full bg-green-500" />
            {addresses.length} Total contact changes with last change on{" "}
            {contactHistory.lastUpdated || "--"}
          </p> */}
        </div>

        {/* <button
          onClick={exportHistory}
          className="flex items-center gap-[6px] rounded-[8px] border border-[#e5eaf1] px-[10px] py-[5px] text-[10px] font-[600]"
        >
          <DownloadOutlined sx={{ fontSize: 18 }} />
          Export History
        </button> */}
      </div>
<div className="mt-[16px] rounded-[12px] border border-[#d9e1ee] bg-[#f8fafc] px-[20px] py-[24px] text-center">
  <p className="text-[18px] font-[700] text-[#1e3a8a]">
    WORKING ON IT
  </p>

  <p className="mt-[6px] text-[13px] text-[#64748b]">
    This section is currently under development.
  </p>
</div>

      {/* <div className="grid grid-cols-5 gap-[16px]">
        {[
          { key: "name", label: "Name", icon: <PersonOutlined /> },
          { key: "email", label: "Email", icon: <EmailOutlined /> },
          { key: "phone", label: "Phone", icon: <PhoneOutlined /> },
          { key: "address", label: "Address", icon: <LocationOnOutlined /> },
          { key: "contact", label: "Contact", icon: <GroupsOutlined /> }
        ].map(({ key, label, icon }) => {
          const item = summary[key] || {};

          return (
            <div
              key={key}
              className="rounded-[14px] border border-[#e5eaf1] bg-white p-[16px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#eef4ff] text-[#2563eb]">
                  {icon}
                </div>
                <SummaryStatus status={item.status} />
              </div>

              <p className="mt-[15px] text-[10px] font-[500]">
                {label}
              </p>

              <p className="mt-[2px] text-[13px] font-[800] text-[#0f172a]">
                {item.count ?? 0}
              </p>

              <div className="my-[8px] h-[1px] w-full bg-[#e5eaf1]" />

              <div className="flex items-center gap-[6px] text-[10px] text-[#64748b]">
                <CalendarMonthOutlined sx={{ fontSize: 14 }} />
                {item.lastUpdated || "--"}
              </div>
            </div>
          );
        })}
      </div> */}

      <div className="space-y-[14px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-[800] text-[#0f172a]">
            Address History Details
          </h3>

          <div className="flex items-center gap-[8px] text-[10px]">
            <span className="font-[700] uppercase text-[#94a3b8]">
              Filter Status
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-[8px] border border-[#e5eaf1] px-[10px] py-[6px] text-[11px]"
            >
              <option value="ALL">All Entries</option>
              <option value="VERIFIED">Verified</option>
              <option value="PRIMARY">Primary</option>
              <option value="PRIOR">Prior</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>
        </div>

        {filteredAddresses.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-[16px] rounded-[14px] border p-[18px] ${
              item.status === "PRIMARY"
                ? "border-blue-300 bg-[#fbfdff]"
                : "border-[#e5eaf1]"
            }`}
          >
            <AddressIcon type={item.type} />

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-[800] uppercase text-[#0f172a]">
                  {item.type}
                </p>
                <StatusBadge status={item.status} />
              </div>

              <p className="mt-[4px] text-[13px] font-[500] text-[#0f172a]">
                {item.address}
              </p>

              <p className="mt-[6px] text-[10px] text-[#64748b]">
                {item.period}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}