import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Loader2 } from "lucide-react";

// ------------------------------------------------------------------
// Full-screen loading splash (shown while Firebase resolves auth)
// ------------------------------------------------------------------
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-[#0F0508]">
    <div className="flex flex-col items-center gap-4 text-white">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl wine-gradient flex items-center justify-center shadow-2xl">
          <span className="text-xl font-black">S</span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-rosegold-500 rounded-full flex items-center justify-center">
          <Loader2 className="w-3 h-3 animate-spin text-white" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-bold tracking-wide">e-SIMS Portal</p>
        <p className="text-white/30 text-xs mt-0.5">Initializing secure session...</p>
      </div>
    </div>
  </div>
);

// ------------------------------------------------------------------
// ProtectedRoute – redirects unauthenticated visitors to /login
// Optionally restrict to a specific role ("Admin" | "User")
// ------------------------------------------------------------------
interface ProtectedRouteProps {
  requiredRole?: "Admin" | "User";
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { firebaseUser, profile, loading } = useApp();

  if (loading) return <LoadingScreen />;

  // Not logged in → send to login page
  if (!firebaseUser || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Role-restricted route and user doesn't have it
  if (requiredRole && profile.role !== requiredRole) {
    // Admin trying to access user-only route → send to admin home
    // User trying to access admin-only route → send to user home
    return <Navigate to={profile.role === "Admin" ? "/admin" : "/overview"} replace />;
  }

  return <Outlet />;
};

// ------------------------------------------------------------------
// PublicOnlyRoute – redirects already-logged-in users away from
// auth pages (login / signup / forgot-password)
// ------------------------------------------------------------------
export const PublicOnlyRoute: React.FC = () => {
  const { firebaseUser, profile, loading } = useApp();

  if (loading) return <LoadingScreen />;

  if (firebaseUser && profile) {
    return <Navigate to={profile.role === "Admin" ? "/admin" : "/overview"} replace />;
  }

  return <Outlet />;
};
