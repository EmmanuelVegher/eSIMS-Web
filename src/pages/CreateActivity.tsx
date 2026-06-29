import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, doc, addDoc, getDocs, setDoc } from "firebase/firestore";
import { ArrowLeft, Calendar, Building, Landmark, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export const CreateActivity: React.FC = () => {
  const { navigate } = useApp();

  const [startDate, setStartDate] = useState("");
  const [proposedEndDate, setProposedEndDate] = useState("");
  
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("");

  // Dropdown lists
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgsSnap = await getDocs(collection(db, "organizations"));
        const orgsList: any[] = [];
        orgsSnap.forEach(docSnap => {
          orgsList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setOrganizations(orgsList.length ? orgsList : [
          { id: "Caritas Nigeria", organizationName: "Caritas Nigeria" },
          { id: "CCFN", organizationName: "CCFN" },
          { id: "IHVN", organizationName: "IHVN" }
        ]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchOrgs();
  }, []);

  // Fetch states when Org changes
  useEffect(() => {
    if (!selectedOrg) {
      setStates([]);
      setSelectedState("");
      return;
    }
    const fetchStates = async () => {
      try {
        const statesSnap = await getDocs(collection(db, "organizations", selectedOrg, "Facilities"));
        const statesList: string[] = [];
        statesSnap.forEach(docSnap => {
          statesList.push(docSnap.id);
        });
        setStates(statesList);
      } catch (e) {
        console.error(e);
        setStates(["FCT", "Enugu"]); // fallbacks
      }
    };
    fetchStates();
  }, [selectedOrg]);

  // Fetch facilities when State changes
  useEffect(() => {
    if (!selectedState || !selectedOrg) {
      setFacilities([]);
      setSelectedFacility("");
      return;
    }
    const fetchFacilities = async () => {
      try {
        const facSnap = await getDocs(collection(db, "organizations", selectedOrg, "Facilities", selectedState, selectedState));
        const facList: any[] = [];
        facSnap.forEach(docSnap => {
          facList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setFacilities(facList);
      } catch (e) {
        console.error(e);
      }
    };
    fetchFacilities();
  }, [selectedState, selectedOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !selectedState || !selectedFacility || !startDate || !proposedEndDate) {
      setError("Please fill in all details.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const activityId = `SIMS_ACT_${Date.now()}`;
      await setDoc(doc(db, "sims_activities", activityId), {
        id: activityId,
        startDate,
        proposedEndDate,
        states: selectedState,
        organizations: selectedOrg,
        facilities: selectedFacility
      });

      setSuccess("Site Assessment successfully scheduled and compiled in Firestore!");
      setStartDate("");
      setProposedEndDate("");
      setSelectedOrg("");
      setSelectedState("");
      setSelectedFacility("");

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
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("admin-dashboard")}
            className="p-2 rounded-lg hover:bg-wine-50 text-slate-500 hover:text-wine-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-wine-800 uppercase tracking-widest">TIMS Configurator</span>
            <h1 className="text-lg font-bold text-slate-800">Schedule Site Assessment</h1>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-8">
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
            
            {/* Cascading Org Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Implementing Organization</label>
              <div className="relative">
                <select
                  required
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-wine-800 text-xs font-medium focus:outline-none transition appearance-none"
                >
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.organizationName || org.id}</option>
                  ))}
                </select>
                <Building className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            {/* Cascading State Dropdown */}
            {selectedOrg && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Target State</label>
                <div className="relative">
                  <select
                    required
                    value={selectedState}
                    onChange={e => setSelectedState(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-wine-800 text-xs font-medium focus:outline-none transition appearance-none"
                  >
                    <option value="">Select State</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <Landmark className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>
            )}

            {/* Cascading Facility Dropdown */}
            {selectedState && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Target Facility</label>
                <div className="relative">
                  <select
                    required
                    value={selectedFacility}
                    onChange={e => setSelectedFacility(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-wine-800 text-xs font-medium focus:outline-none transition appearance-none"
                  >
                    <option value="">Select Facility</option>
                    {facilities.map(fac => (
                      <option key={fac.id} value={fac.facilityName}>{fac.facilityName} ({fac.datimCode || fac.id})</option>
                    ))}
                  </select>
                  <Building className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
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
      </main>
    </div>
  );
};
