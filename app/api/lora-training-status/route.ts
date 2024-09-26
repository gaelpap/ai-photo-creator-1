import { NextResponse } from 'next/server';
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_AI_API_KEY,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
  }

  try {
    const status = await fal.queue.status("fal-ai/flux-lora-fast-training", {
      requestId: requestId,
      logs: true,
    });

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: 'Error checking Lora training status' }, { status: 500 });
  }
}