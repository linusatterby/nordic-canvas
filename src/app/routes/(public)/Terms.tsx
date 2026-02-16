import { PublicShell } from "@/app/layout/PublicShell";
import { APP_NAME } from "@/config/brand";

export function Terms() {
  return (
    <PublicShell pageTitle="Användarvillkor" canonicalPath="/terms">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Användarvillkor</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>
            Här publiceras villkoren för användning av {APP_NAME}-plattformen.
            Innehållet uppdateras inom kort.
          </p>
          <p>
            Har du frågor om våra villkor? Kontakta oss på{" "}
            <a href="mailto:info@matildus.se" className="text-primary hover:underline">
              info@matildus.se
            </a>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}

export default Terms;
