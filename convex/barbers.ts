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

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("barbers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Check if a barber has completed Stripe onboarding
export const hasCompletedStripeOnboarding = query({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, { barberId }) => {
    const barber = await ctx.db.get(barberId);
    
    if (!barber) {
      return {
        hasStripeAccount: false,
        onboardingComplete: false
      };
    }
    
    return {
      hasStripeAccount: !!barber.stripeAccountId,
      onboardingComplete: !!barber.stripeAccountOnboardingComplete
    };
  },
});

// Update a barber's Stripe account ID
export const updateStripeAccountId = mutation({
  args: {
    barberId: v.id("barbers"),
    stripeAccountId: v.string(),
  },
  handler: async (ctx, { barberId, stripeAccountId }) => {
    const barber = await ctx.db.get(barberId);
    
    if (!barber) {
      throw new Error("Barber not found");
    }
    
    await ctx.db.patch(barberId, {
      stripeAccountId,
      stripeAccountOnboardingComplete: false,
      stripeAccountPayoutsEnabled: false,
      stripeAccountChargesEnabled: false,
      stripeAccountCreatedAt: Date.now(),
    });
    
    return await ctx.db.get(barberId);
  },
});

// Update a barber's Stripe account status
export const updateStripeAccountStatus = mutation({
  args: {
    stripeAccountId: v.string(),
    onboardingComplete: v.optional(v.boolean()),
    payoutsEnabled: v.optional(v.boolean()),
    chargesEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { stripeAccountId, onboardingComplete, payoutsEnabled, chargesEnabled }) => {
    // Find the barber with this Stripe account ID
    const barber = await ctx.db
      .query("barbers")
      .withIndex("by_stripe_account", (q) => q.eq("stripeAccountId", stripeAccountId))
      .first();
    
    if (!barber) {
      throw new Error("Barber with this Stripe account ID not found");
    }
    
    // Update the barber with the new status
    const updates: Record<string, any> = {};
    
    if (onboardingComplete !== undefined) {
      updates.stripeAccountOnboardingComplete = onboardingComplete;
    }
    
    if (payoutsEnabled !== undefined) {
      updates.stripeAccountPayoutsEnabled = payoutsEnabled;
    }
    
    if (chargesEnabled !== undefined) {
      updates.stripeAccountChargesEnabled = chargesEnabled;
    }
    
    await ctx.db.patch(barber._id, updates);
    
    return await ctx.db.get(barber._id);
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

export const update = mutation({
  args: {
    barberId: v.id("barbers"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { barberId, name, description }) => {
    const barber = await ctx.db.get(barberId);
    
    if (!barber) {
      throw new Error("Barber not found");
    }
    
    await ctx.db.patch(barberId, {
      name,
      description,
    });
    
    return await ctx.db.get(barberId);
  },
});

// Find or create a barber profile for a user
export const findOrCreate = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, description }) => {
    // Check if a barber with this userId already exists
    const existingBarber = await ctx.db
      .query("barbers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (existingBarber) {
      // Already exists, just return the ID
      return existingBarber._id;
    }
    
    // Create a new barber profile
    const barberId = await ctx.db.insert("barbers", {
      name: name,
      description: description || "Professional barber services",
      userId: userId,
      isActive: true,
    });
    
    return barberId;
  }
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