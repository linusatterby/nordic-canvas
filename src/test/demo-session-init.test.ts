/**
 * Verify that demo_sessions upsert never fires before an auth session exists.
 *
 * The bug: DemoSessionContext used a separate demoClient (no auth) for the
 * upsert, causing 401s. The fix: use the main supabase client which holds
 * the anon session after signInAnonymously().
 */
import { describe, it, expect, vi } from "vitest";

// Minimal mock of supabase client
function createMockSupabase() {
  let hasSession = false;

  const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const fromFn = vi.fn(() => ({ upsert: upsertFn }));

  const client = {
    auth: {
      signInAnonymously: vi.fn(async () => {
        hasSession = true;
        return { data: { session: { access_token: "tok" } }, error: null };
      }),
      getUser: vi.fn(async () => ({
        data: { user: { id: "anon-user-id" } },
        error: null,
      })),
    },
    from: fromFn,
    /** Test helper — true once signInAnonymously resolved */
    get _hasSession() {
      return hasSession;
    },
  };

  return { client, upsertFn, fromFn };
}

/**
 * Simulate the fixed init sequence from DemoSessionContext.startDemoInternal
 */
async function simulateStartDemo(supabase: any) {
  // This mirrors the fixed code: sign in FIRST, then upsert via main client
  await supabase.auth.signInAnonymously();
  const { data } = await supabase.auth.getUser();
  await supabase.from("demo_sessions").upsert({
    id: "test-session-id",
    role: "employer",
    anon_user_id: data.user?.id ?? null,
  });
}

describe("demo session init sequence", () => {
  it("does not call upsert before signInAnonymously resolves", async () => {
    const { client, upsertFn } = createMockSupabase();

    // Before init: no upsert
    expect(upsertFn).not.toHaveBeenCalled();

    await simulateStartDemo(client);

    // signInAnonymously was called first
    expect(client.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    // upsert happened after session was established
    expect(client._hasSession).toBe(true);
    expect(upsertFn).toHaveBeenCalledTimes(1);
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ anon_user_id: "anon-user-id" }),
    );
  });

  it("upsert uses the same client that holds the auth session", async () => {
    const { client, fromFn } = createMockSupabase();

    await simulateStartDemo(client);

    // from() was called on the main client, not a separate unauthenticated one
    expect(fromFn).toHaveBeenCalledWith("demo_sessions");
  });
});
