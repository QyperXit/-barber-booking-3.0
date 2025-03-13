import { api } from "@/convex/_generated/api";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    // Check if the current user is an admin
    const authResult = await auth();
    const currentUserId = authResult.userId;
    
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get the current user to check their role
    const user = await currentUser();
    const currentUserRole = user?.publicMetadata?.role as string | undefined;
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only admins can set user roles" },
        { status: 403 }
      );
    }
    
    // Get the request body
    const { userId, role } = await request.json();
    
    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: "User ID and role are required" },
        { status: 400 }
      );
    }
    
    // Validate the role
    if (!['admin', 'barber', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }
    
    // Get user details from Clerk to use for barber profile
    const userDetails = await clerkClient.users.getUser(userId);
    
    // Update the user's metadata
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role,
      },
    });
    
    // If the role is 'barber', automatically create a barber profile in Convex
    if (role === 'barber') {
      try {
        // Get the user's name from Clerk
        const firstName = userDetails.firstName || '';
        const lastName = userDetails.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'New Barber';
        
        // Create a barber profile in Convex if it doesn't exist yet
        const barberId = await convex.mutation(api.barbers.findOrCreate, {
          userId: userId,
          name: fullName,
          description: `Professional barber services by ${fullName}`,
        });
        
        console.log(`Barber profile with ID: ${barberId} for user: ${userId}`);
      } catch (error) {
        console.error("Error creating barber profile:", error);
        // We'll still return success for role update, but log the error
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting user role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set user role" },
      { status: 500 }
    );
  }
} 