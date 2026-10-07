import CheckIcon from "@mui/icons-material/Check";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

/*
| Shared by EldShipmentDetail.jsx (broker) and PublicTracking.jsx (customer)
| on purpose — same reasoning as the backend sharing Shipment::eldMilestone()
| between the two API endpoints. Two separate implementations of "which step
| is current" would eventually disagree; one component read by both pages
| can't.
|
| The 4 stages and their order must match Shipment::MILESTONES exactly —
| this is the one place on the frontend that encodes that sequence.
*/
const STEPS = [
  { key: "arrived_at_origin", label: "Arrived at origin" },
  { key: "in_transit", label: "In transit" },
  { key: "arrived_at_destination", label: "Arrived at delivery" },
  { key: "delivered", label: "Delivered" },
];

function formatWhen(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * @param milestone one of Shipment::MILESTONES, or null/undefined if
 *   tracking hasn't started (or the load was cancelled) — the whole
 *   component renders nothing in that case, since a stepper with no step
 *   reached looks broken rather than informative.
 */
export default function EldMilestones({ milestone, arrivedAtOriginAt, arrivedAtDestinationAt, deliveredAt }) {
  if (!milestone) return null;

  const currentIndex = STEPS.findIndex((s) => s.key === milestone);
  if (currentIndex === -1) return null;

  const timestampFor = (key) => {
    if (key === "arrived_at_origin") return arrivedAtOriginAt;
    if (key === "arrived_at_destination") return arrivedAtDestinationAt;
    if (key === "delivered") return deliveredAt;
    return null; // "in_transit" has no timestamp of its own — it's the gap between the two arrivals
  };

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
        <PlaceOutlinedIcon sx={{ fontSize: 17 }} className="text-red-500" /> Milestones
      </h2>

      <div className="mt-4">
        {STEPS.map((step, i) => {
          const status = i < currentIndex ? "done" : i === currentIndex ? "current" : "pending";
          const when = formatWhen(timestampFor(step.key));
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    status === "done"
                      ? "bg-green-500 text-white"
                      : status === "current"
                        ? "bg-blue-600 text-white"
                        : "border-2 border-slate-200 bg-white"
                  }`}
                >
                  {status === "done" && <CheckIcon sx={{ fontSize: 14 }} />}
                  {status === "current" && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                {!isLast && (
                  <span className={`w-0.5 flex-1 ${status === "done" ? "bg-green-300" : "bg-slate-200"}`} style={{ minHeight: 28 }} />
                )}
              </div>

              <div className={isLast ? "pb-0" : "pb-5"}>
                <p className={`text-sm font-bold ${status === "pending" ? "text-slate-400" : "text-slate-900"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400">
                  {status === "pending" ? "Pending" : when || (status === "current" ? "In progress" : "—")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
