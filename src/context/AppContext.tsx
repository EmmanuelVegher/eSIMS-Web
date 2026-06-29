import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export type PageType =
  | "login"
  | "signup"
  | "forgot-password"
  | "overview"
  | "activities"
  | "assessment"
  | "admin-dashboard"
  | "admin-create-activity"
  | "admin-cee-manager";

interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  role: "User" | "Admin";
  state?: string;
  facilityName?: string;
}

interface AppContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  page: PageType;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [page, setPage] = useState<PageType>("login");
  const [loading, setLoading] = useState(true);
  const [activeActivity, setActiveActivityState] = useState<any | null>(null);
  const [activeCeeId, setActiveCeeIdState] = useState<string | null>(null);

  const navigate = (newPage: PageType) => {
    setPage(newPage);
  };

  const setActiveActivity = (activity: any | null) => {
    setActiveActivityState(activity);
  };

  const setActiveCeeId = (ceeId: string | null) => {
    setActiveCeeIdState(ceeId);
  };

  const fetchProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          uid,
          email: data.email || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          organizationName: data.organizationName || "",
          role: data.role || "User",
          state: data.state || "",
          facilityName: data.facilityName || "",
        });
        // Direct route based on roles
        if (data.role === "Admin") {
          setPage("admin-dashboard");
        } else {
          setPage("overview");
        }
      } else {
        setProfile(null);
        setPage("login");
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
      setPage("login");
    }
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      await fetchProfile(firebaseUser.uid);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setProfile(null);
      setFirebaseUser(null);
      setActiveActivityState(null);
      setActiveCeeIdState(null);
      setPage("login");
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
        setPage("login");
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
        page,
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
