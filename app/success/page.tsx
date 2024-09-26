'use client'

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

async function verifySubscription(sessionId: string, userId: string) {
  console.log('Verifying subscription for session:', sessionId);
  try {
    console.log('Attempting to retrieve session from Stripe');
    const response = await fetch('/api/verify-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, userId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Verification result:', result);

    if (result.success) {
      const userRef = doc(db, 'users', userId);
      console.log('Updating user document for:', userId);
      await setDoc(userRef, { isSubscribed: true }, { merge: true });
      console.log('Updated user document');
      return 'Subscription successful! You can now generate images.';
    } else {
      return 'Failed to verify subscription. Please contact support.';
    }
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

function SuccessContent() {
  const [message, setMessage] = useState<string>('Verifying subscription...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    console.log('Session ID from URL:', sessionId);

    if (!sessionId) {
      console.error('No session_id found in search params');
      setMessage('Error: No session ID provided. Please contact support.');
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('User authenticated:', user.uid);
        const result = await verifySubscription(sessionId, user.uid);
        setMessage(result);
        if (result.includes('Subscription successful')) {
          setTimeout(() => {
            router.push('/');  // Redirect to the main page after 3 seconds
          }, 3000);
        }
      } else {
        console.error('User not authenticated');
        setMessage('Error: Authentication required. Please log in and try again.');
      }
    });

    return () => unsubscribe();
  }, [searchParams, router]);

  return (
    <div>
      <h1>Subscription Status</h1>
      <p>{message}</p>
      {message.includes('Subscription successful') && (
        <p>Redirecting to the main page in 3 seconds...</p>
      )}
    </div>
  );
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  console.log('SuccessPage rendered. Session ID:', sessionId);

  if (!sessionId) {
    console.error('No session_id found in SuccessPage');
    return (
      <div>
        <h1>Subscription Status</h1>
        <p>Error: No session ID provided. Please contact support.</p>
        <p>Debug info: {JSON.stringify(Object.fromEntries(searchParams.entries()))}</p>
      </div>
    );
  }

  return <SuccessContent />;
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}