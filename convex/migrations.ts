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