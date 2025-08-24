import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gamma Timetable - Clean Slate",
  description: "Minimal Next.js app that actually deploys",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui', padding: '2rem' }}>
        {children}
      </body>
    </html>
  );
}