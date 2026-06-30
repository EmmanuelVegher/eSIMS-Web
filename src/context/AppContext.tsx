import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type PageType =
  | "login"
  | "signup"
  | "forgot-password"
  | "seeder"
  | "overview"
  | "activities"
  | "assessment"
  | "admin-dashboard"
  | "admin-create-activity"
  | "admin-cee-manager"
  | "admin-settings";

// Map from logical page names → URL paths
const PAGE_PATHS: Record<PageType, string> = {
  "login":                 "/login",
  "signup":                "/signup",
  "forgot-password":       "/forgot-password",
  "seeder":                "/seeder",
  "overview":              "/overview",
  "activities":            "/activities",
  "assessment":            "/assessment",
  "admin-dashboard":       "/admin",
  "admin-create-activity": "/admin/create-activity",
  "admin-cee-manager":     "/admin/cee-manager",
  "admin-settings":        "/admin/settings",
};

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  role: "User" | "Admin";
  state?: string;
  facilityName?: string;
  photoURL?: string | null;
}

interface AppContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  activeActivity: any | null;
  activeCeeId: string | null;
  navigate: (newPage: PageType) => void;
  setActiveActivity: (activity: any | null) => void;
  setActiveCeeId: (ceeId: string | null) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ------------------------------------------------------------------
// AppProvider – MUST be rendered inside <BrowserRouter> (done in App.tsx)
// so that useNavigate() is available in the React tree.
// ------------------------------------------------------------------
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useNavigate is safe here because App.tsx wraps AppProvider inside BrowserRouter
  const routerNavigate = useNavigate();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [activeActivity, setActiveActivityState] = useState<any | null>(null);
  const [activeCeeId,    setActiveCeeIdState]    = useState<string | null>(null);

  // Thin wrapper so callers still use logical page names
  const navigate = (newPage: PageType) => routerNavigate(PAGE_PATHS[newPage]);

  const setActiveActivity = (activity: any | null) => setActiveActivityState(activity);
  const setActiveCeeId    = (ceeId: string | null) => setActiveCeeIdState(ceeId);

  const fetchProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          uid,
          email:            data.email            || "",
          firstName:        data.firstName         || "",
          lastName:         data.lastName          || "",
          organizationName: data.organization || data.organizationName || "",
          role:             data.role              || "User",
          state:            data.state             || "",
          facilityName:     data.facilityName      || "",
          // photoURL comes from Firebase Auth, not Firestore
          photoURL:         auth.currentUser?.photoURL ?? null,
        });
        if (data.role === "Admin") {
          routerNavigate("/admin");
        } else {
          routerNavigate("/overview");
        }
      } else {
        setProfile(null);
        routerNavigate("/login");
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
      routerNavigate("/login");
    }
  };

  const refreshProfile = async () => {
    if (firebaseUser) await fetchProfile(firebaseUser.uid);
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setProfile(null);
      setFirebaseUser(null);
      setActiveActivityState(null);
      setActiveCeeIdState(null);
      routerNavigate("/login");
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setProfile(null);
        const publicPaths = ["/login", "/signup", "/forgot-password", "/seeder"];
        if (!publicPaths.includes(window.location.pathname)) {
          routerNavigate("/login");
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        activeActivity,
        activeCeeId,
        navigate,
        setActiveActivity,
        setActiveCeeId,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
