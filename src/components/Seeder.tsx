import React, { useState } from "react";
import { db } from "../firebase";
import { doc, writeBatch, collection, getDocs } from "firebase/firestore";
import ceesData from "../data/cees.json";
import questionsData from "../data/questions.json";
import { Database, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export const Seeder: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    roles: "idle" | "running" | "success" | "error";
    orgs: "idle" | "running" | "success" | "error";
    cees: "idle" | "running" | "success" | "error";
    questions: "idle" | "running" | "success" | "error";
  }>({
    roles: "idle",
    orgs: "idle",
    cees: "idle",
    questions: "idle",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState("");

  const runSeeder = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Seed Roles
      setStatus(prev => ({ ...prev, roles: "running" }));
      setProgress("Seeding roles...");
      const rolesBatch = writeBatch(db);
      rolesBatch.set(doc(db, "roles", "User"), { roleName: "User" });
      rolesBatch.set(doc(db, "roles", "Admin"), { roleName: "Admin" });
      await rolesBatch.commit();
      setStatus(prev => ({ ...prev, roles: "success" }));

      // 2. Seed Organizations & Facilities
      setStatus(prev => ({ ...prev, orgs: "running" }));
      setProgress("Seeding organizations & facilities...");
      const orgs = [
        {
          name: "Caritas Nigeria",
          address: "Catholic Secretariat, Abuja",
          facilities: [
            { state: "FCT", name: "Asokoro District Hospital", lga: "AMAC", code: "FCT_ADH_01" },
            { state: "FCT", name: "Garki Hospital", lga: "AMAC", code: "FCT_GH_02" },
            { state: "Enugu", name: "UNTH Enugu", lga: "Enugu South", code: "EN_UNTH_01" },
          ]
        },
        {
          name: "CCFN",
          address: "Catholic Caritas Foundation, Enugu",
          facilities: [
            { state: "Enugu", name: "Mother of Christ Hospital", lga: "Enugu North", code: "EN_MCH_02" },
          ]
        },
        {
          name: "IHVN",
          address: "Institute of Human Virology Nigeria, Abuja",
          facilities: []
        }
      ];

      for (const org of orgs) {
        // Create Org Doc
        const orgRef = doc(db, "organizations", org.name);
        await writeBatch(db).set(orgRef, {
          organizationName: org.name,
          address: org.address
        }).commit();

        // Create Facilities grouped by state
        for (const fac of org.facilities) {
          const facRef = doc(db, "organizations", org.name, "Facilities", fac.state, fac.state, fac.code);
          await writeBatch(db).set(facRef, {
            facilityName: fac.name,
            lga: fac.lga,
            datimCode: fac.code,
            organizationName: org.name,
            stateName: fac.state
          }).commit();
        }
      }
      setStatus(prev => ({ ...prev, orgs: "success" }));

      // 3. Seed CEEs
      setStatus(prev => ({ ...prev, cees: "running" }));
      setProgress(`Seeding ${ceesData.length} CEEs...`);
      // Chunk CEEs into batches of 20 to avoid size limits
      for (let i = 0; i < ceesData.length; i += 20) {
        const batch = writeBatch(db);
        const chunk = ceesData.slice(i, i + 20);
        chunk.forEach(cee => {
          const ref = doc(db, "cees", cee.id);
          batch.set(ref, cee);
        });
        await batch.commit();
      }
      setStatus(prev => ({ ...prev, cees: "success" }));

      // 4. Seed Questions
      setStatus(prev => ({ ...prev, questions: "running" }));
      setProgress(`Seeding ${questionsData.length} Questions...`);
      // Chunk Questions into batches of 20
      for (let i = 0; i < questionsData.length; i += 20) {
        const batch = writeBatch(db);
        const chunk = questionsData.slice(i, i + 20);
        chunk.forEach(q => {
          const ref = doc(db, "questions", q.id);
          batch.set(ref, q);
        });
        await batch.commit();
      }
      setStatus(prev => ({ ...prev, questions: "success" }));
      setProgress("Database successfully seeded!");

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An error occurred during seeding.");
      setProgress("Failed.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (state: "idle" | "running" | "success" | "error") => {
    switch (state) {
      case "running":
        return <Loader2 className="w-5 h-5 animate-spin text-wine-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-xl max-w-md w-full border border-wine-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-wine-50 text-wine-800">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-wine-900 text-lg">Firestore Database Setup</h3>
          <p className="text-xs text-slate-500">Seed standard eSIMS roles, organizations, CEEs, and questions.</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-sm font-medium text-slate-700">1. User & Admin Roles</span>
          {getStatusIcon(status.roles)}
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-sm font-medium text-slate-700">2. Implementing Orgs & Facilities</span>
          {getStatusIcon(status.orgs)}
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-sm font-medium text-slate-700">3. eSIMS CEE Definitions ({ceesData.length})</span>
          {getStatusIcon(status.cees)}
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-sm font-medium text-slate-700">4. Question Bank & Rules ({questionsData.length})</span>
          {getStatusIcon(status.questions)}
        </div>
      </div>

      {progress && (
        <div className="text-center text-sm font-medium mb-4 text-wine-800 animate-pulse">
          {progress}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs flex gap-2 items-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        onClick={runSeeder}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-semibold rounded-xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Seeding Database...</span>
          </>
        ) : (
          <span>Seed Firestore Database</span>
        )}
      </button>
    </div>
  );
};
