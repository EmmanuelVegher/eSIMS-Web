import React from "react";
import { useApp } from "../context/AppContext";
import { motion } from "framer-motion";
import {
  Eye,
  FileText,
  Package,
  FileSpreadsheet,
  Globe,
  AlertTriangle,
  Play,
  LogOut,
  User,
  Shield,
  FileCheck2,
  Briefcase
} from "lucide-react";

export const Overview: React.FC = () => {
  const { profile, navigate, logout } = useApp();

  const getInitials = () => {
    if (!profile) return "US";
    const first = profile.firstName?.charAt(0) || "";
    const last = profile.lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  const criteriaList = [
    { icon: <Eye className="w-5 h-5 text-wine-600" />, title: "Visual Inspection", desc: "Direct observation of clinical services, equipment, pharmacy, or environment" },
    { icon: <FileText className="w-5 h-5 text-wine-600" />, title: "Chart Review", desc: "Random sampling and auditing of client folders or records" },
    { icon: <Package className="w-5 h-5 text-wine-600" />, title: "Materials Review", desc: "Inspection of physical commodities, stocks, logs, or materials" },
    { icon: <FileSpreadsheet className="w-5 h-5 text-wine-600" />, title: "Document Review", desc: "Review of written guidelines, SOPs, policies, training logs" },
    { icon: <Globe className="w-5 h-5 text-wine-600" />, title: "Remote Assessment", desc: "Criteria allowed for virtual evaluation or record screening" },
    { icon: <AlertTriangle className="w-5 h-5 text-wine-600" />, title: "Required / MPR", desc: "Must-Pass Requirements essential for basic certification standards" },
  ];

  const gradingList = [
    { color: "bg-green-500", text: "text-green-700", label: "Green", score: "Score 3", desc: "Meets standard fully with little or no intervention required." },
    { color: "bg-yellow-500", text: "text-yellow-700", label: "Yellow", score: "Score 2", desc: "Needs improvement; minor deviations from standard observed." },
    { color: "bg-red-500", text: "text-red-700", label: "Red", score: "Score 1", desc: "Needs urgent remediation; critical standards not met." },
    { color: "bg-slate-400", text: "text-slate-700", label: "Gray", score: "Score 0", desc: "Not Applicable; criteria not valid for this facility type." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Navbar */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-wine-800 text-white">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-wine-900 text-xl tracking-tight">e-SIMS</span>
          </div>

          <div className="flex items-center gap-4">
            {profile?.role === "Admin" && (
              <button
                onClick={() => navigate("admin-dashboard")}
                className="text-sm font-semibold text-wine-800 hover:text-wine-900 transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wine-50"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8">
        {/* Profile Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="wine-gradient p-8 rounded-3xl shadow-xl text-white flex flex-col md:flex-row items-center md:justify-between gap-6 mb-8 relative overflow-hidden"
        >
          {/* Decorative Pattern overlay */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <FileCheck2 className="w-64 h-64" />
          </div>

          <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl tracking-wide border border-white/20 text-white shadow-inner">
              {getInitials()}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-bold tracking-wide">
                Welcome, {profile?.firstName} {profile?.lastName}
              </h1>
              <p className="text-xs text-rosegold-200 font-medium mt-1 uppercase tracking-widest flex items-center justify-center md:justify-start gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{profile?.organizationName || "PEPFAR Implementing Partner"}</span>
              </p>
            </div>
          </div>

          <div className="text-center relative z-10 shrink-0">
            <p className="text-xs text-rosegold-200">System Role</p>
            <span className="inline-block mt-1 px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 tracking-wider">
              {profile?.role === "Admin" ? "SYSTEM MANAGER / ADMIN" : "FIELD ASSESSOR"}
            </span>
          </div>
        </motion.div>

        {/* Start Assessment Action */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8 flex justify-center"
        >
          <button
            onClick={() => navigate("activities")}
            className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-bold rounded-2xl transition duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 animate-hover-scale"
          >
            <Play className="w-6 h-6 fill-current" />
            <span className="text-lg">Access Scheduled Assessments</span>
          </button>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Icon Legend Section */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200/80"
          >
            <h3 className="font-bold text-wine-900 text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              <span>Assessment Criteria Legend</span>
            </h3>
            <div className="space-y-4">
              {criteriaList.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-wine-50 flex items-center justify-center border border-wine-100">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CEE Grading Legend Section */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200/80"
          >
            <h3 className="font-bold text-wine-900 text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>CEE Grading & Scoring</span>
            </h3>
            <div className="space-y-4">
              {gradingList.map((item, index) => (
                <div key={index} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex gap-4">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center text-white font-extrabold text-sm shadow`}>
                    {item.score.split(" ")[1]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">{item.label}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">({item.score})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
