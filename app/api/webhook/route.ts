import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

const CREDITS_PER_PURCHASE = 3;
const IMAGE_CREDITS_PER_PURCHASE = 100;

async function ensureUserDocument(userId: string) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    console.log('Creating new user document for userId:', userId);
    await userRef.set({
      loraCredits: 0,
      createdAt: new Date()
    });
  }
}

export async function POST(req: Request) {
  console.log('Webhook received');
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log('Event constructed successfully:', event.type);
  } catch (err) {
    console.error('Error verifying webhook signature:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    console.log('Checkout session completed');
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (userId) {
      console.log('Updating credits for user:', userId);
      try {
        await ensureUserDocument(userId);
        const userRef = db.collection('users').doc(userId);
        await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          const currentImageCredits = userDoc.data()?.imageCredits || 0;
          const currentLoraCredits = userDoc.data()?.loraCredits || 0;
          console.log('Current image credits:', currentImageCredits);
          console.log('Current Lora credits:', currentLoraCredits);
          
          // Check the line items to determine which product was purchased
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const purchasedItem = lineItems.data[0];
          
          if (purchasedItem.price.id === 'price_1Q2f46EI2MwEjNuQqxAJwo79') {
            // Image credits purchase
            transaction.update(userRef, {
              imageCredits: currentImageCredits + IMAGE_CREDITS_PER_PURCHASE
            });
            console.log(`Added ${IMAGE_CREDITS_PER_PURCHASE} image credits to user ${userId}`);
          } else if (purchasedItem.price.id === 'price_1Q2cMtEI2MwEjNuQOwcPYUCk') {
            // Lora credits purchase
            transaction.update(userRef, {
              loraCredits: currentLoraCredits + CREDITS_PER_PURCHASE
            });
            console.log(`Added ${CREDITS_PER_PURCHASE} Lora credits to user ${userId}`);
          } else {
            console.error('Unknown product purchased');
            return NextResponse.json({ error: 'Unknown product purchased' }, { status: 400 });
          }
        });
        return NextResponse.json({ received: true });
      } catch (error) {
        console.error('Error updating user credits:', error);
        return NextResponse.json({ error: 'Failed to update user credits', details: error.message }, { status: 500 });
      }
    } else {
      console.error('No userId found in session');
      return NextResponse.json({ error: 'No userId found in session' }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}