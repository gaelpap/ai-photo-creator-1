import { NextResponse } from 'next/server';
import * as fal from "@fal-ai/serverless-client";

console.log('FAL_AI_API_KEY:', process.env.FAL_AI_API_KEY ? 'Set (length: ' + process.env.FAL_AI_API_KEY.length + ')' : 'Not set');

fal.config({
  credentials: process.env.FAL_AI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Received POST request to /api/lora-training');
    const body = await request.json();
    console.log('Full request body:', JSON.stringify(body, null, 2));

    const { images_data_url, trigger_word } = body;

    console.log('Parsed request:', { 
      images_data_url: images_data_url ? `${images_data_url.substring(0, 50)}...` : 'undefined', 
      trigger_word 
    });

    if (!images_data_url || !trigger_word) {
      console.log('Missing required parameters');
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log('Submitting to Fal AI');
    const { request_id } = await fal.queue.submit("fal-ai/flux-lora-fast-training", {
      input: {
        images_data_url,
        trigger_word,
      },
    });

    console.log('Fal AI submission successful, request_id:', request_id);
    return NextResponse.json({ request_id });
  } catch (error: any) {
    console.error('Error in Lora training submission:', error);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Error submitting Lora training job', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}