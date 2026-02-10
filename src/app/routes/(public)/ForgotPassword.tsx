import * as React from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { PublicShell } from "@/app/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ForgotPassword() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Ange din e-postadress");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast.error("Kunde inte skicka återställningslänk. Försök igen.");
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <PublicShell>
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4">
        <Card variant="elevated" padding="lg" className="w-full max-w-md">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-verified mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Kolla din e-post</h1>
              <p className="text-sm text-muted-foreground">
                Om det finns ett konto kopplat till <strong>{email}</strong> har vi skickat en
                länk för att återställa ditt lösenord.
              </p>
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="gap-2 mt-4">
                  <ArrowLeft className="h-4 w-4" />
                  Tillbaka till inloggningen
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">Glömt lösenord?</h1>
                <p className="text-sm text-muted-foreground">
                  Ange din e-postadress så skickar vi en återställningslänk.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
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
                    "Skicka återställningslänk"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/auth" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" />
                  Tillbaka till inloggningen
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}

export default ForgotPassword;
