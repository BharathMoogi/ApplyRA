"use client";

import { useEffect, useState, useRef } from "react";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  triggerDailySummaryEmail,
  type DashboardNotification,
  type DailySummaryData,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Mail,
  Loader2,
  X,
  Check,
} from "lucide-react";

export function HeaderNotifications() {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Daily Summary Modal State
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [isCompilingSummary, setIsCompilingSummary] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await getUserNotifications();
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Close when clicking outside
    const clickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleCompileDailySummary = async () => {
    setIsCompilingSummary(true);
    // Add brief typing animation delay
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const res = await triggerDailySummaryEmail();
      if (res.success && res.summary) {
        setSummaryData(res.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompilingSummary(false);
      setIsOpen(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: DashboardNotification["type"]) => {
    switch (type) {
      case "job":
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "ats":
        return <Sparkles className="h-4 w-4 text-accent" />;
      case "interview":
        return <Calendar className="h-4 w-4 text-amber-500" />;
      case "failure":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-500" />;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Navbar Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-muted/60"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-600 border border-background animate-pulse" />
        )}
      </Button>

      {/* DROPDOWN NOTIFICATION PANEL */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-popover border border-muted/50 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-3 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-muted/30">
            <span className="text-xs font-bold text-foreground">Alert Hub</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                <Check className="h-3 w-3" />
                Clear unread
              </button>
            )}
          </div>

          {/* List items */}
          <div className="max-h-72 overflow-y-auto divide-y divide-muted/20">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No recent notifications alerts.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`p-3 space-y-1 hover:bg-muted/30 transition-colors cursor-pointer flex gap-3 items-start relative ${
                    !n.read ? "bg-muted/10" : ""
                  }`}
                >
                  <div className="p-1 rounded bg-muted/40 shrink-0 mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-0.5 leading-snug">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground">{n.title}</span>
                      <span className="text-[9px] text-muted-foreground/60">{n.time}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{n.message}</p>
                  </div>
                  {!n.read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 self-center absolute right-3" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Trigger */}
          <div className="p-2 border-t border-muted/30 bg-muted/5">
            <Button
              onClick={handleCompileDailySummary}
              disabled={isCompilingSummary}
              className="w-full text-[10px] font-bold h-8 gap-1"
            >
              {isCompilingSummary ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Compiling Digest...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  Request Daily Summary Email
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* DAILY SUMMARY PREVIEW DIALOG MODAL */}
      {summaryData && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-muted max-w-md w-full rounded-2xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Daily Digest Sent</h3>
                  <span className="text-[10px] text-muted-foreground">Generated simulated email report</span>
                </div>
              </div>
              <button
                onClick={() => setSummaryData(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Email Body Simulation */}
            <div className="p-6 space-y-4 bg-muted/5 text-xs">
              <div className="space-y-1 text-muted-foreground pb-3 border-b border-dashed">
                <div><strong>To:</strong> {summaryData.emailSentAddress}</div>
                <div><strong>From:</strong> updates@ai-job-agent.com</div>
                <div><strong>Subject:</strong> Job Agent Daily Digest & Progress Report</div>
              </div>

              <div className="space-y-3 leading-relaxed pt-2">
                <p>Hello John,</p>
                <p>Here is your daily summary metrics checklist compiled for your active job search:</p>
                
                <div className="grid gap-3 grid-cols-2 pt-1">
                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Submissions</span>
                    <div className="text-xl font-black mt-1 text-primary">{summaryData.totalSubmitted} total</div>
                  </div>
                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Matches today</span>
                    <div className="text-xl font-black mt-1 text-blue-500">+{summaryData.newMatches} jobs</div>
                  </div>
                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Interviews Scheduled</span>
                    <div className="text-xl font-black mt-1 text-amber-500">{summaryData.upcomingInterviewsCount} round</div>
                  </div>
                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">ATS Target Score</span>
                    <div className="text-xl font-black mt-1 text-accent">{summaryData.atsImprovementAverage}% avg</div>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground pt-2">
                  To view detailed reports, check matching resumes, or update tracking funnels, log back into your AI Job Agent command panel.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-muted/10 border-t flex justify-end">
              <Button size="sm" onClick={() => setSummaryData(null)} className="text-xs font-semibold h-8">
                Acknowledge Digest
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
