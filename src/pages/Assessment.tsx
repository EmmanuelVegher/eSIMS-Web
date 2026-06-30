import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import ceesData from "../data/cees.json";
import questionsData from "../data/questions.json";
import {
  ArrowLeft,
  BookOpen,
  Info,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Save,
  UserCheck,
  MessageSquare
} from "lucide-react";

interface QuestionResponse {
  questionId: string;
  response: any;
  score: number;
  status: "Red" | "Yellow" | "Green" | "Gray";
}

export const Assessment: React.FC = () => {
  const { activeActivity, navigate, activeCeeId, setActiveCeeId } = useApp();

  const [selectedSet, setSelectedSet] = useState("1A");
  const [cees, setCees] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  
  // Rich web state response map
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [comments, setComments] = useState("");
  const [naChecked, setNaChecked] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState("");

  // Lists
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  // Image assets mapping helper
  const getImageAsset = (code: string) => {
    switch (code) {
      case "PinkSquare":
        return "/PinkSquare.png";
      case "Eyes":
        return "/eyes.png";
      case "GreyCircle":
        return "/GreyCircle.png";
      case "Triangle":
        return "/Triangle.png";
      case "Remote":
        return "/Remote.png";
      case "RemoteConditional":
        return "/RemoteConditional.png";
      case "Required":
        return "/Required.png";
      default:
        return "";
    }
  };

  // Load Staff List once
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const snap = await getDocs(collection(db, "StaffList"));
        const list: any[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        setStaffList(list.length ? list : [
          { name: "Dr. Smith", email: "dr.smith@example.com", department: "Clinical" },
          { name: "Dr. Jones", email: "dr.jones@example.com", department: "Clinical" },
          { name: "Sarah Connor", email: "sarah.connor@example.com", department: "Strategic Info" }
        ]);
      } catch (e) {
        console.error("Error fetching staff:", e);
      }
    };
    fetchStaff();
  }, []);

  // Filter CEEs by active set
  useEffect(() => {
    const filteredCees = ceesData.filter((cee: any) => cee.setId === selectedSet);
    setCees(filteredCees);
    
    // Default first CEE as active if none selected
    if (filteredCees.length > 0 && (!activeCeeId || !filteredCees.some(c => c.id === activeCeeId))) {
      setActiveCeeId(filteredCees[0].id);
    }
  }, [selectedSet]);

  // Fetch Questions & Existing Responses from Deeply Nested path
  useEffect(() => {
    if (!activeCeeId || !activeActivity) return;

    const loadQuestionsAndResponses = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        // Filter questions for active CEE
        const filteredQ = questionsData.filter((q: any) => q.ceeId === activeCeeId);
        setQuestions(filteredQ);

        // Nested Path: /sims_activities/{eSIMS_ID}/{org}/{state}/{state}/{setId}/{ceeId}/{ceeId}
        const docRef = doc(
          db,
          "sims_activities",
          activeActivity.id,
          activeActivity.organizations,
          activeActivity.states,
          activeActivity.states,
          selectedSet,
          activeCeeId,
          activeCeeId
        );

        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setComments(data.comments || "");
          setNaChecked(data.na === 1);
          setAssignedStaff(data.assignedToStaffEmail || "");
          setResponses(data.responses || {});
        } else {
          // Clear states for fresh CEE
          setComments("");
          setNaChecked(false);
          setAssignedStaff("");
          setResponses({});
        }
      } catch (e) {
        console.error("Error loading questions & nested responses:", e);
      } finally {
        setLoading(false);
      }
    };

    loadQuestionsAndResponses();
  }, [activeCeeId, activeActivity, selectedSet]);

  // Scoring engine rules mapping
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
      const tableResp = answer as { absDiff?: string };
      if (tableResp?.absDiff) {
        const absDiff = parseFloat(tableResp.absDiff.replace("%", "")) || 0;
        if (absDiff > 10) return { score: 1, status: "Red" };
        if (absDiff > 5 && absDiff <= 10) return { score: 2, status: "Yellow" };
        return { score: 3, status: "Green" };
      }
    }

    return { score: 0, status: "Gray" };
  };

  // Visibility Check (Conditional Routing)
  const isQuestionVisible = (qId: string, currentResponses: Record<string, QuestionResponse>): boolean => {
    if (qId.endsWith("_Q1")) return true;
    
    const qIndex = questions.findIndex(item => item.id === qId);
    if (qIndex === -1) return true;

    const prevQ = questions[qIndex - 1];
    if (!prevQ) return true;

    if (!isQuestionVisible(prevQ.id, currentResponses)) return false;

    const prevResp = currentResponses[prevQ.id];
    if (!prevResp) return false;

    const cond = prevQ.conditionalStatement;
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

  // Local state update helper for inputs before submit save
  const handleInputChange = (qId: string, answer: any) => {
    const qObj = questions.find(q => q.id === qId);
    const { score, status } = calculateScoreAndStatus(qObj, answer);

    setResponses(prev => ({
      ...prev,
      [qId]: {
        questionId: qId,
        response: answer,
        score,
        status
      }
    }));
  };

  // Save/Submit the CEE data
  const handleSaveCEE = async () => {
    if (!activeActivity || !activeCeeId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Calculate overall CEE grade color propagation
      let overallColor: "Red" | "Yellow" | "Green" | "Gray" = "Green";
      let answeredCount = 0;

      // Filter visible questions to check scores
      const visibleQuestions = questions.filter(q => isQuestionVisible(q.id, responses));

      visibleQuestions.forEach(q => {
        const resp = responses[q.id];
        if (resp) {
          answeredCount++;
          if (resp.status === "Red") {
            overallColor = "Red";
          } else if (resp.status === "Yellow" && overallColor !== "Red") {
            overallColor = "Yellow";
          }
        }
      });

      if (naChecked) {
        overallColor = "Gray";
      } else if (answeredCount === 0) {
        overallColor = "Gray";
      }

      const scoreIntMap = { Gray: 0, Red: 1, Yellow: 2, Green: 3 };
      const finalCeeScore = scoreIntMap[overallColor];

      const staffObj = staffList.find(s => s.email === assignedStaff);

      // 1. Deeply Nested Document Ref for mobile sync compatibility
      const docRef = doc(
        db,
        "sims_activities",
        activeActivity.id,
        activeActivity.organizations,
        activeActivity.states,
        activeActivity.states,
        selectedSet,
        activeCeeId,
        activeCeeId
      );

      // Build payload matching mobile sync table columns
      const payload: Record<string, any> = {
        startDate: activeActivity.startDate,
        endDate: activeActivity.proposedEndDate,
        comments: comments,
        na: naChecked ? 1 : 0,
        final_cee_score: finalCeeScore,
        assignedToStaffName: staffObj?.name || "",
        assignedToStaffEmail: assignedStaff,
        responses: responses,
        timestamp: new Date().toISOString()
      };

      // Add individual question grades (question_1_color, question_2_color...)
      questions.forEach((q, index) => {
        const resp = responses[q.id];
        payload[`question_${index + 1}_color`] = resp ? scoreIntMap[resp.status] : 0;
      });

      await setDoc(docRef, payload);

      // 2. Save flat query version for high-performance web dashboard analytics
      const flatDocId = `${activeActivity.id}_${selectedSet}_${activeCeeId}_${activeActivity.facilities.replace(/\s+/g, "_")}`;
      const flatRef = doc(db, "question_response", flatDocId);

      const flatPayload = {
        eSIMS_ID: activeActivity.id,
        cee_id: activeCeeId,
        setId: selectedSet,
        comments: comments,
        na_response: naChecked ? 1 : 0,
        final_cee_score: finalCeeScore,
        organizationName: activeActivity.organizations,
        facilityName: activeActivity.facilities,
        state: activeActivity.states,
        timestamp: new Date().toISOString(),
        assignedToStaffName: staffObj?.name || "",
        assignedToStaffEmail: assignedStaff,
        responses: responses
      };

      await setDoc(flatRef, flatPayload);
      setSuccess("Assessment card saved and synchronized successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save assessment.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case "Green":
        return "bg-emerald-50/40 border-emerald-200/80 text-emerald-950";
      case "Yellow":
        return "bg-amber-50/40 border-amber-200/80 text-amber-950";
      case "Red":
        return "bg-red-50/40 border-red-200/80 text-red-950";
      default:
        return "bg-white border-slate-200/80 text-slate-800";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Green":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black bg-emerald-500 text-white rounded-full uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Meets Standard
          </span>
        );
      case "Yellow":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black bg-amber-500 text-white rounded-full uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Needs Action
          </span>
        );
      case "Red":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black bg-red-500 text-white rounded-full uppercase tracking-wider shadow-sm animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-400 rounded-full uppercase tracking-wider border border-slate-200">
            Unanswered
          </span>
        );
    }
  };

  const activeCee = ceesData.find((c: any) => c.id === activeCeeId);

  return (
    <div className="min-h-screen bg-[#FAF7F8] flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-wine-100/50 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("activities")}
              className="p-2 rounded-xl bg-white border border-slate-100 shadow-sm hover:bg-wine-50 text-slate-500 hover:text-wine-800 transition duration-300 transform active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[9px] font-black text-wine-900 uppercase tracking-widest bg-wine-100/60 px-2.5 py-0.5 rounded-full">Site Assessment</span>
              <h1 className="text-base font-bold text-slate-800 mt-1">{activeActivity?.facilities}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSet}
              onChange={e => setSelectedSet(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-wine-600 transition shadow-sm cursor-pointer"
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
        <aside className="w-full md:w-80 bg-white border-r border-slate-200/80 overflow-y-auto shrink-0 flex flex-row md:flex-col shadow-sm">
          <div className="p-4 border-b border-slate-100 hidden md:block">
            <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">CEE Checklist</h3>
          </div>
          <div className="flex md:flex-col overflow-x-auto w-full md:overflow-x-visible divide-x md:divide-x-0 md:divide-y divide-slate-100">
            {cees.map(cee => {
              const isActive = cee.id === activeCeeId;
              return (
                <button
                  key={cee.id}
                  onClick={() => setActiveCeeId(cee.id)}
                  className={`w-auto md:w-full px-5 py-4 text-left flex items-center justify-between gap-3 transition shrink-0 md:shrink border-r-2 md:border-r-0 ${
                    isActive 
                      ? "bg-wine-50/45 border-r-wine-800 md:border-l-4 md:border-l-wine-850 md:border-r-0 text-wine-950 font-bold" 
                      : "text-slate-650 hover:bg-slate-50 border-r-transparent"
                  }`}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase font-black text-wine-800 bg-wine-50 px-1.5 py-0.5 rounded">{cee.abbreviatedTitle}</span>
                      {cee.required && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" title="Required (MPR)" />}
                    </div>
                    <span className="text-xs truncate block mt-1.5 font-semibold text-slate-700">{cee.name}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition ${isActive ? "text-wine-800 translate-x-1" : "text-slate-350"} hidden md:block`} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center/Right Pane - Assessment Questions */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-750 text-xs flex gap-2 items-center shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-green-50 text-green-750 text-xs flex gap-2 items-center shadow-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {activeCee ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* CEE Header Standard Box */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-wine-950 max-w-md leading-snug">{activeCee.name}</h2>
                      {activeCee.imageCodes && (
                        <div className="flex gap-1.5 ml-2">
                          {activeCee.imageCodes.map((code: string) => {
                            const src = getImageAsset(code);
                            if (!src) return null;
                            return <img key={code} src={src} className="w-5 h-5 object-contain" alt={code} title={code} />;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {activeCee.required && (
                      <span className="px-2.5 py-1 text-[9px] font-black bg-red-50 text-red-600 rounded-lg border border-red-100 uppercase tracking-wider">
                        Required
                      </span>
                    )}
                    {activeCee.supportive && (
                      <span className="px-2.5 py-1 text-[9px] font-black bg-blue-50 text-blue-600 rounded-lg border border-blue-100 uppercase tracking-wider">
                        Supportive
                      </span>
                    )}
                    {activeCee.remote && (
                      <span className="px-2.5 py-1 text-[9px] font-black bg-teal-50 text-teal-600 rounded-lg border border-teal-100 uppercase tracking-wider">
                        Remote Allowed
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-slate-650">
                  <div className="p-4 bg-wine-50/20 rounded-2xl border border-wine-100/50">
                    <h4 className="font-bold text-wine-900 flex items-center gap-1.5 mb-1.5">
                      <BookOpen className="w-4 h-4 text-wine-850" />
                      <span className="uppercase text-[10px] tracking-wider font-black">SIMS Standard</span>
                    </h4>
                    <p className="whitespace-pre-line text-slate-700">{activeCee.standard}</p>
                  </div>

                  {activeCee.instructions && (
                    <div className="p-4 bg-white/60 rounded-2xl border border-slate-200/80 shadow-inner">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                        <Info className="w-4 h-4 text-slate-500" />
                        <span className="uppercase text-[10px] tracking-wider font-black text-slate-500">Instructions</span>
                      </h4>
                      <p className="whitespace-pre-line text-slate-600">{activeCee.instructions}</p>
                    </div>
                  )}
                </div>

                {/* Not Applicable Toggle Check */}
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <label className="flex items-center gap-3 cursor-pointer select-none text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={naChecked}
                      onChange={e => setNaChecked(e.target.checked)}
                      className="rounded text-wine-800 focus:ring-wine-800/10 w-4 h-4"
                    />
                    <span>Not Applicable (N/A) for this facility</span>
                  </label>
                  
                  {/* Staff Assignment */}
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4.5 h-4.5 text-slate-400" />
                    <select
                      value={assignedStaff}
                      onChange={e => setAssignedStaff(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-wine-600 cursor-pointer"
                    >
                      <option value="">Assign Staff Assessor</option>
                      {staffList.map(s => (
                        <option key={s.email} value={s.email}>{s.name} ({s.department})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-wine-800 mx-auto" />
                  <span className="text-sm font-semibold text-slate-400 mt-2 block">Loading questions...</span>
                </div>
              ) : (
                <div className={`space-y-6 ${naChecked ? "opacity-45 pointer-events-none select-none" : ""}`}>
                  {questions.map((q, idx) => {
                    const visible = isQuestionVisible(q.id, responses);
                    if (!visible) return null;

                    const resp = responses[q.id];

                    return (
                      <div
                        key={q.id}
                        className={`p-6 rounded-3xl border transition-all duration-300 relative shadow-sm hover:shadow-md ${getStatusBgColor(resp?.status)}`}
                      >
                        <div className="flex justify-between items-start gap-4 mb-4 border-b border-slate-100/40 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question {idx + 1}</span>
                              {q.imageCodes && (
                                <div className="flex gap-1">
                                  {q.imageCodes.map((code: string) => {
                                    const src = getImageAsset(code);
                                    if (!src) return null;
                                    return <img key={code} src={src} className="w-4 h-4 object-contain" alt={code} title={code} />;
                                  })}
                                </div>
                              )}
                            </div>
                            <h3 className="font-semibold text-slate-805 text-xs mt-1.5 whitespace-pre-line leading-relaxed">{q.text}</h3>
                          </div>
                          {resp && getStatusBadge(resp.status)}
                        </div>

                        {/* yes_no input */}
                        {q.type === "yes_no" && (
                          <div className="flex gap-3 mt-4">
                            {["Yes", "No"].map(option => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(q.id, option)}
                                className={`px-6 py-2.5 rounded-xl font-bold text-xs transition duration-300 shadow-sm transform active:scale-95 hover:-translate-y-0.5 ${
                                  resp?.response === option
                                    ? "bg-wine-850 text-white shadow-md shadow-wine-900/10"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* tick_box input */}
                        {q.type === "tick_box" && (
                          <div className="space-y-2 mt-4">
                            {q.options.map((opt: string, optIdx: number) => {
                              const list = (resp?.response as string[]) || [];
                              const isChecked = list.includes(opt);
                              
                              const handleCheck = () => {
                                const newList = isChecked
                                  ? list.filter(item => item !== opt)
                                  : [...list, opt];
                                handleInputChange(q.id, newList);
                              };

                              return (
                                <label key={optIdx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/60 hover:bg-white border border-slate-200/80 cursor-pointer transition select-none shadow-sm animate-hover-lift">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={handleCheck}
                                    className="mt-1 rounded text-wine-800 focus:ring-wine-805 w-4 h-4 border-slate-305 cursor-pointer"
                                  />
                                  <span className="text-xs text-slate-705 leading-normal font-semibold">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* numerator_denominator input */}
                        {q.type === "numerator_denominator" && (
                          <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                                  {q.numQuestion || "Numerator"}
                                </label>
                                <input
                                  type="number"
                                  placeholder="Enter count"
                                  value={(resp?.response as any)?.num ?? ""}
                                  onChange={e => {
                                    const num = parseInt(e.target.value) || 0;
                                    const den = (resp?.response as any)?.den || 0;
                                    handleInputChange(q.id, { num, den });
                                  }}
                                  className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:border-wine-800 focus:ring-wine-800 text-xs font-semibold focus:outline-none bg-white shadow-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                                  {q.denQuestion || "Denominator"}
                                </label>
                                <input
                                  type="number"
                                  placeholder="Enter count"
                                  value={(resp?.response as any)?.den ?? ""}
                                  onChange={e => {
                                    const den = parseInt(e.target.value) || 0;
                                    const num = (resp?.response as any)?.num || 0;
                                    handleInputChange(q.id, { num, den });
                                  }}
                                  className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:border-wine-800 focus:ring-wine-800 text-xs font-semibold focus:outline-none bg-white shadow-sm"
                                />
                              </div>
                            </div>

                            {resp && (
                              <div className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <span>Score Rate:</span>
                                <span className="text-wine-900 bg-wine-50 px-2 py-0.5 rounded-lg text-xs font-black">
                                  {resp.response.den > 0 ? Math.round((resp.response.num / resp.response.den) * 100) : 0}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* table input */}
                        {q.type === "table" && (
                          <div className="overflow-x-auto w-full border border-slate-200/80 rounded-2xl shadow-sm bg-white mt-4">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 font-black text-slate-700 border-b border-slate-200">
                                <tr>
                                  <th className="p-3.5 min-w-[140px] uppercase text-[9px] tracking-wider">Indicator</th>
                                  <th className="p-3.5 w-28 uppercase text-[9px] tracking-wider">DATIM (A)</th>
                                  <th className="p-3.5 w-28 uppercase text-[9px] tracking-wider">Facility (B)</th>
                                  <th className="p-3.5 w-32 uppercase text-[9px] tracking-wider">Diff (A-B)</th>
                                  <th className="p-3.5 w-28 uppercase text-[9px] tracking-wider">% Diff</th>
                                  <th className="p-3.5 w-32 uppercase text-[9px] tracking-wider">Abs Diff %</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                <tr className="bg-slate-50/40 text-slate-400 text-[10px] italic">
                                  <td className="p-3.5">Example</td>
                                  <td className="p-3.5 font-bold">400</td>
                                  <td className="p-3.5 font-bold">460</td>
                                  <td className="p-3.5 font-bold">-60</td>
                                  <td className="p-3.5 font-bold">-13%</td>
                                  <td className="p-3.5 font-bold">13%</td>
                                </tr>

                                {(() => {
                                  const tableResp = (resp?.response as {
                                    indicator: string; datim: string; facility: string;
                                    diff: string; pctDiff: string; absDiff: string;
                                  }) || { indicator: q.correctAnswer || "Indicator", datim: "", facility: "", diff: "", pctDiff: "", absDiff: "" };

                                  const handleTableCell = (field: "datim" | "facility", valStr: string) => {
                                    const a = field === "datim" ? parseFloat(valStr) || 0 : parseFloat(tableResp.datim) || 0;
                                    const b = field === "facility" ? parseFloat(valStr) || 0 : parseFloat(tableResp.facility) || 0;
                                    const diff = a - b;
                                    const pctDiff = b !== 0 ? ((diff / b) * 100).toFixed(1) + "%" : "0%";
                                    const absDiff = b !== 0 ? Math.abs((diff / b) * 100).toFixed(1) + "%" : "0%";
                                    handleInputChange(q.id, {
                                      indicator: tableResp.indicator,
                                      datim: field === "datim" ? valStr : tableResp.datim,
                                      facility: field === "facility" ? valStr : tableResp.facility,
                                      diff: diff.toString(), pctDiff, absDiff
                                    });
                                  };

                                  return (
                                    <tr>
                                      <td className="p-3.5 font-bold text-slate-800 text-xs">{tableResp.indicator}</td>
                                      <td className="p-2">
                                        <input type="number" value={tableResp.datim} placeholder="Enter (A)"
                                          onChange={e => handleTableCell("datim", e.target.value)}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-wine-800 bg-white" />
                                      </td>
                                      <td className="p-2">
                                        <input type="number" value={tableResp.facility} placeholder="Enter (B)"
                                          onChange={e => handleTableCell("facility", e.target.value)}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-wine-800 bg-white" />
                                      </td>
                                      <td className="p-3.5 font-black text-slate-700 text-xs">{tableResp.diff || "0"}</td>
                                      <td className="p-3.5 font-black text-slate-700 text-xs">{tableResp.pctDiff || "0%"}</td>
                                      <td className={`p-3.5 font-black text-xs ${
                                        parseFloat(tableResp.absDiff) > 10 ? "text-red-650" :
                                        parseFloat(tableResp.absDiff) > 5 ? "text-yellow-650" :
                                        tableResp.absDiff ? "text-emerald-650" : "text-slate-405"
                                      }`}>{tableResp.absDiff || "—"}</td>
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

              {/* Assessment Comments Box & Submit Bar */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    <MessageSquare className="w-4 h-4 text-wine-800" />
                    <span>Assessor Notes & Comments</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter CEE general findings, recommendations, or corrective actions here..."
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-wine-800 transition resize-none bg-white/60 focus:bg-white shadow-inner"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSaveCEE}
                    disabled={saving}
                    className="px-6 py-3.5 bg-gradient-to-r from-wine-900 to-wine-800 hover:from-wine-800 hover:to-wine-700 text-white font-bold rounded-2xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 text-xs"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        <span>Saving CEE Details...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4.5 h-4.5" />
                        <span>Save CEE Assessment Card</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Select a CEE to begin assessing.</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
