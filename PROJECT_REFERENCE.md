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
- **Payments**: Stripe Connect for payment processing

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
    - **/stripe**: Stripe API endpoints
      - **/create-connect-account**: Create Stripe Connect account for barbers
      - **/create-account-link**: Generate onboarding links for Stripe Connect
      - **/create-checkout-session**: Create payment sessions for bookings
    - **/webhooks**: Webhook endpoints
      - **/stripe**: Stripe webhook handler for payment events
  - **/actions**: Server actions

- **/convex**: Convex backend code
  - **/schema.ts**: Data model definition
  - **/slots.ts**: Slot management functions
  - **/bookings.ts**: Booking management functions
  - **/appointments.ts**: Appointment management functions 
  - **/barbers.ts**: Barber management functions
  - **/users.ts**: User management functions
  - **/availabilityTemplates.ts**: Functions for managing barber availability templates
  - **/crons.ts**: Scheduled tasks
  - **/constants.ts**: Application constants
  - **/migrations.ts**: Database migration functions
  - **/_generated/**: Auto-generated API code

- **/components**: Reusable UI components
- **/lib**: Utility functions and helper code
  - **/utils.ts**: General utility functions
  - **/roles.ts**: User role management
  - **/stripe.ts**: Stripe payment utilities

## Core Data Models

1. **barbers**: Barber profiles with name, description, userId, image, and active status
   - Added Stripe Connect fields: stripeAccountId, stripeAccountOnboardingComplete, stripeAccountPayoutsEnabled, stripeAccountChargesEnabled
2. **slots**: Time slots for bookings with barberId, date, start/end times, booking status, and price
3. **barberAvailabilityTemplates**: Templates for barber availability by day of week
4. **appointments**: Records of appointments with user and barber information, including payment status
5. **bookings**: Records of slot bookings with payment (paymentIntentId, paymentStatus, stripeSessionId) and status information
6. **users**: User profiles with authentication information and Stripe customer ID

## Key Features and Functionality

### Booking Flow with Payments

1. Users visit the booking page for a specific barber (`/book/[barberId]`)
2. The page loads available slots for the selected date from the `slots` table
3. If no slots exist, it attempts to generate slots from the barber's availability template
4. Users can select a slot and service, then initiate a booking
5. A booking record is created with "pending" payment status
6. User is redirected to Stripe Checkout to complete payment
7. Upon successful payment, the Stripe webhook updates the booking status to "paid"
8. An appointment record is created/updated to reflect the payment status

### Barber Stripe Connect Setup

1. Barbers access the dashboard and use the Stripe Connect component to connect a payment account
2. They are redirected to Stripe's onboarding flow to set up their account
   - Note: Even in test mode, Stripe requires using a real email address for verification
   - All other details can use test data (e.g., test bank account numbers)
3. Upon completion, barber accounts show payment enabled status
4. Payments made by customers are sent directly to the barber's Stripe account with platform fees
5. Test transactions use a 10% platform fee that goes to the platform account

### Stripe Webhook Handling

The application processes the following Stripe webhook events:
- `checkout.session.completed`: Marks bookings as paid when payment is completed
  - Includes receipt URL for the customer (cast as `(session as any).receipt_url` due to Stripe types)
- `payment_intent.succeeded`: Records successful payments
- `payment_intent.payment_failed`: Handles failed payments
- `charge.refunded`: Processes refunds
- `account.updated`: Updates barber Stripe Connect account status

The webhook handler employs type casting in two key areas:
1. For the receipt URL which isn't included in Stripe's TypeScript definitions
2. For status values in payment and booking updates to ensure type safety

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
4. Connect their Stripe account through the Settings tab in the dashboard

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

### Latest Updates (July 2024)

1. **Fixed Status Terminology Consistency**: Modified the booking status system to use "paid" instead of "confirmed" consistently across the codebase:
   - Updated `BOOKING_STATUS.CONFIRMED` in constants.ts to use "paid" instead of "confirmed"
   - Added "paid" as a valid status value in schema.ts for bookings
   - Updated all functions in bookings.ts to use "paid" status instead of "confirmed"
   - Updated references in slots.ts to search for bookings with "paid" status
   - Added a migration function in migrations.ts to update existing records from "confirmed" to "paid"

2. **Added Stripe Connect Component**: Implemented Stripe Connect integration in the barber dashboard:
   - Created a new StripeConnect component to allow barbers to connect their Stripe accounts
   - Added the component to the Settings tab in the barber dashboard
   - Integrated with Stripe Connect API endpoints for account creation and onboarding

3. **Fixed Stripe Integration**: Implemented complete Stripe API routes:
   - Added `/api/stripe/create-checkout-session/route.ts`
   - Added `/api/stripe/create-connect-account/route.ts`
   - Added `/api/stripe/create-account-link/route.ts`
   - Updated the webhook handler to correctly process payment confirmations

4. **Fixed Slot Availability Issue**: Modified the `updateAvailability` function in `convex/slots.ts` to mark cleared slots as unavailable instead of deleting them. This ensures that when a barber clears a slot from their dashboard, it's properly reflected in the booking page as unavailable.

5. **Enhanced Booking Page Functionality**:
   - Added a new "Not Available" section in the booking UI to display slots specifically marked as unavailable by the barber
   - Improved the date change handling to automatically force a refresh when changing dates
   - Enhanced the slot initialization process to check both string and timestamp formats

6. **Improved Debugging**: Added detailed logging throughout the slots management process to help identify issues with slot availability and visibility.

7. **Known Issues**:
   - TypeScript error in the `updateAvailability` function related to the `time` variable being treated as `unknown` when iterating over a Set
   - "No slots found for this date and barber" message may still appear occasionally, requiring a manual refresh

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
6. **User is redirected** to Stripe Checkout for payment
7. **After successful payment** the Stripe webhook updates the booking status to "paid"
8. **User is directed** to the appointments page showing their confirmed booking

### Barber Dashboard Flow

1. **Barber sets availability** using the availability component
2. **`saveTemplates`** mutation saves the availability template
3. **`updateAvailability`** mutation creates slots for the next 4 weeks based on templates
4. **`cleanupSlots`** mutation removes unused slots beyond the retention window
5. **Barber views appointments** that have been booked
6. **Barber connects Stripe account** through the Settings tab to receive payments

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

## Known Issues and Solutions

### Stripe Integration Type Issues

1. **Receipt URL Type Issue**: The Stripe webhook handler needs to cast the `session.receipt_url` to `(session as any).receipt_url` because the TypeScript type definitions don't include this property.

   ```typescript
   // In app/api/webhooks/stripe/route.ts
   await convex.mutation(api.bookings.updatePaymentStatus, {
     // other parameters...
     receiptUrl: (session as any).receipt_url,
   });
   ```

2. **Status String Handling**: When updating booking status from Stripe events, we need to cast the status strings to their appropriate types:

   ```typescript
   // In convex/bookings.ts
   await ctx.db.patch(booking._id, {
     status: bookingStatus as "pending" | "confirmed" | "paid" | "completed" | "cancelled" | "refunded",
     paymentStatus: paymentStatus as "pending" | "processing" | "succeeded" | "failed" | "cancelled" | "refunded",
   });
   ```

### Booking Flow Improvements

1. **Slot Booking Status Issue**: Fixed an issue where booked slots would still appear as available after a successful payment. The solution involved:

   - Adding a new "pending" status to the booking flow
   - Only marking slots as booked after payment confirmation
   - Ensuring the webhook handler calls `forceRefresh` after processing payments
   - Adding a check for URL parameters that indicate a successful payment

   ```typescript
   // In convex/bookings.ts - create function
   // Only mark the slot as reserved temporarily
   await ctx.db.patch(slotId, { 
     lastUpdated: Date.now()
     // isBooked flag will be set after payment confirmation
   });
   
   // Create the booking with PENDING status instead of CONFIRMED
   const bookingId = await ctx.db.insert("bookings", {
     // other fields...
     status: BOOKING_STATUS.PENDING,
   });
   ```

   ```typescript
   // In convex/bookings.ts - updatePaymentStatus function
   // If payment succeeded, update booking status to paid (previously "confirmed")
   if (paymentStatus === "succeeded") {
     updates.status = BOOKING_STATUS.CONFIRMED; // This now maps to "paid" in constants.ts
     
     // Now explicitly mark the slot as booked when payment succeeds
     await ctx.db.patch(slotId, {
       isBooked: true,
       lastUpdated: Date.now(),
     });
   }
   ```

   ```typescript
   // In app/api/webhooks/stripe/route.ts
   // Force refresh the slots to ensure consistency
   await convex.mutation(api.slots.forceRefresh, {
     barberId: barberId as Id<'barbers'>,
     date: new Date().toISOString().split('T')[0] // Use today's date
   });
   ```

2. **Payment Success Detection**: Added code to detect when a user returns from a successful payment and refresh the slot data:

   ```typescript
   // In app/book/[barberId]/page.tsx
   useEffect(() => {
     const searchParams = new URLSearchParams(window.location.search);
     const success = searchParams.get('success');
     
     if (success === 'true') {
       // Force refresh to ensure slot data is up to date
       handleForceRefresh();
       
       toast({
         title: "Payment Successful",
         description: "Your booking has been confirmed.",
       });
     }
   }, []);
   ``` 