'use client'

import { useEffect, useState } from 'react';
import { Page } from '@/components/app-page';
import LoraTraining from './components/LoraTraining';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { Button } from "@/components/ui/button";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [selectedApp, setSelectedApp] = useState<'imageGenerator' | 'loraTraining' | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // This will prevent any flash of content before redirect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {!selectedApp ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-full flex justify-end p-4">
            <Button onClick={handleLogout} className="bg-red-500 text-white">
              Logout
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-8 text-gray-800">Choose an App</h1>
          <div className="space-x-4">
            <button
              onClick={() => setSelectedApp('imageGenerator')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Image Generator
            </button>
            <button
              onClick={() => setSelectedApp('loraTraining')}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Lora Training
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <button
            onClick={() => setSelectedApp(null)}
            className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Back to App Selection
          </button>
          {selectedApp === 'imageGenerator' && <Page />}
          {selectedApp === 'loraTraining' && <LoraTraining />}
        </div>
      )}
    </div>
  );
}
