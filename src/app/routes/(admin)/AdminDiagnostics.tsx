/**
 * Diagnostics page – only accessible in test/demo environments.
 * Shows runtime config, Supabase ping, recent log buffer, and copy-to-clipboard.
 */
import * as React from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { APP_ENV, BACKEND_ENV, SITE_URL, IS_LIVE_BACKEND } from "@/lib/config/env";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/runtime";
import { getLogBuffer, type LogEvent } from "@/lib/logging/logger";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url ? "invalid-url" : "(empty)";
  }
}

function maskKey(key: string): string {
  if (!key) return "(empty)";
  if (key.length <= 12) return "***";
  return key.slice(0, 8) + "…" + key.slice(-4);
}

function levelColor(level: string): string {
  switch (level) {
    case "error": return "text-destructive";
    case "warn": return "text-yellow-600 dark:text-yellow-400";
    case "debug": return "text-muted-foreground";
    default: return "text-foreground";
  }
}

export default function AdminDiagnostics() {
  // Gate: only test/demo
  if (IS_LIVE_BACKEND && APP_ENV === "prod") {
    return <Navigate to="/" replace />;
  }

  return <DiagnosticsContent />;
}

function DiagnosticsContent() {
  const [pingResult, setPingResult] = React.useState<string | null>(null);
  const [pinging, setPinging] = React.useState(false);
  const [logs, setLogs] = React.useState<readonly LogEvent[]>([]);

  React.useEffect(() => {
    setLogs(getLogBuffer());
  }, []);

  const handlePing = async () => {
    setPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - start);
      if (error) {
        setPingResult(`❌ Error: ${error.message} (${latency}ms)`);
      } else {
        setPingResult(`✅ OK (${latency}ms)`);
      }
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setPingResult(`❌ Failed: ${err instanceof Error ? err.message : String(err)} (${latency}ms)`);
    } finally {
      setPinging(false);
    }
  };

  const handleCopy = () => {
    const summary = {
      ts: new Date().toISOString(),
      config: {
        APP_ENV,
        BACKEND_ENV,
        SITE_URL: SITE_URL || "(empty)",
        supabase_host: maskUrl(SUPABASE_URL),
        anon_key: maskKey(SUPABASE_ANON_KEY),
      },
      ping: pingResult,
      recent_errors: logs.filter((l) => l.level === "error").slice(-10),
      userAgent: navigator.userAgent,
    };
    navigator.clipboard.writeText(JSON.stringify(summary, null, 2)).then(() => {
      toast.success("Diagnostics kopierad till urklipp");
    });
  };

  const recentErrors = logs.filter((l) => l.level === "error" || l.level === "warn").slice(-20);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Diagnostics</h1>
      <p className="text-sm text-muted-foreground">
        Endast synlig i test/demo. Ingen känslig data visas.
      </p>

      {/* Config */}
      <Card className="p-4 space-y-2">
        <h2 className="font-semibold text-foreground">Runtime Config</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">APP_ENV</dt>
          <dd className="font-mono">{APP_ENV}</dd>
          <dt className="text-muted-foreground">BACKEND_ENV</dt>
          <dd className="font-mono">{BACKEND_ENV}</dd>
          <dt className="text-muted-foreground">SITE_URL</dt>
          <dd className="font-mono">{SITE_URL || "(empty)"}</dd>
          <dt className="text-muted-foreground">Supabase host</dt>
          <dd className="font-mono">{maskUrl(SUPABASE_URL)}</dd>
          <dt className="text-muted-foreground">Anon key</dt>
          <dd className="font-mono">{maskKey(SUPABASE_ANON_KEY)}</dd>
        </dl>
      </Card>

      {/* Ping */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-foreground">Backend Ping</h2>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={handlePing} disabled={pinging}>
            {pinging ? "Pingar…" : "Ping Supabase"}
          </Button>
          {pingResult && <span className="text-sm font-mono">{pingResult}</span>}
        </div>
      </Card>

      {/* Log buffer */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Recent Warnings/Errors ({recentErrors.length})
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setLogs(getLogBuffer())}>
            Uppdatera
          </Button>
        </div>
        {recentErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga varningar eller fel i bufferten.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {recentErrors.map((entry, i) => (
              <div key={i} className="text-xs font-mono border-b border-border pb-1">
                <span className={levelColor(entry.level)}>[{entry.level}]</span>{" "}
                <span className="text-muted-foreground">{entry.ts.slice(11, 23)}</span>{" "}
                <span className="font-semibold">{entry.event}</span>
                {entry.message && <span className="text-muted-foreground"> — {entry.message}</span>}
                {entry.error && (
                  <div className="text-destructive/80 pl-2 truncate">{entry.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Copy */}
      <Button onClick={handleCopy} variant="outline" className="w-full">
        📋 Copy diagnostics JSON
      </Button>
    </div>
  );
}
