import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DEPLOYMENT TEST d49448f - WORKING?",
  description: "Testing if Netlify deployment updates properly",
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