import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Compass,
  Download,
  HeartHandshake,
  Home,
  Leaf,
  Mail,
  Map,
  Moon,
  Sparkles,
  Target,
} from "lucide-react";

export type NavGroupId =
  | "home"
  | "life"
  | "journal"
  | "reflection"
  | "together"
  | "data";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroupId;
};

export const navGroups: { id: NavGroupId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "life", label: "My Life" },
  { id: "journal", label: "My Journal" },
  { id: "reflection", label: "Reflection" },
  { id: "together", label: "Together" },
  { id: "data", label: "My Data" },
];

/** Mobile bottom: primary destinations only */
export const mobilePrimaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, group: "home" },
  { href: "/today", label: "Today", icon: CalendarCheck, group: "home" },
  { href: "/entries", label: "Journal", icon: BookOpen, group: "journal" },
  { href: "/goals", label: "Goals", icon: Target, group: "life" },
];

/** Full app destinations — one source of truth */
export const appNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, group: "home" },
  { href: "/today", label: "Today", icon: CalendarCheck, group: "home" },
  { href: "/foundation", label: "Foundation", icon: Compass, group: "life" },
  { href: "/goals", label: "Goals", icon: Target, group: "life" },
  { href: "/habits", label: "Habits", icon: Leaf, group: "life" },
  { href: "/entries", label: "Journal", icon: BookOpen, group: "journal" },
  { href: "/dreams", label: "Dreams", icon: Moon, group: "journal" },
  { href: "/lessons", label: "Lessons", icon: BookMarked, group: "journal" },
  { href: "/letters", label: "Letters", icon: Mail, group: "journal" },
  { href: "/experiences", label: "Experiences", icon: Map, group: "journal" },
  { href: "/reviews", label: "Reviews", icon: ClipboardList, group: "reflection" },
  { href: "/summary/weekly", label: "Week glance", icon: Sparkles, group: "reflection" },
  { href: "/couple", label: "Couple", icon: HeartHandshake, group: "together" },
  { href: "/export", label: "Export", icon: Download, group: "data" },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function itemsInGroup(group: NavGroupId): NavItem[] {
  return appNavItems.filter((i) => i.group === group);
}
