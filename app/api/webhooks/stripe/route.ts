import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { constructEventFromPayload } from '@/lib/stripe';
import { ConvexHttpClient } from 'convex/browser';
import { NextRequest, NextResponse } from 'next/server';

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
    const event = constructEventFromPayload(signature, Buffer.from(payload));
    
    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Retrieve metadata from the session
        const { appointmentId, barberId, slotId, userId } = session.metadata || {};
        const paymentIntentId = session.payment_intent as string;
        
        if (!slotId || !barberId) {
          console.error('Missing required metadata in checkout session:', session.metadata);
          return NextResponse.json(
            { error: 'Missing required metadata' },
            { status: 400 }
          );
        }

        // Update the booking in Convex
        await convex.mutation(api.bookings.updatePaymentStatus, {
          slotId: slotId as Id<'slots'>,
          barberId: barberId as Id<'barbers'>,
          paymentIntentId,
          paymentStatus: 'succeeded',
          stripeSessionId: session.id,
          receiptUrl: (session as any).receipt_url,
        });

        console.log(`Payment succeeded for booking with payment intent: ${paymentIntentId}`);
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const { slotId, barberId } = paymentIntent.metadata || {};
        
        if (slotId && barberId) {
          // Update the booking in Convex
          await convex.mutation(api.bookings.updatePaymentStatus, {
            slotId: slotId as Id<'slots'>,
            barberId: barberId as Id<'barbers'>,
            paymentIntentId: paymentIntent.id,
            paymentStatus: 'failed',
          });
        }
        
        console.log(`Payment failed for payment intent: ${paymentIntent.id}`);
        break;
      }
      
      case 'charge.refunded': {
        const charge = event.data.object;
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
        const account = event.data.object;
        
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
