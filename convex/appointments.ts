import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { BOOKING_STATUS } from "./constants";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("appointments").collect();
  },
});

export const getById = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getByBarberId = query({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, { barberId }) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_barber", (q) => q.eq("barberId", barberId))
      .collect();
  },
});

// Add a more aggressive real-time version of the query with shorter cache time
export const getByBarberIdRealtime = query({
  args: { 
    barberId: v.id("barbers"),
    refresh: v.optional(v.boolean()) // Used to force refresh from client
  },
  handler: async (ctx, { barberId, refresh }) => {
    // Log an aggressive refresh request
    console.log(`Real-time query for appointments of barber ${barberId}, refresh: ${refresh}`);
    
    // Use the same logic as the regular query
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barber", (q) => q.eq("barberId", barberId))
      .collect();
    
    return appointments;
  }
});

export const create = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    barberId: v.id("barbers"),
    barberName: v.string(),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    services: v.array(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const appointmentId = await ctx.db.insert("appointments", {
      userId: args.userId,
      userName: args.userName,
      barberId: args.barberId,
      barberName: args.barberName,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      services: args.services,
      status: args.status,
      createdAt: new Date().toISOString(),
    });
    
    return appointmentId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("appointments"),
    status: v.string(),
  },
  handler: async (ctx, { id, status }) => {
    const appointment = await ctx.db.get(id);
    
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    
    await ctx.db.patch(id, { status });
    
    // If the appointment is being cancelled, we need to update the associated booking and slot
    if (status === "cancelled") {
      try {
        // Find the corresponding booking using the appointment details
        const bookings = await ctx.db
          .query("bookings")
          .withIndex("by_barber", q => q.eq("barberId", appointment.barberId))
          .filter(q => 
            q.eq(q.field("userId"), appointment.userId) && 
            q.neq(q.field("status"), "cancelled")
          )
          .collect();
        
        // Find the booking that matches this appointment's time
        // This is an approximation as we don't have a direct appointment->booking relationship
        for (const booking of bookings) {
          // Get the slot to check time
          const slot = await ctx.db.get(booking.slotId);
          if (slot && slot.startTime === appointment.startTime) {
            // This is likely the matching booking
            console.log("Found matching booking to cancel", booking._id);
            
            // Update the booking status
            await ctx.db.patch(booking._id, { 
              status: BOOKING_STATUS.CANCELLED 
            });
            
            // Update the slot to be available again
            await ctx.db.patch(booking.slotId, { 
              isBooked: false,
              lastUpdated: Date.now()
            });
            
            break;
          }
        }
      } catch (error) {
        console.error("Error updating associated booking:", error);
        // We still want to update the appointment status even if booking update fails
      }
    }
    
    return await ctx.db.get(id);
  },
});

// Add a trigger refresh mutation
export const triggerRefresh = mutation({
  args: {
    barberId: v.id("barbers")
  },
  handler: async (ctx, { barberId }) => {
    // This is just a dummy mutation that doesn't actually change data
    // But it will trigger subscriptions to refresh
    console.log(`Triggering refresh for barber: ${barberId} at ${new Date().toISOString()}`);
    return { refreshed: true, timestamp: Date.now() };
  }
}); 