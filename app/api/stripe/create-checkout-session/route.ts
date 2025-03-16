import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createCheckoutSession } from '@/lib/stripe';
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from 'next/server';

// Create a Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const {
      bookingId,
      slotId,
      barberId,
      userId,
      customerEmail,
      serviceName,
      amount = 25, // Default amount if not provided
    } = await request.json();

    // Validate required fields
    if (!slotId || !barberId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the barber's Stripe account ID
    const barber = await convex.query(api.barbers.getById, { 
      barberId: barberId as Id<"barbers"> 
    });

    if (!barber?.stripeAccountId) {
      return NextResponse.json(
        { error: 'Barber does not have a connected Stripe account' },
        { status: 400 }
      );
    }

    // Set success and cancel URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${appUrl}/appointments?success=true`;
    const cancelUrl = `${appUrl}/book/${barberId}?canceled=true`;

    // Create the checkout session
    const session = await createCheckoutSession({
      barberStripeAccountId: barber.stripeAccountId,
      amount: amount,
      appointmentId: bookingId,
      barberId,
      serviceName,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata: {
        bookingId,
        slotId,
        barberId,
        userId
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 