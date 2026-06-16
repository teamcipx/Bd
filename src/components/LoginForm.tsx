import React, { useState } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

interface LoginFormProps {
  onLogin: (user: User) => void;
  onSwitchToSignup?: () => void;
}

export function LoginForm({ onLogin, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !pass) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
      });

      if (loginError) {
        throw loginError;
      }

      if (data?.user) {
        // Read custom user data from Supabase user_metadata
        let metadata = data.user.user_metadata || {};
        
        // Fetch secure profile data
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', data.user.id).single();
        if (profile) {
          metadata = { ...metadata, balance: profile.balance || 0, streak: profile.streak || 0, lastCheckIn: profile.last_check_in, isPro: profile.is_pro };
        }
        
        const loggedInUser: User = {
          id: data.user.id,
          name: metadata.name || 'User',
          number: profile?.number || metadata.number || '',
          gmail: data.user.email || '',
          pass: pass, // We wouldn't normally store plain password in a real app, keeping it for compatibility
          referralCode: metadata.referralCode || profile?.my_referral_code || '',
          balance: metadata.balance || 0,
          streak: metadata.streak || 0,
          joinedAt: metadata.joinedAt || data.user.created_at || new Date().toISOString(),
          lastCheckIn: metadata.lastCheckIn,
          isPro: metadata.isPro || false
        };
        
        // Also keep local copy synced
        localStorage.setItem('bdpay_registered_user_data', JSON.stringify(loggedInUser));
        localStorage.setItem('bdpay_device_registered', 'true');
        
        onLogin(loggedInUser);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or account does not exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary mb-2">BDPAY</h1>
          <p className="text-slate-500 text-sm">Welcome back</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Gmail)</label>
            <input 
              type="email" 
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="your@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors mt-6 disabled:bg-primary/70"
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
        
        {onSwitchToSignup && (
          <p className="text-center text-sm text-slate-500 mt-6">
            New here?{' '}
            <button onClick={onSwitchToSignup} className="text-primary font-medium hover:underline">
              Sign up
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
