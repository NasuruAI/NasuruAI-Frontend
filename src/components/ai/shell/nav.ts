import {
  ArrowLeftRight,
  Award,
  Bell,
  Bookmark,
  Briefcase,
  CalendarClock,
  CheckCircle,
  ClipboardCheck,
  CreditCard,
  Database,
  FileBadge,
  FileText,
  FolderLock,
  FolderOpen,
  Gift,
  GraduationCap,
  KanbanSquare,
  Landmark,
  type LucideIcon,
  Mail,
  Map,
  Mic,
  Plane,
  Plug,
  Route,
  ShieldCheck,
  Smartphone,
  Stamp,
  UserRound,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; detail?: string };

export type NavModule = {
  id: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  items: NavItem[];
};

/** Navigation grouped by the main jobs a candidate needs to get done. */
export const NAV_MODULES: NavModule[] = [
  {
    id: "plan",
    label: "Plan your move",
    mobileLabel: "Plan",
    icon: Map,
    items: [
      { href: "/ai/plan", label: "Plan", icon: Map },
      { href: "/ai/plan/pathways", label: "Pathways", icon: Route },
      { href: "/ai/routes", label: "Routes", icon: ArrowLeftRight },
      { href: "/ai/compare", label: "Compare destinations", icon: ArrowLeftRight },
      { href: "/ai/visa", label: "Visa guide", icon: Stamp },
    ],
  },
  {
    id: "work",
    label: "Find work",
    mobileLabel: "Work",
    icon: Briefcase,
    items: [
      { href: "/ai/jobs", label: "Jobs", icon: Briefcase },
      { href: "/ai/jobs/alerts", label: "Job alerts", icon: Bell },
      { href: "/ai/jobs/saved", label: "Saved jobs", icon: Bookmark },
      { href: "/ai/check-offer", label: "Check offer", icon: ShieldCheck },
      { href: "/ai/interview", label: "Interview practice", icon: Mic },
      { href: "/ai/referrals", label: "Referrals", icon: Gift },
    ],
  },
  {
    id: "study",
    label: "Explore study",
    mobileLabel: "Study",
    icon: GraduationCap,
    items: [
      { href: "/ai/study", label: "Study", icon: GraduationCap },
      { href: "/ai/study/scholarships", label: "Scholarships", icon: Award },
      { href: "/ai/credentials", label: "Credentials", icon: FileBadge },
    ],
  },
  {
    id: "applications",
    label: "Manage applications",
    mobileLabel: "Apply",
    icon: ClipboardCheck,
    items: [
      { href: "/ai/my-application", label: "My application", icon: ClipboardCheck },
      { href: "/ai/track", label: "Track", icon: KanbanSquare },
      { href: "/ai/deadlines", label: "Deadlines", icon: CalendarClock },
      { href: "/ai/changes/mine", label: "Rule changes", icon: CheckCircle },
    ],
  },
  {
    id: "prepare",
    label: "Get application-ready",
    mobileLabel: "Prepare",
    icon: FolderLock,
    items: [
      { href: "/ai/documents", label: "Documents", icon: FolderLock },
      { href: "/ai/packs", label: "Answer packs", icon: FolderOpen },
      { href: "/ai/cv", label: "CV & cover letters", icon: FileText },
      { href: "/ai/funds", label: "Funds checker", icon: Landmark },
      { href: "/ai/fees", label: "Fees", icon: CreditCard },
      { href: "/ai/arrival", label: "Arrival", icon: Plane },
    ],
  },
  {
    id: "account",
    label: "Account & settings",
    mobileLabel: "Account",
    icon: UserRound,
    items: [
      { href: "/ai/profile", label: "Profile", icon: UserRound },
      { href: "/ai/billing", label: "Subscription", icon: CreditCard },
      { href: "/ai/settings/notifications", label: "Notifications", icon: Bell },
      { href: "/ai/settings/devices", label: "Devices", icon: Smartphone },
      { href: "/ai/settings/extension", label: "Extension", icon: Plug },
      { href: "/ai/settings/connections", label: "Connections", icon: Mail },
      { href: "/ai/settings/data", label: "Your data", icon: Database, detail: "Export or delete" },
    ],
  },
];

/** A nav item is active on its own page and every page under it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function activeModule(pathname: string): NavModule | undefined {
  return NAV_MODULES.find((module) => module.items.some((item) => isActive(pathname, item.href)));
}
