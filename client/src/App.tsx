import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthGate } from "./components/auth/AuthGate";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthPage from "./features/auth/AuthPage";
import AdminLogin from "./features/auth/AdminLogin";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Lesson from "./pages/Lesson";
import Parent from "./pages/Parent";
import Tutor from "./pages/Tutor";

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
      <Route path="/">
        <AuthGate>
          <Home />
        </AuthGate>
      </Route>
      <Route path="/404">
        <NotFound />
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