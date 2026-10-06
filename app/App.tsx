import "./global.css";
import "@/i18n";

import { Suspense, lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store";
import { isClerkEnabled } from "@/lib/api";
import { isStaffSimulationsEnabled } from "@/utils/staffFeatureFlags";
import { eventSetupEditPath, isEventSetupSectionId } from "@/utils/eventSetupSections";
import ClerkRouterProvider from "@/components/auth/ClerkRouterProvider";
import I18nSync from "@/components/I18nSync";
import ThemePreferenceSync from "@/components/ThemePreferenceSync";
import ScrollToTop from "@/components/ScrollToTop";
import RegistrationPaymentReturnHandler from "@/components/events/registration/RegistrationPaymentReturnHandler";
import EventSubdomainHostRedirect from "@/components/events/EventSubdomainHostRedirect";
import StaffLayout from "@/components/layouts/StaffLayout";
import ThemeProvider from "@/components/ThemeProvider";
import AthleteLayout from "@/components/layouts/AthleteLayout";
import EventConsoleSectionGuard from "@/components/staff/event-console/EventConsoleSectionGuard";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AthleteLoginGate = lazy(() => import("./pages/auth/AthleteLoginGate"));
const StaffLogin = lazy(() => import("./pages/auth/StaffLogin"));
const OrganizerLogin = lazy(() => import("./pages/auth/OrganizerLogin"));
const AdminLogin = lazy(() => import("./pages/auth/AdminLogin"));
const SsoCallback = lazy(() => import("./pages/auth/SsoCallback"));
const StaffSiteEditor = lazy(() => import("./pages/staff/SiteEditor"));
const StaffOrganizerLegal = lazy(() => import("./pages/staff/OrganizerLegal"));
const AthleteDashboard = lazy(() => import("./pages/athlete/Dashboard"));
const AthleteRegistrations = lazy(
  () => import("./pages/athlete/Registrations"),
);
const AthleteEvents = lazy(() => import("./pages/athlete/Events"));
const AthleteResults = lazy(() => import("./pages/athlete/Results"));
const AthleteProfile = lazy(() => import("./pages/athlete/Profile"));
const CompleteProfile = lazy(() => import("./pages/athlete/CompleteProfile"));
const AthletePaymentMethods = lazy(
  () => import("./pages/athlete/PaymentMethods"),
);
const StaffDashboard = lazy(() => import("./pages/staff/Dashboard"));
const StaffAthletes = lazy(() => import("./pages/staff/Athletes"));
const StaffPeople = lazy(() => import("./pages/staff/People"));
const StaffPayments = lazy(() => import("./pages/staff/Payments"));
const StaffPayouts = lazy(() => import("./pages/staff/Payouts"));
const StaffEvents = lazy(() => import("./pages/staff/Events"));
const AdminCreateEvent = lazy(() => import("./pages/staff/AdminCreateEvent"));
const StaffEventEdit = lazy(() => import("./pages/staff/EventEdit"));
const StaffEventCreateWizard = lazy(
  () => import("./pages/staff/EventCreateWizard"),
);
const StaffEventHub = lazy(() => import("./pages/staff/EventHub"));
const StaffEventResults = lazy(() => import("./pages/staff/EventResults"));
const EventConsoleLayout = lazy(
  () => import("./components/staff/event-console/EventConsoleLayout"),
);
const EventConsoleDefaultRedirect = lazy(
  () =>
    import("./components/staff/event-console/EventConsoleDefaultRedirect"),
);
const EventConsoleCobros = lazy(
  () => import("./components/staff/event-console/EventConsoleCobros"),
);
const EventConsoleInsights = lazy(
  () => import("./components/staff/event-console/EventConsoleInsights"),
);
const EventConsoleComunicacion = lazy(
  () => import("./components/staff/event-console/EventConsoleComunicacion"),
);
const EventConsoleAdvanced = lazy(
  () => import("./components/staff/event-console/EventConsoleAdvanced"),
);
const StaffTeam = lazy(() => import("./pages/staff/Team"));
const StaffAnalytics = lazy(() => import("./pages/staff/Analytics"));
const StaffRegistrations = lazy(() => import("./pages/staff/Registrations"));
const StaffProfile = lazy(() => import("./pages/staff/Profile"));
const StaffMessaging = lazy(() => import("./pages/staff/Messaging"));
const EventsBrowse = lazy(() => import("./pages/events/EventsBrowse"));
const EventDetail = lazy(() => import("./pages/events/EventDetail"));
const SimulationEventPage = lazy(
  () => import("./pages/events/SimulationEventPage"),
);
const OrganizerStart = lazy(() => import("./pages/organizers/OrganizerStart"));
const OrganizerSignupWizard = lazy(
  () => import("./pages/organizers/OrganizerSignupWizard"),
);
const StaffOnboarding = lazy(() => import("./pages/staff/StaffOnboarding"));
const StaffSiteSettings = lazy(() => import("./pages/staff/StaffSiteSettings"));
const LegalDocumentPage = lazy(() => import("./pages/legal/LegalDocumentPage"));
const ContactPage = lazy(() => import("./pages/Contact"));
const HelpPage = lazy(() => import("./pages/Help"));
const AboutPage = lazy(() => import("./pages/About"));
const PublicSiteLayout = lazy(
  () => import("./components/layouts/PublicSiteLayout"),
);

const queryClient = new QueryClient();

function StaffEventSetupRedirect() {
  const { eventId } = useParams<{ eventId: string }>();
  return <Navigate to={`/staff/events/${eventId}/edit`} replace />;
}

function StaffEventSetupSectionRedirect() {
  const { eventId, section } = useParams<{ eventId: string; section: string }>();
  const id = Number(eventId);
  if (!Number.isFinite(id) || !section || !isEventSetupSectionId(section)) {
    return <Navigate to={`/staff/events/${eventId}/edit`} replace />;
  }
  return <Navigate to={eventSetupEditPath(id, section)} replace />;
}

function StaffSimulationsRedirect() {
  if (!isStaffSimulationsEnabled()) {
    return <Navigate to="/staff/events" replace />;
  }
  return <Navigate to="/staff/events?simulation=1" replace />;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function AppRoutes() {
  const routes = (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicSiteLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/events" element={<EventsBrowse />} />
            <Route
              path="/events/sim/:token"
              element={<SimulationEventPage />}
            />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route path="/organizers/start" element={<OrganizerStart />} />
            <Route
              path="/organizers/signup"
              element={<OrganizerSignupWizard />}
            />
            <Route path="/legal/:documentId" element={<LegalDocumentPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>

          <Route path="/login" element={<AthleteLoginGate />} />
          {/* Passwordless: legacy password-reset URLs redirect to OTP login */}
          <Route path="/login/reset" element={<Navigate to="/login" replace />} />
          <Route path="/organizers/login" element={<OrganizerLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/sso-callback" element={<Navigate to="/" replace />} />

          <Route path="/portal" element={<AthleteLayout />}>
            <Route path="complete-profile" element={<CompleteProfile />} />
            <Route index element={<AthleteDashboard />} />
            <Route path="registrations" element={<AthleteRegistrations />} />
            <Route path="events" element={<AthleteEvents />} />
            <Route path="results" element={<AthleteResults />} />
            <Route path="payment-methods" element={<AthletePaymentMethods />} />
            <Route path="profile" element={<AthleteProfile />} />
          </Route>

          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffDashboard />} />
            <Route path="athletes" element={<StaffAthletes />} />
            <Route path="people" element={<StaffPeople />} />
            <Route path="payments" element={<StaffPayments />} />
            <Route path="payouts" element={<StaffPayouts />} />
            <Route path="events" element={<StaffEvents />} />
            <Route
              path="simulations"
              element={<StaffSimulationsRedirect />}
            />
            <Route path="events/create" element={<AdminCreateEvent />} />
            <Route path="events/new" element={<StaffEventCreateWizard />} />
            <Route path="events/:eventId/onboarding" element={<StaffEventCreateWizard />} />
            <Route
              path="events/:eventId/setup"
              element={<StaffEventSetupRedirect />}
            />
            <Route
              path="events/:eventId/setup/:section"
              element={<StaffEventSetupSectionRedirect />}
            />
            <Route path="events/:eventId" element={<EventConsoleLayout />}>
              <Route index element={<EventConsoleDefaultRedirect />} />
              <Route
                path="overview"
                element={
                  <EventConsoleSectionGuard section="overview">
                    <StaffEventHub />
                  </EventConsoleSectionGuard>
                }
              />
              <Route
                path="ops"
                element={
                  <EventConsoleSectionGuard section="ops">
                    <StaffEventHub />
                  </EventConsoleSectionGuard>
                }
              />
              <Route
                path="edit"
                element={
                  <EventConsoleSectionGuard section="edit">
                    <StaffEventEdit />
                  </EventConsoleSectionGuard>
                }
              />
              <Route
                path="results"
                element={
                  <EventConsoleSectionGuard section="results">
                    <StaffEventResults />
                  </EventConsoleSectionGuard>
                }
              />
              <Route
                path="cobros"
                element={
                  <EventConsoleSectionGuard section="cobros">
                    <EventConsoleCobros />
                  </EventConsoleSectionGuard>
                }
              />
              <Route
                path="insights"
                element={
                  <EventConsoleSectionGuard section="insights">
                    <EventConsoleInsights />
                  </EventConsoleSectionGuard>
                }
              />
              <Route
                path="comunicacion"
                element={
                  <EventConsoleSectionGuard section="comunicacion">
                    <EventConsoleComunicacion />
                  </EventConsoleSectionGuard>
                }
              />
              <Route
                path="advanced"
                element={
                  <EventConsoleSectionGuard section="advanced">
                    <EventConsoleAdvanced />
                  </EventConsoleSectionGuard>
                }
              />
            </Route>
            <Route path="team" element={<StaffTeam />} />
            <Route path="registrations" element={<StaffRegistrations />} />
            <Route path="analytics" element={<StaffAnalytics />} />
            <Route path="profile" element={<StaffProfile />} />
            <Route path="settings" element={<StaffProfile />} />
            <Route path="messaging" element={<StaffMessaging />} />
            <Route path="onboarding" element={<StaffOnboarding />} />
            <Route path="site-settings" element={<StaffSiteSettings />} />
            <Route path="site" element={<StaffSiteEditor />} />
            <Route path="legal" element={<StaffOrganizerLegal />} />
          </Route>

          <Route path="/admin" element={<Navigate to="/staff" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );

  if (isClerkEnabled) {
    return (
      <BrowserRouter>
        <ThemePreferenceSync />
        <ScrollToTop />
        <ClerkRouterProvider>
          <RegistrationPaymentReturnHandler />
          <EventSubdomainHostRedirect />
          {routes}
        </ClerkRouterProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ThemePreferenceSync />
      <ScrollToTop />
      <RegistrationPaymentReturnHandler />
      <EventSubdomainHostRedirect />
      {routes}
    </BrowserRouter>
  );
}

const App = () => (
  <HelmetProvider>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <I18nSync />
            <AppRoutes />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  </HelmetProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
