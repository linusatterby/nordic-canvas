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
import ForTalanger from "@/app/routes/(public)/ForTalanger";
import ForArbetsgivare from "@/app/routes/(public)/ForArbetsgivare";
import Auth from "@/app/routes/(public)/Auth";
import AdminHealth from "@/app/routes/(admin)/AdminHealth";

// Talent routes
import TalentDashboard from "@/app/routes/(talent)/TalentDashboard";
import TalentProfile from "@/app/routes/(talent)/TalentProfile";
import TalentSwipeJobs from "@/app/routes/(talent)/TalentSwipeJobs";
import TalentMatches from "@/app/routes/(talent)/TalentMatches";
import TalentMatchChat from "@/app/routes/(talent)/TalentMatchChat";

// Employer routes
import EmployerDashboard from "@/app/routes/(employer)/EmployerDashboard";
import EmployerScheduler from "@/app/routes/(employer)/EmployerScheduler";
import EmployerJobs from "@/app/routes/(employer)/EmployerJobs";
import EmployerSwipeTalent from "@/app/routes/(employer)/EmployerSwipeTalent";
import EmployerMatches from "@/app/routes/(employer)/EmployerMatches";
import EmployerBorrow from "@/app/routes/(employer)/EmployerBorrow";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute default
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      retry: 1, // Single retry for faster failure
    },
  },
});

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
              <Route path="/for-talanger" element={<ForTalanger />} />
              <Route path="/for-arbetsgivare" element={<ForArbetsgivare />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/login" element={<Auth />} />
              <Route path="/auth/signup" element={<Auth />} />
              
              {/* Admin */}
              <Route path="/admin/health" element={<AdminHealth />} />

              {/* Talent */}
              <Route path="/talent/dashboard" element={<ProtectedRoute><RoleGate allow={["talent"]}><TalentDashboard /></RoleGate></ProtectedRoute>} />
              <Route path="/talent/profile" element={<ProtectedRoute><RoleGate allow={["talent"]}><TalentProfile /></RoleGate></ProtectedRoute>} />
              <Route path="/talent/swipe-jobs" element={<ProtectedRoute><RoleGate allow={["talent"]}><TalentSwipeJobs /></RoleGate></ProtectedRoute>} />
              <Route path="/talent/matches" element={<ProtectedRoute><RoleGate allow={["talent"]}><TalentMatches /></RoleGate></ProtectedRoute>} />
              <Route path="/talent/matches/:matchId" element={<ProtectedRoute><RoleGate allow={["talent"]}><TalentMatchChat /></RoleGate></ProtectedRoute>} />

              {/* Employer */}
              <Route path="/employer/dashboard" element={<ProtectedRoute><RoleGate allow={["employer"]}><EmployerDashboard /></RoleGate></ProtectedRoute>} />
              <Route path="/employer/jobs" element={<ProtectedRoute><RoleGate allow={["employer"]}><EmployerJobs /></RoleGate></ProtectedRoute>} />
              <Route path="/employer/swipe-talent/:jobId" element={<ProtectedRoute><RoleGate allow={["employer"]}><EmployerSwipeTalent /></RoleGate></ProtectedRoute>} />
              <Route path="/employer/matches" element={<ProtectedRoute><RoleGate allow={["employer"]}><EmployerMatches /></RoleGate></ProtectedRoute>} />
              <Route path="/employer/matches/:matchId" element={<ProtectedRoute><RoleGate allow={["employer"]}><TalentMatchChat /></RoleGate></ProtectedRoute>} />
              <Route path="/employer/scheduler" element={<ProtectedRoute><RoleGate allow={["employer"]}><EmployerScheduler /></RoleGate></ProtectedRoute>} />
              <Route path="/employer/borrow" element={<ProtectedRoute><RoleGate allow={["employer"]}><EmployerBorrow /></RoleGate></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
