import {
  LayoutDashboard,
  Briefcase,
  User,
  Settings,
  FileText,
  Bot,
  Search,
  Sparkles,
  FileEdit,
  BarChart4,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
}

export const dashboardNav: DashboardNavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Job Search",
    href: "/jobs",
    icon: Search,
  },
  {
    title: "Applications",
    href: "/applications",
    icon: Briefcase,
  },
  {
    title: "Resumes",
    href: "/resumes",
    icon: FileText,
  },
  {
    title: "AI Generator",
    href: "/resumes/generate",
    icon: Sparkles,
  },
  {
    title: "AI Cover Letter",
    href: "/resumes/cover-letter",
    icon: FileEdit,
  },
  {
    title: "AI Agent",
    href: "/agent",
    icon: Bot,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart4,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
