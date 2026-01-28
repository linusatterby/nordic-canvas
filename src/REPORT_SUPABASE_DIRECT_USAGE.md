# Supabase Direct Usage Report

**Generated:** 2026-01-28  
**Purpose:** Track compliance with [PROJECT_RULES.md](./PROJECT_RULES.md)

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Compliant | 21 |
| ⚠️ Review | 5 |
| ❌ Violation | 1 |

---

## ✅ Compliant (src/lib/api/*)

These files correctly centralize Supabase access in the API layer:

| File | Line | Notes |
|------|------|-------|
| `src/lib/api/activity.ts` | 1 | ✅ OK |
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

Files that violate PROJECT_RULES.md:

| File | Line | Issue | Action Required |
|------|------|-------|-----------------|
| `src/app/routes/(admin)/AdminHealth.tsx` | 24 | Direct supabase import in route component | ❌ **Move to API layer** |

### Details: AdminHealth.tsx

```tsx
// Line 24 - VIOLATION
import { supabase } from "@/integrations/supabase/client";
```

**Recommendation:**
1. Create `src/lib/api/health.ts` with healthcheck query
2. Create `src/hooks/useHealthcheck.ts` with React Query wrapper
3. Update AdminHealth.tsx to use the hook

---

## supabase.from() Usage

Direct table queries found (all in compliant locations):

| File | Line | Table | Status |
|------|------|-------|--------|
| `src/lib/api/borrow.ts` | 158 | `borrow_offers` | ✅ OK |
| `src/lib/api/orgs.ts` | 112 | `orgs` | ✅ OK |

---

## Next Steps

1. [ ] Fix `AdminHealth.tsx` violation — move query to API layer
2. [ ] Review `useScheduler.ts` realtime pattern
3. [ ] Review `useDemoGuideSummary.ts` RPC call placement
4. [ ] Consider ESLint rule to catch future violations

---

*This report should be updated when violations are fixed or new ones are discovered.*
