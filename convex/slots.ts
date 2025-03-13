// convex/slots.ts
import { v } from "convex/values";
import { formatDateForStorage } from "../lib/utils";
import { mutation, query } from "./_generated/server";
import { CLOSING_TIME, OPENING_TIME, SLOT_DURATION } from "./constants";

// Get all slots for a specific barber on a specific date
export const getByBarberAndDate = query({
  args: {
    barberId: v.id("barbers"),
    date: v.union(v.string(), v.number()) // Allow both string and number formats
  },
  handler: async (ctx, { barberId, date }) => {
    console.log('Getting slots for barber:', barberId, 'date:', date, 'type:', typeof date);
    
    // Since we're storing dates in different formats, we need to attempt to query with the exact format provided
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", typeof date === 'number' ? String(date) : date)
      )
      .collect();
    
    console.log(`Found ${slots.length} slots for date:`, date);
    
    // If we found slots, return them
    if (slots.length > 0) {
      return slots;
    }
    
    // Try the alternative format if we didn't find any slots
    const alternativeDate = typeof date === 'string' ? 
      (!isNaN(Number(date)) ? Number(date) : new Date(date).getTime()) : 
      String(date);
    
    console.log('Trying alternative date format:', alternativeDate);
    
    const alternativeSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", typeof alternativeDate === 'number' ? String(alternativeDate) : alternativeDate)
      )
      .collect();
    
    console.log(`Found ${alternativeSlots.length} slots with alternative date format`);
    
    return alternativeSlots;
  },
});

// Initialize all slots for a barber for a specific date
export const initializeDaySlots = mutation({
  args: {
    barberId: v.id("barbers"),
    date: v.union(v.string(), v.number()), // Allow both string and number formats
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
        isAvailable: true,
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
    date: v.optional(v.union(v.string(), v.number())), // Optional date param
  },
  handler: async (ctx, { barberId, date }) => {
    // Use specified date or default to today
    let targetDate: Date;
    let targetTimestamp: number;
    
    if (date) {
      if (typeof date === 'number') {
        targetDate = new Date(date);
        targetTimestamp = date;
      } else if (!isNaN(Number(date))) {
        targetDate = new Date(Number(date));
        targetTimestamp = Number(date);
      } else {
        targetDate = new Date(date);
        targetTimestamp = targetDate.getTime();
      }
    } else {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
      targetTimestamp = targetDate.getTime();
    }
    
    console.log('Seeding slots for', targetDate, 'timestamp:', targetTimestamp);
    
    // Format date for database query - using the same format as the input
    const formattedDate = date ? (typeof date === 'string' ? date : String(targetTimestamp)) : String(targetTimestamp);
    
    // Check if slots already exist
    const existingSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDate)
      )
      .collect();
    
    console.log('Existing slots found:', existingSlots.length);
    
    if (existingSlots.length > 0) {
      return existingSlots.map(slot => slot._id);
    }
    
    // Create slots
    const slotIds = [];
    for (let time = OPENING_TIME; time < CLOSING_TIME; time += SLOT_DURATION) {
      const slotId = await ctx.db.insert("slots", {
        barberId,
        date: formattedDate,
        startTime: time,
        endTime: time + SLOT_DURATION,
        isBooked: false,
        isAvailable: true,
        price: 25, // Default price $25
        lastUpdated: Date.now()
      });
      slotIds.push(slotId);
    }
    
    console.log(`Created ${slotIds.length} slots for ${targetDate}`);
    
    return slotIds;
  }
});

// Add a forceRefresh function to help resolve booking inconsistencies
export const forceRefresh = mutation({
  args: {
    barberId: v.id("barbers"),
    date: v.union(v.string(), v.number()) // Allow both string and number formats
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

export const updateAvailability = mutation({
  args: {
    barberId: v.id("barbers"),
    availability: v.array(
      v.object({
        day: v.string(),
        times: v.array(v.number())
      })
    )
  },
  handler: async (ctx, { barberId, availability }) => {
    // First, get dates for the next 4 weeks
    const dates = getNextWeeksDates(4);
    
    // For each date, check if it falls on one of the days specified in availability
    for (const dateObj of dates) {
      const dayOfWeek = getDayOfWeek(dateObj.date);
      const dayAvailability = availability.find(a => a.day === dayOfWeek);
      
      if (!dayAvailability) continue;
      
      // Get existing slots for this barber and date
      const existingSlots = await ctx.db
        .query("slots")
        .withIndex("by_barber_date", (q) => 
          q.eq("barberId", barberId).eq("date", dateObj.formatted)
        )
        .collect();
      
      // Delete existing slots for this day
      for (const slot of existingSlots) {
        await ctx.db.delete(slot._id);
      }
      
      // Create new slots based on the availability
      for (const time of dayAvailability.times) {
        // Each slot is 30 minutes
        await ctx.db.insert("slots", {
          barberId,
          date: dateObj.formatted,
          startTime: time,
          endTime: time + 30,
          isAvailable: true
        });
      }
    }
    
    return { success: true };
  }
});

// Helper function to get dates for the next few weeks
function getNextWeeksDates(weeks: number) {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    
    const formatted = formatDate(date);
    dates.push({
      date,
      formatted
    });
  }
  
  return dates;
}

// Helper function to get day of week
function getDayOfWeek(date: Date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Generate slots for a specific date based on availability templates
export const generateSlotsFromTemplate = mutation({
  args: {
    barberId: v.id("barbers"),
    date: v.union(v.string(), v.number()),
    duration: v.optional(v.number()), // Duration of each slot in minutes, defaults to 30
  },
  handler: async (ctx, { barberId, date, duration = 30 }) => {
    console.log('Generating slots for date:', date, 'type:', typeof date);
    
    // Convert date to a proper Date object and ensure consistent format
    let dateObj: Date;
    let formattedDate: string;
    
    if (typeof date === 'number') {
      dateObj = new Date(date);
      // Also store the original timestamp for querying
      formattedDate = String(date);
    } else {
      // If it's a string, first check if it's a timestamp in string form
      if (!isNaN(Number(date))) {
        dateObj = new Date(Number(date));
        formattedDate = date;
      } else {
        // It's a formatted date string like YYYY-MM-DD
        dateObj = new Date(date);
        formattedDate = date;
      }
    }
    
    console.log('Date object:', dateObj, 'formatted date for lookup:', formattedDate);
    
    // Get day of week for the specified date
    const dayOfWeek = getDayOfWeek(dateObj);
    console.log('Day of week:', dayOfWeek);
    
    // Check if slots already exist for this date
    const existingSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDate)
      )
      .collect();
    
    console.log('Existing slots found:', existingSlots.length);
    
    // If slots already exist, return them
    if (existingSlots.length > 0) {
      return {
        status: "existing",
        slots: existingSlots
      };
    }
    
    // Find availability template for this day of week
    const template = await ctx.db
      .query("barberAvailabilityTemplates")
      .withIndex("by_barber_day", (q) => 
        q.eq("barberId", barberId).eq("dayOfWeek", dayOfWeek)
      )
      .first();
    
    console.log('Found template:', template ? 'yes' : 'no', template);
    
    // If no template exists, return empty array
    if (!template) {
      return {
        status: "no_template",
        slots: []
      };
    }
    
    // Generate slots based on template
    const slotIds = [];
    for (const startTime of template.startTimes) {
      const slotId = await ctx.db.insert("slots", {
        barberId,
        date: formattedDate,
        startTime,
        endTime: startTime + duration,
        isAvailable: true,
        isBooked: false,
        price: 25, // Default price, could be configurable
        lastUpdated: Date.now()
      });
      slotIds.push(slotId);
    }
    
    console.log(`Generated ${slotIds.length} slots successfully`);
    
    // Fetch the created slots
    const slots = await Promise.all(
      slotIds.map(id => ctx.db.get(id))
    );
    
    return {
      status: "generated",
      slots: slots.filter(Boolean) // Remove any nulls
    };
  }
});

// Clean up unused slots (can be run periodically or via scheduled function)
export const cleanupUnusedSlots = mutation({
  args: {
    retentionDays: v.optional(v.number()) // Number of days to keep empty slots for, defaults to 14
  },
  handler: async (ctx, { retentionDays = 14 }) => {
    // Get current date
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 1); // Past dates (yesterday and earlier)
    
    const futureCutoffDate = new Date();
    futureCutoffDate.setDate(now.getDate() + retentionDays); // Future retention window
    
    // Format dates for comparison
    const pastCutoffDateStr = formatDate(cutoffDate);
    const futureCutoffDateStr = formatDate(futureCutoffDate);
    
    // Find unused slots that are:
    // 1. In the past (before yesterday)
    // 2. Too far in the future (beyond retention window)
    // 3. Not booked
    const slotsToDelete = await ctx.db
      .query("slots")
      .filter(q => 
        q.and(
          q.or(
            // Past slots
            q.lt(q.field("date"), pastCutoffDateStr),
            // Future slots beyond retention window
            q.gt(q.field("date"), futureCutoffDateStr)
          ),
          // Not booked
          q.eq(q.field("isBooked"), false)
        )
      )
      .collect();
    
    // Delete the slots
    let deletedCount = 0;
    for (const slot of slotsToDelete) {
      await ctx.db.delete(slot._id);
      deletedCount++;
    }
    
    return {
      deletedCount,
      message: `Deleted ${deletedCount} unused slots`,
      pastCutoff: pastCutoffDateStr,
      futureCutoff: futureCutoffDateStr
    };
  }
});