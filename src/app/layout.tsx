import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Oswald } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Aspial",
    default: "Aspial",
  },
  description: "CRM ERP tools of Aspial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-poppins">
      <body
        className={`${poppins.variable} ${geistSans.variable} ${geistMono.variable} ${oswald.variable} antialiased font-poppins`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
