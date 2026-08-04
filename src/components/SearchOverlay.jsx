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
            `}</style>

            <button
                onClick={onClose}
                aria-label="Close search"
                style={{
                    position: 'absolute',
                    top: 28,
                    right: 32,
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 8,
                    borderRadius: 8,
                    transition: 'color 0.15s, background-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
                <Close fontSize="medium" />
            </button>

            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 24px',
                    animation: 'searchOverlaySlideDown 0.22s ease-out',
                }}
            >
                <div style={{ width: '100%', maxWidth: 640 }}>

                    {/* Type tabs */}
                    <div
                        role="tablist"
                        aria-label="Search by"
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: 6,
                            marginBottom: 28,
                        }}
                    >
                        {SEARCH_TABS.map((tab) => {
                            const active = tab.key === activeTab;
                            return (
                                <button
                                    key={tab.key}
                                    role="tab"
                                    aria-selected={active}
                                  onClick={() => {
    console.log("Clicked tab:", tab.key);

    setActiveTab(tab.key);

    onTabChange?.(tab.key);
}}
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                        padding: '8px 16px',
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
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            borderBottom: '2px solid rgba(255,255,255,0.18)',
                            paddingBottom: 14,
                        }}
                    >
                        <Search style={{ color: 'rgba(255,255,255,0.45)', fontSize: 28, flexShrink: 0 }} />
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
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: 28,
                                fontWeight: 500,
                            }}
                        />
                        <button
                            onClick={submit}
                            disabled={!query.trim()}
                            style={{
                                backgroundColor: query.trim() ? '#4F8EF7' : 'rgba(255,255,255,0.08)',
                                color: query.trim() ? '#fff' : 'rgba(255,255,255,0.35)',
                                border: 'none',
                                borderRadius: 10,
                                padding: '10px 22px',
                                fontSize: 13,
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

                    <p style={{
                        marginTop: 16,
                        fontSize: 12,
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