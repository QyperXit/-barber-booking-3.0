import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("appointments").collect();
  },
});

export const getById = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getByBarberId = query({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, { barberId }) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_barber", (q) => q.eq("barberId", barberId))
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    barberId: v.id("barbers"),
    barberName: v.string(),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    services: v.array(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const appointmentId = await ctx.db.insert("appointments", {
      userId: args.userId,
      userName: args.userName,
      barberId: args.barberId,
      barberName: args.barberName,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      services: args.services,
      status: args.status,
      createdAt: new Date().toISOString(),
    });
    
    return appointmentId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("appointments"),
    status: v.string(),
  },
  handler: async (ctx, { id, status }) => {
    const appointment = await ctx.db.get(id);
    
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    
    await ctx.db.patch(id, { status });
    
    return await ctx.db.get(id);
  },
}); 