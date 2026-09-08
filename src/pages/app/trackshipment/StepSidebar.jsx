import React from "react";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import CheckIcon from "@mui/icons-material/Check";

const STEPS = [
  { number: 1, key: "shipment_summary", title: "Shipment Summary" },
  { number: 2, key: "trip_sheet", title: "Trip Sheet" },
  // { number: 3, key: "schedule_alerts", title: "Schedule Alerts" },
];

export default function StepSidebar({ currentStep = 1 }) {
  return (
    <>
      <div className="w-full bg-white border-b border-[#E2EAF4] px-4 sm:px-6 py-4 block lg:hidden sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-xl mx-auto gap-2">
          {STEPS.map((step, idx) => {
            const isCurrent = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <React.Fragment key={`mob-${step.key}`}>
                <div className="flex items-center gap-2">
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#12B76A] shadow-[0_0_0_3px_rgba(18,183,106,0.15)]">
                        <CheckIcon sx={{ fontSize: 14 }} className="text-white" />
                      </div>
                    ) : isCurrent ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D4ED8] shadow-[0_0_0_4px_rgba(29,78,216,0.14)]">
                        <LocalShippingRoundedIcon sx={{ fontSize: 14 }} className="text-white" />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-[#C7D5F0] bg-white text-[10px] font-bold text-[#93A7CD]">
                        {step.number}
                      </div>
                    )}
                  </div>

                  <span className={`text-xs font-bold tracking-tight sm:block hidden ${isCurrent ? "text-[#0F2454]" : "text-[#93A7CD]"}`}>
                    {step.title}
                  </span>
                  <span className={`text-[11px] font-bold sm:hidden ${isCurrent ? "text-[#1D4ED8]" : "text-[#93A7CD]"}`}>
                    Step {step.number}
                  </span>
                </div>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0 flex-1 mx-2 border-t-2 transition-colors duration-300 ${
                      isCompleted ? "border-[#12B76A]" : "border-dashed border-[#DCE6F7]"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="w-[280px] shrink-0 border-r border-[#E2EAF4] bg-white px-6 py-8 lg:flex lg:flex-col sticky top-0 h-screen overflow-y-auto hidden">
        <div className="mb-10 flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#EEF4FF] text-[#1D4ED8]">
            <RouteOutlinedIcon sx={{ fontSize: 19 }} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-extrabold tracking-tight text-[#0F2454]">Shipment Setup</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#93A7CD]">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
        </div>

        <div className="relative flex flex-col gap-10 pl-2">
          {STEPS.map((step, idx) => {
            const isCurrent = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {idx < STEPS.length - 1 && (
                  <div
                    className={`absolute left-[13px] top-8 h-[calc(100%+16px)] border-l-2 transition-colors duration-300 ${
                      isCompleted ? "border-[#12B76A]" : "border-dashed border-[#DCE6F7]"
                    }`}
                  />
                )}

                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#12B76A] shadow-[0_0_0_4px_rgba(18,183,106,0.14)]">
                      <CheckIcon sx={{ fontSize: 15 }} className="text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D4ED8] shadow-[0_0_0_5px_rgba(29,78,216,0.14)]">
                      <LocalShippingRoundedIcon sx={{ fontSize: 15 }} className="text-white" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-[#C7D5F0] bg-white text-[11px] font-bold text-[#93A7CD]">
                      {step.number}
                    </div>
                  )}
                </div>

                <div className="flex flex-col pt-0.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent ? "text-[#1D4ED8]" : "text-[#93A7CD]"}`}>
                    STEP {step.number}
                  </span>
                  <span className={`mt-0.5 text-sm font-bold tracking-tight transition-colors duration-200 ${isCurrent ? "text-[#0F2454]" : "text-[#93A7CD]"}`}>
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>  

      </div>
    </>
  );
}