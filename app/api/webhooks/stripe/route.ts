import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { constructEventFromPayload } from '@/lib/stripe';
import { ConvexHttpClient } from 'convex/browser';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Create a client for Convex
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body as a buffer
    const payload = await request.text();
    
    // Get the Stripe signature from the headers
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }
    
    // Construct the event from the payload
    const event = await constructEventFromPayload(signature, payload);
    
    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { bookingId, slotId, barberId, userId } = session.metadata || {};
        
        if (slotId && barberId) {
          try {
            // CRITICAL FIX: Explicitly mark the slot as booked first
            await convex.mutation(api.slots.forceUpdateSlotStatus, {
              slotId: slotId as Id<'slots'>,
              isBooked: true,
              lastUpdated: Date.now()
            });
            
            console.log(`Explicitly marked slot ${slotId} as booked`);
            
            // Update booking payment status - this will also mark the slot as booked
            await convex.mutation(api.bookings.updatePaymentStatus, {
              slotId: slotId as Id<'slots'>,
              barberId: barberId as Id<'barbers'>,
              paymentIntentId: session.payment_intent as string,
              paymentStatus: 'succeeded',
              stripeSessionId: session.id,
              receiptUrl: (session as any).receipt_url,
            });

            console.log(`Updated booking payment status for slot ${slotId}`);

            // Use our new synchronization function to update both booking and appointment
            if (bookingId) {
              await convex.mutation(api.bookings.updateBookingAndAppointmentStatus, {
                bookingId: bookingId as Id<'bookings'>,
                status: 'confirmed',
                paymentStatus: 'succeeded'
              });
              
              console.log(`Updated booking and appointment status for booking ${bookingId}`);
            }
            
            // Force refresh the slots to ensure consistency
            await convex.mutation(api.slots.forceRefresh, {
              barberId: barberId as Id<'barbers'>,
              date: new Date().toISOString().split('T')[0] // Use today's date
            });
          } catch (error) {
            console.error('Error processing checkout.session.completed:', error);
          }
        }
        
        console.log(`Payment succeeded for booking with payment intent: ${session.payment_intent}`);
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { slotId, barberId } = paymentIntent.metadata || {};
        
        if (slotId && barberId) {
          try {
            // Explicitly mark the slot as not booked first
            await convex.mutation(api.slots.forceUpdateSlotStatus, {
              slotId: slotId as Id<'slots'>,
              isBooked: false,
              lastUpdated: Date.now()
            });
            
            console.log(`Explicitly marked slot ${slotId} as available after payment failure`);
            
            // Update the booking in Convex
            await convex.mutation(api.bookings.updatePaymentStatus, {
              slotId: slotId as Id<'slots'>,
              barberId: barberId as Id<'barbers'>,
              paymentIntentId: paymentIntent.id,
              paymentStatus: 'failed',
            });
            
            // Force refresh the slots to ensure consistency
            await convex.mutation(api.slots.forceRefresh, {
              barberId: barberId as Id<'barbers'>,
              date: new Date().toISOString().split('T')[0] // Use today's date
            });
          } catch (error) {
            console.error('Error processing payment_intent.payment_failed:', error);
          }
        }
        
        console.log(`Payment failed for payment intent: ${paymentIntent.id}`);
        break;
      }
      
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        
        if (paymentIntentId) {
          // Update the booking in Convex
          await convex.mutation(api.bookings.updateBookingByPaymentIntent, {
            paymentIntentId,
            status: 'refunded',
            paymentStatus: 'refunded',
          });
        }
        
        console.log(`Charge refunded for payment intent: ${paymentIntentId}`);
        break;
      }
      
      // Handle account update events for Stripe Connect
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        
        // Update the barber's Stripe account status in Convex
        await convex.mutation(api.barbers.updateStripeAccountStatus, {
          stripeAccountId: account.id,
          payoutsEnabled: account.payouts_enabled,
          chargesEnabled: account.charges_enabled,
        });
        
        console.log(`Stripe account ${account.id} updated`);
        break;
      }
      
      // Default case for other events
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error handling Stripe webhook:', err);
    return NextResponse.json(
      { error: 'Error handling Stripe webhook' },
      { status: 500 }
    );
  }
}
