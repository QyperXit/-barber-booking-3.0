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
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // Get formatted date string (YYYY-MM-DD)
  const selectedDateString = selectedDate.toISOString().split('T')[0];
  
  // Get all slots for the selected date (using string format)
  const slotsWithStringFormat = useQuery(
    api.slots.getByBarberAndDate, 
    { barberId: barberIdAsId, date: selectedDateString }
  );
  
  // Get all slots for the selected date (using timestamp format)
  const slotsWithTimestampFormat = useQuery(
    api.slots.getByBarberAndDate, 
    { barberId: barberIdAsId, date: selectedTimestamp }
  );
  
  // Combine slots from both queries, removing duplicates
  const slots = React.useMemo(() => {
    // Set isLoading state based on whether queries have completed
    setIsLoading(slotsWithStringFormat === undefined || slotsWithTimestampFormat === undefined);
    
    if (!slotsWithStringFormat && !slotsWithTimestampFormat) return [];
    
    const allSlots = [
      ...(slotsWithStringFormat || []), 
      ...(slotsWithTimestampFormat || [])
    ];
    
    // Remove duplicates by checking slot IDs
    const uniqueSlots = allSlots.filter((slot, index, self) => 
      index === self.findIndex(s => s._id === slot._id)
    );
    
    console.log(`Combined slots: ${uniqueSlots.length} (string format: ${slotsWithStringFormat?.length || 0}, timestamp format: ${slotsWithTimestampFormat?.length || 0})`);
    
    return uniqueSlots;
  }, [slotsWithStringFormat, slotsWithTimestampFormat]);
  
  // Add a useEffect to explicitly refetch when the refreshCounter changes
  useEffect(() => {
    if (refreshCounter > 0) {
      console.log(`Refresh counter changed to ${refreshCounter}, forcing data refetch`);
      // We don't need to do anything here, just having refreshCounter in the
      // dependency array will cause the component to re-render and refetch the data
    }
  }, [refreshCounter]);
  
  // UPDATED APPROACH - Process slots more carefully
  const availableSlots = React.useMemo(() => {
    // No slots available yet
    if (!slots || slots.length === 0) {
      console.log('No slots found for this date and barber');
      return { available: [], booked: [] };
    }
    
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
    console.log('Selected timestamp:', selectedTimestamp);
    console.log('Current date timestamp:', currentDate.getTime());
    console.log('Total slots found:', slots.length);
    console.log('First few slots:', slots.slice(0, 3).map(slot => ({
      startTime: slot.startTime,
      formattedTime: formatTime(slot.startTime),
      isBooked: slot.isBooked,
      isAvailable: slot.isAvailable,
      date: slot.date
    })));
    
    // Sort slots by start time
    const sortedSlots = [...slots].sort((a, b) => a.startTime - b.startTime);
    
    // Separate booked and available slots
    const bookedSlots: typeof slots = [];
    const availableSlots: typeof slots = [];
    const unavailableSlots: typeof slots = [];
    
    // This loop now includes detailed logging
    sortedSlots.forEach(slot => {
      // For today, filter out past times for available slots
      if (isToday && !slot.isBooked && slot.startTime <= currentTime) {
        console.log(`Skipping past slot at ${formatTime(slot.startTime)} because it's in the past (current time: ${currentTime})`);
        return; // Skip this slot
      }
      
      if (slot.isBooked) {
        console.log(`Found booked slot at ${formatTime(slot.startTime)}`);
        bookedSlots.push(slot);
      } else if (slot.isAvailable) {
        console.log(`Found available slot at ${formatTime(slot.startTime)}`);
        availableSlots.push(slot);
      } else {
        console.log(`Found slot at ${formatTime(slot.startTime)} that is neither booked nor available (isAvailable: ${slot.isAvailable}), skipping`);
        unavailableSlots.push(slot);
      }
    });
    
    // Check for duplicate slots (same time) and remove them
    const uniqueAvailableSlots = availableSlots.filter((slot, index, self) => 
      index === self.findIndex(s => s.startTime === slot.startTime)
    );
    
    const uniqueBookedSlots = bookedSlots.filter((slot, index, self) => 
      index === self.findIndex(s => s.startTime === slot.startTime)
    );
    
    console.log('Available slots after filtering:', uniqueAvailableSlots.length);
    console.log('Booked slots after filtering:', uniqueBookedSlots.length);
    console.log('Unavailable slots (cleared by barber):', unavailableSlots.length);
    
    return { 
      available: uniqueAvailableSlots, 
      booked: uniqueBookedSlots,
      unavailable: unavailableSlots,
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
        setIsLoading(true);
        try {
          console.log('Trying to generate slots for:', selectedTimestamp, typeof selectedTimestamp);
          console.log('Also trying formatted date string:', selectedDateString);
          
          // First check if the slots exist using both formats separately
          const existingSlots = await forceRefresh({
            barberId: barberIdAsId,
            date: selectedTimestamp
          });
          
          console.log('Force refresh result:', existingSlots);
          
          // If no slots were found, try to generate them
          if (existingSlots.noSlots) {
            console.log('No existing slots found, generating new ones');
            
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
          }
        } catch (error) {
          console.error("Error generating slots:", error);
          toast({
            title: "Error",
            description: "Failed to load available time slots.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    initializeSlots();
  }, [barberId, slots, generateSlots, seedSlots, barberIdAsId, selectedTimestamp, selectedDateString, toast, forceRefresh]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    // Ensure we're setting to midnight
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
    setSelectedSlot(null);
    setIsLoading(true); // Set loading state when changing date
    // Trigger a refresh whenever the date changes
    setRefreshCounter(prev => prev + 1);
    console.log(`Date changed to ${newDate.toISOString().split('T')[0]}, refreshing slots`);
    
    // Force refresh data when date changes to ensure we have the latest slot information
    setTimeout(() => {
      handleForceRefresh();
    }, 500);
  };
  
  // Force refresh slots to ensure UI reflects the latest booking status
  const handleForceRefresh = async () => {
    try {
      setIsLoading(true); // Set loading state when forcing refresh
      
      toast({
        title: "Refreshing slots...",
        description: "Checking for the latest booking information.",
        duration: 3000,
      });
      
      console.log(`Attempting to refresh slots for date: ${new Date(selectedTimestamp).toISOString().split('T')[0]}`);
      
      const result = await forceRefresh({
        barberId: barberIdAsId,
        date: selectedTimestamp
      });
      
      console.log('Force refresh result:', result);
      
      // Check if no slots were found at all
      if (result.noSlots) {
        console.log('No slots found to refresh, generating new slots');
        
        toast({
          title: "No slots found",
          description: "Generating new slots for this date...",
          duration: 3000,
        });
        
        try {
          // First try to generate slots from template
          const genResult = await generateSlots({ 
            barberId: barberIdAsId, 
            date: selectedTimestamp 
          });
          
          console.log('Generate slots result:', genResult);
          
          if (genResult.status === "generated") {
            toast({
              title: "Slots generated",
              description: `Created ${genResult.slots.length} slots based on barber's availability.`,
            });
            // Force a UI refresh after generating slots
            setRefreshCounter(prev => prev + 1);
          } else if (genResult.status === "no_template") {
            // If no template exists, create default slots
            console.log('No template found, using seedSlots as fallback');
            
            const seedResult = await seedSlots({
              barberId: barberIdAsId,
              date: selectedTimestamp
            });
            
            console.log('Seed slots result:', seedResult);
            
            toast({
              title: "Default slots created",
              description: "Created standard time slots for this date.",
            });
            // Force a UI refresh after seeding slots
            setRefreshCounter(prev => prev + 1);
          } else if (genResult.status === "existing") {
            // This shouldn't happen since we already checked for no slots
            toast({
              title: "Slots already exist",
              description: "The existing slots have been refreshed.",
            });
            // Force a UI refresh in case the existing slots aren't showing correctly
            setRefreshCounter(prev => prev + 1);
          }
        } catch (genError) {
          console.error("Error generating slots:", genError);
          toast({
            title: "Error",
            description: "Failed to generate time slots. Please try again.",
            variant: "destructive",
          });
        }
      } else if (result.fixed > 0) {
        toast({
          title: "Updated booking status",
          description: `Fixed ${result.fixed} slots with incorrect booking status.`,
          variant: "default",
        });
        // Force a UI refresh after fixing slots
        setRefreshCounter(prev => prev + 1);
      } else {
        toast({
          title: "All slots up to date",
          description: "Your booking information is current.",
        });
        // Force a UI refresh anyway to make sure we're showing the latest data
        setRefreshCounter(prev => prev + 1);
      }
    } catch (error) {
      console.error("Force refresh error:", error);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing the slots. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  if (!barber) return <div className="flex justify-center items-center min-h-[60vh]"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

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
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
              Loading...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh
            </>
          )}
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : slots && slots.length > 0 ? (
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
              <p className="text-sm text-gray-300 mt-1">
                {availableSlots.booked && availableSlots.booked.length > 0 
                  ? "All slots have been booked" 
                  : "The barber hasn't made any slots available for this date"}
              </p>
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
          
          {/* Now show unavailable slots (cleared by barber) */}
          {availableSlots.unavailable && availableSlots.unavailable.length > 0 && (
            <>
              <h3 className="text-lg font-medium text-gray-200 mb-3">Not Available</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {availableSlots.unavailable.map((slot) => (
                  <div 
                    key={slot._id}
                    className="relative rounded-xl transition-all duration-200 bg-gray-800 border border-gray-700"
                  >
                    <button
                      className="w-full p-4 cursor-not-allowed flex flex-col items-center justify-center gap-2"
                      disabled
                    >
                      <span className="text-sm font-medium text-gray-400">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                        Not offered
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
          <Button 
            onClick={handleForceRefresh}
            className="mt-4 text-xs"
            variant="outline"
            size="sm"
          >
            Generate Slots
          </Button>
        </div>
      )}
      
      <div className="p-2 text-center">
        <Button 
          className="w-full" 
          variant="outline"
          onClick={handleBooking}
          disabled={!selectedSlot}
        >
          Book Appointment
        </Button>
      </div>
    </div>
  );
}