import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  console.log('Received request to create-checkout-session');
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Unauthorized: No valid Authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (verifyError) {
      console.error('Error verifying ID token:', verifyError);
      return NextResponse.json({ error: 'Invalid ID token' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    const { priceId } = await request.json();
    console.log('Received priceId:', priceId);

    if (!priceId) {
      console.error('No priceId provided');
      return NextResponse.json({ error: 'No priceId provided' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-app-name.vercel.app'; // Replace with your actual default URL
    console.log('Base URL:', baseUrl);

    console.log('Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription`,
      client_reference_id: userId,
    });

    console.log('Stripe session created:', session.id);
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error in create-checkout-session API:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Internal Server Error', details: error.message, stack: error.stack }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Internal Server Error', details: 'Unknown error' }, { status: 500 });
    }
  }
}