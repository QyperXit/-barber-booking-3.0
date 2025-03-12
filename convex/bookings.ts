// convex/bookings.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { BOOKING_STATUS } from "./constants";

// Get all bookings for a user
export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
      
    // Fetch slot and barber info for each booking
    const enhancedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const slot = await ctx.db.get(booking.slotId);
        const barber = await ctx.db.get(booking.barberId);
        return {
          ...booking,
          slot,
          barber,
        };
      })
    );
    
    return enhancedBookings;
  },
});

// Create a new booking
export const create = mutation({
  args: {
    slotId: v.id("slots"),
    userId: v.string(),
    serviceName: v.string(),
  },
  handler: async (ctx, { slotId, userId, serviceName }) => {
    // Get the slot
    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }
    
    // Check if slot is already booked
    if (slot.isBooked) {
      throw new Error("Slot is already booked");
    }
    
    // Update the slot to be booked
    await ctx.db.patch(slotId, { 
      isBooked: true,
      lastUpdated: Date.now()
    });
    
    // Create the booking
    const bookingId = await ctx.db.insert("bookings", {
      slotId,
      barberId: slot.barberId,
      userId,
      bookedAt: Date.now(),
      status: BOOKING_STATUS.CONFIRMED,
      amount: slot.price,
      serviceName,
    });
    
    return bookingId;
  },
});

// Cancel a booking
export const cancel = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }
    
    // Update the booking status
    await ctx.db.patch(bookingId, { 
      status: BOOKING_STATUS.CANCELLED 
    });
    
    // Update the slot to be available again
    await ctx.db.patch(booking.slotId, { 
      isBooked: false,
      lastUpdated: Date.now()
    });
    
    return bookingId;
  },
});

// For testing purposes in Phase 1
export const createTestUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = "test_user_id";
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();
      
    if (existingUser) {
      return existingUser._id;
    }
    
    // Create a test user
    const id = await ctx.db.insert("users", {
      name: "Test User",
      email: "test@example.com",
      userId: userId,
    });
    
    return id;
  }
});