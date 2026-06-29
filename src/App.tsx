import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Auth } from "./pages/Auth";
import { Overview } from "./pages/Overview";
import { Activities } from "./pages/Activities";
import { Assessment } from "./pages/Assessment";
import { AdminDashboard } from "./pages/AdminDashboard";
import { CreateActivity } from "./pages/CreateActivity";
import { CeeManager } from "./pages/CeeManager";
import { Loader2 } from "lucide-react";

const AppContent: React.FC = () => {
  const { page, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="w-12 h-12 animate-spin text-rosegold-500" />
          <span className="text-sm font-semibold tracking-wider uppercase text-rosegold-200">Loading eSIMS Platform...</span>
        </div>
      </div>
    );
  }

  // Auth pages route
  if (page === "login" || page === "signup" || page === "forgot-password") {
    return <Auth />;
  }

  // Dashboard pages route
  switch (page) {
    case "overview":
      return <Overview />;
    case "activities":
      return <Activities />;
    case "assessment":
      return <Assessment />;
    case "admin-dashboard":
      return <AdminDashboard />;
    case "admin-create-activity":
      return <CreateActivity />;
    case "admin-cee-manager":
      return <CeeManager />;
    default:
      return <Auth />;
  }
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
