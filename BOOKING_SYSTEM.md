# Booking System Technical Reference

This document provides detailed technical information about the booking, payment, and appointment synchronization system implemented in G|Barbers 3.0.

## Data Model

### Core Entity Relationships

```
┌─────────┐      ┌─────────┐      ┌────────────┐
│  Users  │──┐   │ Barbers │      │AvailTemplate│
└─────────┘  │   └─────────┘      └────────────┘
             │        │                  │
             │        │                  │
             ▼        ▼                  ▼
┌─────────┐  │   ┌─────────┐      ┌─────────┐
│Bookings │◄─┘   │  Slots  │◄─────│ Dates   │
└─────────┘      └─────────┘      └─────────┘
    │                 ▲
    │                 │
    ▼                 │
┌─────────┐           │
│Appointmt│           │
└─────────┘           │
    │                 │
    └─────────────────┘
```

### Cross-References
- **Bookings** ↔ **Appointments**: Direct two-way relationship via `bookingId` and `appointmentId` fields
- **Bookings** → **Slots**: One-way reference via `slotId`
- **Slots** has no direct reference to bookings, but can be queried via index

## Synchronization Mechanisms

### 1. Initial Slot Booking

When a user initiates a booking:

```typescript
// Critical: Immediately mark slot as booked to prevent double bookings
await ctx.db.patch(slotId, { 
  isBooked: true,
  lastUpdated: Date.now()
});

// Create booking with PENDING status
const bookingId = await ctx.db.insert("bookings", {
  // booking fields
  status: BOOKING_STATUS.PENDING
});

// Create appointment with link to booking
const appointmentId = await ctx.db.insert("appointments", {
  // appointment fields
  status: "pending",
  bookingId: bookingId
});

// Update booking with link to appointment
await ctx.db.patch(bookingId, {
  appointmentId: appointmentId
});
```

### 2. Payment Processing (Stripe Webhook)

When a payment succeeds:

```typescript
// Explicit slot update for reliability
await convex.mutation(api.slots.forceUpdateSlotStatus, {
  slotId: slotId,
  isBooked: true,
  lastUpdated: Date.now()
});

// Update booking payment status
await convex.mutation(api.bookings.updatePaymentStatus, {
  slotId: slotId,
  barberId: barberId,
  paymentIntentId: session.payment_intent,
  paymentStatus: 'succeeded'
});

// Synchronized update of booking and appointment
await convex.mutation(api.bookings.updateBookingAndAppointmentStatus, {
  bookingId: bookingId,
  status: 'confirmed',
  paymentStatus: 'succeeded'
});

// Force UI refresh
await convex.mutation(api.slots.forceRefresh, {
  barberId: barberId,
  date: dateString
});
```

### 3. Periodic Synchronization

A cron job runs every 10 minutes to ensure consistency:

```typescript
// Find paid bookings with pending appointments
const paidBookings = await ctx.db
  .query("bookings")
  .filter(q => 
    q.eq(q.field("paymentStatus"), "succeeded") && 
    q.eq(q.field("status"), "confirmed")
  )
  .collect();

// For each booking, ensure appointment is also marked paid
for (const booking of paidBookings) {
  // Check direct reference
  if (booking.appointmentId) {
    const appointment = await ctx.db.get(booking.appointmentId);
    if (appointment.status !== "paid") {
      await ctx.db.patch(appointment._id, {
        status: "paid"
      });
    }
  } else {
    // Fallback to matching by slot details
    // Find and update matching appointment
  }
}
```

### 4. Real-time Dashboard Updates

The barber dashboard uses a real-time query with refresh trigger:

```typescript
// Component code
const appointments = useQuery(api.appointments.getByBarberIdRealtime, { 
  barberId,
  refresh: Boolean(refreshKey > 0)
});

// Periodic refresh
useEffect(() => {
  const refreshInterval = setInterval(() => {
    setRefreshKey(prev => prev + 1);
  }, 15000);
  
  return () => clearInterval(refreshInterval);
}, []);
```

## Common Issues and Solutions

### 1. Slots Not Showing as Booked

**Problem**: When a user books a slot, it might not immediately show as booked.

**Solution**: 
- Slots are now marked as `isBooked: true` immediately when booking is initiated
- The `forceUpdateSlotStatus` function explicitly updates slot status
- The payment webhook tries multiple approaches to update slot status

### 2. Appointments Stuck in Pending Status

**Problem**: Appointments might not update to "paid" status even though payment succeeded.

**Solution**:
- Direct relationship between bookings and appointments
- The `updateBookingAndAppointmentStatus` function updates both entities
- A periodic sync job catches and fixes any inconsistencies
- Dashboard includes a manual "Update Pending to Paid" button as fallback

### 3. Inconsistent UI State

**Problem**: The UI might not reflect the latest state of bookings and slots.

**Solution**:
- More aggressive real-time query with shorter cache times
- Periodic refresh of dashboard data
- The `forceRefresh` function updates timestamps to trigger UI refreshes

## Implementation Details

### Database Schema Enhancements

```typescript
appointments: defineTable({
  // existing fields
  bookingId: v.optional(v.id("bookings")), // Reference to booking
})
.index("by_booking", ["bookingId"]), // Index for efficient lookup

bookings: defineTable({
  // existing fields
  appointmentId: v.optional(v.id("appointments")), // Reference to appointment
})
```

### New Mutation Functions

- `updateBookingAndAppointmentStatus`: Updates both booking and appointment
- `forceUpdateSlotStatus`: Directly updates a slot's booking status
- `syncBookingsAndAppointments`: Scheduled job to ensure consistency

### Enhanced Webhook Handler

The Stripe webhook handler now:
1. Explicitly updates slot status
2. Updates booking payment status
3. Synchronizes appointment status
4. Forces a UI refresh

## Testing and Verification

To verify the system is working:
1. Create a booking and complete payment
2. Verify slot shows as booked in both:
   - Barber dashboard availability view
   - Customer booking interface
3. Verify appointment shows as "paid" in barber dashboard
4. Create a second booking with payment
5. Verify both appointments show as "paid" without manual intervention

## Future Improvements

1. **Event-Based Architecture**: Move to a more explicit event-based system
2. **Stronger Consistency Guarantees**: Add transaction support when available
3. **Improved Error Recovery**: Add more sophisticated retry mechanisms
4. **Conflict Resolution**: Enhance handling of edge cases like double bookings
5. **Monitoring & Alerts**: Add monitoring for failed synchronizations 