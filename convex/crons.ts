import { cronJobs } from "convex/server";

// Define the scheduled tasks
const crons = cronJobs();

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