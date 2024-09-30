import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      try {
        // Update the user's image credits
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          imageCredits: increment(100) // Add 100 image credits
        });

        console.log(`100 credits added for user ${userId}`);
        return NextResponse.json({ received: true });
      } catch (error) {
        console.error('Error updating user data:', error);
        return NextResponse.json({ error: 'Error updating user data' }, { status: 500 });
      }
    } else {
      console.error('No userId found in session metadata');
      return NextResponse.json({ error: 'No userId found in session metadata' }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}