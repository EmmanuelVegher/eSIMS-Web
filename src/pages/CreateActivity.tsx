import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { Calendar, Building, Landmark, CheckCircle, Loader2, AlertCircle, Layers, CalendarDays } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

export const CreateActivity: React.FC = () => {
  const { navigate } = useApp();

  const [startDate, setStartDate] = useState("");
  const [proposedEndDate, setProposedEndDate] = useState("");

  const [assessmentType, setAssessmentType] = useState("Comprehensive Assessment");
  const [fiscalYear, setFiscalYear] = useState("FY 2025");

  // Selection states (arrays supporting multiple selects)
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  // Flat facilities loaded once from Firestore
  const [allFacilities, setAllFacilities] = useState<any[]>([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load flat facilities once
  useEffect(() => {
    const fetchAllFacilities = async () => {
      try {
        const snap = await getDocs(collection(db, "facilities"));
        const list: any[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Fallbacks if Firestore empty
        if (list.length === 0) {
          list.push(
            { id: "FCT_ADH_01", facilityName: "Asokoro District Hospital", stateName: "FCT", organizationName: "Caritas Nigeria", datimCode: "FCT_ADH_01" },
            { id: "FCT_GH_02", facilityName: "Garki Hospital", stateName: "FCT", organizationName: "Caritas Nigeria", datimCode: "FCT_GH_02" },
            { id: "EN_UNTH_01", facilityName: "UNTH Enugu", stateName: "Enugu", organizationName: "Caritas Nigeria", datimCode: "EN_UNTH_01" },
            { id: "EN_MCH_02", facilityName: "Mother of Christ Hospital", stateName: "Enugu", organizationName: "CCFN", datimCode: "EN_MCH_02" }
          );
        }
        setAllFacilities(list);
      } catch (e) {
        console.error("Error loading facilities:", e);
      }
    };
    fetchAllFacilities();
  }, []);

  // Derive unique organizations from the flat facilities list
  const organizationsList = Array.from(new Set(allFacilities.map(f => f.organizationName)))
    .map(name => ({ id: name, organizationName: name }));

  // Derive unique states for the selected organizations
  const statesList = Array.from(
    new Set(
      allFacilities
        .filter(f => selectedOrgs.includes(f.organizationName))
        .map(f => f.stateName)
    )
  );

  // Derive facilities for the selected states & organizations
  const facilitiesList = allFacilities.filter(
    f => selectedOrgs.includes(f.organizationName) && selectedStates.includes(f.stateName)
  );

  // Toggle checks helper
  const handleToggle = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(x => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      selectedOrgs.length === 0 ||
      selectedStates.length === 0 ||
      selectedFacilities.length === 0 ||
      !startDate ||
      !proposedEndDate ||
      !assessmentType ||
      !fiscalYear
    ) {
      setError("Please select at least one organization, state, and facility, along with timelines.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const activityId = `SIMS_ACT_${Date.now()}`;
      await setDoc(doc(db, "sims_activities", activityId), {
        id: activityId,
        assessmentType,
        fiscalYear,
        startDate: startDate + "T00:00:00.000",
        proposedEndDate: proposedEndDate + "T00:00:00.000",
        states: selectedStates.join(","),
        organizations: selectedOrgs.join(","),
        facilities: selectedFacilities.join(","),
        status: "Active"
      });

      setSuccess("Site Assessment successfully scheduled and compiled in Firestore!");
      setStartDate("");
      setProposedEndDate("");
      setSelectedOrgs([]);
      setSelectedStates([]);
      setSelectedFacilities([]);

      setTimeout(() => {
        navigate("admin-dashboard");
      }, 1500);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to schedule assessment activity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Schedule Site Assessment" subtitle="SIMS Configurator">
      <div className="max-w-xl mx-auto">
        <div className="glass-panel p-8 rounded-2xl border border-slate-200/80 shadow-md">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-xs flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-700 text-xs flex gap-2 items-center">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Assessment Type */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Assessment Type</label>
              <div className="relative">
                <select
                  required
                  value={assessmentType}
                  onChange={e => setAssessmentType(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-wine-800 text-xs font-medium focus:outline-none transition appearance-none cursor-pointer"
                >
                  <option value="Comprehensive Assessment">Comprehensive Assessment</option>
                  <option value="Follow-up Assessment">Follow-up Assessment</option>
                  <option value="Ad-hoc Assessment">Ad-hoc Assessment</option>
                </select>
                <Layers className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            {/* Fiscal Year */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Fiscal Year</label>
              <div className="relative">
                <select
                  required
                  value={fiscalYear}
                  onChange={e => setFiscalYear(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-wine-800 text-xs font-medium focus:outline-none transition appearance-none cursor-pointer"
                >
                  <option value="FY 2024">FY 2024</option>
                  <option value="FY 2025">FY 2025</option>
                  <option value="FY 2026">FY 2026</option>
                </select>
                <CalendarDays className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            {/* Implementing Organizations (Multi-select) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Implementing Organizations</label>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 max-h-36 overflow-y-auto">
                {organizationsList.map(org => {
                  const checked = selectedOrgs.includes(org.id);
                  return (
                    <label key={org.id} className="flex items-center gap-3 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggle(selectedOrgs, setSelectedOrgs, org.id)}
                        className="rounded text-wine-800 focus:ring-wine-800/10"
                      />
                      <span>{org.organizationName || org.id}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Target States (Multi-select) */}
            {selectedOrgs.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Target States</label>
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 max-h-36 overflow-y-auto">
                  {statesList.length > 0 ? (
                    statesList.map(state => {
                      const checked = selectedStates.includes(state);
                      return (
                        <label key={state} className="flex items-center gap-3 text-xs font-medium text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggle(selectedStates, setSelectedStates, state)}
                            className="rounded text-wine-800 focus:ring-wine-800/10"
                          />
                          <span>{state}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 text-xs italic">No states mapped to selected organizations</p>
                  )}
                </div>
              </div>
            )}

            {/* Target Facilities (Multi-select) */}
            {selectedStates.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Target Facilities</label>
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 max-h-48 overflow-y-auto font-medium">
                  {facilitiesList.length > 0 ? (
                    facilitiesList.map(fac => {
                      const checked = selectedFacilities.includes(fac.facilityName);
                      return (
                        <label key={fac.id} className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggle(selectedFacilities, setSelectedFacilities, fac.facilityName)}
                            className="rounded text-wine-800 focus:ring-wine-800/10"
                          />
                          <span>{fac.facilityName} ({fac.datimCode || fac.id})</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 text-xs italic">No facilities found in selected state areas</p>
                  )}
                </div>
              </div>
            )}

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-wine-800 text-xs font-medium focus:outline-none transition"
                  />
                  <Calendar className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Proposed End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={proposedEndDate}
                    onChange={e => setProposedEndDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-wine-800 text-xs font-medium focus:outline-none transition"
                  />
                  <Calendar className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-bold rounded-xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Schedule Assessment Activity</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};
