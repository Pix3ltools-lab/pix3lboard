'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPendingMessage('');
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        result = await signUp(email, password, name || undefined);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        setError(result.error);
      } else if ('pending' in result && result.pending && 'message' in result) {
        // Registration successful but pending approval
        setPendingMessage((result.message as string) || 'Account created. Waiting for admin approval.');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '32px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
            Welcome to Pix3lBoard v2.0
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {isRegister ? 'Create your account' : 'Sign in to access your cloud workspaces'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                color: '#333'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={isRegister ? 'Min 6 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 6 : undefined}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                color: '#333'
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {pendingMessage && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {pendingMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#ccc' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
          >
            {loading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setPendingMessage('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b5cf6',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
