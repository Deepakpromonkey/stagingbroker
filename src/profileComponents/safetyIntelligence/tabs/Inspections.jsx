import React from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import {
    FileDownloadOutlined,
    Search,
    CheckCircle,
    AccessTime,
    KeyboardArrowDown,
    ChevronLeft,
    ChevronRight,
    PersonOutlined,
    LocalShipping,
} from "@mui/icons-material";

class Inspection extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            activeTab: "all",
            levelFilter: "all",
            search: "",
            currentPage: 1,
            itemsPerPage: 4
        };

        this.handleTabChange = this.handleTabChange.bind(this);
        this.handleLevelFilterChange = this.handleLevelFilterChange.bind(this);
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.paginate = this.paginate.bind(this);
        this.exportPDF = this.exportPDF.bind(this);
        this.getFilteredTable = this.getFilteredTable.bind(this);
        this.getStatusConfig = this.getStatusConfig.bind(this);
        this.getInspectionType = this.getInspectionType.bind(this);
    }

    handleTabChange(tab) {
        this.setState({
            activeTab: tab,
            currentPage: 1
        });
    }

    handleLevelFilterChange(event) {
        this.setState({
            levelFilter: event.target.value,
            currentPage: 1
        });
    }

    handleSearchChange(event) {
        this.setState({
            search: event.target.value,
            currentPage: 1
        });
    }

    paginate(pageNumber) {
        this.setState({
            currentPage: pageNumber
        });
    }

    exportPDF() {
        window.print();
    }

    getStatusConfig(status) {
        let config = {
            clean: {
                label: "Clean Pass",
                className: "bg-[#eaf8ef] text-[#16a34a] border border-[#cdeed8]",
            },
            violation: {
                label: "1 Violation",
                className: "bg-[#fff7eb] text-[#d97706] border border-[#fde7b2]",
            },
            oos: {
                label: "Out of Service",
                className: "bg-[#fef0f0] text-[#dc2626] border border-[#fecaca]",
            },
            na: {
                label: "N/A",
                className: "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]",
            }
        };
        
        if (config[status]) {
            return config[status];
        }
        
        return { label: "Unknown", className: "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]" };
    }

    getInspectionType(levelId) {
        if (levelId === 1 || levelId === "1") {
            return "Full";
        } else if (levelId === 2 || levelId === "2") {
            return "Walk-around";
        } else if (levelId === 3 || levelId === "3") {
            return "Driver-Only";
        } else if (levelId === 4 || levelId === "4") {
            return "Special Study";
        } else if (levelId === 5 || levelId === "5") {
            return "Terminal";
        } else if (levelId === 6 || levelId === "6") {
            return "Radioactive";
        }
        
        return "Unknown";
    }

    getFilteredTable(inspectionData) {
        let formattedData = [];
        
        if (inspectionData && inspectionData.inspections) {
            for (let i = 0; i < inspectionData.inspections.length; i++) {
                let currentInsp = inspectionData.inspections[i];
                formattedData.push({
                    date: currentInsp.insp_date ? currentInsp.insp_date : "N/A",
                    region: "N/A", 
                    type: this.getInspectionType(currentInsp.insp_level_id),
                    refId: currentInsp.vin ? currentInsp.vin : "N/A",
                    status: "na"
                });
            }
        }

        let filtered = formattedData;

        if (this.state.activeTab !== "all") {
            filtered = filtered.filter((item) => item.status === this.state.activeTab);
        }

        if (this.state.levelFilter !== "all") {
            if (this.state.levelFilter === "clean") {
                filtered = filtered.filter((item) => item.status === "clean");
            } else if (this.state.levelFilter === "risk") {
                filtered = filtered.filter((item) => item.status === "violation");
            } else if (this.state.levelFilter === "oos") {
                filtered = filtered.filter((item) => item.status === "oos");
            } else {
                filtered = filtered.filter((item) =>
                    item.type && item.type.toLowerCase().includes(this.state.levelFilter.toLowerCase())
                );
            }
        }

        if (this.state.search !== "") {

    const keyword = this.state.search.toLowerCase();

    filtered = filtered.filter((item) =>

        (item.date &&
            String(item.date).toLowerCase().includes(keyword)) ||

        (item.region &&
            String(item.region).toLowerCase().includes(keyword)) ||

        (item.type &&
            String(item.type).toLowerCase().includes(keyword)) ||

        (item.refId &&
            String(item.refId).toLowerCase().includes(keyword)) ||

        (item.status &&
            String(item.status).toLowerCase().includes(keyword))
    );
}

        return filtered;
    }

    render() {
        let inspection = this.props.data;
        if (!inspection) {
            inspection = {};
        }

        let filteredTable = this.getFilteredTable(inspection);
        let totalPages = Math.ceil(filteredTable.length / this.state.itemsPerPage);
        let indexOfLastItem = this.state.currentPage * this.state.itemsPerPage;
        let indexOfFirstItem = indexOfLastItem - this.state.itemsPerPage;
        let currentRecords = filteredTable.slice(indexOfFirstItem, indexOfLastItem);

        let vehicleOosRate = "N/A";
        if (inspection.sms_measures && inspection.sms_measures.vehicle_oos_insp_total !== undefined) {
            vehicleOosRate = inspection.sms_measures.vehicle_oos_insp_total;
        }

        let driverOosRate = "N/A";
        if (inspection.sms_measures && inspection.sms_measures.driver_oos_insp_total !== undefined) {
            driverOosRate = inspection.sms_measures.driver_oos_insp_total;
        }

         let verifiedInspections = inspection.inspections || [];

        let cleanInspectionsCount = verifiedInspections.filter(
            (i) => (i.basic_viol ?? 0) === 0
        ).length;

        let violationInspectionsCount = verifiedInspections.filter(
            (i) => (i.basic_viol ?? 0) > 0
        ).length;

        let daysSinceLastCheck = "N/A";
        if (verifiedInspections.length > 0 && verifiedInspections[0].insp_date) {
            const firstDate = new Date(verifiedInspections[0].insp_date);
            if (!isNaN(firstDate)) {
                const diffMs = new Date() - firstDate;
                daysSinceLastCheck = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            }
        }


let paginationButtons = [];

const createPageButton = (pageNum) => {

    let btnClass =
        "w-8 h-8 rounded-full text-[11px] font-[800] transition-all text-[#64748b] hover:bg-[#f8fafc]";

    if (this.state.currentPage === pageNum) {

        btnClass =
            "w-8 h-8 rounded-full text-[11px] font-[800] transition-all bg-[#2563eb] text-white shadow-sm";
    }

    return (
        <button
            key={pageNum}
            onClick={() => this.paginate(pageNum)}
            className={btnClass}
        >
            {pageNum}
        </button>
    );
};

if (totalPages <= 5) {

    for (let i = 1; i <= totalPages; i++) {
        paginationButtons.push(createPageButton(i));
    }

} else {

    paginationButtons.push(createPageButton(1));
    paginationButtons.push(createPageButton(2));
    paginationButtons.push(createPageButton(3));

    paginationButtons.push(
        <span
            key="dots"
            className="px-2 text-[#94a3b8] text-[12px] font-[700]"
        >
            ...
        </span>
    );

    paginationButtons.push(createPageButton(totalPages));
}

        return (
            <div className="px-[28px] py-[30px] bg-[#f8fafc]">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h2 className="text-[24px] leading-[38px] font-[600] tracking-[-0.04em] text-[#111827]">
                            Inspection Analysis
                        </h2>
                        <p className="mt-1 text-[13px] font-[500] text-[#94a3b8]">
                            Real-time safety compliance and vehicle performance metrics
                        </p>
                    </div>

                    <button
                        onClick={this.exportPDF}
                        className="h-[42px] px-3 rounded-[14px] border border-[#dbe3ef] bg-white flex items-center gap-2 text-[12px] font-[700] text-[#334155] shadow-sm hover:bg-[#f8fafc] transition-all"
                    >
                        <FileDownloadOutlined sx={{ fontSize: 17 }} />
                        Export PDF
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-5 mb-8">
                    <div className="bg-white border border-[#dbe3ef] rounded-[26px] px-6 py-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#eff6ff]">
                                <div className="flex items-center justify-center">
                                    <CheckCircle className="!text-[#2563eb] !text-[19px]" />
                                </div>
                            </div>
                            <div className="px-3 py-[6px] rounded-full text-[9px] font-[800] tracking-[0.08em] uppercase bg-[#eff6ff] text-[#2563eb]">
                                TOP PERFORMER
                            </div>
                        </div>
                      <h3 className="text-[23px] leading-none font-[800] tracking-[-0.04em] text-[#0f172a]">
    {cleanInspectionsCount}
</h3>
                        <p className="mt-3 text-[10px] font-[800] tracking-[0.08em] uppercase text-[#94a3b8]">
                            CLEAN INSPECTION RATE
                        </p>
                    </div>

                    <div className="bg-white border border-[#dbe3ef] rounded-[26px] px-6 py-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#fff7ed]">
                                <div className="flex items-center justify-center">
                                    <LocalShipping className="!text-[#c2410c] !text-[19px]" />
                                </div>
                            </div>
                            <div className="px-3 py-[6px] rounded-full text-[9px] font-[800] tracking-[0.08em] uppercase bg-[#fff7ed] text-[#c2410c]">
                                AT RISK
                            </div>
                        </div>
                        <h3 className="text-[23px] leading-none font-[800] tracking-[-0.04em] text-[#0f172a]">
                            {vehicleOosRate}
                        </h3>
                        <p className="mt-3 text-[10px] font-[800] tracking-[0.08em] uppercase text-[#94a3b8]">
                            VEHICLE OOS RATE
                        </p>
                    </div>

                    <div className="bg-white border border-[#dbe3ef] rounded-[26px] px-6 py-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#f0fdf4]">
                                <div className="flex items-center justify-center">
                                    <PersonOutlined className="!text-[#16a34a] !text-[19px]" />
                                </div>
                            </div>
                            <div className="px-3 py-[6px] rounded-full text-[9px] font-[800] tracking-[0.08em] uppercase bg-[#f0fdf4] text-[#16a34a]">
                                STABLE
                            </div>
                        </div>
                        <h3 className="text-[23px] leading-none font-[800] tracking-[-0.04em] text-[#0f172a]">
                            {driverOosRate}
                        </h3>
                        <p className="mt-3 text-[10px] font-[800] tracking-[0.08em] uppercase text-[#94a3b8]">
                            DRIVER OOS RATE
                        </p>
                    </div>

                    <div className="bg-white border border-[#dbe3ef] rounded-[26px] px-6 py-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[#f8fafc]">
                                <div className="flex items-center justify-center">
                                    <AccessTime className="!text-[#64748b] !text-[19px]" />
                                </div>
                            </div>
                            <div className="px-3 py-[6px] rounded-full text-[9px] font-[800] tracking-[0.08em] uppercase bg-[#f8fafc] text-[#94a3b8]">
                                LAST INSPECTION
                            </div>
                        </div>
                      <h3 className="text-[23px] leading-none font-[800] tracking-[-0.04em] text-[#0f172a]">
    {daysSinceLastCheck}
</h3>
                        <p className="mt-3 text-[10px] font-[800] tracking-[0.08em] uppercase text-[#94a3b8]">
                            DAYS SINCE LAST CHECK
                        </p>
                    </div>
                </div>

                {/* <div className="bg-white border border-[#dbe3ef] rounded-[32px] overflow-hidden mb-8">
                    <div className="px-9 pt-8 flex items-start justify-between">
                        <div>
                            <h3 className="text-[18px] leading-none font-[800] tracking-[-0.03em] text-[#0f172a]">
                                Performance Trends
                            </h3>
                            <p className="mt-2 text-[13px] text-[#64748b]">
                                Twelve-month historical view of inspection outcomes
                            </p>
                        </div>

                        <div className="flex items-center gap-8 px-7 h-[48px] rounded-full border border-[#e8edf5] bg-[#f8fafc]">
                            <div className="flex items-center gap-3">
                                <div className="w-[10px] h-[10px] rounded-full bg-[#0f52d6]" />
                                <span className="text-[9px] font-[800] tracking-[0.12em] uppercase text-[#475569]">
                                    Clean
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-[10px] h-[10px] rounded-full bg-[#d8e0ec]" />
                                <span className="text-[9px] font-[800] tracking-[0.12em] uppercase text-[#475569]">
                                    Violations
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-[10px] h-[10px] rounded-full bg-[#d19a77]" />
                                <span className="text-[9px] font-[800] tracking-[0.12em] uppercase text-[#475569]">
                                    OOS
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[500px] px-3 pt-6 pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={inspection.chartData ? inspection.chartData : []}
                                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid vertical={false} stroke="#eef2f7" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tickMargin={14}
                                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: "rgba(15,23,42,0.03)" }}
                                    contentStyle={{
                                        borderRadius: "14px",
                                        border: "1px solid #e2e8f0",
                                        boxShadow: "0px 10px 30px rgba(15,23,42,0.08)",
                                        fontSize: "12px",
                                    }}
                                />
                                <Bar
                                    dataKey="violations"
                                    fill="#e3eaf4"
                                    radius={[30, 30, 30, 30]}
                                    barSize={18}
                                />
                                <Bar
                                    dataKey="oos"
                                    fill="#e8c4b4"
                                    radius={[30, 30, 30, 30]}
                                    barSize={18}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="clean"
                                    stroke="#0f52d6"
                                    fill="#0f52d61a"
                                    strokeWidth={4}
                                    dot={{ r: 6, strokeWidth: 3, fill: "#ffffff", stroke: "#0f52d6" }}
                                    activeDot={{ r: 7, fill: "#0f52d6", stroke: "#ffffff", strokeWidth: 2 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div> */}

                <div className="bg-white border border-[#dbe3ef] rounded-[24px] p-4 mb-6 flex items-center justify-between shadow-sm">
                    <div className="relative w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 !text-[20px] text-[#94a3b8]" />
                        <input
                            value={this.state.search}
                            onChange={this.handleSearchChange}
                            placeholder="Filter by ID, State, or Driver"
                            className="w-full h-[45px] bg-[#f8fafc] border border-[#eef2f7] rounded-[16px] pl-11 pr-7 text-[13px] text-[#0f172a] outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        {/* <div className="flex items-center bg-[#f1f5f9] rounded-xl p-1">
                            <button
                                onClick={() => this.handleTabChange("all")}
                                className={`px-6 h-[30px] rounded-xl text-[11px] font-[700] transition-all ${this.state.activeTab === "all" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => this.handleTabChange("clean")}
                                className={`px-6 h-[30px] rounded-xl text-[11px] font-[700] transition-all ${this.state.activeTab === "clean" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
                            >
                                Clean
                            </button>
                            <button
                                onClick={() => this.handleTabChange("risk")}
                                className={`px-6 h-[30px] rounded-xl text-[11px] font-[700] transition-all ${this.state.activeTab === "risk" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
                            >
                                Risk
                            </button>
                        </div> */}

                        {/* <div className="flex items-center gap-2">
                            <span className="text-[9px] font-[800] uppercase tracking-[0.08em] text-[#94a3b8]">
                                Level:
                            </span>
                            <div className="relative">
                                <select
                                    value={this.state.levelFilter}
                                    onChange={this.handleLevelFilterChange}
                                    className="appearance-none h-[40px] min-w-[130px] pr-10 pl-4 rounded-[14px] border border-[#dbe3ef] bg-white text-[12px] font-[700] text-[#0f172a] outline-none"
                                >
                                    {(inspection.dropdownOptions ? inspection.dropdownOptions : []).map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <KeyboardArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 !text-[18px] text-[#94a3b8] pointer-events-none" />
                            </div>
                        </div> */}
                    </div>
                </div>

                <div className="bg-white border border-[#dbe3ef] rounded-[24px] overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-[#f8fafc]/50">
                            <tr className="border-b border-[#f1f5f9]">
                                <th className="px-8 py-5 text-left text-[11px] font-[700] uppercase tracking-wider text-[#64748b]">Date & Region</th>
                                <th className="px-8 py-5 text-left text-[11px] font-[700] uppercase tracking-wider text-[#64748b]">Type</th>
                                <th className="px-8 py-5 text-left text-[11px] font-[700] uppercase tracking-wider text-[#64748b]">VIN</th>
                                {/* <th className="px-8 py-5 text-right text-[11px] font-[700] uppercase tracking-wider text-[#64748b]">Safety Status</th> */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9]">
                            {currentRecords.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={4} 
                                        className="px-8 py-12 text-center text-[14px] font-[500] text-[#64748b] bg-white"
                                    >
                                        No inspection records found.
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map((item, idx) => {
                                    let statusConfig = this.getStatusConfig(item.status);
                                    return (
                                        <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-[14px] font-[700] text-[#0f172a]">{item.date}</p>
                                                <p className="text-[12px] text-[#94a3b8] font-[500] mt-0.5">{item.region}</p>
                                            </td>
                                            <td className="px-8 py-6 text-[14px] font-[500] text-[#475569]">{item.type}</td>
                                            <td className="px-8 py-6">
                                                <span className="text-[14px] font-[700] text-[#2563eb] border-b border-transparent hover:border-[#2563eb] cursor-pointer">
                                                    {item.refId}
                                                </span>
                                            </td>
                                            {/* <td className="px-8 py-6 text-right">
                                                <span className={`inline-flex items-center gap-2 px-4 h-[34px] rounded-full text-[12px] font-[700] ${statusConfig.className}`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    {statusConfig.label}
                                                </span>
                                            </td> */}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    <div className="px-8 py-5 border-t border-[#eef2f7] flex items-center justify-between">
                        <p className="text-[12px] text-[#64748b]">
                            Showing <span className="font-[600] text-[#1e293b]">{indexOfFirstItem + 1}</span> to{" "}
                            <span className="font-[600] text-[#1e293b]">{Math.min(indexOfLastItem, filteredTable.length)}</span> of{" "}
                            {filteredTable.length} results
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => this.paginate(Math.max(1, this.state.currentPage - 1))}
                                disabled={this.state.currentPage === 1}
                                className="p-2 rounded-full border border-[#dbe3ef] disabled:opacity-30 hover:bg-[#f8fafc] transition-all"
                            >
                                <ChevronLeft sx={{ fontSize: 18, color: '#64748b' }} />
                            </button>

                            <div className="flex items-center gap-1">
                                {paginationButtons}
                            </div>

                            <button
                                onClick={() => this.paginate(Math.min(totalPages, this.state.currentPage + 1))}
                                disabled={this.state.currentPage === totalPages}
                                className="p-2 rounded-full border border-[#dbe3ef] disabled:opacity-30 hover:bg-[#f8fafc] transition-all"
                            >
                                <ChevronRight sx={{ fontSize: 18, color: '#64748b' }} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Inspection;