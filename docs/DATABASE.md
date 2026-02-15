# Database Management

## Migrations (Single Source of Truth)

All schema changes are managed as timestamped SQL migration files in:

```
supabase/migrations/YYYYMMDDHHMMSS_<uuid>.sql
```

### Rules

1. **Never** change the database schema via the dashboard UI manually.
2. All changes go through the Lovable migration tool (or `supabase db diff` locally).
3. Migrations are **append-only** — never edit an existing migration file.
4. The `supabase/migrations/` directory is read-only in CI; changes are applied via the platform.

### Workflow

1. Describe the schema change (table, columns, RLS policies, indexes, triggers).
2. Use the migration tool to generate and apply a timestamped `.sql` file.
3. The types file (`src/integrations/supabase/types.ts`) auto-updates after migration.
4. Commit the migration file — it's the source of truth.

---

## Seed / Test Data

### Edge Function: `seed-test`

An idempotent seed function that creates baseline demo data (orgs, talent cards, job posts).

**Guards:**
- Requires `Authorization: Bearer <SERVICE_ROLE_KEY>`
- Blocked if `BACKEND_ENV=live` (returns 403)

**Idempotency:**
- Checks for existing records by natural key (name, title) before inserting.
- Safe to run multiple times — duplicates are skipped.

### How to run

**Via curl (locally with Supabase CLI):**
```bash
curl -X POST http://localhost:54321/functions/v1/seed-test \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json"
```

**Via Lovable diagnostics page:**
Navigate to `/admin/diagnostics` (only in test/demo) and use the "Run Seed" button.

### What gets seeded

| Entity | Name | Notes |
|--------|------|-------|
| Org | Testföretag AB | `is_demo=true` |
| Talent Card | Anna Svensson | kock, Stockholm |
| Talent Card | Erik Johansson | servitör, Göteborg |
| Talent Card | Maria Lindström | receptionist, Malmö |
| Job Post | Kock – Sommarsäsong | linked to org |
| Job Post | Servitör – Hotell Riviera | linked to org |

### Reset

Use the existing `reset_demo` RPC or `demo-cleanup` edge function to clear demo data.

---

## Backup & Restore

### Backup

**Schema only:**
```bash
# Requires Supabase CLI and project linked
supabase db dump --schema public > backups/schema_$(date +%Y%m%d).sql
```

**Schema + data (test environment):**
```bash
supabase db dump --schema public --data-only > backups/data_test_$(date +%Y%m%d).sql
```

**Live backup (requires explicit flag):**
```bash
# Use the Lovable Cloud UI → Cloud View → Run SQL
# Or export via pg_dump with the live connection string (handle with care)
```

### Restore (test only)

```bash
# Restore schema to local/test
supabase db reset  # reapplies all migrations from scratch

# Restore data dump
psql $TEST_DATABASE_URL < backups/data_test_YYYYMMDD.sql
```

### Safety Rules

| Action | test | live |
|--------|------|------|
| Backup schema | ✅ | ✅ (read-only) |
| Backup data | ✅ | ⚠️ Explicit flag required |
| Restore | ✅ | ❌ Never via scripts |
| Seed | ✅ | ❌ Blocked by guard |
| Reset demo | ✅ | ❌ Blocked by guard |

### Backup Directory

Store backups in `backups/` (gitignored). Create the directory:
```bash
mkdir -p backups
echo "backups/" >> .gitignore  # if not already there
```

---

## Environment Separation

| Variable | test/demo | live |
|----------|-----------|------|
| `BACKEND_ENV` | `test` | `live` |
| `APP_ENV` | `demo` | `prod` |
| Seed allowed | ✅ | ❌ |
| Reset allowed | ✅ | ❌ |
| Log buffer | ✅ (200 entries) | ❌ |
| Diagnostics | ✅ | ❌ (redirects) |
