import { NextResponse } from 'next/server';
import { generateImage } from '@/components/actions';
import { auth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    await auth.verifyIdToken(idToken);

    const { prompt, loras, disableSafetyChecker } = await request.json();
    const result = await generateImage(prompt, loras, disableSafetyChecker);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in generate-image API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}