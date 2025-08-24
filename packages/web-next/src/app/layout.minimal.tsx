import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gate 5: Minimal Build Test - SUCCESS!",
  description: "Testing minimal Next.js deployment infrastructure",
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