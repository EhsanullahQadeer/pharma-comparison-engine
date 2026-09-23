import { Outfit, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ConfirmDialogHost } from "@/components/common/ConfirmDialogHost";
import { RouteProgressBar } from "@/components/RouteProgressBar";
import { siteConfig } from "@/lib/site-config";
import { siteUrl } from "@/lib/site-url";

import type { Metadata } from "next";

const fontSans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl || "http://localhost:3000"),
  robots: { index: Boolean(siteUrl), follow: true },
  title: { default: siteConfig.brandName, template: `%s | ${siteConfig.brandShortName}` },
  description: `A UK ${siteConfig.tagline.toLowerCase()} pharmacy comparison platform in development.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The inline theme script below toggles the "dark" class before hydration to avoid a flash —
      // that intentional DOM mutation is expected to differ from the server-rendered markup.
      suppressHydrationWarning
      className={`${fontSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          // Runs before paint to avoid a flash of the wrong theme; keep this in sync with ThemeToggle.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`,
          }}
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:z-50 focus:rounded-lg focus:bg-background focus:p-4">Skip to content</a>
        <RouteProgressBar />
        <ConfirmDialogHost />
        {children}
      </body>
    </html>
  );
}
