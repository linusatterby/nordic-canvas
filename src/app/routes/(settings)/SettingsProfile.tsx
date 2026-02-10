import { Link, useLocation } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/classnames";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { href: "/settings/profile", label: "Profil" },
  { href: "/settings/account", label: "Konto" },
];

export function SettingsProfile() {
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.type === "employer" ? "employer" : profile?.type === "host" ? "host" : "talent";

  return (
    <AppShell role={role}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">Inställningar</h1>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                location.pathname === tab.href
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <Card variant="default" padding="lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Profilinställningar</h2>
          <p className="text-sm text-muted-foreground">
            Här kommer du kunna redigera ditt namn, bild och andra profiluppgifter. Funktionen är under utveckling.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

export default SettingsProfile;
