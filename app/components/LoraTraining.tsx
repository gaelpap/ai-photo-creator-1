'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from 'firebase/auth';
import JSZip from 'jszip';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { User } from 'firebase/auth';

function LoraTraining() {
  const [files, setFiles] = useState<File[]>([]);
  const [triggerWord, setTriggerWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [savedModels, setSavedModels] = useState<{id: string, url: string, triggerWord: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [loraCredits, setLoraCredits] = useState<number>(0);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkCredits = async (user: User) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const credits = userData?.loraCredits || 0;
        setLoraCredits(credits);
      } catch (err) {
        console.error('Error checking credits:', err);
        setError('Failed to check credit status');
      } finally {
        setCheckingSubscription(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkCredits(user);
        fetchSavedModels();
      } else {
        setLoraCredits(0);
        setCheckingSubscription(false);
        // Allow access to the page even when not logged in
        fetchSavedModels(); // Fetch public models or handle appropriately
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchSavedModels = async () => {
    setError(null);
    const user = auth.currentUser;
    if (user) {
      try {
        const q = query(collection(db, "loraModels"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const models = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() as {url: string, triggerWord: string} 
        }));
        setSavedModels(models);
      } catch (err) {
        if (err instanceof FirebaseError) {
          console.error("Firebase error:", err);
          setError("Failed to fetch saved models. Please try again later.");
        } else {
          console.error("Unknown error:", err);
          setError("An unexpected error occurred. Please try again later.");
        }
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loraCredits <= 0) {
      setError("You don't have enough credits. Please purchase more to start training.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTrainingMessage(null);

    try {
      if (files.length === 0) {
        throw new Error("Please select at least one image file.");
      }

      const fileUrl = await uploadFiles(files);

      console.log('Sending request to API with:', { images_data_url: fileUrl.substring(0, 50) + '...', trigger_word: triggerWord });

      const response = await fetch('/api/lora-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images_data_url: fileUrl,
          trigger_word: triggerWord,
        }),
      });

      const data = await response.json();
      console.log('Full API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Lora training');
      }

      await pollForResults(data.request_id);

      // Deduct a credit after successful training
      await updateCredits(auth.currentUser!.uid, -1);
      setLoraCredits(prevCredits => prevCredits - 1);
      setTrainingMessage("Your training will be ready and saved here in a few minutes.");
    } catch (error) {
      console.error('Error during Lora training:', error);
      if (error instanceof Error) {
        setError(`${error.message}${error.stack ? `\n${error.stack}` : ''}`);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFiles = async (files: File[]): Promise<string> => {
    const storage = getStorage();
    const zip = new JSZip();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      zip.file(file.name, arrayBuffer);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const storageRef = ref(storage, `uploads/${Date.now()}.zip`);
    
    await uploadBytes(storageRef, zipBlob);
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log("Uploaded file URL:", downloadURL);
    return downloadURL;
  };

  const pollForResults = async (requestId: string) => {
    const maxAttempts = 60; // 30 minutes with 30-second intervals
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/lora-training-status?requestId=${requestId}`);
        const status = await response.json();

        console.log("Status:", status.status);

        if (status.status === 'COMPLETED') {
          const resultResponse = await fetch(`/api/lora-training-result?requestId=${requestId}`);
          const result = await resultResponse.json();
          if (result && result.diffusers_lora_file && result.diffusers_lora_file.url) {
            const modelUrl = result.diffusers_lora_file.url;
            console.log('Training completed. Model URL:', modelUrl);
            setResult(modelUrl);
            await saveModelToUserAccount(modelUrl);
          } else {
            throw new Error('Unexpected result format from Lora training');
          }
        } else if (status.status === 'FAILED') {
          throw new Error('Lora training failed: ' + (status.error || 'Unknown error'));
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 30000); // Check every 30 seconds
        } else {
          throw new Error('Timeout: Lora training took too long');
        }
      } catch (error) {
        console.error('Error in pollForResults:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    };

    await checkStatus();
  };

  const saveModelToUserAccount = async (modelUrl: string) => {
    const user = auth.currentUser;
    if (user) {
      try {
        console.log('Attempting to save model:', modelUrl);
        const docRef = await addDoc(collection(db, "loraModels"), {
          userId: user.uid,
          url: modelUrl,
          triggerWord: triggerWord,
          createdAt: new Date()
        });
        console.log('Model saved successfully with ID:', docRef.id);
        await fetchSavedModels();
      } catch (error) {
        console.error("Error saving model to user account:", error);
        if (error instanceof FirebaseError) {
          console.error("Firebase error code:", error.code);
          console.error("Firebase error message:", error.message);
        }
        setError("Failed to save the model to your account. Please try again.");
      }
    } else {
      console.error("No authenticated user found when trying to save model");
      setError("User not authenticated. Please log in and try again.");
    }
  };

  const updateCredits = async (userId: string, change: number) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      loraCredits: increment(change)
    });
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

  if (checkingSubscription) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Lora Training</h1>
        <div>
          {auth.currentUser ? (
            <>
              <span className="mr-4 text-lg font-bold text-black">Credits: {loraCredits}</span>
              {loraCredits <= 0 && (
                <button
                  onClick={() => router.push('/purchase-credits')}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Purchase Credits
                </button>
              )}
              <Button onClick={handleLogout} className="bg-red-500 text-white ml-2">
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={() => router.push('/login')} className="bg-blue-500 text-white">
              Login
            </Button>
          )}
        </div>
      </div>
      {auth.currentUser && (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <label className="block mb-2 text-gray-700">Upload Images (ZIP file recommended)</label>
            <input type="file" multiple onChange={handleFileUpload} className="border p-2 w-full text-gray-700" />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-gray-700">Trigger Word</label>
            <input
              type="text"
              value={triggerWord}
              onChange={(e) => setTriggerWord(e.target.value)}
              placeholder="Trigger Word"
              className="border p-2 w-full text-gray-700"
            />
          </div>
          <button type="submit" disabled={isLoading || loraCredits <= 0} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            {isLoading ? 'Training...' : (loraCredits > 0 ? 'Start Training' : 'No Credits')}
          </button>
        </form>
      )}
      {!auth.currentUser && (
        <p className="mb-4">Log in to start training your own Lora models.</p>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      {trainingMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
          {trainingMessage}
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold mb-2 text-gray-800">Saved Models</h2>
        {savedModels.length > 0 ? (
          <ul>
            {savedModels.map((model) => (
              <li key={model.id} className="mb-2">
                <span className="font-semibold text-gray-700">{model.triggerWord}: </span>
                <a href={model.url} download className="text-blue-500 hover:text-blue-700 underline">
                  Download Model
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No saved models found.</p>
        )}
      </div>
    </div>
  );
}

export default LoraTraining;