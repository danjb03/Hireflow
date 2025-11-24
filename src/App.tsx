import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientLeads = lazy(() => import("./pages/ClientLeads"));
const ClientLeadDetail = lazy(() => import("./pages/ClientLeadDetail"));
const ClientCalendar = lazy(() => import("./pages/ClientCalendar"));
const ClientSettings = lazy(() => import("./pages/ClientSettings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminClients = lazy(() => import("./pages/AdminClients"));
const AdminInvite = lazy(() => import("./pages/AdminInvite"));
const AdminSubmitLead = lazy(() => import("./pages/AdminSubmitLead"));
const AdminAllLeads = lazy(() => import("./pages/AdminAllLeads"));
const AdminLeadDetail = lazy(() => import("./pages/AdminLeadDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
