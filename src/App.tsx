import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/delight/Toasts";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGate } from "@/components/auth/RoleGate";

// Public routes
import Landing from "@/app/routes/(public)/Landing";
import Auth from "@/app/routes/(public)/Auth";

// Talent routes
import TalentDashboard from "@/app/routes/(talent)/TalentDashboard";
import TalentProfile from "@/app/routes/(talent)/TalentProfile";
import TalentSwipeJobs from "@/app/routes/(talent)/TalentSwipeJobs";
import TalentMatches from "@/app/routes/(talent)/TalentMatches";

// Employer routes
import EmployerDashboard from "@/app/routes/(employer)/EmployerDashboard";
import EmployerScheduler from "@/app/routes/(employer)/EmployerScheduler";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/login" element={<Auth />} />
              <Route path="/auth/signup" element={<Auth />} />

              {/* Talent (Protected + Role-gated) */}
              <Route
                path="/talent/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["talent"]}>
                      <TalentDashboard />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/talent/profile"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["talent"]}>
                      <TalentProfile />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/talent/swipe-jobs"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["talent"]}>
                      <TalentSwipeJobs />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/talent/matches"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["talent"]}>
                      <TalentMatches />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />

              {/* Employer (Protected + Role-gated) */}
              <Route
                path="/employer/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["employer"]}>
                      <EmployerDashboard />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employer/scheduler"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["employer"]}>
                      <EmployerScheduler />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employer/jobs"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["employer"]}>
                      <EmployerDashboard />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employer/swipe-talent"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["employer"]}>
                      <EmployerDashboard />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employer/borrow"
                element={
                  <ProtectedRoute>
                    <RoleGate allow={["employer"]}>
                      <EmployerDashboard />
                    </RoleGate>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
