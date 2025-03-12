import { SignInButton } from "@/components/auth/sign-in-button";
import { UserButton } from "@/components/auth/user-button";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  const { userId } = useAuth();

  return (
    <nav className="border-b py-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">Barber Booking</Link>
        <div className="flex gap-4 items-center">
          <Link href="/appointments">My Appointments</Link>
          <div className="flex gap-4 items-center">
            {userId ? (
              <UserButton />
            ) : (
              <SignInButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 