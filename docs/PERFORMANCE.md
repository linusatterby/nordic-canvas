# Performance Guide

## Bundle Analysis

Generate a visual treemap of the JS bundle:

```bash
npm run analyze
```

This opens `dist/stats.html` with gzip/brotli sizes. Look for:

- **Unexpectedly large chunks** — should be split via `React.lazy`
- **Duplicate dependencies** — same lib bundled in multiple chunks
- **Heavy libraries** — consider lighter alternatives or tree-shaking

## CI Bundle Guardrails

Every CI run executes `scripts/audit-bundle.mjs` after `vite build`. It fails if:

| Metric | Default Threshold | Env Override |
|--------|------------------|--------------|
| Total JS | 2500 KB | `BUNDLE_MAX_TOTAL_KB` |
| Largest chunk | 800 KB | `BUNDLE_MAX_CHUNK_KB` |

To adjust thresholds in CI, set environment variables in `.github/workflows/ci.yml`.

## Route Code-Splitting

**Convention:**
- **Public routes** (`kind: "public"`) → `React.lazy()` — keeps initial bundle small
- **Protected routes** (`kind: "app"`) → eager import — loaded after auth

A unit test (`src/test/lazy-routes.test.ts`) enforces this convention in CI.

## React Query Defaults

Global defaults in `App.tsx`:

```ts
staleTime: 60_000    // 1 min — prevents chatty refetches
refetchOnWindowFocus: false
retry: 1
```

Domain-specific overrides can be set per-hook when needed.

## Quick Checklist

- [ ] `npm run analyze` — no chunk > 500 KB (ideal) or 800 KB (hard limit)
- [ ] Public routes use `React.lazy` in `routeConfig.tsx`
- [ ] No heavy library imported at top-level in route components
- [ ] `staleTime` set appropriately for chatty queries
