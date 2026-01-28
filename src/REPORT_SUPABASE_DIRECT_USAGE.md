# Supabase Direct Usage Report

> Generated: 2026-01-28
> 
> This report lists files that import the Supabase client outside the allowed paths.

## Summary

| Category | Status |
|----------|--------|
| Files in `src/lib/api/*` | ✅ Allowed |
| Files in `src/hooks/*` | ✅ All compliant |
| Files in `src/contexts/*` | ✅ Allowed (AuthContext) |
| Files in `src/app/routes/*` | ✅ No violations |
| Files in `src/lib/supabase/*` | ✅ Allowed |

---

## ❌ VIOLATIONS (require refactor)

**None** – All violations have been resolved.

---

## ⚠️ REVIEW NEEDED

**None** – All reviews have been addressed.

---

## ✅ COMPLIANT FILES

### `src/lib/api/*` (All compliant)
- `src/lib/api/activity.ts`
- `src/lib/api/adminHealth.ts`
- `src/lib/api/borrow.ts`
- `src/lib/api/chat.ts`
- `src/lib/api/dashboard.ts`
- `src/lib/api/demo.ts`
- `src/lib/api/demoGuide.ts`
- `src/lib/api/demoMatches.ts`
- `src/lib/api/demoScheduler.ts`
- `src/lib/api/housing.ts`
- `src/lib/api/jobs.ts`
- `src/lib/api/matches.ts`
- `src/lib/api/notifications.ts`
- `src/lib/api/offers.ts`
- `src/lib/api/orgs.ts`
- `src/lib/api/profile.ts`
- `src/lib/api/scheduler.ts`
- `src/lib/api/talent.ts`
- `src/lib/api/visibility.ts`

### `src/hooks/*` (Compliant with exceptions noted)
- `src/hooks/useAdminHealth.ts` – Uses API layer
- `src/hooks/useDemoGuideSummary.ts` – Uses API layer ✅ Fixed

**Documented exceptions (direct client required):**
- `src/hooks/useSession.ts` – Session management requires `auth.getSession()`
- `src/hooks/useScheduler.ts` – Realtime subscription requires direct client

### `src/contexts/*` (Compliant)
- `src/contexts/AuthContext.tsx` – Auth state management (exception)

### `src/lib/supabase/*` (Compliant)
- `src/lib/supabase/auth.ts` – Auth utilities
- `src/lib/supabase/client.ts` – Re-export

---

## Resolved Issues

| File | Status | Resolution |
|------|--------|------------|
| `src/app/routes/(admin)/AdminHealth.tsx` | ✅ Fixed | Moved to API layer |
| `src/hooks/useDemoGuideSummary.ts` | ✅ Fixed | Now uses `getDemoGuideSummary` from API layer |

---

## Documented Exceptions

These files have legitimate reasons for direct Supabase client access:

| File | Reason |
|------|--------|
| `src/hooks/useSession.ts` | Session/auth state requires `supabase.auth.getSession()` |
| `src/hooks/useScheduler.ts` | Realtime subscriptions require direct client |
| `src/contexts/AuthContext.tsx` | Auth lifecycle with `onAuthStateChange` |
| `src/lib/supabase/auth.ts` | Auth utility functions |

---

## All Clear ✅

No violations or pending reviews. The codebase follows PROJECT_RULES.md.

---

*This report is a snapshot. Re-run search to update.*
