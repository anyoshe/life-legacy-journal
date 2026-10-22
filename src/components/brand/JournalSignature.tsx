import Image from "next/image";

/** Small brand mark — cover art + optional script line */
export function JournalSignature({
  size = "md",
  showLabel = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  const dim = size === "sm" ? 36 : size === "lg" ? 72 : 48;
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/journal-cover.jpg"
        alt=""
        width={dim}
        height={dim}
        className="rounded-lg object-cover shadow-sm ring-1 ring-[var(--achievement)]/40"
        style={{ width: dim, height: dim }}
      />
      {showLabel && (
        <span className="font-serif text-sm italic tracking-wide text-[var(--primary-dark)] sm:text-base">
          My Journal
        </span>
      )}
    </div>
  );
}

/** Footer signature line */
export function JournalFooterMark() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Image
        src="/brand/journal-cover.jpg"
        alt="My Journal"
        width={56}
        height={56}
        className="rounded-xl object-cover shadow-md ring-2 ring-[var(--achievement)]/50"
      />
      <p
        className="text-base italic text-[var(--primary)]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        My Journal
      </p>
      <p className="max-w-xs text-xs text-secondary">
        Life &amp; Legacy — written with intention
      </p>
    </div>
  );
}
