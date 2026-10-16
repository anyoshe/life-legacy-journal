import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  Heart,
  Sparkles,
  Target,
  PenLine,
} from "lucide-react";

const items = [
  { href: "/entry/new", label: "Write", icon: PenLine, tone: "qp-indigo" },
  { href: "/today", label: "Today", icon: CalendarCheck, tone: "qp-sage" },
  { href: "/goals", label: "Goals", icon: Target, tone: "qp-gold" },
  { href: "/letters", label: "Love", icon: Heart, tone: "qp-rose" },
  { href: "/entries", label: "Journal", icon: BookOpen, tone: "qp-sky" },
  { href: "/summary/weekly", label: "Week", icon: Sparkles, tone: "qp-indigo" },
];

export function QuickActions({ compact }: { compact?: boolean }) {
  const list = compact ? items.slice(0, 4) : items;
  return (
    <div className={`quick-grid ${compact ? "" : "sm:grid-cols-6"}`}>
      {list.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`quick-pill ${item.tone}`}
          >
            <span className="quick-pill-icon">
              <Icon size={18} strokeWidth={2.2} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
