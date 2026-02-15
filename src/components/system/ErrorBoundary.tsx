import * as React from "react";
import { logger } from "@/lib/logging/logger";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("Unhandled React error", {
      context: "ErrorBoundary",
      error,
      meta: { componentStack: info.componentStack ?? undefined },
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Något gick fel
            </h1>
            <p className="text-muted-foreground text-sm">
              Ett oväntat fel inträffade. Försök ladda om sidan.
            </p>
            {this.state.error && (
              <pre className="text-xs text-destructive bg-destructive/5 rounded-lg p-3 overflow-auto max-h-32 text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Ladda om sidan
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
