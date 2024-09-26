import { NextApiRequest, NextApiResponse } from 'next';
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_AI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { images_data_url, trigger_word } = req.body;

      const { request_id } = await fal.queue.submit("fal-ai/flux-lora-fast-training", {
        input: {
          images_data_url,
          trigger_word,
        },
      });

      res.status(200).json({ request_id });
    } catch (error) {
      res.status(500).json({ error: 'Error submitting Lora training job' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}