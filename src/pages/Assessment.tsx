import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import ceesData from "../data/cees.json";
import questionsData from "../data/questions.json";
import {
  ArrowLeft,
  BookOpen,
  Info,
  CheckSquare,
  HelpCircle,
  Save,
  Check,
  ChevronRight,
  Shield,
  Loader2,
  AlertCircle
} from "lucide-react";

interface QuestionResponse {
  questionId: string;
  response: any;
  score: number;
  status: "Red" | "Yellow" | "Green" | "Gray";
}

export const Assessment: React.FC = () => {
  const { profile, activeActivity, navigate, activeCeeId, setActiveCeeId } = useApp();

  const [selectedSet, setSelectedSet] = useState("1A");
  const [cees, setCees] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Set titles mapping
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
    "5": "Set 5: Voluntary Medical Male Circumcision (VMMC)",
    "6": "Set 6: AGYW, GBV and OVC",
    "7": "Set 7: HTS",
    "8": "Set 8: TB Treatment Service Point",
    "9": "Set 9: MAT Services",
    "10": "Set 10: Laboratory",
  };

  // Load CEEs and questions
  useEffect(() => {
    // Filter CEEs by active set
    const filteredCees = ceesData.filter((cee: any) => cee.setId === selectedSet);
    setCees(filteredCees);
    
    // Default first CEE as active if none selected
    if (filteredCees.length > 0 && (!activeCeeId || !filteredCees.some(c => c.id === activeCeeId))) {
      setActiveCeeId(filteredCees[0].id);
    }
  }, [selectedSet]);

  // Load questions and existing responses from Firestore
  useEffect(() => {
    if (!activeCeeId || !activeActivity) return;

    const loadQuestionsAndResponses = async () => {
      setLoading(true);
      try {
        // Filter questions for active CEE
        const filteredQ = questionsData.filter((q: any) => q.ceeId === activeCeeId);
        setQuestions(filteredQ);

        // Fetch existing responses from Firestore
        const qQuery = query(
          collection(db, "question_response"),
          where("eSIMS_ID", "==", activeActivity.id),
          where("cee_id", "==", activeCeeId)
        );
        const qSnap = await getDocs(qQuery);
        const existingResponses: Record<string, QuestionResponse> = {};
        
        qSnap.forEach(docSnap => {
          const data = docSnap.data();
          existingResponses[data.question_id] = {
            questionId: data.question_id,
            response: data.response,
            score: data.score,
            status: data.status
          };
        });

        setResponses(existingResponses);
      } catch (e) {
        console.error("Error loading questions & responses:", e);
      } finally {
        setLoading(false);
      }
    };

    loadQuestionsAndResponses();
  }, [activeCeeId, activeActivity]);

  // ----------------------------------------------------
  // SCORING ENGINE
  // ----------------------------------------------------
  const calculateScoreAndStatus = (q: any, answer: any): { score: number; status: "Red" | "Yellow" | "Green" | "Gray" } => {
    if (answer === null || answer === undefined) {
      return { score: 0, status: "Gray" };
    }

    if (q.type === "yes_no") {
      const idx = answer === "Yes" ? 1 : 0;
      if (q.tickBoxConditionRed?.includes(idx)) return { score: 1, status: "Red" };
      if (q.tickBoxConditionYellow?.includes(idx)) return { score: 2, status: "Yellow" };
      if (q.tickBoxConditionGreen?.includes(idx)) return { score: 3, status: "Green" };
    } 
    
    if (q.type === "tick_box") {
      const count = (answer as string[]).length;
      if (q.tickBoxConditionRed?.includes(count)) return { score: 1, status: "Red" };
      if (q.tickBoxConditionYellow?.includes(count)) return { score: 2, status: "Yellow" };
      if (q.tickBoxConditionGreen?.includes(count)) return { score: 3, status: "Green" };
    } 
    
    if (q.type === "numerator_denominator") {
      const { num, den } = answer as { num: number; den: number };
      const scoreVal = den > 0 ? Math.round((num / den) * 100) : 0;
      
      // Evaluate tableOptions like: _calculateNumeratorDenominatorScore(question) < 90
      let status: "Red" | "Yellow" | "Green" | "Gray" = "Red";
      for (let i = 0; i < (q.tableOptions || []).length; i++) {
        const cond = q.tableOptions[i];
        if (!cond) continue;
        const match = cond.match(/([<>]=?|==)\s*(\d+)/);
        if (match) {
          const op = match[1];
          const val = parseInt(match[2]);
          let isMatch = false;
          if (op === "<") isMatch = scoreVal < val;
          else if (op === ">") isMatch = scoreVal > val;
          else if (op === "<=") isMatch = scoreVal <= val;
          else if (op === ">=") isMatch = scoreVal >= val;
          else if (op === "==") isMatch = scoreVal === val;

          if (isMatch) {
            if (i === 0) status = "Red";
            if (i === 1) status = "Yellow";
            if (i === 2) status = "Green";
          }
        }
      }
      return { score: status === "Red" ? 1 : status === "Yellow" ? 2 : 3, status };
    }

    if (q.type === "table") {
      // Formatted row data: rows[2][5] is absolute difference percentage
      const rows = answer as string[][];
      if (rows && rows.length > 2) {
        const absDiffStr = rows[rows.length - 1][5]; // e.g. "13%"
        const absDiff = parseFloat(absDiffStr.replace("%", "")) || 0;
        if (absDiff > 10) return { score: 1, status: "Red" };
        if (absDiff > 5 && absDiff <= 10) return { score: 2, status: "Yellow" };
        return { score: 3, status: "Green" };
      }
    }

    return { score: 0, status: "Gray" };
  };

  // ----------------------------------------------------
  // DYNAMIC CONDITIONAL ROUTING ENGINE
  // ----------------------------------------------------
  const isQuestionVisible = (qId: string): boolean => {
    if (qId.endsWith("_Q1")) return true;
    
    // Find the question object
    const qIndex = questions.findIndex(item => item.id === qId);
    if (qIndex === -1) return true;

    // Previous question must be visible and satisfied its condition
    const prevQ = questions[qIndex - 1];
    if (!prevQ) return true;

    if (!isQuestionVisible(prevQ.id)) return false;

    const prevResp = responses[prevQ.id];
    if (!prevResp) return false;

    const cond = prevQ.conditionalStatement; // e.g. "If Y, then Q2" or "If 2, then Q2"
    if (!cond) return true;

    if (prevQ.type === "yes_no") {
      if (cond.includes("If Y") && prevResp.response !== "Yes") return false;
      if (cond.includes("If N") && prevResp.response !== "No") return false;
    } else if (prevQ.type === "tick_box") {
      const count = (prevResp.response as string[] || []).length;
      const match = cond.match(/If\s*(\d+)/);
      if (match) {
        const requiredCount = parseInt(match[1]);
        if (count !== requiredCount) return false;
      }
    } else if (prevQ.type === "numerator_denominator") {
      const { num, den } = prevResp.response as { num: number; den: number };
      const score = den > 0 ? (num / den) * 100 : 0;
      const requiredScore = parseInt(prevQ.correctAnswer || "90");
      if (score < requiredScore) return false;
    }

    return true;
  };

  // Save Response
  const saveAnswer = async (qId: string, answer: any) => {
    if (!activeActivity || !profile) return;
    setSaving(qId);
    
    const qObj = questions.find(q => q.id === qId);
    const { score, status } = calculateScoreAndStatus(qObj, answer);

    const newResponse: QuestionResponse = {
      questionId: qId,
      response: answer,
      score,
      status
    };

    setResponses(prev => ({ ...prev, [qId]: newResponse }));

    try {
      const responseDocId = `${activeActivity.id}_${qId}`;
      await setDoc(doc(db, "question_response", responseDocId), {
        eSIMS_ID: activeActivity.id,
        cee_id: activeCeeId,
        question_id: qId,
        response: answer,
        score,
        status,
        organizationName: activeActivity.organizations,
        facilityName: activeActivity.facilities,
        state: activeActivity.states,
        timestamp: new Date()
      });
    } catch (e) {
      console.error("Error saving response to Firestore:", e);
    } finally {
      setSaving(null);
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case "Green":
        return "bg-green-500/10 border-green-500/30 text-green-800";
      case "Yellow":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-800";
      case "Red":
        return "bg-red-500/10 border-red-500/30 text-red-800";
      default:
        return "bg-slate-100 border-slate-200 text-slate-700";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Green":
        return <span className="px-2.5 py-1 text-xs font-bold bg-green-500 text-white rounded-full">Meets Standard</span>;
      case "Yellow":
        return <span className="px-2.5 py-1 text-xs font-bold bg-yellow-500 text-white rounded-full">Needs Improvement</span>;
      case "Red":
        return <span className="px-2.5 py-1 text-xs font-bold bg-red-500 text-white rounded-full">Urgent Remediation</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold bg-slate-400 text-white rounded-full">Not Answered</span>;
    }
  };

  // CEE details helper
  const activeCee = ceesData.find((c: any) => c.id === activeCeeId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("activities")}
              className="p-2 rounded-lg hover:bg-wine-50 text-slate-500 hover:text-wine-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-wine-800 uppercase tracking-widest">Site Assessment</span>
              <h1 className="text-lg font-bold text-slate-800">{activeActivity?.facilities}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSet}
              onChange={e => setSelectedSet(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              {Object.entries(setTitles).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto">
        {/* Left Sidebar - CEE Selection */}
        <aside className="w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto shrink-0 flex flex-row md:flex-col">
          <div className="p-4 border-b border-slate-100 hidden md:block">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">CEE Checklist</h3>
          </div>
          <div className="flex md:flex-col overflow-x-auto w-full md:overflow-x-visible">
            {cees.map(cee => {
              const isActive = cee.id === activeCeeId;
              return (
                <button
                  key={cee.id}
                  onClick={() => setActiveCeeId(cee.id)}
                  className={`w-auto md:w-full px-5 py-4 text-left border-b border-slate-100 flex items-center justify-between gap-3 transition shrink-0 md:shrink ${
                    isActive ? "bg-wine-50/50 border-r-4 border-r-wine-800 text-wine-900 font-bold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-wine-800">{cee.abbreviatedTitle}</span>
                      {cee.required && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" title="Required" />}
                    </div>
                    <span className="text-xs truncate block mt-0.5">{cee.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 hidden md:block" />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center/Right Pane - Assessment Questions */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeCee ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* CEE Header Standard Box */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-bold text-wine-900">{activeCee.name}</h2>
                  <div className="flex gap-2">
                    {activeCee.required && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 rounded border border-red-100 uppercase tracking-wide">
                        Required
                      </span>
                    )}
                    {activeCee.supportive && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase tracking-wide">
                        Supportive
                      </span>
                    )}
                    {activeCee.remote && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-teal-50 text-teal-600 rounded border border-teal-100 uppercase tracking-wide">
                        Remote Allowed
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                  <div className="p-3 bg-wine-50/30 rounded-xl border border-wine-100/50">
                    <h4 className="font-bold text-wine-900 flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-4 h-4 text-wine-800" />
                      <span>SIMS Standard</span>
                    </h4>
                    <p className="whitespace-pre-line">{activeCee.standard}</p>
                  </div>

                  {activeCee.instructions && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                        <Info className="w-4 h-4 text-slate-500" />
                        <span>Instructions</span>
                      </h4>
                      <p className="whitespace-pre-line">{activeCee.instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Questions List */}
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-wine-800 mx-auto" />
                  <span className="text-sm font-semibold text-slate-400 mt-2 block">Loading questions...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, idx) => {
                    const visible = isQuestionVisible(q.id);
                    if (!visible) return null;

                    const resp = responses[q.id];
                    const isSaving = saving === q.id;

                    return (
                      <div
                        key={q.id}
                        className={`p-6 rounded-2xl border transition-all duration-300 relative shadow-sm ${getStatusBgColor(resp?.status)}`}
                      >
                        {isSaving && (
                          <div className="absolute right-4 top-4 flex items-center gap-1.5 text-xs text-slate-400 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </div>
                        )}

                        <div className="flex justify-between items-start gap-4 mb-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1}</span>
                            <h3 className="font-semibold text-slate-800 text-sm mt-0.5 whitespace-pre-line leading-relaxed">{q.text}</h3>
                          </div>
                          {resp && getStatusBadge(resp.status)}
                        </div>

                        {/* Rendering different types */}
                        {q.type === "yes_no" && (
                          <div className="flex gap-4">
                            {["Yes", "No"].map(option => (
                              <button
                                key={option}
                                onClick={() => saveAnswer(q.id, option)}
                                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition duration-150 ${
                                  resp?.response === option
                                    ? "bg-wine-900 text-white shadow-md"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === "tick_box" && (
                          <div className="space-y-2">
                            {q.options.map((opt: string, optIdx: number) => {
                              const list = (resp?.response as string[]) || [];
                              const isChecked = list.includes(opt);
                              
                              const handleCheck = () => {
                                const newList = isChecked
                                  ? list.filter(item => item !== opt)
                                  : [...list, opt];
                                saveAnswer(q.id, newList);
                              };

                              return (
                                <label key={optIdx} className="flex items-start gap-3 p-3 rounded-xl bg-white/60 hover:bg-white border border-slate-100 cursor-pointer transition select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={handleCheck}
                                    className="mt-1 rounded text-wine-800 focus:ring-wine-800 w-4 h-4 border-slate-300"
                                  />
                                  <span className="text-xs text-slate-700 leading-normal">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {q.type === "numerator_denominator" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                  {q.numQuestion || "Numerator"}
                                </label>
                                <input
                                  type="number"
                                  placeholder="Enter count"
                                  value={(resp?.response as any)?.num ?? ""}
                                  onChange={e => {
                                    const num = parseInt(e.target.value) || 0;
                                    const den = (resp?.response as any)?.den || 0;
                                    saveAnswer(q.id, { num, den });
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-wine-800 focus:ring-wine-800 text-xs focus:outline-none bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                                  {q.denQuestion || "Denominator"}
                                </label>
                                <input
                                  type="number"
                                  placeholder="Enter count"
                                  value={(resp?.response as any)?.den ?? ""}
                                  onChange={e => {
                                    const den = parseInt(e.target.value) || 0;
                                    const num = (resp?.response as any)?.num || 0;
                                    saveAnswer(q.id, { num, den });
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-wine-800 focus:ring-wine-800 text-xs focus:outline-none bg-white"
                                />
                              </div>
                            </div>

                            {resp && (
                              <div className="text-xs font-bold text-slate-600">
                                Calculated Score: {resp.response.den > 0 ? Math.round((resp.response.num / resp.response.den) * 100) : 0}%
                              </div>
                            )}
                          </div>
                        )}

                        {q.type === "table" && (
                          <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs bg-white">
                              <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-700">
                                <tr>
                                  <th className="p-3 min-w-[140px]">Indicator</th>
                                  <th className="p-3 w-28">DATIM (A)</th>
                                  <th className="p-3 w-28">Facility (B)</th>
                                  <th className="p-3 w-32">Diff (A-B)</th>
                                  <th className="p-3 w-28">% Diff (C/B)</th>
                                  <th className="p-3 w-32">Abs Diff %</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {/* Example Row */}
                                <tr className="bg-slate-50/40 text-slate-500 italic">
                                  <td className="p-3">Example Indicator</td>
                                  <td className="p-3">400</td>
                                  <td className="p-3">460</td>
                                  <td className="p-3">-60</td>
                                  <td className="p-3">-13%</td>
                                  <td className="p-3">13%</td>
                                </tr>

                                {/* Interactive Input Row */}
                                {(() => {
                                  const tableDataRows = (resp?.response as string[][]) || [
                                    [],
                                    [],
                                    [q.correctAnswer || "Indicator", "", "", "", "", ""]
                                  ];
                                  const activeRow = tableDataRows[2];

                                  const cellA = activeRow[1] || "";
                                  const cellB = activeRow[2] || "";
                                  const cellC = activeRow[3] || "";
                                  const cellD = activeRow[4] || "";
                                  const cellE = activeRow[5] || "";

                                  const handleTableCellChange = (cellIdx: 1 | 2, valStr: string) => {
                                    const a = cellIdx === 1 ? parseFloat(valStr) || 0 : parseFloat(cellA) || 0;
                                    const b = cellIdx === 2 ? parseFloat(valStr) || 0 : parseFloat(cellB) || 0;

                                    const diff = a - b;
                                    const percentDiff = b !== 0 ? ((diff / b) * 100).toFixed(1) + "%" : "0%";
                                    const absDiff = b !== 0 ? Math.abs((diff / b) * 100).toFixed(1) + "%" : "0%";

                                    const newTable = [
                                      [],
                                      [],
                                      [
                                        q.correctAnswer || "Indicator",
                                        cellIdx === 1 ? valStr : cellA,
                                        cellIdx === 2 ? valStr : cellB,
                                        diff.toString(),
                                        percentDiff,
                                        absDiff
                                      ]
                                    ];
                                    saveAnswer(q.id, newTable);
                                  };

                                  return (
                                    <tr>
                                      <td className="p-3 font-semibold text-slate-800">{activeRow[0]}</td>
                                      <td className="p-2">
                                        <input
                                          type="number"
                                          value={cellA}
                                          placeholder="Enter (A)"
                                          onChange={e => handleTableCellChange(1, e.target.value)}
                                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                                        />
                                      </td>
                                      <td className="p-2">
                                        <input
                                          type="number"
                                          value={cellB}
                                          placeholder="Enter (B)"
                                          onChange={e => handleTableCellChange(2, e.target.value)}
                                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                                        />
                                      </td>
                                      <td className="p-3 font-bold text-slate-700">{cellC}</td>
                                      <td className="p-3 font-bold text-slate-700">{cellD}</td>
                                      <td className="p-3 font-bold text-slate-700">{cellE}</td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-slate-400">Select a CEE to begin assessing.</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
