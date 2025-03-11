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
      });
      slotIds.push(slotId);
    }
    
    return slotIds;
  }
});