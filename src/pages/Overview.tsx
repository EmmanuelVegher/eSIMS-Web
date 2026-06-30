import React from "react";
import { useApp } from "../context/AppContext";
import { motion } from "framer-motion";
import { LogOut, Shield, ArrowRight } from "lucide-react";

export const Overview: React.FC = () => {
  const { profile, navigate, logout } = useApp();

  const getInitials = () => {
    if (!profile) return "E";
    return (profile.firstName?.charAt(0) || "E").toUpperCase();
  };

  const legendsList = [
    {
      img: "/eyes.png",
      title: "Visual Inspection",
      desc: "Requires checking documents, registers, charts, or physical spaces."
    },
    {
      img: "/PinkSquare.png",
      title: "Chart Review",
      desc: "Requires a detailed review of medical charts or patient registers."
    },
    {
      img: "/GreyCircle.png",
      title: "Materials & Space Review",
      desc: "Requires evaluating the clinical setting, tools, and layout."
    },
    {
      img: "/Triangle.png",
      title: "Document Review",
      desc: "Requires reviewing policies, standard operating procedures, or guidelines."
    },
    {
      img: "/Remote.png",
      title: "Remote Eligible",
      desc: "Assessment can be completed off-site without physical presence."
    },
    {
      img: "/RemoteConditional.png",
      title: "Remote Conditional",
      desc: "Can be assessed remotely if specific guidelines and conditions are met."
    },
    {
      img: "/Required.png",
      title: "Required (MPR)",
      desc: "PEPFAR Minimum Program Requirement essential for comprehensive review."
    }
  ];

  const gradingList = [
    {
      label: "G: Green (3)",
      desc: "Meets standard",
      badgeClass: "border-emerald-500 text-emerald-700 bg-emerald-500/10"
    },
    {
      label: "Y: Yellow (2)",
      desc: "Needs improvement",
      badgeClass: "border-amber-500 text-amber-700 bg-amber-500/10"
    },
    {
      label: "R: Red (1)",
      desc: "Needs urgent remediation",
      badgeClass: "border-red-500 text-red-700 bg-red-500/10"
    },
    {
      label: "Gray (0)",
      desc: "Not Applicable selected",
      badgeClass: "border-slate-400 text-slate-600 bg-slate-400/10"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/simsicon2.png" className="w-8 h-8 object-contain rounded-lg shadow-sm" alt="SIMS Icon 2" />
            <h1 className="font-extrabold text-slate-800 text-lg tracking-tight">
              e-SIMS Overview
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {profile?.role === "Admin" && (
              <button
                onClick={() => navigate("admin-dashboard")}
                className="text-xs font-bold text-wine-800 hover:text-wine-900 transition flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-wine-50"
                title="Admin Console"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Layout */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (col-span-5) - Welcomes & Info & Action */}
          <div className="lg:col-span-5 space-y-6">
            {/* Welcome Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="wine-gradient p-6 rounded-3xl shadow-md text-white flex items-center gap-4 relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl border border-white/20 text-white shrink-0 shadow-inner">
                {getInitials()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-rosegold-200 block uppercase tracking-widest font-semibold opacity-80">Welcome back,</span>
                <h2 className="text-lg font-bold truncate tracking-wide leading-snug">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                <p className="text-[11px] text-rosegold-200 truncate font-medium mt-0.5 opacity-90">
                  {profile?.organizationName || "PEPFAR Implementing Partner"}
                </p>
              </div>
            </motion.div>

            {/* Assessment Tool Info */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Assessment Tool Info</h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Evaluate PEPFAR program implementation using indicators below:
                </p>
              </div>

              <div className="flex justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <img
                  src="/cee_description.png"
                  alt="CEE Structure Used within this Tool"
                  className="max-h-24 object-contain rounded"
                />
              </div>
            </div>

            {/* Start Assessment Action Button */}
            <div className="pt-2">
              <button
                onClick={() => navigate("activities")}
                className="w-full py-4 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-bold rounded-2xl transition duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>Start Assessment</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Column (col-span-7) - Legends List & Grading scale */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Criteria Legend Card Container */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4">Assessment Criteria Legend</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {legendsList.map((item, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    key={index}
                    className="flex items-start gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-wine-100 transition duration-150"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-150 flex items-center justify-center p-1.5 shadow-sm">
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[11px] font-extrabold text-slate-800 leading-tight">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Grading Scale Card Container */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 mb-3">Grading & CEE Scores</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gradingList.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-2xl"
                  >
                    <span className={`w-28 text-center py-1 px-2 rounded-xl border text-[10px] font-bold tracking-wide shadow-sm shrink-0 ${item.badgeClass}`}>
                      {item.label}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 pl-2 text-right">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};
