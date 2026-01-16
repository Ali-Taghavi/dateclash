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
    template: "%s | DateClash",
    default: "DateClash",
  },
  description: "Date conflict analysis and planning tool",
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
    locale: "en_US",
    siteName: "DateClash",
    title: "DateClash",
    description: "Optimize your project dates and avoid conflicts.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://dateclash.com",
    images: [
      {
        url: "https://res.cloudinary.com/mergelabs-io/image/upload/v1768601530/dateclash/OpenGraf_image_s4sxal.png",
        width: 1200,
        height: 630,
        alt: "DateClash App Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DateClash",
    description: "Date conflict analysis and planning tool",
    creator: "https://www.linkedin.com/in/ali-taghavi-li/",
    images: [
      "https://res.cloudinary.com/mergelabs-io/image/upload/v1768601530/dateclash/OpenGraf_image_s4sxal.png",
    ],
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