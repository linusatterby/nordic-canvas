# Project Code Rules

> **"Källkodens lag"** – Follow these rules to keep the codebase maintainable and secure.

## 1. Routing

- **All routes are defined ONLY in `src/App.tsx`**
- Do not add route definitions anywhere else

## 2. Page Components (`src/app/routes/*`)

- Page components are **UI + local hooks only**
- No global initialization logic
- No direct Supabase client usage
- Import data via hooks from `src/hooks/*`

## 3. Data Access Layer

### Allowed Supabase usage:
- ✅ `src/lib/api/*` – All Supabase queries/mutations
- ✅ `src/hooks/*` – React Query hooks that call API functions
- ✅ `src/contexts/AuthContext.tsx` – Auth state management (exception)
- ✅ `src/lib/supabase/*` – Auth utilities

### Forbidden:
- ❌ `supabase.from(...)` directly in page components (`src/app/routes/*`)
- ❌ `supabase.from(...)` directly in UI components (`src/components/*`)
- ❌ Importing `@/integrations/supabase/client` in pages/components

## 4. Component Structure

```
src/
├── app/routes/          # Page components (UI only)
├── components/          # Reusable UI components
│   ├── ui/              # Atomic UI primitives
│   └── [feature]/       # Feature-specific components
├── hooks/               # React Query hooks (data fetching)
├── lib/api/             # Supabase queries/mutations
├── contexts/            # React contexts (auth, etc.)
└── integrations/        # External service clients
```

## 5. Why These Rules?

1. **Testability** – API layer can be mocked easily
2. **Security** – Single point of RLS enforcement review
3. **Maintainability** – Clear separation of concerns
4. **Performance** – React Query handles caching centrally

## 6. Exceptions

The following files have legitimate reasons for direct Supabase access:

- `src/contexts/AuthContext.tsx` – Manages auth state with `onAuthStateChange`
- `src/lib/supabase/auth.ts` – Auth utility functions
- `src/hooks/useSession.ts` – Session state hook
- `src/hooks/useScheduler.ts` – Realtime subscription (requires client)

---

**Before adding new Supabase queries:**
1. Create/update a function in `src/lib/api/`
2. Create/update a hook in `src/hooks/`
3. Use the hook in your component
