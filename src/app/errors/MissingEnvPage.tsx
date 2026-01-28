import { getSupabaseEnv } from "@/lib/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/Card";

export function MissingEnvPage() {
  const { missing } = getSupabaseEnv();
  const timestamp = new Date().toISOString();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "unknown";

  return (
    <div className="min-h-screen bg-frost flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink">
            Missing environment variables
          </h1>
          <p className="text-ink/70">
            The application cannot start because required configuration is missing.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTitle>Missing variables</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {missing.map((varName) => (
                <li key={varName} className="font-mono text-sm">
                  {varName}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h2 className="font-semibold text-ink">How to fix this:</h2>
          <ol className="list-decimal list-inside space-y-2 text-ink/80">
            <li>
              <strong>Refresh Preview</strong> — Sometimes a simple refresh resolves sync issues.
            </li>
            <li>
              <strong>Check Settings → Cloud</strong> — Ensure Lovable Cloud is enabled and connected.
            </li>
            <li>
              <strong>Check Integrations → Supabase</strong> — Verify it shows as "Connected".
            </li>
          </ol>
        </div>

        <div className="pt-4 border-t border-ink/10 text-xs text-ink/50 space-y-1">
          <p>
            <span className="font-medium">Hostname:</span>{" "}
            <code className="bg-ink/5 px-1 rounded">{hostname}</code>
          </p>
          <p>
            <span className="font-medium">Timestamp:</span>{" "}
            <code className="bg-ink/5 px-1 rounded">{timestamp}</code>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default MissingEnvPage;
