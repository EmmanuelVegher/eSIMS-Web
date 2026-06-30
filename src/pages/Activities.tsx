import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Calendar, MapPin, Building2, ClipboardList, ChevronRight, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

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

export const Activities: React.FC = () => {
  const { profile, navigate, setActiveActivity } = useApp();
  
  const [targets, setTargets] = useState<RefinedActivityTarget[]>([]);
  const [flatFacilities, setFlatFacilities] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; completed: number; red: number; yellow: number; green: number; grey: number }>>({});
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "upcoming" | "completed" | "closed">("active");

  // Load flat facilities list and all scheduled activities
  useEffect(() => {
    if (!profile) return;

    const loadAssessmentData = async () => {
      setLoading(true);
      try {
        // 1. Fetch flat facilities to match metadata (LGA, exact State)
        const facSnap = await getDocs(collection(db, "facilities"));
        const facList: any[] = [];
        facSnap.forEach(d => facList.push({ id: d.id, ...d.data() }));
        setFlatFacilities(facList);

        // 2. Fetch all scheduled activities
        const actSnap = await getDocs(collection(db, "sims_activities"));
        const rawActivities: SimsActivity[] = [];
        actSnap.forEach(d => {
          rawActivities.push({ id: d.id, ...d.data() } as SimsActivity);
        });

        // 3. Filter activities in-memory to match user organization (including comma-separated orgs and 'All')
        const userOrg = profile.organizationName;
        const orgActivities = rawActivities.filter(act => {
          if (!act.organizations) return false;
          return (
            act.organizations === "All" ||
            act.organizations.split(",").map(o => o.trim()).includes(userOrg)
          );
        });

        // 4. Split activities containing multiple facilities (comma-separated list) into individual targets
        const now = new Date();
        const refinedList: RefinedActivityTarget[] = [];

        orgActivities.forEach(act => {
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

            // Lookup facility details to resolve exact state
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

        // 5. Fetch flat question responses to aggregate progress/scores
        const respSnap = await getDocs(collection(db, "question_response"));
        const newStats: typeof stats = {};

        refinedList.forEach(target => {
          // Filter responses matching this activityID and specific facilityName
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

          // Standard eSIMS CEE count target (typically 38 or total mapped)
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
        console.error("Error loading assessment targets:", e);
      } finally {
        setLoading(false);
      }
    };

    loadAssessmentData();
  }, [profile]);

  const handleStart = (target: RefinedActivityTarget) => {
    // Pack activity context for the CEE evaluation form
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
        return "bg-slate-50 text-slate-750 border-slate-200";
    }
  };

  // Filter list by active tab
  const filteredTargets = targets.filter(t => {
    if (activeTab === "all") return true;
    return t.computedStatus.toLowerCase() === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-wine-800" />
          <span className="text-sm font-semibold text-slate-500">Loading Scheduled Targets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("overview")}
            className="p-2 rounded-lg hover:bg-wine-50 text-slate-500 hover:text-wine-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-wine-900">Scheduled Site Assessments</h1>
            <p className="text-xs text-slate-500 mt-0.5">Select a target facility to begin evaluation</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Dynamic Category Tabs */}
        <div className="flex border-b border-slate-250 gap-4 md:gap-8 overflow-x-auto pb-1">
          {(["active", "upcoming", "completed", "closed", "all"] as const).map(tab => {
            const count = targets.filter(t => tab === "all" || t.computedStatus.toLowerCase() === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition shrink-0 ${
                  activeTab === tab
                    ? "border-b-2 border-wine-800 text-wine-850"
                    : "text-slate-400 hover:text-slate-650"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Targets List */}
        {filteredTargets.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200">
            <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-800 text-lg">No Assessments Found</h3>
            <p className="text-sm text-slate-500 mt-1">There are currently no scheduled activity targets matching this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTargets.map((target, idx) => {
              const targetKey = `${target.id}_${target.facilities}`;
              const actStats = stats[targetKey] || { total: 38, completed: 0, red: 0, yellow: 0, green: 0, grey: 0 };
              const percent = Math.round((actStats.completed / actStats.total) * 100);

              return (
                <div
                  key={idx}
                  className="glass-panel rounded-2xl shadow-sm hover:shadow-md border border-slate-200/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition duration-200 bg-white"
                >
                  <div className="space-y-4 flex-1">
                    {/* Facility Details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <div className="flex items-center gap-2 text-wine-900">
                          <Building2 className="w-5 h-5 shrink-0" />
                          <h3 className="font-bold text-slate-800 text-md leading-snug">{target.facilities}</h3>
                        </div>
                        <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusColorClass(target.computedStatus)}`}>
                          {target.computedStatus}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{target.states} State</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{target.startDate} to {target.proposedEndDate}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Tracker */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-650">
                        <span>CEE Progress</span>
                        <span>{actStats.completed} of {actStats.total} CEEs completed ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
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

                  {/* Action Button (Disabled if Closed or Upcoming) */}
                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => handleStart(target)}
                      disabled={target.computedStatus === "Upcoming" || target.computedStatus === "Closed"}
                      className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-bold rounded-xl transition duration-200 shadow-sm hover:shadow-md disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 group text-xs uppercase tracking-wide"
                    >
                      <span>Start Assessment</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition duration-150" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
