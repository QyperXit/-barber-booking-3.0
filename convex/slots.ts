// convex/slots.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { CLOSING_TIME, OPENING_TIME, SLOT_DURATION } from "./constants";

// Get all slots for a specific barber on a specific date
export const getByBarberAndDate = query({
  args: { 
    barberId: v.id("barbers"),
    date: v.number() 
  },
  handler: async (ctx, { barberId, date }) => {
    return await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", date)
      )
      .collect();
  },
});

// Initialize all slots for a barber for a specific date
export const initializeDaySlots = mutation({
  args: {
    barberId: v.id("barbers"),
    date: v.number(),
    price: v.number(),
  },
  handler: async (ctx, { barberId, date, price }) => {
    // First check if slots already exist for this day
    const existingSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", date)
      )
      .collect();
    
    if (existingSlots.length > 0) {
      throw new Error("Slots already exist for this date");
    }
    
    // Create slots from opening to closing time in 30-minute increments
    const slotIds = [];
    for (let time = OPENING_TIME; time < CLOSING_TIME; time += SLOT_DURATION) {
      const slotId = await ctx.db.insert("slots", {
        barberId,
        date,
        startTime: time,
        endTime: time + SLOT_DURATION,
        isBooked: false,
        price,
        lastUpdated: Date.now()
      });
      slotIds.push(slotId);
    }
    
    return slotIds;
  },
});

// For testing purposes in Phase 1
export const seedSlots = mutation({
  args: { 
    barberId: v.id("barbers"),
  },
  handler: async (ctx, { barberId }) => {
    // Create slots for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // Check if slots already exist
    const existingSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", todayTimestamp)
      )
      .collect();
    
    if (existingSlots.length > 0) {
      return existingSlots.map(slot => slot._id);
    }
    
    // Create slots
    const slotIds = [];
    for (let time = OPENING_TIME; time < CLOSING_TIME; time += SLOT_DURATION) {
      const slotId = await ctx.db.insert("slots", {
        barberId,
        date: todayTimestamp,
        startTime: time,
        endTime: time + SLOT_DURATION,
        isBooked: false,
        price: 25, // Default price $25
        lastUpdated: Date.now()
      });
      slotIds.push(slotId);
    }
    
    return slotIds;
  }
});

// Add a forceRefresh function to help resolve booking inconsistencies
export const forceRefresh = mutation({
  args: {
    barberId: v.id("barbers"),
    date: v.number()
  },
  handler: async (ctx, { barberId, date }) => {
    // Find all slots for this barber and date
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", date)
      )
      .collect();
      
    // Find all bookings for these slots
    const slotIds = slots.map(slot => slot._id);
    const bookings = await ctx.db
      .query("bookings")
      .filter(q => q.and(
        q.eq(q.field("barberId"), barberId),
        q.eq(q.field("status"), "confirmed")
      ))
      .collect();
      
    // Filter to bookings that are for slots on this date
    const bookingsForThisDate = bookings.filter(booking => 
      slotIds.some(slotId => slotId === booking.slotId)
    );
    
    // Check if any slots have inconsistent booking status
    let fixedSlots = 0;
    
    // First, create a set of slot IDs that should be marked as booked based on bookings
    const shouldBeBooked = new Set(bookingsForThisDate.map(b => b.slotId));
    
    // Next, identify slots that need fixing in either direction (should be booked but isn't, or vice versa)
    const slotsToUpdate = [];
    for (const slot of slots) {
      // Case 1: Slot should be booked according to bookings, but isn't marked as booked
      if (shouldBeBooked.has(slot._id) && !slot.isBooked) {
        slotsToUpdate.push({
          id: slot._id,
          update: { isBooked: true, lastUpdated: Date.now() }
        });
        fixedSlots++;
      }
      
      // Case 2: Slot is marked as booked, but there's no corresponding booking
      else if (slot.isBooked && !shouldBeBooked.has(slot._id)) {
        slotsToUpdate.push({
          id: slot._id,
          update: { isBooked: false, lastUpdated: Date.now() }
        });
        fixedSlots++;
      }
      // Case 3: Status is correct, just update the timestamp
      else {
        slotsToUpdate.push({
          id: slot._id,
          update: { lastUpdated: Date.now() }
        });
      }
    }
    
    // Now update all slots
    for (const slotUpdate of slotsToUpdate) {
      await ctx.db.patch(slotUpdate.id, slotUpdate.update);
    }
    
    return {
      refreshed: slots.length,
      fixed: fixedSlots,
      timestamp: Date.now()
    };
  }
});