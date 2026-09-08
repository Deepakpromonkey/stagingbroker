import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ForwardToInboxIcon from "@mui/icons-material/ForwardToInbox";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";

import { apiFetch } from "../../../lib/api";
import {
  COUNTRY_CODES,
  PHONE_VALIDATION,
  validatePhoneForCountry,
  sanitizePhoneDigits,
  resolveCountryCode,
  dialFor,
} from "../../../lib/phone";
import CountryFlag from "../../../components/CountryFlag";
import { toast } from "../../../components/ui/Toaster";

const USERS_ENDPOINT = "/users";
const USER_INVITE_ENDPOINT = "/invitations";
const ROLES_ENDPOINT = "/roles";

const userEndpoint = (uuid) => `/users/${encodeURIComponent(uuid)}`;
const resendInviteEndpoint = (uuid) => `${userEndpoint(uuid)}/resend-invitation`;

const AUTH_USER_KEY = "crm_user";

const BRAND = "#1e40af";
const BRAND_LIGHT = "#3b82f6";
const BRAND_DARK = "#1c3899";
const BRAND_SOFT = "#eff6ff";
const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`;
const INK = "#0f172a";
const SUBTLE = "#64748b";
const BORDER = "#e2e8f0";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fff",
    transition: "box-shadow 120ms ease, border-color 120ms ease",
    "& fieldset": { borderColor: BORDER },
    "&:hover fieldset": { borderColor: "#cbd5e1" },
    "&.Mui-focused fieldset": { borderColor: BRAND, borderWidth: "1.5px" },
    "&.Mui-focused": { boxShadow: `0 0 0 4px ${BRAND_SOFT}` },
    "&.Mui-error.Mui-focused": { boxShadow: "0 0 0 4px #fee2e2" },
    "&.Mui-disabled": { backgroundColor: "#f8fafc" },
  },
  "& .MuiInputLabel-root": {
    color: SUBTLE,
    "&.Mui-focused": { color: BRAND },
  },
  "& .MuiFormHelperText-root": { marginLeft: "2px", fontSize: "12px" },
};

const adornmentIconSx = { fontSize: "18px", color: SUBTLE };

const SectionLabel = ({ icon, text }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.25 }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: "8px",
        backgroundColor: BRAND_SOFT,
        color: BRAND,
      }}
    >
      {icon}
    </Box>
    <Typography sx={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.03em", color: INK }}>
      {text}
    </Typography>
  </Box>
);

const cardSx = {
  p: { xs: 2, sm: 3 },
  backgroundColor: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: "16px",
};

const submitButtonSx = {
  background: BRAND,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "13px",
  borderRadius: "999px",
  px: 2.75,
  py: 1,
  boxShadow: "none",
  "&:hover": {
    background: BRAND,
    opacity: 0.9,
    boxShadow: "none",
  },
  "&.Mui-disabled": {
    background: "#94a3b8",
    color: "#fff",
  },
};

const cancelButtonSx = {
  color: SUBTLE,
  fontWeight: 600,
  textTransform: "none",
  borderRadius: "10px",
  px: 2,
  "&:hover": { backgroundColor: "#f1f5f9" },
};

const dialogPaperSx = {
  borderRadius: "22px",
  boxShadow: "0 30px 70px -20px rgba(15, 23, 42, 0.35)",
  overflow: "hidden",
  margin: { xs: "16px", sm: "32px" },
};

const RequiredLabel = ({ text }) => (
  <>
    {text}
    <Box component="span" sx={{ color: "#dc2626" }}> *</Box>
  </>
);

function initials(first, last) {
  const a = (first || "").trim()[0] || "";
  const b = (last || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
}

const DetailRow = ({ icon, label, value }) => (
  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.75, py: 1.75 }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: "10px",
        backgroundColor: BRAND_SOFT,
        color: BRAND,
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", color: SUBTLE, textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "14.5px", fontWeight: 600, color: INK, wordBreak: "break-word" }}>
        {value || "—"}
      </Typography>
    </Box>
  </Box>
);

// ---------------------------------------------------------------------------
// Mobile number, with the dialling country in front of it
//
// The four countries the product operates in, read from the shared list in
// lib/phone.js so this form, the profile screen and Track Shipment cannot
// drift apart.
//
// Validation is per country rather than one "at least 10 digits" rule: every
// country here uses 10 digits, but the valid leading digits differ (a US
// number never starts 0 or 1; an Indian mobile always starts 6-9), and the
// old shared pattern accepted all of them.
// ---------------------------------------------------------------------------
function MobileField({ control, setValue }) {
  const countryCode = useWatch({ control, name: "country_code" }) || "US";

  const rule = PHONE_VALIDATION[countryCode] || PHONE_VALIDATION.US;

  return (
    <Controller
      name="phone"
      control={control}
      rules={{
        required: "Mobile number is required",
        validate: (value) => validatePhoneForCountry(value, countryCode),
      }}
      render={({ field, fieldState }) => (
        <TextField
          label={<RequiredLabel text="Mobile" />}
          type="tel"
          fullWidth
          size="small"
          sx={fieldSx}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || " "}
          value={field.value ?? ""}
          onBlur={field.onBlur}
          onChange={(e) => field.onChange(sanitizePhoneDigits(e.target.value, countryCode))}
          slotProps={{
            htmlInput: { inputMode: "numeric", maxLength: rule.length },
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0.75 }}>
                  <Select
                    value={countryCode}
                    onChange={(event) => {
                      const next = event.target.value;

                      setValue("country_code", next, { shouldDirty: true });

                      // A number typed for a longer country must not survive
                      // the switch — it would fail validation with no visible
                      // reason why.
                      setValue("phone", sanitizePhoneDigits(field.value, next), {
                        shouldDirty: true,
                        shouldValidate: fieldState.isTouched,
                      });
                    }}
                    variant="standard"
                    disableUnderline
                    renderValue={(value) => (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <CountryFlag code={value} />
                        <Typography sx={{ fontSize: "13px", color: INK }}>
                          {COUNTRY_CODES.find((c) => c.code === value)?.dial}
                        </Typography>
                      </Box>
                    )}
                    sx={{
                      "& .MuiSelect-select": { pr: "20px !important", py: 0 },
                      "&:before, &:after": { display: "none" },
                    }}
                    slotProps={{
                      input: { "aria-label": "Dialling country" },
                    }}
                  >
                    {COUNTRY_CODES.map((country) => (
                      <MenuItem key={country.code} value={country.code} sx={{ gap: 1.25, fontSize: "13px" }}>
                        <CountryFlag code={country.code} />
                        <span>{country.label}</span>
                        <Typography sx={{ ml: "auto", fontSize: "12.5px", color: SUBTLE }}>
                          {country.dial}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </InputAdornment>
              ),
            },
          }}
        />
      )}
    />
  );
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Role object -> display string
//
// The API can return `role` on a user record as:
//   - a plain string                              -> use as-is
//   - a single role object { id, slug, name, ... } -> use .name
//   - an array of role objects/strings              -> join the names
// ---------------------------------------------------------------------------
function roleToDisplayName(role) {
  if (!role) return "";
  if (typeof role === "string") return role;
  if (Array.isArray(role)) {
    return role
      .map((r) => (typeof r === "string" ? r : r?.name))
      .filter(Boolean)
      .join(", ");
  }
  return role.name ?? "";
}

// ---------------------------------------------------------------------------
// Shared roles hook — both EditUserForm and InviteUserForm read from here.
//
// GET /roles ->
// { data: { roles: [ { id, slug, name, ... } ], assignable_slugs: [...] } }
//
// Normalized down to { key: id, value: name } for the Autocomplete.
// ---------------------------------------------------------------------------
function useRoles() {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(ROLES_ENDPOINT)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data?.roles) ? res.data.roles : [];


  

       setRoles(
  list.map((r) => ({
    key: r.id,
    value: r.name,
    permissions: r.permissions || [],
    description: r.description,
    slug: r.slug,
  }))
);
      })
      .catch((err) => console.error("Failed to load roles:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return { roles };
}

// ---------------------------------------------------------------------------
// Users list fetch
//
// GET /users ->
// { data: { users: [ { uuid, first_name, last_name, email, phone, role } ],
//           pagination: { current_page, last_page, per_page, total } } }
// ---------------------------------------------------------------------------
function useUsers(pageIndex, pageSize, reloadKey) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const page = pageIndex + 1;
    const query = `page=${page}&per_page=${pageSize}&sort_by=added_on&sort_order=desc`;

    apiFetch(`${USERS_ENDPOINT}?${query}`)
      .then((res) => {
        if (cancelled) return;

        const records = Array.isArray(res?.data?.users) ? res.data.users : [];

const mapped = records.map((u) => ({
  row_id: u.uuid,
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  phone: u.phone,
  country_code: u.country_code,
  role_names: roleToDisplayName(u.role),
  role_id: u.role?.id,

  // The company creator. Their seat is fixed and their account cannot be
  // removed, so the row actions have to know.
  is_owner: !!u.is_owner,

  // Still on the temporary password from their invitation email, which
  // means the invite is the thing worth resending.
  must_change_password: !!u.must_change_password,
}));
        setRows(mapped);
        setTotal(Number(res?.data?.pagination?.total ?? mapped.length) || 0);
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageIndex, pageSize, reloadKey]);

  return { rows, total, loading };
}

// ---------------------------------------------------------------------------
// Modal chrome shared by both forms (header with gradient avatar + close btn)
// ---------------------------------------------------------------------------
function ModalHeader({ icon, title, subtitle, onClose }) {
  return (
    <Box
      sx={{
        position: "relative",
        px: { xs: 2.5, sm: 4 },
        pt: { xs: 3, sm: 4 },
        pb: { xs: 2.5, sm: 3 },
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        background: `linear-gradient(160deg, ${BRAND_SOFT} 0%, #ffffff 70%)`,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <Avatar
        sx={{
          background: BRAND_GRADIENT,
          color: "#fff",
          width: 48,
          height: 48,
          boxShadow: "0 10px 22px -8px rgba(30, 64, 175, 0.55)",
        }}
      >
        {icon}
      </Avatar>

      <Box sx={{ pt: 0.25, pr: { xs: 4, sm: 0 } }}>
        <Typography sx={{ fontSize: "19px", fontWeight: 800, color: INK, lineHeight: 1.3 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "13px", color: SUBTLE, mt: 0.25 }}>
          {subtitle}
        </Typography>
      </Box>

      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: "absolute",
          top: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 16 },
          color: SUBTLE,
          backgroundColor: "#fff",
          border: `1px solid ${BORDER}`,
          "&:hover": { backgroundColor: "#f1f5f9" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Edit User modal
//
// Changes a teammate's seat and contact details via PUT /users/{uuid}.
//
// Prefilled straight from the row the table already has, so opening it makes
// no network call. Email is shown but not editable — it is the login
// identifier, and changing it is a different job from re-seating someone.
//
// Only the fields that actually changed are sent. The role in particular is
// omitted when untouched, because re-sending it would sign the person out
// (a seat change invalidates their tokens) for no reason.
// ---------------------------------------------------------------------------
function EditUserForm({ open, onClose, user, roles, onSuccess }) {
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({
    mode: "onTouched",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      country_code: "US",
      phone: "",
      roles: null,
    },
  });

  const selectedRole = watch("roles");
  // `roles` arrives asynchronously, so this re-runs once the list lands and
  // the seat the user currently holds can be matched to an option.
  useEffect(() => {
    if (!open || !user) return;

    setSubmitError("");

    reset({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      country_code: resolveCountryCode(user.country_code),
      phone: user.phone || "",
      roles: roles.find((r) => r.key === user.role_id) || null,
    });
  }, [open, user, roles, reset]);

  const handleClose = () => {
    reset();
    setSubmitError("");
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {};

    // Every field on this form is `sometimes` on the API side, so sending
    // only what moved keeps the request honest about what is being changed.
    if (dirtyFields.first_name) payload.first_name = data.first_name;
    if (dirtyFields.last_name) payload.last_name = data.last_name || null;
    if (dirtyFields.phone) payload.phone = data.phone || null;
    if (dirtyFields.country_code) payload.country_code = data.country_code || null;

    if (data.roles?.key && data.roles.key !== user?.role_id) {
      payload.role_id = data.roles.key;
    }

    if (Object.keys(payload).length === 0) {
      handleClose();
      return;
    }

    try {
      const res = await apiFetch(userEndpoint(user.row_id), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res && res.status) {
        setSubmitError("");
        reset();
        onSuccess(!!payload.role_id);
      } else {
        setSubmitError((res && res.message) || "Could not save user.");
      }
    } catch (err) {
      setSubmitError(err?.message || "Could not save user.");
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={handleClose} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <ModalHeader
        icon={<EditOutlinedIcon fontSize="small" />}
        title="Edit user"
        subtitle="Update this teammate's details and access."
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3.5 }, backgroundColor: "#f8fafc", maxHeight: "64vh", overflowY: "auto" }}>
              <Box sx={{ ...cardSx, mb: 2.5 }}>
                <SectionLabel icon={<BadgeOutlinedIcon sx={{ fontSize: 16 }} />} text="PERSONAL DETAILS" />

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.25 }}>
                  <TextField
                    label={<RequiredLabel text="First name" />}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message || " "}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("first_name", { required: "First name is required" })}
                  />

                  <TextField
                    label={<RequiredLabel text="Last name" />}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message || " "}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("last_name", { required: "Last name is required" })}
                  />

                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    size="small"
                    disabled
                    sx={fieldSx}
                    helperText="Sign-in email can't be changed here"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <MailOutlineIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("email")}
                  />

                  <MobileField control={control} setValue={setValue} />

                </Box>
              </Box>

              <Box sx={cardSx}>
                <SectionLabel icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />} text="ACCESS" />

                <Controller
                  name="roles"
                  control={control}
                  rules={{ required: "Please select a role" }}
                  render={({ field }) => (
                    <Autocomplete
                      disablePortal
                      size="small"
                      options={roles}
                      loading={roles.length === 0}
                      value={field.value}
                      onChange={(e, value) => field.onChange(value)}
                      getOptionLabel={(option) => option?.value || ""}
                      isOptionEqualToValue={(option, value) => option.key === value?.key}
                      popupIcon={<KeyboardArrowDownIcon />}
                      sx={fieldSx}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Role"
                          placeholder="Select Role"
                          error={!!errors.roles}
                          helperText={errors.roles?.message}
                        />
                      )}
                    />
                  )}
                />
                {selectedRole?.permissions?.length > 0 && (
  <Box
    sx={{
      mt: 2,
      p: 2,
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      background: "#f8fafc",
    }}
  >
    <Typography
      sx={{
        fontSize: 13,
        fontWeight: 700,
        mb: 1,
        color: "#0f172a",
      }}
    >
      Permissions
    </Typography>

    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      {selectedRole.permissions.map((permission) => (
        <Box
          key={permission}
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: "999px",
            background: "#eff6ff",
            color: "#1e40af",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {permission}
        </Box>
      ))}
    </Box>
  </Box>
)}
              </Box>

              {submitError && (
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "10px", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                  <ErrorOutlineIcon sx={{ fontSize: "18px", color: "#dc2626" }} />
                  <Typography sx={{ fontSize: "13px", color: "#b91c1c" }}>{submitError}</Typography>
                </Box>
              )}
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, py: 2.5, borderTop: `1px solid ${BORDER}`, backgroundColor: "#ffffff" }}>
          <Button onClick={handleClose} disabled={isSubmitting} sx={cancelButtonSx}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : null}
            sx={submitButtonSx}
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete User confirmation
//
// Deleting is not reversible from this screen, so it asks first and names the
// person being removed rather than showing a generic "Are you sure?".
//
// The account is soft-deleted server side: the person loses access straight
// away, but the loads they booked and the payments they released keep
// pointing at a real record.
// ---------------------------------------------------------------------------
function DeleteUserDialog({ open, user, onClose, onDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "this user";

  // Clearing here rather than on open means a dialog dismissed after a failed
  // attempt does not come back still showing the old error.
  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleDelete = () => {
    setSubmitting(true);
    setError("");

    apiFetch(userEndpoint(user.row_id), { method: "DELETE" })
      .then(() => {
        onDeleted(fullName);
      })
      .catch((err) => {
        setError(err?.message || "Could not delete this user.");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      onClose={submitting ? undefined : handleClose}
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, px: { xs: 2.5, sm: 3.5 }, pt: 3.5, pb: 2.5, borderBottom: `1px solid ${BORDER}` }}>
        <Avatar sx={{ backgroundColor: "#fef2f2", color: "#dc2626", width: 44, height: 44 }}>
          <WarningAmberOutlinedIcon fontSize="small" />
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "17px", fontWeight: 800, color: INK, lineHeight: 1.3 }}>
            Remove {fullName}?
          </Typography>
          <Typography sx={{ fontSize: "13px", color: SUBTLE, mt: 0.5, lineHeight: 1.6 }}>
            They'll be signed out immediately and lose access to this account. Work
            they've already done — loads, carriers, payments — stays exactly as it is.
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, py: 2.5, backgroundColor: "#f8fafc" }}>
        <Box sx={{ ...cardSx, p: 2 }}>
          <DetailRow icon={<MailOutlineIcon sx={{ fontSize: 17 }} />} label="Email" value={user?.email} />
          <Box sx={{ borderTop: `1px solid ${BORDER}` }} />
          <DetailRow icon={<ShieldOutlinedIcon sx={{ fontSize: 17 }} />} label="Role" value={user?.role_names} />
        </Box>

        {error && (
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "10px", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <ErrorOutlineIcon sx={{ fontSize: "18px", color: "#dc2626" }} />
            <Typography sx={{ fontSize: "13px", color: "#b91c1c" }}>{error}</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, py: 2.5, borderTop: `1px solid ${BORDER}`, backgroundColor: "#ffffff" }}>
        <Button onClick={handleClose} disabled={submitting} sx={cancelButtonSx}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleDelete}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <DeleteOutlineIcon sx={{ fontSize: 17 }} />}
          sx={{
            ...submitButtonSx,
            background: "#dc2626",
            "&:hover": { background: "#dc2626", opacity: 0.9, boxShadow: "none" },
          }}
        >
          {submitting ? "Removing…" : "Remove user"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// View User modal (read-only)
//
// Purpose-built for viewing rather than a disabled version of the add/edit
// form — an avatar + name + role badge up top, then simple label/value rows.
// Fed straight from the row data already loaded in the table, so opening
// this never makes a network call.
// ---------------------------------------------------------------------------
function UserDetailsModal({ open, onClose, viewData, roles }) {
  const fullName = [viewData?.first_name, viewData?.last_name].filter(Boolean).join(" ") || "Unnamed user";
  const roleLabel = viewData?.role_names || "No role assigned";
  const selectedRole = roles.find((r) => r.key === viewData?.role_id);

  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={onClose} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <ModalHeader
        icon={<PersonOutlineIcon fontSize="small" />}
        title="User details"
        subtitle="A quick look at this teammate's info."
        onClose={onClose}
      />

      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3.5 }, backgroundColor: "#f8fafc" }}>
        <Box sx={{ ...cardSx, display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
          <Avatar
            sx={{
              background: BRAND_GRADIENT,
              color: "#fff",
              width: 52,
              height: 52,
              fontSize: "18px",
              fontWeight: 700,
              boxShadow: "0 10px 22px -8px rgba(30, 64, 175, 0.45)",
            }}
          >
            {initials(viewData?.first_name, viewData?.last_name)}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "16px", fontWeight: 800, color: INK, lineHeight: 1.3 }} noWrap>
              {fullName}
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                mt: 0.5,
                px: 1.25,
                py: 0.375,
                borderRadius: "999px",
                backgroundColor: BRAND_SOFT,
                color: BRAND,
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: "11.5px", fontWeight: 700 }}>{roleLabel}</Typography>
            </Box>
          </Box>
        </Box>

   <Box sx={cardSx}>
  <DetailRow
    icon={<MailOutlineIcon sx={{ fontSize: 17 }} />}
    label="Email"
    value={viewData?.email}
  />

  <Box sx={{ borderTop: `1px solid ${BORDER}` }} />

  <DetailRow
    icon={<PhoneIphoneIcon sx={{ fontSize: 17 }} />}
    label="Mobile"
    value={
      viewData?.phone
        ? `${dialFor(viewData.country_code, "")} ${viewData.phone}`.trim()
        : viewData?.phone
    }
  />

  {selectedRole?.permissions?.length > 0 && (
    <>
      <Box sx={{ borderTop: `1px solid ${BORDER}`, mt: 1 }} />

      <Box sx={{ pt: 2 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            mb: 1,
            color: "#64748b",
            textTransform: "uppercase",
          }}
        >
          Permissions
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {selectedRole.permissions.map((permission) => (
            <Box
              key={permission}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: "999px",
                background: "#eff6ff",
                color: "#1e40af",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {permission}
            </Box>
          ))}
        </Box>
      </Box>
    </>
  )}
</Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, py: 2.5, borderTop: `1px solid ${BORDER}`, backgroundColor: "#ffffff" }}>
        <Button onClick={onClose} variant="contained" sx={submitButtonSx}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Invite User modal
// ---------------------------------------------------------------------------
function InviteUserForm({ open, onClose, roles, usersOf, onSuccess }) {
  const [submitError, setSubmitError] = useState("");

const {
  register,
  handleSubmit,
  control,
  watch,
  reset,
  setValue,
  formState: { errors, isSubmitting },
} = useForm({
    mode: "onTouched",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      country_code: "US",
      phone: "",
      roles: null,
    },
  });
const selectedRole = watch("roles");
  const handleClose = () => {
    reset();
    setSubmitError("");
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      users_of: usersOf,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      country_code: data.country_code,
      phone: data.phone,
      role_id: data.roles?.key ?? "",
    };

    try {
      const res = await apiFetch(USER_INVITE_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status) {
        setSubmitError("");
        reset();
        onSuccess();
      } else {
        setSubmitError((res && res.message) || "Could not send invite.");
      }
    } catch (err) {
      setSubmitError(err?.message || "Could not send invite.");
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={handleClose} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <ModalHeader
        icon={<PersonAddAlt1Icon fontSize="small" />}
        title="Invite a teammate"
        subtitle="They'll get an email with steps to set up their account."
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3.5 }, backgroundColor: "#f8fafc", maxHeight: "64vh", overflowY: "auto" }}>
          <Box sx={{ ...cardSx, mb: 2.5 }}>
            <SectionLabel icon={<BadgeOutlinedIcon sx={{ fontSize: 16 }} />} text="PERSONAL DETAILS" />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.25 }}>
              <TextField
                label={<RequiredLabel text="First name" />}
                fullWidth
                size="small"
                sx={fieldSx}
                error={!!errors.first_name}
                helperText={errors.first_name?.message || " "}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={adornmentIconSx} />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("first_name", { required: "First name is required" })}
              />

              <TextField
                label={<RequiredLabel text="Last name" />}
                fullWidth
                size="small"
                sx={fieldSx}
                error={!!errors.last_name}
                helperText={errors.last_name?.message || " "}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={adornmentIconSx} />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("last_name", { required: "Last name is required" })}
              />

              <TextField
                label={<RequiredLabel text="Email" />}
                type="email"
                fullWidth
                size="small"
                sx={fieldSx}
                error={!!errors.email}
                helperText={errors.email?.message || " "}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlineIcon sx={adornmentIconSx} />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address" },
                })}
              />

              <MobileField control={control} setValue={setValue} />
            </Box>
          </Box>

          <Box sx={cardSx}>
            <SectionLabel icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />} text="ACCESS" />

            <Controller
              name="roles"
              control={control}
              rules={{ required: "Please select a role" }}
              render={({ field }) => (
                <Autocomplete
                  disablePortal
                  size="small"
                  options={roles}
                  loading={roles.length === 0}
                  value={field.value}
                  onChange={(e, value) => field.onChange(value)}
                  getOptionLabel={(option) => option?.value || ""}
                  isOptionEqualToValue={(option, value) => option.key === value?.key}
                  popupIcon={<KeyboardArrowDownIcon />}
                  sx={fieldSx}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Role"
                      placeholder="Select Role"
                      error={!!errors.roles}
                      helperText={errors.roles?.message}
                    />
                  )}
                />
              )}
            />
            {selectedRole?.permissions?.length > 0 && (
  <Box
    sx={{
      mt: 2,
      p: 2,
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      background: "#f8fafc",
    }}
  >
    <Typography
      sx={{
        fontSize: 13,
        fontWeight: 700,
        mb: 1,
        color: "#0f172a",
      }}
    >
      Permissions
    </Typography>

    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      {selectedRole.permissions.map((permission) => (
        <Box
          key={permission}
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: "999px",
            background: "#eff6ff",
            color: "#1e40af",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {permission}
        </Box>
      ))}
    </Box>
  </Box>
)}
          </Box>

          {submitError && (
            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "10px", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
              <ErrorOutlineIcon sx={{ fontSize: "18px", color: "#dc2626" }} />
              <Typography sx={{ fontSize: "13px", color: "#b91c1c" }}>{submitError}</Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, py: 2.5, borderTop: `1px solid ${BORDER}`, backgroundColor: "#ffffff" }}>
          <Button onClick={handleClose} disabled={isSubmitting} sx={cancelButtonSx}>
            Cancel
          </Button>

<Button
  type="submit"
  variant="contained"
  disabled={isSubmitting}
  startIcon={
    isSubmitting ? (
      <CircularProgress size={14} sx={{ color: "#fff" }} />
    ) : null
  }
  sx={submitButtonSx}
>
  {isSubmitting ? "Sending…" : "Send invite"}
</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const columnHelper = createColumnHelper();

export default function UsersList() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const usersOf = currentUser?.row_id ?? currentUser?.id ?? null;
  const currentUserUuid = currentUser?.uuid ?? null;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  const [viewData, setViewData] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  // uuid of the row whose invite is currently being resent, so only that
  // row's button shows a spinner.
  const [resendingUuid, setResendingUuid] = useState(null);

  const { roles } = useRoles();
  const { rows, total, loading } = useUsers(pageIndex, pageSize, reloadKey);

  const triggerReload = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleResendInvite = useCallback((row) => {
    setResendingUuid(row.row_id);

    apiFetch(resendInviteEndpoint(row.row_id), { method: "POST" })
      .then(() => {
        toast.success({
          title: "Invitation resent",
          message: `A fresh invitation is on its way to ${row.email}.`,
          duration: 4000,
        });
      })
      .catch((err) => {
        toast.error({
          title: "Could not resend",
          message: err?.message || "Please try again in a moment.",
        });
      })
      .finally(() => setResendingUuid(null));
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("first_name", {
        header: "First Name",
        cell: (info) => <span className="text-sm font-bold text-slate-800 ">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("last_name", {
        header: "Last Name",
        cell: (info) => <span className="text-sm text-slate-700 ">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => <span className="text-sm text-slate-700 ">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("phone", {
        header: "Mobile",
        cell: (info) => <span className="text-sm font-bold text-slate-800 ">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("role_names", {
        header: "Roles",
        cell: (info) => <span className="text-sm text-slate-700 ">{info.getValue() || "—"}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const row = info.row.original;

          // The company owner's seat is fixed and their account cannot be
          // removed; you cannot re-seat or remove yourself either. Rather
          // than show buttons that always fail, leave them out.
          const isSelf = !!currentUserUuid && row.row_id === currentUserUuid;
          const locked = row.is_owner || isSelf;

          // Only worth offering while they are still on the temporary
          // password from the invite — once they've set their own, the
          // invitation is spent and they want a password reset instead.
          const canResend = !locked && row.must_change_password;

          const resending = resendingUuid === row.row_id;

          return (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-800 bg-transparent border-0 cursor-pointer pr-1"
                onClick={() => setViewData(row)}
              >
                View
                <ArrowForwardIcon sx={{ fontSize: "13px" }} />
              </button>

              {canResend && (
                <Tooltip title="Resend invitation email">
                  <span>
                    <IconButton
                      size="small"
                      disabled={resending}
                      onClick={() => handleResendInvite(row)}
                      sx={{ color: SUBTLE, "&:hover": { color: BRAND, backgroundColor: BRAND_SOFT } }}
                    >
                      {resending
                        ? <CircularProgress size={15} sx={{ color: SUBTLE }} />
                        : <ForwardToInboxIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {!locked && (
                <Tooltip title="Edit details & role">
                  <IconButton
                    size="small"
                    onClick={() => setEditUser(row)}
                    sx={{ color: SUBTLE, "&:hover": { color: BRAND, backgroundColor: BRAND_SOFT } }}
                  >
                    <EditOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}

              {!locked && (
                <Tooltip title="Remove user">
                  <IconButton
                    size="small"
                    onClick={() => setDeleteUser(row)}
                    sx={{ color: SUBTLE, "&:hover": { color: "#dc2626", backgroundColor: "#fef2f2" } }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          );
        },
      }),
    ],
    [currentUserUuid, resendingUuid, handleResendInvite]
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="min-h-screen bg-[#F4F5F1] px-4 py-5 sm:px-6 md:px-8 lg:px-14">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[32px] md:text-[40px] font-semibold tracking-tight text-slate-900">Users</h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-slate-500">
            Enter carrier details to activate live telemetry and predictive delivery windows.
          </p>
        </div>
<button
  onClick={() => setInviteOpen(true)}
  className="mt-2 sm:mt-6 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-[15px] font-semibold text-white shadow-sm transition-colors hover:opacity-90 w-full sm:w-auto"
  style={{ background: BRAND }}
>
  <PersonAddAlt1Icon sx={{ fontSize: 20 }} />
  Add User
</button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm w-full sm:w-auto">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <FormatListBulletedIcon sx={{ fontSize: 18 }} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Records</p>
            <p className="text-base font-bold text-slate-900">{total} Active</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm w-full sm:w-auto">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Display:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-slate-400">{rangeStart}-{rangeEnd} of {total}</span>
          <IconButton size="small" disabled={pageIndex === 0} onClick={() => setPageIndex((p) => Math.max(0, p - 1))} sx={{ color: "#94a3b8" }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled={pageIndex + 1 >= pageCount} onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} sx={{ color: "#94a3b8" }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="flex items-center justify-center gap-2.5 text-sm font-medium text-slate-400">
                      <CircularProgress size={16} sx={{ color: "#94a3b8" }} />
                      Loading users…
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2.5">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <PeopleOutlineIcon sx={{ fontSize: 22 }} />
                      </span>
                      <p className="text-[14px] font-semibold text-slate-600">No users yet</p>
                      <p className="text-[13px] leading-relaxed text-slate-400">
                        Add a teammate directly, or send an invite so they can set up their own account.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.original.row_id || row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 sm:px-6 sm:py-4 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* This is opened via the "View" action. It's fed straight from the
          row data already loaded in the table, so it never makes a network
          call — and it's its own purpose-built layout rather than a
          disabled version of the add/edit form. */}
<UserDetailsModal
    open={!!viewData}
    viewData={viewData}
    roles={roles}
    onClose={() => setViewData(null)}
/>

      <InviteUserForm
        open={inviteOpen}
        roles={roles}
        usersOf={usersOf}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false);
          triggerReload();
          toast.success({ title: "Invite sent", message: "Invitation sent successfully.", duration: 3000 });
        }}
      />

      <EditUserForm
        open={!!editUser}
        user={editUser}
        roles={roles}
        onClose={() => setEditUser(null)}
        onSuccess={(roleChanged) => {
          setEditUser(null);
          triggerReload();
          toast.success({
            title: "User updated",
            message: roleChanged
              ? "Their role has been changed. They'll need to sign in again."
              : "Their details have been updated.",
            duration: 4000,
          });
        }}
      />

      <DeleteUserDialog
        open={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={(name) => {
          setDeleteUser(null);

          // Removing the only row on a page would otherwise leave you
          // staring at an empty table on a page that no longer exists.
          if (rows.length === 1 && pageIndex > 0) {
            setPageIndex((p) => p - 1);
          } else {
            triggerReload();
          }

          toast.success({
            title: "User removed",
            message: `${name} no longer has access to this account.`,
            duration: 4000,
          });
        }}
      />
    </div>
  );
}