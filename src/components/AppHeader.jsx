import React, { useEffect, useRef, useState } from 'react';
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

import SearchIcon from '@mui/icons-material/Search';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import Checklist from '@mui/icons-material/Checklist';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import Group from '@mui/icons-material/Group';
import SubscriptionsOutlined from '@mui/icons-material/SubscriptionsOutlined';

import { apiFetch } from '../lib/api';
import { logout } from '../utils/Auth';
import logo from '../assets/images/logo.webp';

import SearchOverlay from './SearchOverlay';

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

const PROFILE_LINKS = [
    { key: 'profile_page', label: 'Profile', icon: <AssignmentIndOutlinedIcon sx={{ fontSize: 18 }} />, to: '/profile' },
    { key: 'profile_shortlisting', label: 'Carriers Shortlisted', icon: <Checklist sx={{ fontSize: 18 }} />, to: '/profile/carriers/shortlisted' },
    // { key: 'profile_password', label: 'Password Update', icon: <Password sx={{ fontSize: 18 }} />, to: '/profile/password' },
    { key: 'scoring_weights', label: 'Scoring Weights', icon: <SettingsOutlined sx={{ fontSize: 18 }} />, to: '/profile/scoring-weights', permission:'edit-scoring-config' },
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
    { key: 'pricing', label: 'Subscription', icon: <SubscriptionsOutlined sx={{ fontSize: 18 }} />, to: '/subscribe' },
];

function navLinkClass({ isActive }) {
    return [
        'px-3.5 py-2 rounded-lg text-[12.5px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors',
        isActive
            ? 'bg-indigo-100/70 text-slate-900'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
    ].join(' ');
}

export default function AppHeader() {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);

    const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
    const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
    const [notificationsCount, setNotificationsCount] = useState(0);

    const readUserFromStorage = () => {
        const storedUser = localStorage.getItem(AUTH_USER_KEY);
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                setUser(null);
            }
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        readUserFromStorage();
    }, [location.pathname]);

    // Cross-tab updates: the native "storage" event fires in *other* tabs
    // when localStorage changes, so keep the header in sync if the user
    // edits their profile in a second tab/window.
    useEffect(() => {
        const onStorage = (e) => {
            if (!e.key || e.key === AUTH_USER_KEY) {
                readUserFromStorage();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Same-tab updates: "storage" never fires in the tab that made the
    // change, so ProfileUpdate broadcasts this custom event right after it
    // writes the new user to localStorage. Listening for it here means the
    // header avatar/name refresh immediately after Save, no reload needed.
    useEffect(() => {
        const onUserUpdated = (e) => {
            if (e?.detail) {
                setUser(e.detail);
            } else {
                readUserFromStorage();
            }
        };
        window.addEventListener('crm-user-updated', onUserUpdated);
        return () => window.removeEventListener('crm-user-updated', onUserUpdated);
    }, []);

    // useEffect(() => {
    //     if (!user) return;
    //     let cancelled = false;
    //     apiFetch('/notifications/count')
    //         .then((data) => {
    //             if (!cancelled) setNotificationsCount(data?.counts ?? data?.data?.total ?? 0);
    //         })
    //         .catch(() => {
    //         });
    //     return () => { cancelled = true; };
    // }, [user]);

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

    return (
        <Box className="flex items-center container-fluid h-[64px] px-6 shadow-xs border-b border-gray-100 relative gap-10">

            {/* Logo */}
            <Box className="flex-shrink-0">
                <Link to="/dashboard" className="logo">
                    <img src={logo} style={{ width: 140, marginRight: 3 }} alt="Dollar Traq" />
                </Link>
            </Box>

            {/* Nav — centered */}
            <Box className="flex-1 flex justify-center">
                <nav className="flex items-center gap-1">
{NAV_LINKS
  .filter((item) => !item.permission || can(item.permission, user))
  .map((item) => (
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

            <Toolbar className="!ml-0 flex-shrink-0">
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

                    <IconButton
                        id="search_button"
                        size="small"
                        aria-label="Search"
                        onClick={() => setSearchOverlayOpen(true)}
                    >
                        <SearchIcon fontSize="small" />
                    </IconButton>

                    {/* Notifications */}
                    <IconButton id="notification_button" size="small">
                        <Badge badgeContent={notificationsCount} color="secondary">
                            <NotificationsOutlinedIcon fontSize="small" />
                        </Badge>
                    </IconButton>

                    <Box sx={{ width: '1px', height: 24, backgroundColor: 'rgba(0,0,0,0.08)', mx: 1 }} />

                    {/* Profile */}
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
                    {getFilteredProfileLinks().filter((l) => l.key !== 'pricing').map((_profile) => (
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

                <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />

                <Box sx={{ p: 0.75 }}>
                    {getFilteredProfileLinks().filter((l) => l.key === 'pricing').map((_profile) => (
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

            <SearchOverlay
                open={searchOverlayOpen}
                onClose={() => setSearchOverlayOpen(false)}
                onSearch={(query, type) => {
                    setSearchOverlayOpen(false);
                    navigate(`/carriers/search?q=${encodeURIComponent(query)}&searched_by=${encodeURIComponent(type)}`);
                }}
            />
        </Box>
    );
}
