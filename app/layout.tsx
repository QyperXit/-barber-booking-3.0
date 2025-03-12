// app/layout.tsx
import Header from "@/components/Header";
import ConvexClientProvider from "@/components/providers/convex-provider";
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Barber Booking",
  description: "Book your next haircut",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
            <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}