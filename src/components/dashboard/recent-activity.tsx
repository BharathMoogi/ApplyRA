import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No recent activity. Start by adding your first job application.
        </div>
      </CardContent>
    </Card>
  );
}
