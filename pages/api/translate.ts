import type { NextApiRequest, NextApiResponse } from 'next'
import { translate } from '@vitalets/google-translate-api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { text, targetLang } = req.body
    try {
      const result = await translate(text, { from: 'fr', to: 'en' })
      res.status(200).json({ translatedText: result.text })
    } catch (error) {
      res.status(500).json({ error: 'Translation failed' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}