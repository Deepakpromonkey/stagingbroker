import React from 'react';

function SafetyConsoleTabs({ activeTab, onTabChange }) {
    const tabs = ['OVERVIEW', 'BASICS', 'INSPECTIONS', 'CRASHES'];

    return (
        <div className='border-b border-[#d9e1ee] bg-[#F1F7FF] px-35.5'>
            <div className='flex gap-42.5'> 
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`relative py-4.5 text-[11px] font-[800] tracking-[1px] uppercase transition-all ${
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