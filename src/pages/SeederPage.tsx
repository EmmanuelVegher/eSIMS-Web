import React from "react";
import { Seeder } from "../components/Seeder";
import { useApp } from "../context/AppContext";
import { ArrowLeft, Database } from "lucide-react";

export const SeederPage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen auth-bg flex flex-col items-center justify-center p-6">
      {/* Logo Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl wine-gradient flex items-center justify-center shadow-lg">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">eSIMS</span>
        </div>
        <p className="text-white/60 text-sm">First-Time Database Setup</p>
      </div>

      <Seeder />

      <button
        onClick={() => navigate("login")}
        className="mt-6 flex items-center gap-2 text-white/60 hover:text-white text-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Login</span>
      </button>
    </div>
  );
};
