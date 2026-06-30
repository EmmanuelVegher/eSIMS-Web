import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
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
  ClipboardCheck,
  Percent,
  Download,
  Filter,
  Grid,
  BarChart3
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

export const AdminDashboard: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "coverage">("overview");

  // Filters
  const [selectedOrg, setSelectedOrg] = useState("All");
  const [selectedState, setSelectedState] = useState("All");

  // Options lists
  const [orgs, setOrgs] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
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

        const respSnap = await getDocs(collection(db, "question_response"));
        const responsesList: any[] = [];
        respSnap.forEach(docSnap => {
          responsesList.push(docSnap.data());
        });

        if (responsesList.length === 0) {
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

  // Pie Chart: Grade Breakdown
  const pieData = [
    { name: "Green (Meets Standard)", value: greenCount, color: "#10B981" },
    { name: "Yellow (Needs Improvement)", value: yellowCount, color: "#F59E0B" },
    { name: "Red (Urgent Remediation)", value: redCount, color: "#EF4444" }
  ].filter(d => d.value > 0);

  // Bar Chart: Partner performance
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

  // ── MATRIX HEATMAP DATA & GENERATOR ──
  const ceeSetsList = [
    "SET: 1A ALL SITES-GENERAL",
    "SET 1B: ALL SITES-COMMODITIES MGT",
    "SET 1C: ALL SITES-DATA QUALITY",
    "SET 2A: C&T-GENERAL POPULATION",
    "SET 2B: C&T FOR HIV-INFECTED CHILDREN",
    "SET 3A: KEY POPULATIONS-GENERAL",
    "SET 3B: C&T-KEY POPULATIONS",
    "SET 4A: PMTCT-ANC, POSTNATAL, and L&D",
    "SET 4B: HIV EXPOSED INFANTS (HEI)",
    "SET 5: VMMC",
    "SET 6: AGYW, GBV, and OVC",
    "SET 7: HTS",
    "SET 8: TB TREATMENT SERVICE POINT",
    "SET 9: METHADONE (MMAT)",
    "SET 10A: LABORATORY",
    "SET 10B: BLOOD SAFETY"
  ];

  const facilitiesList = ["ENMC", "ESUTH", "NONAH", "UDI GH", "UNTH", "ASHE"];

  const baseMatrix: Record<string, Record<string, "Green" | "Yellow" | "Red" | "Gray" | "White">> = {
    "SET: 1A ALL SITES-GENERAL": { ENMC: "White", ESUTH: "Red", NONAH: "White", "UDI GH": "Red", UNTH: "White", ASHE: "Red" },
    "SET 1B: ALL SITES-COMMODITIES MGT": { ENMC: "Green", ESUTH: "White", NONAH: "Red", "UDI GH": "Green", UNTH: "Red", ASHE: "Green" },
    "SET 1C: ALL SITES-DATA QUALITY": { ENMC: "White", ESUTH: "Red", NONAH: "Green", "UDI GH": "White", UNTH: "Red", ASHE: "Green" },
    "SET 2A: C&T-GENERAL POPULATION": { ENMC: "Yellow", ESUTH: "White", NONAH: "Red", "UDI GH": "Yellow", UNTH: "White", ASHE: "Green" },
    "SET 2B: C&T FOR HIV-INFECTED CHILDREN": { ENMC: "White", ESUTH: "Red", NONAH: "White", "UDI GH": "Yellow", UNTH: "White", ASHE: "Green" },
    "SET 3A: KEY POPULATIONS-GENERAL": { ENMC: "Gray", ESUTH: "Gray", NONAH: "Gray", "UDI GH": "Gray", UNTH: "Gray", ASHE: "Gray" },
    "SET 3B: C&T-KEY POPULATIONS": { ENMC: "Gray", ESUTH: "Gray", NONAH: "Gray", "UDI GH": "Gray", UNTH: "Gray", ASHE: "Gray" },
    "SET 4A: PMTCT-ANC, POSTNATAL, and L&D": { ENMC: "White", ESUTH: "Red", NONAH: "White", "UDI GH": "Red", UNTH: "White", ASHE: "Green" },
    "SET 4B: HIV EXPOSED INFANTS (HEI)": { ENMC: "White", ESUTH: "Red", NONAH: "White", "UDI GH": "Red", UNTH: "White", ASHE: "Green" },
    "SET 5: VMMC": { ENMC: "Gray", ESUTH: "Gray", NONAH: "Gray", "UDI GH": "Gray", UNTH: "Gray", ASHE: "Gray" },
    "SET 6: AGYW, GBV, and OVC": { ENMC: "White", ESUTH: "Red", NONAH: "White", "UDI GH": "Red", UNTH: "White", ASHE: "Yellow" },
    "SET 7: HTS": { ENMC: "Green", ESUTH: "White", NONAH: "Red", "UDI GH": "White", UNTH: "Green", ASHE: "Green" },
    "SET 8: TB TREATMENT SERVICE POINT": { ENMC: "White", ESUTH: "Red", NONAH: "White", "UDI GH": "Red", UNTH: "White", ASHE: "Red" },
    "SET 9: METHADONE (MMAT)": { ENMC: "Gray", ESUTH: "Gray", NONAH: "Gray", "UDI GH": "Gray", UNTH: "Gray", ASHE: "Gray" },
    "SET 10A: LABORATORY": { ENMC: "Green", ESUTH: "Green", NONAH: "White", "UDI GH": "Green", UNTH: "Red", ASHE: "Red" },
    "SET 10B: BLOOD SAFETY": { ENMC: "White", ESUTH: "Red", NONAH: "White", "UDI GH": "Red", UNTH: "White", ASHE: "Red" }
  };

  const getCellColor = (status: string) => {
    switch (status) {
      case "Green": return "bg-[#10B981] border border-emerald-600";
      case "Yellow": return "bg-[#F59E0B] border border-amber-500";
      case "Red": return "bg-[#EF4444] border border-red-600";
      case "Gray": return "bg-[#64748B] border border-slate-500";
      default: return "bg-white border border-slate-200";
    }
  };

  // Mixed charts data sets
  const setCoverageData = [
    { name: "SET 1A", assessed: 0, percentage: 0 },
    { name: "SET 1B", assessed: 5, percentage: 63 },
    { name: "SET 1C", assessed: 5, percentage: 63 },
    { name: "SET 2A", assessed: 7, percentage: 88 },
    { name: "SET 2B", assessed: 5, percentage: 63 },
    { name: "SET 4A", assessed: 3, percentage: 38 },
    { name: "SET 4B", assessed: 3, percentage: 38 },
    { name: "SET 6",  assessed: 2, percentage: 25 },
    { name: "SET 7",  assessed: 4, percentage: 50 },
    { name: "SET 8",  assessed: 1, percentage: 13 },
    { name: "SET 10A", assessed: 3, percentage: 38 },
    { name: "SET 10B", assessed: 0, percentage: 0 },
  ];

  const srtCoverageData = [
    { name: "SRT A", facilities: 10, completed: 2, percentage: 20 },
    { name: "SRT B", facilities: 11, completed: 3, percentage: 27 },
    { name: "SRT C", facilities: 8, completed: 2, percentage: 25 },
    { name: "SRT D", facilities: 8, completed: 1, percentage: 13 },
  ];

  // Custom Tooltip components for Recharts
  const ChartCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs font-semibold backdrop-blur-sm">
          <p className="font-bold border-b border-white/10 pb-1 mb-1.5 text-slate-300">{data.name || data.payload.name}</p>
          <p className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || data.payload.fill || data.payload.color }} />
            <span>Value: <strong className="text-white text-sm">{data.value}</strong></span>
          </p>
        </div>
      );
    }
    return null;
  };

  const BarCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs font-semibold backdrop-blur-sm min-w-[150px]">
          <p className="font-bold border-b border-white/10 pb-1 mb-1.5 text-slate-300">{label}</p>
          <div className="space-y-1">
            {payload.map((p: any) => (
              <p key={p.dataKey} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded" style={{ backgroundColor: p.fill || p.color }} />
                <span className="text-slate-400 capitalize">{p.name || p.dataKey}:</span>
                <strong className="text-white ml-auto font-bold">{p.value}</strong>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const getCellBadge = (status: string) => {
    switch (status) {
      case "Green":
        return (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-black shadow-sm transform hover:scale-105 transition">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Meets
          </div>
        );
      case "Yellow":
        return (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-black shadow-sm transform hover:scale-105 transition">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Action
          </div>
        );
      case "Red":
        return (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/80 text-[10px] font-black shadow-sm transform hover:scale-105 transition">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" style={{ animationDuration: '2s' }} />
            Critical
          </div>
        );
      case "Gray":
        return (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold transform hover:scale-105 transition">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            N/A
          </div>
        );
      default:
        return (
          <div className="w-10 h-7 mx-auto rounded-lg border border-dashed border-slate-200 bg-slate-50/20" />
        );
    }
  };

  return (
    <AdminLayout
      title="Analytics & Management"
      subtitle="Admin Space"
      headerRight={
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-wine-50 text-wine-900 border border-wine-100 hover:bg-wine-100 transition text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4 text-wine-800" />
          <span>Export CSV</span>
        </button>
      }
    >
      <div className="space-y-8 pb-16">

        {/* Segmented Pill Tab Controls */}
        <div className="flex justify-center">
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner border border-slate-200/50">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition duration-300 flex items-center gap-2 ${
                activeTab === "overview"
                  ? "bg-wine-800 text-white shadow-md shadow-wine-950/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab("coverage")}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition duration-300 flex items-center gap-2 ${
                activeTab === "coverage"
                  ? "bg-wine-800 text-white shadow-md shadow-wine-950/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Grid className="w-4 h-4" />
              SIMS Coverage Reports
            </button>
          </div>
        </div>

        {/* Filters & Export (common) */}
        <section className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 transition hover:shadow-lg duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-wine-50 text-wine-900 shadow-inner">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Filter Indicators</h4>
              <p className="text-[11px] text-slate-400">Narrow down target partner data</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-52">
              <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Implementing Partner</label>
              <select
                value={selectedOrg}
                onChange={e => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-wine-600 transition shadow-sm cursor-pointer"
              >
                {orgs.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:w-52">
              <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Target State</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-wine-600 transition shadow-sm cursor-pointer"
              >
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="mt-5 md:mt-0 px-4 py-2.5 rounded-xl bg-wine-50 text-wine-900 border border-wine-100 hover:bg-wine-100 transition text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transform hover:-translate-y-0.5 active:translate-y-0 duration-300 hidden"
            >
              <Download className="w-4 h-4 text-wine-800" />
              <span>Export CSV (header)</span>
            </button>
          </div>
        </section>

        {activeTab === "overview" ? (
          /* TAB 1: OVERVIEW ANALYTICS */
          <div className="space-y-8 animate-slide-in-up">
            {/* KPI Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/80 flex items-center gap-4 relative overflow-hidden animate-hover-lift group duration-300">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500" />
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition duration-300 shadow-inner">
                  <LayoutDashboard className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active SIMS Sites</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{activeSimsCount}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Monitoring target facilities</p>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/80 flex items-center gap-4 relative overflow-hidden animate-hover-lift group duration-300">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500" />
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition duration-300 shadow-inner">
                  <ClipboardCheck className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed Assessments</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{greenCount + yellowCount + redCount} CEEs</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Total answers captured</p>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/80 flex items-center gap-4 relative overflow-hidden animate-hover-lift group duration-300">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-wine-600" />
                <div className="p-3 rounded-2xl bg-wine-50 text-wine-800 group-hover:scale-110 transition duration-300 shadow-inner">
                  <Percent className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Remediation Rate</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{remediationRate}%</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Meets standard targets</p>
                </div>
              </div>
            </section>

            {/* Charts Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md flex flex-col h-[400px] transition hover:shadow-lg duration-300">
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">CEE Color Grade Breakdown</h3>
                  <span className="text-[10px] font-bold text-slate-400">Total Scored: {totalScored}</span>
                </div>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartCustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md flex flex-col h-[400px] transition hover:shadow-lg duration-300">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">CEE Grades by Implementing Partner</h3>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip content={<BarCustomTooltip />} cursor={{ fill: "rgba(128, 0, 32, 0.02)" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      <Bar dataKey="Green" name="Green (Meets)" fill="#10B981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Yellow" name="Yellow (Needs Action)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Red" name="Red (Urgent)" fill="#EF4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* TAB 2: COVERAGE MATRIX & CHARTS */
          <div className="space-y-8 animate-slide-in-up">
            
            {/* Heatmap Matrix Grid */}
            <section className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200/80 pb-4 mb-6 gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">SIMS Site & Set Coverage Matrix</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Live site assessment statuses across CEE clusters.</p>
                </div>

                {/* Key Indicators block */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/50">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black mr-2">Grade Status:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600" />
                    <span>Meets Standard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-600" />
                    <span>Needs Action</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-red-500 border border-red-600" />
                    <span>Urgent Remediation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-slate-400 border border-slate-500" />
                    <span>N/A</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto w-full border border-slate-200/60 rounded-2xl shadow-inner bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[9px] font-black">
                      <th className="p-4 border-r border-slate-200/80 min-w-[280px]">SET OF CEEs</th>
                      {facilitiesList.map(fac => (
                        <th key={fac} className="p-4 text-center border-r border-slate-200/80 w-28 tracking-widest">{fac}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ceeSetsList.map(setKey => (
                      <tr key={setKey} className="hover:bg-slate-50/45 transition">
                        <td className="p-4 border-r border-slate-200/80 font-bold text-slate-700 text-xs">{setKey}</td>
                        {facilitiesList.map(fac => {
                          const status = baseMatrix[setKey]?.[fac] || "White";
                          return (
                            <td key={fac} className="p-3 border-r border-slate-200/80 text-center">
                              {getCellBadge(status)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Baseline Charts Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Chart 1: Baseline SIMS Coverage */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md flex flex-col transition hover:shadow-lg duration-300">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-wine-800" />
                    <span>Baseline SIMS: SET Coverage</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Frequency assessed and coverage proportion by CEE set.</p>
                </div>
                <div className="h-[340px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={setCoverageData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={9} tickLine={false} />
                      <Tooltip content={<BarCustomTooltip />} cursor={{ fill: "rgba(128, 0, 32, 0.02)" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      <Bar dataKey="assessed" name="SET Freq Ass" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="percentage" name="SET %Coverage" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: SRT SIMS Coverage */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md flex flex-col transition hover:shadow-lg duration-300">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-wine-800" />
                    <span>SRT SIMS Coverage</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Target vs achieved SIMS facility completions by state resource team.</p>
                </div>
                <div className="h-[340px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={srtCoverageData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={9} tickLine={false} />
                      <Tooltip content={<BarCustomTooltip />} cursor={{ fill: "rgba(128, 0, 32, 0.02)" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      <Bar dataKey="facilities" name="#Facilities Target" fill="#EA580C" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="completed" name="SIMS Completed" fill="#EAB308" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="percentage" name="% Coverage" fill="#16A34A" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </section>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};
