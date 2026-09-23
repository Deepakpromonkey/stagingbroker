import React, { useEffect, useMemo, useRef, useState } from "react";

function pointsToScore(p) {
  if (p >= 10000) return Math.round(Math.max(0, 18 - ((p - 10000) / 20000) * 18) * 10) / 10;
  if (p >= 1000) return Math.round((54 - ((p - 1000) / 9000) * 35) * 10) / 10;
  return Math.round((100 - (p / 1000) * 45) * 10) / 10;
}

const TIER_PTS = { low: 125, medium: 250, review: 1000, fail: 10000 };
const TIER_TXT = { low: "Low", medium: "Medium", review: "Review", fail: "Hard stop" };
const TIER_PILL = {
  low: { bg: "bg-emerald-100", text: "text-emerald-700" },
  medium: { bg: "bg-amber-100", text: "text-amber-700" },
  review: { bg: "bg-orange-500", text: "text-white" },
  fail: { bg: "bg-red-600", text: "text-white" },
};

const AGE_OPTIONS = [
  { v: "est", label: "1 year +" },
  { v: "d365", label: "6–12 mo" },
  { v: "d180", label: "3–6 mo" },
  { v: "d90", label: "30–89 days" },
  { v: "d30", label: "Under 30" },
];

const GROUPS = [
  {
    name: "Authority & compliance",
    rules: [
      { id: "auth_inactive", t: "No active operating authority", d: "Common and contract authority both inactive.", tier: () => "fail" },
      { id: "oos_order", t: "Active out-of-service order", d: "FMCSA has ordered the carrier off the road.", tier: () => "fail" },
      { id: "rev_pending", t: "Authority revocation pending", d: "FMCSA has started taking the authority away.", tier: () => "review" },
      { id: "reinstated", t: "Reinstated after a past revocation", d: "Authority is back, but the interruption counts.", tier: () => "review" },
      { id: "cured_proc", t: "Revocation proceeding cured at the deadline", d: "Usually a last-minute insurance save. They add up.", tier: () => "low" },
      { id: "dual_auth", t: "Carrier also holds broker authority", d: "Legal — but the re-brokering pattern gets watched.", tier: () => "medium" },
    ],
  },
  {
    name: "Insurance",
    rules: [
      { id: "no_bipd", t: "No BIPD liability insurance on file", d: "Checked against live federal filings, not a PDF.", tier: () => "fail" },
      { id: "low_bipd", t: "Coverage below the federal minimum", d: "On file, but short of what the authority requires.", tier: () => "fail" },
      { id: "cancel", t: "Cancellation already scheduled", d: "Coverage exists today with an expiry date set.", tier: () => "review" },
      { id: "churn", t: "Frequent insurer changes", d: "Five or more carriers in the filing history.", tier: () => "low" },
    ],
  },
  {
    name: "Safety & roadside",
    rules: [
      { id: "unsat", t: "Unsatisfactory safety rating", d: "FMCSA's own verdict. Non-negotiable.", tier: () => "fail" },
      { id: "cond", t: "Conditional safety rating", d: "The Montgomery v. Caribe pattern. Also a stop.", tier: () => "fail" },
      { id: "basic1", t: "A BASIC over the intervention line", d: "Unsafe driving, hours-of-service, maintenance, driver fitness or controlled substances.", tier: () => "medium" },
      { id: "basic2", t: "A second BASIC over the line", d: "Two or more together force a manager review.", tier: () => "review", needs: "basic1", bonus: 250 },
      { id: "oos_rate", t: "Out-of-service rate twice the national average", d: "Measured only once there's enough inspection history.", tier: () => "medium" },
    ],
  },
  {
    name: "Crash history",
    rules: [
      { id: "fatal", t: "Fatal crash in the last 24 months", d: "Always flagged. Small fleets go to review; large fleets at baseline rate take a finding.", tier: (c) => (c.fleet === "large" ? "medium" : "review") },
      { id: "crash_rate", t: "High crash rate for the fleet size", d: "Crashes per truck per year — never a lifetime count.", tier: () => "medium" },
      { id: "towaways", t: "Five or more tow-away crashes", d: "In the 24-month window.", tier: () => "low" },
    ],
  },
  {
    name: "Identity & network",
    rules: [
      { id: "net_share", t: "Phone, address or VINs shared with 3+ unrelated carriers", d: "Corporate families are excluded by name — this is the reincarnation signal.", tier: (c) => (c.fleet === "large" ? "medium" : "review") },
      { id: "maildrop", t: "Address is a known mail drop", d: "PO-box-style fronts.", tier: () => "low" },
      { id: "free_mail", t: "Contact email is a free provider", d: "Weak signal on its own; it stacks.", tier: () => "low" },
      { id: "false_filing", t: "Cited for false or misleading federal filings", d: "Roadside citations under 390.19/390.35 — invisible in CSA scores, visible here.", tier: () => "medium" },
      { id: "under_report", t: "More trucks seen at roadside than reported", d: "Distinct VINs at inspections exceed the fleet on the carrier's own filing.", tier: () => "low" },
    ],
  },
  {
    name: "Inspection depth",
    rules: [
      { id: "viol_rate", t: "Violations on most inspections", d: "Share of stops that produced a violation.", tier: () => "medium" },
      { id: "stale", t: "No roadside inspection in 12 months", d: "Operating without recent roadside contact.", tier: () => "low" },
      { id: "thin", t: "Under five inspections despite a year of authority", d: "Not enough history to certify.", tier: () => "low" },
    ],
  },
];

const RULES = Object.fromEntries(GROUPS.flatMap((g) => g.rules.map((r) => [r.id, r])));

const PRESETS = {
  clean: { label: "Clean 12-year fleet", rules: [], fleet: "large", q: 1, age: "est" },
  new: { label: "Brand-new authority", rules: [], fleet: "small", q: 0.75, age: "d30" },
  cancel: { label: "Insurance cancellation scheduled", rules: ["cancel"], fleet: "small", q: 1, age: "est" },
  rough: { label: "Rough roadside record", rules: ["basic1", "basic2", "viol_rate", "oos_rate"], fleet: "small", q: 1, age: "est" },
  dead: { label: "No authority, no insurance", rules: ["auth_inactive", "no_bipd"], fleet: "small", q: 1, age: "est" },
};

const BANDS = {
  disq: { label: "Disqualified", dot: "bg-red-600", chip: "bg-red-600 text-white", copy: "A hard stop fired. Do not book — there is no override path." },
  rev: { label: "Review required", dot: "bg-orange-500", chip: "bg-orange-500 text-white", copy: "A manager has to sign off before this carrier moves a load." },
  cond: { label: "Conditional", dot: "bg-amber-400", chip: "bg-amber-400 text-amber-950", copy: "Approaching the review line. Confirm the findings before high-value freight." },
  acc: { label: "Acceptable", dot: "bg-emerald-500", chip: "bg-emerald-500 text-white", copy: "Minor findings only. Standard booking; the findings stay visible." },
  pref: { label: "Preferred", dot: "bg-green-600", chip: "bg-green-600 text-white", copy: "Clears every rule with room to spare." },
};

function compute(state) {
  let pts = 0;
  let fail = false;
  const fired = [];

  state.rules.forEach((id) => {
    const r = RULES[id];
    if (!r) return;
    if (r.needs && !state.rules.has(r.needs)) return;
    const tier = r.tier(state);
    const p = TIER_PTS[tier] + (r.bonus || 0);
    pts += p;
    if (tier === "fail") fail = true;
    fired.push({ t: r.t, tier, p });
  });

  if (state.age === "d30") {
    pts += TIER_PTS.review;
    fired.push({ t: "Authority granted under 30 days ago", tier: "review", p: 1000 });
  }
  if (state.age === "d90") {
    pts += TIER_PTS.medium;
    fired.push({ t: "Authority granted 30–89 days ago", tier: "medium", p: 250 });
  }

  const status = fail ? "fail" : pts >= 1000 ? "review" : "ok";
  let score = pointsToScore(pts);

  const caps = [];
  if (!fail) {
    if (state.age === "d30") caps.push([45, "authority under 30 days — senior approval required"]);
    else if (state.age === "d90") caps.push([65, "authority under 90 days — documented review required"]);
    else if (state.age === "d180") caps.push([75, "authority under 180 days — not yet Preferred"]);
    else if (state.age === "d365") caps.push([84, "authority under a year — Preferred takes a year of history"]);

    if (state.q < 0.4) caps.push([55, "federal file nearly empty"]);
    else if (state.q < 0.65) caps.push([70, "federal file is thin"]);
    else if (state.q < 0.85) caps.push([85, "gaps in the federal file"]);
  }
  let capHit = null;
  caps.forEach((c) => {
    if (score > c[0]) {
      score = c[0];
      capHit = c;
    }
  });

  const published = fail ? 18 : Math.round(score);
  const band = fail
    ? BANDS.disq
    : status === "review"
      ? BANDS.rev
      : published >= 85
        ? BANDS.pref
        : published >= 70
          ? BANDS.acc
          : BANDS.cond;

  return { pts, fired, fail, status, published, band, capHit };
}

function TierPill({ tier }) {
  const s = TIER_PILL[tier] || TIER_PILL.medium;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>
      {TIER_TXT[tier]}
    </span>
  );
}

function AnimatedScore({ value }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return undefined;
    const duration = 600;
    const start = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span className="tabular-nums">{display}</span>;
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
    >
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreRail({ result }) {
  const pos = Math.max(0, Math.min(100, result.published));
  const zones = [
    { from: 85, to: 100, className: "bg-green-600" },
    { from: 70, to: 85, className: "bg-emerald-500" },
    { from: 55, to: 70, className: "bg-amber-400" },
    { from: 18, to: 55, className: "bg-orange-500" },
    { from: 0, to: 18, className: "bg-red-600" },
  ];
  const labels = [
    { at: 92, label: "Preferred", range: "85–100", dot: "bg-green-600" },
    { at: 77, label: "Acceptable", range: "70–84", dot: "bg-emerald-500" },
    { at: 62, label: "Conditional", range: "55–69", dot: "bg-amber-400" },
    { at: 36, label: "Review required", range: "19–54", dot: "bg-orange-500" },
    { at: 8, label: "Disqualified", range: "18", dot: "bg-red-600" },
  ];

  return (
    <aside className="w-full shrink-0 rounded-none bg-white p-4 sm:p-5 shadow-sm lg:sticky lg:top-6 lg:self-start lg:rounded-xl">
      <div className="flex flex-col">
        <span className="block text-[40px] sm:text-[44px] font-semibold leading-none tracking-tight text-slate-900">
          <AnimatedScore value={result.fail ? 18 : result.published} />
        </span>
        <div className={`mt-3 block w-fit items-center rounded-full px-3 py-1 text-[13px] font-bold ${result.band.chip}`}>
          {result.band.label}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{result.band.copy}</p>
      </div>

      <div className="mt-5 grid grid-cols-[14px_1fr] gap-3">
        <div className="relative min-h-[180px] overflow-hidden rounded-lg bg-slate-100">
          {zones.map((z, i) => (
            <div key={i} className={`absolute left-0 right-0 ${z.className}`} style={{ bottom: `${z.from}%`, height: `${z.to - z.from}%` }} />
          ))}
          <div
            className="absolute -left-1 -right-1 h-1 rounded-full bg-slate-900 transition-[bottom] duration-500"
            style={{ bottom: `${pos}%`, boxShadow: "0 0 0 2px #fff" }}
          />
        </div>
        <div className="relative text-sm text-slate-500">
          {labels.map((l, i) => (
            <div key={i} className="absolute flex translate-y-1/2 items-center gap-1.5 whitespace-nowrap" style={{ bottom: `${l.at}%` }}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${l.dot}`} />
              <b className="font-bold text-slate-900">{l.label}</b> {l.range}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-400">
        The marker is live — everything you change on the right moves it through the same math the product runs.
      </p>
    </aside>
  );
}

export default function DtScoreHowItWorks() {
  const [rules, setRules] = useState(() => new Set());
  const [fleet, setFleet] = useState("small");
  const [q, setQ] = useState(1);
  const [age, setAge] = useState("est");
  const [activePreset, setActivePreset] = useState(null);
  const [openGroup, setOpenGroup] = useState(0);

  const state = useMemo(() => ({ rules, fleet, q, age }), [rules, fleet, q, age]);
  const result = useMemo(() => compute(state), [state]);

  function toggleRule(id) {
    setActivePreset(null);
    setRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (id === "basic1") next.delete("basic2");
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    setRules(new Set(p.rules));
    setFleet(p.fleet);
    setQ(p.q);
    setAge(p.age);
    setActivePreset(key);
  }

  const fleetHint =
    fleet === "large"
      ? "Established 100-truck fleets sharing an HQ with sister companies aren't chameleons — those findings step down a tier."
      : "Small and young is the reincarnated-carrier shape — network and fatal-crash findings carry full weight.";

  const dataOptions = [
    { v: 1, label: "Full" },
    { v: 0.75, label: "Some gaps" },
    { v: 0.62, label: "Thin" },
    { v: 0.38, label: "Nearly empty" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F5F1] px-4 sm:px-6 md:px-10 lg:px-14 py-4 lg:py-5">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-[26px] sm:text-[32px] lg:text-[40px] font-semibold tracking-tight text-slate-900">
          DT Trust Score
        </h1>
        <p className="mt-2 max-w-2xl text-sm lg:text-[15px] leading-relaxed text-slate-500">
          Every score ships with its own receipt. This page walks through where the data comes from, how findings
          turn into points, and lets you build a carrier yourself to see the exact math run live.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen lg:static lg:left-auto lg:right-auto lg:ml-0 lg:mr-0 lg:w-[340px] lg:shrink-0">
          <ScoreRail result={result} />
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-7 shadow-sm">
            <h2 className="flex items-baseline gap-2 text-lg font-bold text-gray-900">
              <span className="text-sm font-semibold text-gray-400">1</span>
              Where the data comes from
            </h2>
            <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-500">
              Seven sources, one number. Every input is federal record or observed behavior — nothing is
              self-declared to Dollar Traq.
            </p>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {[
                ["FMCSA carrier registration", "refreshed daily", "Legal identity, fleet size, drivers, mileage — the carrier's MCS-150 filing."],
                ["Operating authority, with full history", "refreshed daily", "Active authority today, plus every grant, revocation, reinstatement and out-of-service order on the docket — decades back."],
                ["Federal insurance filings", "refreshed daily", "BIPD liability, cargo and bond filings made with FMCSA — amounts, insurers, and cancellations already scheduled for a future date."],
                ["Roadside inspections & CSA BASICs", "24-month window", "Every inspection and violation, banded against national intervention thresholds."],
                ["Crash records", "24-month window", "Fatalities, injuries, tow-aways — scored as a rate against fleet size, never as a lifetime tally."],
                ["Cross-carrier network graph", "across every US DOT", "Phone numbers, addresses and roadside VINs checked against the entire carrier population — the reincarnated-carrier signal. Corporate families are recognized and not penalized."],
                ["Dollar Traq signals", "real time", "Verified fraud reports and internal blocks from the network."],
              ].map(([t, cad, d], i) => (
                <div key={i} className={`grid grid-cols-1 gap-1 bg-white px-4 py-3 sm:grid-cols-[1fr_auto] ${i > 0 ? "border-t border-gray-100" : ""}`}>
                  <div className="text-sm font-bold text-gray-900">{t}</div>
                  <div className="text-xs text-gray-400 sm:text-right">{cad}</div>
                  <div className="text-sm text-gray-500 sm:col-span-2">{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-7 shadow-sm">
            <h2 className="flex items-baseline gap-2 text-lg font-bold text-gray-900">
              <span className="text-sm font-semibold text-gray-400">2</span>
              Findings, not vibes
            </h2>
            <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-500">
              The engine checks about forty rules. Each finding adds risk points at a fixed severity, and the total
              maps onto the 0–100 gauge — so the score is always the sum of a list you can read, never a feeling.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                ["Low", "125 pts — one alone scores 94"],
                ["Medium", "250 pts — one alone scores 89"],
                ["Review", "1,000 pts — forces a manager decision, 54 or below"],
                ["Hard stop", "10,000 pts — pins the score at 18"],
              ].map(([b, d], i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  <b className="text-gray-900">{b}</b> {d}
                </div>
              ))}
            </div>
            <p className="max-w-2xl text-sm text-gray-500">
              More points always mean a lower score: <code className="font-bold text-gray-900">0 pts → 100</code>,{" "}
              <code className="font-bold text-gray-900">999 → 55</code>,{" "}
              <code className="font-bold text-gray-900">1,000 → 54</code>,{" "}
              <code className="font-bold text-gray-900">10,000 → 18</code>. A carrier carrying any Review finding can
              never show as Approved, no matter how clean the rest of the file is.
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-7 shadow-sm">
            <h2 className="flex items-baseline gap-2 text-lg font-bold text-gray-900">
              <span className="text-sm font-semibold text-gray-400">3</span>
              Try it — build a carrier
            </h2>
            <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-500">
              Flip findings on and off. The marker, the band and the receipt below all run the production formula.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={
                    "px-4 h-8 rounded-full border text-xs font-bold tracking-wide transition-colors " +
                    (activePreset === key
                      ? "border-blue-600 text-white bg-blue-600 shadow-sm"
                      : "border-transparent text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Fleet profile</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["small", "Small or young"],
                    ["large", "100+ trucks, 5+ years"],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setActivePreset(null);
                        setFleet(v);
                      }}
                      className={
                        "rounded-lg border px-2.5 py-1 text-xs font-semibold " +
                        (fleet === v ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 min-h-[2.5em] text-xs text-gray-400">{fleetHint}</div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Authority age</div>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setActivePreset(null);
                        setAge(opt.v);
                      }}
                      className={
                        "rounded-lg border px-2.5 py-1 text-xs font-semibold " +
                        (age === opt.v ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 min-h-[2.5em] text-xs text-gray-400">
                  Preferred takes a year of history. Under 90 days a finding fires as well as the cap.
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  How complete is the federal file?
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dataOptions.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setActivePreset(null);
                        setQ(opt.v);
                      }}
                      className={
                        "rounded-lg border px-2.5 py-1 text-xs font-semibold " +
                        (q === opt.v ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 min-h-[2.5em] text-xs text-gray-400">
                  Missing data never counts as clean — it caps how high the score can go.
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              {GROUPS.map((g, gi) => {
                const activeCount = g.rules.filter((r) => rules.has(r.id)).length;
                const isOpen = openGroup === gi;
                return (
                  <div key={g.name} className="rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenGroup(isOpen ? -1 : gi)}
                      className="flex w-full items-center gap-2 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900"
                    >
                      {g.name}
                      <span className="ml-auto flex items-center gap-2 text-xs font-semibold text-gray-400">
                        {activeCount ? `${activeCount} active` : ""}
                        <ChevronIcon open={isOpen} />
                      </span>
                    </button>
                    {isOpen && (
                      <div>
                        {g.rules.map((r) => {
                          const disabled = r.needs && !rules.has(r.needs);
                          const tier = r.tier(state);
                          const pts = TIER_PTS[tier] + (r.bonus || 0);
                          return (
                            <label
                              key={r.id}
                              className={
                                "flex items-start gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0 " +
                                (disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")
                              }
                            >
                              <input
                                type="checkbox"
                                checked={rules.has(r.id)}
                                disabled={disabled}
                                onChange={() => toggleRule(r.id)}
                                className="mt-0.5 h-[18px] w-[18px] accent-blue-600"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-gray-900">{r.t}</div>
                                <div className="text-xs text-gray-500">{r.d}</div>
                              </div>
                              <span className="flex shrink-0 items-center gap-1.5 self-center">
                                <TierPill tier={tier} />
                                <span className="text-xs text-gray-400">{pts.toLocaleString()}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900">
                What the broker sees
              </div>
              {result.fired.length === 0 ? (
                <div className="px-4 py-4 text-sm text-gray-400">No findings. Full data, every rule clear.</div>
              ) : (
                <ul className="m-0 list-none p-0">
                  {result.fired.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 px-4 py-2 text-sm">
                      <TierPill tier={f.tier} />
                      <span className="flex-1 text-gray-700">{f.t}</span>
                      <span className="tabular-nums text-gray-400">+{f.p.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2.5 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                <span>{result.pts.toLocaleString()} risk points</span>
                <b className="ml-auto tabular-nums text-gray-900">
                  {result.fail ? "score pinned at 18" : `score ${result.published}`}
                </b>
              </div>
              {result.capHit && !result.fail && (
                <div className="border-t border-dashed border-gray-200 px-4 py-2 text-xs text-orange-600">
                  Capped at {result.capHit[0]}: {result.capHit[1]}.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-7 shadow-sm">
            <h2 className="flex items-baseline gap-2 text-lg font-bold text-gray-900">
              <span className="text-sm font-semibold text-gray-400">4</span>
              Hard stops
            </h2>
            <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-500">
              Some findings end the conversation. Any one of these pins the score at 18 — Disqualified — with no
              override path for anyone.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                "No active operating authority",
                "DOT number inactive",
                "Active out-of-service order",
                "Unsatisfactory safety rating",
                "Conditional safety rating",
                "No BIPD liability insurance on file",
                "Liability coverage below the federal minimum",
                "Cargo insurance required but missing",
                "Verified fraud reports or a network block",
              ].map((s, i) => (
                <div key={i} className="rounded-lg border border-gray-200 border-l-4 border-l-red-500 px-3 py-2.5 text-sm text-gray-700">
                  {s}
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-gray-500">
              These follow the CAVRA carrier-vetting standard, including the lesson of <em>Montgomery v. Caribe</em>:
              a Conditional safety rating is a stop, not a discount.
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-7 shadow-sm">
            <h2 className="flex items-baseline gap-2 text-lg font-bold text-gray-900">
              <span className="text-sm font-semibold text-gray-400">5</span>
              When the engine refuses to guess
            </h2>
            <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-500">
              A rule with missing inputs doesn't fire — and doesn't pass either. It abstains, and the gaps cap how
              high the score can go until the record fills in.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr>
                    {["Situation", "Score can't exceed", "What happens next"].map((h) => (
                      <th key={h} className="bg-gray-50 border-b border-gray-200 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Authority younger than 30 days", "45", "Senior approval required to book"],
                    ["Authority 30–89 days old", "65", "Documented review required"],
                    ["Authority 90–179 days old", "75", "Acceptable, not yet Preferred"],
                    ["Authority under 12 months", "84", "Preferred takes a year of history"],
                    ["Authority record unreadable", "84", "Flagged for a human, never assumed inactive"],
                    ["Federal file has gaps", "85 / 70 / 55", "Cap tightens as the file thins"],
                  ].map(([sit, cap, next], i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3 text-gray-700">{sit}</td>
                      <td className="px-4 py-3 tabular-nums font-bold text-gray-900">{cap}</td>
                      <td className="px-4 py-3 text-gray-700">{next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 max-w-2xl text-sm text-gray-500">
              <b className="text-gray-900">Nothing hides.</b> Every DT Score in Dollar Traq ships with its own
              receipt — tap any score to see the exact findings, points and data behind it, the same way this page
              shows them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}