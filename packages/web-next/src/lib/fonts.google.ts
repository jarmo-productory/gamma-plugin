import { Sofia_Sans, Geist_Mono } from "next/font/google";

const sofia = Sofia_Sans({
  variable: "--font-sofia-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geist = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const sofiaSansVar = sofia.variable;
export const geistMonoVar = geist.variable;

