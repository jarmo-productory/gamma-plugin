import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'sonner';
import { Sofia_Sans } from 'next/font/google';

const sofiaSans = Sofia_Sans({ subsets: ['latin'], display: 'swap' });

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
      <body className={sofiaSans.className} style={{ margin: 0 }}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
