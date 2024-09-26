'use client';  // Add this line at the top of the file

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { signOut } from 'firebase/auth';
import { Button } from "@/components/ui/button";

console.log('Stripe Publishable Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SubscriptionPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Force token refresh
          await user.getIdToken(true);
          setUser(user);
        } catch (err) {
          console.error('Error refreshing token:', err);
          setError('Authentication error. Please try logging in again.');
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubscribe = async (priceId: string) => {
    if (!user) return;

    console.log('Attempting to subscribe with price ID:', priceId);

    try {
      const idToken = await user.getIdToken(true);  // Force token refresh
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      }

      const { sessionId } = await response.json();
      console.log('Received session ID:', sessionId);

      const stripe = await stripePromise;
      console.log('Stripe object:', stripe);
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe redirect error:', error);
        setError(error.message || 'An error occurred');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(`An error occurred. Please try again. Details: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Error</h1>
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Choose Your Subscription</h1>
        <Button onClick={handleLogout} className="bg-red-500 text-white">
          Logout
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Image Generator Subscription</h2>
          <p className="mb-4">Access to our powerful image generation tool.</p>
          <button
            onClick={() => handleSubscribe('price_1Q1qMUEI2MwEjNuQm64hm1gc')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Subscribe to Image Generator
          </button>
        </div>
        <div className="border rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Lora Training Subscription</h2>
          <p className="mb-4">Access to our advanced Lora training features.</p>
          <button
            onClick={() => handleSubscribe('price_1Q1qDaEI2MwEjNuQ9Ol8x4xV')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Subscribe to Lora Training
          </button>
        </div>
      </div>
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
}