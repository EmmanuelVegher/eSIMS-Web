import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { auth, db } from "../firebase";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
} from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AdminLayout } from "../components/AdminLayout";
import { Avatar } from "../components/AdminLayout";
import {
  User,
  Mail,
  Lock,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Building2,
  MapPin,
  Phone,
  Save,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

// ─── Small field wrapper ──────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rightEl?: React.ReactNode;
}> = ({ label, icon: Icon, type = "text", value, onChange, placeholder, disabled, rightEl }) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800
          focus:outline-none focus:border-wine-600 transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export const AdminProfile: React.FC = () => {
  const { profile, firebaseUser, refreshProfile } = useApp();

  // ── Profile form state ──
  const [firstName, setFirstName]   = useState(profile?.firstName  ?? "");
  const [lastName,  setLastName]    = useState(profile?.lastName   ?? "");
  const [phone,     setPhone]       = useState("");
  const [orgName,   setOrgName]     = useState(profile?.organizationName ?? "");
  const [stateName, setStateName]   = useState(profile?.state ?? "");

  // ── Password change state ──
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);

  // ── Photo upload ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.photoURL ?? null);
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Feedback ──
  const [profileStatus, setProfileStatus] = useState<{ type: "ok"|"err"; msg: string } | null>(null);
  const [pwdStatus,     setPwdStatus]     = useState<{ type: "ok"|"err"; msg: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdLoading,     setPwdLoading]     = useState(false);

  // Keep form in sync if profile changes (e.g. after refresh)
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName   ?? "");
      setOrgName(profile.organizationName ?? "");
      setStateName(profile.state ?? "");
      setPhotoPreview(profile.photoURL ?? null);
    }
  }, [profile]);

  // Fetch phone from Firestore (not in UserProfile currently)
  useEffect(() => {
    const fetchExtra = async () => {
      if (!firebaseUser) return;
      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) setPhone(snap.data().phoneNumber ?? "");
      } catch {}
    };
    fetchExtra();
  }, [firebaseUser]);

  // ── Photo selection preview ──
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Upload photo to Firebase Storage ──
  const handleUploadPhoto = async () => {
    if (!photoFile || !firebaseUser) return;
    setUploadingPhoto(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profile_photos/${firebaseUser.uid}`);
      await uploadBytes(storageRef, photoFile);
      const url = await getDownloadURL(storageRef);
      await updateProfile(firebaseUser, { photoURL: url });
      await updateDoc(doc(db, "users", firebaseUser.uid), { photoURL: url });
      setPhotoPreview(url);
      setPhotoFile(null);
      await refreshProfile();
      setProfileStatus({ type: "ok", msg: "Profile photo updated!" });
    } catch (err: any) {
      setProfileStatus({ type: "err", msg: err.message || "Failed to upload photo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Save profile info ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      // Update Firebase Auth displayName
      await updateProfile(firebaseUser, {
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });
      // Update Firestore user document
      await updateDoc(doc(db, "users", firebaseUser.uid), {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phoneNumber: phone.trim(),
        organization: orgName.trim(),
        organizationName: orgName.trim(),
        state: stateName.trim(),
      });
      await refreshProfile();
      setProfileStatus({ type: "ok", msg: "Profile updated successfully!" });
    } catch (err: any) {
      setProfileStatus({ type: "err", msg: err.message || "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Change password ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.email) return;
    if (newPwd !== confirmPwd) {
      setPwdStatus({ type: "err", msg: "New passwords do not match." });
      return;
    }
    if (newPwd.length < 6) {
      setPwdStatus({ type: "err", msg: "Password must be at least 6 characters." });
      return;
    }
    setPwdLoading(true);
    setPwdStatus(null);
    try {
      // Re-authenticate before sensitive operation
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPwd);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPwd);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setPwdStatus({ type: "ok", msg: "Password changed successfully!" });
    } catch (err: any) {
      const msg =
        err.code === "auth/wrong-password" ? "Current password is incorrect." :
        err.code === "auth/too-many-requests" ? "Too many attempts. Try again later." :
        err.message || "Failed to change password.";
      setPwdStatus({ type: "err", msg });
    } finally {
      setPwdLoading(false);
    }
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;

  return (
    <AdminLayout title="My Profile" subtitle="Account Settings">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── PROFILE CARD ── */}
        <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">

          {/* Cover banner */}
          <div className="h-28 wine-gradient relative">
            <div className="absolute inset-0 bg-[url('/simsicon2.png')] bg-center bg-cover opacity-5" />
          </div>

          {/* Avatar + name row */}
          <div className="px-8 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 mb-6">
              {/* Photo circle with upload overlay */}
              <div className="relative shrink-0">
                <Avatar
                  photoURL={photoPreview}
                  initials={initials || "A"}
                  size="lg"
                  className="!w-20 !h-20 ring-4 ring-white shadow-xl"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-wine-800 hover:bg-wine-700 flex items-center justify-center shadow-lg transition"
                  title="Change photo"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <div className="flex-1 pt-12 sm:pt-0">
                <h2 className="text-xl font-bold text-slate-800">{firstName} {lastName}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Shield className="w-3.5 h-3.5 text-wine-700" />
                  <span className="text-xs font-bold text-wine-800 uppercase tracking-wider">{profile?.role}</span>
                </div>
              </div>

              {/* Upload button – only shown when a new photo is staged */}
              {photoFile && (
                <button
                  onClick={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  className="shrink-0 px-4 py-2 rounded-xl bg-wine-800 hover:bg-wine-700 text-white text-xs font-bold flex items-center gap-2 transition disabled:opacity-60"
                >
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploadingPhoto ? "Uploading…" : "Save Photo"}
                </button>
              )}
            </div>

            {/* Profile status alert */}
            {profileStatus && (
              <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
                profileStatus.type === "ok"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-red-50 text-red-700 border border-red-200/60"
              }`}>
                {profileStatus.type === "ok"
                  ? <CheckCircle className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                {profileStatus.msg}
              </div>
            )}

            {/* ── Profile Edit Form ── */}
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" icon={User}       value={firstName}  onChange={setFirstName}  placeholder="John" />
                <Field label="Last Name"  icon={User}       value={lastName}   onChange={setLastName}   placeholder="Doe" />
                <Field label="Phone Number" icon={Phone}    value={phone}      onChange={setPhone}      placeholder="+234 800 000 0000" />
                <Field label="Email Address" icon={Mail}    value={profile?.email ?? ""} onChange={() => {}} disabled
                  rightEl={
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">locked</span>
                  }
                />
                <Field label="Organization" icon={Building2} value={orgName}   onChange={setOrgName}   placeholder="Organization name" />
                <Field label="State"        icon={MapPin}    value={stateName}  onChange={setStateName}  placeholder="e.g. Imo" />
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="mt-2 px-6 py-2.5 rounded-xl bg-wine-800 hover:bg-wine-700 text-white text-sm font-bold flex items-center gap-2 transition disabled:opacity-60 shadow-md"
              >
                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {profileLoading ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>

        {/* ── CHANGE PASSWORD CARD ── */}
        <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-md p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-wine-50">
              <KeyRound className="w-5 h-5 text-wine-800" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Change Password</h3>
              <p className="text-xs text-slate-400 mt-0.5">You must enter your current password to make changes</p>
            </div>
          </div>

          {pwdStatus && (
            <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
              pwdStatus.type === "ok"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-red-50 text-red-700 border border-red-200/60"
            }`}>
              {pwdStatus.type === "ok"
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {pwdStatus.msg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Field
              label="Current Password" icon={Lock}
              type={showCurrent ? "text" : "password"}
              value={currentPwd} onChange={setCurrentPwd}
              placeholder="Enter current password"
              rightEl={
                <button type="button" onClick={() => setShowCurrent(s => !s)} className="text-slate-400 hover:text-slate-600 transition">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="New Password" icon={Lock}
                type={showNew ? "text" : "password"}
                value={newPwd} onChange={setNewPwd}
                placeholder="Min 6 characters"
                rightEl={
                  <button type="button" onClick={() => setShowNew(s => !s)} className="text-slate-400 hover:text-slate-600 transition">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <Field
                label="Confirm New Password" icon={Lock}
                type="password"
                value={confirmPwd} onChange={setConfirmPwd}
                placeholder="Repeat new password"
              />
            </div>

            {/* Strength indicator */}
            {newPwd.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                      newPwd.length >= i * 3
                        ? i <= 1 ? "bg-red-400"
                          : i <= 2 ? "bg-amber-400"
                          : i <= 3 ? "bg-blue-400"
                          : "bg-emerald-500"
                        : "bg-slate-200"
                    }`} />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  {newPwd.length < 4 ? "Weak" : newPwd.length < 7 ? "Fair" : newPwd.length < 10 ? "Good" : "Strong"} password
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
              className="px-6 py-2.5 rounded-xl bg-wine-800 hover:bg-wine-700 text-white text-sm font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-md"
            >
              {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {pwdLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

        {/* ── Account Info Card ── */}
        <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-md p-8">
          <h3 className="font-bold text-slate-800 text-base mb-5 pb-4 border-b border-slate-100 flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-wine-700" />
            Account Information
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {[
              { label: "User ID",       value: firebaseUser?.uid ?? "—" },
              { label: "Role",          value: profile?.role ?? "—" },
              { label: "Email Verified", value: firebaseUser?.emailVerified ? "✓ Verified" : "✗ Not verified" },
              { label: "Account Created", value: firebaseUser?.metadata.creationTime
                  ? new Date(firebaseUser.metadata.creationTime).toLocaleDateString("en-GB", { dateStyle: "medium" })
                  : "—" },
              { label: "Last Sign-In",  value: firebaseUser?.metadata.lastSignInTime
                  ? new Date(firebaseUser.metadata.lastSignInTime).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                  : "—" },
              { label: "Organization",  value: profile?.organizationName ?? "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</dt>
                <dd className="font-semibold text-slate-700 truncate">{value}</dd>
              </div>
            ))}
          </dl>

          {!firebaseUser?.emailVerified && (
            <button
              onClick={async () => {
                if (firebaseUser) {
                  await sendEmailVerification(firebaseUser);
                  setProfileStatus({ type: "ok", msg: "Verification email sent! Check your inbox." });
                }
              }}
              className="mt-5 px-4 py-2 rounded-xl border border-wine-200 text-wine-800 bg-wine-50 hover:bg-wine-100 text-xs font-bold transition flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Send Verification Email
            </button>
          )}
        </div>

      </div>
    </AdminLayout>
  );
};
