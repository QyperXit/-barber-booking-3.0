import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

// Get all availability templates for a barber
export const getByBarber = query({
  args: {
    barberId: v.id("barbers")
  },
  handler: async (ctx, { barberId }) => {
    return await ctx.db
      .query("barberAvailabilityTemplates")
      .withIndex("by_barber_day", (q) => q.eq("barberId", barberId))
      .collect();
  }
});

// Save a template for a specific day of the week
export const saveTemplate = mutation({
  args: {
    barberId: v.id("barbers"),
    dayOfWeek: v.string(),
    startTimes: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { barberId, dayOfWeek, startTimes } = args;
    
    // Validate day of week
    if (!DAYS_OF_WEEK.includes(dayOfWeek)) {
      throw new Error(`Invalid day of week: ${dayOfWeek}`);
    }
    
    // Check if a template already exists for this day
    const existingTemplate = await ctx.db
      .query("barberAvailabilityTemplates")
      .withIndex("by_barber_day", (q) => 
        q.eq("barberId", barberId).eq("dayOfWeek", dayOfWeek)
      )
      .first();
    
    let id: Id<"barberAvailabilityTemplates">;
    
    if (existingTemplate) {
      // Update existing template
      id = existingTemplate._id;
      await ctx.db.patch(id, {
        startTimes,
        lastUpdated: Date.now(),
      });
      console.log(`Updated template for ${dayOfWeek}`);
    } else {
      // Create new template
      id = await ctx.db.insert("barberAvailabilityTemplates", {
        barberId,
        dayOfWeek,
        startTimes,
        lastUpdated: Date.now(),
      });
      console.log(`Created new template for ${dayOfWeek}`);
    }
    
    console.log(`Template saved for ${dayOfWeek} with ${startTimes.length} time slots`);
    
    // Update slots for this day of week
    try {
      // Call the updateSlotsFromTemplate function to update slots for this day
      await ctx.runMutation(api.slots.updateSlotsFromTemplate, {
        barberId,
        dayOfWeek
      });
      console.log(`Slots updated for ${dayOfWeek}`);
    } catch (error) {
      console.error(`Error updating slots for ${dayOfWeek}:`, error);
    }
    
    return {
      id,
      dayOfWeek,
      refreshRequired: true
    };
  },
});

// Save templates for multiple days at once
export const saveTemplates = mutation({
  args: {
    barberId: v.id("barbers"),
    templates: v.array(
      v.object({
        dayOfWeek: v.string(),
        startTimes: v.array(v.number())
      })
    )
  },
  handler: async (ctx, { barberId, templates }) => {
    const results = [];
    
    for (const template of templates) {
      // Call the saveTemplate directly with its handler function
      const existingTemplate = await ctx.db
        .query("barberAvailabilityTemplates")
        .withIndex("by_barber_day", (q) => 
          q.eq("barberId", barberId).eq("dayOfWeek", template.dayOfWeek)
        )
        .first();
      
      let id;
      if (existingTemplate) {
        await ctx.db.patch(existingTemplate._id, {
          startTimes: template.startTimes,
          lastUpdated: Date.now()
        });
        id = existingTemplate._id;
      } else {
        id = await ctx.db.insert("barberAvailabilityTemplates", {
          barberId,
          dayOfWeek: template.dayOfWeek,
          startTimes: template.startTimes,
          lastUpdated: Date.now()
        });
      }
      
      results.push(id);
    }
    
    return results;
  }
});

// Get the day of week for a specific date
function getDayOfWeekFromDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

// Convert a date string or timestamp to a Date object
function parseDate(dateInput: string | number): Date {
  if (typeof dateInput === 'number') {
    return new Date(dateInput);
  }
  return new Date(dateInput);
} 