import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

import SearchIcon from '@mui/icons-material/Search';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import Checklist from '@mui/icons-material/Checklist';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import Group from '@mui/icons-material/Group';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';

import { apiFetch } from '../lib/api';
import { logout } from '../utils/Auth';
import logo from '../assets/images/logo.webp';

import SearchOverlay from './SearchOverlay';
import FindPartnerOverlay from './FindPartnerOverlay';

const AUTH_TOKEN_KEY = 'crm_auth_token';
const AUTH_USER_KEY = 'crm_user';

const NAV_LINKS = [
    { label: 'Search & Vet', to: '/search-vet' },
    { label: 'Carriers', to: '/carriers' },
    {
        label: 'Load Search',
        to: '/load-search',
        permission: 'book-assign-loads',
    },
    { label: 'Carrier Q/A', to: '/carrier-questions' },
    { label: 'Risk & Alerts', to: '/risk-alerts' },
    { label: 'DT-Pay', to: '/dt-pay' },
];

// Subscription/pricing is a forced, standalone step (right after signup,
// or via RouteGuard's plan-selection redirect) and isn't shown as part of
// the app header/nav — that page renders full-page with the header hidden
// (see App.jsx's NO_HEADER_PATHS), so there's no header link to it.
const PROFILE_LINKS = [
    { key: 'profile_page', label: 'Profile', icon: <AssignmentIndOutlinedIcon sx={{ fontSize: 18 }} />, to: '/profile' },
    { key: 'profile_shortlisting', label: 'Carriers Shortlisted', icon: <Checklist sx={{ fontSize: 18 }} />, to: '/profile/carriers/shortlisted' },
    { key: 'profile_blocked', label: 'Carriers Blocked', icon: <BlockOutlined sx={{ fontSize: 18 }} />, to: '/profile/carriers/blocked' },
    { key: 'scoring_weights', label: 'Scoring Weights', icon: <SettingsOutlined sx={{ fontSize: 18 }} />, to: '/profile/scoring-weights', permission: 'edit-scoring-config' },
    {
        key: 'carrier_settings',
        label: 'Carrier Settings',
        icon: <DescriptionOutlined sx={{ fontSize: 18 }} />,
        to: '/settings/carrier',
        permission: 'edit-carrier-agreements',
    },
    {
        key: 'users',
        label: 'Users',
        icon: <Group sx={{ fontSize: 18 }} />,
        to: '/users',
        permission: ['manage-users-basic', 'manage-users-all'],
    },
];

function navLinkClass({ isActive }) {
    return [
        'px-3.5 py-2 rounded-lg text-[12.5px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors',
        isActive
            ? 'bg-indigo-100/70 text-slate-900'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
    ].join(' ');
}

// ---------------------------------------------------------------------
// Same normalization ProfileUpdate does: right after a fresh login, the
// stored "crm_user" object may only have "profile_image" (the field the
// API actually returns) and not "profile_pic_url" (the field this header
// reads for the Avatar src). Without this fallback the avatar stays blank
// until the user happens to open /profile, since that page was previously
// the only place that normalized and rewrote it back to localStorage.
//
// Kept as a standalone helper (rather than inlined) so every place that
// can produce/consume a "crm_user"-shaped object in this component —
// initial read, the "storage" event, and the "crm-user-updated" event —
// goes through the same fallback logic.
// ---------------------------------------------------------------------
function normalizeUser(rawUser) {
    if (!rawUser) return rawUser;
    const resolvedPicUrl = rawUser.profile_pic_url || rawUser.profile_image || '';
    return { ...rawUser, profile_pic_url: resolvedPicUrl };
}

export default function AppHeader() {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);

    const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
    const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
    const [findPartnerOpen, setFindPartnerOpen] = useState(false);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const readUserFromStorage = () => {
        const storedUser = localStorage.getItem(AUTH_USER_KEY);
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                const normalizedUser = normalizeUser(parsedUser);

                // If we had to fall back to profile_image, persist the fix so
                // every other reader of crm_user (this header, other tabs,
                // ProfileUpdate, etc.) sees the corrected shape too, not just
                // this component instance.
                if (normalizedUser.profile_pic_url && !parsedUser.profile_pic_url) {
                    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
                }

                setUser(normalizedUser);
            } catch (e) {
                setUser(null);
            }
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        readUserFromStorage();
        setMobileDrawerOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const onStorage = (e) => {
            if (!e.key || e.key === AUTH_USER_KEY) {
                readUserFromStorage();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);


    useEffect(() => {
        const onUserUpdated = (e) => {
            if (e?.detail) {
                setUser(normalizeUser(e.detail));
            } else {
                readUserFromStorage();
            }
        };
        window.addEventListener('crm-user-updated', onUserUpdated);
        return () => window.removeEventListener('crm-user-updated', onUserUpdated);
    }, []);

    const handleLogout = () => {
        logout(navigate);
    };

    const can = (permission, u) => {
        if (!u) return false;

        const permissions = u?.permissions || [];

        if (Array.isArray(permission)) {
            return permission.some((p) => permissions.includes(p));
        }

        return permissions.includes(permission);
    };

    const getFilteredProfileLinks = () => {
        return PROFILE_LINKS.filter((_link) => {
            if (!_link.permission) return true;
            return can(_link.permission, user);
        });
    };

    if (!user) return null;

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

    const filteredNavLinks = NAV_LINKS.filter(
        (item) => !item.permission || can(item.permission, user)
    );

    return (
        <Box 
            className="shadow-xs border-b border-gray-100 relative"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 64,
                px: { xs: 1.5, sm: 2, lg: 3 },
                gap: { xs: 1, lg: 5 },
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden'
            }}
        >
            {/* Logo */}
            <Box sx={{ flexShrink: 0 }}>
                <Link to="/dashboard" className="logo">
                    <Box
                        component="img"
                        src={logo}
                        alt="Dollar Traq"
                        sx={{
                            width: { xs: 110, sm: 130, lg: 140 },
                            marginRight: 3,
                            display: 'block',
                        }}
                    />
                </Link>
            </Box>

            {/* Desktop Navigation */}
            <Box 
                sx={{ 
                    display: { xs: 'none', lg: 'flex' }, 
                    flex: 1, 
                    justifyContent: 'center',
                    minWidth: 0,
                }}
            >
                <nav className="flex items-center gap-1">
                    {filteredNavLinks.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/carriers"}
                            className={navLinkClass}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </Box>

            {/* Desktop Actions */}
            <Toolbar 
                disableGutters
                sx={{ 
                    display: { xs: 'none', lg: 'flex' }, 
                    flexShrink: 0, 
                    marginLeft: 0 
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Button
                        id="find_partner_button"
                        variant="outlined"
                        size="small"
                        disableRipple
                        startIcon={<PersonSearchOutlinedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setFindPartnerOpen(true)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: 12.5,
                            borderRadius: '8px',
                            borderColor: 'rgba(226,232,240,1)',
                            color: '#334155',
                            px: 1.5,
                            mr: 1,
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTapHighlightColor: 'transparent', // kills the gray tap flash on click/keyboard activation
                            outline: 'none',
                            '& *': {
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                            },
                            '&:focus': {
                                outline: 'none',
                            },
                            '&.Mui-focusVisible': {
                                outline: 'none',
                                backgroundColor: 'transparent',
                            },
                            '&:hover': {
                                borderColor: 'rgba(203,213,225,1)',
                                backgroundColor: 'rgba(248,250,252,1)',
                            },
                        }}
                    >
                        Find New Partner
                    </Button>

                    <IconButton
                        id="search_button"
                        size="small"
                        aria-label="Search"
                        onClick={() => setSearchOverlayOpen(true)}
                    >
                        <SearchIcon fontSize="small" />
                    </IconButton>

                    <IconButton id="notification_button" size="small">
                        <Badge badgeContent={notificationsCount} color="secondary">
                            <NotificationsOutlinedIcon fontSize="small" />
                        </Badge>
                    </IconButton>

                    <Box sx={{ width: '1px', height: 24, backgroundColor: 'rgba(0,0,0,0.08)', mx: 1 }} />

                    <Button
                        variant="text"
                        size="small"
                        endIcon={<KeyboardArrowDownIcon />}
                        sx={{ backgroundColor: 'rgba(241, 245, 249, 1)', border: '1px solid rgba(226, 232, 240, 1)', padding: '4px 15px 4px 4px' }}
                        onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
                    >
                        <Avatar
                            style={{ width: 25, height: 25 }}
                            alt={user.first_name}
                            src={user.profile_pic_url}
                            sx={{ background: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)', fontSize: 11, fontWeight: 600 }}
                        >
                            {initials || <AssignmentIndOutlinedIcon sx={{ fontSize: 15 }} />}
                        </Avatar>

                        <span className="ml-2 capitalize font-bold text-xs">
                            {user.first_name}
                        </span>
                    </Button>

                    <IconButton
                        edge="end"
                        color="inherit"
                        className="header-logout"
                        onClick={handleLogout}
                    >
                        <PowerSettingsNewIcon />
                    </IconButton>
                </div>
            </Toolbar>

            {/* Mobile & Tablet Actions */}
            <Box 
                sx={{ 
                    display: { xs: 'flex', lg: 'none' }, 
                    alignItems: 'center', 
                    gap: { xs: 0.25, sm: 0.5 },
                    flexShrink: 0,
                }}
            >
                <IconButton
                    size="small"
                    aria-label="Find New Partner"
                    onClick={() => setFindPartnerOpen(true)}
                >
                    <PersonSearchOutlinedIcon fontSize="small" />
                </IconButton>

                <IconButton
                    size="small"
                    aria-label="Search"
                    onClick={() => setSearchOverlayOpen(true)}
                >
                    <SearchIcon fontSize="small" />
                </IconButton>

                <IconButton size="small" aria-label="Notifications">
                    <Badge badgeContent={notificationsCount} color="secondary">
                        <NotificationsOutlinedIcon fontSize="small" />
                    </Badge>
                </IconButton>

                <IconButton
                    edge="end"
                    color="inherit"
                    aria-label="menu"
                    onClick={() => setMobileDrawerOpen(true)}
                >
                    <MenuIcon />
                </IconButton>
            </Box>

            {/* Desktop Profile Dropdown Menu */}
            <Menu
                anchorEl={profileMenuAnchor}
                open={Boolean(profileMenuAnchor)}
                onClose={() => setProfileMenuAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                    backdrop: { invisible: true },
                    list: { sx: { backgroundColor: '#fff', p: 0 } },
                    paper: {
                        elevation: 0,
                        sx: {
                            backgroundColor: '#fff',
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
                            borderRadius: '14px',
                            width: 260,
                            mt: 1.5,
                        },
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.75 }}>
                    <Avatar
                        style={{ width: 36, height: 36 }}
                        alt={user.first_name}
                        src={user.profile_pic_url}
                        sx={{ background: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)' }}
                    >
                        {initials}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ fontWeight: 500, fontSize: 14, color: '#0f172a', lineHeight: 1.3 }}>
                            {user.first_name} {user.last_name || ''}
                        </Box>
                        <Box sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.email}
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />

                <Box sx={{ p: 0.75 }}>
                    {getFilteredProfileLinks().map((_profile) => (
                        <MenuItem
                            component={Link}
                            key={_profile.key}
                            to={_profile.to}
                            onClick={() => setProfileMenuAnchor(null)}
                            sx={{
                                gap: 1.25,
                                px: 1.25,
                                py: 1,
                                borderRadius: '20px',
                                fontSize: 13,
                                color: '#334155',
                                '&:hover': { backgroundColor: '#f8fafc' },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 'auto', color: '#64748b', '& svg': { fontSize: 18 } }}>
                                {_profile.icon}
                            </ListItemIcon>
                            <span>{_profile.label}</span>
                        </MenuItem>
                    ))}
                </Box>
            </Menu>

            {/* Mobile / Tablet Drawer */}
            <Drawer
                anchor="right"
                open={mobileDrawerOpen}
                onClose={() => setMobileDrawerOpen(false)}
                PaperProps={{
                    sx: { width: { xs: '82vw', sm: 300 }, maxWidth: 320, backgroundColor: '#ffffff' }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Avatar
                            style={{ width: 36, height: 36 }}
                            alt={user.first_name}
                            src={user.profile_pic_url}
                            sx={{ background: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)' }}
                        >
                            {initials}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ fontWeight: 600, fontSize: 14, color: '#0f172a', lineHeight: 1.2 }}>
                                {user.first_name} {user.last_name || ''}
                            </Box>
                            <Box sx={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.email}
                            </Box>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setMobileDrawerOpen(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <Divider />

                {/* Primary Nav Links */}
                <Box sx={{ p: 1 }}>
                    <Box sx={{ px: 1.5, py: 0.5, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                        Navigation
                    </Box>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => {
                                    setMobileDrawerOpen(false);
                                    setFindPartnerOpen(true);
                                }}
                                sx={{ borderRadius: '8px', my: 0.25, gap: 1.5 }}
                            >
                                <ListItemIcon sx={{ minWidth: 'auto', color: '#64748b' }}>
                                    <PersonSearchOutlinedIcon sx={{ fontSize: 18 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Find New Partner"
                                    primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }}
                                />
                            </ListItemButton>
                        </ListItem>

                        {filteredNavLinks.map((item) => (
                            <ListItem key={item.to} disablePadding>
                                <ListItemButton
                                    component={NavLink}
                                    to={item.to}
                                    end={item.to === "/carriers"}
                                    onClick={() => setMobileDrawerOpen(false)}
                                    sx={{
                                        borderRadius: '8px',
                                        my: 0.25,
                                        '&.active': {
                                            backgroundColor: 'rgba(224, 231, 255, 0.7)',
                                            color: '#0f172a',
                                            fontWeight: 700
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{ fontSize: 13, fontWeight: 'inherit' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Account / Settings Links */}
                <Box sx={{ p: 1 }}>
                    <Box sx={{ px: 1.5, py: 0.5, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                        Account
                    </Box>
                    <List disablePadding>
                        {getFilteredProfileLinks().map((_profile) => (
                            <ListItem key={_profile.key} disablePadding>
                                <ListItemButton
                                    component={Link}
                                    to={_profile.to}
                                    onClick={() => setMobileDrawerOpen(false)}
                                    sx={{ borderRadius: '8px', my: 0.25, gap: 1.5 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 'auto', color: '#64748b' }}>
                                        {_profile.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={_profile.label}
                                        primaryTypographyProps={{ fontSize: 13, color: '#334155' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>

                <Divider sx={{ mt: 'auto' }} />

                {/* Mobile Logout Button */}
                <Box sx={{ p: 1.5 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<PowerSettingsNewIcon />}
                        onClick={() => {
                            setMobileDrawerOpen(false);
                            handleLogout();
                        }}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontSize: 13 }}
                    >
                        Log Out
                    </Button>
                </Box>
            </Drawer>

            <SearchOverlay
                open={searchOverlayOpen}
                onClose={() => setSearchOverlayOpen(false)}
                onSearch={(query, type) => {
                    setSearchOverlayOpen(false);
                    navigate(`/carriers/search?q=${encodeURIComponent(query)}&searched_by=${encodeURIComponent(type)}`);
                }}
            />

            <FindPartnerOverlay
                open={findPartnerOpen}
                onClose={() => setFindPartnerOpen(false)}
                onSearch={({ type, location }) => {
                    setFindPartnerOpen(false);
                    navigate(`/carriers/new-partner?type=${encodeURIComponent(type)}&location=${encodeURIComponent(location)}`);
                }}
            />
        </Box>
    );
}