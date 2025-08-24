import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gate 5: Minimal Build Test",
  description: "Testing minimal Next.js deployment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui' }}>
        {children}
      </body>
    </html>
  );
}