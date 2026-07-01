import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { Calendar, Building, Landmark, CheckCircle, Loader2, AlertCircle, Layers, CalendarDays } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

export const CreateActivity: React.FC = () => {
  const { navigate, profile } = useApp();

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");        // default midnight
  const [proposedEndDate, setProposedEndDate] = useState("");
  const [endTime, setEndTime]     = useState("23:59");        // default end-of-day

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

  const [organizationsList, setOrganizationsList] = useState<any[]>([]);

  // Fuzzy matches organization names
  const isMatchOrg = (userOrgName: string, orgNameInDb: string): boolean => {
    if (!userOrgName || !orgNameInDb) return false;
    const normUser = userOrgName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normDb = orgNameInDb.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const match = normDb.includes(normUser) || normUser.includes(normDb);
    if (match) return true;

    const isUserCaritas = normUser.includes("caritas") || normUser.includes("ccfn");
    const isDbCaritas = normDb.includes("caritas") || normDb.includes("ccfn");
    if (isUserCaritas && isDbCaritas) return true;

    const isUserIhvn = normUser.includes("ihvn") || normUser.includes("virology");
    const isDbIhvn = normDb.includes("ihvn") || normDb.includes("virology");
    if (isUserIhvn && isDbIhvn) return true;

    const isUserApin = normUser.includes("apin") || normUser.includes("publichealth");
    const isDbApin = normDb.includes("apin") || normDb.includes("publichealth");
    if (isUserApin && isDbApin) return true;

    return false;
  };

  // Map organization name to their public logo image
  const getOrgLogo = (orgId: string): string => {
    const id = orgId.toLowerCase();
    if (id.includes("apin")) return "/APIN1.png";
    if (id.includes("caritas") && !id.includes("ccfn")) return "/CARITAS.png";
    if (id.includes("ccfn") || id.includes("catholic caritas")) return "/ccfn.png";
    if (id.includes("cihp") || id.includes("center for integrated")) return "/CIHP.png";
    if (id.includes("ecews") || id.includes("excellence community")) return "/ECEWS.png";
    if (id.includes("ihvn") || id.includes("institute of human")) return "/IHVN.png";
    return "";
  };

  // Load flat facilities and organizations once
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Facilities
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

        // Fetch Organizations directly from Firestore root collection
        const orgsSnap = await getDocs(collection(db, "organizations"));
        let orgsList: any[] = [];
        orgsSnap.forEach(docSnap => {
          orgsList.push({ id: docSnap.id, organizationName: docSnap.data().organizationName || docSnap.id });
        });
        
        if (orgsList.length === 0) {
          orgsList.push(
            { id: "Caritas Nigeria", organizationName: "Caritas Nigeria" },
            { id: "CCFN", organizationName: "CCFN" },
            { id: "IHVN", organizationName: "IHVN" }
          );
        }

        // Apply Super Admin vs regular Admin logic with fuzzy matches
        if (profile && profile.role !== "Super Admin" && profile.organizationName) {
          const userOrg = profile.organizationName;
          orgsList = orgsList.filter(o => isMatchOrg(userOrg, o.id) || isMatchOrg(userOrg, o.organizationName));
          if (orgsList.length > 0) {
            setSelectedOrgs([orgsList[0].id]);
          }
        }

        setOrganizationsList(orgsList);
      } catch (e) {
        console.error("Error loading facilities/organizations:", e);
      }
    };
    if (profile) {
      fetchAllData();
    }
  }, [profile]);

  // Derive unique states for the selected organizations
  const statesList = Array.from(
    new Set(
      allFacilities
        .filter(f => selectedOrgs.some(orgId => isMatchOrg(orgId, f.organizationName)))
        .map(f => f.stateName)
    )
  );

  // Derive facilities for the selected states & organizations
  const facilitiesList = allFacilities.filter(
    f => selectedOrgs.some(orgId => isMatchOrg(orgId, f.organizationName)) && selectedStates.includes(f.stateName)
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
        startDate: startDate ? `${startDate}T${startTime}:00.000` : "",
        proposedEndDate: proposedEndDate ? `${proposedEndDate}T${endTime}:00.000` : "",
        states: selectedStates.join(","),
        organizations: selectedOrgs.join(","),
        facilities: selectedFacilities.join(","),
        status: "Active"
      });

      setSuccess("Site Assessment successfully scheduled and compiled in Firestore!");
      setStartDate("");
      setStartTime("00:00");
      setProposedEndDate("");
      setEndTime("23:59");
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
                  const logo = getOrgLogo(org.id);
                  return (
                    <label key={org.id} className="flex items-center gap-3 text-xs font-medium text-slate-700 cursor-pointer select-none py-1 px-1.5 hover:bg-slate-50 rounded-lg transition">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggle(selectedOrgs, setSelectedOrgs, org.id)}
                        className="rounded text-wine-800 focus:ring-wine-800/10"
                      />
                      {logo && (
                        <img src={logo} className="w-5 h-5 object-contain rounded border border-slate-100 bg-white" alt="" />
                      )}
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

            {/* Dates & Time Grid */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Assessment Window</label>

              {/* Start */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-black text-wine-800 uppercase tracking-widest">Start</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value || "00:00")}
                      className="w-full px-4 py-3 bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="px-4 pb-2 text-[10px] text-slate-400">Defaults to 12:00 AM if no time selected</p>
              </div>

              {/* End */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-black text-wine-800 uppercase tracking-widest">Proposed End</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={proposedEndDate}
                      onChange={e => setProposedEndDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value || "23:59")}
                      className="w-full px-4 py-3 bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="px-4 pb-2 text-[10px] text-slate-400">Defaults to 11:59 PM if no time selected</p>
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
