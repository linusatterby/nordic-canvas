# Supabase Direct Usage Report

**Generated:** 2026-01-28  
**Last Updated:** 2026-01-28  
**Purpose:** Track compliance with [PROJECT_RULES.md](./PROJECT_RULES.md)

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Compliant | 22 |
| ⚠️ Review | 5 |
| ❌ Violation | 0 |

---

## ✅ Compliant (src/lib/api/*)

These files correctly centralize Supabase access in the API layer:

| File | Line | Notes |
|------|------|-------|
| `src/lib/api/activity.ts` | 1 | ✅ OK |
| `src/lib/api/adminHealth.ts` | 1 | ✅ OK — Refactored from AdminHealth.tsx |
| `src/lib/api/borrow.ts` | 1 | ✅ OK |
| `src/lib/api/chat.ts` | 1 | ✅ OK |
| `src/lib/api/circles.ts` | 1 | ✅ OK |
| `src/lib/api/dashboard.ts` | 1 | ✅ OK |
| `src/lib/api/demo.ts` | 1 | ✅ OK |
| `src/lib/api/demoGuide.ts` | 1 | ✅ OK |
| `src/lib/api/demoMatches.ts` | 1 | ✅ OK |
| `src/lib/api/demoScheduler.ts` | 1 | ✅ OK |
| `src/lib/api/housing.ts` | 1 | ✅ OK |
| `src/lib/api/jobs.ts` | 1 | ✅ OK |
| `src/lib/api/matches.ts` | 1 | ✅ OK |
| `src/lib/api/notifications.ts` | 1 | ✅ OK |
| `src/lib/api/offers.ts` | 1 | ✅ OK |
| `src/lib/api/orgs.ts` | 1 | ✅ OK |
| `src/lib/api/profile.ts` | 1 | ✅ OK |
| `src/lib/api/ranking.ts` | 1 | ✅ OK |
| `src/lib/api/scheduler.ts` | 1 | ✅ OK |
| `src/lib/api/talent.ts` | 1 | ✅ OK |
| `src/lib/api/visibility.ts` | 1 | ✅ OK |
| `src/lib/supabase/auth.ts` | 1 | ✅ OK — Auth helper functions |

---

## ⚠️ Review Required

These files import supabase outside the API layer but may be acceptable:

| File | Line | Reason | Verdict |
|------|------|--------|---------|
| `src/contexts/AuthContext.tsx` | 3 | Auth state management (onAuthStateChange) | ⚠️ **Acceptable** — Auth listeners need direct access |
| `src/hooks/useSession.ts` | 2 | Session subscription hook | ⚠️ **Acceptable** — Wraps auth.onAuthStateChange |
| `src/hooks/useScheduler.ts` | 3 | Realtime subscription setup | ⚠️ **Review** — Should realtime setup be in API layer? |
| `src/hooks/useDemoGuideSummary.ts` | 6 | Direct RPC call inside hook | ⚠️ **Review** — Consider moving to `src/lib/api/demoGuide.ts` |
| `src/lib/supabase/client.ts` | 3 | Re-export wrapper | ⚠️ **Acceptable** — Convenience re-export |
| `src/integrations/supabase/client.ts` | — | Source file | ⚠️ **Acceptable** — This is the source |

---

## ❌ Violations

**None!** 🎉

All previous violations have been resolved:

| File | Resolution | Date |
|------|------------|------|
| `src/app/routes/(admin)/AdminHealth.tsx` | Refactored to use `useAdminHealth` hook | 2026-01-28 |

---

## supabase.from() Usage

Direct table queries found (all in compliant locations):

| File | Line | Table | Status |
|------|------|-------|--------|
| `src/lib/api/adminHealth.ts` | 54, 72, 85 | `orgs`, `job_posts`, `offers` | ✅ OK |
| `src/lib/api/borrow.ts` | 158 | `borrow_offers` | ✅ OK |
| `src/lib/api/orgs.ts` | 112 | `orgs` | ✅ OK |

---

## Next Steps

1. [x] ~~Fix `AdminHealth.tsx` violation — move query to API layer~~ ✅ Done
2. [ ] Review `useScheduler.ts` realtime pattern
3. [ ] Review `useDemoGuideSummary.ts` RPC call placement
4. [ ] Consider ESLint rule to catch future violations

---

*This report should be updated when violations are fixed or new ones are discovered.*
