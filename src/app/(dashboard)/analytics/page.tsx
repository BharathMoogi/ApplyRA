"use client";

import { useEffect, useState } from "react";
import { getAnalyticsDashboardData, type AnalyticsDashboardData } from "@/actions/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/loading";
import { BarChart4, TrendingUp, Sparkles, AlertCircle, FileText, CheckCircle2, XCircle, Search, HelpCircle } from "lucide-react";

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await getAnalyticsDashboardData();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center border border-muted/50 rounded-xl bg-muted/5">
        <Loading text="Compiling analytics database..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 border border-dashed rounded-xl bg-muted/20">
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <h4 className="font-semibold text-sm">Failed to load analytics</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Please check your connection and reload the page.
        </p>
      </div>
    );
  }

  // Calculate total rejection reasons sum for donut rendering
  const totalRejectionsCount = data.rejectionReasons.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart4 className="h-8 w-8 text-primary" />
          Analytics & Insights
        </h1>
        <p className="text-muted-foreground text-sm">
          Review application volumes, ATS matches, skill alignment tables, and failure metrics
        </p>
      </div>

      {/* METRICS ROW */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-muted/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Jobs Found / Scanned</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{data.totalScannedJobs}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Across multiple portals</p>
          </CardContent>
        </Card>

        <Card className="border-muted/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Applications Submitted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{data.totalApplications}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Logged in pipeline</p>
          </CardContent>
        </Card>

        <Card className="border-muted/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Average ATS Match</CardTitle>
            <Sparkles className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-accent flex items-baseline gap-0.5">
              {data.avgAtsScore}
              <span className="text-sm font-bold">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Based on resume tailoring</p>
          </CardContent>
        </Card>

        <Card className="border-muted/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Interview Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-500 flex items-baseline gap-0.5">
              {data.interviewRate}
              <span className="text-sm font-bold">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Applied to interview rounds</p>
          </CardContent>
        </Card>
      </div>

      {/* CORE VISUALIZATION GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* ATS Score Distribution: Custom Bar Chart */}
        <Card className="border-muted/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">ATS Score Distribution</CardTitle>
            <CardDescription>Brackets of resume matches across all listings</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-end justify-between gap-4 pt-6 px-6">
            {data.atsDistribution.map((bar) => {
              // Find max count to scale heights
              const maxCount = Math.max(...data.atsDistribution.map((d) => d.count), 1);
              const heightPercent = Math.max((bar.count / maxCount) * 80, 8); // min 8% for visibility
              
              let barColor = "bg-rose-500/80 hover:bg-rose-500";
              if (bar.bracket.includes("90%")) {
                barColor = "bg-emerald-500/80 hover:bg-emerald-500";
              } else if (bar.bracket.includes("80%")) {
                barColor = "bg-accent/80 hover:bg-accent";
              } else if (bar.bracket.includes("70%")) {
                barColor = "bg-amber-500/80 hover:bg-amber-500";
              }

              return (
                <div key={bar.bracket} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <span className="absolute -top-7 text-[10px] font-bold bg-zinc-950 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.count} jobs
                  </span>
                  
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${barColor}`}
                  />
                  
                  {/* Label */}
                  <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                    {bar.bracket}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Rejection Reasons: Segmented Donut representation */}
        <Card className="border-muted/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Rejection Reason Analysis</CardTitle>
            <CardDescription>Primary indicators flagged in rejected tracks</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col sm:flex-row items-center justify-around gap-6">
            {/* SVG Ring representation */}
            <div className="relative h-32 w-32 shrink-0">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/10" />
                {data.rejectionReasons.reduce(
                  (acc, item, idx) => {
                    const percent = (item.count / totalRejectionsCount) * 100;
                    const strokeColor =
                      idx === 0
                        ? "#f43f5e" // rose-500
                        : idx === 1
                        ? "#f59e0b" // amber-500
                        : idx === 2
                        ? "#10B981" // accent
                        : "#71717a"; // zinc-500
                    
                    const dashArray = `${percent} ${100 - percent}`;
                    const dashOffset = 100 - acc.offset;

                    acc.offset += percent;
                    acc.circles.push(
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3.5"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-500"
                      />
                    );
                    return acc;
                  },
                  { offset: 0, circles: [] as React.ReactNode[] }
                ).circles}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-foreground">
                  {data.rejectionReasons.reduce((sum, i) => sum + i.count, 0)}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                  Total Logs
                </span>
              </div>
            </div>

            {/* Badges Legend */}
            <div className="space-y-2 text-xs flex-1">
              {data.rejectionReasons.map((item) => (
                <div key={item.reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color} shrink-0`} />
                    <span className="font-medium text-muted-foreground">{item.reason}</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {item.count} ({Math.round((item.count / totalRejectionsCount) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skill Gap Analysis: possessing comparison */}
        <Card className="border-muted/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Skill Gap Analysis</CardTitle>
            <CardDescription>
              Most requested technical skills on matching jobs vs what your primary resume holds
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-muted bg-muted/20 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Skill / Tool</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Job Board Demand</th>
                  <th className="p-3 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">
                {data.skillGap.map((item) => (
                  <tr key={item.name} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{item.name}</td>
                    <td className="p-3">
                      {item.possessed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                          <CheckCircle2 className="h-3 w-3" />
                          Possessed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                          <XCircle className="h-3 w-3" />
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden shrink-0">
                          <div
                            style={{ width: `${(item.frequency / 8) * 100}%` }}
                            className="bg-primary h-full rounded-full"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Required on {item.frequency} jobs
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {item.possessed ? (
                        <span className="text-[10px] text-emerald-500 font-medium">Keywords optimized</span>
                      ) : (
                        <span className="text-[10px] text-accent font-bold flex items-center justify-end gap-1.5">
                          <Sparkles className="h-3 w-3 fill-current animate-pulse" />
                          Add to master resume
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
