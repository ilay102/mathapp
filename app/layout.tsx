import "./globals.css";
import type { Metadata, Viewport } from "next";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "MathPad — handwrite, check, learn",
  description: "Write math by hand. Tap to see where you went wrong, and how to fix it.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface font-ui min-h-screen">
        <div className="flex min-h-screen flex-col md:flex-row bg-[#f8f9fa]">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden relative">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
