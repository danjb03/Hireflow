import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { lazyRetry } from "@/lib/lazyRetry";
import ResetPassword from "@/pages/ResetPassword";


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
const ClientOnboarding = lazyRetry(() => import("./pages/ClientOnboarding"), "ClientOnboarding");
const AdminDashboard = lazyRetry(() => import("./pages/AdminDashboard"), "AdminDashboard");
const AdminClients = lazyRetry(() => import("./pages/AdminClients"), "AdminClients");
const AdminClientDetail = lazyRetry(() => import("./pages/AdminClientDetail"), "AdminClientDetail");
const AdminInvite = lazyRetry(() => import("./pages/AdminInvite"), "AdminInvite");
const AdminSubmitLead = lazyRetry(() => import("./pages/AdminSubmitLead"), "AdminSubmitLead");
const SubmitLead = lazyRetry(() => import("./pages/SubmitLead"), "SubmitLead");
const AdminAllLeads = lazyRetry(() => import("./pages/AdminAllLeads"), "AdminAllLeads");
const AdminLeadDetail = lazyRetry(() => import("./pages/AdminLeadDetail"), "AdminLeadDetail");
const AdminSentiment = lazyRetry(() => import("./pages/AdminSentiment"), "AdminSentiment");
const AdminPnL = lazyRetry(() => import("./pages/AdminPnL"), "AdminPnL");
const AdminReporting = lazyRetry(() => import("./pages/AdminReporting"), "AdminReporting");
const RepReport = lazyRetry(() => import("./pages/RepReport"), "RepReport");
const NotFound = lazyRetry(() => import("./pages/NotFound"), "NotFound");

// Rep portal pages
const RepDashboard = lazyRetry(() => import("./pages/RepDashboard"), "RepDashboard");
const RepLeads = lazyRetry(() => import("./pages/RepLeads"), "RepLeads");
const RepReports = lazyRetry(() => import("./pages/RepReports"), "RepReports");
const RepSubmitLead = lazyRetry(() => import("./pages/RepSubmitLead"), "RepSubmitLead");
const RepSettings = lazyRetry(() => import("./pages/RepSettings"), "RepSettings");
const RepLeadDetail = lazyRetry(() => import("./pages/RepLeadDetail"), "RepLeadDetail");
const AdminInviteRep = lazyRetry(() => import("./pages/AdminInviteRep"), "AdminInviteRep");
const AdminEmailSettings = lazyRetry(() => import("./pages/AdminEmailSettings"), "AdminEmailSettings");
const AdminListBuilder = lazyRetry(() => import("./pages/AdminListBuilder"), "AdminListBuilder");
const AdminUsers = lazyRetry(() => import("./pages/AdminUsers"), "AdminUsers");
const AdminMarketplace = lazyRetry(() => import("./pages/AdminMarketplace"), "AdminMarketplace");
const Marketplace = lazyRetry(() => import("./pages/Marketplace"), "Marketplace");
const MarketplaceTerms = lazyRetry(() => import("./pages/MarketplaceTerms"), "MarketplaceTerms");

const App = () => (
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
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          {/* Legacy routes for backwards compatibility */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lead/:id" element={<LeadDetail />} />
          {/* New client portal routes */}
          <Route path="/onboarding" element={<ClientOnboarding />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/leads" element={<ClientLeads />} />
          <Route path="/client/leads/:id" element={<ClientLeadDetail />} />
          <Route path="/client/calendar" element={<ClientCalendar />} />
          <Route path="/client/settings" element={<ClientSettings />} />
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/clients/:clientId" element={<AdminClientDetail />} />
          <Route path="/admin/invite" element={<AdminInvite />} />
          <Route path="/admin/submit-lead" element={<AdminSubmitLead />} />
          <Route path="/admin/leads" element={<AdminAllLeads />} />
          <Route path="/admin/leads/:id" element={<AdminLeadDetail />} />
          <Route path="/admin/sentiment" element={<AdminSentiment />} />
          <Route path="/admin/pnl" element={<AdminPnL />} />
          <Route path="/admin/reporting" element={<AdminReporting />} />
          <Route path="/admin/invite-rep" element={<AdminInviteRep />} />
          <Route path="/admin/email-settings" element={<AdminEmailSettings />} />
          <Route path="/admin/list-builder" element={<AdminListBuilder />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/marketplace" element={<AdminMarketplace />} />
          {/* Rep portal routes */}
          <Route path="/rep/dashboard" element={<RepDashboard />} />
          <Route path="/rep/leads" element={<RepLeads />} />
          <Route path="/rep/leads/:id" element={<RepLeadDetail />} />
          <Route path="/rep/reports" element={<RepReports />} />
          <Route path="/rep/submit-lead" element={<RepSubmitLead />} />
          <Route path="/rep/settings" element={<RepSettings />} />
          {/* Public routes */}
          <Route path="/rep-report" element={<RepReport />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/terms" element={<MarketplaceTerms />} />
          {/* Authenticated routes */}
          <Route path="/submit-lead" element={<SubmitLead />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
