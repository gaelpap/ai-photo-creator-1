import React, { useState, useEffect } from 'react';
import { generateImage } from '../../lib/image-generation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('english');
  const [disableSafetyChecker, setDisableSafetyChecker] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSubscription = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const subscriptionStatus = userData?.isSubscribed || false;
        console.log('Image Generator subscription status:', subscriptionStatus);
        setIsSubscribed(subscriptionStatus);
      } else {
        setIsSubscribed(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkSubscription();
      } else {
        setIsSubscribed(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      console.log('Generating image with prompt:', prompt, 'language:', language, 'disableSafetyChecker:', disableSafetyChecker);
      const imageUrl = await generateImage(prompt, language, disableSafetyChecker);
      console.log('Generated image URL:', imageUrl);
      setGeneratedImage(imageUrl);
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSubscribed) {
    return (
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-4">Subscription Required</h2>
        <p className="mb-4">You need to subscribe to use the Image Generator.</p>
        <button
          onClick={() => router.push('/subscription')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Subscribe Now
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-black text-sm font-bold mb-2" style={{color: 'black'}}>
            Enter your prompt:
          </label>
          <input
            type="text"
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline"
            placeholder="A futuristic city skyline"
            style={{color: 'black'}}
          />
        </div>
        <div className="mb-4">
          <label className="block text-black text-sm font-bold mb-2" style={{color: 'black'}}>
            Select language:
          </label>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="language"
                value="english"
                checked={language === 'english'}
                onChange={() => setLanguage('english')}
              />
              <span className="ml-2 text-black" style={{color: 'black'}}>English</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="language"
                value="french"
                checked={language === 'french'}
                onChange={() => setLanguage('french')}
              />
              <span className="ml-2 text-black" style={{color: 'black'}}>French</span>
            </label>
          </div>
        </div>
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={disableSafetyChecker}
              onChange={(e) => setDisableSafetyChecker(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-black" style={{color: 'black'}}>Disable Safety Checker (Allow NSFW content)</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {generatedImage && (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-black mb-2">Generated Image:</h2>
          <img src={generatedImage} alt="Generated" className="max-w-full h-auto rounded shadow-lg" />
        </div>
      )}
    </div>
  );
}