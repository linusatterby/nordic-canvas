import { createRoot } from "react-dom/client";
import { hasSupabaseEnv } from "./lib/env";
import { validateConfig } from "./lib/config/runtime";
import { installOverflowGuard } from "./lib/dev/overflowGuard";
import "./index.css";

// Install dev-only overflow detection
installOverflowGuard();

/**
 * Bootstrap the app with environment validation.
 *
 * 1. Validate runtime config (cross-env invariants, required vars).
 * 2. Check Supabase env vars exist (fail-fast before client init).
 * 3. Dynamically import App to avoid Supabase client crash on missing vars.
 */
async function bootstrap() {
  const root = createRoot(document.getElementById("root")!);

  // Validate cross-env invariants — throws on fatal misconfig
  try {
    validateConfig({ throwOnError: true });
  } catch (err) {
    console.error(err);
    const { MissingEnvPage } = await import("./app/errors/MissingEnvPage");
    root.render(<MissingEnvPage />);
    return;
  }

  if (!hasSupabaseEnv()) {
    const { MissingEnvPage } = await import("./app/errors/MissingEnvPage");
    root.render(<MissingEnvPage />);
    return;
  }

  const App = (await import("./App")).default;
  root.render(<App />);
}

bootstrap();

