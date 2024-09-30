import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

const IMAGE_CREDITS_PRICE_ID = 'price_1Q2f46EI2MwEjNuQqxAJwo79'; // Replace with your actual price ID for image credits
const LORA_CREDITS_PRICE_ID = 'price_xxxxxxxxxxxxxxxx'; // Replace with your actual price ID for LoRA credits

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        
        for (const item of lineItems.data) {
          if (item.price?.id === IMAGE_CREDITS_PRICE_ID) {
            await updateDoc(userRef, {
              imageCredits: increment(100 * (item.quantity || 1))
            });
            console.log(`${100 * (item.quantity || 1)} image credits added for user ${userId}`);
          } else if (item.price?.id === LORA_CREDITS_PRICE_ID) {
            await updateDoc(userRef, {
              loraCredits: increment(3 * (item.quantity || 1))
            });
            console.log(`${3 * (item.quantity || 1)} LoRA credits added for user ${userId}`);
          }
        }

        // Handle affiliate commission (you'll need to implement this based on your specific requirements)
        // For example:
        // await handleAffiliateCommission(session);

        return NextResponse.json({ received: true, creditsAdded: true });
      } catch (error) {
        console.error('Error updating user data:', error);
        return NextResponse.json({ error: 'Error updating user data' }, { status: 500 });
      }
    } else {
      console.error('No userId found in client_reference_id');
      return NextResponse.json({ error: 'No userId found in client_reference_id' }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}

// You'll need to implement this function based on your affiliate system
// async function handleAffiliateCommission(session: Stripe.Checkout.Session) {
//   const referralId = session.metadata?.referral;
//   if (referralId) {
//     // Implement your affiliate commission logic here
//     console.log(`Processing affiliate commission for referral ID: ${referralId}`);
//   }
// }