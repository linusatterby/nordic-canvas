/**
 * Context that provides session-isolated demo state to the entire app.
 *
 * Activates when:
 *  - URL has ?demo=1
 *  - User clicks "Starta demo"
 *
 * Provides:
 *  - demoSessionId: current session UUID (or null if not in demo)
 *  - isDemoSession: boolean shorthand
 *  - startDemo(role): create session + anon sign-in
 *  - endDemo(): clear session + navigate to landing
 *  - demoSupabase: pre-configured client with x-demo-session header
 */
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IS_DEMO_ENV } from "@/lib/config/env";
import {
  getOrCreateDemoSessionId,
  getDemoSessionId,
  getDemoRole as getPersistedDemoRole,
  setDemoRole as persistDemoRole,
  clearDemoSession,
} from "@/lib/demo/demoSession";
import { getDemoSupabase } from "@/lib/supabase/demoClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DemoRole = "employer" | "talent";

interface DemoSessionContextValue {
  demoSessionId: string | null;
  isDemoSession: boolean;
  demoRole: DemoRole;
  startDemo: (role?: DemoRole) => Promise<void>;
  endDemo: () => void;
  demoSupabase: SupabaseClient<Database> | null;
}

const DemoSessionContext = React.createContext<DemoSessionContextValue | undefined>(undefined);

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = React.useState<string | null>(() => getDemoSessionId());
  // Restore persisted role so it survives page reloads within the same tab
  const [demoRole, setDemoRoleState] = React.useState<DemoRole>(
    () => (getPersistedDemoRole() as DemoRole) || "employer"
  );

  const setDemoRole = React.useCallback((role: DemoRole) => {
    setDemoRoleState(role);
    persistDemoRole(role);
  }, []);

  // One-time guard so URL auto-start never re-fires within the same mount
  const urlHandledRef = React.useRef(false);

  // Auto-start demo from URL param ?demo=1 (deterministic: resets if role mismatches)
  React.useEffect(() => {
    if (urlHandledRef.current) return;
    const wantDemo = searchParams.get("demo") === "1";
    if (!wantDemo) return;
    urlHandledRef.current = true;

    const urlRole = (searchParams.get("role") as DemoRole) || "employer";
    const currentRole = (getPersistedDemoRole() as DemoRole) || "employer";
    const currentId = getDemoSessionId();

    // Strip ?demo&role from URL so internal navigation never re-triggers
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("demo");
    cleanUrl.searchParams.delete("role");
    window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

    // Idempotent: already running with correct role → just navigate
    if (currentId && currentRole === urlRole) {
      const target = urlRole === "employer" ? "/employer/jobs" : "/talent/swipe-jobs";
      navigate(target, { replace: true });
      return;
    }

    // Mismatch or no session: reset everything, then start fresh
    if (currentId) {
      clearDemoSession();
      queryClient.clear();
      supabase.auth.signOut().catch(() => {});
    }

    const id = getOrCreateDemoSessionId();
    setSessionId(id);
    setDemoRole(urlRole);

    const client = getDemoSupabase(id);
    supabase.auth.signInAnonymously()
      .then(() => supabase.auth.getUser())
      .then(({ data }) => {
        client.from("demo_sessions").upsert({
          id,
          role: urlRole,
          anon_user_id: data.user?.id ?? null,
        }).then(() => {});
      })
      .catch((err) => console.warn("[DemoSession] URL auto-start error:", err))
      .finally(() => {
        const target = urlRole === "employer" ? "/employer/jobs" : "/talent/swipe-jobs";
        navigate(target, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start demo when IS_DEMO_ENV is true (no ?demo=1 needed)
  const envAutoStartRef = React.useRef(false);
  React.useEffect(() => {
    if (envAutoStartRef.current) return;
    if (!IS_DEMO_ENV) return;
    // Don't auto-start if a session already exists (URL-param or reload)
    if (getDemoSessionId()) {
      setSessionId(getDemoSessionId());
      envAutoStartRef.current = true;
      return;
    }
    envAutoStartRef.current = true;

    const id = getOrCreateDemoSessionId();
    setSessionId(id);
    setDemoRole("employer");

    const client = getDemoSupabase(id);
    supabase.auth.signInAnonymously()
      .then(() => supabase.auth.getUser())
      .then(({ data }) => {
        client.from("demo_sessions").upsert({
          id,
          role: "employer",
          anon_user_id: data.user?.id ?? null,
        }).then(() => {});
      })
      .catch((err) => console.warn("[DemoSession] ENV auto-start error:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDemoInternal = React.useCallback(async (role: DemoRole = "employer") => {
    const id = getOrCreateDemoSessionId();
    setSessionId(id);
    setDemoRole(role);

    // Register the session in the DB (fire-and-forget)
    const client = getDemoSupabase(id);
    try {
      // Sign in anonymously so we have an auth context
      await supabase.auth.signInAnonymously();

      await client.from("demo_sessions").upsert({
        id,
        role,
        anon_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      });
    } catch (err) {
      console.warn("[DemoSession] Failed to register session:", err);
    }
  }, []);

  const startDemo = React.useCallback(async (role: DemoRole = "employer") => {
    await startDemoInternal(role);
    // Navigate to the appropriate landing
    const target = role === "employer" ? "/employer/jobs" : "/talent/swipe-jobs";
    navigate(target);
  }, [startDemoInternal, navigate]);

  const endDemo = React.useCallback(() => {
    clearDemoSession();
    setSessionId(null);
    // Purge all cached queries so no stale demo data leaks
    queryClient.clear();
    // Sign out the anonymous user
    supabase.auth.signOut().catch(() => {});
    navigate("/");
  }, [navigate, queryClient]);

  const demoSupabase = React.useMemo(() => {
    if (!sessionId) return null;
    return getDemoSupabase(sessionId);
  }, [sessionId]);

  return (
    <DemoSessionContext.Provider
      value={{
        demoSessionId: sessionId,
        isDemoSession: !!sessionId,
        demoRole,
        startDemo,
        endDemo,
        demoSupabase,
      }}
    >
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const ctx = React.useContext(DemoSessionContext);
  if (ctx === undefined) {
    throw new Error("useDemoSession must be used within DemoSessionProvider");
  }
  return ctx;
}
