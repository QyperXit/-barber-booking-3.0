'use client';

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isSignedIn } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState('');

  // Check if user has admin permissions
  useEffect(() => {
    if (isSignedIn && user) {
      const userRole = user.publicMetadata?.role as string | undefined;
      setIsAdmin(userRole === 'admin');
      
      // Redirect non-admin users
      if (userRole !== 'admin') {
        toast({
          title: "Access denied",
          description: "You don't have permission to access the admin page.",
          variant: "destructive",
        });
        router.push('/');
      }
    }
  }, [user, isSignedIn, router, toast]);

  const handleSetAdmin = async () => {
    if (!userId) {
      toast({
        title: "User ID required",
        description: "Please enter a user ID.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: 'admin' }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Role updated",
          description: "User has been set as an admin.",
        });
      } else {
        toast({
          title: "Update failed",
          description: data.error || "Failed to update user role.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to set user as admin:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the user role.",
        variant: "destructive",
      });
    }
  };

  const handleSetBarber = async () => {
    if (!userId) {
      toast({
        title: "User ID required",
        description: "Please enter a user ID.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: 'barber' }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Role updated",
          description: "User has been set as a barber.",
        });
      } else {
        toast({
          title: "Update failed",
          description: data.error || "Failed to update user role.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to set user as barber:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the user role.",
        variant: "destructive",
      });
    }
  };

  if (!isSignedIn || !isAdmin) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-100">Admin Dashboard</h1>
      
      <div className="bg-gray-700 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Set User Role</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-200 mb-1">
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-600 text-white"
              placeholder="Enter Clerk user ID"
            />
            <p className="text-xs text-gray-400 mt-1">
              You can find the user ID in the Clerk dashboard.
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button
              onClick={handleSetAdmin}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Set as Admin
            </Button>
            <Button
              onClick={handleSetBarber}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Set as Barber
            </Button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Your Admin Info</h2>
        <p className="text-gray-200">
          Your user ID: <span className="font-mono bg-gray-800 px-2 py-1 rounded">{user?.id}</span>
        </p>
      </div>
    </div>
  );
} 