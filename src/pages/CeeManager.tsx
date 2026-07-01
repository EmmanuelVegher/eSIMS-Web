import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import ceesData from "../data/cees.json";
import questionsData from "../data/questions.json";
import { Edit2, Trash2, Plus, Save, X, Settings2, HelpCircle, FileText, Check, Eye, EyeOff, Pencil, CheckCircle } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

export const CeeManager: React.FC = () => {
  const { navigate } = useApp();
  const [selectedSet, setSelectedSet] = useState("1A");
  const [searchQuery, setSearchQuery] = useState("");
  const [cees, setCees] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Subtabs navigation
  const [activeSubTab, setActiveSubTab] = useState<"cees" | "sets">("cees");

  // Edit states
  const [editingCee, setEditingCee] = useState<any | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [showAddCee, setShowAddCee] = useState(false);
  const [showAddQ, setShowAddQ] = useState(false);

  // CEE form
  const [ceeId, setCeeId] = useState("");
  const [ceeName, setCeeName] = useState("");
  const [ceeDesc, setCeeDesc] = useState("");
  const [ceeAbbr, setCeeAbbr] = useState("");
  const [ceeStandard, setCeeStandard] = useState("");
  const [ceeInstructions, setCeeInstructions] = useState("");
  const [ceeReq, setCeeReq] = useState(false);
  const [ceeSupp, setCeeSupp] = useState(false);
  const [ceeRemote, setCeeRemote] = useState(false);

  // Question form
  const [qId, setQId] = useState("");
  const [qCeeId, setQCeeId] = useState("");
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("yes_no");
  const [qOptions, setQOptions] = useState<string[]>([]);
  const [qCorrect, setQCorrect] = useState("");
  const [qScoring, setQScoring] = useState("");

  // Sets managing states
  const [setTitles, setSetTitles] = useState<Record<string, string>>({});
  const [newSetId, setNewSetId] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const ceesSnap = await getDocs(collection(db, "cees"));
      const cList: any[] = [];
      ceesSnap.forEach(d => cList.push({ id: d.id, ...d.data() }));
      
      const qSnap = await getDocs(collection(db, "questions"));
      const qList: any[] = [];
      qSnap.forEach(d => qList.push({ id: d.id, ...d.data() }));

      // Fetch Sets
      const setsSnap = await getDocs(collection(db, "sets"));
      let setsList: any[] = [];
      setsSnap.forEach(d => setsList.push({ id: d.id, ...d.data() }));

      if (setsList.length === 0) {
        const defaultSets = {
          "1A": "Set 1A: All Sites - General",
          "1B": "Set 1B: Commodities Management",
          "1C": "Set 1C: Data Quality",
          "1D": "Set 1D: Infection Prevention & Control",
          "2A": "Set 2A: Care & Treatment (Gen Pop)",
          "2B": "Set 2B: Care & Treatment (Peds)",
          "3A": "Set 3A: Key Populations - General",
          "3B": "Set 3B: Care & Treatment (Key Pops)",
          "4A": "Set 4A: PMTCT - ANC & L&D",
          "4B": "Set 4B: HIV Exposed Infants (HEI)",
          "5": "Set 5: Voluntary Medical Male Circumcision (VMMC)",
          "6": "Set 6: AGYW, GBV and OVC",
          "7": "Set 7: HTS",
          "8": "Set 8: TB Treatment Service Point",
          "9": "Set 9: MAT Services",
          "10": "Set 10: Laboratory",
        };
        for (const [key, name] of Object.entries(defaultSets)) {
          await setDoc(doc(db, "sets", key), {
            id: key,
            name: name
          });
          setsList.push({ id: key, name: name });
        }
      }

      const titlesMap: Record<string, string> = {};
      setsList.forEach(s => {
        titlesMap[s.id] = s.name;
      });
      setSetTitles(titlesMap);

      setCees(cList.length ? cList : ceesData);
      setQuestions(qList.length ? qList : questionsData);
    } catch (e) {
      console.error(e);
      setCees(ceesData);
      setQuestions(questionsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCees = cees.filter(c => {
    const matchSet = c.setId === selectedSet;
    if (!matchSet) return false;
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.id?.toLowerCase().includes(query) ||
      c.abbreviatedTitle?.toLowerCase().includes(query) ||
      c.standard?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    );
  });

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetId.trim() || !newSetName.trim()) return;

    setLoading(true);
    try {
      const setId = newSetId.trim();
      const setName = newSetName.trim();

      // If editing and ID changed, delete the old one
      if (editingSetId && editingSetId !== setId) {
        await deleteDoc(doc(db, "sets", editingSetId));
      }

      await setDoc(doc(db, "sets", setId), {
        id: setId,
        name: setName
      });

      // Reload sets
      const setsSnap = await getDocs(collection(db, "sets"));
      const titlesMap: Record<string, string> = {};
      setsSnap.forEach(d => {
        const data = d.data();
        titlesMap[d.id] = data.name || d.id;
      });
      setSetTitles(titlesMap);

      setNewSetId("");
      setNewSetName("");
      setEditingSetId(null);
    } catch (err) {
      console.error("Error saving CEE set:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEditSet = (setId: string, setName: string) => {
    setEditingSetId(setId);
    setNewSetId(setId);
    setNewSetName(setName);
  };

  const cancelEditSet = () => {
    setEditingSetId(null);
    setNewSetId("");
    setNewSetName("");
  };

  const handleDeleteSet = async (setId: string) => {
    if (!window.confirm(`Are you sure you want to delete Set "${setId}"?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "sets", setId));
      
      // Reload sets
      const setsSnap = await getDocs(collection(db, "sets"));
      const titlesMap: Record<string, string> = {};
      setsSnap.forEach(d => {
        const data = d.data();
        titlesMap[d.id] = data.name || d.id;
      });
      setSetTitles(titlesMap);
    } catch (err) {
      console.error("Error deleting CEE set:", err);
    } finally {
      setLoading(false);
    }
  };

  // CRUD actions
  const saveCeeDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ceeId || !ceeName) return;

    const docData = {
      id: ceeId,
      name: ceeName,
      description: ceeDesc,
      abbreviatedTitle: ceeAbbr,
      setId: selectedSet,
      required: ceeReq,
      supportive: ceeSupp,
      remote: ceeRemote,
      standard: ceeStandard,
      instructions: ceeInstructions,
      imageCodes: ceeRemote ? ["Remote"] : []
    };

    try {
      await setDoc(doc(db, "cees", ceeId), docData);
      // Update local state
      setCees(prev => {
        const existingIdx = prev.findIndex(c => c.id === ceeId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = docData;
          return updated;
        }
        return [...prev, docData];
      });
      closeCeeModal();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCeeDoc = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this CEE and its questions?")) return;
    try {
      await deleteDoc(doc(db, "cees", id));
      setCees(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleQuestionActive = async (question: any) => {
    const currentActive = question.isActive !== false;
    const nextActive = !currentActive;

    try {
      // 1. Save to Firestore questions collection
      await setDoc(doc(db, "questions", question.id), {
        ...question,
        isActive: nextActive
      });

      // 2. Update local state array
      setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, isActive: nextActive } : q));
    } catch (e: any) {
      console.error("Error toggling question state:", e);
      alert("Failed to toggle question state: " + e.message);
    }
  };

  const toggleCeeActive = async (cee: any) => {
    const currentActive = cee.isActive !== false;
    const nextActive = !currentActive;

    try {
      // 1. Save to Firestore cees collection
      await setDoc(doc(db, "cees", cee.id), {
        ...cee,
        isActive: nextActive
      });

      // 2. Update local state array
      setCees(prev => prev.map(c => c.id === cee.id ? { ...c, isActive: nextActive } : c));
    } catch (e: any) {
      console.error("Error toggling CEE state:", e);
      alert("Failed to toggle CEE state: " + e.message);
    }
  };

  const openEditCee = (cee: any) => {
    setEditingCee(cee);
    setCeeId(cee.id);
    setCeeName(cee.name);
    setCeeDesc(cee.description || "");
    setCeeAbbr(cee.abbreviatedTitle || "");
    setCeeStandard(cee.standard || "");
    setCeeInstructions(cee.instructions || "");
    setCeeReq(cee.required || false);
    setCeeSupp(cee.supportive || false);
    setCeeRemote(cee.remote || false);
    setShowAddCee(true);
  };

  const closeCeeModal = () => {
    setEditingCee(null);
    setCeeId("");
    setCeeName("");
    setCeeDesc("");
    setCeeAbbr("");
    setCeeStandard("");
    setCeeInstructions("");
    setCeeReq(false);
    setCeeSupp(false);
    setCeeRemote(false);
    setShowAddCee(false);
  };

  return (
    <AdminLayout
      title="CEE & Question Manager"
      subtitle="Database Configurator"
      headerRight={
        activeSubTab === "cees" ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search CEEs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-wine-800 shadow-sm w-44 md:w-52"
            />
            <select
              value={selectedSet}
              onChange={e => setSelectedSet(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none shadow-sm"
            >
              {Object.keys(setTitles)
                .sort((a, b) => {
                  const numA = parseInt(a, 10);
                  const numB = parseInt(b, 10);
                  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
                  return a.localeCompare(b);
                })
                .map(key => (
                  <option key={key} value={key}>{setTitles[key]}</option>
                ))}
            </select>
            <button
              onClick={() => setShowAddCee(true)}
              className="px-3.5 py-1.5 bg-wine-800 hover:bg-wine-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add CEE</span>
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="max-w-6xl mx-auto">
        {/* Subtabs Selector */}
        <div className="flex border-b border-slate-200 gap-6 mb-6">
          <button
            onClick={() => setActiveSubTab("cees")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition ${
              activeSubTab === "cees"
                ? "border-b-2 border-wine-800 text-wine-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            CEEs & Questions
          </button>
          <button
            onClick={() => setActiveSubTab("sets")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition ${
              activeSubTab === "sets"
                ? "border-b-2 border-wine-800 text-wine-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Manage CEE Sets ({Object.keys(setTitles).length})
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-semibold">Loading data...</div>
        ) : activeSubTab === "cees" ? (
          <div className="space-y-6">
             {activeCees.map(cee => {
              const ceeQs = questions.filter(q => q.ceeId === cee.id);
              const isCeeActive = cee.isActive !== false;

              return (
                <div key={cee.id} className={`glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 transition ${
                  !isCeeActive ? "opacity-60 bg-slate-50/50" : ""
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-wine-800 uppercase tracking-widest">{cee.abbreviatedTitle} ({cee.id})</span>
                      <h3 className={`text-lg font-bold text-slate-800 mt-0.5 ${!isCeeActive ? "line-through text-slate-400" : ""}`}>{cee.name}</h3>
                      {!isCeeActive && (
                        <span className="inline-block mt-1 text-[9px] uppercase px-1.5 py-0.5 font-black rounded bg-red-50 text-red-700 border border-red-200/40">
                          Inactive CEE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCeeActive(cee)}
                        className={`p-1.5 rounded-lg border transition ${
                          isCeeActive
                            ? "border-slate-200 text-slate-400 hover:text-wine-800 hover:bg-wine-50"
                            : "border-red-200 text-red-500 hover:bg-red-50"
                        }`}
                        title={isCeeActive ? "Deactivate CEE" : "Activate CEE"}
                      >
                        {isCeeActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditCee(cee)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-wine-800 hover:bg-wine-50 transition"
                        title="Edit CEE"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCeeDoc(cee.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete CEE"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1"><FileText className="w-4 h-4" /> Standard Definition</span>
                    <p className="whitespace-pre-line">{cee.standard}</p>
                  </div>

                  {/* Nested Questions Summary */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CEE Question bank ({ceeQs.length} questions)</h4>
                    <div className="space-y-2">
                       {ceeQs.map((q, qIdx) => {
                        const isQActive = q.isActive !== false;
                        return (
                          <div
                            key={q.id}
                            className={`p-3 bg-white border border-slate-100 rounded-xl text-xs flex justify-between items-center transition ${
                              !isQActive ? "opacity-60 bg-slate-50/50" : ""
                            }`}
                          >
                            <div className="flex-1 pr-4">
                              <span className="font-bold text-slate-400">Q{qIdx + 1}.</span>{" "}
                              <span className={`text-slate-700 font-medium ${!isQActive ? "line-through text-slate-400" : ""}`}>{q.text}</span>
                              <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 font-bold rounded bg-slate-100 text-slate-500">
                                {q.type}
                              </span>
                              {!isQActive && (
                                <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 font-black rounded bg-red-50 text-red-700 border border-red-200/40">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => toggleQuestionActive(q)}
                              className={`p-1.5 rounded-lg border transition ${
                                isQActive
                                  ? "border-slate-200 text-slate-400 hover:text-wine-800 hover:bg-wine-50"
                                  : "border-red-200 text-red-500 hover:bg-red-50"
                              }`}
                              title={isQActive ? "Deactivate Question" : "Activate Question"}
                            >
                              {isQActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* List of sets on left */}
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm max-h-[500px] overflow-y-auto space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Registered CEE Sets</h3>
              {Object.keys(setTitles).length === 0 ? (
                <p className="text-slate-400 text-xs italic">No sets found.</p>
              ) : (
                Object.entries(setTitles)
                  .sort((a, b) => {
                    const numA = parseInt(a[0], 10);
                    const numB = parseInt(b[0], 10);
                    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
                    return a[0].localeCompare(b[0]);
                  })
                  .map(([id, name]) => (
                    <div key={id} className="flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition">
                      <div className="flex gap-3 items-center">
                        <div className="p-2 rounded-lg bg-wine-50 text-wine-800 shrink-0">
                          <Settings2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Code/ID: {id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditSet(id, name)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-wine-800 hover:bg-wine-50 transition shrink-0"
                          title="Edit Set"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSet(id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                          title="Delete Set"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Set Edit/Add Form on right */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm bg-white self-start">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">
                {editingSetId ? "Edit CEE Set" : "Add CEE Set"}
              </h3>
              <form onSubmit={handleSaveSet} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Set Code / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11"
                    value={newSetId}
                    onChange={e => setNewSetId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Set Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Set 11: Community Care"
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-wine-800 transition"
                  />
                </div>
                <div className="flex gap-2">
                  {editingSetId && (
                    <button
                      type="button"
                      onClick={cancelEditSet}
                      className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`py-2.5 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm ${
                      editingSetId ? "w-1/2 bg-wine-800 hover:bg-wine-700" : "w-full bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700"
                    }`}
                  >
                    {editingSetId ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingSetId ? "Save Changes" : "Create Set"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* CEE Add/Edit Modal */}
      {showAddCee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 relative border border-slate-100 shadow-2xl">
            <button
              onClick={closeCeeModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-slate-800 text-lg">
              {editingCee ? "Modify CEE Definition" : "Create New CEE"}
            </h3>

            <form onSubmit={saveCeeDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CEE ID (must be unique)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCee}
                  placeholder="e.g. S_01_01"
                  value={ceeId}
                  onChange={e => setCeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-wine-800 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Abbreviated Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SE"
                    value={ceeAbbr}
                    onChange={e => setCeeAbbr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-wine-800 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stakeholder Engagement"
                    value={ceeDesc}
                    onChange={e => setCeeDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-wine-800 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Full CEE Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stakeholder Engagement [ALL SITES-GEN]"
                  value={ceeName}
                  onChange={e => setCeeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-wine-800 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">PEPFAR Standard Statement</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste CEE standard requirement statement..."
                  value={ceeStandard}
                  onChange={e => setCeeStandard(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-wine-800 text-xs focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Scoring Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Paste evaluation instructions..."
                  value={ceeInstructions}
                  onChange={e => setCeeInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-wine-800 text-xs focus:outline-none resize-y"
                />
              </div>

              <div className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={ceeReq}
                    onChange={e => setCeeReq(e.target.checked)}
                    className="rounded text-wine-800 focus:ring-wine-800 w-4 h-4 border-slate-300"
                  />
                  <span>Required (MPR)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={ceeSupp}
                    onChange={e => setCeeSupp(e.target.checked)}
                    className="rounded text-wine-800 focus:ring-wine-800 w-4 h-4 border-slate-300"
                  />
                  <span>Supportive</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={ceeRemote}
                    onChange={e => setCeeRemote(e.target.checked)}
                    className="rounded text-wine-800 focus:ring-wine-800 w-4 h-4 border-slate-300"
                  />
                  <span>Remote Allowed</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-wine-800 hover:bg-wine-700 text-white font-bold rounded-xl transition duration-200 shadow flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>Save CEE Details</span>
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>

  );
};
