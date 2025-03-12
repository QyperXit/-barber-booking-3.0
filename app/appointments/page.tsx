// app/appointments/page.tsx
'use client';

import { formatDate, formatTime } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { BOOKING_STATUS } from "@/convex/constants";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";

export default function AppointmentsPage() {
  const { toast } = useToast();
  // const TEST_USER_ID = "test_user_id"; // For Phase 1 testing
    const { userId: currentUserId } = useAuth();

  
  const bookings = useQuery(api.bookings.getByUser, { userId: currentUserId });
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
      <h1 className="text-3xl font-bold mb-6 text-gray-100">My Appointments</h1>
      
      {bookings.length === 0 ? (
        <p className="text-gray-200">You don't have any appointments yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking._id} className="border rounded-lg p-4 shadow-sm bg-gray-700">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-100">{booking.barber?.name}</h2>
                  <p className="text-gray-300">{booking.serviceName}</p>
                  <p className="mt-2 text-[#A0AEC0]"> {/* Muted Gray for Date */}
                    {formatDate(booking.slot?.date)} at {formatTime(booking.slot?.startTime)}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Status: <span className={`capitalize ${booking.status === BOOKING_STATUS.CONFIRMED ? 'text-[#68D391]' : booking.status === BOOKING_STATUS.CANCELLED ? 'text-[#F56565]' : 'text-[#BEE3F8]'}`}>{booking.status}</span> {/* Soft Blue for other statuses */}
                  </p>
                </div>
                
                {booking.status === BOOKING_STATUS.CONFIRMED && (
                  <Button 
                    variant="destructive"
                    onClick={() => handleCancel(booking._id)}
                    className="bg-gray-600 cursor-pointer hover:bg-gray-700 text-white"
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