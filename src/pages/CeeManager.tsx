import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { collection, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import ceesData from "../data/cees.json";
import questionsData from "../data/questions.json";
import { Edit2, Trash2, Plus, Save, X, Settings2, HelpCircle, FileText, Check } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";

export const CeeManager: React.FC = () => {
  const { navigate } = useApp();
  const [selectedSet, setSelectedSet] = useState("1A");
  const [cees, setCees] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const setTitles: Record<string, string> = {
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
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const ceesSnap = await getDocs(collection(db, "cees"));
      const cList: any[] = [];
      ceesSnap.forEach(d => cList.push({ id: d.id, ...d.data() }));
      
      const qSnap = await getDocs(collection(db, "questions"));
      const qList: any[] = [];
      qSnap.forEach(d => qList.push({ id: d.id, ...d.data() }));

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

  const activeCees = cees.filter(c => c.setId === selectedSet);

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
        <div className="flex items-center gap-3">
          <select
            value={selectedSet}
            onChange={e => setSelectedSet(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none shadow-sm"
          >
            {Object.entries(setTitles).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
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
      }
    >
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-semibold">Loading data...</div>
        ) : (
          <div className="space-y-6">
            {activeCees.map(cee => {
              const ceeQs = questions.filter(q => q.ceeId === cee.id);

              return (
                <div key={cee.id} className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-wine-800 uppercase tracking-widest">{cee.abbreviatedTitle} ({cee.id})</span>
                      <h3 className="text-lg font-bold text-slate-800 mt-0.5">{cee.name}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditCee(cee)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-wine-800 hover:bg-wine-50 transition"
                        title="Edit CEE"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCeeDoc(cee.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
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
                      {ceeQs.map((q, qIdx) => (
                        <div key={q.id} className="p-3 bg-white border border-slate-100 rounded-xl text-xs flex justify-between items-center">
                          <div className="flex-1 pr-4">
                            <span className="font-bold text-slate-400">Q{qIdx + 1}.</span>{" "}
                            <span className="text-slate-700 font-medium">{q.text}</span>
                            <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 font-bold rounded bg-slate-100 text-slate-500">
                              {q.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
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
