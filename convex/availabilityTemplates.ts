import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

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

// Save an availability template for a specific day of week
export const saveTemplate = mutation({
  args: {
    barberId: v.id("barbers"),
    dayOfWeek: v.string(),
    startTimes: v.array(v.number())
  },
  handler: async (ctx, { barberId, dayOfWeek, startTimes }) => {
    // Validate day of week
    if (!DAYS_OF_WEEK.includes(dayOfWeek)) {
      throw new Error(`Invalid day of week: ${dayOfWeek}`);
    }
    
    // Check if a template for this day already exists
    const existingTemplate = await ctx.db
      .query("barberAvailabilityTemplates")
      .withIndex("by_barber_day", (q) => 
        q.eq("barberId", barberId).eq("dayOfWeek", dayOfWeek)
      )
      .first();
    
    // Update or create the template
    if (existingTemplate) {
      await ctx.db.patch(existingTemplate._id, {
        startTimes,
        lastUpdated: Date.now()
      });
      return existingTemplate._id;
    } else {
      return await ctx.db.insert("barberAvailabilityTemplates", {
        barberId,
        dayOfWeek,
        startTimes,
        lastUpdated: Date.now()
      });
    }
  }
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