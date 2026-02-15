import { lazy, type ComponentType } from "react";

// ── Lazy-loaded public pages ──────────────────────────────────
const Landing = lazy(() => import("@/app/routes/(public)/Landing"));
const ForTalanger = lazy(() => import("@/app/routes/(public)/ForTalanger"));
const ForArbetsgivare = lazy(() => import("@/app/routes/(public)/ForArbetsgivare"));
const Auth = lazy(() => import("@/app/routes/(public)/Auth"));
const ForgotPassword = lazy(() => import("@/app/routes/(public)/ForgotPassword"));
const Privacy = lazy(() => import("@/app/routes/(public)/Privacy"));
const Terms = lazy(() => import("@/app/routes/(public)/Terms"));

// ── Eager-loaded protected pages ──────────────────────────────
import AdminHealth from "@/app/routes/(admin)/AdminHealth";
import AdminDiagnostics from "@/app/routes/(admin)/AdminDiagnostics";

import TalentDashboard from "@/app/routes/(talent)/TalentDashboard";
import TalentProfile from "@/app/routes/(talent)/TalentProfile";
import TalentSwipeJobs from "@/app/routes/(talent)/TalentSwipeJobs";
import TalentMatches from "@/app/routes/(talent)/TalentMatches";
import TalentMatchChat from "@/app/routes/(talent)/TalentMatchChat";
import TalentActivity from "@/app/routes/(talent)/TalentActivity";
import TalentInbox from "@/app/routes/(talent)/TalentInbox";
import TalentHousing from "@/app/routes/(talent)/TalentHousing";

import EmployerDashboard from "@/app/routes/(employer)/EmployerDashboard";
import EmployerJobs from "@/app/routes/(employer)/EmployerJobs";
import EmployerSwipeTalent from "@/app/routes/(employer)/EmployerSwipeTalent";
import EmployerMatches from "@/app/routes/(employer)/EmployerMatches";
import EmployerMatchChat from "@/app/routes/(employer)/EmployerMatchChat";
import EmployerScheduler from "@/app/routes/(employer)/EmployerScheduler";
import EmployerBorrow from "@/app/routes/(employer)/EmployerBorrow";
import EmployerActivity from "@/app/routes/(employer)/EmployerActivity";
import EmployerInbox from "@/app/routes/(employer)/EmployerInbox";

import HostHousing from "@/app/routes/(host)/HostHousing";
import HostInbox from "@/app/routes/(host)/HostInbox";

import Settings from "@/app/routes/(settings)/Settings";
import SettingsProfile from "@/app/routes/(settings)/SettingsProfile";
import SettingsAccount from "@/app/routes/(settings)/SettingsAccount";

import NotFound from "@/pages/NotFound";

// ── Route definition types ────────────────────────────────────
export type RoleAllow = "talent" | "employer" | "host";

/** SEO meta required for public routes */
export interface RouteMeta {
  pageTitle?: string;
  pageDescription?: string;
  canonicalPath: string;
}

/** Public route — meta is required */
export interface PublicRoute {
  id: string;
  path: string;
  kind: "public";
  element: ComponentType;
  meta: RouteMeta;
  guard: "public";
}

/** Protected app route — no meta (handled by AppShell) */
export interface AppRoute {
  id: string;
  path: string;
  kind: "app";
  element: ComponentType;
  guard: "protected" | "admin";
  allow?: RoleAllow[];
}

/** Catch-all route */
export interface CatchAllRoute {
  id: string;
  path: "*";
  kind: "public";
  element: ComponentType;
  meta: RouteMeta;
  guard: "public";
}

export type RouteDef = PublicRoute | AppRoute | CatchAllRoute;

// ── Route definitions ─────────────────────────────────────────
export const routes: RouteDef[] = [
  // Public
  { id: "landing", path: "/", kind: "public", element: Landing, guard: "public", meta: { canonicalPath: "/" } },
  { id: "for-talanger", path: "/for-talanger", kind: "public", element: ForTalanger, guard: "public", meta: { pageTitle: "För Talanger", pageDescription: "Hitta säsongsjobb som matchar din profil och tillgänglighet.", canonicalPath: "/for-talanger" } },
  { id: "for-arbetsgivare", path: "/for-arbetsgivare", kind: "public", element: ForArbetsgivare, guard: "public", meta: { pageTitle: "För Arbetsgivare", pageDescription: "Hitta säsongstalanger snabbt och tryggt.", canonicalPath: "/for-arbetsgivare" } },
  { id: "auth", path: "/auth", kind: "public", element: Auth, guard: "public", meta: { pageTitle: "Logga in", canonicalPath: "/auth" } },
  { id: "auth-login", path: "/auth/login", kind: "public", element: Auth, guard: "public", meta: { pageTitle: "Logga in", canonicalPath: "/auth/login" } },
  { id: "auth-signup", path: "/auth/signup", kind: "public", element: Auth, guard: "public", meta: { pageTitle: "Skapa konto", canonicalPath: "/auth/signup" } },
  { id: "auth-forgot", path: "/auth/forgot", kind: "public", element: ForgotPassword, guard: "public", meta: { pageTitle: "Glömt lösenord", canonicalPath: "/auth/forgot" } },
  { id: "privacy", path: "/privacy", kind: "public", element: Privacy, guard: "public", meta: { pageTitle: "Integritetspolicy", canonicalPath: "/privacy" } },
  { id: "terms", path: "/terms", kind: "public", element: Terms, guard: "public", meta: { pageTitle: "Villkor", canonicalPath: "/terms" } },

  // Admin
  { id: "admin-health", path: "/admin/health", kind: "app", element: AdminHealth, guard: "admin" },
  { id: "admin-diagnostics", path: "/admin/diagnostics", kind: "app", element: AdminDiagnostics, guard: "admin" },

  // Talent
  { id: "talent-dashboard", path: "/talent/dashboard", kind: "app", element: TalentDashboard, guard: "protected", allow: ["talent"] },
  { id: "talent-profile", path: "/talent/profile", kind: "app", element: TalentProfile, guard: "protected", allow: ["talent"] },
  { id: "talent-swipe-jobs", path: "/talent/swipe-jobs", kind: "app", element: TalentSwipeJobs, guard: "protected", allow: ["talent"] },
  { id: "talent-matches", path: "/talent/matches", kind: "app", element: TalentMatches, guard: "protected", allow: ["talent"] },
  { id: "talent-match-chat", path: "/talent/matches/:matchId", kind: "app", element: TalentMatchChat, guard: "protected", allow: ["talent"] },
  { id: "talent-activity", path: "/talent/activity", kind: "app", element: TalentActivity, guard: "protected", allow: ["talent"] },
  { id: "talent-inbox", path: "/talent/inbox", kind: "app", element: TalentInbox, guard: "protected", allow: ["talent"] },
  { id: "talent-housing", path: "/talent/housing", kind: "app", element: TalentHousing, guard: "protected", allow: ["talent"] },

  // Employer
  { id: "employer-dashboard", path: "/employer/dashboard", kind: "app", element: EmployerDashboard, guard: "protected", allow: ["employer"] },
  { id: "employer-jobs", path: "/employer/jobs", kind: "app", element: EmployerJobs, guard: "protected", allow: ["employer"] },
  { id: "employer-swipe-talent", path: "/employer/swipe-talent/:jobId", kind: "app", element: EmployerSwipeTalent, guard: "protected", allow: ["employer"] },
  { id: "employer-matches", path: "/employer/matches", kind: "app", element: EmployerMatches, guard: "protected", allow: ["employer"] },
  { id: "employer-match-chat", path: "/employer/matches/:matchId", kind: "app", element: EmployerMatchChat, guard: "protected", allow: ["employer"] },
  { id: "employer-scheduler", path: "/employer/scheduler", kind: "app", element: EmployerScheduler, guard: "protected", allow: ["employer"] },
  { id: "employer-borrow", path: "/employer/borrow", kind: "app", element: EmployerBorrow, guard: "protected", allow: ["employer"] },
  { id: "employer-activity", path: "/employer/activity", kind: "app", element: EmployerActivity, guard: "protected", allow: ["employer"] },
  { id: "employer-inbox", path: "/employer/inbox", kind: "app", element: EmployerInbox, guard: "protected", allow: ["employer"] },

  // Host
  { id: "host-housing", path: "/host/housing", kind: "app", element: HostHousing, guard: "protected", allow: ["host"] },
  { id: "host-inbox", path: "/host/inbox", kind: "app", element: HostInbox, guard: "protected", allow: ["host"] },

  // Settings (any authenticated user)
  { id: "settings", path: "/settings", kind: "app", element: Settings, guard: "protected" },
  { id: "settings-profile", path: "/settings/profile", kind: "app", element: SettingsProfile, guard: "protected" },
  { id: "settings-account", path: "/settings/account", kind: "app", element: SettingsAccount, guard: "protected" },

  // Catch-all
  { id: "not-found", path: "*", kind: "public", element: NotFound, guard: "public", meta: { pageTitle: "Sidan hittades inte", canonicalPath: "/" } },
];

// ── Dev-only route validation ─────────────────────────────────
if (import.meta.env.DEV) {
  const ids = routes.map((r) => r.id);
  const paths = routes.filter((r) => r.path !== "*").map((r) => r.path);

  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupIds.length) {
    console.error(`[routeConfig] Duplicate route ids: ${dupIds.join(", ")}`);
    throw new Error(`Duplicate route ids: ${dupIds.join(", ")}`);
  }

  const dupPaths = paths.filter((p, i) => paths.indexOf(p) !== i);
  if (dupPaths.length) {
    console.error(`[routeConfig] Duplicate route paths: ${dupPaths.join(", ")}`);
    throw new Error(`Duplicate route paths: ${dupPaths.join(", ")}`);
  }

  for (const r of routes) {
    if (r.kind === "public" && r.meta && !r.meta.canonicalPath.startsWith("/")) {
      console.error(`[routeConfig] Public route "${r.id}" canonicalPath must start with "/": got "${r.meta.canonicalPath}"`);
      throw new Error(`Invalid canonicalPath for route "${r.id}"`);
    }
  }
}
