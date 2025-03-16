import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

// Function to create a Stripe customer
export async function createStripeCustomer(name: string, email: string) {
  try {
    const customer = await stripe.customers.create({
      name,
      email,
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

// Function to create a payment session for a booking
export async function createCheckoutSession({
  customerId,
  barberStripeAccountId,
  amount,
  appointmentId,
  barberId,
  serviceName,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId?: string;
  barberStripeAccountId: string;
  amount: number;
  appointmentId: string;
  barberId: string;
  serviceName: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}) {
  try {
    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);
    
    // Set up payment session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: serviceName,
              description: `Appointment booking for ${serviceName}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(amountInCents * 0.10), // 10% platform fee
        transfer_data: {
          destination: barberStripeAccountId,
        },
        metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        appointmentId,
        barberId,
      },
    };

    // Add customer ID if available
    if (customerId) {
      sessionParams.customer = customerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Function to handle webhook events
export async function constructEventFromPayload(
  signature: string,
  payload: string
) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('Error constructing webhook event:', error);
    throw error;
  }
} 