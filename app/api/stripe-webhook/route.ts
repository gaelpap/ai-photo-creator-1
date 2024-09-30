import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

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
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Received event type:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('Session data:', JSON.stringify(session, null, 2));

    const userId = session.metadata?.userId;
    console.log('UserId from metadata:', userId);

    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        
        // Get current credits
        const userDoc = await getDoc(userRef);
        const currentImageCredits = userDoc.data()?.imageCredits || 0;
        const currentLoraCredits = userDoc.data()?.loraCredits || 0;
        console.log('Current image credits:', currentImageCredits);
        console.log('Current LoRA credits:', currentLoraCredits);

        // Update the user's image and LoRA credits
        await updateDoc(userRef, {
          imageCredits: increment(100), // Add 100 image credits
          loraCredits: increment(3)     // Add 3 LoRA credits
        });

        // Get updated credits
        const updatedUserDoc = await getDoc(userRef);
        const updatedImageCredits = updatedUserDoc.data()?.imageCredits || 0;
        const updatedLoraCredits = updatedUserDoc.data()?.loraCredits || 0;
        console.log('Updated image credits:', updatedImageCredits);
        console.log('Updated LoRA credits:', updatedLoraCredits);

        console.log(`Credits added for user ${userId}. New totals: Image Credits: ${updatedImageCredits}, LoRA Credits: ${updatedLoraCredits}`);
        return NextResponse.json({ 
          received: true, 
          imageCreditsAdded: 100, 
          loraCreditsAdded: 3, 
          newImageTotal: updatedImageCredits,
          newLoraTotal: updatedLoraCredits
        });
      } catch (error) {
        console.error('Error updating user data:', error);
        return NextResponse.json({ error: 'Error updating user data', details: error }, { status: 500 });
      }
    } else {
      console.error('No userId found in session metadata');
      return NextResponse.json({ error: 'No userId found in session metadata' }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}