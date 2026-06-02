import "./globals.css";
import type { Metadata, Viewport } from "next";
import AppLayout from "@/components/AppLayout";

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
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
