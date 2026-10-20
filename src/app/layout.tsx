import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { PwaRegister } from "@/components/pwa/PwaRegister";
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
  applicationName: "Life & Legacy",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Life & Legacy",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4338CA" },
    { media: "(prefers-color-scheme: dark)", color: "#312E81" },
  ],
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
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
