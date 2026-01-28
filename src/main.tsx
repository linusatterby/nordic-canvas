import { createRoot } from "react-dom/client";
import { hasSupabaseEnv } from "./lib/env";
import "./index.css";

/**
 * Bootstrap the app with environment validation
 * If Supabase env vars are missing, show error page without importing App
 * (which would trigger Supabase client init and crash)
 */
async function bootstrap() {
  const root = createRoot(document.getElementById("root")!);

  if (!hasSupabaseEnv()) {
    // Dynamically import error page only - avoids Supabase import chain
    const { MissingEnvPage } = await import("./app/errors/MissingEnvPage");
    root.render(<MissingEnvPage />);
    return;
  }

  // Import full app (which includes Supabase client)
  const App = (await import("./App")).default;
  root.render(<App />);
}

bootstrap();

