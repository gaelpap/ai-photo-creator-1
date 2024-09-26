'use server'

import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_KEY,
});

interface LoRA {
  path: string;
  scale: number;
}

interface ImageGenerationInput {
  prompt: string;
  loras?: LoRA[];
  enable_safety_checker: boolean;
  num_inference_steps?: number;
}

interface ImageGenerationResult {
  images: Array<{ url: string }>;
}

export async function generateImage(prompt: string, loras: LoRA[], disableSafetyChecker: boolean) {
  try {
    console.log('Generating image with params:', { prompt, loras, disableSafetyChecker });
    const input: ImageGenerationInput = {
      prompt: prompt,
      loras: loras,
      enable_safety_checker: !disableSafetyChecker,  // This is the key change
      num_inference_steps: 50
    };

    console.log('Sending to Fal AI:', input);
    console.log('Fal AI credentials:', process.env.FAL_KEY ? 'Set' : 'Not set');

    const result = await fal.run<ImageGenerationResult, ImageGenerationInput>('fal-ai/flux-lora', {
      input: input
    });

    console.log('Raw Fal AI response:', JSON.stringify(result, null, 2));

    if (result && result.images && result.images.length > 0) {
      console.log('Generated image URL:', result.images[0].url);
      return { imageUrl: result.images[0].url };
    } else {
      console.error('No image generated in the result');
      throw new Error('No image generated');
    }
  } catch (error) {
    console.error('Error in generateImage:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}