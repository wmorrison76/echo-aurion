/**
 * Authentication Page
 * Handles user login and signup with email/password and Azure AD SSO
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, isAuthenticated, isLoading } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const [mode, setMode] = useState<AuthMode>(() => {
    const param = searchParams.get('mode');
    return param === 'signup' ? 'signup' : 'login';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      } else {
        await signup(email, password, fullName);
        setSuccess('Account created! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('[Auth]', message);
    } finally {
      setLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/authorize/azure');
      const data = await response.json();

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError('Azure AD is not configured');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to initiate Azure login',
      );
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  const canSubmit =
    email &&
    password &&
    (isSignup ? fullName && password.length >= 8 : true) &&
    !loading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Hospitality Suite
          </h1>
          <p className="text-slate-400">
            {isSignup
              ? 'Create your account to get started'
              : 'Welcome back. Sign in to continue.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8 shadow-xl">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
              <p className="text-sm text-green-200">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Signup only) */}
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="you@example.com"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder={isSignup ? 'Minimum 8 characters' : 'Your password'}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {isSignup && (
                <p className="text-xs text-slate-400 mt-2">
                  • At least 8 characters
                  <br />• Uppercase and lowercase letters
                  <br />• A number
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {isSignup ? 'Creating account...' : 'Signing in...'}
                </>
              ) : isSignup ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">Or continue with</span>
            </div>
          </div>

          {/* Azure AD Button */}
          <Button
            onClick={handleAzureLogin}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
              <path d="M11.4 0H0v11.4h11.4V0zM23 0h-11.4v11.4H23V0zM11.4 11.6H0V23h11.4v-11.4zm11.6 0H11.6V23H23v-11.4z" />
            </svg>
            {isSignup ? 'Sign up with Microsoft' : 'Sign in with Microsoft'}
          </Button>

          {/* Footer */}
          <div className="mt-6 text-center">
            {isSignup ? (
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Create one
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>
            Need help? Contact{' '}
            <a href="mailto:support@example.com" className="text-blue-400 hover:text-blue-300">
              support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
