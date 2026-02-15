import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/delight/Toasts";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGate } from "@/components/auth/RoleGate";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { routes, type RouteDef } from "@/app/routes/routeConfig";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function renderRoute(route: RouteDef) {
  const Element = route.element;
  let node = <Element />;

  if (route.guard === "protected") {
    if (route.allow) {
      node = (
        <ProtectedRoute>
          <RoleGate allow={route.allow}>{node}</RoleGate>
        </ProtectedRoute>
      );
    } else {
      node = <ProtectedRoute>{node}</ProtectedRoute>;
    }
  }

  // Wrap lazy components in Suspense
  return (
    <Route
      key={route.path}
      path={route.path}
      element={<Suspense fallback={null}>{node}</Suspense>}
    />
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <DemoSessionProvider>
              <ToastProvider>
                <Toaster />
                <Sonner />
                <Routes>{routes.map(renderRoute)}</Routes>
              </ToastProvider>
            </DemoSessionProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
