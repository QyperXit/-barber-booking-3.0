// app/book/[barberId]/page.tsx
'use client';

import { formatTime } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BookPage() {
  const { barberId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState("Haircut");
  
  const TEST_USER_ID = "test_user_id"; // For Phase 1 testing

  const barber = useQuery(api.barbers.getById, { 
    barberId: barberId as string 
  });
  
  const slots = useQuery(api.slots.getByBarberAndDate, {
    barberId: barberId as string,
    date: selectedDate.setHours(0, 0, 0, 0)
  });
  
  const seedSlots = useMutation(api.slots.seedSlots);
  const createBooking = useMutation(api.bookings.create);

  // For testing in Phase 1, create slots if none exist
  useEffect(() => {
    const initializeSlots = async () => {
      if (barberId && (!slots || slots.length === 0)) {
        await seedSlots({ barberId: barberId as string });
      }
    };
    
    initializeSlots();
  }, [barberId, slots, seedSlots]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
    setSelectedSlot(null);
  };

  const handleBooking = async () => {
    if (!selectedSlot) return;
    
    try {
      await createBooking({
        slotId: selectedSlot,
        userId: TEST_USER_ID, // We'll replace this with actual auth in Phase 2
        serviceName,
      });
      
      toast({
        title: "Booking confirmed",
        description: "Your appointment has been booked successfully!",
      });
      
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
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Book with {barber.name}</h1>
      
      <div className="mb-6">
        <label className="block mb-2">Select Date</label>
        <input 
          type="date" 
          className="border rounded p-2"
          onChange={handleDateChange}
          value={selectedDate.toISOString().split('T')[0]}
        />
      </div>
      
      <div className="mb-6">
        <label className="block mb-2">Select Service</label>
        <select 
          className="border rounded p-2"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
        >
          <option value="Haircut">Haircut</option>
          <option value="Beard Trim">Beard Trim</option>
          <option value="Haircut & Beard">Haircut & Beard</option>
          <option value="Hair Styling">Hair Styling</option>
        </select>
      </div>
      
      <h2 className="text-xl font-bold mb-4">Available Slots</h2>
      {slots && slots.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {slots.map((slot) => (
            <button
              key={slot._id}
              className={`p-2 border rounded-md ${
                slot.isBooked ? 'bg-gray-200 cursor-not-allowed' : 
                slot._id === selectedSlot ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
              }`}
              onClick={() => !slot.isBooked && setSelectedSlot(slot._id)}
              disabled={slot.isBooked}
            >
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </button>
          ))}
        </div>
      ) : (
        <p>Loading slots for this date...</p>
      )}
      
      <Button 
        className="w-full" 
        disabled={!selectedSlot}
        onClick={handleBooking}
      >
        Book Appointment
      </Button>
    </div>
  );
}