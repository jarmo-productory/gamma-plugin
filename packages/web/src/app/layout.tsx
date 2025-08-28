import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Productory Powerups for Gamma",
  description: "Supercharge your Gamma presentations with productivity enhancements built by educators, for educators",
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