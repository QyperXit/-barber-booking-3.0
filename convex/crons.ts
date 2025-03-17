import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

// Define the scheduled tasks
const crons = cronJobs();

// Synchronize booking and appointment statuses every 10 minutes
crons.interval(
  "sync-booking-appointment-statuses",
  { minutes: 10 },
  api.bookings.syncBookingsAndAppointments
);

// Example of proper cron job configuration - commented out for now
// crons.daily(
//   "cleanup-unused-slots",
//   {
//     hourOfDay: 3, // Run at 3 AM
//   },
//   "slots:cleanupUnusedSlots",
//   { retentionDays: 14 }
// );

export default crons; 