import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";
import ClientDashboard from "./pages/ClientDashboard";
import ClientLeads from "./pages/ClientLeads";
import ClientLeadDetail from "./pages/ClientLeadDetail";
import ClientCalendar from "./pages/ClientCalendar";
import ClientSettings from "./pages/ClientSettings";
import ClientFeedback from "./pages/ClientFeedback";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClients from "./pages/AdminClients";
import AdminInvite from "./pages/AdminInvite";
import AdminSubmitLead from "./pages/AdminSubmitLead";
import AdminAllLeads from "./pages/AdminAllLeads";
import AdminLeadDetail from "./pages/AdminLeadDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/client/feedback" element={<ClientFeedback />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
