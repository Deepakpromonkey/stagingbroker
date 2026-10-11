import { Fragment } from 'react';
import Icon from './Icon';
import { STATES, RAIL_STEPS, RAIL_LBL } from './quote';

import CircularProgress from '@mui/material/CircularProgress';

import ArrowBack from '@mui/icons-material/ArrowBack'

import { Link } from "react-router";

const CALLOUT_TONE = {
  amber: 'bg-amber-50 border-amber-100 text-amber-700',
  blue: 'bg-blue-50 border-blue-100 text-blue-700',
  green: 'bg-green-50 border-green-100 text-green-700',
  red: 'bg-red-50 border-red-100 text-red-700',
  purple: 'bg-purple-50 border-purple-100 text-purple-600',
};

export const panelCls = 'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden';

// ── Screen-id chip ──
export function ScrId({ id, name }) {
    return (
        <div className='flex items-start'>
            <div className="bg-white flex items-center gap-2 text-xs py-1 px-2 border border-gray-200 rounded-lg self-start">
                <span className="w-[6px] h-[6px] rounded-full bg-green-500"></span>
                {id} · {name}
            </div>
        </div>
    );
}

// ── Page header ──
export function PH({ crumb, title, desc, right, back }) {
  return (
    <div className="mt-2">
      <div>
        <div className='flex items-center mb-2 gap-2'>
          {back && <Link to={back} className='w-[26px] h-[26px] bg-gray-200 flex items-center justify-center border border-gray-300 rounded-full transition hover:bg-gray-300'><ArrowBack style={{fontSize:16}} /></Link>}
          {crumb && <div className="text-xs">{crumb}</div>}
        </div>
        {title && <h1 className='font-black text-xl'>{title}</h1>}
        {desc && <p className="text-gray-700 text-xs mt-1 leading-[1.5]">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

// ── State badge ──
export function Badge({ state }) {
  const [cls, lbl] = STATES[state] || ['t-gray', state];
  return (
    <span className={'tag ' + cls}>
      <span className="d"></span>
      {lbl}
    </span>
  );
}

// ── Generic tag ──
export function Tag({ cls, dot, children, style }) {
  return (
    <span className={'tag ' + cls} style={style}>
      {dot && <span className="d"></span>}
      {children}
    </span>
  );
}

// ── KPI card ──
export function Kpi({ icon, val, lbl, bg, fg, sub }) {
  return (
    <div className="flex flex-col items-start border-2 border-gray-500/[.1] shadow-sm p-4 rounded-2xl flex-1 bg-white">
      <div className={`${bg} ${fg} p-2 rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div className="font-semibold text-2xl mt-2">{val}</div>
      <div className="text-xs text-gray-700 font-bold mt-1">{lbl}</div>
      {sub ? <div className="text-gray-700 text-[10px] mt-1">{sub}</div> : null}
    </div>
  );
}

// ── Dev note (dark spec callout) ──
export function DevNote({ k = 'SPEC', children }) {
  return (
    <div className="dn">
      <span className="k">{k}</span>
      <div>{children}</div>
    </div>
  );
}

// ── Coloured callout ──
export function Callout({ tone, icon, iconSize = 15, children, className = '' }) {
  return (
    <div className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-[12.5px] leading-relaxed my-3 [&_b]:block [&_b]:mb-px ${CALLOUT_TONE[tone] || CALLOUT_TONE.blue} ${className}`}>
      {icon && <Icon name={icon} size={iconSize} />}
      <div>{children}</div>
    </div>
  );
}

export function Rail({ state }) {
  if (state === 'REFUNDED' || state === 'RETURNED' || state === 'CANCELLED') {
    return (
      <div className={panelCls + ' flex items-center px-5 py-4 overflow-x-auto'}>
        <div className="flex flex-col items-center gap-1.5 min-w-[86px]">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold bg-red-600 border-2 border-red-600 text-white">!</span>
          <span className="text-[10.5px] font-semibold text-red-700 text-center leading-tight">{STATES[state][1]}</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 min-w-6 mx-1 mb-6"></div>
        <div className="flex flex-col items-center gap-1.5 min-w-[86px]">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold bg-gray-100 text-gray-400 border-2 border-gray-200">·</span>
          <span className="text-[10.5px] font-semibold text-gray-400 text-center leading-tight">Funds returned to payer · transfer reversed if released</span>
        </div>
      </div>
    );
  }
  const idx = state === 'disputed' ? 2 : RAIL_STEPS.indexOf(state);
  return (
    <div className={panelCls + ' flex items-center px-5 py-4 overflow-x-auto'}>
      {RAIL_STEPS.map((sname, i) => {

        if(sname !== 'CANCELLED'){
        
          const isDone = i < idx;
          const isNow = i === idx;
          const alert = isNow && (state === 'disputed' || state === 'MANUAL_HOLD');
          const lbl =
            isNow && state === 'DISPUTED' ? 'Disputed — re-held'
              : isNow && state === 'MANUAL_HOLD' ? 'Manual hold'
                : isNow && state === 'AWAITING_CLAIM' ? 'Awaiting carrier claim'
                  : RAIL_LBL[sname];
          const numCls = isDone
            ? 'bg-green-600 border-green-600 text-white'
            : alert
              ? 'bg-red-600 border-red-600 text-white'
              : isNow
                ? 'bg-white border-green-600 text-green-700 ring-4 ring-green-600/15'
                : 'bg-gray-100 border-gray-200 text-gray-400';
          const txtCls = isDone ? 'text-gray-700' : alert ? 'text-red-700' : isNow ? 'text-green-700' : 'text-gray-400';
          return (
            <Fragment key={sname}>
              <div className="flex flex-col items-center gap-1.5 min-w-[86px]">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 ${numCls}`}>{isDone ? '✓' : i + 1}</span>
                <span className={`text-[10.5px] font-semibold text-center leading-tight ${txtCls}`}>{lbl}</span>
              </div>
              {i < RAIL_STEPS.length - 1 && <div className={`flex-1 h-0.5 min-w-6 mx-1 mb-6 ${isDone ? 'bg-green-600' : 'bg-gray-200'}`}></div>}
            </Fragment>
          );
        }
      })}
    </div>
  );
}

// ── Wizard stepper ──
export function Steps({ list, cur }) {
  return (
    <div className="flex items-center justify-start">
      {list.map((x, i) => {
        const n = i + 1;
        return (
          <Fragment key={i}>
            {i > 0 && <div className={'mx-3 w-[30px] h-[1px] bg-gray-400 ' + (n <= cur ? 'done' : '')}></div>}
            
            <div className={'flex items-center justify-center text-xs font-semibold ' + (n <= cur ? 'text-green-800' : n === cur ? 'now' : '')}>
                <div className={`w-[24px] h-[24px] border-2 rounded-full flex items-center justify-center text-[10px] ${n <= cur ? 'border-green-600 bg-white text-green-800' : 'border-gray-100 bg-gray-200'} font-bold mr-1`}>
                    {n < cur ? '✓' : n}
                </div>
                {x}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export function Card({title, children, titleClass, tilleAction, bodyClass, loading}){
  return (
    <div className="border-2 border-gray-500/[.1] shadow-sm rounded-2xl bg-white relative">

      {title &&
      
        <div className='p-4 border-b border-gray-500/[.15] flex justify-between items-center'>
          <h4 className={`font-bold text-gray-400 uppercase text-xs ${titleClass}`}>{title}</h4>

          {tilleAction}
        </div>
      }

      <div className={`px-4 py-3 ${bodyClass}`}>
        {children}
      </div>

      {loading &&
      
        <div className='absolute w-full h-full top-0 left-0 z-90 flex items-center justify-center'>
          <CircularProgress />
        </div>
      }
    </div>
  );
}

export function SumRow({ tot, sub, children }) {
  return (
    <div className={
      'flex justify-between py-1 text-[13px] text-gray-700 ' +
      (tot ? 'font-bold text-sm border-t border-gray-200 mt-1.5 pt-2 text-gray-900' : sub ? 'text-xs text-gray-500' : '')
    }>
      {children}
    </div>
  );
}

export function Sum({ className = '', children }) {
  return <div className={`bg-gray-25 border border-gray-200 rounded-lg px-4 py-3.5 my-3.5 ${className}`}>{children}</div>;
}

const TE_DOT = { g: 'border-green-600', a: 'border-amber-600', r: 'border-red-600', b: 'border-blue-600', '': 'border-gray-300' };

export function Te({ tone = '', date, ev, meta }) {
  return (
    <div className="relative pb-4 last:pb-0 flex flex-col justify-start items-start">
      <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full bg-white border-[3px] ${TE_DOT[tone] || TE_DOT['']}`}></div>
      <div className="font-mono text-[10px] text-gray-400">{date}</div>
      <div className="text-[13px] font-semibold mt-0.5 text-gray-900">{ev}</div>
      {meta && <div className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed">{meta}</div>}
    </div>
  );
}

// ── Form field wrapper (label + hint/error) ──
export function Field({ label, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      {label &&
        <label className="text-xs font-semibold text-gray-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      }
      {children}
      {error
        ? <span className="text-[11px] text-red-600">{error}</span>
        : hint
          ? <span className="text-[11px] text-gray-400">{hint}</span>
          : null
      }
    </div>
  );
}

export const inputCls = 'w-full h-[38px] px-3 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 placeholder:text-gray-400';
export const inputErrCls = 'border-red-300 focus:ring-red-100 focus:border-red-400';

export const thCls = 'text-left px-4 py-2.5 text-[10.5px] font-bold tracking-wide uppercase text-gray-400 border-b border-gray-100 bg-gray-25';
export const tdCls = 'px-4 py-2.5 border-b border-gray-100 align-middle text-[13px]';
export const trClickCls = 'cursor-pointer transition hover:bg-gray-25';

// ── Timeline ──
export function Tml({ children }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-1.5 top-1.5 bottom-1.5 w-0.5 bg-gray-200"></div>
      {children}
    </div>
  );
}