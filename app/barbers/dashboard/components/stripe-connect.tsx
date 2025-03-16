import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { ExternalLink } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

interface StripeConnectProps {
  barberId: Id<"barbers">;
  userEmail?: string;
  userName?: string;
}

export function StripeConnect({ barberId, userEmail, userName }: StripeConnectProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Get the barber's Stripe Connect status
  const stripeStatus = useQuery(api.barbers.hasCompletedStripeOnboarding, { 
    barberId 
  });

  // Check for Stripe onboarding completion
  useEffect(() => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');
    
    if (success === 'true') {
      toast({
        title: "Stripe Account Connected",
        description: "Your Stripe account has been successfully connected.",
      });
    }
    
    if (refresh === 'true') {
      toast({
        title: "Refreshing Stripe Status",
        description: "Please complete your Stripe account setup.",
      });
    }
  }, [searchParams, toast]);

  const handleConnectStripe = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Create a Stripe Connect account if one doesn't exist
      const createResponse = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barberId,
          email: userEmail,
          name: userName,
        }),
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create Stripe account');
      }
      
      const { accountId, alreadyExists } = await createResponse.json();
      
      // Step 2: Create an account link for onboarding
      const linkResponse = await fetch('/api/stripe/create-account-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeAccountId: accountId,
          barberId,
        }),
      });
      
      if (!linkResponse.ok) {
        const errorData = await linkResponse.json();
        throw new Error(errorData.message || 'Failed to create onboarding link');
      }
      
      const { url } = await linkResponse.json();
      
      // Redirect to Stripe onboarding
      window.location.href = url;
      
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect your Stripe account',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  if (!stripeStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>Loading Stripe connection status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Connect</CardTitle>
        <CardDescription>
          Connect your Stripe account to receive payments from customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeStatus.hasStripeAccount ? (
          stripeStatus.onboardingComplete ? (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-1">Stripe Account Connected</h3>
              <p className="text-green-700 text-sm mb-3">
                Your Stripe account is fully set up and ready to receive payments.
              </p>
              <a
                href="https://dashboard.stripe.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Go to Stripe Dashboard <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-1">Stripe Account Incomplete</h3>
              <p className="text-yellow-700 text-sm mb-3">
                You've created a Stripe account but haven't completed the onboarding process.
                Please complete your Stripe account setup to receive payments.
              </p>
              <Button variant="outline" onClick={handleConnectStripe} disabled={isLoading}>
                {isLoading ? "Loading..." : "Complete Stripe Onboarding"}
              </Button>
            </div>
          )
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              To accept credit card payments, you need to connect your Stripe account.
              Click the button below to set up your Stripe account.
            </p>
            <Button onClick={handleConnectStripe} disabled={isLoading}>
              {isLoading ? "Loading..." : "Connect Stripe Account"}
            </Button>
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium mb-2">Important Notes:</h3>
          <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
            <li>Use a real email address for verification (Stripe will send verification emails)</li>
            <li>You can use test data for other account details during setup</li>
            <li>You'll receive payments directly to your Stripe account with a 10% platform fee</li>
            <li>Stripe payments are secure and protect both you and your customers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 