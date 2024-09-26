import { generateImage as generateImageAction } from '../components/actions';

export async function generateImage(prompt: string, language: string, disableSafetyChecker: boolean): Promise<string> {
  try {
    console.log('Generating image with input:', { prompt, language, disableSafetyChecker });
    const fullPrompt = `${language === 'french' ? 'En français: ' : ''}${prompt}`;
    
    const result = await generateImageAction(fullPrompt, [], disableSafetyChecker);

    // ... rest of the function
  } catch (error) {
    // ... error handling
  }
}