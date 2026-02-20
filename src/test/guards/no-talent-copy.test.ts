import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Guard: no user-facing copy should contain "talent", "talang", "talanger"
// (case-insensitive).
//
// SCOPE: Only src/*.ts/.tsx and index.html are scanned.
// Docs, markdown, JSON, CSS, config are OUT of scope.
//
// Technical identifiers (DB columns, RPC names, route segments, type names)
// are allowed via ALLOWED_FILES.

const TALENT_COPY_RE = /\btalang(?:er|en|ens|erna)?\b|\btalent(?:s|ed)?\b/i;

/** Only these extensions inside src/ are scanned */
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Extra root-level files that contain user-facing meta/text */
const EXTRA_ROOT_FILES = new Set(["index.html"]);

/** Directories skipped entirely */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "supabase"]);

/**
 * Files allowed to contain "talent/talang" because they hold
 * technical identifiers (DB column names, RPC calls, route paths,
 * type names, query keys, etc.).
 *
 * Each entry has a short reason comment.
 */
const ALLOWED_FILES = new Set([
  // ── This test itself ──
  "src/test/guards/no-talent-copy.test.ts",
  "src/test/guards/no-old-brand.test.ts",

  // ── Central labels config (mapping comment) ──
  "src/config/labels.ts",

  // ── API layer: DB table/column refs like talent_user_id ──
  "src/lib/api/candidateJobState.ts", // candidate_id, talent refs in joins
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
  "src/lib/api/employerViews.ts", // talent_user_id, type="talent" DB refs

  // ── Hooks: reference DB/API types with "talent" in names ──
  "src/hooks/useCandidateJobState.ts", // imports from candidateJobState API
  "src/hooks/useActivity.ts",
  "src/hooks/useBorrow.ts",
  "src/hooks/useChat.ts",
  "src/hooks/useCircles.ts",
  "src/hooks/useCredentialCatalog.ts",
  "src/hooks/useCredentials.ts",
  "src/hooks/useDashboardSummary.ts",
  "src/hooks/useDemo.ts",
  "src/hooks/useDemoCoachToast.ts",
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

  // ── Query keys ──
  "src/lib/queryKeys.ts",

  // ── Route config: route paths, role type literals ──
  "src/app/routes/routeConfig.tsx",

  // ── Route components: filenames & imports contain "Talent" ──
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
  "src/app/routes/(employer)/EmployerApplications.tsx",
  "src/app/routes/(employer)/EmployerCandidatePool.tsx",
  "src/app/routes/(employer)/EmployerActivity.tsx",

  // ── Host routes: talent_name field refs ──
  "src/app/routes/(host)/HostHousing.tsx",
  "src/app/routes/(host)/HostInbox.tsx",
  "src/app/routes/(host)/index.ts",

  // ── Public routes: role type literals ──
  "src/app/routes/(public)/Auth.tsx",
  "src/app/routes/(public)/Landing.tsx",
  "src/app/routes/(public)/ForTalanger.tsx",

  // ── Settings: role checks ──
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
  "src/components/demo/DemoInboxPreview.tsx", // sender_type === "talent" DB identifier
  "src/components/delight/EmptyStates.tsx",
  "src/components/auth/ProtectedRoute.tsx",
  "src/components/auth/RoleGate.tsx",
  "src/components/auth/RoleSelectorModal.tsx",

  // ── Contexts ──
  "src/contexts/AuthContext.tsx",
  "src/contexts/DemoSessionContext.tsx",

  // ── Lib utilities ──
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

  // ── SEO (references /for-talanger path) ──
  "src/lib/seo/meta.ts",
  "src/lib/seo/__tests__/meta.test.ts",
  "src/lib/seo/PageMeta.tsx",

  // ── App layout: route paths, nav links ──
  "src/app/layout/AppShell.tsx",
  "src/app/layout/PublicShell.tsx",
  "src/app/layout/SideNav.tsx",
  "src/app/layout/MobileNav.tsx",
  "src/app/layout/TopNav.tsx",

  // ── Supabase types (auto-generated, read-only) ──
  "src/integrations/supabase/types.ts",
  "src/integrations/supabase/client.ts",
  "src/integrations/supabase/authStorage.ts",

  // ── Test files with internal identifiers ──
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
]);

// ── Helpers ──────────────────────────────────────────────────

function collectSrcFiles(dir: string, root: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isDirectory()) {
      results.push(...collectSrcFiles(full, root));
    } else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(rel);
    }
  }
  return results;
}

function scanFile(file: string): string[] {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  const hits: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = TALENT_COPY_RE.exec(lines[i]);
    if (match) {
      hits.push(
        `  ${file}:${i + 1}  token="${match[0]}"  →  ${lines[i].trim().slice(0, 100)}`
      );
    }
  }
  return hits;
}

// ── Tests ────────────────────────────────────────────────────

describe("No user-facing talent/talang copy", () => {
  it("should not contain 'talent/talang' in scanned UI files", () => {
    const root = process.cwd();
    const srcDir = path.join(root, "src");

    // 1. Collect src/**/*.{ts,tsx}
    const files = collectSrcFiles(srcDir, root);

    // 2. Add extra root files (index.html etc.)
    for (const f of EXTRA_ROOT_FILES) {
      const abs = path.join(root, f);
      if (fs.existsSync(abs)) files.push(f);
    }

    // 3. Filter out allowed files and scan
    const violations: string[] = [];
    for (const file of files) {
      if (ALLOWED_FILES.has(file)) continue;
      violations.push(...scanFile(file));
    }

    if (violations.length) {
      throw new Error(
        [
          `Found ${violations.length} user-facing "talent/talang" reference(s).`,
          `Use "kandidat/kandidater" instead, or add the file to ALLOWED_FILES if it's a technical identifier.`,
          "",
          ...violations,
        ].join("\n")
      );
    }
  });

  it("regex matches known talent/talang variants", () => {
    for (const word of ["talent", "Talent", "talents", "talang", "talanger", "Talangen"]) {
      expect(TALENT_COPY_RE.test(word), `should match "${word}"`).toBe(true);
    }
  });

  it("regex does not match unrelated words", () => {
    for (const word of ["total", "install", "tala", "entangle"]) {
      expect(TALENT_COPY_RE.test(word), `should NOT match "${word}"`).toBe(false);
    }
  });

  it("does NOT scan markdown/docs (README.md is out of scope)", () => {
    // Verify README.md is not in EXTRA_ROOT_FILES and .md is not in SCAN_EXTENSIONS
    expect(EXTRA_ROOT_FILES.has("README.md")).toBe(false);
    expect(SCAN_EXTENSIONS.has(".md")).toBe(false);
  });
});
