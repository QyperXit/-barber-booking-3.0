// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  barbers: defineTable({
    name: v.string(),
    description: v.string(),
    userId: v.string(), // Owner/admin of this barber
    imageStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
    // Stripe Connect fields
    stripeAccountId: v.optional(v.string()),
    stripeAccountOnboardingComplete: v.optional(v.boolean()),
    stripeAccountPayoutsEnabled: v.optional(v.boolean()),
    stripeAccountChargesEnabled: v.optional(v.boolean()),
    stripeAccountCreatedAt: v.optional(v.number()),
  }).index("by_name", ["name"])
    .index("by_user", ["userId"])
    .index("by_stripe_account", ["stripeAccountId"]),
  
  slots: defineTable({
    barberId: v.id("barbers"),
    date: v.union(v.string(), v.number()), // Allow both string and number for dates
    startTime: v.number(),
    endTime: v.number(),
    isAvailable: v.optional(v.boolean()), // Make isAvailable optional to work with existing data
    isBooked: v.optional(v.boolean()),
    price: v.optional(v.number()),
    lastUpdated: v.optional(v.number()),
  }).index("by_barber_date", ["barberId", "date"]),
  
  // New table for barber availability templates
  barberAvailabilityTemplates: defineTable({
    barberId: v.id("barbers"),
    dayOfWeek: v.string(), // Monday, Tuesday, etc.
    startTimes: v.array(v.number()), // Array of start times in minutes (e.g., 9*60 for 9:00 AM)
    lastUpdated: v.number(),
  }).index("by_barber_day", ["barberId", "dayOfWeek"]),
  
  appointments: defineTable({
    userId: v.string(),
    userName: v.string(),
    barberId: v.id("barbers"),
    barberName: v.string(),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    services: v.array(v.string()),
    status: v.string(),
    createdAt: v.string(),
    // Payment-related fields
    paymentStatus: v.optional(v.string()),
    paymentId: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_barber", ["barberId"])
    .index("by_date", ["date"]),
  
  bookings: defineTable({
    slotId: v.id("slots"),
    barberId: v.id("barbers"),
    userId: v.string(),
    bookedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    paymentIntentId: v.optional(v.string()),
    paymentStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("refunded")
    )),
    amount: v.number(),
    serviceName: v.string(),
    currency: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
  }).index("by_slot", ["slotId"])
    .index("by_barber", ["barberId"])
    .index("by_user", ["userId"])
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_stripe_session", ["stripeSessionId"]),
  
  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(), // Will be replaced with Clerk user ID later
    isBarber: v.optional(v.boolean()),
    stripeCustomerId: v.optional(v.string()),
  }).index("by_user_id", ["userId"])
    .index("by_email", ["email"]),
});