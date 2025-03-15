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
    console.log('\n==== Seeding slots ====');
    
    // Use specified date or default to today
    let dateObj: Date;
    let formattedDateString: string; // YYYY-MM-DD format
    let formattedDateTimestamp: string; // Timestamp as string
    
    if (date) {
      if (typeof date === 'number') {
        dateObj = new Date(date);
        formattedDateTimestamp = String(date);
        formattedDateString = formatDate(dateObj);
      } else if (!isNaN(Number(date))) {
        dateObj = new Date(Number(date));
        formattedDateTimestamp = String(Number(date));
        formattedDateString = formatDate(dateObj);
      } else {
        dateObj = new Date(date);
        formattedDateString = date;
        formattedDateTimestamp = String(dateObj.getTime());
      }
    } else {
      dateObj = new Date();
      dateObj.setHours(0, 0, 0, 0);
      formattedDateTimestamp = String(dateObj.getTime());
      formattedDateString = formatDate(dateObj);
    }
    
    console.log('Seeding slots for', dateObj);
    console.log('String date format:', formattedDateString);
    console.log('Timestamp format:', formattedDateTimestamp);
    
    // Check if slots already exist in either format
    const existingStringSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDateString)
      )
      .collect();
    
    const existingTimestampSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDateTimestamp)
      )
      .collect();
    
    const existingSlots = [...existingStringSlots, ...existingTimestampSlots];
    console.log(`Found ${existingSlots.length} existing slots (${existingStringSlots.length} with string format, ${existingTimestampSlots.length} with timestamp format)`);
    
    if (existingSlots.length > 0) {
      console.log('Slots already exist, returning existing slot IDs');
      console.log('==== Completed slot seeding ====\n');
      return existingSlots.map(slot => slot._id);
    }
    
    // Create slots in both formats
    const slotPairs = [];
    
    for (let time = OPENING_TIME; time < CLOSING_TIME; time += SLOT_DURATION) {
      console.log(`Creating slot for ${formatTime(time)} in both date formats`);
      
      // Create slot with string date format
      const stringSlotId = await ctx.db.insert("slots", {
        barberId,
        date: formattedDateString,
        startTime: time,
        endTime: time + SLOT_DURATION,
        isAvailable: true,
        isBooked: false,
        price: 25, // Default price
        lastUpdated: Date.now()
      });
      
      // Create slot with timestamp date format
      const timestampSlotId = await ctx.db.insert("slots", {
        barberId,
        date: formattedDateTimestamp,
        startTime: time,
        endTime: time + SLOT_DURATION,
        isAvailable: true,
        isBooked: false,
        price: 25, // Default price
        lastUpdated: Date.now()
      });
      
      slotPairs.push({ stringSlotId, timestampSlotId });
    }
    
    console.log(`Created ${slotPairs.length} slot pairs (${slotPairs.length * 2} total slots)`);
    console.log('==== Completed slot seeding ====\n');
    
    // Return all the IDs for compatibility
    return slotPairs.flatMap(pair => [pair.stringSlotId, pair.timestampSlotId]);
  }
});

// Add a forceRefresh function to help resolve booking inconsistencies
export const forceRefresh = mutation({
  args: {
    barberId: v.id("barbers"),
    date: v.union(v.string(), v.number()) // Allow both string and number formats
  },
  handler: async (ctx, { barberId, date }) => {
    console.log('\n==== Force refreshing slots ====');
    console.log('barberId:', barberId, 'date:', date, 'type:', typeof date);
    
    // First, normalize the date into both formats
    let dateObj: Date;
    let formattedDateString: string; // YYYY-MM-DD format
    let formattedDateTimestamp: string; // Timestamp as string
    
    if (typeof date === 'number') {
      dateObj = new Date(date);
      formattedDateTimestamp = String(date);
      formattedDateString = formatDate(dateObj);
    } else {
      // If it's a string, first check if it's a timestamp in string form
      if (!isNaN(Number(date))) {
        dateObj = new Date(Number(date));
        formattedDateTimestamp = date;
        formattedDateString = formatDate(dateObj);
      } else {
        // It's a formatted date string like YYYY-MM-DD
        dateObj = new Date(date);
        formattedDateString = date;
        formattedDateTimestamp = String(dateObj.getTime());
      }
    }
    
    console.log('Date object:', dateObj);
    console.log('String date format:', formattedDateString);
    console.log('Timestamp format:', formattedDateTimestamp);
    
    // Find all slots for this barber and date in both formats
    const stringSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDateString)
      )
      .collect();
    
    const timestampSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDateTimestamp)
      )
      .collect();
    
    const slots = [...stringSlots, ...timestampSlots];
    console.log(`Found ${slots.length} slots (${stringSlots.length} with string format, ${timestampSlots.length} with timestamp format)`);
    
    // If no slots found, return early with a special status
    if (slots.length === 0) {
      console.log('No slots found to refresh');
      console.log('==== Force refresh completed ====\n');
      return {
        refreshed: 0,
        fixed: 0,
        timestamp: Date.now(),
        noSlots: true
      };
    }
      
    // Get all the slot IDs for lookup
    const slotIds = slots.map(slot => slot._id);
    
    // Find all bookings that are confirmed for this barber
    const bookings = await ctx.db
      .query("bookings")
      .filter(q => q.and(
        q.eq(q.field("barberId"), barberId),
        q.eq(q.field("status"), "confirmed")
      ))
      .collect();
    
    console.log(`Found ${bookings.length} confirmed bookings for this barber`);
      
    // Filter to bookings that are for slots on this date
    const bookingsForThisDate = bookings.filter(booking => 
      slotIds.some(slotId => slotId === booking.slotId)
    );
    
    console.log(`Found ${bookingsForThisDate.length} bookings for this date`);
    
    // Create a map of slot ID to booking
    const slotToBooking = new Map();
    bookingsForThisDate.forEach(booking => {
      slotToBooking.set(booking.slotId, booking);
    });
    
    // Check if any slots have inconsistent booking status
    let fixedSlots = 0;
    
    // Next, identify slots that need fixing in either direction
    const slotsToUpdate = [];
    
    for (const slot of slots) {
      const hasBooking = slotToBooking.has(slot._id);
      
      // Case 1: Slot should be booked according to bookings, but isn't marked as booked
      if (hasBooking && !slot.isBooked) {
        console.log(`Fixing slot ${slot._id} (${formatTime(slot.startTime)}): marking as booked`);
        slotsToUpdate.push({
          id: slot._id,
          update: { isBooked: true, lastUpdated: Date.now() }
        });
        fixedSlots++;
      }
      
      // Case 2: Slot is marked as booked, but there's no corresponding booking
      else if (slot.isBooked && !hasBooking) {
        console.log(`Fixing slot ${slot._id} (${formatTime(slot.startTime)}): marking as not booked`);
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
    
    console.log(`Updating ${slotsToUpdate.length} slots, fixed ${fixedSlots} inconsistencies`);
    
    // Now update all slots
    for (const slotUpdate of slotsToUpdate) {
      await ctx.db.patch(slotUpdate.id, slotUpdate.update);
    }
    
    console.log('==== Force refresh completed ====\n');
    
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
    console.log('Updating availability for barber:', barberId);
    
    // First, get dates for the next 4 weeks
    const dates = getNextWeeksDates(4);
    
    // For each date, check if it falls on one of the days specified in availability
    for (const dateObj of dates) {
      const dayOfWeek = getDayOfWeek(dateObj.date);
      const dayAvailability = availability.find(a => a.day === dayOfWeek);
      
      if (!dayAvailability) continue;
      
      // We need to handle both date formats (string formatted date and timestamp)
      const formattedDateString = dateObj.formatted; // YYYY-MM-DD format
      const formattedDateTimestamp = String(dateObj.date.getTime()); // Timestamp as string
      
      console.log(`\n==== Updating availability for ${dayOfWeek} (${formattedDateString}) ====`);
      
      // Get existing slots with string formatted date
      const existingStringSlots = await ctx.db
        .query("slots")
        .withIndex("by_barber_date", (q) => 
          q.eq("barberId", barberId).eq("date", formattedDateString)
        )
        .collect();
      
      // Get existing slots with timestamp format
      const existingTimestampSlots = await ctx.db
        .query("slots")
        .withIndex("by_barber_date", (q) => 
          q.eq("barberId", barberId).eq("date", formattedDateTimestamp)
        )
        .collect();
      
      // Combine both sets of slots (important to get a full picture)
      const existingSlots = [...existingStringSlots, ...existingTimestampSlots];
      console.log(`Found ${existingSlots.length} existing slots (${existingStringSlots.length} with string format, ${existingTimestampSlots.length} with timestamp format)`);
      
      // Step 1: Find all booked slots
      const bookedSlots = existingSlots.filter(slot => slot.isBooked);
      console.log(`Found ${bookedSlots.length} booked slots that must be preserved`);
      
      // Group booked slots by time for easier lookup
      const bookedSlotsByTime = new Map();
      bookedSlots.forEach(slot => {
        const key = String(slot.startTime);
        if (!bookedSlotsByTime.has(key)) {
          bookedSlotsByTime.set(key, []);
        }
        bookedSlotsByTime.get(key).push(slot);
      });
      
      // Step 2: Get the times that are in the barber's new availability
      const selectedTimes = new Set(dayAvailability.times);
      console.log(`Barber selected ${selectedTimes.size} available times`);
      
      // Step 3: Determine final availability (including booked slots)
      const finalAvailability = new Set<number>(selectedTimes);
      
      // Add all booked times to ensure they remain available
      bookedSlots.forEach(slot => {
        if (!finalAvailability.has(slot.startTime)) {
          console.log(`Adding booked time ${formatTime(slot.startTime)} to availability (barber attempted to remove it)`);
          finalAvailability.add(slot.startTime);
        }
      });
      
      console.log(`Final availability includes ${finalAvailability.size} slots (including booked ones)`);
      
      // Step 4: Process existing slots
      // We'll keep track of which slots are already handled to avoid duplicates
      const handledSlotIds = new Set();
      const timesToCreate = new Set<number>();
      
      // Add all final available times to the creation set initially
      finalAvailability.forEach(time => {
        timesToCreate.add(time);
      });
      
      // First, handle booked slots - we always preserve these
      for (const slot of bookedSlots) {
        // This slot should remain booked and available
        console.log(`Preserving booked slot ${slot._id} for time ${formatTime(slot.startTime)}`);
        
        // Make sure isAvailable is set correctly
        if (!slot.isAvailable) {
          console.log(`Fixing isAvailable flag on booked slot ${slot._id}`);
          await ctx.db.patch(slot._id, { 
            isAvailable: true,
            lastUpdated: Date.now()
          });
        }
        
        handledSlotIds.add(slot._id);
        
        // We've handled this time slot, remove it from the creation list
        timesToCreate.delete(slot.startTime);
      }
      
      // Now handle non-booked slots - either mark as available or unavailable
      for (const slot of existingSlots) {
        if (!slot.isBooked && !handledSlotIds.has(slot._id)) {
          const isInFinalAvailability = finalAvailability.has(slot.startTime);
          
          if (isInFinalAvailability) {
            // This slot should be available
            console.log(`Marking slot ${slot._id} for time ${formatTime(slot.startTime)} as available`);
            await ctx.db.patch(slot._id, {
              isAvailable: true,
              lastUpdated: Date.now()
            });
            
            // Remove from creation list since we're keeping this slot
            timesToCreate.delete(slot.startTime);
          } else {
            // This slot should be marked as unavailable instead of deleted
            console.log(`Marking slot ${slot._id} for time ${formatTime(slot.startTime)} as unavailable`);
            await ctx.db.patch(slot._id, {
              isAvailable: false,
              lastUpdated: Date.now()
            });
          }
          
          handledSlotIds.add(slot._id);
        }
      }
      
      // Step 5: Create new slots for any times that should be available but don't have slots yet
      console.log(`Creating ${timesToCreate.size} new available slots`);
      
      // Convert Set to Array before iteration to avoid TypeScript downlevelIteration errors
      for (const time of Array.from(timesToCreate)) {
        // Create slot with string date format
        const stringSlotId = await ctx.db.insert("slots", {
          barberId,
          date: formattedDateString,
          startTime: time,
          endTime: time + 30,
          isAvailable: true, // These should always be available
          isBooked: false,
          price: 25, // Default price
          lastUpdated: Date.now()
        });
        
        // Create slot with timestamp date format
        const timestampSlotId = await ctx.db.insert("slots", {
          barberId,
          date: formattedDateTimestamp,
          startTime: time,
          endTime: time + 30,
          isAvailable: true, // These should always be available
          isBooked: false,
          price: 25, // Default price
          lastUpdated: Date.now()
        });
        
        console.log(`Created new available slots for ${formatTime(time)} with IDs ${stringSlotId} and ${timestampSlotId}`);
      }
      
      console.log(`==== Completed availability update for ${dayOfWeek} ====\n`);
    }
    
    return { success: true };
  }
});

// Helper function to format time
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMins = mins.toString().padStart(2, '0');
  return `${formattedHours}:${formattedMins} ${ampm}`;
}

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
    console.log('\n==== Generating slots for date:', date, 'type:', typeof date, '====');
    
    // Convert date to a proper Date object for processing
    let dateObj: Date;
    let formattedDateString: string; // YYYY-MM-DD format
    let formattedDateTimestamp: string; // Timestamp as string
    
    if (typeof date === 'number') {
      dateObj = new Date(date);
      formattedDateTimestamp = String(date);
      formattedDateString = formatDate(dateObj);
    } else {
      // If it's a string, first check if it's a timestamp in string form
      if (!isNaN(Number(date))) {
        dateObj = new Date(Number(date));
        formattedDateTimestamp = date;
        formattedDateString = formatDate(dateObj);
      } else {
        // It's a formatted date string like YYYY-MM-DD
        dateObj = new Date(date);
        formattedDateString = date;
        formattedDateTimestamp = String(dateObj.getTime());
      }
    }
    
    console.log('Date object:', dateObj);
    console.log('String date format for storage:', formattedDateString);
    console.log('Timestamp format for storage:', formattedDateTimestamp);
    
    // Get day of week for the specified date
    const dayOfWeek = getDayOfWeek(dateObj);
    console.log('Day of week:', dayOfWeek);
    
    // Check if slots already exist with either date format
    const existingStringSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDateString)
      )
      .collect();
    
    const existingTimestampSlots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDateTimestamp)
      )
      .collect();
    
    const existingSlots = [...existingStringSlots, ...existingTimestampSlots];
    console.log(`Found ${existingSlots.length} existing slots (${existingStringSlots.length} with string format, ${existingTimestampSlots.length} with timestamp format)`);
    
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
    
    console.log('Found template:', template ? 'yes' : 'no');
    
    // If no template exists, return appropriate status
    if (!template) {
      return {
        status: "no_template",
        slots: []
      };
    }
    
    // Generate slots based on template in both date formats
    const slotPairs = []; // To keep track of string/timestamp slot pairs
    
    for (const startTime of template.startTimes) {
      console.log(`Creating slot for ${formatTime(startTime)} in both date formats`);
      
      // Create slot with string date format
      const stringSlotId = await ctx.db.insert("slots", {
        barberId,
        date: formattedDateString,
        startTime,
        endTime: startTime + duration,
        isAvailable: true,
        isBooked: false,
        price: 25, // Default price
        lastUpdated: Date.now()
      });
      
      // Create slot with timestamp date format
      const timestampSlotId = await ctx.db.insert("slots", {
        barberId,
        date: formattedDateTimestamp,
        startTime,
        endTime: startTime + duration,
        isAvailable: true,
        isBooked: false,
        price: 25, // Default price
        lastUpdated: Date.now()
      });
      
      slotPairs.push({ stringSlotId, timestampSlotId });
    }
    
    console.log(`Generated ${slotPairs.length} slot pairs (${slotPairs.length * 2} total slots) successfully`);
    
    // Fetch the created slots (we'll get both formats)
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_barber_date", (q) => 
        q.eq("barberId", barberId).eq("date", formattedDateString)
      )
      .collect();
    
    console.log(`Found ${slots.length} slots after generation`);
    console.log('==== Completed slot generation ====\n');
    
    return {
      status: "generated",
      slots: slots
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