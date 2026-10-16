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

export const mobilePrimaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, group: "home" },
  { href: "/today", label: "Today", icon: CalendarCheck, group: "home" },
  { href: "/entries", label: "Journal", icon: BookOpen, group: "journal" },
  { href: "/goals", label: "Goals", icon: Target, group: "life" },
];

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

/** Atmospheric gradients for life areas (no remote image dependency) */
export const lifeAreaMood: Record<string, { gradient: string; label: string }> = {
  SPIRITUAL: {
    label: "Spiritual",
    gradient: "linear-gradient(145deg, #312e81 0%, #4f46e5 45%, #6366f1 100%)",
  },
  MARRIAGE: {
    label: "Relationship",
    gradient: "linear-gradient(145deg, #9f1239 0%, #be123c 40%, #e11d48 100%)",
  },
  FAMILY: {
    label: "Family",
    gradient: "linear-gradient(145deg, #9a3412 0%, #c2410c 50%, #ea580c 100%)",
  },
  FINANCIAL: {
    label: "Financial",
    gradient: "linear-gradient(145deg, #14532d 0%, #166534 45%, #5b8a72 100%)",
  },
  CAREER: {
    label: "Career",
    gradient: "linear-gradient(145deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%)",
  },
  BUSINESS: {
    label: "Business",
    gradient: "linear-gradient(145deg, #1c1917 0%, #44403c 50%, #78716c 100%)",
  },
  PERSONAL: {
    label: "Personal",
    gradient: "linear-gradient(145deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)",
  },
  HEALTH: {
    label: "Health",
    gradient: "linear-gradient(145deg, #365314 0%, #4d7c0f 50%, #84cc16 100%)",
  },
  SOCIAL: {
    label: "Social",
    gradient: "linear-gradient(145deg, #581c87 0%, #7e22ce 50%, #a855f7 100%)",
  },
  LEARNING: {
    label: "Learning",
    gradient: "linear-gradient(145deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)",
  },
  SERVICE: {
    label: "Service",
    gradient: "linear-gradient(145deg, #713f12 0%, #a16207 50%, #e0a82e 100%)",
  },
  OTHER: {
    label: "Other",
    gradient: "linear-gradient(145deg, #334155 0%, #475569 50%, #94a3b8 100%)",
  },
};
