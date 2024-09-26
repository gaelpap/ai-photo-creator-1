import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false); // Default to register page
  const [message, setMessage] = useState('');
  const [isResetPassword, setIsResetPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage('Logged in successfully!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Registered successfully!');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent. Check your inbox.');
    } catch (error) {
      setMessage('Failed to send reset email. Please try again.');
    }
  };

  if (isResetPassword) {
    return (
      <div>
        <h1>AI Photo Creator</h1>
        <h2>Reset Password</h2>
        <form onSubmit={handleResetPassword}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <button type="submit">Send Reset Email</button>
        </form>
        <button onClick={() => setIsResetPassword(false)}>Back to Login</button>
        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1>AI Photo Creator</h1>
      <p>Create stunning AI-generated photos of yourself in any style or scenario.</p>
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <p>{isLogin ? 'Login now:' : 'Register now:'}</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Need to register?' : 'Already have an account?'}
      </button>
      {isLogin && (
        <button onClick={() => setIsResetPassword(true)}>Forgot Password?</button>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}

export default Auth;