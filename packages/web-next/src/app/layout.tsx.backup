import type { Metadata } from "next";
import { sofiaSansVar, geistMonoVar } from "@/lib/fonts";
import { ClerkProvider } from "@/providers/ClerkProvider";
import { AuthStateSync } from "@/components/AuthStateSync";
import "./globals.css";

// Font variables are provided by a small helper that
// can disable Google font downloads in network-restricted builds.

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
        className={`${sofiaSansVar} ${geistMonoVar} antialiased`}
      >
        <ClerkProvider>
          <AuthStateSync />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
