"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Appointments } from './components/appointments';
import { Availability } from './components/availability';
import { Profile } from './components/profile';
import { StripeConnect } from './components/stripe-connect';

export default function BarberDashboardPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isBarber, setIsBarber] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Get barber profile by user ID
  const barberProfiles = useQuery(api.barbers.getByUserId, 
    user?.id ? { userId: user.id } : "skip"
  );
  
  // Get cleanup slots mutation
  const cleanupSlots = useMutation(api.slots.cleanupUnusedSlots);
  
  // Check if user is a barber
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
    
    const checkBarberRole = async () => {
      try {
        const publicMetadata = user.publicMetadata;
        const role = publicMetadata.role as string;
        
        if (role !== 'barber' && role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the barber dashboard.",
            variant: "destructive",
          });
          router.push('/');
          return;
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
  
  // If loading or not a barber, show loading state
  if (loading || !isBarber) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Barber Dashboard</CardTitle>
            <CardDescription>Loading your dashboard...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-10">
            <div className="animate-pulse">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If no barber profile found, show create profile prompt
  if (!barberProfiles || barberProfiles.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Barber Dashboard</CardTitle>
            <CardDescription>
              You need to create your barber profile to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-10 space-y-4">
            <p className="text-center max-w-md">
              Your barber profile has not been created yet. Please create your profile to start accepting appointments.
            </p>
            <Button onClick={() => router.push('/barbers/profile/create')}>
              Create Barber Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const barberProfile = barberProfiles[0];
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Barber Dashboard</h1>
      
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appointments" className="space-y-4">
          <Appointments barberId={barberProfile._id} />
        </TabsContent>
        
        <TabsContent value="availability" className="space-y-4">
          <Availability barberId={barberProfile._id} />
        </TabsContent>
        
        <TabsContent value="profile" className="space-y-4">
          <Profile barberId={barberProfile._id} userId={user!.id} />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
              <CardDescription>
                View your past appointments and performance metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Coming soon: Appointment history and analytics.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          {/* Stripe Connect Integration */}
          <StripeConnect 
            barberId={barberProfile._id} 
            userEmail={user?.primaryEmailAddress?.emailAddress} 
            userName={user?.fullName || barberProfile.name}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Coming soon: Account settings and preferences.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Maintenance</CardTitle>
              <CardDescription>
                System maintenance and cleanup options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-md font-medium mb-2">Slot Management</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Clean up unused slots to keep your system running efficiently.
                  This will remove all unbooked slots that are more than 14 days in the future or in the past.
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await cleanupSlots({ retentionDays: 14 });
                      toast({
                        title: "Cleanup Complete",
                        description: `Removed ${result.deletedCount} unused slots.`,
                      });
                    } catch (error) {
                      console.error("Error during cleanup:", error);
                      toast({
                        title: "Error",
                        description: "Failed to clean up unused slots.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Run Cleanup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 