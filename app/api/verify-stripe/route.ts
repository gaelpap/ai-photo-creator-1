import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Update this to the latest version
});

export async function GET() {
  try {
    // Instead of using stripe.config.retrieve(), let's just check if we can create a simple object
    const customer = await stripe.customers.create({
      email: 'test@example.com',
    });
    await stripe.customers.del(customer.id);

    return NextResponse.json({ 
      mode: process.env.NODE_ENV, 
      apiVersion: stripe.getApiField('version') 
    });
  } catch (error) {
    console.error('Error verifying Stripe configuration:', error);
    return NextResponse.json({ error: 'Failed to verify Stripe configuration' }, { status: 500 });
  }
}