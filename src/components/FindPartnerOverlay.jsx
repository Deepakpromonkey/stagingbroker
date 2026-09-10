import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Backdrop from '@mui/material/Backdrop';
import CloseIcon from '@mui/icons-material/Close';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchIcon from '@mui/icons-material/Search';

const PARTNER_TYPES = ['All Companies', 'Brokers', 'Carriers', 'Shippers'];
const DEFAULT_TYPE = PARTNER_TYPES[0];
const FIELD_HEIGHT = 44;

export default function FindPartnerOverlay({ open, onClose, onSearch }) {
    const [type, setType] = useState(DEFAULT_TYPE);
    const [location, setLocation] = useState('');

    const resetFields = () => {
        setType(DEFAULT_TYPE);
        setLocation('');
    };

    const handleClose = () => {
        resetFields();
        onClose?.();
    };

    const handleSearch = () => {
        try {
            onSearch?.({ type, location });
        } finally {
            // finally guarantees this runs even if onSearch throws,
            // so the modal ALWAYS closes on search.
            resetFields();
            onClose?.();
        }
    };

    // Handles both the Search button click AND the Enter key from any
    // field inside the <form> below (not just the location input).
    const handleSubmit = (e) => {
        e.preventDefault(); // stop native form submission / page reload
        handleSearch();
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeAfterTransition
            slots={{ backdrop: Backdrop }}
            slotProps={{
                backdrop: {
                    timeout: 250,
                    sx: { backgroundColor: 'rgba(8,11,20,0.72)', backdropFilter: 'blur(3px)' },
                },
            }}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}
        >
            <Fade in={open}>
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 620,
                        bgcolor: '#0f172a',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                        p: { xs: 3, sm: 4.5 },
                        position: 'relative',
                        outline: 'none',
                    }}
                >
                    <IconButton
                        onClick={handleClose}
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            color: '#94a3b8',
                            '&:hover': { color: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.06)' },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>

                    {/* Icon badge */}
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                        }}
                    >
                        <PersonSearchOutlinedIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>

                    {/* Heading */}
                    <Box sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 700, color: '#f8fafc', mb: 0.5 }}>
                        Find a new partner
                    </Box>
                    <Box sx={{ fontSize: 13.5, color: '#94a3b8', mb: 3.5 }}>
                        Search verified brokers and carriers near you.
                    </Box>

                    {/* Fields */}
                    <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
                        <Box sx={{ flex: '0 0 auto', width: { xs: '100%', sm: 190 } }}>
                            <Box sx={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', mb: 0.75 }}>
                                I'm looking for
                            </Box>
                            <Select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                fullWidth
                                sx={{
                                    height: FIELD_HEIGHT,
                                    bgcolor: '#ffffff',
                                    borderRadius: '999px',
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                    '& .MuiSelect-select': {
                                        display: 'flex',
                                        alignItems: 'center',
                                        height: `${FIELD_HEIGHT}px !important`,
                                        boxSizing: 'border-box',
                                        py: 0,
                                        pl: 2.5,
                                    },
                                }}
                            >
                                {PARTNER_TYPES.map((t) => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </Select>
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', mb: 0.75 }}>
                                Located in
                            </Box>
                            <Box
                                sx={{
                                    height: FIELD_HEIGHT,
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    alignItems: 'center',
                                    bgcolor: '#ffffff',
                                    borderRadius: '999px',
                                    pl: 2.5,
                                }}
                            >
                                <PlaceOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }} />
                                <InputBase
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Enter City, State, or Zip"
                                    sx={{
                                        fontSize: 13.5,
                                        color: '#0f172a',
                                        width: '100%',
                                        height: '100%',
                                        px: 1.25,
                                        '& .MuiInputBase-input': { height: '100%', py: 0 },
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>

                    {/* Search button — type="submit" so it goes through the
                        same form onSubmit as pressing Enter in any field */}
                    <Button
                        type="submit"
                        fullWidth
                        startIcon={<SearchIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            mt: 3,
                            bgcolor: '#2563eb',
                            color: '#fff',
                            textTransform: 'none',
                            borderRadius: '999px',
                            py: 1.25,
                            fontWeight: 700,
                            fontSize: 14,
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Search
                    </Button>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
}