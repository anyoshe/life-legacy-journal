import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

/**
 * System font stack — avoids next/font Google download at build time
 * (fails offline / when fonts.google.com times out).
 */
export const metadata: Metadata = {
  title: {
    default: "Life & Legacy Journal",
    template: "%s · Life & Legacy",
  },
  description:
    "A private space to journal, grow, and build the life you mean to live — with clarity, calm, and intention.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="page-wash min-h-screen antialiased text-[var(--text)] font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
