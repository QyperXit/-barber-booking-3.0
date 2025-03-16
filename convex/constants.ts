// convex/constants.ts
// Booking status constants
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed", 
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

// Time constants - slots from 10 AM to 8 PM in 30-minute increments
export const OPENING_TIME = 600; // 10 AM in minutes (10 * 60)
export const CLOSING_TIME = 1200; // 8 PM in minutes (20 * 60)
export const SLOT_DURATION = 30; // 30 minutes