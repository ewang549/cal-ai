import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cal AI — your calendar in plain English",
  description:
    "Connect Google Calendar and create or rearrange events by typing naturally.",
  manifest: "/manifest.json",
  applicationName: "Cal AI",
  appleWebApp: {
    capable: true,
    title: "Cal AI",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    shortcut: "/icon.svg",
  },
};

// Next 15+: themeColor / colorScheme belong in the viewport export.
export const viewport: Viewport = {
  themeColor: "#F3EEE4",
  colorScheme: "light",
  // Lock zoom on iOS so the "app" feels native after Add to Home Screen.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions like Grammarly inject
          attributes onto <body> before React hydrates, which would otherwise
          throw a hydration mismatch. Scoped to body only. */}
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
