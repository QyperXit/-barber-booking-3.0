import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { stripe } from '@/lib/stripe';
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from 'next/server';

// Create a Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { barberId, email, name } = await request.json();

    if (!barberId) {
      return NextResponse.json(
        { error: 'Missing barberId' },
        { status: 400 }
      );
    }

    // Get the barber's details
    const barber = await convex.query(api.barbers.getById, { 
      barberId: barberId as Id<"barbers"> 
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber not found' },
        { status: 404 }
      );
    }

    // Check if the barber already has a Stripe account
    if (barber.stripeAccountId) {
      // If they already have an account, just return the ID
      return NextResponse.json({ 
        accountId: barber.stripeAccountId,
        alreadyExists: true
      });
    }

    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: email || 'barber@example.com',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        name: name || barber.name,
        product_description: `Barber services by ${barber.name}`,
      }
    });

    // Update the barber with the Stripe account ID
    await convex.mutation(api.barbers.updateStripeAccountId, {
      barberId: barberId as Id<"barbers">,
      stripeAccountId: account.id
    });

    return NextResponse.json({ accountId: account.id });
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to create Connect account' },
      { status: 500 }
    );
  }
} 