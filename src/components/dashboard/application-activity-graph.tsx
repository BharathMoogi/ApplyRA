import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Info } from "lucide-react";

interface ActivityDay {
  day: string;
  count: number;
}

const mockActivity: ActivityDay[] = [
  { day: "Mon", count: 3 },
  { day: "Tue", count: 6 },
  { day: "Wed", count: 8 },
  { day: "Thu", count: 4 },
  { day: "Fri", count: 7 },
  { day: "Sat", count: 2 },
  { day: "Sun", count: 1 },
];

export function ApplicationActivityGraph() {
  const maxCount = Math.max(...mockActivity.map((d) => d.count), 1);

  return (
    <Card className="transition-all hover:shadow-md border-muted/50 w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Application Activity</CardTitle>
          <BarChart className="h-4 w-4 text-violet-500" />
        </div>
        <CardDescription>Job applications submitted this week</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Graph Display Area */}
        <div className="h-48 flex items-end gap-3 sm:gap-6 px-2 border-b border-muted/65 pb-1">
          {mockActivity.map((d, index) => {
            const heightPercent = `${(d.count / maxCount) * 100}%`;
            return (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end cursor-pointer"
              >
                {/* Tooltip */}
                <div className="absolute -top-8 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-15 whitespace-nowrap">
                  {d.count} Applications
                </div>

                {/* Animated Column Bar */}
                <div
                  className="w-full bg-gradient-to-t from-violet-600 to-indigo-500 rounded-t-md group-hover:from-violet-500 group-hover:to-indigo-400 transition-all duration-500 ease-out shadow-sm scale-y-0 origin-bottom"
                  style={{
                    height: heightPercent,
                    animation: `grow-bar 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                    animationDelay: `${index * 75}ms`,
                  }}
                />

                {/* Style override inline for growth animations */}
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
          {mockActivity.map((d) => (
            <span key={d.day} className="flex-1 text-center">
              {d.day}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-dashed pt-3 px-1">
          <span className="flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Weekly submissions peak on Wednesday
          </span>
          <span className="font-bold text-foreground">
            Total: {mockActivity.reduce((sum, d) => sum + d.count, 0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
