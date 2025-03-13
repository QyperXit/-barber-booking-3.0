'use client';

import { SignInButton } from "@/components/auth/sign-in-button";
import { UserButton } from "@/components/auth/user-button";
import { SignedIn, SignedOut, useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const { userId: currentUserId } = useAuth();
  const { user, isSignedIn } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check if user has admin role from metadata
  useEffect(() => {
    if (isSignedIn && user) {
      const userRole = user.publicMetadata?.role as string | undefined;
      setIsAdmin(userRole === 'admin');
    }
  }, [user, isSignedIn]);

  return (
    <nav className="border-b py-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">Barber Booking</Link>
        <div className="flex gap-4 items-center">
          <SignedIn>
            <Link href="/appointments">My Appointments</Link>
            {isAdmin && (
              <>
                <Link href="/barbers/create" className="text-blue-500 hover:text-blue-700">
                  Create Barber
                </Link>
                <Link href="/admin" className="text-purple-500 hover:text-purple-700">
                  Admin
                </Link>
              </>
            )}
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </div>
    </nav>
  );
} 