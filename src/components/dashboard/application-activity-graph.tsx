"use client";

import { useEffect, useState } from "react";
import { getApplications, type JobApplicationUI } from "@/actions/applications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Info } from "lucide-react";

interface ActivityDay {
  day: string;
  count: number;
}

function buildWeeklyActivity(applications: JobApplicationUI[]): ActivityDay[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  applications.forEach((app) => {
    const date = new Date(app.createdAt);
    if (date >= oneWeekAgo) {
      counts[date.getDay()]++;
    }
  });

  // Reorder starting from Monday
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((i) => ({
    day: days[i],
    count: counts[i],
  }));

  return ordered;
}

export function ApplicationActivityGraph() {
  const [activity, setActivity] = useState<ActivityDay[]>([
    { day: "Mon", count: 0 },
    { day: "Tue", count: 0 },
    { day: "Wed", count: 0 },
    { day: "Thu", count: 0 },
    { day: "Fri", count: 0 },
    { day: "Sat", count: 0 },
    { day: "Sun", count: 0 },
  ]);
  const [total, setTotal] = useState(0);
  const [peakDay, setPeakDay] = useState("—");

  useEffect(() => {
    getApplications().then((apps) => {
      const weekly = buildWeeklyActivity(apps);
      setActivity(weekly);
      setTotal(apps.length);
      const peak = weekly.reduce((max, d) => (d.count > max.count ? d : max), weekly[0]);
      if (peak.count > 0) setPeakDay(peak.day);
    });
  }, []);

  const maxCount = Math.max(...activity.map((d) => d.count), 1);

  return (
    <Card className="transition-all hover:shadow-md border-muted/50 w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Application Activity</CardTitle>
          <BarChart className="h-4 w-4 text-accent" />
        </div>
        <CardDescription>Job applications submitted this week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end gap-3 sm:gap-6 px-2 border-b border-muted/65 pb-1">
          {activity.map((d, index) => {
            const heightPercent = `${(d.count / maxCount) * 100}%`;
            return (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end cursor-pointer"
              >
                {/* Tooltip */}
                <div className="absolute -top-8 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-15 whitespace-nowrap">
                  {d.count} Application{d.count !== 1 ? "s" : ""}
                </div>

                {/* Animated Column Bar */}
                <div
                  className="w-full bg-gradient-to-t from-accent to-accent/70 rounded-t-md group-hover:from-accent-hover group-hover:to-accent/80 transition-all duration-500 ease-out shadow-sm scale-y-0 origin-bottom"
                  style={{
                    height: d.count > 0 ? heightPercent : "4px",
                    animation: `grow-bar 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                    animationDelay: `${index * 75}ms`,
                  }}
                />

                <style>{`
                  @keyframes grow-bar {
                    from { transform: scaleY(0); }
                    to { transform: scaleY(1); }
                  }
                `}</style>
              </div>
            );
          })}
        </div>

        {/* X-Axis labels */}
        <div className="flex items-center justify-between px-2 pt-2 text-xs font-semibold text-muted-foreground">
          {activity.map((d) => (
            <span key={d.day} className="flex-1 text-center">
              {d.day}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-dashed pt-3 px-1">
          <span className="flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            {peakDay !== "—" ? `Most active on ${peakDay}` : "No activity this week"}
          </span>
          <span className="font-bold text-foreground">
            Total: {total}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
