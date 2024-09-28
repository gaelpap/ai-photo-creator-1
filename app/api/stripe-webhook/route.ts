import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, collection, query, where, limit, getDocs } from 'firebase/firestore';

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
    const userId = session.client_reference_id;
    const rewardfulId = session.metadata?.rewardful;

    if (userId) {
      try {
        // Update the user's LoRA credits
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          loraCredits: increment(3) // Add 3 LoRA credits
        });

        // Update the user's image credits
        await updateDoc(userRef, {
          imageCredits: increment(10) // Add 10 image credits, adjust as needed
        });

        // Process the referral if present
        if (rewardfulId) {
          const referrerQuery = query(
            collection(db, 'users'),
            where('referralCode', '==', rewardfulId),
            limit(1)
          );
          const referrerSnapshot = await getDocs(referrerQuery);
          
          if (!referrerSnapshot.empty) {
            const referrerDoc = referrerSnapshot.docs[0];
            await updateDoc(referrerDoc.ref, {
              referralRewards: increment(1) // Or whatever reward you want to give
            });
          }
        }

        console.log(`Credits added for user ${userId}`);
        return NextResponse.json({ received: true });
      } catch (error) {
        console.error('Error updating user data:', error);
        return NextResponse.json({ error: 'Error updating user data' }, { status: 500 });
      }
    } else {
      console.error('No userId found in session client_reference_id');
      return NextResponse.json({ error: 'No userId found in session client_reference_id' }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}