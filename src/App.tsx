import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";

// Pages
import { Auth }            from "./pages/Auth";
import { Overview }        from "./pages/Overview";
import { Activities }      from "./pages/Activities";
import { Assessment }      from "./pages/Assessment";
import { AdminDashboard }  from "./pages/AdminDashboard";
import { CreateActivity }  from "./pages/CreateActivity";
import { CeeManager }      from "./pages/CeeManager";
import { AdminSettings }   from "./pages/AdminSettings";
import { AdminProfile }    from "./pages/AdminProfile";
import { AdminActivities } from "./pages/AdminActivities";
import { SeederPage }      from "./pages/SeederPage";
import { NotificationsManager } from "./pages/NotificationsManager";

// ------------------------------------------------------------------
// IMPORTANT: BrowserRouter must wrap AppProvider so that
// useNavigate() inside AppProvider has access to the router context.
// ------------------------------------------------------------------
function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Public-only (logged-in users are bounced away) ── */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login"           element={<Auth />} />
            <Route path="/signup"          element={<Auth />} />
            <Route path="/forgot-password" element={<Auth />} />
          </Route>

          {/* Utility – accessible without login for first-time DB setup */}
          <Route path="/seeder" element={<SeederPage />} />

          {/* ── Protected – any authenticated user ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/overview"   element={<Overview />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/assessment" element={<Assessment />} />
          </Route>

          {/* ── Protected – Admin role only ── */}
          <Route element={<ProtectedRoute requiredRole="Admin" />}>
            <Route path="/admin"                 element={<AdminDashboard />} />
            <Route path="/admin/create-activity" element={<CreateActivity />} />
            <Route path="/admin/activities"      element={<AdminActivities />} />
            <Route path="/admin/cee-manager"     element={<CeeManager />} />
            <Route path="/admin/settings"        element={<AdminSettings />} />
            <Route path="/admin/profile"         element={<AdminProfile />} />
            <Route path="/admin/notifications"   element={<NotificationsManager />} />
            
            {/* Dashboard Sub-routes mapped to AdminDashboard */}
            <Route path="/admin/coverage/matrix" element={<AdminDashboard />} />
            <Route path="/admin/coverage/sets"     element={<AdminDashboard />} />
            <Route path="/admin/coverage/partners" element={<AdminDashboard />} />
            <Route path="/admin/analytics/grades"  element={<AdminDashboard />} />
            <Route path="/admin/analytics/sites"   element={<AdminDashboard />} />
            <Route path="/admin/analytics/states"  element={<AdminDashboard />} />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
