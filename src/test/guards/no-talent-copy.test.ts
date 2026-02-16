import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Guard: no user-facing copy should contain "talent", "talang", "talanger"
 * (case-insensitive). Internal technical identifiers (DB tables, RPC names,
 * route paths, variable names) are allowlisted.
 *
 * This ensures the "kandidat/kandidater" terminology is used consistently.
 */

// Patterns that match user-facing "talent/talang" words
const TALENT_COPY_RE = /\btalang(?:er|en|ens|erna)?\b|\btalent(?:s|ed)?\b/i;

const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", "supabase/migrations"]);

// Files that are allowed to contain "talent/talang" because they hold
// technical identifiers (DB column names, RPC calls, route paths, type names, etc.)
const ALLOWED_FILES = new Set([
  // ── This test file itself ──
  "src/test/guards/no-talent-copy.test.ts",
  // Old brand guard (references the word in its own regex/comments)
  "src/test/guards/no-old-brand.test.ts",

  // ── Central labels config (contains mapping comment) ──
  "src/config/labels.ts",

  // ── API layer: DB table/column names like talent_user_id, talent_badges ──
  "src/lib/api/talent.ts",
  "src/lib/api/talent/credentialCatalog.ts",
  "src/lib/api/talent/credentials.ts",
  "src/lib/api/talent/jobPreferences.ts",
  "src/lib/api/talent/shiftAvailability.ts",
  "src/lib/api/activity.ts",
  "src/lib/api/adminDiagnostics.ts",
  "src/lib/api/adminHealth.ts",
  "src/lib/api/borrow.ts",
  "src/lib/api/chat.ts",
  "src/lib/api/circles.ts",
  "src/lib/api/dashboard.ts",
  "src/lib/api/demo.ts",
  "src/lib/api/demoGuide.ts",
  "src/lib/api/demoMatches.ts",
  "src/lib/api/demoScheduler.ts",
  "src/lib/api/housing.ts",
  "src/lib/api/index.ts",
  "src/lib/api/jobs.ts",
  "src/lib/api/matches.ts",
  "src/lib/api/notifications.ts",
  "src/lib/api/offers.ts",
  "src/lib/api/orgs.ts",
  "src/lib/api/profile.ts",
  "src/lib/api/ranking.ts",
  "src/lib/api/scheduler.ts",
  "src/lib/api/visibility.ts",

  // ── Hooks: reference DB/API types with "talent" in names ──
  "src/hooks/useActivity.ts",
  "src/hooks/useBorrow.ts",
  "src/hooks/useChat.ts",
  "src/hooks/useCircles.ts",
  "src/hooks/useCredentialCatalog.ts",
  "src/hooks/useCredentials.ts",
  "src/hooks/useDashboardSummary.ts",
  "src/hooks/useDemo.ts",
  "src/hooks/useDemoGuideSummary.ts",
  "src/hooks/useDemoMatches.ts",
  "src/hooks/useDemoScheduler.ts",
  "src/hooks/useHousing.ts",
  "src/hooks/useJobPreferences.ts",
  "src/hooks/useJobsFeed.ts",
  "src/hooks/useListings.ts",
  "src/hooks/useMatches.ts",
  "src/hooks/useNotifications.ts",
  "src/hooks/useOffers.ts",
  "src/hooks/useOrgs.ts",
  "src/hooks/useRanking.ts",
  "src/hooks/useScheduler.ts",
  "src/hooks/useSession.ts",
  "src/hooks/useShiftAvailability.ts",
  "src/hooks/useStableRankedStack.ts",
  "src/hooks/useSwipes.ts",
  "src/hooks/useTalentFeed.ts",
  "src/hooks/useVisibilitySummary.ts",

  // ── Query keys: internal key strings referencing talent ──
  "src/lib/queryKeys.ts",

  // ── Route config: route paths like /talent/*, variable names ──
  "src/app/routes/routeConfig.tsx",

  // ── Route components: filenames & imports contain "Talent" in component names ──
  "src/app/routes/(talent)/TalentDashboard.tsx",
  "src/app/routes/(talent)/TalentProfile.tsx",
  "src/app/routes/(talent)/TalentSwipeJobs.tsx",
  "src/app/routes/(talent)/TalentMatches.tsx",
  "src/app/routes/(talent)/TalentMatchChat.tsx",
  "src/app/routes/(talent)/TalentActivity.tsx",
  "src/app/routes/(talent)/TalentInbox.tsx",
  "src/app/routes/(talent)/TalentHousing.tsx",

  // ── Employer routes: reference talent types/variables ──
  "src/app/routes/(employer)/EmployerSwipeTalent.tsx",
  "src/app/routes/(employer)/EmployerMatches.tsx",
  "src/app/routes/(employer)/EmployerScheduler.tsx",
  "src/app/routes/(employer)/EmployerBorrow.tsx",
  "src/app/routes/(employer)/EmployerInbox.tsx",
  "src/app/routes/(employer)/EmployerJobs.tsx",
  "src/app/routes/(employer)/EmployerDashboard.tsx",
  "src/app/routes/(employer)/EmployerMatchChat.tsx",
  "src/app/routes/(employer)/EmployerActivity.tsx",

  // ── Host routes: reference talent types (e.g. talent_name field) ──
  "src/app/routes/(host)/HostHousing.tsx",
  "src/app/routes/(host)/HostInbox.tsx",
  "src/app/routes/(host)/index.ts",

  // ── Public routes: internal role type literals like "talent" ──
  "src/app/routes/(public)/Auth.tsx",
  "src/app/routes/(public)/Landing.tsx",
  "src/app/routes/(public)/ForTalanger.tsx",

  // ── Settings: internal role checks ──
  "src/app/routes/(settings)/SettingsAccount.tsx",
  "src/app/routes/(settings)/SettingsProfile.tsx",

  // ── Components with internal type references ──
  "src/components/borrow/TalentBorrowOffers.tsx",
  "src/components/cards/CandidateCard.tsx",
  "src/components/circles/TalentCircleVisibilityCard.tsx",
  "src/components/offers/OfferComposerModal.tsx",
  "src/components/offers/OfferDetailModal.tsx",
  "src/components/offers/OffersList.tsx",
  "src/components/offers/index.ts",
  "src/components/scheduler/CreateBookingModal.tsx",
  "src/components/scheduler/ReleaseOffersCard.tsx",
  "src/components/scheduler/WeekRangeSelector.tsx",
  "src/components/filters/TalentListingsFilters.tsx",
  "src/components/filters/EmployerListingsFilters.tsx",
  "src/components/chat/MatchChatView.tsx",
  "src/components/demo/DemoGuideModal.tsx",
  "src/components/demo/DemoBanner.tsx",
  "src/components/demo/DemoAvailabilityBypassNotice.tsx",
  "src/components/delight/EmptyStates.tsx",
  "src/components/auth/ProtectedRoute.tsx",
  "src/components/auth/RoleGate.tsx",
  "src/components/auth/RoleSelectorModal.tsx",

  // ── Contexts ──
  "src/contexts/AuthContext.tsx",
  "src/contexts/DemoSessionContext.tsx",

  // ── Lib utilities & internal ──
  "src/lib/matching/credentialScore.ts",
  "src/lib/demo/guideSteps.ts",
  "src/lib/demo/demoSession.ts",
  "src/lib/demo/availabilityBypass.ts",
  "src/lib/constants/demoCta.ts",
  "src/lib/constants/roles.ts",
  "src/lib/constants/status.ts",
  "src/lib/auth/returnUrl.ts",
  "src/lib/export/payrollExport.ts",
  "src/lib/config/env.ts",
  "src/lib/config/runtime.ts",
  "src/lib/supabase/auth.ts",
  "src/lib/supabase/client.ts",
  "src/lib/supabase/demoClient.ts",
  "src/lib/query/invalidate.ts",

  // ── SEO meta and tests (reference /for-talanger path) ──
  "src/lib/seo/meta.ts",
  "src/lib/seo/__tests__/meta.test.ts",
  "src/lib/seo/PageMeta.tsx",

  // ── App layout: route paths like "/talent/...", nav links like "/for-talanger" ──
  "src/app/layout/AppShell.tsx",
  "src/app/layout/PublicShell.tsx",
  "src/app/layout/SideNav.tsx",
  "src/app/layout/MobileNav.tsx",
  "src/app/layout/TopNav.tsx",

  // ── Hooks with internal step/key identifiers like "swipe-talent" ──
  "src/hooks/useDemoCoachToast.ts",

  // ── Test files that reference internal identifiers ──
  "src/test/auth-returnUrl.test.ts",
  "src/test/talent-reset-swipes.test.ts",
  "src/test/talent-demo-fallback.test.ts",
  "src/test/talent-profile-certifikat.test.ts",
  "src/test/talent-swipe-demo-data.test.ts",
  "src/test/demo-cta-routing.test.ts",
  "src/test/demo-session-init.test.ts",
  "src/test/demo-availability-bypass.test.ts",
  "src/test/swipe-double-submit.test.ts",
  "src/test/credential-score.test.ts",
  "src/test/guards/no-direct-supabase.test.ts",
  "src/test/guards/no-pages-imports.test.ts",
  "src/test/guards/postgrest-joins.test.ts",
  "src/test/lazy-routes.test.ts",
  "src/test/seed-guards.test.ts",

  // ── Supabase types (read-only, auto-generated) ──
  "src/integrations/supabase/types.ts",
  "src/integrations/supabase/client.ts",
  "src/integrations/supabase/authStorage.ts",

  // ── Dev scripts ──
  "scripts/seed-test.mjs",
  "scripts/check-supabase-usage.mjs",
  "scripts/audit-querykeys.mjs",

  // ── Docs / markdown (may reference DB schema) ──
  "docs/DATABASE.md",
  "docs/PERFORMANCE.md",
  "docs/SECURITY.md",
  "src/PROJECT_RULES.md",
  "src/REPORT_SUPABASE_DIRECT_USAGE.md",
  "README.md",

  // ── Edge functions ──
  "supabase/functions/demo-cleanup/index.ts",
  "supabase/functions/seed-test/index.ts",

  // ── Config ──
  "supabase/config.toml",
  "playwright-fixture.ts",
]);

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), full);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(rel) && !EXCLUDED_DIRS.has(entry.name)) {
        results.push(...collectFiles(full));
      }
    } else if (entry.isFile()) {
      results.push(rel);
    }
  }
  return results;
}

describe("No user-facing talent/talang copy", () => {
  it("should not contain 'talent', 'talang', or 'talanger' in user-facing files", () => {
    const root = process.cwd();
    const files = collectFiles(root);
    const violations: string[] = [];

    for (const file of files) {
      if (ALLOWED_FILES.has(file)) continue;
      // Only check text-ish files
      if (/\.(ts|tsx|js|jsx|css|html|md|json|yml|yaml|svg)$/.test(file)) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (TALENT_COPY_RE.test(lines[i])) {
            violations.push(`${file}:${i + 1}  →  ${lines[i].trim().slice(0, 120)}`);
          }
        }
      }
    }

    if (violations.length) {
      throw new Error(
        `Found ${violations.length} user-facing "talent/talang" references (should be "kandidat/kandidater"):\n${violations.join("\n")}\n\nIf these are internal/technical identifiers, add the file to the ALLOWED_FILES set in this test.`
      );
    }
  });
});
