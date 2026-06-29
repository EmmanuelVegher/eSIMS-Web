import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { Calendar, MapPin, Building2, ClipboardList, CheckCircle2, ChevronRight, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

interface SimsActivity {
  id: string;
  startDate: string;
  proposedEndDate: string;
  states: string;
  organizations: string;
  facilities: string;
}

export const Activities: React.FC = () => {
  const { profile, navigate, setActiveActivity } = useApp();
  const [activities, setActivities] = useState<SimsActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, {
    total: number;
    completed: number;
    red: number;
    yellow: number;
    green: number;
    grey: number;
  }>>({});

  useEffect(() => {
    if (!profile) return;

    const fetchActivitiesAndResponses = async () => {
      setLoading(true);
      try {
        // Query activities for user's organization
        const actQuery = query(
          collection(db, "sims_activities"),
          where("organizations", "==", profile.organizationName)
        );
        const actSnap = await getDocs(actQuery);
        const activitiesList: SimsActivity[] = [];
        actSnap.forEach(docSnap => {
          activitiesList.push({ id: docSnap.id, ...docSnap.data() } as SimsActivity);
        });

        // Fallback mock activities if none exist
        if (activitiesList.length === 0) {
          activitiesList.push(
            {
              id: "ACT_001",
              startDate: "2026-06-01",
              proposedEndDate: "2026-06-30",
              states: profile.state || "FCT",
              organizations: profile.organizationName,
              facilities: profile.facilityName || "Asokoro District Hospital"
            },
            {
              id: "ACT_002",
              startDate: "2026-06-15",
              proposedEndDate: "2026-07-15",
              states: "Enugu",
              organizations: profile.organizationName,
              facilities: "UNTH Enugu"
            }
          );
        }

        setActivities(activitiesList);

        // Fetch question responses for each activity to calculate progress & scores
        const newStats: typeof stats = {};

        for (const act of activitiesList) {
          const respQuery = query(
            collection(db, "question_response"),
            where("eSIMS_ID", "==", act.id)
          );
          const respSnap = await getDocs(respQuery);
          
          // Group responses by ceeId
          const ceeResponses: Record<string, string[]> = {};
          respSnap.forEach(docSnap => {
            const data = docSnap.data();
            const ceeId = data.cee_id;
            const status = data.status || "grey"; // red, yellow, green, grey
            if (!ceeResponses[ceeId]) {
              ceeResponses[ceeId] = [];
            }
            ceeResponses[ceeId].push(status.toLowerCase());
          });

          // Overall grade per CEE is determined by the minimum color:
          // Red > Yellow > Green > Grey
          let redCount = 0;
          let yellowCount = 0;
          let greenCount = 0;
          let greyCount = 0;

          Object.keys(ceeResponses).forEach(ceeId => {
            const colors = ceeResponses[ceeId];
            if (colors.includes("red")) {
              redCount++;
            } else if (colors.includes("yellow")) {
              yellowCount++;
            } else if (colors.includes("green")) {
              greenCount++;
            } else {
              greyCount++;
            }
          });

          const completed = Object.keys(ceeResponses).length;
          // Standard SIMS CEE target is usually 38, or max out at CEE total
          const totalCEEs = 38;

          newStats[act.id] = {
            total: totalCEEs,
            completed: completed > totalCEEs ? totalCEEs : completed,
            red: redCount,
            yellow: yellowCount,
            green: greenCount,
            grey: greyCount
          };
        }

        setStats(newStats);
      } catch (e) {
        console.error("Error fetching activities and responses:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchActivitiesAndResponses();
  }, [profile]);

  const handleStart = (act: SimsActivity) => {
    setActiveActivity(act);
    navigate("assessment");
  };

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
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4">
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

      <main className="max-w-4xl mx-auto px-6 mt-8">
        {activities.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200">
            <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-800 text-lg">No Assessments Scheduled</h3>
            <p className="text-sm text-slate-500 mt-1">There are currently no active SIMS activity targets assigned to your organization.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map(act => {
              const actStats = stats[act.id] || { total: 38, completed: 0, red: 0, yellow: 0, green: 0, grey: 0 };
              const percent = Math.round((actStats.completed / actStats.total) * 100);

              return (
                <div
                  key={act.id}
                  className="glass-panel rounded-2xl shadow-sm hover:shadow-md border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition duration-200"
                >
                  <div className="space-y-4 flex-1">
                    {/* Facility Details */}
                    <div>
                      <div className="flex items-center gap-2 text-wine-800 mb-1">
                        <Building2 className="w-5 h-5" />
                        <h3 className="font-bold text-slate-800 text-lg leading-snug">{act.facilities}</h3>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{act.states} State</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{act.startDate} to {act.proposedEndDate}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Tracker */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>CEE Progress</span>
                        <span>{actStats.completed} of {actStats.total} CEEs completed ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-wine-900 to-wine-600 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Grading Score Summary */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">Tally:</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <span>G: {actStats.green}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <span>Y: {actStats.yellow}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span>R: {actStats.red}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span>Gr: {actStats.grey}</span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => handleStart(act)}
                      className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-bold rounded-xl transition duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group text-sm"
                    >
                      <span>Start Assessment</span>
                      <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition duration-150" />
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
