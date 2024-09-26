'use client'

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false); // Default to register page
  const [message, setMessage] = useState('');
  const [isResetPassword, setIsResetPassword] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage('Logged in successfully!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Registered successfully!');
      }
      router.push('/');
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage('Authentication failed. Please try again.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent. Check your inbox.');
    } catch (error) {
      console.error('Reset password error:', error);
      setMessage('Failed to send reset email. Please try again.');
    }
  };

  if (isResetPassword) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">AI Photo Creator</h1>
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border rounded text-black" // Added text-black class
            required
          />
          <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
            Send Reset Email
          </button>
        </form>
        <button
          onClick={() => setIsResetPassword(false)}
          className="mt-4 text-blue-500 underline"
        >
          Back to Login
        </button>
        {message && <p className="mt-4 text-red-500">{message}</p>}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Photo Creator</h1>
      <p className="mb-4">Create stunning AI-generated photos of yourself in any style or scenario.</p>
      <h2 className="text-xl font-semibold mb-4">{isLogin ? 'Login' : 'Register'}</h2>
      <p className="mb-4">{isLogin ? 'Login now:' : 'Register now:'}</p>
      <form onSubmit={handleAuth} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 border rounded text-black" // Added text-black class
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 border rounded text-black" // Added text-black class
          required
        />
        <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-4 text-blue-500 underline"
      >
        {isLogin ? 'Need to register?' : 'Already have an account?'}
      </button>
      {isLogin && (
        <button
          onClick={() => setIsResetPassword(true)}
          className="mt-4 ml-4 text-blue-500 underline"
        >
          Forgot Password?
        </button>
      )}
      {message && <p className="mt-4 text-red-500">{message}</p>}
    </div>
  );
}