import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DateClash",
  description: "Date conflict analysis and planning tool",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
