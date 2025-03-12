// components/auth/sign-in-button.tsx
'use client';

import { Button } from "@/components/ui/button";
import { SignInButton as ClerkSignInButton } from "@clerk/nextjs";

export function SignInButton() {
  return (
    <ClerkSignInButton mode="modal">
      <Button>Sign In</Button>
    </ClerkSignInButton>
  );
}