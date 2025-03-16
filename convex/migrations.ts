import { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// Utility function to check available slots for today
export const getCurrentSlots = query({
  handler: async (ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timestamp = today.getTime().toString();
    
    console.log('Looking for slots with date:', timestamp);
    
    // Get all slots
    const slots = await ctx.db
      .query("slots")
      .collect();
    
    // Filter for today's date
    const todaySlots = slots.filter(slot => slot.date === timestamp);
    
    console.log(`Found ${todaySlots.length} slots for today out of ${slots.length} total slots`);
    
    return {
      today: timestamp,
      slotsCount: todaySlots.length,
      slots: todaySlots.map((slot: Doc<"slots">) => ({
        id: slot._id,
        barberId: slot.barberId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: slot.isBooked,
        isAvailable: slot.isAvailable || !slot.isBooked
      }))
    };
  },
});

// Migration to update all "confirmed" statuses to "paid"
export const updateConfirmedToPaid = mutation({
  handler: async (ctx) => {
    // Get all appointments with status "confirmed"
    const confirmedAppointments = await ctx.db
      .query("appointments")
      .filter(q => q.eq(q.field("status"), "confirmed"))
      .collect();
    
    console.log(`Found ${confirmedAppointments.length} appointments with status "confirmed"`);
    
    // Update each appointment to have status "paid"
    let updatedAppointments = 0;
    for (const appointment of confirmedAppointments) {
      await ctx.db.patch(appointment._id, { status: "paid" });
      updatedAppointments++;
    }
    
    console.log(`Updated ${updatedAppointments} appointments from "confirmed" to "paid"`);
    
    // Get all bookings with status "confirmed"
    const confirmedBookings = await ctx.db
      .query("bookings")
      .filter(q => q.eq(q.field("status"), "confirmed"))
      .collect();
    
    console.log(`Found ${confirmedBookings.length} bookings with status "confirmed"`);
    
    // Update each booking to have status "paid"
    let updatedBookings = 0;
    for (const booking of confirmedBookings) {
      await ctx.db.patch(booking._id, { status: "paid" });
      updatedBookings++;
    }
    
    console.log(`Updated ${updatedBookings} bookings from "confirmed" to "paid"`);
    
    return {
      appointmentsFound: confirmedAppointments.length,
      appointmentsUpdated: updatedAppointments,
      bookingsFound: confirmedBookings.length,
      bookingsUpdated: updatedBookings
    };
  },
}); 