import React from 'react';

import {
    LocationOn,
    Phone,
    Email,
    FiberManualRecord,
    Check,
    Close,
    Remove,
    Badge,
    ConfirmationNumber,
    Fingerprint,
    Groups,
    Route
} from '@mui/icons-material';

const BRAND_PRIMARY = '#2953E4';
const BRAND_PRIMARY_DARK = '#1E3FB8';
const BRAND_PRIMARY_TINT = '#EEF2FF';
const BRAND_PRIMARY_BORDER = 'rgba(41,83,228,0.32)';

const INK = '#101828';
const SLATE = '#475569';
const MUTED = '#667085';
const BORDER = '#E4E7EC';
const SURFACE = '#F9FAFB';

const GREEN = '#15924C';
const GREEN_TEXT = '#15803D';
const GREEN_TINT = '#E7FBEF';
const GREEN_BORDER = 'rgba(21,146,76,0.38)';

const RED = '#DC2626';
const RED_TEXT = '#B42318';
const RED_TINT = '#FEECEB';
const RED_BORDER = 'rgba(220,38,38,0.36)';

const AMBER = '#F59E0B';
const AMBER_TEXT = '#B45309';
const AMBER_TINT = '#FFF6E0';
const AMBER_BORDER = 'rgba(245,158,11,0.40)';

const NEUTRAL_TEXT = '#475569';
const NEUTRAL_TINT = '#EEF1F5';
const NEUTRAL_BORDER = 'rgba(71,85,105,0.30)';

const SCORE_TIERS = [
    { min: 80, label: 'STRONG', ring: '#16A34A', text: GREEN_TEXT, tint: GREEN_TINT, border: GREEN_BORDER },
    { min: 50, label: 'MODERATE', ring: AMBER, text: AMBER_TEXT, tint: AMBER_TINT, border: AMBER_BORDER },
    { min: 0, label: 'WEAK', ring: '#DC2626', text: '#B91C1C', tint: RED_TINT, border: RED_BORDER }
];

function getScoreTier(score) {

    const numeric = Number(score);

    if (score === undefined || score === null || score === '' || Number.isNaN(numeric)) {
        return null;
    }

    return SCORE_TIERS.find(function (tier) {
        return numeric >= tier.min;
    });
}

function isUnratedValue(value) {

    if (value === undefined || value === null) return true;

    const normalized = value.toString().trim().toLowerCase();

    return normalized === '' || normalized === 'not rated' || normalized === 'unrated' || normalized === 'n/a';
}

function DTScorePanel(props) {

    const score = props.score;
    const tier = getScoreTier(score);

    if (!tier) {

        return (

            <div className='flex flex-col items-center gap-[6px]'>

                <span className='text-[9.5px] font-[800] tracking-[0.12em] text-[#98A2B3] uppercase'>
                    DT Score
                </span>

                <div className='flex items-center justify-center w-[72px] h-[72px] rounded-full border-2 border-dashed border-[#CBD2DC] bg-white'>
                    <Remove className='!text-[16px] text-[#98A2B3]' />
                </div>

                <span className='text-[10.5px] font-[700] text-[#98A2B3]'>
                    Not yet scored
                </span>

            </div>
        );
    }

    const size = 62;
    const strokeWidth = 7;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(100, Number(score)));
    const offset = circumference - (progress / 100) * circumference;

    return (

        <div className='flex flex-col items-center gap-[6px]'>

            <span className='text-[9.5px] font-[800] tracking-[0.12em] text-[#98A2B3] uppercase'>
                DT Score
            </span>

            <div className='relative' style={{ width: size, height: size }}>

                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className='-rotate-90'>

                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill='white' stroke='#E4E7EC' strokeWidth={strokeWidth}
                    />

                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill='none' stroke={tier.ring} strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap='round'
                    />

                </svg>

                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <span className='text-[20px] font-[800] leading-none tracking-[-0.01em]' style={{ color: INK }}>
                        {score}
                    </span>
                    <span className='text-[8.5px] font-[600] text-[#98A2B3] mt-[1px]'>/ 100</span>
                </div>

            </div>

            <span
                className='text-[9.5px] font-[800] tracking-[0.05em] uppercase px-[8px] py-[2px] rounded-full'
                style={{ color: tier.text, background: 'white', border: `1px solid ${tier.border}` }}
            >
                {tier.label}
            </span>

        </div>
    );
}

function CheckRow(props) {

    const active = props.active;
    const label = props.label;

    return (

        <div
            className='w-full flex items-center justify-between gap-[8px] text-[10.5px] font-[700] px-[10px] py-[7px] rounded-[9px] whitespace-nowrap'
            style={{
                color: active ? GREEN_TEXT : RED_TEXT,
                background: 'white',
                border: `1px solid ${active ? GREEN_BORDER : RED_BORDER}`
            }}
        >

            <span>{label}</span>

            <span
                className='flex items-center justify-center w-[16px] h-[16px] rounded-full shrink-0 text-white'
                style={{ background: active ? GREEN : RED }}
            >
                {active
                    ? <Check className='!text-[10px]' />
                    : <Close className='!text-[10px]' />
                }
            </span>

        </div>
    );
}

function RiskButton(props) {

    const rawRisk = props.risk;

    if (isUnratedValue(rawRisk)) {

        return (
            <span
                className='w-full text-center px-[9px] py-[8px] rounded-full text-[10px] font-[800] tracking-[0.05em] uppercase'
                style={{ color: NEUTRAL_TEXT, background: 'white', border: `1px solid ${NEUTRAL_BORDER}` }}
            >
                Not rated
            </span>
        );
    }

    const risk = rawRisk.toLowerCase();

    let text = AMBER_TEXT, border = AMBER_BORDER;

    if (risk.includes('low')) { text = GREEN_TEXT; border = GREEN_BORDER; }
    else if (risk.includes('high')) { text = RED_TEXT; border = RED_BORDER; }

    return (
        <span
            className='w-full text-center px-[9px] py-[8px] rounded-full text-[10px] font-[800] tracking-[0.05em] uppercase'
            style={{ color: text, background: 'white', border: `1px solid ${border}` }}
        >
            {rawRisk}
        </span>
    );
}

function CarrierOperationTag(props) {

    const value = (props.value || '').toUpperCase();

    const tags = [];

    const hasIntrastate = value.includes('B') || value.includes('C');

    if (value.includes('A')) {
        tags.push({ label: 'INTERSTATE', text: BRAND_PRIMARY_DARK, tint: BRAND_PRIMARY_TINT, border: BRAND_PRIMARY_BORDER });
    }

    if (hasIntrastate) {
        tags.push({ label: 'INTRASTATE', text: BRAND_PRIMARY_DARK, tint: BRAND_PRIMARY_TINT, border: BRAND_PRIMARY_BORDER });
    }

    if (value.includes('B')) {
        tags.push({ label: 'HAZMAT', text: GREEN_TEXT, tint: GREEN_TINT, border: GREEN_BORDER });
    }

    if (value.includes('C')) {
        tags.push({ label: 'NON-HAZMAT', text: RED_TEXT, tint: RED_TINT, border: RED_BORDER });
    }

    return tags.map(function (tag, index) {

        return (

            <span
                key={index}
                className='inline-flex items-center px-[11px] py-[4px] rounded-full text-[10.5px] font-[800] tracking-[0.04em] uppercase leading-[1.5] whitespace-nowrap'
                style={{ color: tag.text, background: tag.tint, border: `1px solid ${tag.border}` }}
            >
                {tag.label}
            </span>
        );
    });
}

function AuthorityTag(props) {

    const status = (props.active || '').toString().toUpperCase();
    const isActive = status === 'A';

    const text = isActive ? GREEN_TEXT : RED_TEXT;
    const tint = isActive ? GREEN_TINT : RED_TINT;
    const border = isActive ? GREEN_BORDER : RED_BORDER;
    const dot = isActive ? GREEN : RED;

    return (
        <span
            className='inline-flex items-center gap-[6px] px-[11px] py-[4px] rounded-full text-[10.5px] font-[800] tracking-[0.04em] leading-[1.5] uppercase whitespace-nowrap'
            style={{ color: text, background: tint, border: `1px solid ${border}` }}
        >
            <FiberManualRecord className='!text-[7px]' style={{ color: dot }} />
            {isActive ? 'ACTIVE AUTHORITY' : 'INACTIVE AUTHORITY'}
        </span>
    );
}

function IdentityGrid(props) {

    const fields = props.fields;

    return (

        <div className='w-full grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-[8px] sm:gap-[10px]'>

            {fields.map(function (field) {

                return (

                    <div
                        key={field.key}
                        className='min-w-0 rounded-[12px] px-[10px] sm:px-[12px] py-[9px] sm:py-[10px] flex flex-col gap-[6px] sm:gap-[8px] transition-colors duration-150'
                        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    >

                        <div
                            className='flex items-center justify-center w-[24px] h-[24px] rounded-[8px]'
                            style={{ background: BRAND_PRIMARY_TINT, color: BRAND_PRIMARY_DARK }}
                        >
                            {field.icon}
                        </div>

                        <div>

                            <div className='text-[8.5px] font-[700] tracking-[0.07em] uppercase mb-[2px]' style={{ color: '#98A2B3' }}>
                                {field.label}
                            </div>

                            <div className='text-[12.5px] sm:text-[13px] font-[800] truncate' style={{ color: INK }}>
                                {field.value || '-'}
                                {field.suffix && (
                                    <span className='text-[10px] font-[500] ml-[3px]' style={{ color: MUTED }}>
                                        {field.suffix}
                                    </span>
                                )}
                            </div>

                        </div>

                    </div>
                );
            })}

        </div>
    );
}

function ContactChip(props) {

    return (

        <span
            className='flex items-center gap-[7px] text-[11.5px] sm:text-[12px] font-[600] px-[10px] sm:px-[12px] py-[6px] sm:py-[7px] rounded-full max-w-full'
            style={{ color: SLATE, background: 'white', border: `1px solid ${BORDER}` }}
        >
            <span style={{ color: BRAND_PRIMARY }} className='flex items-center shrink-0'>
                {props.icon}
            </span>
            <span className='truncate'>{props.text}</span>
        </span>
    );
}

function RemoveButton(props) {

    return (

        <button
            onClick={(e) => {
                e.stopPropagation();
                props.onRemove?.(props.carrierId);
            }}
            title={props.label || 'Remove from shortlist'}
            aria-label={props.label || 'Remove from shortlist'}
            className='
                absolute -top-[10px] -right-[10px] sm:-top-[11px] sm:-right-[11px]
                flex items-center justify-center
                w-[26px] h-[26px] sm:w-[28px] sm:h-[28px]
                rounded-full
                bg-white
                text-[#98A2B3]
                shadow-[0_2px_6px_rgba(16,24,40,0.14)]
                opacity-100 sm:opacity-0
                scale-100 sm:scale-75
                pointer-events-auto sm:pointer-events-none
                group-hover:opacity-100
                group-hover:scale-100
                group-hover:pointer-events-auto
                hover:bg-[#DC2626]
                hover:text-white
                hover:border-[#DC2626]
                hover:shadow-[0_4px_10px_rgba(220,38,38,0.28)]
                active:scale-90
                transition-all duration-150 ease-out
                z-20
            '
            style={{ border: `1.5px solid ${BORDER}` }}
        >
            <Close className='!text-[13px] sm:!text-[14px]' />
        </button>
    );
}

function CarrierCard(props) {

    const carrier = props.carrier;
    const handleClick = props.onClick;
    const showRemove = props.showRemove;
    const onRemove = props.onRemove;

    const idFields = [
        { key: 'mc', label: 'MC NUMBER', value: carrier.mc_number, icon: <Badge className='!text-[14px]' /> },
        { key: 'dot', label: 'DOT NUMBER', value: carrier.dot_number, icon: <ConfirmationNumber className='!text-[14px]' /> },
        { key: 'duns', label: 'DUNS', value: carrier.duns, icon: <Fingerprint className='!text-[14px]' /> },
        {
            key: 'fleet',
            label: 'FLEET SIZE',
            value: carrier.fleet_size || '-',
            suffix: carrier.fleet_size ? 'units' : '',
            icon: <Groups className='!text-[14px]' />
        },
        {
            key: 'mileage',
            label: 'MILEAGE',
            value: carrier.mileage ? Number(carrier.mileage).toLocaleString() : '-',
            suffix: carrier.mileage ? 'mi' : '',
            icon: <Route className='!text-[14px]' />
        }
    ];

    const contactItems = [
        { icon: <LocationOn className='!text-[14px]' />, text: carrier.address || '-' },
        { icon: <Phone className='!text-[14px]' />, text: carrier.phone || '-' },
        { icon: <Email className='!text-[14px]' />, text: carrier.email || '-' }
    ];

    const tier = getScoreTier(carrier.dt_score);

    const isClickable = typeof handleClick === 'function';

    let outerClass = 'relative mb-[14px] sm:mb-[18px] transition-transform duration-200 group ';
    outerClass += isClickable ? 'cursor-pointer hover:-translate-y-[2px]' : 'cursor-default';

    let innerClass =
        'relative bg-white rounded-[16px] sm:rounded-[20px] border border-[#E4E7EC] pt-[18px] px-[16px] pb-[18px] sm:pt-[22px] sm:px-[26px] sm:pb-[22px] overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_rgba(16,24,40,0.05)] transition-all duration-200 ';

    if (isClickable) {
        innerClass += 'group-hover:shadow-[0_14px_30px_rgba(16,24,40,0.10)] group-hover:border-[#C7D3FB]';
    }

    function handleCardClick() {
        if (isClickable) {
            handleClick(carrier);
        }
    }

    return (

        <div className={outerClass}>

            <div
                onClick={handleCardClick}
                className={innerClass}
            >

                <span
                    className='absolute left-0 right-0 top-0 h-[4px] sm:h-[5px]'
                    style={{ background: `linear-gradient(90deg, ${BRAND_PRIMARY} 0%, ${BRAND_PRIMARY_DARK} 100%)` }}
                />

                <div className='flex flex-col lg:flex-row lg:items-stretch gap-[16px] lg:gap-[20px] mt-[6px]'>

                <div className='flex-1 min-w-0 flex flex-col justify-center gap-[16px] sm:gap-[20px] lg:gap-[25px]'>

                    <div className='flex items-center gap-[8px] sm:gap-[10px] flex-wrap'>

                        <h3 className='text-[15px] sm:text-[17px] font-[800] tracking-[-0.01em] m-0 break-words' style={{ color: INK }}>
                            {carrier.company_name || '-'}
                        </h3>

                        <CarrierOperationTag value={carrier.carrier_operation} />
                        <AuthorityTag active={carrier.active_authority} />

                    </div>

                    <IdentityGrid fields={idFields} />

                    <div className='flex flex-wrap gap-[8px] sm:gap-[10px]'>

                        {contactItems.map(function (item, index) {
                            return <ContactChip key={index} icon={item.icon} text={item.text} />;
                        })}

                    </div>

                </div>

                <div
                    className='w-full lg:w-[176px] lg:shrink-0 flex flex-col items-center gap-[7px] rounded-[16px] px-[14px] py-[12px]'
                    style={{
                        background: tier ? tier.tint : NEUTRAL_TINT,
                        border: `1.5px solid ${tier ? tier.border : NEUTRAL_BORDER}`
                    }}
                >

                    <DTScorePanel score={carrier.dt_score} />

                    <div className='w-full h-px' style={{ background: BORDER }} />

                    <CheckRow active={carrier.authority_verified} label='Authority verified' />
                    <CheckRow active={carrier.insurance_current} label='Insurance current' />

                    <RiskButton risk={carrier.risk_level} />

                </div>

                </div>

            </div>

            {showRemove && (
                <RemoveButton carrierId={carrier.carrier_id} onRemove={onRemove} label={props.removeLabel} />
            )}

        </div>
    );
}

export default CarrierCard;