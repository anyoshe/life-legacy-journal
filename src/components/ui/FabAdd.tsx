import Link from "next/link";
import { Plus } from "lucide-react";

/** Floating “add something” button — like a social app compose control */
export function FabAdd({ href = "/entry/new" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="fab-add xl:hidden"
      aria-label="Write a journal entry"
    >
      <Plus size={24} strokeWidth={2.4} />
    </Link>
  );
}
