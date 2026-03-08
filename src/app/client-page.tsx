"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Camera,
  AlertTriangle,
  Activity,
  Zap,
  Shield,
  Clock,
  Car,
  Users,
  AlertOctagon,
  History,
  DollarSign,
  Check,
  X,
  MessageSquare,
  Loader2,
  Trophy,
  ExternalLink
} from "lucide-react";
import Image from "next/image";
import { HOTSPOTS, INITIAL_LIVE_STATS, SINGAPORE_MAP_VIEW } from "@/data/mockData";
import { generateBlueprint, generateAlternative, checkSystemStatus, type BlueprintResponse } from "./actions";
import { GmpMap3D } from "@/components/GmpMap3D";

export default function CommandCenter() {
  const [viewState, setViewState] = useState<
    "map" | "live-cctv" | "assessing" | "blueprint" | "results-history"
  >("map");
  const [liveStats, setLiveStats] = useState(INITIAL_LIVE_STATS);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [blueprintData, setBlueprintData] = useState<BlueprintResponse | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [pastEvaluations, setPastEvaluations] = useState<{
    id: string;
    label: string;
    timestamp: Date;
    data: BlueprintResponse;
    image: string | null;
    modStatuses: ModStatus[];
  }[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(null);

  const activeHotspot = HOTSPOTS.find(h => h.id === selectedHotspotId) || HOTSPOTS[0];

  // Review Status State
  type ModStatus = { status: "pending" | "accepted" | "rejecting" | "generating" | "rejected", rejectReason: string };
  const [modStatuses, setModStatuses] = useState<ModStatus[]>([]);

  const [showWelcome, setShowWelcome] = useState(false);
  const [showSunsetBanner, setShowSunsetBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeen = localStorage.getItem("krashless_hasSeenWelcome");
      if (!hasSeen) {
        setShowWelcome(true);
      }
    }
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("krashless_hasSeenWelcome", "true");
    }
  };

  const clampPct = (value: number, min = 3, max = 97) => Math.min(max, Math.max(min, value));

  // Live Stats Ticker
  useEffect(() => {
    if (viewState !== "live-cctv") return;
    const interval = setInterval(() => {
      setLiveStats((prev) => ({
        vehicles: prev.vehicles + Math.floor(Math.random() * 3),
        pedestrians: prev.pedestrians + Math.floor(Math.random() * 2),
        heavy_trucks: prev.heavy_trucks + (Math.random() > 0.8 ? 1 : 0),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [viewState]);

  const handleEvaluate = async () => {
    // Check if we're in sunset mode
    const systemStatus = await checkSystemStatus();
    if (systemStatus.isSunsetMode) {
      setShowSunsetBanner(true);
      // Wait a bit to let the user see the banner before proceeding with mock data
      await new Promise((res) => setTimeout(res, 3500));
      setShowSunsetBanner(false);
    }

    setViewState("assessing");

    // Simulate terminal typing
    const logs = [
      "Initializing AI Evaluation Protocol...",
      "Ingesting Spatial Data from Google Earth Engine...",
      `Evaluating Hazard Vectors (Red light violations: ${activeHotspot.zoning.violations_ytd.red_light})...`,
      "Simulating Pedestrian Density Flow...",
      "Generating Proposed Infrastructure Delta via Nano Banana & Gemini 3.1 Pro Preview..."
    ];

    setTerminalLogs([]);

    for (let i = 0; i < logs.length; i++) {
      await new Promise((res) => setTimeout(res, 800));
      setTerminalLogs((prev) => [...prev, logs[i]]);
    }

    // Server Action
    const result = await generateBlueprint();
    setBlueprintData(result.data);
    const initialModStatuses: ModStatus[] = result.data.modifications.map(() => ({ status: "pending", rejectReason: "Bollards might block a specific turning radius for SBS double-deckers." }));
    setModStatuses(initialModStatuses);
    if (result.imageBase64) setGeneratedImage(result.imageBase64);

    const newId = Math.random().toString(36).substr(2, 9);
    setActiveEvaluationId(newId);

    setPastEvaluations(prev => [
      {
        id: newId,
        label: activeHotspot.name,
        timestamp: new Date(),
        data: result.data,
        image: result.imageBase64,
        modStatuses: initialModStatuses
      },
      ...prev
    ]);

    setViewState("blueprint");
  };

  const resetToHome = () => {
    setViewState("map");
    setSelectedHotspotId(null);
    setActiveTooltip(null);
  };

  const loadPastEvaluation = (record: any) => {
    setActiveEvaluationId(record.id);
    setBlueprintData(record.data);
    setModStatuses(record.modStatuses || record.data.modifications.map(() => ({ status: "pending", rejectReason: "Bollards might block a specific turning radius for SBS double-deckers." })));
    setGeneratedImage(record.image);
    setActiveTooltip(null);
    setViewState("blueprint");
  };

  const updateModStatus = (index: number, newStatus: Partial<ModStatus>) => {
    setModStatuses(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...newStatus };

      // Sync immediately to past evaluations
      setPastEvaluations(prevEvals => prevEvals.map(ev =>
        ev.id === activeEvaluationId ? { ...ev, modStatuses: copy } : ev
      ));

      return copy;
    });
  };

  const handleRejectSubmit = async (index: number) => {
    if (!blueprintData) return;

    const reason = modStatuses[index].rejectReason;
    updateModStatus(index, { status: "generating" });

    // Call server action for alternative
    const alternative = await generateAlternative(blueprintData.modifications[index] as any, reason);

    // Replace the modification with the new AI alternative
    let newData: BlueprintResponse | null = null;
    setBlueprintData(prev => {
      if (!prev) return prev;
      const newMods = [...prev.modifications];
      newMods[index] = alternative;
      newData = { ...prev, modifications: newMods };
      return newData;
    });

    // Reset status and sync both the new AI data and status into past evaluations
    setModStatuses(prev => {
      const copy = [...prev];
      copy[index] = { status: "pending", rejectReason: "Bollards might block a specific turning radius for SBS double-deckers." };

      setPastEvaluations(prevEvals => prevEvals.map(ev => {
        if (ev.id === activeEvaluationId && newData) {
          return { ...ev, data: newData, modStatuses: copy };
        }
        return ev;
      }));

      return copy;
    });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation / Branding */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={resetToHome}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="w-8 h-8 rounded-md bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-slate-950" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Krashless</h1>
          </button>
          <span className="px-2 py-1 ml-4 rounded bg-slate-800 text-xs font-medium text-slate-400 border border-slate-700 hidden sm:inline-block">
            LTA Generative Urban Prototyping
          </span>

          <button
            onClick={() => setShowWelcome(true)}
            className="ml-2 flex items-center gap-2 text-yellow-500 bg-yellow-950/30 hover:bg-yellow-950/50 px-3 py-1.5 rounded-full border border-yellow-900/50 shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden md:inline-block">
              2nd Place ($30,000) • Gemini 3 Hackathon
            </span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {pastEvaluations.length > 0 && (
            <button
              onClick={() => setViewState("results-history")}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-2 text-slate-300 font-medium"
            >
              <History className="w-4 h-4 text-emerald-400" />
              Past Evaluations ({pastEvaluations.length})
            </button>
          )}
          <div className="flex items-center gap-2 ml-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            System Online
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Global Floating Elements */}
        <AnimatePresence>
          {showSunsetBanner && (
            <motion.div
              key="sunset-banner"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-lg"
            >
              <div className="bg-orange-950/90 border border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)] rounded-xl p-4 flex items-start gap-4 backdrop-blur-md">
                <div className="bg-orange-900/50 p-2 rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-1">Sunset Mode Active</h3>
                  <p className="text-orange-200/80 text-sm leading-relaxed">
                    Live Gemini API keys have been removed post-hackathon. Krashless is now demonstrating analysis using simulated mock data.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {showWelcome && (
            <motion.div
              key="welcome-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6"
            >
              <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col items-center text-center">
                {/* Close Button */}
                <button
                  onClick={dismissWelcome}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Prize Header */}
                <div className="flex items-center gap-2 text-yellow-500 bg-yellow-950/30 px-4 py-1.5 rounded-full border border-yellow-900/50 shadow-[0_0_15px_rgba(234,179,8,0.1)] mb-6">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    2nd Place Winner ($30,000)
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4 tracking-tight">
                  Gemini 3 Singapore Hackathon
                </h2>
                <p className="text-slate-300 mb-8 max-w-lg leading-relaxed text-sm md:text-base">
                  Krashless was awarded 2nd place out of 370+ participants in this exclusive event hosted by Google DeepMind and Cerebral Valley.
                </p>

                {/* Logos Grid */}
                <div className="flex flex-col items-center gap-5 mb-10 w-full bg-slate-950/50 py-6 rounded-xl border border-slate-800/50 shadow-inner">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    Hosted By
                  </span>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-10 w-full">
                    <a href="https://deepmind.google" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-all hover:-translate-y-0.5">
                      <Image src="/deepmind.png" alt="Google DeepMind" width={40} height={40} className="object-contain h-10 w-10" />
                      <span className="font-semibold text-slate-200 text-lg tracking-tight">Google DeepMind</span>
                    </a>
                    <span className="hidden sm:block text-slate-700">|</span>
                    <a href="https://cerebralvalley.ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-all hover:-translate-y-0.5">
                      <Image src="/cerebral_valley.png" alt="Cerebral Valley" width={40} height={40} className="object-contain h-10 w-10 rounded-md" />
                      <span className="font-semibold text-slate-200 text-lg tracking-tight">Cerebral Valley</span>
                    </a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <a
                    href="https://cerebralvalley.ai/e/gemini-3-singapore-hackathon/hackathon/gallery"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    View Project Gallery
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={dismissWelcome}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700 flex items-center justify-center"
                  >
                    Enter Application
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {viewState === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <GmpMap3D
                center={SINGAPORE_MAP_VIEW}
                tilt={30}
                heading={0}
                range={22000}
                className="w-full h-full relative"
                markers={HOTSPOTS.map((h) => ({
                  id: h.id,
                  position: { lat: h.lat, lng: h.lng, altitude: 0 },
                  label: h.name,
                  thumbnailUrl: h.poster,
                }))}
                flyToMarkerOnClick
                flyToMarkerDurationMs={2400}
                flyToMarkerTilt={55}
                flyToMarkerRange={650}
                showMarkerDetailsId={selectedHotspotId}
                onMarkerClick={(marker) => {
                  if (selectedHotspotId !== marker.id) {
                    setSelectedHotspotId(marker.id || null);
                    return;
                  }
                  setViewState("live-cctv");
                }}
              />

              {/* HUD Elements */}
              <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur border border-slate-800 p-4 rounded-xl max-w-sm pointer-events-none">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  City-Wide Scan Active
                </h3>
                <p className="text-sm text-slate-400">
                  Scanning LTA grid for high-risk zones based on historical crash data, traffic volume, and demographic density.
                </p>
              </div>
            </motion.div>
          )}

          {viewState === "live-cctv" && (
            <motion.div
              key="live-cctv"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 p-6 flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={resetToHome}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>&larr;</span> Back to Macro View
                </button>
                <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
                  <MapPin className="text-red-500" />
                  Intersection: {activeHotspot.name}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left Column: CCTV */}
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black flex flex-col shadow-2xl">
                  <div className="absolute top-4 left-4 z-10 bg-red-600/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-2 shadow-lg border border-red-500/50">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                  <video
                    src={activeHotspot.video}
                    poster={activeHotspot.poster}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain opacity-90"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12">
                    <div className="flex items-center gap-6 text-slate-300 text-sm font-mono">
                      <span className="flex items-center gap-2"><Camera className="w-4 h-4 text-slate-400" /> CAM-{activeHotspot.id.toUpperCase()}</span>
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> {new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Data & Actions */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center gap-2 text-slate-400 font-semibold mb-3 text-sm tracking-wide uppercase">
                        <Users className="w-4 h-4 text-blue-400" /> Demographics
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{activeHotspot.zoning.demographics}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center gap-2 text-slate-400 font-semibold mb-3 text-sm tracking-wide uppercase">
                        <AlertOctagon className="w-4 h-4 text-purple-400" /> Zone Type
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{activeHotspot.zoning.zone_type}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-red-900/50 rounded-xl p-5 relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5" /> Hazard Profile
                    </h3>
                    <p className="text-sm mb-5 text-slate-300 border-l-2 border-red-500/30 pl-3">{activeHotspot.zoning.historical_incidents}</p>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 shadow-inner">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Red Light Violations</div>
                        <div className="text-2xl font-bold text-red-400 font-mono">{activeHotspot.zoning.violations_ytd.red_light}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 shadow-inner">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Speeding Violations</div>
                        <div className="text-2xl font-bold text-orange-400 font-mono">{activeHotspot.zoning.violations_ytd.speeding}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 shadow-inner">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Red Light Duration</div>
                        <div className="text-2xl font-bold text-slate-200 font-mono">{activeHotspot.zoning.light_duration_sec.red}s</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex-1 shadow-lg">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-5 text-slate-200">
                      <Activity className="w-5 h-5 text-emerald-400" /> Live Traffic Stats
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1 tracking-wide"><Car className="w-3 h-3 text-slate-400" /> Vehicles</span>
                        <span className="text-3xl font-mono text-emerald-400">{liveStats.vehicles}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1 tracking-wide"><Users className="w-3 h-3 text-slate-400" /> Pedestrians</span>
                        <span className="text-3xl font-mono text-emerald-400">{liveStats.pedestrians}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1 tracking-wide">Heavy Trucks</span>
                        <span className="text-3xl font-mono text-orange-400">{liveStats.heavy_trucks}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleEvaluate}
                    className="mt-2 w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Zap className="w-5 h-5" />
                    Analyze
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {viewState === "assessing" && (
            <motion.div
              key="assessing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm z-50 p-8"
            >
              <div className="w-full max-w-2xl bg-black border border-slate-800 rounded-xl p-6 font-mono text-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="text-slate-500 ml-2 font-semibold">krashless-terminal ~ sys/evaluate</div>
                </div>

                <div className="flex flex-col gap-4 min-h-[250px]">
                  {terminalLogs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-emerald-400 flex items-start gap-3"
                    >
                      <span className="text-slate-600 select-none mt-0.5">&gt;</span>
                      <span className="leading-relaxed">{log}</span>
                    </motion.div>
                  ))}
                  <motion.div
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-2.5 h-5 bg-emerald-400 ml-5 mt-1"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {viewState === "blueprint" && blueprintData && (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 p-6 flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={resetToHome}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>&larr;</span> Back to Home
                </button>
                <h2 className="text-2xl font-bold flex items-center gap-3 text-emerald-400">
                  <Shield className="text-emerald-500 w-7 h-7" />
                  Intersection: {activeHotspot.name} - Proposed Infrastructure Delta
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-8 flex-1 min-h-0">
                {/* Left Column: Image with Pins */}
                <div className="relative rounded-xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-2xl group aspect-video self-start">
                  <div className="absolute top-4 left-4 z-20 bg-emerald-600/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400/30">
                    <Zap className="w-3 h-3" />
                    GENERATED BLUEPRINT
                  </div>
                  <img
                    src={generatedImage || "/nanobanana-after.jpg"}
                    className="w-full h-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                    alt="Proposed Blueprint"
                  />

                  {blueprintData.modifications.map((mod, i) => (
                    <div
                      key={i}
                      className="absolute group z-10 transition-transform hover:scale-125 -translate-x-1/2 -translate-y-1/2"
                      style={{ top: `${clampPct(mod.y)}%`, left: `${clampPct(mod.x)}%` }}
                    >
                      {/* Pulsing Dot */}
                      <div className={`w-8 h-8 rounded-full animate-ping absolute -top-1 -left-1 opacity-75 ${activeTooltip === i ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
                      <button
                        className={`w-6 h-6 border-2 border-white rounded-full relative z-10 cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-colors ${activeTooltip === i ? 'bg-emerald-400 scale-110 shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-emerald-600'}`}
                        onClick={() => setActiveTooltip(activeTooltip === i ? null : i)}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-950">
                          {i + 1}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Right Column: Justifications */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-8">
                  <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-5 mb-2 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5" /> Simulation Summary
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Based on hazard profile assessment, 3 structural deltas are recommended to mitigate pedestrian exposure and limit heavy vehicle mounting risks.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {blueprintData.modifications.map((mod, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveTooltip(i)}
                        className={`p-5 rounded-xl border transition-all cursor-pointer ${activeTooltip === i
                          ? 'bg-slate-800 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] transform scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 shadow-md transition-colors ${activeTooltip === i ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                            {i + 1}
                          </div>
                          <div className="flex flex-col gap-3 flex-1">
                            <div>
                              <h4 className="font-bold text-lg text-slate-100 mb-2">{mod.proposed_change}</h4>
                              <div className="text-sm text-red-400 bg-red-950/40 inline-flex items-start gap-2 px-3 py-2 rounded-md border border-red-900/50 w-full">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span><strong className="font-semibold text-red-300">Hazard:</strong> {mod.issue_identified}</span>
                              </div>
                            </div>
                            <div className={`p-4 rounded-lg border transition-colors ${activeTooltip === i ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-slate-950/50 border-slate-800/50'
                              }`}>
                              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" /> Justification
                              </span>
                              <p className="text-sm text-slate-300 leading-relaxed">{mod.justification}</p>

                              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5 hover:text-slate-400 transition-colors">
                                  <DollarSign className="w-3.5 h-3.5" /> Estimated Cost
                                </span>
                                <span className="text-sm font-bold text-emerald-400 font-mono tracking-wide">
                                  {mod.estimated_cost}
                                </span>
                              </div>
                            </div>

                            {/* LTA Officer Review Panel */}
                            {activeTooltip === i && modStatuses[i] && (
                              <div className="mt-2 flex flex-col gap-3 animation-fade-in border-t border-slate-700/50 pt-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    LTA Officer Review
                                  </span>
                                  {modStatuses[i].status === "accepted" && (
                                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">
                                      <Check className="w-3 h-3" /> Approved
                                    </span>
                                  )}
                                </div>

                                {modStatuses[i].status === "pending" && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateModStatus(i, { status: "accepted" }); }}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                                    >
                                      <Check className="w-4 h-4" /> Accept
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateModStatus(i, { status: "rejecting" }); }}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 hover:border-slate-600 text-sm font-medium transition-colors"
                                    >
                                      <X className="w-4 h-4" /> Reject & Revise
                                    </button>
                                  </div>
                                )}

                                {modStatuses[i].status === "rejecting" && (
                                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative">
                                      <MessageSquare className="w-4 h-4 text-slate-500 absolute top-2.5 left-2.5" />
                                      <textarea
                                        value={modStatuses[i].rejectReason}
                                        onChange={(e) => updateModStatus(i, { rejectReason: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 block resize-none h-16"
                                        placeholder="Enter technical reason for rejection..."
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => updateModStatus(i, { status: "pending" })}
                                        className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleRejectSubmit(i)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                                      >
                                        <Zap className="w-4 h-4" /> Generate Alternative
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {modStatuses[i].status === "generating" && (
                                  <div className="flex flex-col items-center justify-center py-4 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                                    <span className="text-xs text-slate-400 font-medium text-center">
                                      Processing LTA feedback...<br />Generating alternative structure.
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {viewState === "results-history" && (
            <motion.div
              key="results-history"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 p-8 flex flex-col gap-8 bg-slate-950/50 backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewState("map")}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>&larr;</span> Back to Home
                </button>
                <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-100">
                  <History className="text-emerald-500 w-8 h-8" />
                  Evaluation History
                </h2>
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvaluations.length > 0 ? (
                    pastEvaluations.map((evalRecord, idx) => (
                      <div
                        key={evalRecord.id}
                        onClick={() => loadPastEvaluation(evalRecord)}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all cursor-pointer group"
                      >
                        <div className="h-40 bg-slate-900 relative">
                          <img
                            src={evalRecord.image || "/nanobanana-after.jpg"}
                            alt={evalRecord.label}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono font-bold text-emerald-400 border border-slate-700 border-emerald-500/30">
                            {evalRecord.data.modifications.length} MODIFICATIONS
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-lg text-slate-200 mb-1">{evalRecord.label}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(evalRecord.timestamp).toLocaleString()}
                          </div>
                          <div className="flex justify-between items-center text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">
                            View Blueprint Framework &rarr;
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-500">
                      <History className="w-10 h-10 mb-3 opacity-20" />
                      <p>No past evaluations found.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
