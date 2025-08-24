import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phase 3: Radix UI Import Test - FORCE CACHE BUST",
  description: "Testing Radix UI dependency loading in production",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.6 }}>
        {children}
      </body>
    </html>
  );
}