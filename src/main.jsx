import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { purgeLegacyStorageCache } from './lib/memoryCache'

// Entries the localStorage-backed caches left behind (see lib/memoryCache).
purgeLegacyStorageCache()
try {
  ['flash_success_message', 'current_shipment_uuid'].forEach((key) => localStorage.removeItem(key))
} catch {
  /* storage refused */
}

/*
| A tab left open across a deploy still holds the old index, whose page chunks
| are gone from the server once the new build is live. Vite reports that as a
| preload error; reloading once picks up the new build. The flag stops a loop
| if the chunk is missing for some other reason.
*/
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('dt_chunk_reload') === '1') return
    sessionStorage.setItem('dt_chunk_reload', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

window.addEventListener('load', () => {
  try {
    sessionStorage.removeItem('dt_chunk_reload')
  } catch {
    /* storage refused: nothing to clear */
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
function CustomTimePicker({ value, onChange, hasError = false }) {
  const { hour, minute, period } = to12Hour(value);

  const commit = (nextHour, nextMinute, nextPeriod) => {
    onChange(to24HourString(nextHour, nextMinute, nextPeriod));
  };

  const bumpHour = (dir) => {
    const next = ((hour - 1 + dir + 12) % 12) + 1;
    commit(next, minute, period);
  };
  const bumpMinute = (dir) => {
    const next = (minute + dir + 60) % 60;
    commit(hour, next, period);
  };
  const togglePeriod = () => commit(hour, minute, period === "AM" ? "PM" : "AM");

  const handleHourInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-2);
    if (raw === "") return;
    let n = parseInt(raw, 10);
    if (n < 1) n = 1;
    if (n > 12) n = 12;
    commit(n, minute, period);
  };

  const handleMinuteInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-2);
    if (raw === "") return;
    let n = parseInt(raw, 10);
    if (n > 59) n = 59;
    commit(hour, n, period);
  };

  const spinnerBtnClass = "flex justify-center text-slate-400 hover:text-blue-600 transition leading-none";
  const segmentClass =
    "w-6 border-none bg-transparent text-center text-sm font-semibold text-slate-800 font-sans outline-none";

  return (
    <div
      className={`flex h-[46px] w-full items-center gap-2 rounded-xl border bg-white px-3 shadow-sm transition ${
        hasError
          ? "border-red-400 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100"
          : "border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
      }`}
    >
      <div className="flex flex-col items-center leading-none">
        <button type="button" className={spinnerBtnClass} onClick={() => bumpHour(1)} tabIndex={-1}>
          <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={pad(hour)}
          onChange={handleHourInput}
          className={segmentClass}
        />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpHour(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      <span className="text-slate-400">:</span>

      <div className="flex flex-col items-center leading-none">
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(1)} tabIndex={-1}>
          <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={pad(minute)}
          onChange={handleMinuteInput}
          className={segmentClass}
        />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      <button
        type="button"
        onClick={togglePeriod}
        className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition font-sans"
      >
        {period}
      </button>
    </div>
  );
}
