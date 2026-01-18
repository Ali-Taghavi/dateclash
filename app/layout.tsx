import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// 1. Optimized Font Loading
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap", // Ensures text remains visible during font load
  weight: ["300", "400", "600", "700", "900"], // Added 900 for your font-black headings
});

// 2. Separate Viewport Export (Next.js 14+ best practice)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00A381" },
    { media: "(prefers-color-scheme: dark)", color: "#14B8A6" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents auto-zoom on mobile inputs
};

// 3. Clean & Robust Metadata
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://dateclash.com"),
  title: {
    template: "%s | DateClash",
    default: "DateClash | Strategic Conflict Analysis",
  },
  description: "Identify and avoid scheduling conflicts with school holidays, public holidays, and major industry events.",
  keywords: [
    "Event planning",
    "business travel",
    "school holiday calendar",
    "event intelligence",
    "scheduling conflicts",
    "roadshow planning",
    "strategic scheduling",
  ],
  authors: [{ name: "Ali Taghavi", url: "https://www.mergelabs.io" }],
  creator: "MergeLabs GmbH",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "DateClash",
    title: "DateClash | Strategic Conflict Analysis",
    description: "Optimize your project dates and avoid hidden scheduling conflicts.",
    url: "https://dateclash.com",
    images: [
      {
        url: "https://res.cloudinary.com/mergelabs-io/image/upload/v1768601530/dateclash/OpenGraf_image_s4sxal.png",
        width: 1200,
        height: 630,
        alt: "DateClash Strategic Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DateClash",
    description: "Date conflict analysis and planning tool",
    creator: "@mergelabs",
    images: ["https://res.cloudinary.com/mergelabs-io/image/upload/v1768601530/dateclash/OpenGraf_image_s4sxal.png"],
  },
  icons: {
    icon: "https://res.cloudinary.com/mergelabs-io/image/upload/v1768387400/dateclash/dateclash_favicon_hstb6b.ico",
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
        className={`${inter.variable} font-sans antialiased`}
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
        
        {/* Vercel Monitoring Tools */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}