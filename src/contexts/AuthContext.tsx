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
  }, []);

  const bootstrapProfile = React.useCallback(async (defaultType: ProfileType = "talent") => {
    setProfileLoading(true);
    const { profile: p } = await ensureMyProfile(defaultType);
    setProfile(p);
    setProfileLoading(false);
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

  React.useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      // Bootstrap profile after sign in (deferred to avoid deadlock)
      if (event === "SIGNED_IN" && currentSession?.user) {
        setTimeout(() => {
          bootstrapProfile();
          loadDemoOrgs();
        }, 0);
      }

      // Clear profile on sign out
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setDemoOrgIds([]);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      // Load profile if already logged in
      if (existingSession?.user) {
        setTimeout(() => {
          loadProfile();
          loadDemoOrgs();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [bootstrapProfile, loadProfile, loadDemoOrgs]);

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
    // Email contains +demo
    if (user?.email?.includes("+demo")) {
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
