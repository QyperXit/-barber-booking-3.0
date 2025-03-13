"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function CreateBarberProfilePage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isBarber, setIsBarber] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const createBarber = useMutation(api.barbers.create);
  
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
    
    // Check if user is a barber
    const checkBarberRole = async () => {
      try {
        const publicMetadata = user.publicMetadata;
        const role = publicMetadata.role as string;
        
        if (role !== 'barber' && role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to create a barber profile.",
            variant: "destructive",
          });
          router.push('/');
          return;
        }
        
        // Pre-fill form with user's name
        if (user.firstName || user.lastName) {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          setName(fullName);
        }
        
        setIsBarber(true);
        setLoading(false);
      } catch (error) {
        console.error("Error checking barber role:", error);
        toast({
          title: "Error",
          description: "Failed to verify your permissions. Please try again.",
          variant: "destructive",
        });
        router.push('/');
      }
    };
    
    checkBarberRole();
  }, [isLoaded, user, router, toast]);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!name || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const barberId = await createBarber({
        name,
        description,
        userId: user!.id,
      });
      
      toast({
        title: "Profile Created",
        description: "Your barber profile has been created successfully.",
      });
      
      // Redirect to the barber dashboard
      router.push('/barbers/dashboard');
    } catch (error) {
      console.error("Error creating barber profile:", error);
      toast({
        title: "Error",
        description: "Failed to create your barber profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading || !isBarber) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Create Barber Profile</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-10">
            <div className="animate-pulse">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Barber Profile</CardTitle>
          <CardDescription>
            Set up your barber profile to start accepting appointments
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Business Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your barber business name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your services and expertise..."
                rows={5}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Profile"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 