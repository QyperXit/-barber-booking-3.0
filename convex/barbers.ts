// convex/barber.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("barbers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getById = query({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, { barberId }) => {
    return await ctx.db.get(barberId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const barberId = await ctx.db.insert("barbers", {
      name: args.name,
      description: args.description,
      userId: args.userId,
      isActive: true,
    });
    return barberId;
  },
});

// For testing purposes in Phase 1, let's add a seed function to create some initial data
export const seedBarber = mutation({
  args: {},
  handler: async (ctx) => {
    const testUserId = "test_user_id";
    const barberName = "John's Haircuts";
    
    // Check if a barber with this name already exists
    const existingBarber = await ctx.db
      .query("barbers")
      .withIndex("by_name", (q) => q.eq("name", barberName))
      .first();
    
    if (existingBarber) {
      // Already exists, just return the ID
      return existingBarber._id;
    }
    
    // Create a test barber
    const barberId = await ctx.db.insert("barbers", {
      name: barberName,
      description: "Professional haircuts and styling",
      userId: testUserId,
      isActive: true,
    });
    
    return barberId;
  }
});

// Cleanup function to remove duplicate barbers
export const cleanupDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all barbers
    const allBarbers = await ctx.db
      .query("barbers")
      .collect();
    
    // Keep track of unique barbers by name
    const uniqueBarberIds = new Map<string, any>();
    const duplicateIds: any[] = [];
    
    // Find duplicates - keep the first one of each name
    allBarbers.forEach((barber) => {
      if (!uniqueBarberIds.has(barber.name)) {
        uniqueBarberIds.set(barber.name, barber._id);
      } else {
        duplicateIds.push(barber._id);
      }
    });
    
    // Delete the duplicates
    for (const id of duplicateIds) {
      await ctx.db.delete(id);
    }
    
    return {
      message: `Removed ${duplicateIds.length} duplicate barbers`,
      count: duplicateIds.length
    };
  }
});