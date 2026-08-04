import React from "react";
import logo from "../../../assets/images/logo.webp";

const STEPS = [
  { number: 1, key: "shipment_summary", title: "Shipment Summary" },
  { number: 2, key: "trip_sheet", title: "Trip Sheet" },
  // { number: 3, key: "schedule_alerts", title: "Schedule Alerts" },
];

export default function StepSidebar({ currentStep = 1 }) {
  return (
    <>
      <div className="w-full bg-white border-b border-[#E2EAF4] px-6 py-4 block lg:hidden sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between max-w-xl mx-auto gap-2">
          {STEPS.map((step, idx) => {
            const isCurrent = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <React.Fragment key={`mob-${step.key}`}>
                <div className="flex items-center gap-2">
                  <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : isCurrent ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
                        <div className="h-2 w-2 rounded-full bg-[#112963]" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-[#E2EAF4] bg-white" />
                    )}
                  </div>

                  <span className={`text-xs font-bold tracking-tight  sm:block hidden ${isCurrent ? "text-[#112963]" : "text-[#93A7CD]"}`}>
                    {step.title}
                  </span>
                  <span className={`text-[11px] font-bold  sm:hidden ${isCurrent ? "text-blue-600" : "text-[#93A7CD]"}`}>
                    Step {step.number}
                  </span>
                </div>

                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-colors duration-300 ${isCompleted ? "bg-green-500" : "bg-[#E2EAF4]"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="w-[280px] shrink-0 border-r border-[#E2EAF4] bg-white px-6 py-8 lg:block sticky top-0 h-screen overflow-y-auto hidden">
        {/* <div className="mb-10 flex items-center gap-2.5">
          <img src={logo} alt="DollarTraq" className="h-8 w-auto" />
        </div> */}

        <div className="relative flex flex-col gap-10 pl-2">
          {STEPS.map((step, idx) => {
            const isCurrent = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {idx < STEPS.length - 1 && (
                  <div
                    className={`absolute left-[13px] top-8 h-[calc(100%+16px)] w-0.5 transition-colors duration-300 ${
                      isCompleted ? "bg-green-500" : "bg-[#E2EAF4]"
                    }`}
                  />
                )}

                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow-sm shadow-green-100">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isCurrent ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#112963]" />
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-full border-2 border-[#E2EAF4] bg-white" />
                  )}
                </div>

                <div className="flex flex-col pt-0.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider  ${isCurrent ? "text-blue-600" : "text-[#93A7CD]"}`}>
                    STEP {step.number}
                  </span>
                  <span className={`mt-0.5 text-sm font-bold tracking-tight  transition-colors duration-200 ${isCurrent ? "text-[#112963]" : "text-[#93A7CD]"}`}>
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