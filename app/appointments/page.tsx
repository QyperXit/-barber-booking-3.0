// app/appointments/page.tsx (continued)
'use client';

import { formatDate, formatTime } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { BOOKING_STATUS } from "@/convex/constants";
import { useMutation, useQuery } from "convex/react";

export default function AppointmentsPage() {
  const { toast } = useToast();
  const TEST_USER_ID = "test_user_id"; // For Phase 1 testing
  
  const bookings = useQuery(api.bookings.getByUser, { userId: TEST_USER_ID });
  const cancelBooking = useMutation(api.bookings.cancel);

  const handleCancel = async (bookingId: string) => {
    try {
      await cancelBooking({ bookingId });
      
      toast({
        title: "Booking cancelled",
        description: "Your appointment has been cancelled successfully.",
      });
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: "There was an error cancelling your appointment.",
        variant: "destructive",
      });
    }
  };

  if (!bookings) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Appointments</h1>
      
      {bookings.length === 0 ? (
        <p>You don't have any appointments yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking._id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-bold">{booking.barber?.name}</h2>
                  <p className="text-gray-600">{booking.serviceName}</p>
                  <p className="mt-2">
                    {formatDate(booking.slot?.date)} at {formatTime(booking.slot?.startTime)}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Status: <span className="capitalize">{booking.status}</span>
                  </p>
                </div>
                
                {booking.status === BOOKING_STATUS.CONFIRMED && (
                  <Button 
                    variant="destructive"
                    onClick={() => handleCancel(booking._id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}