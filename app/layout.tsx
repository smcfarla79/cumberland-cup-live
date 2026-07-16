import { Instrument_Serif, Manrope } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const display = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Cumberland Cup Live",
    template: "%s · Cumberland Cup",
  },
  description: "Live scoring for The Cumberland Cup at The Course at Sewanee",
  applicationName: "Cumberland Cup Live",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cup Live",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#16352a",
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
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
