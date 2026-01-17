import * as React from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyProfile, getMyProfile, type Profile, type ProfileType } from "@/lib/api/profile";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isDemoMode: boolean;
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
  const [demoOrgIds, setDemoOrgIds] = React.useState<string[]>([]);

  const loadProfile = React.useCallback(async () => {
    setProfileLoading(true);
    const { profile: p } = await getMyProfile();
    setProfile(p);
    setProfileLoading(false);
    return p;
  }, []);

  const bootstrapProfile = React.useCallback(async (defaultType: ProfileType = "talent") => {
    setProfileLoading(true);
    const { profile: p } = await ensureMyProfile(defaultType);
    setProfile(p);
    setProfileLoading(false);
    return p;
  }, []);

  // Load demo org IDs for the user
  const loadDemoOrgs = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("orgs")
      .select("id")
      .eq("is_demo", true);
    
    if (!error && data) {
      setDemoOrgIds(data.map(o => o.id));
    }
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
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      // Bootstrap profile after sign in (deferred to avoid deadlock)
      if (event === "SIGNED_IN" && currentSession?.user) {
        setTimeout(async () => {
          const p = await bootstrapProfile();
          await loadDemoOrgs();
          
          // Auto-mark as demo if email matches pattern OR is in allowlist
          await checkAndMarkDemo(currentSession.user.email, p);
        }, 0);
      }

      // Clear profile on sign out
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setDemoOrgIds([]);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      // Load profile if already logged in
      if (existingSession?.user) {
        setTimeout(async () => {
          const p = await loadProfile();
          await loadDemoOrgs();
          
          // Auto-mark as demo if email matches pattern OR is in allowlist
          await checkAndMarkDemo(existingSession.user.email, p);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [bootstrapProfile, loadProfile, loadDemoOrgs, checkAndMarkDemo]);

  const refreshProfile = React.useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // Compute isDemoMode based on profile, orgs, or email
  const isDemoMode = React.useMemo(() => {
    // Profile has is_demo flag
    if ((profile as Profile & { is_demo?: boolean })?.is_demo) {
      return true;
    }
    // User belongs to a demo org
    if (demoOrgIds.length > 0) {
      return true;
    }
    // Email contains demo pattern (fallback while profile updates)
    if (isDemoEmail(user?.email)) {
      return true;
    }
    return false;
  }, [profile, demoOrgIds, user?.email]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        isDemoMode,
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
