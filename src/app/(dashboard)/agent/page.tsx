"use client";

import { useState, useEffect, useRef } from "react";
import { searchJobs } from "@/actions/jobs";
import {
  runAgentStep,
  runAutomationEngine,
  getAutomationDaemonStatus,
  toggleAutomationDaemon,
} from "@/actions/agent";
import { getGmailConnectionStatus } from "@/actions/gmail";
import { getSettingsMetadata } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Bot,
  Play,
  Square,
  Terminal,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  RefreshCw,
  Clock,
  Sparkles,
  Key,
  ShieldCheck,
} from "lucide-react";

type AgentViewMode = "manual" | "daemon";

export default function AIAgentPage() {
  const [viewMode, setViewMode] = useState<AgentViewMode>("manual");
  
  // Settings
  const [roleQuery, setRoleQuery] = useState("Frontend");
  const [threshold, setThreshold] = useState(85);
  const [daemonThreshold, setDaemonThreshold] = useState(90); // default 90% required
  
  // Active indicators
  const [isGmailLinked, setIsGmailLinked] = useState(false);
  const [isApiKeyLinked, setIsApiKeyLinked] = useState(false);
  const [isDaemonEnabled, setIsDaemonEnabled] = useState(false);

  // Timer countdown
  const [countdownMinutes, setCountdownMinutes] = useState(59);
  const [countdownSeconds, setCountdownSeconds] = useState(59);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(-1);
  const [scannedJobs, setScannedJobs] = useState<{ id: string; title: string; company: string; atsScore: number; passed: boolean }[]>([]);

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    scanned: 0,
    applied: 0,
    skipped: 0,
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Sync state metadata
  const syncMetaData = async () => {
    try {
      const gmail = await getGmailConnectionStatus();
      setIsGmailLinked(gmail);
      const settings = await getSettingsMetadata();
      if (settings.success && settings.settings) {
        setIsApiKeyLinked(!!settings.settings.preferences.openaiApiKey);
      }
      const daemon = await getAutomationDaemonStatus();
      setIsDaemonEnabled(daemon);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    syncMetaData();
  }, []);

  // Timer simulation tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDaemonEnabled) {
      interval = setInterval(() => {
        setCountdownSeconds((sec) => {
          if (sec === 0) {
            setCountdownMinutes((min) => (min === 0 ? 59 : min - 1));
            return 59;
          }
          return sec - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDaemonEnabled]);

  const addLog = (line: string) => {
    setLogs((prev) => [...prev, line]);
  };

  const handleStartManual = async () => {
    setIsRunning(true);
    setLogs([]);
    setScannedJobs([]);
    setCurrentJobIndex(-1);
    setMetrics({ scanned: 0, applied: 0, skipped: 0 });

    const timeStr = () => new Date().toLocaleTimeString("en-US", { hour12: false });
    addLog(`[${timeStr()}] [System] Initializing AI Agent workflow...`);
    addLog(`[${timeStr()}] [System] Query="${roleQuery}", Min ATS Target=${threshold}%`);

    try {
      addLog(`[${timeStr()}] [System] Connecting to job boards API...`);
      const res = await searchJobs(roleQuery, {}, 1, 10);
      const jobsToProcess = res.jobs;

      if (jobsToProcess.length === 0) {
        addLog(`[${timeStr()}] [Warning] No jobs found matching "${roleQuery}". Process aborted.`);
        setIsRunning(false);
        return;
      }

      addLog(`[${timeStr()}] [System] Discovered ${jobsToProcess.length} openings to optimize.`);
      
      for (let i = 0; i < jobsToProcess.length; i++) {
        const job = jobsToProcess[i];
        setCurrentJobIndex(i);

        addLog(`\n--- Optimizing Job ${i + 1} of ${jobsToProcess.length} ---`);
        
        const stepResult = await runAgentStep(job, threshold);
        
        if (stepResult.success && stepResult.result) {
          const resObj = stepResult.result;
          
          for (const line of resObj.logs) {
            addLog(line);
            await new Promise((r) => setTimeout(r, 400));
          }

          setMetrics((prev) => {
            const isApplied = resObj.passed;
            return {
              scanned: prev.scanned + 1,
              applied: prev.applied + (isApplied ? 1 : 0),
              skipped: prev.skipped + (isApplied ? 0 : 1),
            };
          });

          setScannedJobs((prev) => [
            ...prev,
            {
              id: job.id,
              title: job.title,
              company: job.company,
              atsScore: resObj.atsScore,
              passed: resObj.passed,
            },
          ]);
        }
      }

      addLog(`\n[${timeStr()}] [System] Manual session finished.`);
    } catch (err: any) {
      console.error(err);
      addLog(`[Fatal] Crash details: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartDaemonEngine = async () => {
    setIsRunning(true);
    setLogs([]);
    setScannedJobs([]);
    const timeStr = () => new Date().toLocaleTimeString("en-US", { hour12: false });
    addLog(`[${timeStr()}] [System] Spawning Background Hourly Automation Engine...`);

    try {
      const res = await runAutomationEngine();
      if (res.success) {
        for (const line of res.logs) {
          addLog(line);
          await new Promise((r) => setTimeout(r, 400));
        }

        setMetrics({
          scanned: res.appliedCount,
          applied: res.appliedCount,
          skipped: 0,
        });

        // Populate pipeline
        setScannedJobs([
          { id: "job-airbnb", title: "Frontend Engineer", company: "Airbnb", atsScore: 93, passed: true },
          { id: "job-vercel", title: "Senior React Engineer", company: "Vercel", atsScore: 91, passed: true },
        ]);
      } else {
        addLog(`[${timeStr()}] [Error] ${res.logs[0] || "Automation failed."}`);
      }
    } catch (err: any) {
      addLog(`[Fatal] Daemon loop crashed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleDaemon = async () => {
    try {
      const nextState = !isDaemonEnabled;
      const res = await toggleAutomationDaemon(nextState);
      setIsDaemonEnabled(res);
      
      // Reset countdown timer
      setCountdownMinutes(59);
      setCountdownSeconds(59);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          Autonomous AI Agent
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Orchestrate resume optimization loops, auto-apply scripts, and hourly background daemons
        </p>
      </div>

      {/* VIEW MODES TAB TOGGLE BAR */}
      <div className="flex border-b border-muted/50 gap-4 pb-0.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setViewMode("manual")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 -mb-0.5 leading-none shrink-0 ${
            viewMode === "manual"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Play className="h-4 w-4" />
          Manual Simulation
        </button>

        <button
          onClick={() => setViewMode("daemon")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 -mb-0.5 leading-none shrink-0 ${
            viewMode === "daemon"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="h-4 w-4" />
          Hourly Daemon Sync
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column: Config Panels (2/5 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Settings Status indicator */}
          <Card className="border-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">System Integration Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b pb-2 last:border-b-0">
                <span className="text-muted-foreground font-semibold">Gmail OAuth Integration</span>
                {isGmailLinked ? (
                  <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">Connected</span>
                ) : (
                  <span className="text-zinc-500 font-bold bg-muted px-2 py-0.5 rounded text-[10px]">Gmail Disconnected</span>
                )}
              </div>

              <div className="flex items-center justify-between border-b pb-2 last:border-b-0">
                <span className="text-muted-foreground font-semibold">OpenAI API Key Sync</span>
                {isApiKeyLinked ? (
                  <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">Ready</span>
                ) : (
                  <span className="text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded text-[10px]">Missing Key</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tab 1: Manual Run Configuration */}
          {viewMode === "manual" && (
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Simulation Parameters</CardTitle>
                <CardDescription>Target role titles and compatibility gates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                <div className="space-y-2">
                  <Label>Job Search Query</Label>
                  <Input
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    placeholder="e.g. Frontend, React"
                    disabled={isRunning}
                    className="h-9 border-muted/50 text-xs"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Min ATS Match Score</Label>
                    <span className="font-bold text-violet-600">{threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="95"
                    step="5"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    disabled={isRunning}
                  />
                </div>

                <Button onClick={handleStartManual} disabled={isRunning} className="w-full h-10 font-bold text-xs gap-1.5">
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                  Execute Manual Scan
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tab 2: Hourly Daemon Config */}
          {viewMode === "daemon" && (
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Daemon Mode Control</CardTitle>
                <CardDescription>Configure looping automation and active cron rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                {/* Active Daemon Switcher */}
                <div className="flex items-center justify-between p-4 bg-muted/10 border rounded-xl">
                  <div>
                    <h5 className="font-bold">Hourly Automation Daemon</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Executes matching loops every hour</p>
                  </div>
                  
                  <button
                    onClick={handleToggleDaemon}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isDaemonEnabled ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isDaemonEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {isDaemonEnabled && (
                  <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl leading-none">
                    <Clock className="h-4 w-4 shrink-0 animate-spin" />
                    <span className="font-semibold">
                      Cron active: Next sync in {countdownMinutes}m {countdownSeconds}s
                    </span>
                  </div>
                )}

                {/* Looping criteria settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Optimized Target ATS Score</Label>
                    <span className="font-bold text-violet-600">90% Required</span>
                  </div>
                  <input
                    type="range"
                    min="90"
                    max="95"
                    value={daemonThreshold}
                    disabled
                    className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none opacity-60"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    The engine automatically customize bullet parameters in a loop until resume compatibility achieves 90%+.
                  </p>
                </div>

                <Button
                  onClick={handleStartDaemonEngine}
                  disabled={isRunning}
                  className="w-full h-10 font-bold text-xs gap-1.5 bg-violet-600 hover:bg-violet-700"
                >
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Trigger Automation Loop Now
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Running list of processed targets */}
          <Card className="border-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Processed Pipeline</CardTitle>
              <CardDescription>Real-time status updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {scannedJobs.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No active logs. Click trigger action panel to run.
                </div>
              ) : (
                scannedJobs.map((job, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs border border-muted/50 rounded-xl p-3 bg-muted/5">
                    <div>
                      <h5 className="font-semibold">{job.title}</h5>
                      <span className="text-[10px] text-muted-foreground">{job.company}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground">{job.atsScore}% ATS</span>
                      {job.passed ? (
                        <span className="text-emerald-500 flex items-center gap-1 font-semibold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Applied
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1 font-semibold text-[10px] bg-rose-500/10 px-2 py-0.5 rounded">
                          <XCircle className="h-3.5 w-3.5" />
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Console Terminal (3/5 width) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col h-full">
          {/* Summary counters grid */}
          <div className="grid gap-3 grid-cols-3">
            <div className="border border-muted/50 rounded-xl p-4 bg-muted/5 text-center">
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Jobs Evaluated</h5>
              <p className="text-2xl font-black mt-1 text-primary">{metrics.scanned}</p>
            </div>
            <div className="border border-muted/50 rounded-xl p-4 bg-muted/5 text-center">
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Applications Submitted</h5>
              <p className="text-2xl font-black mt-1 text-emerald-500">{metrics.applied}</p>
            </div>
            <div className="border border-muted/50 rounded-xl p-4 bg-muted/5 text-center">
              <h5 className="text-[10px] text-muted-foreground uppercase font-bold">Skipped (Low score)</h5>
              <p className="text-2xl font-black mt-1 text-rose-500">{metrics.skipped}</p>
            </div>
          </div>

          {/* Terminal container */}
          <div className="flex-1 border border-zinc-800 bg-zinc-950 text-zinc-300 font-mono text-[11px] p-5 rounded-2xl flex flex-col min-h-[400px] h-[580px] shadow-2xl relative">
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 shrink-0 text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-emerald-500" />
                AI Agent Session Console
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full bg-emerald-500 ${isRunning ? "animate-pulse" : ""}`} />
                {isRunning ? "Running" : "Idle"}
              </span>
            </div>

            {/* Scrollable Logs Output */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic">Console ready. Select parameter mode to run.</div>
              ) : (
                logs.map((line, idx) => {
                  let colorClass = "text-zinc-300";
                  if (line.includes("[Success]")) colorClass = "text-emerald-400 font-bold";
                  if (line.includes("[Error]") || line.includes("[Fatal]")) colorClass = "text-rose-400 font-bold";
                  if (line.includes("[Warning]")) colorClass = "text-amber-400 font-bold";
                  if (line.includes("[ATS Score]")) colorClass = "text-violet-400 font-bold";
                  if (line.includes("[Optimize]")) colorClass = "text-blue-400";
                  if (line.startsWith("---")) colorClass = "text-primary font-extrabold tracking-wide mt-4 block border-t border-zinc-800/50 pt-2";

                  return (
                    <div key={idx} className={`${colorClass} leading-relaxed whitespace-pre-wrap`}>
                      {line}
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
