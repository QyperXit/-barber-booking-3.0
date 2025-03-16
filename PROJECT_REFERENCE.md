# Barber Booking App - Reference Document

> **IMPORTANT INSTRUCTION FOR AI ASSISTANTS**: 
> When helping with this codebase, always refer to this document for context.
> After implementing changes that work successfully, remember to ask the user:
> "Would you like me to update the PROJECT_REFERENCE.md file to reflect these changes?"
> This ensures documentation remains in sync with the codebase's evolving functionality.

## Application Overview

This is a barber booking application built with Next.js 15.2.2 and Convex for the backend database and API. The application allows users to book appointments with barbers, and barbers to manage their availability and view their appointments.

## Tech Stack

- **Frontend**: Next.js 15.2.2 with React 19.0.0, using the App Router
- **Backend**: Convex for database, API, and serverless functions
- **Authentication**: Clerk for user authentication
- **Styling**: UI components from Shadcn UI (based on component imports)

## Directory Structure

- **/app**: Next.js app router pages and components
  - **/appointments**: User's appointments page
  - **/barbers**: Barber-related pages
    - **/create**: Barber profile creation
    - **/dashboard**: Barber dashboard with components for availability, profile, appointments
    - **/profile**: Barber profile page
  - **/book**: Booking pages
    - **/[barberId]**: Dynamic route for booking with a specific barber
  - **/admin**: Admin dashboard pages
  - **/cleanup**: Utility pages for data cleanup
  - **/api**: API routes
  - **/actions**: Server actions

- **/convex**: Convex backend code
  - **/schema.ts**: Data model definition
  - **/slots.ts**: Slot management functions
  - **/bookings.ts**: Booking management functions
  - **/appointments.ts**: Appointment management functions 
  - **/barbers.ts**: Barber management functions
  - **/availabilityTemplates.ts**: Functions for managing barber availability templates
  - **/crons.ts**: Scheduled tasks
  - **/constants.ts**: Application constants
  - **/_generated/**: Auto-generated API code

- **/components**: Reusable UI components
- **/lib**: Utility functions and helper code
  - **/utils.ts**: General utility functions
  - **/roles.ts**: User role management

## Core Data Models

1. **barbers**: Barber profiles with name, description, userId, image, and active status
2. **slots**: Time slots for bookings with barberId, date, start/end times, booking status
3. **barberAvailabilityTemplates**: Templates for barber availability by day of week
4. **appointments**: Records of appointments with user and barber information
5. **bookings**: Records of slot bookings with payment and status information
6. **users**: User profiles with authentication information

## Key Features and Functionality

### Booking Flow

1. Users visit the booking page for a specific barber (`/book/[barberId]`)
2. The page loads available slots for the selected date from the `slots` table
3. If no slots exist, it attempts to generate slots from the barber's availability template
4. Users can select a slot and service, then book an appointment
5. Upon booking, the slot is marked as booked and an appointment record is created

### Slot Management

The application handles slots with significant complexity:

1. **Date Format Handling**: The application stores dates in two formats:
   - YYYY-MM-DD string format (e.g., "2024-06-13")
   - Timestamp as string (e.g., "1718236800000")
   
2. **Slot Generation**: Slots are generated from templates using:
   - `generateSlotsFromTemplate`: Generates slots based on barber's saved availability template
   - `seedSlots`: Creates default slots if no template exists
   
3. **Slot Refresh**: The `forceRefresh` function ensures booking status consistency

4. **Slot Cleanup**: The `cleanupUnusedSlots` function removes old or far-future unused slots

### Barber Dashboard

Barbers can:
1. Set their availability by day of week using the availability component
2. View and manage their appointments
3. Update their profile information

## Key Functions

### In slots.ts:

1. `getByBarberAndDate`: Retrieves slots for a specific barber and date
   - Handles both date format types (string and number)
   - Tries alternative format if no results found with primary format
   
2. `initializeDaySlots`: Creates slots for a specific day
   - Checks if slots already exist
   - Creates slots from opening to closing time
   
3. `seedSlots`: Creates default slots for testing/fallback
   - Creates slots with both date formats
   - Returns slot IDs
   
4. `forceRefresh`: Ensures slot booking status matches actual bookings
   - Finds all slots for a specific date
   - Compares with booking records
   - Updates slot booking status as needed
   
5. `updateAvailability`: Updates slots based on barber's availability settings
   - Gets dates for the next 4 weeks
   - Updates slots for each day based on availability templates
   - Recreates booked slots to preserve bookings
   
6. `generateSlotsFromTemplate`: Creates slots based on barber's saved template
   - Checks if slots already exist
   - Finds template for the day of week
   - Creates slots based on template start times
   - Returns slots with status ("existing", "no_template", "generated")
   
7. `cleanupUnusedSlots`: Removes unused slots to keep the database clean
   - Deletes slots that are in the past or too far in the future
   - Only deletes unbooked slots

### In the booking page:

1. `handleForceRefresh`: Refreshes slot booking status
   - Calls the forceRefresh function
   - Shows toast notifications based on result
   
2. `handleBooking`: Creates a booking for a selected slot
   - Validates user is authenticated
   - Creates booking record
   - Navigates to appointments page
   
3. `handleDateChange`: Updates the selected date
   - Sets date to midnight
   - Clears selected slot
   
4. `initializeSlots`: Ensures slots exist for the selected date
   - Checks if slots exist
   - Generates slots from template if needed
   - Falls back to seedSlots if no template exists

## Code Samples for Critical Functions

### Date Handling in Booking Page

```typescript
// Get the timestamp for the selected date (midnight)
const selectedTimestamp = selectedDate.setHours(0, 0, 0, 0);

// Get all slots for the selected date
const slots = useQuery(api.slots.getByBarberAndDate, {
  barberId: barberIdAsId,
  date: selectedTimestamp
});
```

### Slot Generation from Template

```typescript
// Generate slots for a specific date based on availability templates
export const generateSlotsFromTemplate = mutation({
  args: {
    barberId: v.id("barbers"),
    date: v.union(v.string(), v.number()),
    duration: v.optional(v.number()), // Duration of each slot in minutes, defaults to 30
  },
  handler: async (ctx, { barberId, date, duration = 30 }) => {
    // Convert date to a proper Date object and ensure consistent format
    let dateObj: Date;
    let formattedDate: string;
    
    if (typeof date === 'number') {
      dateObj = new Date(date);
      formattedDate = String(date);
    } else {
      // Handle string format...
    }
    
    // Find availability template for this day of week
    const template = await ctx.db
      .query("barberAvailabilityTemplates")
      .withIndex("by_barber_day", (q) => 
        q.eq("barberId", barberId).eq("dayOfWeek", getDayOfWeek(dateObj))
      )
      .first();
    
    // Generate slots if template exists...
  }
});
```

### Refresh Slot Status

```typescript
const handleForceRefresh = async () => {
  try {
    toast({
      title: "Refreshing slots...",
      description: "Checking for the latest booking information.",
      duration: 3000,
    });
    
    const result = await forceRefresh({
      barberId: barberIdAsId,
      date: selectedTimestamp
    });
    
    if (result.fixed > 0) {
      toast({
        title: "Updated booking status",
        description: `Fixed ${result.fixed} slots with incorrect booking status.`,
        variant: "default",
      });
    } else {
      toast({
        title: "All slots up to date",
        description: "Your booking information is current.",
      });
    }
  } catch (error) {
    toast({
      title: "Refresh failed",
      description: "There was an error refreshing the slots. Please try again.",
      variant: "destructive",
    });
  }
};
```

## Common Issues and Quirks

1. **Date Format Inconsistency**: The application uses two different date formats interchangeably:
   - YYYY-MM-DD format (used in the barber dashboard)
   - Timestamp as string (used in the booking page)
   
   This can cause issues where slots appear in one interface but not the other if not properly handled.

2. **Date Mutation**: The booking page uses `selectedDate.setHours(0, 0, 0, 0)` which mutates the original date object. This can lead to unexpected behavior since React state should be treated as immutable.

3. **Slot Generation Gaps**: When the `forceRefresh` function is called, it checks and fixes slot booking status but doesn't generate new slots if none exist. This can cause the UI to show "Loading available time slots..." indefinitely.

4. **Template Fallback**: When no availability template exists for a day, the system relies on `seedSlots` as a fallback, but this fallback mechanism isn't always consistently applied.

5. **Orphaned Bookings**: If a slot is deleted but has associated bookings, those bookings can become "orphaned" and not appear correctly in the UI.

## Recent Changes and Development Status

### Latest Updates (March 15, 2024)

1. **Fixed Slot Availability Issue**: Modified the `updateAvailability` function in `convex/slots.ts` to mark cleared slots as unavailable instead of deleting them. This ensures that when a barber clears a slot from their dashboard, it's properly reflected in the booking page as unavailable.

2. **Enhanced Booking Page Functionality**:
   - Added a new "Not Available" section in the booking UI to display slots specifically marked as unavailable by the barber
   - Improved the date change handling to automatically force a refresh when changing dates
   - Enhanced the slot initialization process to check both string and timestamp formats

3. **Improved Debugging**: Added detailed logging throughout the slots management process to help identify issues with slot availability and visibility.

4. **Known Issues**:
   - TypeScript error in the `updateAvailability` function related to the `time` variable being treated as `unknown` when iterating over a Set
   - "No slots found for this date and barber" message may still appear occasionally, requiring a manual refresh

5. **Next Steps**:
   - Fix remaining TypeScript errors in the `updateAvailability` function
   - Improve the sync between barber dashboard and booking page
   - Enhance error handling for missing slots or templates

## Getting Started

## Component Interactions and Data Flow

### Booking Flow

1. **User selects a date** in the booking page
2. **`useQuery(api.slots.getByBarberAndDate)`** fetches slots for that date
3. **`useEffect` with initialization logic** runs if no slots are found:
   - Calls `generateSlotsFromTemplate` to create slots from the barber's template
   - Falls back to `seedSlots` if no template exists
4. **User selects a time slot** and service
5. **`handleBooking`** creates a booking record with `createBooking` mutation
6. **User is redirected** to appointments page

### Barber Dashboard Flow

1. **Barber sets availability** using the availability component
2. **`saveTemplates`** mutation saves the availability template
3. **`updateAvailability`** mutation creates slots for the next 4 weeks based on templates
4. **`cleanupSlots`** mutation removes unused slots beyond the retention window
5. **Barber views appointments** that have been booked

## API Usage Examples

### Querying Data with Convex

```typescript
// Get a barber by ID
const barber = useQuery(api.barbers.getById, { 
  barberId: barberIdAsId
});

// Get slots for a specific date
const slots = useQuery(api.slots.getByBarberAndDate, {
  barberId: barberIdAsId,
  date: selectedTimestamp
});

// Get availability templates for a barber
const templates = useQuery(api.availabilityTemplates.getByBarber, { 
  barberId 
});
```

### Mutating Data with Convex

```typescript
// Create a booking
await createBooking({
  slotId: selectedSlot,
  userId: currentUserId,
  serviceName,
  userName: user?.fullName || user?.firstName || undefined,
  userEmail: user?.primaryEmailAddress?.emailAddress,
});

// Save availability template
await saveTemplate({
  barberId,
  dayOfWeek: selectedDay,
  startTimes: selectedSlots[selectedDay]
});

// Force refresh slots
const result = await forceRefresh({
  barberId: barberIdAsId,
  date: selectedTimestamp
});
```

## Environment Setup

### Key Environment Variables

The application uses a `.env.local` file with the following variables:

```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Convex Backend
CONVEX_DEPLOYMENT=dev:your-deployment-id # team: your-team, project: your-project
NEXT_PUBLIC_CONVEX_URL=...

# Stripe Payment Processing
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=... # Ensure no spaces or hidden characters
STRIPE_CONNECT_CLIENT_ID=... # For Stripe Connect integration

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the Convex development server:
   ```
   npx convex dev
   ```

3. Start the Next.js development server:
   ```
   npm run dev
   ```

4. Access the application at:
   - Application: http://localhost:3000
   - Convex Dashboard: http://localhost:8000

5. **Note**: Stripe CLI is installed in this project for testing Stripe payment integration in the future.

### Common Development Commands

- **Check for running servers**:
  ```
  # Find processes using ports 3000 (Next.js) and 8000 (Convex)
  lsof -i :3000,8000
  # OR
  ps aux | grep -E 'convex|next' | grep -v grep
  ```

- **Kill duplicate servers before starting**:
  ```
  # Kill any process using port 3000 (Next.js)
  kill -9 $(lsof -t -i:3000)
  # Kill any process using port 8000 (Convex)
  kill -9 $(lsof -t -i:8000)
  # OR kill all node processes (use with caution)
  killall node
  ```

- **Start development servers with clean environment**:
  ```
  # Kill any existing servers and start fresh
  kill -9 $(lsof -t -i:3000,8000) 2>/dev/null; npx convex dev & npm run dev
  ```

- **Build for production**: `npm run build`
- **Lint code**: `npm run lint`
- **Run tests**: `npm test` (if tests are set up) 