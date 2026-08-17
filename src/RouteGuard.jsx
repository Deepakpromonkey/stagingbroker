import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "./components/ui/Toaster";
import { apiFetch } from "./lib/api";

const LOGIN_PATH = "/";
const PUBLIC_PATHS = [LOGIN_PATH, "/signup"];
const AUTH_USER_KEY = "crm_user";

// Where the user picks a subscription plan, and the localStorage key
// Subscription.jsx writes once a plan has been chosen. Kept in sync with
// the values used in Subscription.jsx (PLAN_STORAGE_KEY) and the route
// registered in App.jsx (path="/subscribe").
const SUBSCRIBE_PATH = "/subscribe";
const PLAN_STORAGE_KEY = "crm_plan_selected";

// Reachable without an active subscription, because they are how one is
// obtained. /billing/success in particular is where Stripe returns the
// customer, and at that moment the subscription is still 'incomplete' — the
// page's whole job is to confirm it — so gating it on being subscribed would
// bounce every paying customer back to the pricing table.
const PAYWALL_EXEMPT_PATHS = [SUBSCRIBE_PATH, "/billing/success", "/billing/plans"];

/*
| Whether this account is allowed past the paywall.
|
| The answer belongs to the API, not the browser: localStorage is the user's
| to edit, so gating on it alone sent a paying customer back to the pricing
| page the moment they cleared site data or opened the app in another browser.
| GET /subscription is asked instead, and `subscription.is_active` — the
| server's own grantsAccess(), which covers trialing and past_due as well as
| active — is what decides.
|
| Cached per page load so this costs one request rather than one per
| navigation. 'unknown' means the answer has not arrived yet.
*/
let cachedPlanAccess = "unknown";

// Call after anything that changes subscription state — finishing checkout,
// syncing a Stripe session — so the next navigation re-asks the API.
export function refreshPlanAccess() {
  cachedPlanAccess = "unknown";
}

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
// check that must pass before that route is reachable.
//
// Order matters: STEP_PREREQUISITES.find() stops at the first match, so
// more specific rules must come before more general ones. The plan-select
// rule below matches almost every path, so it's listed last.
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
  {
    // No active subscription blocks every protected route except the plan
    // picker itself. Answered by the API — see cachedPlanAccess above.
    //
    // Only a definite "no" redirects: while the answer is still in flight,
    // or if the request failed, the user is let through rather than bounced
    // to pricing on a slow connection. The API enforces the paywall on every
    // request of its own accord, so this guard is for navigation, not
    // security.
    match: (pathname) => !PAYWALL_EXEMPT_PATHS.includes(pathname),
    isSatisfied: (planAccess) => planAccess !== "none",
    redirectTo: SUBSCRIBE_PATH,
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
  const [planAccess, setPlanAccess] = useState(cachedPlanAccess);

  // Ask the API once whether this account is subscribed, and keep the
  // localStorage flag in step with the answer so the rest of the app (which
  // still reads it for display) cannot drift from the server.
  useEffect(() => {
    if (!token || cachedPlanAccess !== "unknown") {
      setPlanAccess(cachedPlanAccess);
      return;
    }

    let cancelled = false;

    apiFetch("/subscription")
      .then((response) => {
        if (cancelled) return;

        const subscription = response?.data?.subscription;
        const allowed = !!subscription?.is_active;

        cachedPlanAccess = allowed ? "active" : "none";
        setPlanAccess(cachedPlanAccess);

        if (allowed) {
          localStorage.setItem(PLAN_STORAGE_KEY, subscription.plan);
        } else {
          localStorage.removeItem(PLAN_STORAGE_KEY);
        }
      })
      .catch(() => {
        // A failed check must not lock anyone out — leave it unknown so the
        // prerequisite below lets them through, and try again next mount.
        if (!cancelled) setPlanAccess("unknown");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

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

    // Block deep-linking straight into a later wizard step before its
    // prerequisite is met (e.g. opening step 2 without having completed
    // step 1 yet in this session), or into any protected route before a
    // subscription plan has been chosen.
    const blockedStep = STEP_PREREQUISITES.find(
      (step) => step.match(pathname) && !step.isSatisfied(planAccess)
    );
    if (blockedStep) {
      if (blockedStep.redirectTo === SUBSCRIBE_PATH) {
        toast.error("Please choose a plan to continue.");
      } else {
        toast.error("Please complete the previous step first.");
      }
      navigate(`${blockedStep.redirectTo}?incomplete=1`, { replace: true });
      return;
    }

    // Block direct/typed/deep-linked navigation into a route the
    // logged-in user's role doesn't have permission for — being logged in
    // was previously enough to reach any route regardless of permissions.
    const blockedRoute = ROUTE_PERMISSIONS.find(
      (route) => route.match(pathname) && !hasPermission(route.permission, getUser())
    );
    if (blockedRoute) {
      toast.error("You don't have permission to access that page.");
      navigate("/dashboard?unauthorized=1", { replace: true });
    }
  }, [pathname, token, navigate, planAccess]);

  return children;
}