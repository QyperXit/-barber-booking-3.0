// convex/bookings.ts
import { v } from "convex/values";
import { formatDateForStorage } from "../lib/utils";
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
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, { slotId, userId, serviceName, userName, userEmail }) => {
    // Get the slot
    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }
    
    // Check if slot is already booked
    if (slot.isBooked) {
      throw new Error("Slot is already booked");
    }
    
    // Get the barber info
    const barber = await ctx.db.get(slot.barberId);
    if (!barber) {
      throw new Error("Barber not found");
    }

    // Get the user info
    let user = await ctx.db
      .query("users")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();
    
    // If user doesn't exist, create a user record with the provided name and email
    if (!user) {
      console.warn("User not found, creating a user record");
      // Create a user record with the provided name or a better default
      await ctx.db.insert("users", {
        name: userName || "Guest User",
        email: userEmail || `user-${userId.substring(0, 8)}@example.com`,
        userId,
      });
      
      // Fetch the newly created user
      user = await ctx.db
        .query("users")
        .withIndex("by_user_id", q => q.eq("userId", userId))
        .first();
    }
    
    // Use the user's name from the database, or the provided userName, or a better default
    const customerName = user?.name || userName || "Guest User";
    
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
      amount: slot.price ?? 0,
      serviceName,
    });
    
    // Use our helper function to ensure consistent date format
    // Format the date as YYYY-MM-DD regardless of input format
    const dateString = formatDateForStorage(slot.date);
    
    // Create a corresponding appointment
    try {
      await ctx.db.insert("appointments", {
        userId,
        userName: customerName,
        barberId: slot.barberId,
        barberName: barber.name,
        date: dateString,
        startTime: slot.startTime,
        endTime: slot.endTime,
        services: [serviceName],
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      console.log("Created appointment for booking", bookingId, "with date", dateString);
    } catch (error) {
      console.error("Failed to create appointment:", error);
      // We still return the booking ID even if appointment creation fails
    }
    
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
    
    // Get the slot to find the appointment
    const slot = await ctx.db.get(booking.slotId);
    if (slot) {
      // Find and update the corresponding appointment
      try {
        // Find appointments for this user and barber
        const appointments = await ctx.db
          .query("appointments")
          .withIndex("by_barber", q => q.eq("barberId", booking.barberId))
          .filter(q => q.eq(q.field("userId"), booking.userId))
          .collect();
        
        // Find the specific appointment that matches this slot's time
        const matchingAppointment = appointments.find(appointment => 
          appointment.startTime === slot.startTime && 
          appointment.status !== "cancelled"
        );
        
        if (matchingAppointment) {
          await ctx.db.patch(matchingAppointment._id, {
            status: "cancelled"
          });
          console.log("Updated appointment status to cancelled", matchingAppointment._id);
        }
      } catch (error) {
        console.error("Failed to update appointment status:", error);
      }
    }
    
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