import { NextApiRequest, NextApiResponse } from 'next';
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_AI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { requestId } = req.query;

      const status = await fal.queue.status("fal-ai/flux-lora-fast-training", {
        requestId: requestId as string,
        logs: true,
      });

      res.status(200).json(status);
    } catch (error) {
      res.status(500).json({ error: 'Error checking Lora training status' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}