import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { Bell, Send, Trash2, Calendar, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

export const NotificationsManager: React.FC = () => {
  const { profile } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Lists
  const [notifications, setNotifications] = useState<any[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"Broadcast" | "State" | "Facility" | "User" | "Partner">("Broadcast");
  const [targetValue, setTargetValue] = useState("");
  
  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Fuzzy matches organization names
  const isMatchOrg = (userOrgName: string, orgNameInDb: string): boolean => {
    if (!userOrgName || !orgNameInDb) return false;
    const normUser = userOrgName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normDb = orgNameInDb.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const match = normDb.includes(normUser) || normUser.includes(normDb);
    if (match) return true;

    const isUserCaritas = normUser.includes("caritas") || normUser.includes("ccfn");
    const isDbCaritas = normDb.includes("caritas") || normDb.includes("ccfn");
    if (isUserCaritas && isDbCaritas) return true;

    const isUserIhvn = normUser.includes("ihvn") || normUser.includes("virology");
    const isDbIhvn = normDb.includes("ihvn") || normDb.includes("virology");
    if (isUserIhvn && isDbIhvn) return true;

    const isUserApin = normUser.includes("apin") || normUser.includes("publichealth");
    const isDbApin = normDb.includes("apin") || normDb.includes("publichealth");
    if (isUserApin && isDbApin) return true;

    return false;
  };

  // Load target lists and active notifications
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load active notifications
      const notifSnap = await getDocs(collection(db, "admin_notifications"));
      const notifList: any[] = [];
      notifSnap.forEach(d => notifList.push({ id: d.id, ...d.data() }));
      // Sort by creation time desc
      notifList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifList);

      // 2. Load facilities & states
      const facSnap = await getDocs(collection(db, "facilities"));
      const facs: any[] = [];
      const states = new Set<string>();
      facSnap.forEach(d => {
        const data = d.data();
        facs.push({ id: d.id, ...data });
        if (data.stateName) states.add(data.stateName);
      });
      setFacilitiesList(facs);
      setStatesList(Array.from(states));

      // 3. Load users
      const userSnap = await getDocs(collection(db, "users"));
      const users: any[] = [];
      userSnap.forEach(d => {
        const data = d.data();
        if (data.email) users.push({ email: data.email, name: `${data.firstName || ""} ${data.lastName || ""}`.trim() });
      });
      setUsersList(users);

      // 4. Load partners/organizations
      const orgSnap = await getDocs(collection(db, "organizations"));
      const orgs: any[] = [];
      orgSnap.forEach(d => {
        orgs.push({ id: d.id, name: d.data().organizationName || d.id });
      });
      setPartnersList(orgs);

    } catch (err: any) {
      console.error(err);
      setError("Failed to load targets and existing notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Please fill out notification title and message.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const notifId = `NOTIF_${Date.now()}`;
      let scheduledAtStr = "";
      if (isScheduled && scheduledDate && scheduledTime) {
        scheduledAtStr = `${scheduledDate}T${scheduledTime}:00`;
      }

      await setDoc(doc(db, "admin_notifications", notifId), {
        id: notifId,
        title: title.trim(),
        message: message.trim(),
        type: targetType,
        targetValue: targetType === "Broadcast" ? "" : targetValue,
        createdAt: new Date().toISOString(),
        scheduledAt: scheduledAtStr
      });

      setSuccess("Notification successfully sent / scheduled!");
      setTitle("");
      setMessage("");
      setTargetType("Broadcast");
      setTargetValue("");
      setIsScheduled(false);
      setScheduledDate("");
      setScheduledTime("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to post notification.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "admin_notifications", id));
      setSuccess("Notification deleted.");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete notification.");
      setLoading(false);
    }
  };

  // Determine label mapping for targeted values
  const getTargetBadgeLabel = (item: any) => {
    if (item.type === "Broadcast") return "Broadcast (All)";
    return `${item.type}: ${item.targetValue}`;
  };

  return (
    <AdminLayout
      title="Notifications & Broadcasts"
      subtitle="Publish targeted system alerts and scheduled updates"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs flex gap-2 items-center shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-green-50 text-green-700 text-xs flex gap-2 items-center shadow-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column - Form Config (col-span-5) */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Send className="w-4.5 h-4.5 text-wine-800" />
              <span>Compose Message</span>
            </h3>

            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Scope targeting dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Target Audience</label>
                <select
                  value={targetType}
                  onChange={e => {
                    setTargetType(e.target.value as any);
                    setTargetValue("");
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition cursor-pointer"
                >
                  <option value="Broadcast">Broadcast (All Users)</option>
                  <option value="State">Target by State</option>
                  <option value="Facility">Target by Health Facility</option>
                  <option value="User">Target by Specific User</option>
                  {profile?.role === "Super Admin" && (
                    <option value="Partner">Target by Implementing Partner</option>
                  )}
                </select>
              </div>

              {/* Conditional scope selector input */}
              {targetType === "State" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Select State</label>
                  <select
                    required
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition cursor-pointer"
                  >
                    <option value="">Choose State</option>
                    {statesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "Facility" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Select Facility</label>
                  <select
                    required
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition cursor-pointer"
                  >
                    <option value="">Choose Facility</option>
                    {facilitiesList.map(f => (
                      <option key={f.id} value={f.facilityName}>{f.facilityName}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "User" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Select Assessor Email</label>
                  <select
                    required
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition cursor-pointer"
                  >
                    <option value="">Choose User Email</option>
                    {usersList.map(u => (
                      <option key={u.email} value={u.email}>{u.email} ({u.name})</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "Partner" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Select Implementing Partner</label>
                  <select
                    required
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition cursor-pointer"
                  >
                    <option value="">Choose Partner</option>
                    {partnersList.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title & Message inputs */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Alert Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Update: SIMS Guideline v4.2"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Message / Details</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type notification text..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition resize-none"
                />
              </div>

              {/* Delivery Scheduler controls */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={e => setIsScheduled(e.target.checked)}
                    className="rounded text-wine-800 focus:ring-wine-800 w-4 h-4 border-slate-300 cursor-pointer"
                  />
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Schedule Delivery (Future)</span>
                </label>

                {isScheduled && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={scheduledDate}
                        onChange={e => setScheduledDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isScheduled ? "Schedule Notification" : "Send Notification Now"}</span>
              </button>
            </form>
          </div>

          {/* Right Column - Messages Log (col-span-7) */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm max-h-[600px] overflow-y-auto space-y-3 bg-white">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Alert History & Delivery Status</h3>

            {notifications.length === 0 ? (
              <p className="text-slate-400 text-xs italic">No messages published yet.</p>
            ) : (
              notifications.map(notif => {
                const isScheduledFuture = notif.scheduledAt && new Date(notif.scheduledAt) > new Date();

                return (
                  <div
                    key={notif.id}
                    className={`p-4 bg-white border rounded-xl hover:shadow-sm transition flex justify-between items-start gap-4 ${
                      isScheduledFuture ? "border-amber-100 bg-amber-50/10" : "border-slate-100"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[9px] font-black text-wine-900 px-2 py-0.5 bg-wine-50 rounded border border-wine-100/50 uppercase tracking-wider shrink-0">
                          {getTargetBadgeLabel(notif)}
                        </span>
                        
                        {isScheduledFuture ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/30">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Scheduled for {new Date(notif.scheduledAt).toLocaleString()}</span>
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium">
                            Sent {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 truncate">{notif.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-normal whitespace-pre-wrap">{notif.message}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteNotification(notif.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-650 hover:bg-red-50 transition shrink-0 self-start"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
