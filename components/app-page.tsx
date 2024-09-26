'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { generateImage } from './actions'
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { UserImages } from './UserImages'
import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment, collection, setDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import { Select } from "@/components/ui/select"
import { useSearchParams } from 'next/navigation';

interface LoRA {
  path: string;
  scale: number;
}

export function Page() {
  const [prompt, setPrompt] = useState('')
  const [loras, setLoras] = useState<LoRA[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [disableSafetyChecker, setDisableSafetyChecker] = useState(false)
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [language, setLanguage] = useState('en')
  const [translatedPrompt, setTranslatedPrompt] = useState('')
  const searchParams = useSearchParams();

  const router = useRouter()

  useEffect(() => {
    const checkCredits = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userCredits = userDoc.data()?.imageCredits || 0;
        setCredits(userCredits);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        checkCredits();
      } else {
        setCredits(0);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddLora = () => {
    if (loras.length < 2) {
      setLoras([...loras, { path: '', scale: 1 }])
    }
  }

  const handleRemoveLora = (index: number) => {
    setLoras(loras.filter((_, i) => i !== index))
  }

  const handleLoraChange = (index: number, field: keyof LoRA, value: string | number) => {
    const newLoras = [...loras]
    newLoras[index] = { ...newLoras[index], [field]: value }
    setLoras(newLoras)
  }

  const translatePrompt = async (text: string, targetLang: string) => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, targetLang }),
      });
      const data = await response.json();
      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to generate images.');
      return;
    }
    if (credits <= 0) {
      alert('You have no credits. Please purchase credits to generate images.');
      return;
    }
    setIsLoading(true);
    setImageUrl(''); // Clear previous image
    try {
      // Translate prompt only if language is French
      const promptToUse = language === 'fr' ? await translatePrompt(prompt, 'en') : prompt;
      setTranslatedPrompt(language === 'fr' ? promptToUse : '');

      console.log('Submitting image generation request');
      const idToken = await user.getIdToken();
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ prompt: promptToUse, loras, disableSafetyChecker }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Generation result:', result);
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        console.log('Image URL set:', result.imageUrl);
        // Save the generated image to Firestore
        const imageRef = doc(collection(db, 'users', user.uid, 'images'));
        await setDoc(imageRef, {
          prompt: prompt,
          imageUrl: result.imageUrl,
          createdAt: new Date().toISOString(),
        });
        console.log('Image saved to Firestore');

        // Deduct a credit after successful generation
        await updateDoc(doc(db, 'users', user.uid), {
          imageCredits: increment(-1)
        });
        setCredits(prevCredits => prevCredits - 1);
      } else {
        throw new Error('No image URL in the response');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      if (error instanceof Error) {
        alert(`Error generating image: ${error.message}`);
      } else {
        alert('An unexpected error occurred while generating the image');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handlePurchaseCredits = async () => {
    if (!user) {
      alert('Please log in to purchase credits.');
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/purchase-image-credits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.sessionId) {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }
        const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (error) {
          throw error;
        }
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to initiate purchase. Please try again.');
    }
  };

  const checkPaymentStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/check-payment?session_id=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        // Refresh the user's credit count
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userCredits = userDoc.data()?.imageCredits || 0;
          setCredits(userCredits);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  useEffect(() => {
    // Check for session_id in URL
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Image Generator</h1>
        <div className="flex items-center">
          <span className="mr-4 text-lg font-bold text-black">Credits: {credits}</span>
          <Button onClick={handlePurchaseCredits} className="bg-blue-500 text-white mr-2">
            Purchase Credits
          </Button>
          <Button onClick={handleLogout} className="bg-red-500 text-white">
            Logout
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex mb-2">
          <Input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={language === 'en' ? "Enter your prompt" : "Entrez votre prompt"}
            className="flex-grow p-2 mr-2 border rounded"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        {loras.map((lora, index) => (
          <div key={index} className="flex mb-2">
            <Input
              type="text"
              value={lora.path}
              onChange={(e) => handleLoraChange(index, 'path', e.target.value)}
              placeholder="LoRA path"
              className="flex-grow p-2 mr-2 border rounded"
            />
            <Input
              type="number"
              value={lora.scale}
              onChange={(e) => handleLoraChange(index, 'scale', parseFloat(e.target.value))}
              step="0.1"
              min="0"
              max="1"
              className="w-20 p-2 border rounded mr-2"
            />
            <Button 
              type="button" 
              onClick={() => handleRemoveLora(index)}
              className="bg-red-500 text-white p-2 rounded"
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={handleAddLora}
          disabled={loras.length >= 2}
          className="bg-blue-500 text-white p-2 rounded mb-2 mr-2"
        >
          Add LoRA
        </Button>
        <label className="inline-flex items-center mb-2">
          <input
            type="checkbox"
            checked={disableSafetyChecker}
            onChange={(e) => setDisableSafetyChecker(e.target.checked)}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span className="ml-2 text-gray-700">Disable Safety Checker</span>
        </label>
        <Button
          type="submit"
          disabled={isLoading || credits <= 0}
          className="bg-green-500 text-white p-2 rounded w-full"
        >
          {isLoading ? 'Generating...' : (credits > 0 ? 'Generate Image' : 'No Credits')}
        </Button>
      </form>
      {imageUrl && (
        <div>
          <h2 className="text-xl font-bold mb-2">Generated Image:</h2>
          <Image 
            src={imageUrl} 
            alt="Generated image"
            width={500}
            height={500}
            layout="responsive"
            onError={(e) => {
              console.error('Error loading image:', imageUrl);
              e.currentTarget.src = '/placeholder-image.jpg'; // Replace with a placeholder image
            }}
          />
        </div>
      )}
      <UserImages />
      {translatedPrompt && language === 'fr' && (
        <p className="mt-2 text-sm text-gray-600">
          Translated prompt: {translatedPrompt}
        </p>
      )}
    </div>
  )
}