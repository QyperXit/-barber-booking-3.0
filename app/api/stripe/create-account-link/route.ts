import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { stripe } from '@/lib/stripe';
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from 'next/server';

// Create a Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { stripeAccountId, barberId } = await request.json();

    if (!stripeAccountId || !barberId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create an account link for the user to onboard with Stripe
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/barbers/dashboard?refresh=true`,
      return_url: `${appUrl}/barbers/dashboard?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating account link:', error);
    return NextResponse.json(
      { error: 'Failed to create account link' },
      { status: 500 }
    );
  }
} 