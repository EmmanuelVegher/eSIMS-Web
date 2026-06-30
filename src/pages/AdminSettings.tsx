import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { Building, Landmark, CheckCircle, Loader2, AlertCircle, Plus, Trash2, MapPin, Tag } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

export const AdminSettings: React.FC = () => {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState<"orgs" | "states" | "facilities">("orgs");

  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data lists
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  // Create Organization Form State
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgAddress, setNewOrgAddress] = useState("");

  // Create State Form State
  const [selectedOrgForState, setSelectedOrgForState] = useState("");
  const [newStateName, setNewStateName] = useState("");

  // Create Facility Form State
  const [selectedOrgForFac, setSelectedOrgForFac] = useState("");
  const [selectedStateForFac, setSelectedStateForFac] = useState("");
  const [newFacName, setNewFacName] = useState("");
  const [newFacLga, setNewFacLga] = useState("");
  const [newFacCode, setNewFacCode] = useState("");

  // Fetch all setup configurations from Firestore
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Organizations
      const orgsSnap = await getDocs(collection(db, "organizations"));
      const orgsList: any[] = [];
      orgsSnap.forEach(d => orgsList.push({ id: d.id, ...d.data() }));
      setOrganizations(orgsList);

      // 2. Fetch States from flat collection (fallback to empty)
      const statesSnap = await getDocs(collection(db, "states"));
      const statesList: any[] = [];
      statesSnap.forEach(d => statesList.push({ id: d.id, ...d.data() }));
      setStates(statesList);

      // 3. Fetch Facilities from flat collection
      const facsSnap = await getDocs(collection(db, "facilities"));
      const facsList: any[] = [];
      facsSnap.forEach(d => facsList.push({ id: d.id, ...d.data() }));
      setFacilities(facsList);

    } catch (e: any) {
      console.error(e);
      setError("Failed to load configuration lists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter states based on selected org in Facility Form
  const statesAvailableForFac = states.filter(s => s.organizationName === selectedOrgForFac);

  // Form Handlers
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const orgId = newOrgName.trim();
      const orgRef = doc(db, "organizations", orgId);
      await setDoc(orgRef, {
        organizationName: orgId,
        address: newOrgAddress.trim()
      });

      setSuccess(`Organization "${orgId}" successfully created!`);
      setNewOrgName("");
      setNewOrgAddress("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForState || !newStateName.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const stateName = newStateName.trim();
    const orgName = selectedOrgForState;
    const docKey = `${stateName}_${orgName}`;

    try {
      // 1. Save to flat state collection
      await setDoc(doc(db, "states", docKey), {
        stateName,
        organizationName: orgName
      });

      // 2. Save backward compatible subcollection path: /organizations/{orgId}/Facilities/{stateId}
      await setDoc(doc(db, "organizations", orgName, "Facilities", stateName), {
        stateName,
        organizationName: orgName
      });

      setSuccess(`State "${stateName}" mapped to organization "${orgName}" successfully!`);
      setNewStateName("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to map state.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedOrgForFac ||
      !selectedStateForFac ||
      !newFacName.trim() ||
      !newFacLga.trim() ||
      !newFacCode.trim()
    ) {
      setError("Please fill out all facility parameters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const facCode = newFacCode.trim().toUpperCase();
    const facName = newFacName.trim();
    const facLga = newFacLga.trim();
    const orgName = selectedOrgForFac;
    const stateName = selectedStateForFac;

    try {
      // 1. Save to flat facilities root collection
      await setDoc(doc(db, "facilities", facCode), {
        id: facCode,
        facilityName: facName,
        lga: facLga,
        datimCode: facCode,
        organizationName: orgName,
        stateName: stateName
      });

      // 2. Save backward compatible nested subcollection: /organizations/{orgId}/Facilities/{stateId}/{stateId}/{facId}
      await setDoc(doc(db, "organizations", orgName, "Facilities", stateName, stateName, facCode), {
        facilityName: facName,
        lga: facLga,
        datimCode: facCode,
        organizationName: orgName,
        stateName: stateName
      });

      setSuccess(`Facility "${facName}" registered successfully!`);
      setNewFacName("");
      setNewFacLga("");
      setNewFacCode("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create facility.");
    } finally {
      setLoading(false);
    }
  };

  // Delete helpers
  const handleDeleteOrg = async (orgId: string) => {
    if (!window.confirm(`Are you sure you want to delete Organization "${orgId}"? This will not cascade to facilities.`)) return;
    try {
      await deleteDoc(doc(db, "organizations", orgId));
      setSuccess("Organization deleted.");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteState = async (stateId: string, stateName: string, orgName: string) => {
    if (!window.confirm(`Are you sure you want to delete State mapping "${stateName}"?`)) return;
    try {
      await deleteDoc(doc(db, "states", stateId));
      await deleteDoc(doc(db, "organizations", orgName, "Facilities", stateName));
      setSuccess("State mapping deleted.");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteFacility = async (facId: string, orgName: string, stateName: string) => {
    if (!window.confirm(`Are you sure you want to delete Facility "${facId}"?`)) return;
    try {
      await deleteDoc(doc(db, "facilities", facId));
      await deleteDoc(doc(db, "organizations", orgName, "Facilities", stateName, stateName, facId));
      setSuccess("Facility deleted.");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AdminLayout
      title="Master Data Configuration"
      subtitle="SIMS System Configuration"
      headerRight={loading ? <Loader2 className="w-5 h-5 animate-spin text-wine-700" /> : undefined}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs flex gap-2 items-center shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-green-50 text-green-700 text-xs flex gap-2 items-center shadow-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab("orgs")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "orgs"
                ? "border-b-2 border-wine-800 text-wine-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            1. Organizations ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab("states")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "states"
                ? "border-b-2 border-wine-800 text-wine-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            2. State Mappings ({states.length})
          </button>
          <button
            onClick={() => setActiveTab("facilities")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "facilities"
                ? "border-b-2 border-wine-800 text-wine-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            3. Health Facilities ({facilities.length})
          </button>
        </div>

        {/* TAB CONTENTS */}

        {/* 1. Organizations Tab */}
        {activeTab === "orgs" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm max-h-[500px] overflow-y-auto space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Registered Partners</h3>
              {organizations.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No organizations registered yet.</p>
              ) : (
                organizations.map(org => (
                  <div key={org.id} className="flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition">
                    <div className="flex gap-3 items-center">
                      <div className="p-2 rounded-lg bg-wine-50 text-wine-800 shrink-0">
                        <Building className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{org.organizationName}</h4>
                        {org.address && <p className="text-[10px] text-slate-400 mt-0.5">{org.address}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteOrg(org.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white self-start">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Add Organization</h3>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Partner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Caritas Nigeria"
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Office Address</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Abuja Secretariat Office"
                    value={newOrgAddress}
                    onChange={e => setNewOrgAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Organization</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. States Tab */}
        {activeTab === "states" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm max-h-[500px] overflow-y-auto space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Mapped States</h3>
              {states.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No state mappings registered yet.</p>
              ) : (
                states.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition">
                    <div className="flex gap-3 items-center">
                      <div className="p-2 rounded-lg bg-wine-50 text-wine-800 shrink-0">
                        <Landmark className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{s.stateName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Assigned to: {s.organizationName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteState(s.id, s.stateName, s.organizationName)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white self-start">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Map Target State</h3>
              <form onSubmit={handleCreateState} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Organization</label>
                  <select
                    required
                    value={selectedOrgForState}
                    onChange={e => setSelectedOrgForState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.organizationName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">State Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abia"
                    value={newStateName}
                    onChange={e => setNewStateName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Map State</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 3. Facilities Tab */}
        {activeTab === "facilities" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm max-h-[500px] overflow-y-auto space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Registered Facilities</h3>
              {facilities.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No health facilities registered yet.</p>
              ) : (
                facilities.map(fac => (
                  <div key={fac.id} className="flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition">
                    <div className="flex gap-3 items-center">
                      <div className="p-2 rounded-lg bg-wine-50 text-wine-800 shrink-0">
                        <MapPin className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{fac.facilityName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {fac.stateName} State • {fac.lga} LGA • {fac.organizationName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-wine-900 px-2 py-0.5 bg-wine-50 rounded border border-wine-100 uppercase tracking-wider shrink-0">
                        {fac.datimCode}
                      </span>
                      <button
                        onClick={() => handleDeleteFacility(fac.id, fac.organizationName, fac.stateName)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white self-start">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Register Facility</h3>
              <form onSubmit={handleCreateFacility} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Organization</label>
                  <select
                    required
                    value={selectedOrgForFac}
                    onChange={e => {
                      setSelectedOrgForFac(e.target.value);
                      setSelectedStateForFac("");
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.organizationName}</option>
                    ))}
                  </select>
                </div>

                {selectedOrgForFac && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">State</label>
                    <select
                      required
                      value={selectedStateForFac}
                      onChange={e => setSelectedStateForFac(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                    >
                      <option value="">Select State</option>
                      {statesAvailableForFac.map(s => (
                        <option key={s.id} value={s.stateName}>{s.stateName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Facility Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abia One Stop Shop (OSS)"
                    value={newFacName}
                    onChange={e => setNewFacName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">LGA Area</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oredo"
                    value={newFacLga}
                    onChange={e => setNewFacLga(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">DATIM Code / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AB_OSS_01"
                    value={newFacCode}
                    onChange={e => setNewFacCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Facility</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
