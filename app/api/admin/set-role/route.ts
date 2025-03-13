import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check if the current user is an admin
    const { userId: currentUserId } = auth();
    
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get the current user to check their role
    const currentUser = await clerkClient.users.getUser(currentUserId);
    const currentUserRole = currentUser.publicMetadata?.role as string | undefined;
    
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
    
    // Update the user's metadata
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting user role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set user role" },
      { status: 500 }
    );
  }
} 