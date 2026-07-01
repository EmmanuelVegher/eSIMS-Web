import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { Calendar, MapPin, Building2, ClipboardList, ChevronRight, Loader2, AlertCircle, Trash2, Filter } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

interface SimsActivity {
  id: string;
  startDate: string;
  proposedEndDate: string;
  states: string;
  organizations: string;
  facilities: string;
  status: string;
}

interface RefinedActivityTarget {
  id: string;
  startDate: string;
  proposedEndDate: string;
  states: string;
  organizations: string;
  facilities: string;
  computedStatus: "Active" | "Upcoming" | "Completed" | "Closed";
}

export const AdminActivities: React.FC = () => {
  const { profile, navigate, setActiveActivity } = useApp();
  
  const [targets, setTargets] = useState<RefinedActivityTarget[]>([]);
  const [flatFacilities, setFlatFacilities] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; completed: number; red: number; yellow: number; green: number; grey: number }>>({});
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "upcoming" | "completed" | "closed">("all");
  
  // Advanced filters
  const [selectedPartner, setSelectedPartner] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [partnersList, setPartnersList] = useState<string[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);

  const getNormalizedOrgNames = (orgId: string): string[] => {
    if (orgId === "Catholic Caritas Foundation of Nigeria (CCFN)" || orgId === "CCFN" || orgId === "Caritas Nigeria") {
      return ["Catholic Caritas Foundation of Nigeria (CCFN)", "CCFN", "Caritas Nigeria"];
    }
    if (orgId === "Institute of Human Virology, Nigeria (IHVN)" || orgId === "IHVN") {
      return ["Institute of Human Virology, Nigeria (IHVN)", "IHVN"];
    }
    if (orgId === "APIN Public Health Initiatives (APIN)" || orgId === "APIN") {
      return ["APIN Public Health Initiatives (APIN)", "APIN"];
    }
    return [orgId];
  };

  const loadAssessmentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch flat facilities to match metadata
      const facSnap = await getDocs(collection(db, "facilities"));
      const facList: any[] = [];
      facSnap.forEach(d => facList.push({ id: d.id, ...d.data() }));
      setFlatFacilities(facList);

      // 2. Fetch all scheduled activities
      const actSnap = await getDocs(collection(db, "sims_activities"));
      let rawActivities: SimsActivity[] = [];
      const partnersSet = new Set<string>();
      const statesSet = new Set<string>();

      actSnap.forEach(d => {
        const data = d.data() as any;
        rawActivities.push({
          id: d.id,
          startDate: data.startDate || "",
          proposedEndDate: data.proposedEndDate || "",
          states: data.states || "",
          organizations: data.organizations || "",
          facilities: data.facilities || "",
          status: data.status || ""
        });
      });

      // Apply Super Admin vs regular Admin visibility logic
      if (profile && profile.role !== "Super Admin" && profile.organizationName) {
        const userOrg = profile.organizationName;
        const allowedNames = getNormalizedOrgNames(userOrg);

        rawActivities = rawActivities.filter(act => {
          const actOrgs = act.organizations ? act.organizations.split(",").map(o => o.trim()) : [];
          return actOrgs.some(orgName => allowedNames.includes(orgName));
        });
      }

      rawActivities.forEach(act => {
        if (act.organizations) {
          act.organizations.split(",").forEach((o: string) => partnersSet.add(o.trim()));
        }
        if (act.states) {
          act.states.split(",").forEach((s: string) => statesSet.add(s.trim()));
        }
      });

      if (profile && profile.role !== "Super Admin" && profile.organizationName) {
        const allowedNames = getNormalizedOrgNames(profile.organizationName);
        const finalPartners = Array.from(partnersSet).filter(o => allowedNames.includes(o));
        setPartnersList(finalPartners.length > 0 ? finalPartners : [profile.organizationName]);
        setSelectedPartner(finalPartners.length > 0 ? finalPartners[0] : profile.organizationName);
      } else {
        setPartnersList(Array.from(partnersSet));
      }
      setStatesList(Array.from(statesSet));

      // 3. Process refined list (split activities containing multiple facilities)
      const now = new Date();
      const refinedList: RefinedActivityTarget[] = [];

      rawActivities.forEach(act => {
        const facNames = act.facilities ? act.facilities.split(",").map(f => f.trim()) : [];
        
        // Calculate status dynamically based on current time
        const start = new Date(act.startDate);
        const end = new Date(act.proposedEndDate);
        const closedLimit = new Date(end);
        closedLimit.setDate(closedLimit.getDate() + 15);

        let computedStatus: "Active" | "Upcoming" | "Completed" | "Closed" = "Active";
        if (now < start) {
          computedStatus = "Upcoming";
        } else if (now > closedLimit) {
          computedStatus = "Closed";
        } else if (now > end) {
          computedStatus = "Completed";
        } else {
          computedStatus = "Active";
        }

        facNames.forEach(facName => {
          if (!facName) return;

          // Lookup facility details to resolve exact state & partner
          const matchedFac = facList.find(f => f.facilityName.toLowerCase() === facName.toLowerCase());
          
          refinedList.push({
            id: act.id,
            startDate: act.startDate,
            proposedEndDate: act.proposedEndDate,
            organizations: matchedFac?.organizationName || act.organizations,
            states: matchedFac?.stateName || act.states,
            facilities: facName,
            computedStatus
          });
        });
      });

      setTargets(refinedList);

      // 4. Fetch flat question responses to aggregate progress/scores
      const respSnap = await getDocs(collection(db, "question_response"));
      const newStats: typeof stats = {};

      refinedList.forEach(target => {
        let completed = 0;
        let red = 0;
        let yellow = 0;
        let green = 0;
        let grey = 0;

        respSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (
            data.eSIMS_ID === target.id &&
            data.facilityName === target.facilities
          ) {
            completed++;
            const score = data.final_cee_score;
            if (score === 3) green++;
            else if (score === 2) yellow++;
            else if (score === 1) red++;
            else grey++;
          }
        });

        const totalCEEs = 38;

        newStats[`${target.id}_${target.facilities}`] = {
          total: totalCEEs,
          completed: completed > totalCEEs ? totalCEEs : completed,
          red,
          yellow,
          green,
          grey
        };
      });

      setStats(newStats);

    } catch (e) {
      console.error("Error loading admin assessment targets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadAssessmentData();
    }
  }, [profile]);

  const handleStart = (target: RefinedActivityTarget) => {
    setActiveActivity({
      id: target.id,
      startDate: target.startDate,
      proposedEndDate: target.proposedEndDate,
      organizations: target.organizations,
      states: target.states,
      facilities: target.facilities
    });
    navigate("assessment");
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm("Are you sure you want to delete this SIMS activity? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "sims_activities", activityId));
      loadAssessmentData();
    } catch (e) {
      console.error("Error deleting activity:", e);
      alert("Failed to delete activity.");
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Upcoming":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Closed":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Filter list by active tab and selected partner/state
  const filteredTargets = targets.filter(t => {
    const matchTab = activeTab === "all" || t.computedStatus.toLowerCase() === activeTab;
    const matchPartner = selectedPartner === "All" || t.organizations.split(",").map(o => o.trim()).includes(selectedPartner);
    const matchState = selectedState === "All" || t.states.split(",").map(s => s.trim()).includes(selectedState);
    return matchTab && matchPartner && matchState;
  });

  return (
    <AdminLayout title="All SIMS Activities" subtitle="Scheduled Targets">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Filters Section */}
        <section className="glass-panel p-6 rounded-3xl border border-slate-200/85 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-wine-50 text-wine-900 rounded-xl">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Filter Activities</h4>
              <p className="text-[10px] text-slate-400">Refine by Partner or State region</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:w-48">
              <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest">Implementing Partner</label>
              <select
                value={selectedPartner}
                onChange={e => setSelectedPartner(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-wine-800"
              >
                <option value="All">All Partners</option>
                {partnersList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:w-48">
              <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest">Target State</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-wine-800"
              >
                <option value="All">All States</option>
                {statesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Dynamic Category Tabs */}
        <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-1">
          {([ "all", "active", "upcoming", "completed", "closed" ] as const).map(tab => {
            const count = targets.filter(t => {
              const matchTab = tab === "all" || t.computedStatus.toLowerCase() === tab;
              const matchPartner = selectedPartner === "All" || t.organizations.split(",").map(o => o.trim()).includes(selectedPartner);
              const matchState = selectedState === "All" || t.states.split(",").map(s => s.trim()).includes(selectedState);
              return matchTab && matchPartner && matchState;
            }).length;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition shrink-0 ${
                  activeTab === tab
                    ? "border-b-2 border-wine-800 text-wine-800"
                    : "text-slate-450 hover:text-slate-650"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Targets List */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-wine-800 mb-2" />
            <span className="text-xs font-bold text-slate-455">Loading scheduled activities...</span>
          </div>
        ) : filteredTargets.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold text-sm">No scheduled activities found</p>
            <p className="text-xs text-slate-400 mt-1">Try scheduling a new SIMS activity or update filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTargets.map(target => {
              const key = `${target.id}_${target.facilities}`;
              const actStats = stats[key] || { total: 38, completed: 0, red: 0, yellow: 0, green: 0, grey: 0 };
              const percent = Math.round((actStats.completed / actStats.total) * 100);

              const formattedStart = new Date(target.startDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });
              const formattedEnd = new Date(target.proposedEndDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={key}
                  className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition duration-200 relative group overflow-hidden"
                >
                  <div className="space-y-3.5 flex-1 min-w-0">
                    {/* Facility and Status */}
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-tight truncate">
                        {target.facilities}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColorClass(target.computedStatus)}`}>
                        {target.computedStatus}
                      </span>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[200px]">{target.organizations}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{target.states} State</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedStart} — {formattedEnd}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-455">CEE Assessment Progress</span>
                        <span className="text-wine-800">{actStats.completed} / {actStats.total} CEEs ({percent}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                        <div
                          className="h-full bg-gradient-to-r from-wine-900 to-wine-600 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Grading Score Summary */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tally:</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Green: {actStats.green}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span>Yellow: {actStats.yellow}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Red: {actStats.red}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Gray: {actStats.grey}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions (Delete + Evaluate) */}
                  <div className="shrink-0 flex md:flex-col justify-end items-end gap-3 mt-4 md:mt-0">
                    <button
                      onClick={() => handleStart(target)}
                      disabled={target.computedStatus === "Upcoming" || target.computedStatus === "Closed"}
                      className="px-4 py-2.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-bold rounded-xl transition duration-200 shadow-sm hover:shadow-md disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 group text-xs uppercase tracking-wide"
                    >
                      <span>Start Assessment</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition duration-150" />
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(target.id)}
                      className="p-2.5 rounded-xl border border-red-200 text-red-650 hover:bg-red-50 hover:text-red-800 transition"
                      title="Delete Activity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
