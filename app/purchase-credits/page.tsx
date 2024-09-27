'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { loadStripe } from '@stripe/stripe-js';

declare global {
  interface Window {
    rewardful: (action: string, callback: () => void) => void;
    Rewardful: { referral: string | null };
  }
}

export default function PurchaseCredits() {
  const [isLoading, setIsLoading] = useState(false);
  const [referral, setReferral] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    window.rewardful('ready', function() {
      setReferral(window.Rewardful.referral);
    });
  }, []);

  const handlePurchase = async () => {
    setIsLoading(true);
    const user = auth.currentUser;
    if (!user) {
      alert('Please log in to purchase credits');
      router.push('/login');
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/purchase-credits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referral }) // Include the referral ID in the request body
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.sessionId) {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }
        const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (error) {
          throw error;
        }
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to initiate purchase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Purchase Lora Training Credits</h1>
      <p className="mb-4">Each purchase gives you 3 credits for Lora training.</p>
      <Button onClick={handlePurchase} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Purchase Credits'}
      </Button>
    </div>
  );
}