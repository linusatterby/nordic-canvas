import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/delight/Toasts";

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
      <ToastProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Auth />} />
            <Route path="/auth/signup" element={<Auth />} />

            {/* Talent */}
            <Route path="/talent/dashboard" element={<TalentDashboard />} />
            <Route path="/talent/profile" element={<TalentProfile />} />
            <Route path="/talent/swipe-jobs" element={<TalentSwipeJobs />} />
            <Route path="/talent/matches" element={<TalentMatches />} />

            {/* Employer */}
            <Route path="/employer/dashboard" element={<EmployerDashboard />} />
            <Route path="/employer/scheduler" element={<EmployerScheduler />} />
            <Route path="/employer/jobs" element={<EmployerDashboard />} />
            <Route path="/employer/swipe-talent" element={<EmployerDashboard />} />
            <Route path="/employer/borrow" element={<EmployerDashboard />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
