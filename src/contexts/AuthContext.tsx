import * as React from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { IS_DEMO_ENV } from "@/lib/config/env";
import { ensureMyProfile, getMyProfile, type Profile, type ProfileType } from "@/lib/api/profile";
import { perfStart, perfEnd, perfMark } from "@/lib/utils/perf";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "demo";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isDemoMode: boolean;
  /** Computed auth status — prefer this for guard logic */
  status: AuthStatus;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Check if email matches demo patterns
 */
function isDemoEmail(email: string | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower.includes("+demo") || lower.startsWith("demo.") || lower.includes(".demo@");
}

/**
 * Check if email is in the demo allowlist (DB check)
 */
async function checkDemoAllowlist(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_demo_allowlisted", { p_email: email });
    if (error) {
      console.warn("Failed to check demo allowlist:", error);
      return false;
    }
    return data === true;
  } catch (err) {
    console.warn("Failed to check demo allowlist:", err);
    return false;
  }
}

/**
 * Mark user as demo in the database (silent, fire-and-forget)
 */
async function markUserAsDemo(role?: string): Promise<void> {
  try {
    await supabase.rpc("mark_me_as_demo", { p_role: role ?? null });
  } catch (err) {
    console.warn("Failed to mark user as demo:", err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    perfStart("loadProfile");
    setProfileLoading(true);
    const { profile: p } = await getMyProfile();
    setProfile(p);
    setProfileLoading(false);
    perfEnd("loadProfile");
    return p;
  }, []);

  const bootstrapProfile = React.useCallback(async (defaultType: ProfileType = "talent") => {
    perfStart("bootstrapProfile");
    setProfileLoading(true);
    const { profile: p } = await ensureMyProfile(defaultType);
    setProfile(p);
    setProfileLoading(false);
    perfEnd("bootstrapProfile");
    return p;
  }, []);

  // Helper to check and mark demo user (pattern OR allowlist)
  const checkAndMarkDemo = React.useCallback(async (email: string | undefined, currentProfile: Profile | null) => {
    if (!email || currentProfile?.is_demo) return;
    
    // Check pattern first (fast)
    let shouldMarkDemo = isDemoEmail(email);
    
    // If pattern doesn't match, check allowlist (DB call)
    if (!shouldMarkDemo) {
      shouldMarkDemo = await checkDemoAllowlist(email);
    }
    
    if (shouldMarkDemo) {
      await markUserAsDemo(currentProfile?.type === "employer" ? "employer" : "talent");
      // Reload profile to get updated is_demo flag
      await loadProfile();
    }
  }, [loadProfile]);

  React.useEffect(() => {
    perfStart("auth_bootstrap");
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      perfMark("auth_state_change", event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      // Bootstrap profile after sign in (deferred to avoid deadlock)
      if (event === "SIGNED_IN" && currentSession?.user) {
        setTimeout(async () => {
          const p = await bootstrapProfile();
          // Demo check is fast (pattern) or deferred (allowlist)
          await checkAndMarkDemo(currentSession.user.email, p);
        }, 0);
      }

      // Clear profile on sign out
      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      perfMark("getSession_complete");
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      // Load profile if already logged in
      if (existingSession?.user) {
        setTimeout(async () => {
          const p = await loadProfile();
          perfEnd("auth_bootstrap");
          // Demo check is fast (pattern) or deferred (allowlist)
          await checkAndMarkDemo(existingSession.user.email, p);
        }, 0);
      } else {
        perfEnd("auth_bootstrap");
      }
    });

    return () => subscription.unsubscribe();
  }, [bootstrapProfile, loadProfile, checkAndMarkDemo]);

  const refreshProfile = React.useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // Compute isDemoMode based on profile or email pattern
  // Removed demoOrgIds check - now computed lazily in routes if needed
  const isDemoMode = React.useMemo(() => {
    // Profile has is_demo flag
    if ((profile as Profile & { is_demo?: boolean })?.is_demo) {
      return true;
    }
    // Email contains demo pattern (fallback while profile updates)
    if (isDemoEmail(user?.email)) {
      return true;
    }
    return false;
  }, [profile, user?.email]);

  // Compute auth status for guards
  const status: AuthStatus = React.useMemo(() => {
    if (IS_DEMO_ENV) return "demo";
    if (loading) return "loading";
    if (user) return "authenticated";
    return "anonymous";
  }, [loading, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        isDemoMode,
        status,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
