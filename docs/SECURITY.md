# Security Checklist

Last reviewed: 2026-02-15

## RLS Checklist

All public tables have Row-Level Security (RLS) enabled. Policy strategy:

### Core Tables (authenticated users)

| Table | RLS | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|-----|--------|--------|--------|--------|-------|
| `orgs` | ✅ | Members + demo orgs | – | – | – | Demo orgs publicly visible |
| `org_members` | ✅ | Own org | Admin only | Admin only | Admin only | |
| `profiles` | ✅ | Own profile | Own | Own | – | |
| `job_posts` | ✅ | Published/demo + org | Org member | Org member | Org member | |
| `matches` | ✅ | Own + org | – (trigger) | Parties | – | |
| `offers` | ✅ | Own + org | Org (draft) | Org (draft) | ❌ | No delete by design |
| `messages` | ✅ | Thread access | Thread member | ❌ | ❌ | Immutable audit |
| `threads` | ✅ | Match/housing parties | ❌ (trigger) | ❌ | ❌ | |
| `shift_bookings` | ✅ | Org + talent | Org member | Org member | Org member | |
| `notifications` | ✅ | Recipient | ❌ (trigger) | Mark read | ❌ | |
| `activity_events` | ✅ | Org/talent | ❌ (trigger) | ❌ | ❌ | Audit trail |

### Demo Tables (anonymous + authenticated)

| Table | RLS | Anonymous Access | Notes |
|-------|-----|-----------------|-------|
| `demo_sessions` | ✅ | INSERT + SELECT only | No UPDATE/DELETE from client |
| `demo_talent_cards` | ✅ | SELECT only | Read-only demo data |
| `demo_matches` | ✅ | Session-scoped | `demo_session_all` policy |
| `demo_chat_*` | ✅ | Session-scoped | Isolated per session |
| `demo_shift_bookings` | ✅ | Session-scoped | |
| `demo_release_offers` | ✅ | Session-scoped | |

### Admin/Config Tables

| Table | RLS | Access | Notes |
|-------|-----|--------|-------|
| `admin_audit_log` | ✅ | ❌ None | Server-only via triggers |
| `app_schema_config` | ✅ | ❌ None | Server-only |
| `match_config` | ✅ | ❌ None | Server-only |
| `demo_email_allowlist` | ✅ | ❌ None | Server-only |

### Anonymous Access (by design)

The linter reports "Anonymous Access Policies" warnings for most tables. This is **intentional** because:

1. The demo system uses Supabase anonymous sign-in (`signInAnonymously`)
2. RLS policies still enforce proper scoping via `auth.uid()`, `is_org_member()`, and `demo_session_id`
3. Anonymous users can only access data scoped to their session

**Risk assessment**: Low. Anonymous access is properly scoped by session isolation.

---

## Secrets Checklist

### Client-side (src/)

- ✅ `SUPABASE_URL` — publishable, OK in client
- ✅ `SUPABASE_ANON_KEY` — publishable, OK in client
- ❌ `SUPABASE_SERVICE_ROLE_KEY` — **must never appear in src/**
- ❌ `STRIPE_SECRET_KEY` — **must never appear in src/**
- ❌ `STRIPE_WEBHOOK_SECRET` — **must never appear in src/**

### Server-side (edge functions)

- ✅ `SUPABASE_SERVICE_ROLE_KEY` — available via `Deno.env.get()`
- ✅ `SUPABASE_URL` — available via `Deno.env.get()`
- ✅ `SUPABASE_ANON_KEY` — available via `Deno.env.get()`

### CI Enforcement

```bash
node scripts/audit-secrets.mjs  # Fails if SERVICE_ROLE found in src/
```

Runs in `.github/workflows/ci.yml` on every push/PR.

---

## Admin Access Checklist

### Route Gating

| Route | Guard | Auth Required | Additional Gate |
|-------|-------|---------------|-----------------|
| `/admin/health` | `admin` | ✅ ProtectedRoute | – |
| `/admin/diagnostics` | `admin` | ✅ ProtectedRoute | Redirects in prod+live |

### Admin Identification

Currently, admin status is determined by:
1. **Route config**: `guard: "admin"` ensures `ProtectedRoute` wraps the route
2. **Component-level gating**: `AdminDiagnostics` checks `IS_LIVE_BACKEND && APP_ENV === "prod"` and redirects

**Future improvement**: When user roles are implemented (via `user_roles` table), admin routes should additionally check `has_role(auth.uid(), 'admin')`.

### Demo Mode

In demo mode, admin routes are **blocked** — `ProtectedRoute` does not bypass admin areas for demo sessions.

---

## How to Run Audits

### 1. Secrets Audit (CI)
```bash
node scripts/audit-secrets.mjs
```
Scans all `.ts/.tsx/.js/.jsx` files under `src/` for forbidden patterns like `SERVICE_ROLE_KEY`.

### 2. Query Key Audit (CI)
```bash
node scripts/audit-querykeys.mjs
```
Ensures query key conventions are followed.

### 3. Database Linter
Run via the Lovable Cloud backend UI to check for:
- Tables without RLS
- Overly permissive policies
- Anonymous access patterns

### 4. Manual Review Checklist
- [ ] All new tables have RLS enabled
- [ ] No `USING (true)` on INSERT/UPDATE/DELETE (except demo_sessions INSERT)
- [ ] No service_role references in src/
- [ ] Edge functions validate auth headers
- [ ] Edge functions with env guards check `BACKEND_ENV`
- [ ] Sensitive data masked in logs (`safeMeta()` in logger)
