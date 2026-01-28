# Källkodens lag (The Law of the Source Code)

Architectural governance rules for this project. **All contributors must follow these rules.**

---

## 1. Routing

**Source of truth:** `src/App.tsx`

- All routes are defined in `src/App.tsx` using React Router.
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
| API functions | `src/lib/api/*` | Raw Supabase queries |
| Hooks | `src/hooks/*` | React Query wrappers, state management |

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

## 6. Compliance

Violations are tracked in `src/REPORT_SUPABASE_DIRECT_USAGE.md` (if present).

When in doubt, ask: _"Is this data access going through a hook?"_
