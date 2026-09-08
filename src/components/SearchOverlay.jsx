import React, { useState, useEffect, useRef } from 'react';
import Search from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';

const SEARCH_TABS = [
    { key: 'mc', label: 'MC', placeholder: 'Enter MC number (e.g., 123456)' },
    { key: 'dot', label: 'DOT', placeholder: 'Enter DOT number (e.g., 1234567)' },
    { key: 'company', label: 'Company', placeholder: 'Enter company name' },
    { key: 'phone', label: 'Phone', placeholder: 'Enter phone number' },
    // { key: 'address', label: 'Address', placeholder: 'Enter address' },
    { key: 'email', label: 'Email', placeholder: 'Enter email address' },
    // { key: 'ein', label: 'EIN', placeholder: 'Enter EIN' },
];

const SearchOverlay = ({ open, onClose, onSearch, onTabChange, initialTab, initialQuery }) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'mc');
    const [query, setQuery] = useState(initialQuery || '');
    const inputRef = useRef(null);

useEffect(() => {
    if (open) {
        console.log("Overlay opened. initialTab =", initialTab);

        setActiveTab(initialTab || 'mc');
        setQuery(initialQuery || '');

        setTimeout(() => inputRef.current?.focus(), 50);
    } else {
        setQuery('');
    }
}, [open, initialTab, initialQuery]);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    const activeTabData = SEARCH_TABS.find(t => t.key === activeTab) || SEARCH_TABS[0];

 const submit = () => {
    console.log("Submitting search:", {
        query,
        activeTab,
    });

    if (query.trim()) {
        onSearch(query.trim(), activeTab);
    }
};

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(11, 30, 51, 0.97)',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
                animation: 'searchOverlayFadeIn 0.16s ease-out',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <style>{`
                @keyframes searchOverlayFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes searchOverlaySlideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* ---- Desktop values (default / unchanged) ---- */
                .so-close { top: 28px; right: 32px; padding: 8px; }
                .so-content { padding: 0 24px; }
                .so-tabs { gap: 6px; margin-bottom: 28px; }
                .so-tab { font-size: 12px; padding: 8px 16px; }
                .so-field { gap: 14px; padding-bottom: 14px; }
                .so-search-icon { font-size: 28px; }
                .so-input { font-size: 28px; }
                .so-submit { padding: 10px 22px; font-size: 13px; }
                .so-hint { margin-top: 16px; font-size: 12px; }

                /* ---- Tablet (<=1024px) ---- */
                @media (max-width: 1024px) {
                    .so-close { top: 22px; right: 22px; }
                    .so-tabs { margin-bottom: 24px; }
                    .so-search-icon { font-size: 24px; }
                    .so-input { font-size: 22px; }
                }

                /* ---- Mobile (<=640px) ---- */
                @media (max-width: 640px) {
                    .so-close { top: 14px; right: 14px; padding: 6px; }
                    .so-content { padding: 0 16px; }
                    .so-tabs { gap: 5px; margin-bottom: 20px; }
                    .so-tab { font-size: 10.5px; padding: 6px 12px; letter-spacing: 0.03em; }
                    .so-field { gap: 10px; padding-bottom: 10px; }
                    .so-search-icon { font-size: 20px; }
                    .so-input { font-size: 17px; }
                    .so-submit { padding: 8px 14px; font-size: 11px; }
                    .so-hint { margin-top: 12px; font-size: 11px; }
                }

                /* ---- Very small screens (<=380px) ---- */
                @media (max-width: 380px) {
                    .so-tab { font-size: 9.5px; padding: 5px 10px; }
                    .so-input { font-size: 15px; }
                    .so-submit { padding: 7px 10px; font-size: 10px; }
                }
            `}</style>

            <button
                onClick={onClose}
                aria-label="Close search"
                className="so-close"
                style={{
                    position: 'absolute',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    borderRadius: 8,
                    transition: 'color 0.15s, background-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
                <Close fontSize="medium" />
            </button>

            <div
                className="so-content"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'searchOverlaySlideDown 0.22s ease-out',
                }}
            >
                <div style={{ width: '100%', maxWidth: 640 }}>

                    {/* Type tabs */}
                    <div
                        role="tablist"
                        aria-label="Search by"
                        className="so-tabs"
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}
                    >
                        {SEARCH_TABS.map((tab) => {
                            const active = tab.key === activeTab;
                            return (
                                <button
                                    key={tab.key}
                                    role="tab"
                                    aria-selected={active}
                                    className="so-tab"
                                    onClick={() => {
                                        console.log("Clicked tab:", tab.key);

                                        setActiveTab(tab.key);

                                        onTabChange?.(tab.key);
                                    }}
                                    style={{
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                        borderRadius: 999,
                                        border: active ? '1px solid #4F8EF7' : '1px solid rgba(255,255,255,0.12)',
                                        backgroundColor: active ? 'rgba(79, 142, 247, 0.16)' : 'transparent',
                                        color: active ? '#9DC2FF' : 'rgba(255,255,255,0.55)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search field */}
                    <div
                        className="so-field"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            borderBottom: '2px solid rgba(255,255,255,0.18)',
                        }}
                    >
                        <Search className="so-search-icon" style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
                        <input
                            ref={inputRef}
                            type="text"
                            name="overlay_search_query"
                            autoComplete="off"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') submit();
                            }}
                            placeholder={activeTabData.placeholder}
                            className="so-input"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontWeight: 500,
                            }}
                        />
                        <button
                            onClick={submit}
                            disabled={!query.trim()}
                            className="so-submit"
                            style={{
                                backgroundColor: query.trim() ? '#4F8EF7' : 'rgba(255,255,255,0.08)',
                                color: query.trim() ? '#fff' : 'rgba(255,255,255,0.35)',
                                border: 'none',
                                borderRadius: 10,
                                fontWeight: 700,
                                letterSpacing: '0.03em',
                                textTransform: 'uppercase',
                                cursor: query.trim() ? 'pointer' : 'not-allowed',
                                flexShrink: 0,
                                transition: 'background-color 0.15s, color 0.15s',
                            }}
                        >
                            Search
                        </button>
                    </div>

                    <p className="so-hint" style={{
                        color: 'rgba(255,255,255,0.35)',
                        textAlign: 'center',
                    }}>
                        Press Enter to search, Esc to close
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SearchOverlay;