import type { Metadata } from "next";
import { Sofia_Sans, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@/providers/ClerkProvider";
import { AuthStateSync } from "@/components/AuthStateSync";
import "./globals.css";

const sofiaSans = Sofia_Sans({
  variable: "--font-sofia-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gamma Timetable Dashboard",
  description: "Manage your Gamma presentations and timetables",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sofiaSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <AuthStateSync />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
