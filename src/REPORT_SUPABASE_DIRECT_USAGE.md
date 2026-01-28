# Supabase Direct Usage Report

> Generated: 2026-01-28
> 
> This report lists files that import the Supabase client outside the allowed paths.

## Summary

| Category | Status |
|----------|--------|
| Files in `src/lib/api/*` | ✅ Allowed |
| Files in `src/hooks/*` | ⚠️ Some allowed (session/realtime), review others |
| Files in `src/contexts/*` | ✅ Allowed (AuthContext) |
| Files in `src/app/routes/*` | ✅ No violations |
| Files in `src/lib/supabase/*` | ✅ Allowed |

---

## ❌ VIOLATIONS (require refactor)

**None** – All violations have been resolved.

---

## ⚠️ REVIEW NEEDED (hooks with direct client usage)

### `src/hooks/useDemoGuideSummary.ts`
- **Line 6:** `import { supabase } from "@/integrations/supabase/client";`
- **Issue:** Hook imports client directly instead of using API layer
- **Recommendation:** Move query to `src/lib/api/demoGuide.ts`

### `src/hooks/useSession.ts`
- **Line 2:** `import { supabase } from "@/integrations/supabase/client";`
- **Status:** ✅ Acceptable – Session management requires direct auth access

### `src/hooks/useScheduler.ts`
- **Line 3:** `import { supabase } from "@/integrations/supabase/client";`
- **Status:** ✅ Acceptable – Realtime subscription requires direct client

---

## ✅ COMPLIANT FILES

### `src/lib/api/*` (All compliant)
- `src/lib/api/activity.ts`
- `src/lib/api/adminHealth.ts` ← **NEW**
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

### `src/hooks/*` (Compliant)
- `src/hooks/useAdminHealth.ts` ← **NEW**

### `src/contexts/*` (Compliant)
- `src/contexts/AuthContext.tsx` – Auth state management

### `src/lib/supabase/*` (Compliant)
- `src/lib/supabase/auth.ts` – Auth utilities
- `src/lib/supabase/client.ts` – Re-export

---

## Resolved Issues

| File | Status | Resolution |
|------|--------|------------|
| `src/app/routes/(admin)/AdminHealth.tsx` | ✅ Fixed | Moved to `src/lib/api/adminHealth.ts` + `src/hooks/useAdminHealth.ts` |

---

## Action Items

1. ~~**High Priority:** Refactor `AdminHealth.tsx` to use API layer~~ ✅ Done
2. **Medium Priority:** Review `useDemoGuideSummary.ts` for API migration
3. **Low Priority:** Document exceptions in PROJECT_RULES.md (done)

---

*This report is a snapshot. Re-run search to update.*
