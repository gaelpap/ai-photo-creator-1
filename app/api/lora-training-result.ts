import { NextApiRequest, NextApiResponse } from 'next';
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_AI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { requestId } = req.query;

      const result = await fal.queue.result("fal-ai/flux-lora-fast-training", {
        requestId: requestId as string,
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching Lora training result' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}