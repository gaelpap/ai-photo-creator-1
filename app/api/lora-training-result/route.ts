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
    const result = await fal.queue.result("fal-ai/flux-lora-fast-training", {
      requestId: requestId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching Lora training result' }, { status: 500 });
  }
}