import React, { useMemo } from "react";
import { LinearProgress } from "@mui/material";
import {
    ShieldOutlined,
    InfoOutlined,
    InsertChartOutlined
} from "@mui/icons-material";

/* ---------- SHARED BAR ---------- */
function StatBar({ count = 0, total = 10, color = "#059669" }) {
    const safeCount = Math.max(Number(count) || 0, 0);
    const safeTotal = Math.max(Number(total) || 1, 1);

    const percent = Math.min((safeCount / safeTotal) * 100, 100);

    return (
        <LinearProgress
            variant="determinate"
            value={percent}
            sx={{
                height: 12,
                borderRadius: 8,
                backgroundColor: "#eef2f6",
                overflow: "hidden",
                "& .MuiLinearProgress-bar": {
                    backgroundColor: color,
                    borderRadius: 8
                }
            }}
        />
    );
}

/* ---------- MAIN VIEW ---------- */
function IndustryBenchMarksView({ data = {} }) {
    const insights = useMemo(() => {
        const inspectionObservedCount = Array.isArray(data?.inspections)
            ? data.inspections.length
            : 0;

        const powerUnitsReportedCount = Number(data?.power_unit) || 0;

        const powerUnitsObservedValue =
            Number(data?.powerUnitsObserved?.value) || 0;

        const powerUnitsObservedAvgMin =
            Number(data?.powerUnitsObserved?.avgMin) || 0;

        const powerUnitsObservedAvgMax =
            Number(data?.powerUnitsObserved?.avgMax) || 0;

        const powerUnitsObservedDeviation =
            Number(data?.powerUnitsObserved?.deviation) || 0;

        return {
            ...data,
            inspectionCount: {
                observed: inspectionObservedCount,
                lowerThreshold: 0,
                upperLimit: 10
            },
            powerUnitsReported: {
                value: powerUnitsReportedCount,
                minObserved: 0,
                maxObserved: 10
            },
            powerUnitsObserved: {
                value: powerUnitsObservedValue,
                avgMin: powerUnitsObservedAvgMin,
                avgMax: powerUnitsObservedAvgMax || 10,
                deviation: powerUnitsObservedDeviation
            }
        };
    }, [data]);

    return (
        <div className="space-y-[28px]">
            {/* ================= TOP SUMMARY ================= */}
            <div className="grid grid-cols-[1fr_300px] gap-[24px]">
                {/* LEFT INFO */}
                <div className="flex gap-[16px] rounded-[18px] border border-[#e5eaf1] bg-white p-[22px]">
                    <div className="mr-4 flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-[14px] bg-[#eef4ff]">
                        <InsertChartOutlined className="text-[26px] text-[#2563eb]" />
                    </div>

                    <div>
                        <h3 className="text-[15px] font-[700] text-[#0f172a]">
                            This company's reported information conforms to industry averages.
                        </h3>
                        <p className="mt-[8px] text-[12px] leading-[18px] text-[#64748b]">
                            The metrics displayed reflect a comparative analysis against fleet
                            operators of similar size and operational scope. By analyzing
                            inspection data and equipment reporting, we ensure compliance
                            benchmarks meet current industry standards for safety and
                            reliability.
                        </p>
                    </div>
                </div>

                {/* RIGHT STATUS */}
                <div className="space-y-[12px]">
                    <div className="flex items-center gap-[12px] rounded-[16px] border border-[#e5eaf1] bg-white p-[16px]">
                        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#eef4ff]">
                            <ShieldOutlined className="text-[20px] text-[#2563eb]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-[800] uppercase text-[#64748b]">
                                Fleet Compliance
                            </p>
                            <p className="text-[13px] font-[700] text-[#0f172a]">
                                Within Normal Range
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-[12px] rounded-[16px] border border-[#e5eaf1] bg-white p-[16px]">
                        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#eef4ff]">
                            <InfoOutlined className="text-[20px] text-[#2563eb]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-[800] uppercase text-[#64748b]">
                                Reporting Alert
                            </p>
                            <p className="text-[13px] font-[700] text-[#2563eb]">
                                Exceeds predicted average
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= COMPARATIVE VIS ================= */}
            <div className="space-y-[22px] rounded-[20px] border border-[#e5eaf1] bg-white p-[24px]">
                <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-[800] text-[#0f172a]">
                        Comparative Data Visualization
                    </h3>
                    <div className="flex items-center gap-[16px] text-[10px] font-[700] text-[#64748b]">
                        <span className="flex items-center gap-[6px] uppercase">
                            <span className="h-[8px] w-[8px] rounded-full bg-[#273da0]" />
                            Benchmark
                        </span>
                        <span className="flex items-center gap-[6px] uppercase">
                            <span className="h-[8px] w-[8px] rounded-full bg-[#c3bfb8]" />
                            Range
                        </span>
                    </div>
                </div>

                {/* ===== ROW 1 ===== */}
                <div className="grid grid-cols-2 gap-[24px]">
                    {/* INSPECTION COUNT */}
                    <div className="rounded-[16px] border border-[#eef2f6] p-[30px]">
                        <p className="text-[10px] font-[500] uppercase tracking-[0.12em] text-[#94a3b8]">
                            Metric Category
                        </p>

                        <div className="mt-[6px] flex justify-between">
                            <p className="text-[13px] font-[700] text-[#0f172a]">
                                Inspection Count
                            </p>

                            <p className="relative -top-[15px] text-[23px] font-[800] text-[#2563eb]">
                                {insights?.inspectionCount?.observed}
                                <span className="ml-[6px] text-[10px] font-[600] uppercase text-[#94a3b8]">
                                    Observed
                                </span>
                            </p>
                        </div>

                        <div className="mt-[14px]">
                            <StatBar
                                count={insights?.inspectionCount?.observed}
                                total={10}
                            />
                        </div>

                        <div className="mt-[10px] flex justify-between text-[10px] text-[#64748b]">
                            <span className="font-[600] uppercase text-[#64748b]">
                                Lower Threshold:{" "}
                                
                            </span>

                            <span className="font-[600] uppercase text-[#64748b]">
                                Upper Limit:{" "}
                               
                            </span>
                        </div>
                    </div>

                    {/* POWER UNITS REPORTED */}
                    <div className="rounded-[16px] border border-[#eef2f6] p-[30px]">
                        <p className="text-[10px] font-[500] uppercase tracking-[0.12em] text-[#94a3b8]">
                            Regulatory Data
                        </p>

                        <div className="mt-[6px] flex justify-between">
                            <p className="text-[13px] font-[700] text-[#0f172a]">
                                Power Units Reported
                            </p>

                            <p className="relative -top-[15px] text-[23px] font-[800] text-[#2563eb]">
                                {insights?.powerUnitsReported?.value}
                                <span className="ml-[6px] text-[10px] font-[700] uppercase text-[#94a3b8]">
                                    Flagged
                                </span>
                            </p>
                        </div>

                        <div className="mt-[14px]">
                            <StatBar
                                count={insights?.powerUnitsReported?.value}
                                total={10}
                            />
                        </div>

                        <div className="mt-[10px] flex justify-between text-[10px] text-[#64748b]">
                            <span className="font-[700] uppercase text-[#64748b]">
                                Min Observed:{" "}
                              
                            </span>

                            <span className="font-[700] uppercase text-[#64748b]">
                                Max Observed:{" "}
                               
                            </span>
                        </div>
                    </div>
                </div>

                {/* ===== ROW 2 ===== */}
                <div className="rounded-[18px] border border-[#e0ecff] bg-[#fbfdff] p-[32px]">
                    <p className="text-[10px] font-[500] uppercase tracking-wider text-[#94a3b8]">
                        Field Verification
                    </p>

                    <div className="mt-[6px] flex justify-between">
                        <p className="text-[14px] font-[700] text-[#0f172a]">
                            Power Units Observed
                        </p>
                        <p className="relative -top-[15px] text-[23px] font-[800] text-[#2563eb]">
                            {insights?.powerUnitsObservedf?.value}
                            <span className="ml-[6px] text-[10px] font-[700] uppercase text-[#94a3b8]">
                                Verified
                            </span>
                        </p>
                    </div>

                    <div className="mb-[24px] mt-[36px]">
                        <StatBar
                            count={insights?.powerUnitsObserved?.value}
                            total={10}
                            color="#f59e0b"
                        />
                    </div>

                    <div className="mt-[14px] flex items-center justify-between">
                        <div className="flex gap-[32px]">
                            <div className="flex flex-col text-center">
                                <span className="text-[10px] uppercase tracking-wide text-[#94a3b8]">
                                    Avg
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-[#94a3b8]">
                                    Min
                                </span>
                                <span className="mt-[2px] text-[14px] font-[700] text-[#0f172a]">
                                    {insights?.powerUnitsObservedf?.avgMin}
                                </span>
                            </div>

                            <div className="mb-[12px] flex flex-col text-center">
                                <span className="text-[10px] uppercase tracking-wide text-[#94a3b8]">
                                    Avg
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-[#94a3b8]">
                                    Max
                                </span>
                                <span className="mt-[2px] text-[14px] font-[700] text-[#0f172a]">
                                    {insights?.powerUnitsObservedf?.avgMax}
                                </span>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="block text-[10px] uppercase tracking-wide text-[#f59e0b]">
                                Deviation from Average
                            </span>
                            <span className="block text-[14px] font-[700] uppercase text-[#f59e0b]">
                                +{insights?.powerUnitsObserved?.deviation} units
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default IndustryBenchMarksView;