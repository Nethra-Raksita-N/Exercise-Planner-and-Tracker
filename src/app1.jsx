import React, { useState, useEffect, useMemo, useRef } from "react";
import rawExercises from "./data/exercises.json";
import quotesData from "./data/quotes.json";

const STORAGE_CHOICES_KEY = "workout_user_choices";
const STORAGE_TRACKER_KEY = "workout_matrix_checks";
const STORAGE_MATRIX_CONFIG_KEY = "workout_matrix_config";
const STORAGE_WORKOUT_LOGS_KEY = "workout_completed_logs";
const STORAGE_MATRIX_LOGS_KEY = "workout_matrix_saved_logs";
const STORAGE_THEME_KEY = "workout_theme_mode";

// frequency

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX_MAP = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

// preset exercises

const PRESET_ROUTINES = [
  {
    name: "Full Body (3x/Wk)",
    ids: [1, 19, 24, 6],
    days: ["Mon", "Wed", "Fri"],
    sets: 3,
  },
  {
    name: "Core & Posture",
    ids: [4, 13, 18, 28],
    days: ["Tue", "Thu", "Sat"],
    sets: 3,
  },
  {
    name: "Daily Mobility",
    ids: [2, 9, 23, 49],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    sets: 2,
  },
];
 // "timer" | "exercises" | "schedule" | "tracker"
export default function App() {
  const [activeTab, setActiveTab] = useState("timer");
  const [exercises] = useState(rawExercises);
  const [quotes] = useState(quotesData);
  const [currentQuote, setCurrentQuote] = useState(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_THEME_KEY);
      return saved === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem(STORAGE_THEME_KEY, "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem(STORAGE_THEME_KEY, "light");
    }
  }, [darkMode]);

  //timer
  // Round Circular Timer State (Page 1)
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Staged Filter & Search (Page 2)
  const [searchQuery, setSearchQuery] = useState("");
  const [stagedBodyParts, setStagedBodyParts] = useState([]);
  const [stagedEquipment, setStagedEquipment] = useState([]);
  const [activeBodyParts, setActiveBodyParts] = useState([]);
  const [activeEquipment, setActiveEquipment] = useState([]);

  // LocalStorage Choices & Independent Logs
  const [userChoices, setUserChoices] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHOICES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 1. Separate Weight & Sets Session Log
  const [completedLogs, setCompletedLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WORKOUT_LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Separate Daily Compliance Day Count Log
  const [matrixLogs, setMatrixLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MATRIX_LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Export Matrix Modal State (Header Button)
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const today = new Date();
  const [matrixConfig, setMatrixConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MATRIX_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      selectedYear: today.getFullYear(),
      selectedMonth: today.getMonth() + 1,
      startDate: 1,
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
      generatedTimeline: null,
    };
  });

  const [trackerChecks, setTrackerChecks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TRACKER_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal Setup for adding exercises
  const [modalExercise, setModalExercise] = useState(null);
  const [configSets, setConfigSets] = useState(3);
  const [configFrequency, setConfigFrequency] = useState("Custom Days");
  const [configDays, setConfigDays] = useState(["Mon", "Wed", "Fri"]);

  // Active Session Logging State (Under Schedule)
  const [sessionRows, setSessionRows] = useState({});

  // Audio Synthesizer
  const initOrResumeAudio = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  };
//last 3 seconds
  const playBeep = (freq = 880, dur = 0.08) => {
    try {
      initOrResumeAudio();
      if (!audioContextRef.current) return;
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.start(now);
      osc.stop(now + dur);
    } catch (e) {}
  };
// timer end buzzer/sound
  const playBuzzer = () => {
    try {
      initOrResumeAudio();
      if (!audioContextRef.current) return;
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(440, now + 0.16);
      gain2.gain.setValueAtTime(0.25, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.75);
    } catch (e) {}
  };

  // Safe Session Rows Merge
  useEffect(() => {
    setSessionRows((prev) => {
      const updated = { ...prev };
      userChoices.forEach((ex) => {
        const existing = prev[ex.id] || [];
        const desiredLength = ex.sets;

        if (existing.length === desiredLength) {
          updated[ex.id] = existing;
        } else if (existing.length < desiredLength) {
          const additional = Array.from({ length: desiredLength - existing.length }, () => ({
            weight: 0,
            reps: 10,
            done: false,
          }));
          updated[ex.id] = [...existing, ...additional];
        } else {
          updated[ex.id] = existing.slice(0, desiredLength);
        }
      });

      Object.keys(updated).forEach((id) => {
        if (!userChoices.some((ex) => String(ex.id) === String(id))) {
          delete updated[id];
        }
      });

      return updated;
    });
  }, [userChoices]);

  // Round Timer Loop
  useEffect(() => {
    if (timerRunning && timerSecondsLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimerRunning(false);
            playBuzzer();
            return 0;
          }
          if (prev <= 4) {
            playBeep(700, 0.08);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning, timerSecondsLeft]);

  // Quote Rotation
  useEffect(() => {
    const pickRandomQuote = () => {
      if (!quotes.length) return;
      const rnd = quotes[Math.floor(Math.random() * quotes.length)];
      setCurrentQuote(rnd);
    };

    pickRandomQuote();
    const interval30Mins = setInterval(pickRandomQuote, 30 * 60 * 1000);
    return () => clearInterval(interval30Mins);
  }, [quotes]);

  // LocalStorage Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_CHOICES_KEY, JSON.stringify(userChoices));
  }, [userChoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TRACKER_KEY, JSON.stringify(trackerChecks));
  }, [trackerChecks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MATRIX_CONFIG_KEY, JSON.stringify(matrixConfig));
  }, [matrixConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_WORKOUT_LOGS_KEY, JSON.stringify(completedLogs));
  }, [completedLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MATRIX_LOGS_KEY, JSON.stringify(matrixLogs));
  }, [matrixLogs]);

  //streak calculator
  // Consistency Streak Calculation
  const activeDaysStreak = useMemo(() => {
    const checkedKeys = Object.keys(trackerChecks).filter((k) => trackerChecks[k]);
    if (!checkedKeys.length) return 0;
    const uniqueDates = [...new Set(checkedKeys.map((k) => k.split("_")[1]))];
    return uniqueDates.length;
  }, [trackerChecks]);

  //rate calculator
  // Expanded Tracker Data Points Calculations
  const trackerStats = useMemo(() => {
    const totalVolume = completedLogs.reduce((sum, item) => sum + (item.totalVolume || 0), 0);
    const totalSets = completedLogs.reduce((sum, item) => sum + (item.completedSets || 0), 0);
    const totalReps = completedLogs.reduce((sum, item) => sum + (item.totalReps || (item.completedSets * 10)), 0);
    const avgVolume = completedLogs.length > 0 ? Math.round(totalVolume / completedLogs.length) : 0;
    const peakPR = completedLogs.reduce((max, item) => Math.max(max, item.totalVolume || 0), 0);

    const exerciseUsage = {};
    completedLogs.forEach((log) => {
      if (log.movements) {
        log.movements.forEach((name) => {
          exerciseUsage[name] = (exerciseUsage[name] || 0) + 1;
        });
      }
    });

    return { totalVolume, totalSets, totalReps, avgVolume, peakPR, exerciseUsage };
  }, [completedLogs]);

  // ==========================================
  // RESET ALL PROGRESS & RESET EVERYTHING TO 0
  // ==========================================
  const resetAllProgress = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all progress? This will clear all logged workouts, matrix checkmarks, schedules, and analytics back to zero."
    );
    if (!confirmed) return;

    // Reset local state to empty
    setUserChoices([]);
    setCompletedLogs([]);
    setMatrixLogs([]);
    setTrackerChecks({});
    setSessionRows({});

    // Reset timer state
    setTimerRunning(false);
    setTimerSecondsLeft(60);
    setTimerDuration(60);

    // Clear local storage keys
    localStorage.removeItem(STORAGE_CHOICES_KEY);
    localStorage.removeItem(STORAGE_TRACKER_KEY);
    localStorage.removeItem(STORAGE_WORKOUT_LOGS_KEY);
    localStorage.removeItem(STORAGE_MATRIX_LOGS_KEY);

    alert("All workout progress and data have been reset to zero.");
  };

  // Timer Controls
  const setRoundTimerDuration = (secs) => {
    initOrResumeAudio();
    setTimerDuration(secs);
    setTimerSecondsLeft(secs);
    setTimerRunning(false);
  };

  const resetRoundTimer = () => {
    setTimerRunning(false);
    setTimerSecondsLeft(timerDuration);
  };

  const toggleTimerRunning = () => {
    initOrResumeAudio();
    setTimerRunning((prev) => !prev);
  };

  // Toggle Live Set
  const toggleSetStatus = (exId, setIdx) => {
    initOrResumeAudio();
    setSessionRows((prev) => {
      const exSets = [...(prev[exId] || [])];
      const isComplete = !exSets[setIdx].done;
      exSets[setIdx] = { ...exSets[setIdx], done: isComplete };
      return { ...prev, [exId]: exSets };
    });
  };

  const updateSetMetric = (exId, setIdx, field, val) => {
    const num = Math.max(0, Number(val) || 0);
    setSessionRows((prev) => {
      const exSets = [...(prev[exId] || [])];
      exSets[setIdx] = { ...exSets[setIdx], [field]: num };
      return { ...prev, [exId]: exSets };
    });
  };
//action session logging
  // 1. SAVE WORKOUT SESSION (WEIGHT & REPS ONLY)
  const recordCompletedSession = () => {
    let volume = 0;
    let completedSetsCount = 0;
    let totalRepsCount = 0;
    const completedMovements = [];

    userChoices.forEach((ex) => {
      const sets = sessionRows[ex.id] || [];
      let movementLogged = false;
      sets.forEach((s) => {
        if (s.done) {
          completedSetsCount++;
          totalRepsCount += s.reps || 10;
          volume += s.reps * (s.weight > 0 ? s.weight : 1);
          movementLogged = true;
        }
      });
      if (movementLogged) {
        completedMovements.push(ex.name);
      }
    });

    if (completedSetsCount === 0) {
      alert("Please mark at least one set complete before finalizing.");
      return;
    }

    const now = new Date();
    const formattedDateTime = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " • " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newLog = {
      id: Date.now(),
      timestamp: formattedDateTime,
      completedSets: completedSetsCount,
      totalReps: totalRepsCount,
      totalVolume: volume,
      movements: completedMovements,
    };

    setCompletedLogs([newLog, ...completedLogs]);
    alert("Workout session weights & sets saved successfully!");
  };

//daily timeline / daily tracker
  // 2. SEPARATE SAVE OPTION FOR DAILY TIMELINE / COMPLIANCE DAYS
  const saveDailyTimelineProgress = () => {
    if (!matrixConfig.generatedTimeline || matrixConfig.generatedTimeline.length === 0) {
      alert("Please generate a timeline first.");
      return;
    }

    let checkedDaysCount = 0;
    let scheduledDaysCount = 0;

    userChoices.forEach((ex) => {
      matrixConfig.generatedTimeline.forEach((dt) => {
        const isScheduled = ex.days.includes(dt.dayOfWeek);
        if (isScheduled) {
          scheduledDaysCount++;
          if (trackerChecks[`${ex.id}_${dt.dateKey}`]) {
            checkedDaysCount++;
          }
        }
      });
    });

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " • " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMatrixRecord = {
      id: Date.now(),
      timestamp: formattedDate,
      period: `${matrixConfig.selectedMonth}/${matrixConfig.selectedYear} (Days ${matrixConfig.startDate}-${matrixConfig.endDate})`,
      completedChecks: checkedDaysCount,
      scheduledTotal: scheduledDaysCount,
      rate: scheduledDaysCount > 0 ? Math.round((checkedDaysCount / scheduledDaysCount) * 100) : 0,
    };

    setMatrixLogs([newMatrixRecord, ...matrixLogs]);
    alert(`Daily Timeline progress saved: ${checkedDaysCount} / ${scheduledDaysCount} checkmarks recorded.`);
  };

  // Filter Logic
  const allBodyParts = useMemo(() => {
    return [...new Set(exercises.flatMap((ex) => ex.bodyParts))].sort();
  }, [exercises]);

  const allEquipment = useMemo(() => {
    return [...new Set(exercises.flatMap((ex) => ex.equipment))].sort();
  }, [exercises]);

  const toggleStaged = (list, setList, item) => {
    if (list.includes(item)) setList(list.filter((v) => v !== item));
    else setList([...list, item]);
  };

  const applyFilters = () => {
    setActiveBodyParts(stagedBodyParts);
    setActiveEquipment(stagedEquipment);
  };

  const clearFilters = () => {
    setStagedBodyParts([]);
    setStagedEquipment([]);
    setActiveBodyParts([]);
    setActiveEquipment([]);
  };

  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch =
        !query ||
        ex.exerciseName.toLowerCase().includes(query) ||
        ex.description.toLowerCase().includes(query);

      const matchesBodyPart =
        activeBodyParts.length === 0 ||
        ex.bodyParts.some((part) => activeBodyParts.includes(part));

      const matchesEquipment =
        activeEquipment.length === 0 ||
        ex.equipment.some((eq) => activeEquipment.includes(eq));

      return matchesSearch && matchesBodyPart && matchesEquipment;
    });
  }, [exercises, searchQuery, activeBodyParts, activeEquipment]);

  const applyPreset = (preset) => {
    const newItems = preset.ids
      .map((id) => exercises.find((e) => e.id === id))
      .filter(Boolean)
      .map((ex) => ({
        id: ex.id,
        name: ex.exerciseName,
        sets: preset.sets,
        frequency: preset.days.length === 7 ? "Daily" : "Custom Days",
        days: preset.days,
      }));
    setUserChoices(newItems);
  };
//limit user to 2 sets more than high avg sets
  const maxAllowedSets = useMemo(() => {
    if (!modalExercise) return 6;
    const high = modalExercise.recommendedSets?.high || 4;
    return high + 2;
  }, [modalExercise]);

  const initiateAdd = (ex) => {
    setModalExercise(ex);
    setConfigSets(ex.recommendedSets?.average || 3);
    setConfigDays(["Mon", "Wed", "Fri"]);
    setConfigFrequency("Custom Days");
  };

  const toggleDayChoice = (day) => {
    let updatedDays = configDays.includes(day)
      ? configDays.filter((d) => d !== day)
      : [...configDays, day];
    setConfigDays(updatedDays);
    setConfigFrequency(updatedDays.length === 7 ? "Daily" : "Custom Days");
  };

  const confirmAddToRoutine = () => {
    if (!modalExercise) return;
    const finalDays =
      configFrequency === "Daily"
        ? DAYS
        : configDays.length ? configDays : ["Mon"];

    const newEntry = {
      id: modalExercise.id,
      name: modalExercise.exerciseName,
      sets: Number(configSets),
      frequency: configFrequency,
      days: finalDays,
    };
    setUserChoices([...userChoices.filter((i) => i.id !== modalExercise.id), newEntry]);
    setModalExercise(null);
  };

  const removeChoice = (id) => {
    setUserChoices(userChoices.filter((item) => item.id !== id));
  };
// remove exercise particular day
  const removeExerciseFromDay = (exerciseId, targetDay) => {
    setUserChoices((prev) =>
      prev
        .map((item) => {
          if (item.id === exerciseId) {
            const nextDays = item.days.filter((d) => d !== targetDay);
            return {
              ...item,
              days: nextDays,
              frequency: nextDays.length === 7 ? "Daily" : "Custom Days",
            };
          }
          return item;
        })
        .filter((item) => item.days.length > 0)
    );
  };

  // Matrix generation
  const daysInSelectedMonth = useMemo(() => {
    return new Date(matrixConfig.selectedYear, matrixConfig.selectedMonth, 0).getDate();
  }, [matrixConfig.selectedYear, matrixConfig.selectedMonth]);

  const generateTrackerMatrix = () => {
    const dates = [];
    const maxDays = daysInSelectedMonth;
    const start = Math.max(1, Math.min(Number(matrixConfig.startDate) || 1, maxDays));
    const end = Math.max(start, Math.min(Number(matrixConfig.endDate) || maxDays, maxDays));

    for (let d = start; d <= end; d++) {
      const cur = new Date(matrixConfig.selectedYear, matrixConfig.selectedMonth - 1, d);
      dates.push({
        dayNum: d,
        dayOfWeek: DAY_INDEX_MAP[cur.getDay()],
        dateKey: `${matrixConfig.selectedYear}-${String(matrixConfig.selectedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    setMatrixConfig((prev) => ({ 
      ...prev, 
      startDate: start,
      endDate: end,
      generatedTimeline: dates 
    }));
  };

  useEffect(() => {
    if (!matrixConfig.generatedTimeline) {
      generateTrackerMatrix();
    }
  }, []);
//tick tracking
  const toggleCheck = (exerciseId, dateKey) => {
    const key = `${exerciseId}_${dateKey}`;
    setTrackerChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // SVG Circular Math
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (timerSecondsLeft / timerDuration) * circumference;

  return (
    <div>
      {/* Top Navbar */}
      <nav className="top-navbar">
        <div className="brand-wrapper">
          <div className="brand-icon"></div>
          <span className="brand-badge">Apex Performance Systems</span>
        </div>

        <div className="nav-stats-cluster">
          <span className="stat-pill fire">{activeDaysStreak} Active Days</span>
          
          {/* RESET ALL DATA TO ZERO BUTTON */}
          <button 
            className="btn-reset-danger" 
            onClick={resetAllProgress}
            title="Clear all progress and reset everything to zero"
          >
            ↺ Reset Data
          </button>

          <button 
            className="theme-toggle-btn"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle Dark / Light Theme"
          >
            {darkMode ? "Light" : "Dark"}
          </button>
          
          <button 
            className="btn-red" 
            onClick={() => {
              generateTrackerMatrix();
              setExportModalOpen(true);
            }}
          >
            Export PDF
          </button>
        </div>
      </nav>

      {/* Hero Quote */}
      <header className="hero-block-red">
        <p className="hero-tag">Executive Conditioning Directive</p>
        <h1 className="hero-quote">
          {currentQuote ? `"${currentQuote.quote}"` : "Excellence is a habit."}
        </h1>
        {currentQuote && <p className="hero-author">— {currentQuote.author}</p>}
      </header>

      {/* Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === "timer" ? "active" : ""}`}
          onClick={() => setActiveTab("timer")}
        >
          Timer
        </button>
        <button
          className={`tab-btn ${activeTab === "exercises" ? "active" : ""}`}
          onClick={() => setActiveTab("exercises")}
        >
          Exercises
        </button>
        <button
          className={`tab-btn ${activeTab === "schedule" ? "active" : ""}`}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule ({userChoices.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "tracker" ? "active" : ""}`}
          onClick={() => setActiveTab("tracker")}
        >
          Tracker
        </button>
      </div>

      <main className="main-container">
        {/* TAB 1: TIMER */}
        {activeTab === "timer" && (
          <section>
            <div className="section-head" style={{ textAlign: "center" }}>
              <h2 className="section-title">Interval Rest Timer</h2>
              <p className="section-sub">
                Select duration, run intervals, and use audio cues to stay on schedule.
              </p>
            </div>

            <div className="timer-page-wrapper">
              <div className="timer-card-standalone">
                <div className="circular-timer-container">
                  <svg className="timer-svg" width="220" height="220">
                    <circle className="timer-circle-bg" cx="110" cy="110" r={radius} />
                    <circle
                      className="timer-circle-progress"
                      cx="110"
                      cy="110"
                      r={radius}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                    />
                  </svg>
                  <div className="timer-display-inner">
                    <div className="timer-time-val">{timerSecondsLeft}s</div>
                    <div className="timer-state-label">
                      {timerRunning ? "Active Rest" : "Standby"}
                    </div>
                  </div>
                </div>

                <div className="timer-controls-row">
                  <button className="btn-preset" onClick={() => setRoundTimerDuration(30)}>30s</button>
                  <button className="btn-preset" onClick={() => setRoundTimerDuration(60)}>60s</button>
                  <button className="btn-preset" onClick={() => setRoundTimerDuration(90)}>90s</button>
                  <button className="btn-preset" onClick={() => setRoundTimerDuration(120)}>120s</button>
                </div>

                <div className="timer-controls-row">
                  <button
                    className="btn-red"
                    onClick={toggleTimerRunning}
                  >
                    {timerRunning ? "Pause" : "Start"}
                  </button>
                  <button className="btn-preset" onClick={resetRoundTimer}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: EXERCISES */}
        {activeTab === "exercises" && (
          <>
            <div className="search-bar-row">
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)" }}>Presets:</span>
                {PRESET_ROUTINES.map((p) => (
                  <button key={p.name} onClick={() => applyPreset(p)} className="btn-preset">
                    + {p.name}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search exercises..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="layout-grid">
              <aside className="filter-sidebar">
                <div>
                  <div className="filter-header">
                    <h3>Body Part</h3>
                    <button className="clear-btn" onClick={() => setStagedBodyParts([])}>Clear</button>
                  </div>
                  <div className="filter-group">
                    {allBodyParts.map((bp) => (
                      <button
                        key={bp}
                        onClick={() => toggleStaged(stagedBodyParts, setStagedBodyParts, bp)}
                        className={`filter-pill ${stagedBodyParts.includes(bp) ? "active" : ""}`}
                      >
                        {bp}
                      </button>
                    ))}
                  </div>
                </div>

                <hr style={{ border: "0.5px solid var(--border-color)" }} />

                <div>
                  <div className="filter-header">
                    <h3>Equipment</h3>
                    <button className="clear-btn" onClick={() => setStagedEquipment([])}>Clear</button>
                  </div>
                  <div className="filter-group">
                    {allEquipment.map((eq) => (
                      <button
                        key={eq}
                        onClick={() => toggleStaged(stagedEquipment, setStagedEquipment, eq)}
                        className={`filter-pill ${stagedEquipment.includes(eq) ? "active" : ""}`}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn-red" style={{ width: "100%" }} onClick={applyFilters}>
                  Apply Filters
                </button>
                <button className="clear-btn" style={{ textAlign: "center" }} onClick={clearFilters}>
                  Reset All
                </button>
              </aside>

              <section>
                <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                  FOUND {filteredExercises.length} EXERCISES
                </div>

                <div className="cards-grid">
                  {filteredExercises.map((ex) => {
                    const isChosen = userChoices.some((item) => item.id === ex.id);
                    return (
                      <article key={ex.id} className="exercise-card">
                        <button
                          onClick={() => initiateAdd(ex)}
                          className={`action-add-btn ${isChosen ? "added" : ""}`}
                        >
                          {isChosen ? "✓" : "+"}
                        </button>
                        <h4 className="card-title">{ex.exerciseName}</h4>
                        <span className="tag-badge">{ex.bodyParts.join(", ")}</span>
                        <p className="card-desc">{ex.description}</p>
                        <div className="sets-badge-group">
                          <span className="sets-badge">Low: {ex.recommendedSets.low}</span>
                          <span className="sets-badge">Med: {ex.recommendedSets.average}</span>
                          <span className="sets-badge">High: {ex.recommendedSets.high}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        )}

        {/* TAB 3: SCHEDULE */}
        {activeTab === "schedule" && (
          <section>
            <div className="section-head">
              <h2 className="section-title">Weekly Schedule</h2>
              <p className="section-sub">Assigned training split across the 7-day week.</p>
            </div>

            <div className="chosen-tray">
              <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>
                Selected Exercises ({userChoices.length})
              </span>
              {userChoices.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  No exercises added yet. Select exercises from the Exercises tab to populate your schedule.
                </p>
              ) : (
                <div className="chosen-tray-pills">
                  {userChoices.map((item) => (
                    <div key={item.id} className="chosen-pill">
                      <span>{item.name} ({item.sets} Sets • {item.frequency === "Daily" ? "Daily" : item.days.join(", ")})</span>
                      <button className="clear-btn" onClick={() => removeChoice(item.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* 1. 7-Day Calendar Grid */}
            <div className="calendar-grid">
              {DAYS.map((day) => {
                const dayExercises = userChoices.filter((item) => item.days.includes(day));
                return (
                  <div key={day} className="calendar-day-col">
                    <div className="day-title">{day}</div>
                    {dayExercises.length === 0 ? (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Rest Day</span>
                    ) : (
                      dayExercises.map((item) => (
                        <div key={item.id} className="scheduled-item-card">
                          <button
                            className="clear-btn"
                            style={{ alignSelf: "flex-end" }}
                            onClick={() => removeExerciseFromDay(item.id, day)}
                          >
                            ✕
                          </button>
                          <div style={{ fontWeight: 800, color: "var(--text-heading)" }}>{item.name}</div>
                          <div style={{ color: "var(--brand-red)", fontWeight: 700 }}>{item.sets} Sets</div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. Daily Compliance Matrix */}
            <div className="matrix-section-divider">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-heading)" }}>
                    Daily Compliance Matrix
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Date-by-date matrix checkmarks to record execution across calendar days.
                  </p>
                </div>

                <button 
                  className="btn-outline-red" 
                  onClick={saveDailyTimelineProgress}
                  title="Save only the daily attendance checks"
                >
                  Save Daily Matrix Progress
                </button>
              </div>

              <div className="matrix-controls-card">
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>Year</label>
                  <input
                    type="number"
                    value={matrixConfig.selectedYear}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, selectedYear: Number(e.target.value) }))}
                    className="matrix-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>Month</label>
                  <select
                    value={matrixConfig.selectedMonth}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, selectedMonth: Number(e.target.value) }))}
                    className="matrix-input"
                  >
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>Start Day</label>
                  <input
                    type="number"
                    min="1"
                    max={daysInSelectedMonth}
                    value={matrixConfig.startDate}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, startDate: Number(e.target.value) }))}
                    className="matrix-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>End Day</label>
                  <input
                    type="number"
                    min={matrixConfig.startDate}
                    max={daysInSelectedMonth}
                    value={matrixConfig.endDate}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, endDate: Number(e.target.value) }))}
                    className="matrix-input"
                  />
                </div>

                <button className="btn-red" onClick={generateTrackerMatrix}>
                  Generate Timeline
                </button>
              </div>

              {matrixConfig.generatedTimeline && matrixConfig.generatedTimeline.length > 0 && (
                <div className="matrix-container">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th className="matrix-sticky-col">Movement Specification</th>
                        {matrixConfig.generatedTimeline.map((dt) => (
                          <th key={dt.dateKey}>
                            <div>{dt.dayNum}</div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{dt.dayOfWeek}</div>
                          </th>
                        ))}
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userChoices.length === 0 ? (
                        <tr>
                          <td colSpan={matrixConfig.generatedTimeline.length + 2} style={{ padding: "1.5rem", color: "var(--text-secondary)" }}>
                            No exercises added to routine. Add exercises in the Exercises tab to preview matrix.
                          </td>
                        </tr>
                      ) : (
                        userChoices.map((ex) => {
                          let totalScheduled = 0;
                          let totalCompleted = 0;

                          return (
                            <tr key={ex.id}>
                              <td className="matrix-sticky-col">
                                {ex.name} <span style={{ color: "var(--brand-red)" }}>({ex.sets}s)</span>
                              </td>

                              {matrixConfig.generatedTimeline.map((dt) => {
                                const isScheduled = ex.days.includes(dt.dayOfWeek);
                                const isChecked = !!trackerChecks[`${ex.id}_${dt.dateKey}`];

                                if (isScheduled) {
                                  totalScheduled++;
                                  if (isChecked) totalCompleted++;
                                }

                                return (
                                  <td
                                    key={dt.dateKey}
                                    className={`matrix-cell ${isScheduled ? (isChecked ? "completed" : "scheduled") : "off-day"}`}
                                  >
                                    {isScheduled ? (
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleCheck(ex.id, dt.dateKey)}
                                        className="matrix-checkbox"
                                      />
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td style={{ fontWeight: 800, color: "var(--brand-red)" }}>
                                {totalCompleted} / {totalScheduled}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Active Session Logging */}
            <div className="session-logging-section">
              <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 className="section-title" style={{ fontSize: "1.25rem" }}>Active Session Logging</h3>
                  <p className="section-sub">Input target workloads, check off completed sets, and finalize your workout session.</p>
                </div>
                {userChoices.length > 0 && (
                  <button className="btn-red" onClick={recordCompletedSession}>
                    Save & Finalize Session
                  </button>
                )}
              </div>

              {userChoices.length === 0 ? (
                <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "2rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    No routine configured. Add exercises in the Exercises tab to log sets.
                  </p>
                </div>
              ) : (
                userChoices.map((ex) => {
                  const sets = sessionRows[ex.id] || [];
                  return (
                    <div key={ex.id} className="live-exercise-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ fontSize: "1rem", fontWeight: 800 }}>{ex.name}</h4>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--brand-red)" }}>
                          {ex.sets} Sets Scheduled
                        </span>
                      </div>

                      <div className="set-header-grid">
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Set</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Weight (kg/lbs)</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Reps</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Action</span>
                      </div>

                      <div>
                        {sets.map((s, idx) => (
                          <div key={idx} className="set-row-grid">
                            <span style={{ fontWeight: 800, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                              SET {idx + 1}
                            </span>
                            <div>
                              <input
                                type="number"
                                min="0"
                                value={s.weight}
                                onChange={(e) => updateSetMetric(ex.id, idx, "weight", e.target.value)}
                                className="set-input-num"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                value={s.reps}
                                onChange={(e) => updateSetMetric(ex.id, idx, "reps", e.target.value)}
                                className="set-input-num"
                                placeholder="10"
                              />
                            </div>
                            <button
                              className={`btn-complete-set ${s.done ? "done" : ""}`}
                              onClick={() => toggleSetStatus(ex.id, idx)}
                            >
                              {s.done ? "✓ Done" : "Mark Set"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* TAB 4: TRACKER */}
        {activeTab === "tracker" && (
          <section>
            <div className="section-head">
              <h2 className="section-title">Workout Performance Analytics</h2>
              <p className="section-sub">Comprehensive multi-point performance metrics, frequency distributions, and audit trails.</p>
            </div>

            {/* EXPANDED 6 DATA POINT KPI GRID */}
            <div className="analytics-grid-expanded">
              <div className="metric-stat-card">
                <div>
                  <span className="metric-stat-label">Daily Timeline Saves</span>
                  <div className="metric-stat-number">{matrixLogs.length}</div>
                </div>
                <div className="metric-stat-sub">Calendar compliance audits logged</div>
              </div>

              <div className="metric-stat-card">
                <div>
                  <span className="metric-stat-label">Workouts Finished</span>
                  <div className="metric-stat-number">{completedLogs.length}</div>
                </div>
                <div className="metric-stat-sub">{trackerStats.totalSets} total sets executed</div>
              </div>

              <div className="metric-stat-card">
                <div>
                  <span className="metric-stat-label">Cumulative Volume</span>
                  <div className="metric-stat-number">{trackerStats.totalVolume.toLocaleString()}</div>
                </div>
                <div className="metric-stat-sub">Total tonnage units lifted</div>
              </div>

              <div className="metric-stat-card">
                <div>
                  <span className="metric-stat-label">Total Repetitions</span>
                  <div className="metric-stat-number">{trackerStats.totalReps.toLocaleString()}</div>
                </div>
                <div className="metric-stat-sub">Gross repetitions performed</div>
              </div>

              <div className="metric-stat-card">
                <div>
                  <span className="metric-stat-label">Avg Session Volume</span>
                  <div className="metric-stat-number">{trackerStats.avgVolume.toLocaleString()}</div>
                </div>
                <div className="metric-stat-sub">Units lifted per completed session</div>
              </div>

              <div className="metric-stat-card">
                <div>
                  <span className="metric-stat-label">Peak Session Volume (PR)</span>
                  <div className="metric-stat-number">{trackerStats.peakPR.toLocaleString()}</div>
                </div>
                <div className="metric-stat-sub">Highest recorded single-session tonnage</div>
              </div>
            </div>

            {/* FREQUENCY DISTRIBUTION */}
            {Object.keys(trackerStats.exerciseUsage).length > 0 && (
              <div className="history-card-list" style={{ marginTop: "1.25rem" }}>
                <span className="metric-stat-label">Exercise Usage Distribution</span>
                <div className="distribution-badge-container" style={{ marginTop: "0.5rem" }}>
                  {Object.entries(trackerStats.exerciseUsage).map(([name, count]) => (
                    <div key={name} className="dist-pill">
                      {name} <span style={{ color: "var(--brand-red)", marginLeft: "0.25rem" }}>×{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. SEPARATE LOG: Daily Timeline / Compliance History */}
            <div className="history-card-list">
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-heading)", marginBottom: "0.75rem" }}>
                1. Daily Matrix Compliance Log (Days & Adherence)
              </h3>
              {matrixLogs.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  No matrix compliance saves yet. Click "Save Daily Matrix Progress" in the Schedule tab to log days.
                </p>
              ) : (
                matrixLogs.map((log) => (
                  <div key={log.id} className="history-log-row">
                    <div>
                      <strong style={{ color: "var(--text-heading)" }}>{log.timestamp}</strong>
                      <span style={{ color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                        • {log.period}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--brand-red)" }}>
                      {log.completedChecks} / {log.scheduledTotal} checked ({log.rate}%)
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. SEPARATE LOG: Weight / Reps Session Workouts */}
            <div className="history-card-list">
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-heading)", marginBottom: "0.75rem" }}>
                2. Weight & Reps Workout Sessions Log
              </h3>
              {completedLogs.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  No sessions recorded yet. Finalize a session in the Schedule tab to log weights and reps.
                </p>
              ) : (
                completedLogs.map((log) => (
                  <div key={log.id} className="history-log-row">
                    <div>
                      <strong style={{ color: "var(--text-heading)" }}>{log.timestamp || log.date}</strong>
                      <span style={{ color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
                        • {log.completedSets} sets finalized ({log.totalReps || (log.completedSets * 10)} reps)
                      </span>
                      {log.movements && log.movements.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                          Targeted: {log.movements.join(", ")}
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--brand-red)" }}>
                      {log.totalVolume.toLocaleString()} volume units
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Export PDF Modal */}
      {exportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card-wide">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Export Compliance Matrix</h3>
              <button className="clear-btn" style={{ fontSize: "1rem" }} onClick={() => setExportModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body-scroll">
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Select timeline parameters, generate the compliance table, and save as PDF.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>Year</label>
                  <input
                    type="number"
                    value={matrixConfig.selectedYear}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, selectedYear: Number(e.target.value) }))}
                    className="matrix-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>Month</label>
                  <select
                    value={matrixConfig.selectedMonth}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, selectedMonth: Number(e.target.value) }))}
                    className="matrix-input"
                  >
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>Start Day</label>
                  <input
                    type="number"
                    min="1"
                    max={daysInSelectedMonth}
                    value={matrixConfig.startDate}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, startDate: Number(e.target.value) }))}
                    className="matrix-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>End Day</label>
                  <input
                    type="number"
                    min={matrixConfig.startDate}
                    max={daysInSelectedMonth}
                    value={matrixConfig.endDate}
                    onChange={(e) => setMatrixConfig((prev) => ({ ...prev, endDate: Number(e.target.value) }))}
                    className="matrix-input"
                  />
                </div>

                <button className="btn-red" onClick={generateTrackerMatrix}>
                  Update Table
                </button>
              </div>

              {matrixConfig.generatedTimeline && matrixConfig.generatedTimeline.length > 0 ? (
                <div className="matrix-container">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th className="matrix-sticky-col">Movement Specification</th>
                        {matrixConfig.generatedTimeline.map((dt) => (
                          <th key={dt.dateKey}>
                            <div>{dt.dayNum}</div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{dt.dayOfWeek}</div>
                          </th>
                        ))}
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userChoices.length === 0 ? (
                        <tr>
                          <td colSpan={matrixConfig.generatedTimeline.length + 2} style={{ padding: "1.5rem", color: "var(--text-secondary)" }}>
                            No exercises added to routine. Add exercises in the Exercises tab to preview matrix.
                          </td>
                        </tr>
                      ) : (
                        userChoices.map((ex) => {
                          let totalScheduled = 0;
                          let totalCompleted = 0;

                          return (
                            <tr key={ex.id}>
                              <td className="matrix-sticky-col">
                                {ex.name} <span style={{ color: "var(--brand-red)" }}>({ex.sets}s)</span>
                              </td>

                              {matrixConfig.generatedTimeline.map((dt) => {
                                const isScheduled = ex.days.includes(dt.dayOfWeek);
                                const isChecked = !!trackerChecks[`${ex.id}_${dt.dateKey}`];

                                if (isScheduled) {
                                  totalScheduled++;
                                  if (isChecked) totalCompleted++;
                                }

                                return (
                                  <td
                                    key={dt.dateKey}
                                    className={`matrix-cell ${isScheduled ? (isChecked ? "completed" : "scheduled") : "off-day"}`}
                                  >
                                    {isScheduled ? (
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleCheck(ex.id, dt.dateKey)}
                                        className="matrix-checkbox"
                                      />
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td style={{ fontWeight: 800, color: "var(--brand-red)" }}>
                                {totalCompleted} / {totalScheduled}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                  Click "Update Table" to generate the matrix for the selected dates.
                </div>
              )}
            </div>

            {/* Docked Footer */}
            <div className="modal-footer-docked">
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {userChoices.length} movements • {matrixConfig.generatedTimeline ? matrixConfig.generatedTimeline.length : 0} days previewed
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  className="btn-dark" 
                  onClick={() => window.print()}
                >
                  Print / Save PDF
                </button>
                <button className="btn-preset" onClick={() => setExportModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Addition Modal */}
      {modalExercise && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>{modalExercise.exerciseName}</h3>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                Target Sets (1 to {maxAllowedSets})
              </label>
              <input
                type="number"
                min="1"
                max={maxAllowedSets}
                value={configSets}
                onChange={(e) => setConfigSets(Math.max(1, Math.min(maxAllowedSets, Number(e.target.value))))}
                className="matrix-input"
                style={{ width: "100%", marginTop: "0.3rem" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                Target Weekdays
              </label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                {DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDayChoice(d)}
                    className="btn-preset"
                    style={{
                      backgroundColor: configDays.includes(d) ? "var(--brand-red)" : "var(--btn-preset-bg)",
                      color: configDays.includes(d) ? "#ffffff" : "var(--text-heading)",
                      borderColor: configDays.includes(d) ? "var(--brand-red)" : "var(--border-color)",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn-preset" onClick={() => setModalExercise(null)}>Cancel</button>
              <button className="btn-red" onClick={confirmAddToRoutine}>Confirm Protocol</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}