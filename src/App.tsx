import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { lazyRetry } from "@/lib/lazyRetry";

// Lazy load all pages with retry logic for better reliability
const Index = lazyRetry(() => import("./pages/Index"), "Index");
const Login = lazyRetry(() => import("./pages/Login"), "Login");
const Dashboard = lazyRetry(() => import("./pages/Dashboard"), "Dashboard");
const LeadDetail = lazyRetry(() => import("./pages/LeadDetail"), "LeadDetail");
const ClientDashboard = lazyRetry(() => import("./pages/ClientDashboard"), "ClientDashboard");
const ClientLeads = lazyRetry(() => import("./pages/ClientLeads"), "ClientLeads");
const ClientLeadDetail = lazyRetry(() => import("./pages/ClientLeadDetail"), "ClientLeadDetail");
const ClientCalendar = lazyRetry(() => import("./pages/ClientCalendar"), "ClientCalendar");
const ClientSettings = lazyRetry(() => import("./pages/ClientSettings"), "ClientSettings");
const AdminDashboard = lazyRetry(() => import("./pages/AdminDashboard"), "AdminDashboard");
const AdminClients = lazyRetry(() => import("./pages/AdminClients"), "AdminClients");
const AdminInvite = lazyRetry(() => import("./pages/AdminInvite"), "AdminInvite");
const AdminSubmitLead = lazyRetry(() => import("./pages/AdminSubmitLead"), "AdminSubmitLead");
const AdminAllLeads = lazyRetry(() => import("./pages/AdminAllLeads"), "AdminAllLeads");
const AdminLeadDetail = lazyRetry(() => import("./pages/AdminLeadDetail"), "AdminLeadDetail");
const NotFound = lazyRetry(() => import("./pages/NotFound"), "NotFound");

// Optimized QueryClient configuration for better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            {/* Legacy routes for backwards compatibility */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/lead/:id" element={<LeadDetail />} />
            {/* New client portal routes */}
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/leads" element={<ClientLeads />} />
            <Route path="/client/leads/:id" element={<ClientLeadDetail />} />
            <Route path="/client/calendar" element={<ClientCalendar />} />
            <Route path="/client/settings" element={<ClientSettings />} />
            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/clients" element={<AdminClients />} />
            <Route path="/admin/invite" element={<AdminInvite />} />
            <Route path="/admin/submit-lead" element={<AdminSubmitLead />} />
            <Route path="/admin/leads" element={<AdminAllLeads />} />
            <Route path="/admin/leads/:id" element={<AdminLeadDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
