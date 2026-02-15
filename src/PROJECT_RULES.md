# Källkodens lag (The Law of the Source Code)

Architectural governance rules for this project. **All contributors must follow these rules.**

---

## 1. Routing

- **Route config:** `src/app/routes/routeConfig.tsx` is the single source of truth for paths, guards, and roles.
- **App.tsx** only renders the config — no inline route definitions.
- Do not define routes elsewhere.

---

## 2. Route Components (`src/app/routes/*`)

- **Only page components** belong here.
- No global initialization or side effects (e.g., auth listeners, context providers).
- Route components receive data via hooks and render UI.

---

## 3. Data Access Layer

**All Supabase access must go through:**

| Layer | Location | Purpose |
|-------|----------|---------|
| Auth helpers | `src/lib/supabase/auth.ts` | Auth operations (sign in/up/out/reset) |
| API functions | `src/lib/api/*` | Data queries & mutations |
| Hooks | `src/hooks/*` | React Query wrappers, state management |

**Authorized exceptions** (direct client import allowed):
- `src/contexts/AuthContext.tsx` – auth state listener
- `src/hooks/useSession.ts` – session listener
- `src/hooks/useScheduler.ts` – realtime channel

### ❌ Forbidden

```tsx
// NEVER do this in pages or components:
import { supabase } from "@/integrations/supabase/client";
const { data } = await supabase.from("users").select("*");
```

### ✅ Correct

```tsx
// In src/lib/api/users.ts
export async function fetchUsers() {
  const { data, error } = await supabase.from("users").select("*");
  if (error) throw error;
  return data;
}

// In src/hooks/useUsers.ts
export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: fetchUsers });
}

// In component
import { useUsers } from "@/hooks/useUsers";
const { data: users } = useUsers();
```

---

## 4. How to Add New Data

Follow this pattern for any new data requirement:

1. **Create API function** in `src/lib/api/<domain>.ts`
2. **Create hook** in `src/hooks/use<Domain>.ts`
3. **Use hook** in your component

Example for a new "comments" feature:

```
src/lib/api/comments.ts    → fetchComments(), createComment()
src/hooks/useComments.ts   → useComments(), useCreateComment()
```

---

## 5. Why These Rules?

- **Testability**: API functions can be unit tested without React.
- **Caching**: React Query handles caching, deduplication, and revalidation.
- **Consistency**: One pattern for all data access.
- **Security**: Centralized queries are easier to audit.

---

## 6. SEO & Meta Foundation

- **All public routes** must use `<PublicShell>` which renders `<PageMeta>`.
- **All meta/head tags** (title, description, canonical, robots, og) must go through `PageMeta` — no other `<title>` or `<meta>` in components.
- `VITE_APP_ENV=demo` ⇒ `noindex,nofollow` automatically. **Must not be bypassed.**
- `VITE_SITE_URL` ⇒ absolute canonical & og:image URLs in prod. Empty = relative fallback.
- Default OG image: `/og/default.png` (committed in `public/`).
- JSON-LD: pass `jsonLd` prop to `PageMeta` when needed; scripts are auto-managed.

---

## 7. Compliance

Violations are tracked in `src/REPORT_SUPABASE_DIRECT_USAGE.md` (if present).

When in doubt, ask: _"Is this data access going through a hook?"_
