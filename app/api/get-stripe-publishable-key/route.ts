import { NextResponse } from 'next/server';

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey || !publishableKey.startsWith('pk_')) {
    console.error('Invalid Stripe Publishable Key format');
    return NextResponse.json({ error: 'Invalid Stripe Publishable Key' }, { status: 500 });
  }

  return NextResponse.json({ publishableKey });
}