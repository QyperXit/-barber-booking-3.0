// app/layout.tsx
import ConvexClientProvider from "@/components/providers/convex-provider";
import { Toaster } from "@/components/ui/toaster";
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
          <nav className="border-b py-4">
            <div className="container mx-auto flex justify-between items-center">
              <Link href="/" className="font-bold text-xl">Barber Booking</Link>
              
              <div className="flex gap-4 items-center">
                <Link href="/appointments">My Appointments</Link>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-md">Sign In</button>
              </div>
            </div>
          </nav>
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}