// app/book/[barberId]/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDateForStorage, formatSlotDateTime, formatTime } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function BookPage() {
  const { barberId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Id<"slots"> | null>(null);
  const [serviceName, setServiceName] = useState("Haircut");
  
  const TEST_USER_ID = "test_user_id"; // For Phase 1 testing

  const { userId: currentUserId } = useAuth();
  const { user } = useUser();

  // Cast the barberId string from params to a proper Convex ID type
  const barberIdAsId = barberId as unknown as Id<"barbers">;

  const barber = useQuery(api.barbers.getById, { 
    barberId: barberIdAsId
  });
  
  // Get the timestamp for the selected date (midnight)
  const selectedTimestamp = selectedDate.setHours(0, 0, 0, 0);
  
  // Get all slots for the selected date
  const slots = useQuery(api.slots.getByBarberAndDate, {
    barberId: barberIdAsId,
    date: selectedTimestamp
  });
  
  // UPDATED APPROACH - Process slots more carefully
  const availableSlots = React.useMemo(() => {
    // No slots available yet
    if (!slots || slots.length === 0) return { available: [], booked: [] };
    
    // Get current date info
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Check if selected date is today
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const isToday = currentDate.getTime() === selectedTimestamp;
    
    console.log('DEBUG INFO:');
    console.log('Current time (minutes):', currentTime);
    console.log('Selected date is today:', isToday);
    console.log('Total slots found:', slots.length);
    console.log('First few slots:', slots.slice(0, 3));
    
    // Sort slots by start time
    const sortedSlots = [...slots].sort((a, b) => a.startTime - b.startTime);
    
    // Separate booked and available slots
    const bookedSlots: typeof slots = [];
    const availableSlots: typeof slots = [];
    
    sortedSlots.forEach(slot => {
      // For today, filter out past times for available slots
      if (isToday && !slot.isBooked && slot.startTime <= currentTime) {
        console.log(`Skipping past slot at ${formatTime(slot.startTime)}`);
        return; // Skip this slot
      }
      
      if (slot.isBooked) {
        bookedSlots.push(slot);
      } else {
        availableSlots.push(slot);
      }
    });
    
    console.log('Available slots:', availableSlots.length);
    console.log('Booked slots:', bookedSlots.length);
    
    return { 
      available: availableSlots, 
      booked: bookedSlots,
      all: sortedSlots
    };
  }, [slots, selectedTimestamp]);

  const generateSlots = useMutation(api.slots.generateSlotsFromTemplate);
  const createBooking = useMutation(api.bookings.create);
  const forceRefresh = useMutation(api.slots.forceRefresh);
  const seedSlots = useMutation(api.slots.seedSlots);

  // Generate slots for the selected date if none exist
  useEffect(() => {
    const initializeSlots = async () => {
      if (barberId && (!slots || slots.length === 0)) {
        try {
          console.log('Trying to generate slots for:', selectedTimestamp, typeof selectedTimestamp);
          
          // Try to generate slots from template
          const result = await generateSlots({ 
            barberId: barberIdAsId, 
            date: selectedTimestamp 
          });
          
          console.log('Generate slots result:', result);
          
          if (result.status === "no_template") {
            // If no template exists, create default slots for today
            console.log('No template found, using seedSlots as fallback');
            try {
              const seedResult = await seedSlots({
                barberId: barberIdAsId,
                date: selectedTimestamp
              });
              console.log('Seed slots result:', seedResult);
            } catch (seedError) {
              console.error("Error seeding slots:", seedError);
            }
            
            toast({
              title: "Using default schedule",
              description: "The barber has not set their availability for this day. Showing standard hours.",
            });
          }
        } catch (error) {
          console.error("Error generating slots:", error);
          toast({
            title: "Error",
            description: "Failed to load available time slots.",
            variant: "destructive",
          });
        }
      }
    };
    
    initializeSlots();
  }, [barberId, slots, generateSlots, seedSlots, barberIdAsId, selectedTimestamp, toast]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    // Ensure we're setting to midnight
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };
  
  // Force refresh slots to ensure UI reflects the latest booking status
  const handleForceRefresh = async () => {
    try {
      toast({
        title: "Refreshing slots...",
        description: "Checking for the latest booking information.",
        duration: 3000,
      });
      
      const result = await forceRefresh({
        barberId: barberIdAsId,
        date: selectedTimestamp
      });
      
      if (result.fixed > 0) {
        toast({
          title: "Updated booking status",
          description: `Fixed ${result.fixed} slots with incorrect booking status.`,
          variant: "default",
        });
      } else {
        toast({
          title: "All slots up to date",
          description: "Your booking information is current.",
        });
      }
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing the slots. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot) return;

    if (!currentUserId) {
      toast({
        title: "Booking failed",
        description: "User is not authenticated.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createBooking({
        slotId: selectedSlot,
        userId: currentUserId, // Now guaranteed to be a string
        serviceName,
        userName: user?.fullName || user?.firstName || undefined,
        userEmail: user?.primaryEmailAddress?.emailAddress,
      });
      
      toast({
        title: "Booking confirmed",
        description: "Your appointment has been booked successfully!",
      });
      
      // Force refresh to update the UI
      await handleForceRefresh();
      
      // Navigate to appointments page
      router.push("/appointments");
    } catch (error) {
      toast({
        title: "Booking failed",
        description: "There was an error booking your appointment.",
        variant: "destructive",
      });
    }
  };

  if (!barber) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-100">Book with {barber.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Select Date</label>
          <input 
            type="date" 
            className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            onChange={handleDateChange}
            value={new Date(selectedTimestamp).toISOString().split('T')[0]}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Select Service</label>
          <select 
            className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          >
            <option value="Haircut">Haircut</option>
            <option value="Beard Trim">Beard Trim</option>
            <option value="Haircut & Beard">Haircut & Beard</option>
            <option value="Hair Styling">Hair Styling</option>
          </select>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200">Available Time Slots</h2>
        <Button 
          size="sm"
          variant="outline"
          onClick={handleForceRefresh}
          className="text-sm bg-gray-600 hover:bg-gray-700 text-white transition-all px-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Refresh
        </Button>
      </div>
      
      {slots && slots.length > 0 ? (
        <>
          {/* First show available slots */}
          {availableSlots.available && availableSlots.available.length > 0 ? (
            <>
              <h3 className="text-lg font-medium text-gray-200 mb-3">Available Slots</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {availableSlots.available.map((slot) => (
                  <div 
                    key={slot._id}
                    className={`relative rounded-xl transition-all duration-200 ${
                      slot._id === selectedSlot 
                        ? 'bg-white border-2 border-gray-700 shadow-lg scale-[1.02]' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    <button
                      className="w-full p-4 cursor-pointer flex flex-col items-center justify-center gap-2 hover:scale-[0.98] active:scale-[0.97] transition-transform"
                      onClick={() => setSelectedSlot(slot._id)}
                    >
                      <span className={`text-sm font-medium ${
                        slot._id === selectedSlot
                          ? 'text-gray-700'
                          : 'text-white'
                      }`}>
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-gray-700 rounded-lg p-4 mb-6 text-center">
              <p className="text-white">No available slots for this date</p>
            </div>
          )}
          
          {/* Then show booked slots */}
          {availableSlots.booked && availableSlots.booked.length > 0 && (
            <>
              <h3 className="text-lg font-medium text-gray-200 mb-3">Already Booked</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {availableSlots.booked.map((slot) => (
                  <div 
                    key={slot._id}
                    className="relative rounded-xl transition-all duration-200 bg-neutral-100 border border-neutral-200"
                  >
                    <button
                      className="w-full p-4 cursor-not-allowed flex flex-col items-center justify-center gap-2"
                      disabled
                    >
                      <span className="text-sm font-medium text-neutral-600">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Unavailable
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading available time slots...</p>
        </div>
      )}
      
      <Button 
        className="w-full py-4 text-base font-medium rounded-xl transition-all bg-gray-700 hover:bg-gray-800 text-white shadow-md disabled:bg-neutral-200 disabled:text-neutral-500"
        disabled={!selectedSlot}
        onClick={handleBooking}
      >
        Book Appointment
      </Button>
    </div>
  );
}