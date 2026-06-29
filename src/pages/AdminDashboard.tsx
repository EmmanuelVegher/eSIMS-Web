import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  LayoutDashboard,
  ShieldAlert,
  ClipboardCheck,
  Percent,
  Download,
  Filter,
  ArrowLeft,
  Calendar,
  Layers,
  Database
} from "lucide-react";
import { Seeder } from "../components/Seeder";

export const AdminDashboard: React.FC = () => {
  const { navigate, logout } = useApp();
  const [activities, setActivities] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedOrg, setSelectedOrg] = useState("All");
  const [selectedState, setSelectedState] = useState("All");

  // Options lists
  const [orgs, setOrgs] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  // Seed settings modal
  const [showSeeder, setShowSeeder] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all activities
        const actSnap = await getDocs(collection(db, "sims_activities"));
        const activitiesList: any[] = [];
        const orgList = new Set<string>();
        const stateList = new Set<string>();

        actSnap.forEach(docSnap => {
          const data = docSnap.data();
          activitiesList.push({ id: docSnap.id, ...data });
          if (data.organizations) orgList.add(data.organizations);
          if (data.states) stateList.add(data.states);
        });

        // Fallbacks if Firestore empty
        if (activitiesList.length === 0) {
          activitiesList.push(
            { id: "ACT_001", startDate: "2026-06-01", proposedEndDate: "2026-06-30", states: "FCT", organizations: "Caritas Nigeria", facilities: "Asokoro District Hospital" },
            { id: "ACT_002", startDate: "2026-06-15", proposedEndDate: "2026-07-15", states: "Enugu", organizations: "Caritas Nigeria", facilities: "UNTH Enugu" },
            { id: "ACT_003", startDate: "2026-07-01", proposedEndDate: "2026-07-31", states: "Enugu", organizations: "CCFN", facilities: "Mother of Christ Hospital" }
          );
          orgList.add("Caritas Nigeria");
          orgList.add("CCFN");
          stateList.add("FCT");
          stateList.add("Enugu");
        }

        setActivities(activitiesList);
        setOrgs(["All", ...Array.from(orgList)]);
        setStates(["All", ...Array.from(stateList)]);

        // Fetch all responses
        const respSnap = await getDocs(collection(db, "question_response"));
        const responsesList: any[] = [];
        respSnap.forEach(docSnap => {
          responsesList.push(docSnap.data());
        });

        // Mock responses if none exist to pre-fill graphs beautifully
        if (responsesList.length === 0) {
          // Pre-populate mock stats
          const mockStatuses = ["Green", "Yellow", "Red", "Gray"];
          for (let i = 0; i < 45; i++) {
            responsesList.push({
              eSIMS_ID: i % 3 === 0 ? "ACT_001" : i % 3 === 1 ? "ACT_002" : "ACT_003",
              cee_id: `CEE_${i}`,
              status: mockStatuses[i % 4],
              organizationName: i % 3 === 2 ? "CCFN" : "Caritas Nigeria",
              state: i % 3 === 0 ? "FCT" : "Enugu"
            });
          }
        }

        setResponses(responsesList);
      } catch (e) {
        console.error("Error loading admin stats:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter logic
  const filteredActivities = activities.filter(act => {
    const matchOrg = selectedOrg === "All" || act.organizations === selectedOrg;
    const matchState = selectedState === "All" || act.states === selectedState;
    return matchOrg && matchState;
  });

  const filteredResponses = responses.filter(resp => {
    const matchOrg = selectedOrg === "All" || resp.organizationName === selectedOrg;
    const matchState = selectedState === "All" || resp.state === selectedState;
    return matchOrg && matchState;
  });

  // Calculate Metrics
  const activeSimsCount = filteredActivities.length;
  
  // Calculate Green/Yellow/Red tallies
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let greyCount = 0;

  filteredResponses.forEach(r => {
    const s = r.status?.toLowerCase();
    if (s === "green") greenCount++;
    else if (s === "yellow") yellowCount++;
    else if (s === "red") redCount++;
    else greyCount++;
  });

  const totalScored = greenCount + yellowCount + redCount;
  const remediationRate = totalScored > 0 ? Math.round((greenCount / totalScored) * 100) : 0;

  // Chart 1: Grade Breakdown (Pie Chart)
  const pieData = [
    { name: "Green (Meets Standard)", value: greenCount, color: "#10B981" },
    { name: "Yellow (Needs Improvement)", value: yellowCount, color: "#F59E0B" },
    { name: "Red (Urgent Remediation)", value: redCount, color: "#EF4444" }
  ].filter(d => d.value > 0);

  // Chart 2: Performance by Implementing Partner (Bar Chart)
  const orgPerformance: Record<string, { name: string; Green: number; Yellow: number; Red: number }> = {};
  filteredResponses.forEach(r => {
    const org = r.organizationName || "Unknown";
    if (!orgPerformance[org]) {
      orgPerformance[org] = { name: org, Green: 0, Yellow: 0, Red: 0 };
    }
    const s = r.status?.toLowerCase();
    if (s === "green") orgPerformance[org].Green++;
    if (s === "yellow") orgPerformance[org].Yellow++;
    if (s === "red") orgPerformance[org].Red++;
  });

  const barData = Object.values(orgPerformance);

  // CSV Export Utility
  const handleExportCSV = () => {
    if (filteredResponses.length === 0) return;
    
    const headers = ["Activity ID", "Implementing Partner", "State", "CEE ID", "Question ID", "Score Color", "Timestamp"];
    const rows = filteredResponses.map(r => [
      r.eSIMS_ID || "",
      r.organizationName || "",
      r.state || "",
      r.cee_id || "",
      r.question_id || "",
      r.status || "",
      r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toISOString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eSIMS_Aggregated_Report_${selectedOrg}_${selectedState}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("overview")}
              className="p-2 rounded-lg hover:bg-wine-50 text-slate-500 hover:text-wine-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-wine-800 uppercase tracking-widest">Admin Control</span>
              <h1 className="text-xl font-bold text-slate-800">Analytics & Management</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSeeder(!showSeeder)}
              className="px-3.5 py-1.5 rounded-lg border border-wine-300 text-wine-800 hover:bg-wine-50 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Database className="w-4 h-4" />
              <span>DB Setup</span>
            </button>
            <button
              onClick={() => navigate("admin-create-activity")}
              className="px-4 py-2 rounded-lg bg-wine-800 hover:bg-wine-700 text-white text-xs font-bold transition shadow"
            >
              Schedule SIMS Activity
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Console */}
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Settings/Seed Modal */}
        {showSeeder && (
          <div className="flex justify-center mb-6">
            <Seeder />
          </div>
        )}

        {/* Filter Section */}
        <section className="glass-panel p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-wine-900 font-bold text-sm">
            <Filter className="w-5 h-5" />
            <span>Real-time Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-48">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Implementing Partner</label>
              <select
                value={selectedOrg}
                onChange={e => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
              >
                {orgs.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:w-48">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Target State</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
              >
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="mt-4 md:mt-0 p-2.5 rounded-lg bg-wine-50 text-wine-900 border border-wine-100 hover:bg-wine-100 transition text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </section>

        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active SIMS Sites</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeSimsCount}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-50 text-green-600">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Completed Assessments</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{greenCount + yellowCount + redCount} CEEs</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-wine-50 text-wine-800">
              <Percent className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Overall Remediation Rate</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{remediationRate}%</h3>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Chart 1: Pie Chart breakdown */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]">
            <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">CEE Color Grade Breakdown</h3>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Bar Chart comparing partners */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]">
            <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">CEE Grades by Implementing Partner</h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Green" fill="#10B981" />
                  <Bar dataKey="Yellow" fill="#F59E0B" />
                  <Bar dataKey="Red" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};
