import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "./components/ui/Toaster";

const LOGIN_PATH = "/";
const PUBLIC_PATHS = [LOGIN_PATH, "/signup"];
const AUTH_USER_KEY = "crm_user";

// Carrier onboarding is reached from an invitation email by someone who has no
// account here at all, so it can't be gated on a session. These need prefix
// matching rather than the exact-match PUBLIC_PATHS list, because the connect
// URL carries the invitation token as a path segment.
// `/carrier/email-approval` is the same situation: the API redirects the
// carrier here after they approve an alternate address from their FMCSA inbox,
// and they have no session either.
const PUBLIC_PATH_PREFIXES = [
  "/carrier/connect/",
  "/carrier/invalid-access",
  "/carrier/email-approval",
];

function isPublicPath(pathname) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

// Routes that require a specific permission to be reachable, beyond just
// being logged in. Keep these in sync with the `permission` values used in
// AppHeader's NAV_LINKS / PROFILE_LINKS — that's where the same gating
// logic lives for hiding nav links/menu items, but hiding a link never
// stopped someone from typing the URL directly. This is what actually
// blocks the route itself.
//
// `match` decides which pathnames this rule applies to.
// `permission` is either a single permission string (user needs it) or an
// array (user needs at least one — same "some" semantics as AppHeader's
// `can()` helper).
const ROUTE_PERMISSIONS = [
  {
    match: (pathname) => pathname.startsWith("/load-search"),
    permission: "book-assign-loads",
  },
  {
    match: (pathname) => pathname.startsWith("/settings/carrier"),
    permission: "edit-carrier-agreements",
  },
  {
    match: (pathname) => pathname.startsWith("/users"),
    permission: ["manage-users-basic", "manage-users-all"],
  },
  {
    match: (pathname) => pathname.startsWith("/profile/scoring-weights"),
    permission: "edit-scoring-config",
  },
];

// Routes that depend on an earlier step being completed first, plus the
// check that must pass before that route is reachable. This is what was
// missing: TrackShipmentStep1 only calls navigate("/trackshipment/step2")
// after a shipment is actually created, but nothing stopped someone from
// typing/refreshing/deep-linking straight into /trackshipment/step2 and
// skipping step 1 entirely. Add more entries here if step 3+ need similar
// protection.
const STEP_PREREQUISITES = [
  {
    // Matches /trackshipment/step2 (and any nested paths under it)
    match: (pathname) => pathname.startsWith("/trackshipment/step2"),
    // Step 1's onSubmit stores this in localStorage right after a
    // successful POST to /shipments — its absence means step 1 was never
    // completed in this session.
    isSatisfied: () => !!localStorage.getItem("current_shipment_uuid"),
    redirectTo: "/trackshipment/step1",
  },
];

function getToken() {
  const match = document.cookie.match(/(?:^|;\s*)crm_auth_token=([^;]*)/);
  return match ? match[1] : null;
}

function getUser() {
  const stored = localStorage.getItem(AUTH_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
}

// Same "does this user have the permission" semantics as AppHeader's can().
function hasPermission(permission, user) {
  if (!user) return false;
  const permissions = user?.permissions || [];
  if (Array.isArray(permission)) {
    return permission.some((p) => permissions.includes(p));
  }
  return permissions.includes(permission);
}

export default function RouteGuard({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const token = getToken();

  useEffect(() => {
    const isPublic = isPublicPath(pathname);

    // If user tries to access a protected route without a token
    if (!isPublic && !token) {
      navigate(`${LOGIN_PATH}?from=${encodeURIComponent(pathname)}`, {
        replace: true,
      });
      return;
    }

    // Allow public routes
    if (isPublic && pathname !== LOGIN_PATH) {
      return;
    }

    // No token on login page
    if (!token) {
      return;
    }

    // If already logged in and opens login page, redirect to dashboard
    if (pathname === LOGIN_PATH) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // NEW: block deep-linking straight into a later wizard step before its
    // prerequisite is met (e.g. opening step 2 without having completed
    // step 1 yet in this session).
    const blockedStep = STEP_PREREQUISITES.find(
      (step) => step.match(pathname) && !step.isSatisfied()
    );
    if (blockedStep) {
      toast.error("Please complete the previous step first.");
      navigate(`${blockedStep.redirectTo}?incomplete=1`, { replace: true });
      return;
    }

    // NEW: block direct/typed/deep-linked navigation into a route the
    // logged-in user's role doesn't have permission for — being logged in
    // was previously enough to reach any route regardless of permissions.
    const blockedRoute = ROUTE_PERMISSIONS.find(
      (route) => route.match(pathname) && !hasPermission(route.permission, getUser())
    );
    if (blockedRoute) {
      toast.error("You don't have permission to access that page.");
      navigate("/dashboard?unauthorized=1", { replace: true });
    }
  }, [pathname, token, navigate]);

  return children;
}