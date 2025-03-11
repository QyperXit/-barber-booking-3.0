// app/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const barbers = useQuery(api.barbers.get);
  const seedBarber = useMutation(api.barbers.seedBarber);
  const createTestUser = useMutation(api.bookings.createTestUser);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // For testing purposes in Phase 1, create a test barber if none exists
  useEffect(() => {
    const setupTestData = async () => {
      // Only run this once when barbers data first loads
      if (barbers !== undefined && !hasInitialized) {
        setHasInitialized(true);
        if (barbers.length === 0) {
          console.log("No barbers found, creating test data...");
          await createTestUser();
          await seedBarber();
        }
      }
    };
    
    setupTestData();
  }, [barbers, hasInitialized, createTestUser, seedBarber]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Book Your Next Haircut</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers?.map((barber: any) => (
          <div key={barber._id} className="border rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-bold">{barber.name}</h2>
            <p className="text-gray-600 mt-2">{barber.description}</p>
            <div className="mt-4">
              <Link href={`/book/${barber._id}`}>
                <Button>Book Appointment</Button>
              </Link>
            </div>
          </div>
        ))}
        
        {/* Show message if no barbers */}
        {barbers?.length === 0 && (
          <p>No barbers available. Setting up test data...</p>
        )}
      </div>
    </div>
  );
}