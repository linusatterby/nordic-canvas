import { PublicShell } from "@/app/layout/PublicShell";

export function Privacy() {
  return (
    <PublicShell pageTitle="Integritetspolicy" canonicalPath="/privacy">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Integritetspolicy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>
            Denna sida innehåller information om hur Seasonal Talent hanterar dina personuppgifter.
            Innehållet uppdateras inom kort.
          </p>
          <p>
            Har du frågor om vår hantering av personuppgifter? Kontakta oss på{" "}
            <a href="mailto:info@seasonaltalent.se" className="text-primary hover:underline">
              info@seasonaltalent.se
            </a>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}

export default Privacy;
