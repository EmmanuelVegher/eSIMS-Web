import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { useLocation, useNavigate as useRouterNavigate } from "react-router-dom";
import {
  Mail, Lock, User, Eye, EyeOff, Loader2,
  AlertCircle, CheckCircle, Shield, ChevronRight,
  Database, Globe, Activity, ArrowRight
} from "lucide-react";

// ── Input Field Component ──
const Field = ({
  label, icon: Icon, type = "text", value, onChange, placeholder, rightEl, required = true
}: {
  label: string; icon: any; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; rightEl?: React.ReactNode; required?: boolean;
}) => (
  <div>
    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25
          focus:outline-none focus:border-rosegold-400/70 focus:bg-white/8 transition-all duration-200"
        style={{ colorScheme: "dark" }}
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) => (
  <div>
    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">{label}</label>
    <select
      required
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm
        focus:outline-none focus:border-rosegold-400/70 transition-all duration-200 appearance-none"
      style={{ colorScheme: "dark" }}
    >
      {children}
    </select>
  </div>
);

export const Auth: React.FC = () => {
  const location = useLocation();
  const routerNav = useRouterNavigate();
  // Derive form mode from URL path (no context needed)
  const isLogin = location.pathname === "/login" || location.pathname === "/";
  const isReset = location.pathname === "/forgot-password";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("User");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("");

  const [roles, setRoles] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Clear feedback when path changes
  useEffect(() => {
    setError("");
    setSuccess("");
  }, [location.pathname]);

  // Load flat facilities once
  const [allFacilities, setAllFacilities] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const rolesSnap = await getDocs(collection(db, "roles"));
        const rolesList: string[] = [];
        rolesSnap.forEach(d => rolesList.push(d.data().roleName || d.id));
        setRoles(rolesList.length ? rolesList : ["User", "Admin"]);

        const snap = await getDocs(collection(db, "facilities"));
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length === 0) {
          list.push(
            { id: "FCT_ADH_01", facilityName: "Asokoro District Hospital", stateName: "FCT", organizationName: "Caritas Nigeria", datimCode: "FCT_ADH_01" },
            { id: "FCT_GH_02", facilityName: "Garki Hospital", stateName: "FCT", organizationName: "Caritas Nigeria", datimCode: "FCT_GH_02" },
            { id: "EN_UNTH_01", facilityName: "UNTH Enugu", stateName: "Enugu", organizationName: "Caritas Nigeria", datimCode: "EN_UNTH_01" },
            { id: "EN_MCH_02", facilityName: "Mother of Christ Hospital", stateName: "Enugu", organizationName: "CCFN", datimCode: "EN_MCH_02" }
          );
        }
        setAllFacilities(list);
      } catch {
        setRoles(["User", "Admin"]);
        setAllFacilities([
          { id: "FCT_ADH_01", facilityName: "Asokoro District Hospital", stateName: "FCT", organizationName: "Caritas Nigeria", datimCode: "FCT_ADH_01" },
          { id: "FCT_GH_02", facilityName: "Garki Hospital", stateName: "FCT", organizationName: "Caritas Nigeria", datimCode: "FCT_GH_02" },
          { id: "EN_UNTH_01", facilityName: "UNTH Enugu", stateName: "Enugu", organizationName: "Caritas Nigeria", datimCode: "EN_UNTH_01" },
          { id: "EN_MCH_02", facilityName: "Mother of Christ Hospital", stateName: "Enugu", organizationName: "CCFN", datimCode: "EN_MCH_02" }
        ]);
      }
    };
    fetchInitialData();
  }, []);

  // Compute lists in-memory
  const organizations = Array.from(new Set(allFacilities.map(f => f.organizationName)))
    .map(name => ({ id: name, organizationName: name }));

  const states = Array.from(
    new Set(
      allFacilities
        .filter(f => f.organizationName === selectedOrg)
        .map(f => f.stateName)
    )
  );

  const facilities = allFacilities.filter(
    f => f.organizationName === selectedOrg && f.stateName === selectedState
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setError(err.code === "auth/invalid-credential" ? "Invalid email or password." : err.message || "Sign in failed.");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !selectedOrg || !selectedFacility) {
      setError("All fields are required."); return;
    }
    setLoading(true); setError("");
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid, email: email.trim(),
        firstName, lastName, organization: selectedOrg, organizationName: selectedOrg,
        state: selectedState, facilityName: selectedFacility, role
      });
    } catch (err: any) {
      setError(err.code === "auth/email-already-in-use" ? "Email is already registered." : err.message || "Account creation failed.");
    } finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Enter your email address."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("Check your inbox — reset instructions sent!");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally { setLoading(false); }
  };

  // Helpers defined outside of render scope to prevent input focus loss on keystroke

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* ── LEFT BRAND PANEL ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col relative overflow-hidden auth-bg">
        {/* Decorative orbs */}
        <div className="absolute top-[-15%] right-[-20%] w-[70%] h-[70%] rounded-full bg-wine-600/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rosegold-500/10 blur-[80px] pointer-events-none" />

        {/* Logo & Title */}
        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          <div className="flex items-center gap-3 mb-auto">
            <img src="/simsicon2.png" className="w-10 h-10 object-contain rounded-xl shadow-md" alt="e-SIMS Logo" />
            <div>
              <span className="text-white font-bold text-xl tracking-tight">e-SIMS</span>
              <span className="text-white/40 text-xs block -mt-0.5 tracking-widest uppercase">Portal</span>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] mb-4">
                PEPFAR<br />
                <span className="text-rosegold-300">Site Improvement</span><br />
                Monitoring
              </h1>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                A comprehensive platform for PEPFAR-funded implementing partners to conduct, track, and report site assessment outcomes across Nigeria.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-col gap-3">
              {[
                { icon: Activity, label: "121 Critical Elements of Evidence", color: "text-rosegold-300" },
                { icon: Globe, label: "Multi-state Facility Management", color: "text-blue-300" },
                { icon: Database, label: "Real-time Firestore Sync", color: "text-emerald-300" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3 text-sm text-white/60">
                  <div className={`p-1.5 rounded-lg bg-white/5 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-8">
            <p className="text-white/20 text-xs">
              © 2026 PEPFAR Nigeria • Confidential System
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-[#0F0508] relative overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <img src="/simsicon2.png" className="w-8 h-8 object-contain rounded-lg shadow" alt="e-SIMS Logo" />
          <span className="text-white font-bold text-lg">e-SIMS Portal</span>
        </div>

        <div className="w-full max-w-sm animate-slide-in-up">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white mb-1">
              {isReset ? "Reset Password" : isLogin ? "Welcome back" : "Create Account"}
            </h2>
            <p className="text-white/40 text-sm">
              {isReset ? "Enter your email and we'll send a reset link." :
               isLogin ? "Sign in to access your assessments." :
               "Register your assessor profile below."}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-300 text-xs leading-snug">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 text-xs leading-snug">{success}</span>
            </div>
          )}

          {/* ── RESET FORM ── */}
          {isReset && (
            <form onSubmit={handleReset} className="space-y-4">
              <Field label="Email Address" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="name@organization.org" />
              <button type="submit" disabled={loading} className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white
                bg-gradient-to-r from-rosegold-600 to-wine-800 hover:opacity-90 transition disabled:opacity-50
                flex items-center justify-center gap-2 shadow-lg shadow-wine-900/30">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => routerNav("/login")}
                className="w-full text-center text-xs text-white/30 hover:text-white/60 transition mt-2">
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* ── LOGIN FORM ── */}
          {!isReset && isLogin && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email Address" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="name@organization.org" />
              <Field
                label="Password" icon={Lock} type={showPassword ? "text" : "password"}
                value={password} onChange={setPassword} placeholder="••••••••"
                rightEl={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white/70 transition">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <div className="text-right -mt-2">
                <button type="button" onClick={() => routerNav("/forgot-password")}
                  className="text-[11px] text-rosegold-400 hover:text-rosegold-300 font-semibold transition">
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm text-white
                bg-gradient-to-r from-rosegold-600 to-wine-800 hover:opacity-90 transition disabled:opacity-50
                flex items-center justify-center gap-2 shadow-lg shadow-wine-900/30 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-white/20 text-xs">or</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <p className="text-center text-xs text-white/30">
                New assessor?{" "}
                <button type="button" onClick={() => routerNav("/signup")} className="text-rosegold-400 hover:text-rosegold-300 font-semibold transition">
                  Create Account <ChevronRight className="inline w-3 h-3" />
                </button>
              </p>

              <button type="button" onClick={() => routerNav("/seeder")}
                className="w-full mt-2 py-2 rounded-lg border border-white/8 text-white/20 text-xs hover:text-white/50 hover:border-white/20 transition flex items-center justify-center gap-2">
                <Database className="w-3.5 h-3.5" />
                First-time setup? Seed the database
              </button>
            </form>
          )}

          {/* ── SIGNUP FORM ── */}
          {!isReset && !isLogin && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" icon={User} value={firstName} onChange={setFirstName} placeholder="John" />
                <Field label="Last Name" icon={User} value={lastName} onChange={setLastName} placeholder="Doe" />
              </div>
              <Field label="Email Address" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="john.doe@caritas.org" />
              <Field
                label="Password" icon={Lock} type={showPassword ? "text" : "password"}
                value={password} onChange={setPassword} placeholder="Min 6 characters"
                rightEl={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white/70 transition">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <SelectField label="Role Type" value={role} onChange={setRole}>
                {roles.map(r => <option key={r} value={r} className="bg-[#1a0508]">{r}</option>)}
              </SelectField>

              <SelectField label="Implementing Organization" value={selectedOrg} onChange={setSelectedOrg}>
                <option value="" className="bg-[#1a0508]">Select Organization</option>
                {organizations.map(o => <option key={o.id} value={o.id} className="bg-[#1a0508]">{o.organizationName || o.id}</option>)}
              </SelectField>

              {selectedOrg && (
                <SelectField label="State" value={selectedState} onChange={setSelectedState}>
                  <option value="" className="bg-[#1a0508]">Select State</option>
                  {states.map(s => <option key={s} value={s} className="bg-[#1a0508]">{s}</option>)}
                </SelectField>
              )}

              {selectedState && (
                <SelectField label="Assigned Facility" value={selectedFacility} onChange={v => setSelectedFacility(v)}>
                  <option value="" className="bg-[#1a0508]">Select Facility</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.facilityName} className="bg-[#1a0508]">
                      {f.facilityName} {f.datimCode ? `(${f.datimCode})` : ""}
                    </option>
                  ))}
                </SelectField>
              )}

              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm text-white
                bg-gradient-to-r from-rosegold-600 to-wine-800 hover:opacity-90 transition disabled:opacity-50
                flex items-center justify-center gap-2 shadow-lg shadow-wine-900/30 mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-center text-xs text-white/30 mt-2">
                Already registered?{" "}
                <button type="button" onClick={() => routerNav("/login")} className="text-rosegold-400 hover:text-rosegold-300 font-semibold transition">
                  Sign In
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
