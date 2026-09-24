import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import ServiceUnavailable from "@/pages/ServiceUnavailable";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthGate } from "./components/auth/AuthGate";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthPage from "./features/auth/AuthPage";
import AdminLogin from "./features/auth/AdminLogin";
import ForgotPassword from "./features/auth/ForgotPassword";
import ResetPassword from "./features/auth/ResetPassword";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Lesson from "./pages/Lesson";
import Parent from "./pages/Parent";
import Tutor from "./pages/Tutor";
import { AccountPage } from "./components/account/AccountPage";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <AuthPage initialMode="login" />
      </Route>
      <Route path="/signup">
        <AuthPage initialMode="signup" />
      </Route>
      <Route path="/admin/login">
        <AdminLogin />
      </Route>
      <Route path="/forgot-password">
        <ForgotPassword />
      </Route>
      <Route path="/reset-password">
        <ResetPassword />
      </Route>
      <Route path="/">
        <Landing />
      </Route>
      <Route path="/admin">
        <AuthGate requireAdmin>
          <Admin />
        </AuthGate>
      </Route>
      <Route path="/parent">
        <AuthGate>
          <Parent />
        </AuthGate>
      </Route>
      <Route path="/tutor">
        <AuthGate>
          <Tutor />
        </AuthGate>
      </Route>
      <Route path="/lesson">
        <AuthGate>
          <Lesson />
        </AuthGate>
      </Route>
      <Route path="/learn">
        <AuthGate>
          <Home />
        </AuthGate>
      </Route>
      <Route path="/profile">
        <AuthGate>
          <AccountPage initialTab="profile" />
        </AuthGate>
      </Route>
      <Route path="/settings">
        <AuthGate>
          <AccountPage initialTab="settings" />
        </AuthGate>
      </Route>
      <Route path="/404">
        <NotFound />
      </Route>
      <Route path="/503">
        <ServiceUnavailable />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="bottom-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;