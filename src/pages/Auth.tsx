import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { Mail, Lock, User, Briefcase, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Shield } from "lucide-react";

export const Auth: React.FC = () => {
  const { page, navigate } = useApp();
  const [isLogin, setIsLogin] = useState(page === "login");
  const [isReset, setIsReset] = useState(page === "forgot-password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("User");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("");

  // Options loaded from Firestore
  const [roles, setRoles] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sync state with Context page value
  useEffect(() => {
    setIsLogin(page === "login");
    setIsReset(page === "forgot-password");
    setError("");
    setSuccess("");
  }, [page]);

  // Fetch Roles and Orgs on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Roles
        const rolesSnap = await getDocs(collection(db, "roles"));
        const rolesList: string[] = [];
        rolesSnap.forEach(doc => {
          rolesList.push(doc.data().roleName || doc.id);
        });
        setRoles(rolesList.length ? rolesList : ["User", "Admin"]);

        // Fetch Orgs
        const orgsSnap = await getDocs(collection(db, "organizations"));
        const orgsList: any[] = [];
        orgsSnap.forEach(doc => {
          orgsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setOrganizations(orgsList);
      } catch (e) {
        console.error("Error loading dropdown data, using fallbacks:", e);
        setRoles(["User", "Admin"]);
        setOrganizations([
          { id: "Caritas Nigeria", organizationName: "Caritas Nigeria" },
          { id: "CCFN", organizationName: "CCFN" },
          { id: "IHVN", organizationName: "IHVN" }
        ]);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch States when Org changes
  useEffect(() => {
    if (!selectedOrg) {
      setStates([]);
      setSelectedState("");
      return;
    }
    const fetchStates = async () => {
      try {
        const statesSnap = await getDocs(collection(db, "organizations", selectedOrg, "Facilities"));
        const statesList: string[] = [];
        statesSnap.forEach(doc => {
          statesList.push(doc.id);
        });
        setStates(statesList);
      } catch (e) {
        console.error("Error fetching states:", e);
        setStates(["FCT", "Enugu"]); // fallback
      }
    };
    fetchStates();
  }, [selectedOrg]);

  // Fetch Facilities when State changes
  useEffect(() => {
    if (!selectedState || !selectedOrg) {
      setFacilities([]);
      setSelectedFacility("");
      return;
    }
    const fetchFacilities = async () => {
      try {
        const facSnap = await getDocs(collection(db, "organizations", selectedOrg, "Facilities", selectedState, selectedState));
        const facList: any[] = [];
        facSnap.forEach(doc => {
          facList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setFacilities(facList);
      } catch (e) {
        console.error("Error fetching facilities:", e);
        setFacilities([
          { id: "fallback-1", facilityName: "Asokoro District Hospital" },
          { id: "fallback-2", facilityName: "Garki Hospital" }
        ]);
      }
    };
    fetchFacilities();
  }, [selectedState, selectedOrg]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !selectedOrg || !selectedState || !selectedFacility) {
      setError("All fields are required for signup.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Create Auth User
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Save Profile to Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        email: email.trim(),
        firstName,
        lastName,
        organizationName: selectedOrg,
        state: selectedState,
        facilityName: selectedFacility,
        role: role
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("Reset instructions sent to your email!");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-wine-950 via-[#2D0B10] to-[#140003] px-4 py-12 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-wine-800/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-rosegold-500/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg glass-panel p-8 rounded-3xl shadow-2xl relative z-10 border border-white/10 transition-all duration-300">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-rosegold-500 to-wine-800 text-white mb-3 shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-wide">e-SIMS Portal</h2>
          <p className="text-xs text-rosegold-200 mt-1 font-medium tracking-wider uppercase">PEPFAR Site Improvement Monitoring System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm flex gap-3 items-center">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-950/40 border border-green-500/30 text-green-200 text-sm flex gap-3 items-center">
            <CheckCircle className="w-5 h-5 shrink-0 text-green-400" />
            <span>{success}</span>
          </div>
        )}

        {isReset ? (
          /* Forgot Password */
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@organization.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white placeholder-slate-400 focus:outline-none transition duration-200 text-sm"
                />
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-rosegold-600 to-wine-800 hover:from-rosegold-500 hover:to-wine-700 text-white font-bold rounded-xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Password Reset Email"}
            </button>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => navigate("login")}
                className="text-xs text-rosegold-200 hover:text-white font-semibold transition"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : isLogin ? (
          /* Login Page */
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@organization.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white placeholder-slate-400 focus:outline-none transition duration-200 text-sm"
                />
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => navigate("forgot-password")}
                  className="text-[11px] font-bold text-rosegold-200 hover:text-white transition"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white placeholder-slate-400 focus:outline-none transition duration-200 text-sm"
                />
                <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-rosegold-600 to-wine-800 hover:from-rosegold-500 hover:to-wine-700 text-white font-bold rounded-xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to eSIMS"}
            </button>

            <div className="text-center mt-6">
              <span className="text-xs text-slate-400">Don't have an account? </span>
              <button
                type="button"
                onClick={() => navigate("signup")}
                className="text-xs text-rosegold-300 hover:text-rosegold-200 font-bold transition"
              >
                Sign Up
              </button>
            </div>
          </form>
        ) : (
          /* Signup Page */
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">First Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white placeholder-slate-400 focus:outline-none transition duration-200 text-sm"
                  />
                  <User className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Last Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white placeholder-slate-400 focus:outline-none transition duration-200 text-sm"
                  />
                  <User className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="john.doe@caritas.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white placeholder-slate-400 focus:outline-none transition duration-200 text-sm"
                />
                <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white placeholder-slate-400 focus:outline-none transition duration-200 text-sm"
                />
                <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Custom Claims Role */}
            <div>
              <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Role Type</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white focus:outline-none transition duration-200 text-sm appearance-none select-custom"
                style={{ colorScheme: "dark" }}
              >
                {roles.map(r => (
                  <option key={r} value={r} className="bg-wine-950 text-white">{r}</option>
                ))}
              </select>
            </div>

            {/* Cascading Org Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Organization</label>
              <select
                required
                value={selectedOrg}
                onChange={e => setSelectedOrg(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white focus:outline-none transition duration-200 text-sm appearance-none"
                style={{ colorScheme: "dark" }}
              >
                <option value="" className="bg-wine-950 text-white">Select Organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id} className="bg-wine-950 text-white">
                    {org.organizationName || org.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Cascading State Dropdown */}
            {selectedOrg && (
              <div>
                <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">StateName</label>
                <select
                  required
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white focus:outline-none transition duration-200 text-sm appearance-none"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="" className="bg-wine-950 text-white">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state} className="bg-wine-950 text-white">{state}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Cascading Facility Dropdown */}
            {selectedState && (
              <div>
                <label className="block text-xs font-semibold text-rosegold-100 uppercase tracking-wider mb-2">Assigned Facility</label>
                <select
                  required
                  value={selectedFacility}
                  onChange={e => setSelectedFacility(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rosegold-500 text-white focus:outline-none transition duration-200 text-sm appearance-none"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="" className="bg-wine-950 text-white">Select Facility</option>
                  {facilities.map(fac => (
                    <option key={fac.id} value={fac.facilityName} className="bg-wine-950 text-white">
                      {fac.facilityName} ({fac.datimCode || fac.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-rosegold-600 to-wine-800 hover:from-rosegold-500 hover:to-wine-700 text-white font-bold rounded-xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </button>

            <div className="text-center mt-6">
              <span className="text-xs text-slate-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => navigate("login")}
                className="text-xs text-rosegold-300 hover:text-rosegold-200 font-bold transition"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
