import React from 'react';

function CarrierProfileSection(props) {

    function renderValue(value) {

        return (
            value !== null &&
            value !== undefined &&
            value !== ''
        )
            ? value
            : 'NA';
    }

    function renderHeroSection() {

        return (

            <div className='overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.06)]'>

               <div className='flex flex-col gap-[24px] bg-gradient-to-r from-[#0E57C0] via-[#1a55cf] to-[#1E40AF] px-[20px] py-[24px] md:px-[28px] md:py-[26px] xl:flex-row xl:items-center xl:justify-between xl:px-[36px] xl:py-[28px]'>

                    <div className='min-w-0 flex flex-col justify-center'>

                        <div className='mb-[10px] text-[10px] font-[700] uppercase tracking-[0.14em] text-white/55 sm:text-[11px]'>
                             DBM: {renderValue(props.subtitle)}
                        </div>

                       <div className='text-[28px] leading-[1.1] font-[800] tracking-[-0.03em] text-white sm:text-[34px] lg:text-[38px] xl:text-[42px] break-words whitespace-normal'>
                            {renderValue(props.title)}
                        </div>

                    </div>

                  <div className='flex w-full flex-col gap-[12px] sm:flex-row sm:flex-wrap xl:w-auto xl:justify-end xl:gap-[16px] xl:mt-[18px]'>

                        {(props.actions || []).map(function (action, index) {

const isPrimary = action.variant === 'primary';
const isDanger = action.variant === 'danger';

function getButtonBaseClasses() {

    if (isPrimary) {
        return 'relative z-10 h-[48px] w-full rounded-[12px] bg-gradient-to-r from-[#37c96b] to-[#1fb854] px-[20px] text-[14px] font-[700] text-white';
    }

    if (isDanger) {
        return 'relative z-10 h-[48px] w-full rounded-[12px] border border-[#fecaca] bg-[#fff5f5] px-[20px] text-[14px] font-[600] text-[#dc2626] hover:bg-[#fee2e2]';
    }

    return 'relative z-10 h-[48px] w-full rounded-[12px] border border-[#d5ddeb] bg-white px-[20px] text-[14px] font-[600] text-[#334155]';
}

return (
    <button
        key={action.label}
        type="button"
        disabled={action?.disabled}
        onClick={() => {
            if (!action?.disabled && action?.onClick) {
                action.onClick();
            }
        }}
        className={
            getButtonBaseClasses() +
            ' sm:min-w-[190px] sm:w-auto sm:text-[15px] xl:h-[52px] xl:px-[22px] xl:text-[16px]' +
            (action?.disabled
                ? ' cursor-not-allowed opacity-60 grayscale'
                : ' cursor-pointer hover:opacity-90 transition-all')
        }
    >
                                    <span className="flex items-center justify-center gap-[10px]">
                                 {action?.loading ? (
    <span
        className={
            'h-[16px] w-[16px] animate-spin rounded-full border-2 ' +
            (
                isPrimary
                    ? 'border-white/40 border-t-white'
                    : isDanger
                        ? 'border-[#fca5a5]/50 border-t-[#dc2626]'
                        : 'border-[#94a3b8]/40 border-t-[#334155]'
            )
        }
    />
) : (
    action?.icon
)}
                                        {action?.label}
                                    </span>
                                </button>

                            );
                        })}

                    </div>

                </div>

                <div className='flex flex-col gap-[24px] bg-white px-[20px] py-[24px] md:px-[28px] md:py-[28px] xl:flex-row xl:items-center xl:justify-between xl:gap-[24px] xl:px-[28px] xl:py-[32px]'>

                   <div className='flex flex-wrap items-start gap-y-[22px] xl:items-start xl:gap-[30px]'>

                    {(props.leftItems || []).map(function (item, index) {

    const isStatus = item.label === 'STATUS';

    const isActiveStatus =
        item.value &&
        item.value.toString().toLowerCase() === 'active';

    return (

        <div
            key={index}
            className={
                index !== props.leftItems.length - 1
                    ? 'w-full border-b border-[#e5eaf2] pb-[18px] sm:w-auto sm:border-b-0 sm:border-r sm:pb-0 sm:pr-[24px] xl:pr-[30px]'
                    : 'w-full sm:w-auto'
            }
        >

            <div className='mb-[8px] h-[14px] text-[10px] font-[700] uppercase tracking-[0.12em] text-[#8b97a8] sm:text-[11px]'>
                {isStatus ? '\u00A0' : renderValue(item.label)}
            </div>

            <div className='flex h-[40px] items-center'>

                {isStatus ? (

                    <div className={`flex h-[36px] w-fit items-center gap-[8px] rounded-full border px-[18px] text-[13px] font-[700] uppercase xl:px-[22px] xl:text-[14px] animate-pulse
                        ${
                            isActiveStatus
                                ? 'border-[#caecd7] bg-[#ecfbf2] text-[#2f9e55]'
                                : 'border-[#fecaca] bg-[#fff1f1] text-[#dc2626]'
                        }`}
                    >
                        <span
                            className={`h-[9px] w-[9px] rounded-full ${
                                isActiveStatus ? 'bg-[#2ecc71]' : 'bg-[#dc2626]'
                            }`}
                        />
                        {renderValue(item.value)}
                    </div>

                ) : (

                    <div className='text-[14px] leading-[1.4] font-[500] text-[#111827] sm:text-[15px] xl:text-[16px]'>
                        {renderValue(item.value)}
                    </div>

                )}

            </div>

        </div>

    );
})}
                    </div>

                    <div className='flex flex-wrap items-center gap-[12px] xl:justify-end xl:gap-[18px]'>

                        {(props.rightItems || []).map(function (item, index) {

                            return (

                                <div
                                    key={index}
                                    className='flex min-w-[120px] flex-1 items-center justify-between gap-[10px] rounded-[6px] border border-[#e4e9f1] bg-[#fbfcfe] px-[12px] py-[10px] sm:flex-none sm:px-[14px] sm:py-[11px] xl:min-w-[134px]'
                                >

                                    <div className='text-[11px] font-[700] uppercase tracking-[0.02em] text-[#a3adba]'>
                                        {renderValue(item.label)}
                                    </div>

                                    <div className='text-[14px] font-[700] text-[#4b5563] xl:text-[15px]'>
                                        {renderValue(item.value)}
                                    </div>

                                </div>

                            );
                        })}

                    </div>

                </div>

            </div>

        );
    }

    function renderDefaultSection() {

        return (

            <div className='rounded-[16px] border border-[#d9e1ee] bg-white px-[18px] py-[22px] shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:px-[24px] sm:py-[28px] xl:px-[30px] xl:py-[34px]'>

                <div className='mb-[28px] flex items-center gap-[10px] xl:mb-[42px]'>

                    {props.titleIcon}

                    <h3 className='text-[16px] font-[500] text-[#1f2937] sm:text-[17px] xl:text-[18px]'>
                        {renderValue(props.title)}
                    </h3>

                </div>

                <div className='grid grid-cols-1 gap-x-[30px] gap-y-[24px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-[56px] xl:gap-y-[28px]'>

                    {(props.items || []).map(function (item, index) {

                        return (

                            <div key={index} className='flex items-start gap-[14px]'>

                                <div className='grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[14px] border border-[#edf2f7] bg-[#fbfcff] text-[#185abc] xl:h-[54px] xl:w-[54px]'>

                                    {
                                        item.icon &&
                                        React.cloneElement(item.icon, {
                                            size: 22,
                                            style: {
                                                display: 'block'
                                            }
                                        })
                                    }

                                </div>

                                <div className='min-w-0 pt-[3px]'>

                                    <div className='mb-[6px] text-[11px] font-[700] uppercase tracking-[0.16em] text-[#6b7280]'>
                                        {renderValue(item.label)}
                                    </div>

                                    <div className='break-words text-[14px] leading-[1.45] font-[500] text-[#111827] xl:text-[15px]'>
                                        {renderValue(item.value)}
                                    </div>

                                </div>

                            </div>

                        );
                    })}

                </div>

            </div>

        );
    }

    if (props.variant === 'hero') {

        return renderHeroSection();
    }

    return renderDefaultSection();
}

export default CarrierProfileSection;