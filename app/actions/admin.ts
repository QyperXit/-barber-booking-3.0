'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Set a user as an admin
export async function setUserAsAdmin(userId: string) {
  // Check if the current user is an admin
  const { sessionClaims } = auth();
  const currentUserRole = sessionClaims?.metadata?.role as string | undefined;
  
  if (currentUserRole !== 'admin') {
    throw new Error('Only admins can set other users as admins');
  }
  
  try {
    // Update the user's metadata to include the admin role
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role: 'admin',
      },
    });
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to set user as admin:', error);
    return { success: false, error: 'Failed to set user as admin' };
  }
}

// Set a user as a barber
export async function setUserAsBarber(userId: string) {
  // Check if the current user is an admin
  const { sessionClaims } = auth();
  const currentUserRole = sessionClaims?.metadata?.role as string | undefined;
  
  if (currentUserRole !== 'admin') {
    throw new Error('Only admins can set other users as barbers');
  }
  
  try {
    // Update the user's metadata to include the barber role
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role: 'barber',
      },
    });
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to set user as barber:', error);
    return { success: false, error: 'Failed to set user as barber' };
  }
} 