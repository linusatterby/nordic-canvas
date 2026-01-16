import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/classnames";

type AuthMode = "login" | "signup";

export function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = React.useState<AuthMode>(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [role, setRole] = React.useState<"talent" | "employer">(
    searchParams.get("role") === "employer" ? "employer" : "talent"
  );

  return (
    <PublicShell>
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
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
                    placeholder="Ditt namn"
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                  placeholder="din@email.se"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

            <Button type="submit" variant="primary" size="lg" className="w-full gap-2">
              {mode === "login" ? "Logga in" : "Skapa konto"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Har du inget konto?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-primary font-medium hover:underline"
                >
                  Registrera dig
                </button>
              </>
            ) : (
              <>
                Har du redan ett konto?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-primary font-medium hover:underline"
                >
                  Logga in
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </PublicShell>
  );
}

export default Auth;
