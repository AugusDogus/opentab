import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider, ThemeToggle } from "~/app/components/ui/theme";
import { Toaster } from "~/app/components/ui/toaster";
import { cn } from "~/lib/utils";

import { env } from "~/env";

import "~/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.VERCEL_ENV === "production" ? "https://opentab.app" : "http://localhost:3000",
  ),
  title: "opentab",
  description: "Send tabs to your devices instantly",
  icons: [{ url: "/icon.png" }],
  openGraph: {
    title: "opentab",
    description: "Send tabs to your devices instantly",
    url: "https://opentab.app",
    siteName: "opentab",
    images: ["/hero.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/hero.jpg"],
    site: "@AugusDogus",
    creator: "@AugusDogus",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {props.children}
          <div className="fixed bottom-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
