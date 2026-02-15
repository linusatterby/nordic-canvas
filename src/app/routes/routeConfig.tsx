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
export type RouteGuard = "protected" | "public" | "admin";
export type RoleAllow = "talent" | "employer" | "host";

export interface AppRoute {
  path: string;
  element: ComponentType;
  guard: RouteGuard;
  /** Required role(s) – only used when guard === "protected" */
  allow?: RoleAllow[];
}

// ── Route definitions ─────────────────────────────────────────
export const routes: AppRoute[] = [
  // Public
  { path: "/", element: Landing, guard: "public" },
  { path: "/for-talanger", element: ForTalanger, guard: "public" },
  { path: "/for-arbetsgivare", element: ForArbetsgivare, guard: "public" },
  { path: "/auth", element: Auth, guard: "public" },
  { path: "/auth/login", element: Auth, guard: "public" },
  { path: "/auth/signup", element: Auth, guard: "public" },
  { path: "/auth/forgot", element: ForgotPassword, guard: "public" },
  { path: "/privacy", element: Privacy, guard: "public" },
  { path: "/terms", element: Terms, guard: "public" },

  // Admin
  { path: "/admin/health", element: AdminHealth, guard: "admin" },

  // Talent
  { path: "/talent/dashboard", element: TalentDashboard, guard: "protected", allow: ["talent"] },
  { path: "/talent/profile", element: TalentProfile, guard: "protected", allow: ["talent"] },
  { path: "/talent/swipe-jobs", element: TalentSwipeJobs, guard: "protected", allow: ["talent"] },
  { path: "/talent/matches", element: TalentMatches, guard: "protected", allow: ["talent"] },
  { path: "/talent/matches/:matchId", element: TalentMatchChat, guard: "protected", allow: ["talent"] },
  { path: "/talent/activity", element: TalentActivity, guard: "protected", allow: ["talent"] },
  { path: "/talent/inbox", element: TalentInbox, guard: "protected", allow: ["talent"] },
  { path: "/talent/housing", element: TalentHousing, guard: "protected", allow: ["talent"] },

  // Employer
  { path: "/employer/dashboard", element: EmployerDashboard, guard: "protected", allow: ["employer"] },
  { path: "/employer/jobs", element: EmployerJobs, guard: "protected", allow: ["employer"] },
  { path: "/employer/swipe-talent/:jobId", element: EmployerSwipeTalent, guard: "protected", allow: ["employer"] },
  { path: "/employer/matches", element: EmployerMatches, guard: "protected", allow: ["employer"] },
  { path: "/employer/matches/:matchId", element: EmployerMatchChat, guard: "protected", allow: ["employer"] },
  { path: "/employer/scheduler", element: EmployerScheduler, guard: "protected", allow: ["employer"] },
  { path: "/employer/borrow", element: EmployerBorrow, guard: "protected", allow: ["employer"] },
  { path: "/employer/activity", element: EmployerActivity, guard: "protected", allow: ["employer"] },
  { path: "/employer/inbox", element: EmployerInbox, guard: "protected", allow: ["employer"] },

  // Host
  { path: "/host/housing", element: HostHousing, guard: "protected", allow: ["host"] },
  { path: "/host/inbox", element: HostInbox, guard: "protected", allow: ["host"] },

  // Settings (any authenticated user)
  { path: "/settings", element: Settings, guard: "protected" },
  { path: "/settings/profile", element: SettingsProfile, guard: "protected" },
  { path: "/settings/account", element: SettingsAccount, guard: "protected" },

  // Catch-all
  { path: "*", element: NotFound, guard: "public" },
];
