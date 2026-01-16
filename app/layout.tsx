import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://dateclash.com"
  ),
  title: {
    template: "%s | DateClash - Find the Perfect Event Date",
    default: "DateClash - Avoid Business Scheduling Conflicts",
  },
  description:
    "The global event intelligence platform. Visualize school holidays, public holidays, religious holidays, historic weather data and industry events to plan successful events.",
  keywords: [
    "Event planning",
    "business travel",
    "school holiday calendar",
    "event intelligence",
    "scheduling conflicts",
    "roadshow planning",
  ],
  authors: [{ name: "Ali Taghavi", url: "https://www.mergelabs.io" }],
  creator: "MergeLabs GmbH",
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "DateClash",
    title: "DateClash - Find the Perfect Event Date",
    description: "Check 50+ countries for scheduling conflicts instantly.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://dateclash.com",
  },
  twitter: {
    card: "summary_large_image",
    creator: "https://www.linkedin.com/in/ali-taghavi-li/",
  },
  icons: {
    icon: [
      {
        url: "https://res.cloudinary.com/mergelabs-io/image/upload/v1768387400/dateclash/dateclash_favicon_hstb6b.ico",
        type: "image/x-icon",
      },
    ],
    shortcut: "https://res.cloudinary.com/mergelabs-io/image/upload/v1768387400/dateclash/dateclash_favicon_hstb6b.ico",
    apple: "https://res.cloudinary.com/mergelabs-io/image/upload/v1768387400/dateclash/dateclash_favicon_hstb6b.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        
        {/* 👇 You had the Analytics, but you need this one too: */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}