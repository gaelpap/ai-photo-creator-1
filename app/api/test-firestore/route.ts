import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  try {
    const testDoc = await db.collection('test').add({
      timestamp: new Date(),
      message: 'Test write'
    });
    return NextResponse.json({ success: true, docId: testDoc.id });
  } catch (error) {
    console.error('Error writing to Firestore:', error);
    return NextResponse.json({ error: 'Failed to write to Firestore' }, { status: 500 });
  }
}