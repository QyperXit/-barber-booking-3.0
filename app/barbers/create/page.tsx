'use client';

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreateBarberPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { userId } = useAuth();
  const { user, isSignedIn } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Check if user has admin permissions
  useEffect(() => {
    if (isSignedIn && user) {
      const userRole = user.publicMetadata?.role as string | undefined;
      setIsAdmin(userRole === 'admin');
      
      // Redirect non-admin users
      if (userRole !== 'admin') {
        toast({
          title: "Access denied",
          description: "You don't have permission to create barbers.",
          variant: "destructive",
        });
        router.push('/');
      }
    }
  }, [user, isSignedIn, router, toast]);

  const createBarber = useMutation(api.barbers.create);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create a barber.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const barberId = await createBarber({
        name: formData.name,
        description: formData.description,
        userId,
      });
      
      toast({
        title: "Barber created",
        description: "The barber profile has been created successfully!",
      });
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error("Failed to create barber:", error);
      toast({
        title: "Creation failed",
        description: "There was an error creating the barber profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-100">Create Barber Profile</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-200">
            Barber Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-700 text-white"
            placeholder="Enter barber name"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-gray-200">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-700 text-white h-32"
            placeholder="Enter a description of services offered"
          />
        </div>
        
        <Button 
          type="submit"
          disabled={isLoading || !formData.name || !formData.description}
          className="w-full py-3 bg-gray-600 hover:bg-gray-500 text-white"
        >
          {isLoading ? "Creating..." : "Create Barber Profile"}
        </Button>
      </form>
    </div>
  );
} 