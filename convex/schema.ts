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
  }).index("by_name", ["name"])
    .index("by_user", ["userId"]),
  
  slots: defineTable({
    barberId: v.id("barbers"),
    date: v.number(), // Timestamp for the day
    startTime: v.number(), // Minutes since midnight (e.g., 600 for 10:00 AM)
    endTime: v.number(), // Minutes since midnight (e.g., 630 for 10:30 AM)
    isBooked: v.boolean(),
    price: v.number(),
    lastUpdated: v.optional(v.number()), // Timestamp for when the slot was last updated
  }).index("by_barber", ["barberId"])
    .index("by_barber_date", ["barberId", "date"])
    .index("by_date", ["date"]),
  
  bookings: defineTable({
    slotId: v.id("slots"),
    barberId: v.id("barbers"),
    userId: v.string(),
    bookedAt: v.number(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    paymentIntentId: v.optional(v.string()),
    amount: v.number(),
    serviceName: v.string(),
  }).index("by_slot", ["slotId"])
    .index("by_barber", ["barberId"])
    .index("by_user", ["userId"])
    .index("by_payment_intent", ["paymentIntentId"]),
  
  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(), // Will be replaced with Clerk user ID later
    isBarber: v.optional(v.boolean()),
    stripeCustomerId: v.optional(v.string()),
  }).index("by_user_id", ["userId"])
    .index("by_email", ["email"]),
});