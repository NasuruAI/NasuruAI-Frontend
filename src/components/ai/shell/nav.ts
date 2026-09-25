import {
  Briefcase,
  CalendarClock,
  FolderLock,
  GraduationCap,
  KanbanSquare,
  type LucideIcon,
  Map,
  Route,
  ShieldCheck,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** The five sections (web.md §1.1); also the bottom tabs below 768 px. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/ai/plan", label: "Plan", icon: Map },
  { href: "/ai/routes", label: "Routes", icon: Route },
  { href: "/ai/jobs", label: "Jobs", icon: Briefcase },
  { href: "/ai/study", label: "Study", icon: GraduationCap },
  { href: "/ai/track", label: "Track", icon: KanbanSquare },
];

export const UTILITY_NAV: NavItem[] = [
  { href: "/ai/documents", label: "Documents", icon: FolderLock },
  { href: "/ai/check-offer", label: "Check offer", icon: ShieldCheck },
  { href: "/ai/deadlines", label: "Deadlines", icon: CalendarClock },
];

/** A nav item is active on its own page and every page under it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
