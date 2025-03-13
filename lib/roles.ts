import { auth } from "@clerk/nextjs";

export type UserRole = 'admin' | 'barber' | 'user';

// Check if the current user has a specific role
export function hasRole(role: UserRole): boolean {
  const { sessionClaims } = auth();
  
  // Get the user's role from public metadata
  const userRole = sessionClaims?.metadata?.role as UserRole | undefined;
  
  return userRole === role;
}

// Check if the current user has admin role
export function isAdmin(): boolean {
  return hasRole('admin');
}

// Check if the current user has barber role
export function isBarber(): boolean {
  return hasRole('barber') || isAdmin(); // Admins can do everything barbers can
}

// Get the current user's role
export function getUserRole(): UserRole | undefined {
  const { sessionClaims } = auth();
  return sessionClaims?.metadata?.role as UserRole | undefined;
} 