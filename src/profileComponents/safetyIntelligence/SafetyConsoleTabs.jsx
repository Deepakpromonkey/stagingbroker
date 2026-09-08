import React from 'react';

function SafetyConsoleTabs({ activeTab, onTabChange }) {
    const tabs = [ 'BASICS', 'INSPECTIONS', 'CRASHES'];

    return (
        <div className='border-b border-[#d9e1ee] bg-[#F1F7FF] px-[16px] sm:px-[28px] md:px-[48px]'>
            <div className='flex justify-between sm:justify-start sm:gap-[40px] md:gap-[64px]'>
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`relative py-3 sm:py-3.5 md:py-4.5 text-[10px] sm:text-[10.5px] md:text-[11px] font-[800] tracking-[0.8px] md:tracking-[1px] uppercase transition-all whitespace-nowrap ${
                            activeTab === tab ? '' : 'text-[#7c8fac] hover:text-[#111827]'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className='absolute bottom-2 left-0 h-[3px] w-full rounded-t-[4px] bg-[#2563EB]' />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default SafetyConsoleTabs;