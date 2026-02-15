import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/classnames";
import { signInWithPassword, signUpWithPassword } from "@/lib/supabase/auth";
import { ensureMyProfile } from "@/lib/api/profile";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoSession } from "@/contexts/DemoSessionContext";
import { RoleSelectorModal } from "@/components/auth/RoleSelectorModal";
import { getSafeReturnUrl } from "@/lib/auth/returnUrl";
import { IS_DEMO_ENV } from "@/lib/config/env";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

// Validation schemas
const emailSchema = z.string().trim().email("Ogiltig e-postadress").max(255, "E-post är för lång");
const passwordSchema = z.string().min(6, "Lösenord måste vara minst 6 tecken").max(128, "Lösenord är för långt");
const nameSchema = z.string().trim().min(1, "Namn krävs").max(100, "Namn är för långt");

export function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { isDemoSession, resetDemoSession } = useDemoSession();

  const [mode, setMode] = React.useState<AuthMode>(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [role, setRole] = React.useState<"talent" | "employer">(
    searchParams.get("role") === "employer" ? "employer" : "talent"
  );
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showRoleSelector, setShowRoleSelector] = React.useState(false);

  // Get returnUrl from query params (set by ProtectedRoute redirect)
  const returnUrl = searchParams.get("returnUrl");

  // Safe landing routes for each role
  const SAFE_LANDINGS = {
    talent: "/talent/swipe-jobs",
    employer: "/employer/jobs",
  } as const;

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && profile) {
      if (profile.type === "both") {
        setShowRoleSelector(true);
      } else {
        const destination = getSafeReturnUrl(returnUrl, profile.type);
        navigate(destination, { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (mode === "signup") {
        nameSchema.parse(name);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Fel e-post eller lösenord");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Bekräfta din e-post först");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        // Profile will be loaded by AuthContext
        toast.success("Inloggad!");
      } else {
        // Signup
        const { error, session } = await signUpWithPassword(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("E-postadressen är redan registrerad");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        if (!session) {
          toast.success("Kolla din e-post för att bekräfta kontot");
          setLoading(false);
          return;
        }

        // Create profile with selected role
        const { error: profileError } = await ensureMyProfile(role);
        if (profileError) {
          toast.error("Kunde inte skapa profil");
          setLoading(false);
          return;
        }

        await refreshProfile();
        toast.success("Konto skapat!");

        // Navigate to returnUrl or safe landing based on role
        const destination = getSafeReturnUrl(returnUrl, role);
        navigate(destination, { replace: true });
      }
    } catch (err) {
      toast.error("Något gick fel. Försök igen.");
    }

    setLoading(false);
  };

  return (
    <PublicShell pageTitle="Logga in" canonicalPath="/auth">
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4">
        <Card variant="elevated" padding="lg" className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {mode === "login" ? "Välkommen tillbaka" : "Skapa konto"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Logga in för att fortsätta till din dashboard"
                : "Registrera dig för att börja din säsongsresa"}
            </p>
          </div>

          {/* Role Toggle (Signup only) */}
          {mode === "signup" && (
            <div className="flex gap-2 p-1 bg-secondary rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setRole("talent")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  role === "talent"
                    ? "bg-card shadow-soft text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Jag söker jobb
              </button>
              <button
                type="button"
                onClick={() => setRole("employer")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  role === "employer"
                    ? "bg-card shadow-soft text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Jag söker personal
              </button>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                  Namn
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ditt namn"
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                E-post
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                   id="email"
                   autoComplete="email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   placeholder="din@email.se"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Lösenord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                   id="password"
                   autoComplete={mode === "login" ? "current-password" : "new-password"}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
            </div>

            {mode === "login" && (
              <div className="flex justify-end">
                <Link to="/auth/forgot" className="text-sm text-primary hover:underline">
                  Glömt lösenord?
                </Link>
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              className="w-full gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Logga in" : "Skapa konto"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Har du inget konto?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary font-medium hover:underline"
                  disabled={loading}
                >
                  Registrera dig
                </button>
              </>
            ) : (
              <>
                Har du redan ett konto?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary font-medium hover:underline"
                  disabled={loading}
                >
                  Logga in
                </button>
              </>
            )}
          </div>
        </Card>

        {/* Demo-only: reset session */}
        {IS_DEMO_ENV && isDemoSession && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={async () => {
                await resetDemoSession();
                toast.success("Demo-session återställd");
                navigate("/");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Återställ demo-session
            </button>
          </div>
        )}
      </div>

      {/* Role Selector Modal for 'both' users */}
      <RoleSelectorModal
        isOpen={showRoleSelector}
        onClose={() => setShowRoleSelector(false)}
      />
    </PublicShell>
  );
}

export default Auth;
